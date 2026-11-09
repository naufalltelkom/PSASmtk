/**
 * MathCipher 3D — The Last Exit
 * High-fidelity 3D Backrooms Affine Cipher Game
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import {
  Difficulty,
  GameStatus,
  PlayerStats,
  PuzzleData,
} from './game/types';
import { generatePuzzle, LEVELS } from './game/cipher';
import { createCharacter, CharacterController } from './game/character';
import { buildWorld, WorldObjects } from './game/world';
import { PlayerPhysics, SmoothFollowCamera, InputState } from './game/controls';
import { sound } from './game/audio';

import { HUD } from './components/HUD';
import { TerminalModal } from './components/TerminalModal';
import { StartScreen } from './components/StartScreen';
import { EndScreen } from './components/EndScreen';
import { TouchControls } from './components/TouchControls';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // High-level Game States
  const [gameStatus, setGameStatus] = useState<GameStatus>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [puzzle, setPuzzle] = useState<PuzzleData>(() => generatePuzzle('EASY'));

  // Player Stats for React HUD
  const [stats, setStats] = useState<PlayerStats>({
    lives: 3,
    maxLives: 3,
    timeLeft: 600,
    maxTime: 600,
    status: 'START',
    difficulty: 'EASY',
    distanceToTerminal: 99,
    distanceToExit: 99,
    isNearTerminal: false,
    isNearExit: false,
    isExitUnlocked: false,
    isSprinting: false,
    speed: 0,
  });

  const [playerCoordinates, setPlayerCoordinates] = useState({ x: 0, z: 0 });
  const [playerYaw, setPlayerYaw] = useState(0);

  // References for Engine Loop (avoid re-rendering Three.js canvas)
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    world: WorldObjects;
    character: CharacterController;
    physics: PlayerPhysics;
    followCamera: SmoothFollowCamera;
    input: InputState;
    touchVector: { x: number; y: number };
    touchSprint: boolean;
    isExitUnlocked: boolean;
    lives: number;
    timeLeft: number;
    isGameActive: boolean;
    mouseDragging: boolean;
    lastMouseX: number;
    lastMouseY: number;
  } | null>(null);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.replaceChildren(renderer.domElement);

    // 2. Camera & Scene Environment Setup
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Build Backrooms World
    const world = buildWorld(renderer);
    world.scene.environment = envTexture;

    // 4. Create Detailed Procedural Character
    const character = createCharacter();
    world.scene.add(character.group);

    // Start player at cell (1, 1)
    const startX = (1 - world.offset) * world.cellSize;
    const startZ = (1 - world.offset) * world.cellSize;
    character.group.position.set(startX, 0, startZ);

    const physics = new PlayerPhysics(startX, startZ);
    const followCamera = new SmoothFollowCamera(camera);

    const input: InputState = {
      forward: 0,
      strafe: 0,
      sprint: false,
      interactJustPressed: false,
      escapeJustPressed: false,
    };

    engineRef.current = {
      renderer,
      scene: world.scene,
      camera,
      world,
      character,
      physics,
      followCamera,
      input,
      touchVector: { x: 0, y: 0 },
      touchSprint: false,
      isExitUnlocked: false,
      lives: 3,
      timeLeft: 600,
      isGameActive: false,
      mouseDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
    };

    // 5. Input Event Listeners
    const activeKeys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys[e.code] = true;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyE') {
        input.interactJustPressed = true;
      }

      if (e.code === 'Escape') {
        input.escapeJustPressed = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys[e.code] = false;
    };

    const handleBlur = () => {
      for (const k in activeKeys) activeKeys[k] = false;
      input.forward = 0;
      input.strafe = 0;
      input.sprint = false;
      if (engineRef.current) {
        engineRef.current.mouseDragging = false;
      }
    };

    // Mouse drag camera controls
    const domEl = renderer.domElement;
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        engineRef.current!.mouseDragging = true;
        engineRef.current!.lastMouseX = e.clientX;
        engineRef.current!.lastMouseY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!engineRef.current || !engineRef.current.mouseDragging) return;
      const dx = e.clientX - engineRef.current.lastMouseX;
      const dy = e.clientY - engineRef.current.lastMouseY;
      engineRef.current.lastMouseX = e.clientX;
      engineRef.current.lastMouseY = e.clientY;

      const sensitivity = 0.0045;
      followCamera.yaw -= dx * sensitivity;
      // Clamp pitch to avoid extreme camera flipping
      followCamera.pitch = Math.max(
        0.05,
        Math.min(0.68, followCamera.pitch + dy * sensitivity)
      );
    };

    const handleMouseUp = () => {
      if (engineRef.current) engineRef.current.mouseDragging = false;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    // 6. 60FPS Render & Simulation Loop
    let animationFrameId = 0;
    let lastTime = performance.now();
    let statsTimerAcc = 0;

    const tick = (now: number) => {
      animationFrameId = requestAnimationFrame(tick);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const eng = engineRef.current;
      if (!eng) return;

      // Update Input Vector
      const keyForward = (activeKeys['KeyW'] || activeKeys['ArrowUp'] ? 1 : 0) -
        (activeKeys['KeyS'] || activeKeys['ArrowDown'] ? 1 : 0);
      const keyStrafe = (activeKeys['KeyD'] || activeKeys['ArrowRight'] ? 1 : 0) -
        (activeKeys['KeyA'] || activeKeys['ArrowLeft'] ? 1 : 0);

      // Combine Keyboard & Touch inputs
      eng.input.forward = eng.touchVector.y !== 0 ? eng.touchVector.y : keyForward;
      eng.input.strafe = eng.touchVector.x !== 0 ? eng.touchVector.x : keyStrafe;
      eng.input.sprint =
        activeKeys['ShiftLeft'] || activeKeys['ShiftRight'] || eng.touchSprint;

      // Update World animations (flicker, terminal glow, sliding doors)
      eng.world.update(dt);

      // Process Player Physics only if Playing
      if (eng.isGameActive) {
        eng.physics.update(dt, eng.input, eng.followCamera.yaw, eng.world.walls);

        // Update 3D Character Position & Rotation
        eng.character.group.position.x = eng.physics.position.x;
        eng.character.group.position.z = eng.physics.position.z;
        eng.character.group.rotation.y = eng.physics.rotationY;

        // Update Character Walking Animation Kinematics
        eng.character.update(
          dt,
          eng.physics.velocity,
          eng.physics.isSprinting,
          eng.physics.angularVelocity
        );

        // Sprint aerodynamic wind whoosh audio effect
        const isRunning = eng.physics.isSprinting && eng.physics.velocity.length() > 1.2;
        sound.setSprinting(isRunning);

        // Check Distances to Terminal and Exit Door
        const distTerminal = eng.physics.position.distanceTo(
          eng.world.terminalPosition
        );
        const distExit = eng.physics.position.distanceTo(eng.world.exitPosition);
        const nearTerminal = distTerminal < 3.8;
        const nearExit = distExit < 3.2;

        // Interaction Triggers
        if (eng.input.interactJustPressed) {
          if (nearTerminal && !eng.isExitUnlocked) {
            eng.isGameActive = false;
            setGameStatus('TERMINAL');
          } else if (nearExit && eng.isExitUnlocked) {
            eng.isGameActive = false;
            setGameStatus('VICTORY');
          }
        }

        // Auto trigger victory when passing through open exit door
        if (eng.isExitUnlocked && nearExit && distExit < 2.2) {
          eng.isGameActive = false;
          setGameStatus('VICTORY');
        }

        // Throttle React State Updates (~4 times per second) for zero HUD lag
        statsTimerAcc += dt;
        if (statsTimerAcc > 0.22) {
          statsTimerAcc = 0;
          setPlayerCoordinates({
            x: eng.physics.position.x,
            z: eng.physics.position.z,
          });
          setPlayerYaw(eng.physics.rotationY);

          setStats((prev) => ({
            ...prev,
            distanceToTerminal: distTerminal,
            distanceToExit: distExit,
            isNearTerminal: nearTerminal,
            isNearExit: nearExit,
            isExitUnlocked: eng.isExitUnlocked,
            isSprinting: eng.physics.isSprinting,
            speed: eng.physics.velocity.length(),
          }));
        }
      } else {
        sound.setSprinting(false);
      }

      // Update Third-Person Camera with Smooth Following & Anti-Clip
      eng.followCamera.update(dt, eng.physics.position, eng.world.walls);

      // Render Scene
      renderer.render(eng.scene, camera);

      // Reset edge-triggered inputs
      eng.input.interactJustPressed = false;
      eng.input.escapeJustPressed = false;
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);

      character.dispose();
      world.dispose();
      renderer.dispose();
      sound.stopAmbientHum();
    };
  }, []);

  // Countdown Game Timer
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    const timer = setInterval(() => {
      setStats((prev) => {
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          if (engineRef.current) engineRef.current.isGameActive = false;
          setGameStatus('DEFEAT');
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus]);

  // Start / Restart Game
  const startGame = useCallback(
    (diff: Difficulty = difficulty) => {
      const lvl = LEVELS[diff];
      const newPuzzle = generatePuzzle(diff);
      setPuzzle(newPuzzle);
      setDifficulty(diff);

      const eng = engineRef.current;
      if (eng) {
        // Reset player to start cell
        const startX = (1 - eng.world.offset) * eng.world.cellSize;
        const startZ = (1 - eng.world.offset) * eng.world.cellSize;
        eng.physics.position.set(startX, 0, startZ);
        eng.physics.velocity.set(0, 0);
        eng.physics.rotationY = 0;
        eng.character.group.position.set(startX, 0, startZ);
        eng.character.group.rotation.y = 0;
        eng.followCamera.yaw = 0;

        eng.isExitUnlocked = false;
        eng.lives = lvl.initialLives;
        eng.timeLeft = lvl.timeSeconds;
        eng.isGameActive = true;
      }

      setStats({
        lives: lvl.initialLives,
        maxLives: lvl.initialLives,
        timeLeft: lvl.timeSeconds,
        maxTime: lvl.timeSeconds,
        status: 'PLAYING',
        difficulty: diff,
        distanceToTerminal: 99,
        distanceToExit: 99,
        isNearTerminal: false,
        isNearExit: false,
        isExitUnlocked: false,
        isSprinting: false,
        speed: 0,
      });

      setGameStatus('PLAYING');
      sound.startAmbientHum();
    },
    [difficulty]
  );

  // Solve Puzzle Handler
  const handleTerminalSolved = () => {
    if (engineRef.current) {
      engineRef.current.isExitUnlocked = true;
      engineRef.current.world.openExitDoor();
      engineRef.current.isGameActive = true;
    }
    sound.playDoorOpen();
    setStats((prev) => ({ ...prev, isExitUnlocked: true }));
    setGameStatus('PLAYING');
  };

  // Wrong Answer Handler
  const handleWrongAnswer = () => {
    setStats((prev) => {
      const nextLives = prev.lives - 1;
      if (engineRef.current) engineRef.current.lives = nextLives;
      if (nextLives <= 0) {
        if (engineRef.current) engineRef.current.isGameActive = false;
        setTimeout(() => setGameStatus('DEFEAT'), 800);
      }
      return { ...prev, lives: nextLives };
    });
  };

  const handleCloseTerminal = () => {
    if (engineRef.current) {
      engineRef.current.isGameActive = true;
    }
    setGameStatus('PLAYING');
  };

  // Touch controls handlers
  const handleTouchMove = (vx: number, vy: number) => {
    if (engineRef.current) {
      engineRef.current.touchVector = { x: vx, y: vy };
    }
  };

  const handleTouchSprint = (sprint: boolean) => {
    if (engineRef.current) {
      engineRef.current.touchSprint = sprint;
    }
    setStats((prev) => ({ ...prev, isSprinting: sprint }));
  };

  const handleInteract = () => {
    if (stats.isNearTerminal && !stats.isExitUnlocked) {
      if (engineRef.current) engineRef.current.isGameActive = false;
      setGameStatus('TERMINAL');
    } else if (stats.isNearExit && stats.isExitUnlocked) {
      if (engineRef.current) engineRef.current.isGameActive = false;
      setGameStatus('VICTORY');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0f0d] select-none font-sans">
      {/* 1. Isolated 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* 2. In-Game HUD (Visible during gameplay and terminal) */}
      {gameStatus !== 'START' && (
        <HUD
          stats={stats}
          maze={engineRef.current?.world.maze || []}
          mazeSize={engineRef.current?.world.mazeSize || 19}
          playerPos={playerCoordinates}
          playerYaw={playerYaw}
          onOpenMenu={() => setGameStatus('START')}
          onOpenTerminal={() => {
            if (engineRef.current) engineRef.current.isGameActive = false;
            setGameStatus('TERMINAL');
          }}
          onInteract={handleInteract}
        />
      )}

      {/* 3. Virtual Mobile Touch Controls */}
      {gameStatus === 'PLAYING' && (
        <TouchControls
          onMoveVector={handleTouchMove}
          onSprintToggle={handleTouchSprint}
          onInteract={handleInteract}
          isSprinting={stats.isSprinting}
          canInteract={stats.isNearTerminal || (stats.isNearExit && stats.isExitUnlocked)}
        />
      )}

      {/* 4. Start Screen Modal */}
      {gameStatus === 'START' && (
        <StartScreen
          selectedDifficulty={difficulty}
          onSelectDifficulty={(d) => setDifficulty(d)}
          onStart={() => startGame(difficulty)}
        />
      )}

      {/* 5. Terminal Cipher Modal */}
      {gameStatus === 'TERMINAL' && (
        <TerminalModal
          puzzle={puzzle}
          lives={stats.lives}
          onClose={handleCloseTerminal}
          onSolve={handleTerminalSolved}
          onWrongAnswer={handleWrongAnswer}
        />
      )}

      {/* 6. Victory / Defeat Screen */}
      {(gameStatus === 'VICTORY' || gameStatus === 'DEFEAT') && (
        <EndScreen
          status={gameStatus}
          stats={stats}
          puzzle={puzzle}
          onRetry={() => startGame(difficulty)}
          onMenu={() => setGameStatus('START')}
        />
      )}
    </div>
  );
}
