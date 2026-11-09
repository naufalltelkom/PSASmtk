import * as THREE from 'three';
import { WallBox } from './world';

export interface InputState {
  forward: number; // -1 to 1
  strafe: number;  // -1 to 1
  sprint: boolean;
  interactJustPressed: boolean;
  escapeJustPressed: boolean;
}

export class PlayerPhysics {
  public position: THREE.Vector3;
  public velocity: THREE.Vector2 = new THREE.Vector2(0, 0);
  public rotationY: number = 0;
  public angularVelocity: number = 0;
  public radius: number = 0.42; // Collision radius in meters
  public isSprinting: boolean = false;

  private targetRotationY: number = 0;

  constructor(startX: number, startZ: number) {
    this.position = new THREE.Vector3(startX, 0, startZ);
  }

  public update(
    dt: number,
    input: InputState,
    cameraYaw: number,
    walls: WallBox[]
  ) {
    this.isSprinting = input.sprint;
    const maxSpeed = this.isSprinting ? 6.5 : 3.8;
    const accelRate = 26.0;
    const decelRate = 32.0;

    // Calculate camera-relative desired movement direction
    let inputDir = new THREE.Vector2(0, 0);
    if (Math.abs(input.forward) > 0.01 || Math.abs(input.strafe) > 0.01) {
      // Forward vector based on camera horizontal yaw
      const forwardX = -Math.sin(cameraYaw);
      const forwardZ = -Math.cos(cameraYaw);
      // Right vector
      const rightX = Math.cos(cameraYaw);
      const rightZ = -Math.sin(cameraYaw);

      const wx = forwardX * input.forward + rightX * input.strafe;
      const wz = forwardZ * input.forward + rightZ * input.strafe;

      inputDir.set(wx, wz);
      if (inputDir.lengthSq() > 1) {
        inputDir.normalize();
      }
    }

    // Accelerate or decelerate smoothly
    const targetVelX = inputDir.x * maxSpeed;
    const targetVelZ = inputDir.y * maxSpeed;

    const rateX = Math.abs(targetVelX) > Math.abs(this.velocity.x) ? accelRate : decelRate;
    const rateZ = Math.abs(targetVelZ) > Math.abs(this.velocity.y) ? accelRate : decelRate;

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, rateX, dt);
    this.velocity.y = THREE.MathUtils.damp(this.velocity.y, targetVelZ, rateZ, dt);

    if (Math.abs(this.velocity.x) < 0.005) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.005) this.velocity.y = 0;

    // Move along X with continuous AABB collision resolution
    const nextX = this.position.x + this.velocity.x * dt;
    const resolvedX = this.resolveAxisCollision(nextX, this.position.z, 'x', walls);
    if (Math.abs(resolvedX - nextX) > 0.001) {
      this.velocity.x = 0; // Stopped by wall on X, allow pure sliding on Z
    }
    this.position.x = resolvedX;

    // Move along Z with continuous AABB collision resolution
    const nextZ = this.position.z + this.velocity.y * dt;
    const resolvedZ = this.resolveAxisCollision(this.position.x, nextZ, 'z', walls);
    if (Math.abs(resolvedZ - nextZ) > 0.001) {
      this.velocity.y = 0; // Stopped by wall on Z, allow pure sliding on X
    }
    this.position.z = resolvedZ;

    // Smooth character rotation toward travel direction
    // Model's front face is along negative Z (0, 0, -1).
    // Facing direction angle for vector (vx, vz) is Math.atan2(-vx, -vz).
    const currentSpeed = this.velocity.length();
    if (currentSpeed > 0.12) {
      this.targetRotationY = Math.atan2(-this.velocity.x, -this.velocity.y);
      // Shortest angle difference to prevent unnatural 360-degree spins
      let diff = this.targetRotationY - this.rotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const prevRot = this.rotationY;
      this.rotationY += diff * (1 - Math.exp(-22 * dt));
      this.angularVelocity = (this.rotationY - prevRot) / Math.max(dt, 0.001);
    } else {
      this.angularVelocity = THREE.MathUtils.damp(this.angularVelocity, 0, 12, dt);
    }
  }

  /**
   * Circle vs AABB collision resolution per axis.
   * Enables seamless sliding along walls without snagging.
   */
  private resolveAxisCollision(
    testPx: number,
    testPz: number,
    axis: 'x' | 'z',
    walls: WallBox[]
  ): number {
    let resolved = axis === 'x' ? testPx : testPz;
    const r = this.radius;

    // Only check walls in immediate neighborhood
    const checkDist = 3.5;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (
        Math.abs(w.centerX - testPx) > checkDist ||
        Math.abs(w.centerZ - testPz) > checkDist
      ) {
        continue;
      }

      // Find closest point on wall box to player center
      const closestX = Math.max(w.minX, Math.min(testPx, w.maxX));
      const closestZ = Math.max(w.minZ, Math.min(testPz, w.maxZ));

      const distX = testPx - closestX;
      const distZ = testPz - closestZ;
      const distSq = distX * distX + distZ * distZ;

      if (distSq < r * r && distSq > 0.000001) {
        const dist = Math.sqrt(distSq);
        const overlap = r - dist;

        if (axis === 'x') {
          const normX = distX / dist;
          if (Math.abs(normX) > 0.2) {
            resolved += normX * overlap;
            testPx = resolved;
          }
        } else {
          const normZ = distZ / dist;
          if (Math.abs(normZ) > 0.2) {
            resolved += normZ * overlap;
            testPz = resolved;
          }
        }
      }
    }

    return resolved;
  }
}

/**
 * Third-Person Orbit Follow Camera with Anti-Wall-Clip Protection
 */
export class SmoothFollowCamera {
  public camera: THREE.PerspectiveCamera;
  public yaw: number = 0; // Horizontal orbit angle (radians)
  public pitch: number = 0.28; // Vertical pitch angle (radians)
  public targetDistance: number = 4.6;
  public currentDistance: number = 4.6;

  private lookTarget: THREE.Vector3 = new THREE.Vector3();
  private idealCamPos: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    walls: WallBox[]
  ) {
    // Target position centered at player upper chest / head
    const targetHeadY = playerPos.y + 1.45;
    this.lookTarget.set(playerPos.x, targetHeadY, playerPos.z);

    // Compute ideal spherical camera position relative to player
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const relX = sinYaw * cosPitch;
    const relY = sinPitch;
    const relZ = cosYaw * cosPitch;

    // Raycast check against walls to avoid camera clipping inside walls
    let safeDistance = this.targetDistance;
    const raySteps = 16;
    for (let step = 1; step <= raySteps; step++) {
      const t = (step / raySteps) * this.targetDistance;
      const checkX = this.lookTarget.x + relX * t;
      const checkZ = this.lookTarget.z + relZ * t;

      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        const padding = 0.28; // camera sphere clearance
        if (
          checkX >= w.minX - padding &&
          checkX <= w.maxX + padding &&
          checkZ >= w.minZ - padding &&
          checkZ <= w.maxZ + padding
        ) {
          safeDistance = Math.min(safeDistance, Math.max(1.3, t - 0.25));
          break;
        }
      }
    }

    // Smoothly pull distance in/out
    this.currentDistance = THREE.MathUtils.damp(
      this.currentDistance,
      safeDistance,
      14,
      dt
    );

    this.idealCamPos.set(
      this.lookTarget.x + relX * this.currentDistance,
      this.lookTarget.y + relY * this.currentDistance + 0.35,
      this.lookTarget.z + relZ * this.currentDistance
    );

    // Prevent camera from clipping through ceiling
    this.idealCamPos.y = Math.min(3.9, Math.max(0.6, this.idealCamPos.y));

    // Smooth camera damping
    this.camera.position.lerp(this.idealCamPos, 1 - Math.exp(-15 * dt));
    this.camera.lookAt(this.lookTarget);
  }
}
