import * as THREE from 'three';
import { sound } from './audio';

export interface CharacterController {
  group: THREE.Group;
  flashlight: THREE.SpotLight;
  flashlightTarget: THREE.Object3D;
  update: (
    dt: number,
    velocity: THREE.Vector2,
    isSprinting: boolean,
    angularVelocity: number
  ) => void;
  dispose: () => void;
}

export function createCharacter(): CharacterController {
  const root = new THREE.Group();

  // Reusable materials with varied roughness / metalness
  const jacketMat = new THREE.MeshStandardMaterial({
    color: 0x1f3438,
    roughness: 0.82,
    metalness: 0.1,
  });
  const jacketTrimMat = new THREE.MeshStandardMaterial({
    color: 0x2e4f55,
    roughness: 0.7,
    metalness: 0.15,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd4a57b,
    roughness: 0.88,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1e1916,
    roughness: 0.95,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1a2124,
    roughness: 0.85,
  });
  const bootsMat = new THREE.MeshStandardMaterial({
    color: 0x121415,
    roughness: 0.7,
    metalness: 0.2,
  });
  const gearMat = new THREE.MeshStandardMaterial({
    color: 0x82643a,
    roughness: 0.8,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xa8b4b7,
    roughness: 0.35,
    metalness: 0.85,
  });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0x6fffea });

  // 1. Soft contact shadow plane beneath player
  const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  shadowTex.colorSpace = THREE.SRGBColorSpace;
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  // 2. Base Character Pivot (for bobbing & sway)
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  // 3. Pelvis & Utility Belt
  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.22, 0.32),
    pantsMat
  );
  pelvis.position.y = 0.86;
  bodyRoot.add(pelvis);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.09, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x221d17, roughness: 0.7 })
  );
  belt.position.y = 0.94;
  bodyRoot.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.04),
    metalMat
  );
  buckle.position.set(0, 0.94, -0.18);
  bodyRoot.add(buckle);

  // 4. Torso & Explorer Jacket
  const torso = new THREE.Group();
  torso.position.y = 0.98;
  bodyRoot.add(torso);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.58, 0.36),
    jacketMat
  );
  chest.position.y = 0.29;
  chest.castShadow = true;
  torso.add(chest);

  // Jacket Zipper & Trim
  const zipper = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.54, 0.02),
    metalMat
  );
  zipper.position.set(0, 0.29, -0.19);
  torso.add(zipper);

  // Collar
  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.1, 0.3),
    jacketTrimMat
  );
  collar.position.set(0, 0.6, -0.02);
  torso.add(collar);

  // 5. Tactical Backpack
  const backpackGroup = new THREE.Group();
  backpackGroup.position.set(0, 0.28, 0.24);
  torso.add(backpackGroup);

  const packMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.48, 0.22),
    gearMat
  );
  packMain.castShadow = true;
  backpackGroup.add(packMain);

  // Bedroll at the bottom of the backpack
  const bedroll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.48, 12),
    new THREE.MeshStandardMaterial({ color: 0x4a4332, roughness: 0.9 })
  );
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, -0.28, 0.04);
  backpackGroup.add(bedroll);

  // Antenna
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6),
    metalMat
  );
  antenna.position.set(0.18, 0.35, 0.02);
  backpackGroup.add(antenna);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 8, 8),
    lampGlowMat
  );
  antennaTip.position.set(0.18, 0.51, 0.02);
  backpackGroup.add(antennaTip);

  // 6. Head & Explorer Cap
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.72, 0);
  torso.add(headGroup);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 14),
    skinMat
  );
  head.position.y = 0.12;
  head.castShadow = true;
  headGroup.add(head);

  // Cap / Hair
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  cap.position.y = 0.14;
  headGroup.add(cap);

  // Cap Visor
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.03, 0.16),
    hairMat
  );
  visor.position.set(0, 0.19, -0.22);
  visor.rotation.x = 0.12;
  headGroup.add(visor);

  // Headlamp
  const headlamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.07, 0.06),
    metalMat
  );
  headlamp.position.set(0, 0.24, -0.21);
  headGroup.add(headlamp);

  const lampLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 8, 8),
    lampGlowMat
  );
  lampLens.position.set(0, 0.24, -0.245);
  headGroup.add(lampLens);

  // Dynamic Flashlight / Spotlight casting realistic forward beam
  const flashlight = new THREE.SpotLight(0xfff6cf, 4.5, 26, Math.PI / 4.5, 0.45, 1.2);
  flashlight.position.set(0, 0.24, -0.25);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.width = 512;
  flashlight.shadow.mapSize.height = 512;
  flashlight.shadow.camera.near = 0.2;
  flashlight.shadow.camera.far = 30;
  flashlight.shadow.bias = -0.001;

  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0.2, -6);
  headGroup.add(flashlightTarget);
  flashlight.target = flashlightTarget;
  headGroup.add(flashlight);

  // 7. Articulated Arms (Left & Right)
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.35, 0.5, 0);
  torso.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.35, 0.5, 0);
  torso.add(rightShoulder);

  function createArm(isRight: boolean) {
    const armGroup = new THREE.Group();
    // Upper Arm
    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08, 0.26, 4, 8),
      jacketMat
    );
    upperArm.position.y = -0.15;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    // Elbow Pivot
    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    armGroup.add(elbow);

    // Forearm
    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07, 0.24, 4, 8),
      jacketTrimMat
    );
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    elbow.add(forearm);

    // Glove / Hand
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 8, 8),
      bootsMat
    );
    hand.position.y = -0.26;
    elbow.add(hand);

    return { armGroup, elbow, hand };
  }

  const leftArm = createArm(false);
  leftShoulder.add(leftArm.armGroup);

  const rightArm = createArm(true);
  rightShoulder.add(rightArm.armGroup);

  // Scanner / field tablet held in left hand
  const scanner = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.03, 0.24),
    metalMat
  );
  scanner.position.set(0, -0.04, -0.08);
  scanner.rotation.x = -0.3;
  leftArm.hand.add(scanner);

  const scannerScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x4dffe3 })
  );
  scannerScreen.rotation.x = -Math.PI / 2;
  scannerScreen.position.set(0, 0.017, -0.08);
  leftArm.hand.add(scannerScreen);

  // 8. Articulated Legs (Left & Right)
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.17, 0.84, 0);
  bodyRoot.add(leftHip);

  const rightHip = new THREE.Group();
  rightHip.position.set(0.17, 0.84, 0);
  bodyRoot.add(rightHip);

  function createLeg() {
    const legGroup = new THREE.Group();

    // Thigh
    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.105, 0.32, 4, 8),
      pantsMat
    );
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Knee Pivot
    const knee = new THREE.Group();
    knee.position.y = -0.34;
    legGroup.add(knee);

    // Knee Pad
    const kneePad = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.05),
      gearMat
    );
    kneePad.position.set(0, 0, -0.09);
    knee.add(kneePad);

    // Shin / Calf
    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.095, 0.3, 4, 8),
      pantsMat
    );
    shin.position.y = -0.16;
    shin.castShadow = true;
    knee.add(shin);

    // Ankle Pivot & Combat Boot
    const ankle = new THREE.Group();
    ankle.position.y = -0.32;
    knee.add(ankle);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.14, 0.28),
      bootsMat
    );
    boot.position.set(0, 0.02, -0.06);
    boot.castShadow = true;
    ankle.add(boot);

    const bootSole = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.04, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x070808, roughness: 0.9 })
    );
    bootSole.position.set(0, -0.06, -0.06);
    ankle.add(bootSole);

    return { legGroup, knee, ankle };
  }

  const leftLeg = createLeg();
  leftHip.add(leftLeg.legGroup);

  const rightLeg = createLeg();
  rightHip.add(rightLeg.legGroup);

  // Kinematic state accumulators
  let walkTimer = 0;
  let idleTimer = 0;
  let lastStepPhase = 0;

  function update(
    dt: number,
    velocity: THREE.Vector2,
    isSprinting: boolean,
    angularVelocity: number
  ) {
    const speed = velocity.length();
    const isMoving = speed > 0.08;

    if (isMoving) {
      // Dynamic frequency: faster stride when sprinting
      const strideFreq = (isSprinting ? 12.5 : 8.5) * Math.min(speed / 3.0, 1.8);
      walkTimer += dt * strideFreq;

      const strideAmp = isSprinting ? 0.72 : 0.52;
      const armAmp = isSprinting ? 0.85 : 0.6;
      const legSin = Math.sin(walkTimer);
      const legCos = Math.cos(walkTimer);

      // Footstep sound trigger at heel strike
      const currentPhase = Math.sin(walkTimer);
      if (
        (lastStepPhase <= 0 && currentPhase > 0) ||
        (lastStepPhase >= 0 && currentPhase < 0)
      ) {
        sound.playFootstep(isSprinting);
      }
      lastStepPhase = currentPhase;

      // Hip Swing (forward/back along X axis)
      leftHip.rotation.x = legSin * strideAmp;
      rightHip.rotation.x = -legSin * strideAmp;

      // Knee Bend (flexes naturally when the corresponding leg swings backward)
      leftLeg.knee.rotation.x = Math.max(0, -leftHip.rotation.x * 1.3);
      rightLeg.knee.rotation.x = Math.max(0, -rightHip.rotation.x * 1.3);

      // Arm Counter-Swing (opposite phase to legs)
      leftShoulder.rotation.x = -legSin * armAmp;
      rightShoulder.rotation.x = legSin * armAmp;
      leftArm.elbow.rotation.x = -0.35 + Math.max(0, -legSin * 0.35);
      rightArm.elbow.rotation.x = -0.35 + Math.max(0, legSin * 0.35);

      // Vertical Torso Bobbing (subtle human stride cadence, zero sideways tilt)
      const bobAmount = isSprinting ? 0.045 : 0.028;
      bodyRoot.position.y = Math.abs(Math.sin(walkTimer)) * bobAmount;

      // Keep body upright and straight - zero sideways tilt!
      bodyRoot.rotation.z = 0;
      root.rotation.z = 0;
      bodyRoot.rotation.y = Math.sin(walkTimer) * (isSprinting ? 0.04 : 0.02);

      // Forward lean during motion (only on X axis, never sideways)
      const targetTorsoTilt = isSprinting ? 0.12 : 0.05;
      torso.rotation.x = THREE.MathUtils.damp(
        torso.rotation.x,
        targetTorsoTilt,
        10,
        dt
      );
    } else {
      // Idle Breathing & Relaxation
      idleTimer += dt;
      lastStepPhase = 0;

      // Smoothly return limbs to natural upright rest posture
      leftHip.rotation.x = THREE.MathUtils.damp(leftHip.rotation.x, 0, 10, dt);
      rightHip.rotation.x = THREE.MathUtils.damp(rightHip.rotation.x, 0, 10, dt);
      leftLeg.knee.rotation.x = THREE.MathUtils.damp(leftLeg.knee.rotation.x, 0, 10, dt);
      rightLeg.knee.rotation.x = THREE.MathUtils.damp(rightLeg.knee.rotation.x, 0, 10, dt);

      leftShoulder.rotation.x = THREE.MathUtils.damp(leftShoulder.rotation.x, 0, 8, dt);
      rightShoulder.rotation.x = THREE.MathUtils.damp(rightShoulder.rotation.x, 0, 8, dt);
      leftArm.elbow.rotation.x = THREE.MathUtils.damp(leftArm.elbow.rotation.x, -0.25, 8, dt);
      rightArm.elbow.rotation.x = THREE.MathUtils.damp(rightArm.elbow.rotation.x, -0.25, 8, dt);

      // Subtle breathing motion
      const breath = Math.sin(idleTimer * 2.2);
      bodyRoot.position.y = THREE.MathUtils.damp(
        bodyRoot.position.y,
        breath * 0.012,
        6,
        dt
      );
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0, 8, dt);
      bodyRoot.rotation.y = THREE.MathUtils.damp(bodyRoot.rotation.y, 0, 8, dt);
      bodyRoot.rotation.z = 0;
      root.rotation.z = 0;
    }
  }

  function dispose() {
    shadowTex.dispose();
  }

  return {
    group: root,
    flashlight,
    flashlightTarget,
    update,
    dispose,
  };
}
