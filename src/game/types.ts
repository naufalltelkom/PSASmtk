/**
 * Type definitions for MathCipher 3D game
 */

export type GameStatus = 'START' | 'PLAYING' | 'TERMINAL' | 'VICTORY' | 'DEFEAT';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AffineFunction {
  name: string;
  a: number; // multiplier (coprime to 26)
  b: number; // shift
}

export interface LevelConfig {
  id: Difficulty;
  name: string;
  badge: string;
  desc: string;
  functions: AffineFunction[];
  cipher: 'single' | 'double' | 'triple';
  timeSeconds: number;
  initialLives: number;
}

export interface PuzzleData {
  targetWord: string;
  ciphertextNumbers: number[];
  cipherTextDisplay: string;
  level: LevelConfig;
}

export interface PlayerStats {
  lives: number;
  maxLives: number;
  timeLeft: number;
  maxTime: number;
  status: GameStatus;
  difficulty: Difficulty;
  distanceToTerminal: number;
  distanceToExit: number;
  isNearTerminal: boolean;
  isNearExit: boolean;
  isExitUnlocked: boolean;
  isSprinting: boolean;
  speed: number;
}
