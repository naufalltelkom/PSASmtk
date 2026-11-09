import { Difficulty, LevelConfig, PuzzleData } from './types';

export const mod = (n: number, m: number = 26): number => ((n % m) + m) % m;

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const getModularInverse = (a: number, m: number = 26): number | null => {
  for (let i = 1; i < m; i++) {
    if (mod(a * i, m) === 1) return i;
  }
  return null;
};

// Modulo 26 inverse lookup table for standard coprime keys
export const MOD_INVERSE_TABLE: Record<number, number> = {
  1: 1,
  3: 9,
  5: 21,
  7: 15,
  9: 3,
  11: 19,
  15: 7,
  17: 23,
  19: 11,
  21: 5,
  23: 17,
  25: 25,
};

export const ALPHABET_MAP: { letter: string; num: number }[] = Array.from({ length: 26 }, (_, i) => ({
  letter: String.fromCharCode(65 + i),
  num: i,
}));

export const LEVELS: Record<Difficulty, LevelConfig> = {
  EASY: {
    id: 'EASY',
    name: 'MUDAH (EASY)',
    badge: 'Single Affine f(x)',
    desc: 'Satu fungsi affine: f(x) = (ax + b) mod 26. Gunakan invers f⁻¹(y) = a⁻¹(y - b) mod 26.',
    functions: [{ name: 'f', a: 5, b: 8 }],
    cipher: 'single',
    timeSeconds: 600,
    initialLives: 3,
  },
  MEDIUM: {
    id: 'MEDIUM',
    name: 'SEDANG (MEDIUM)',
    badge: 'Komposisi f(g(x))',
    desc: 'Dua fungsi affine: f(g(x)). Dekripsi urut terbalik: cari g(x) dahulu dengan f⁻¹, lalu cari x dengan g⁻¹.',
    functions: [
      { name: 'f', a: 3, b: 5 },
      { name: 'g', a: 7, b: 4 },
    ],
    cipher: 'double',
    timeSeconds: 600,
    initialLives: 3,
  },
  HARD: {
    id: 'HARD',
    name: 'SULIT (HARD)',
    badge: 'Komposisi f(g(h(x)))',
    desc: 'Tiga fungsi affine bersarang f(g(h(x))). Dekripsi bertingkat tiga: h⁻¹(g⁻¹(f⁻¹(y))).',
    functions: [
      { name: 'f', a: 5, b: 2 },
      { name: 'g', a: 11, b: 7 },
      { name: 'h', a: 3, b: 1 },
    ],
    cipher: 'triple',
    timeSeconds: 600,
    initialLives: 4,
  },
};

const WORDS_POOL = [
  'KELUAR',
  'PINTU',
  'RAHASIA',
  'CAHAYA',
  'MATRIX',
  'PORTAL',
  'ESCAPE',
];

export function encryptNumber(x: number, level: LevelConfig): number {
  let v = x;
  if (level.cipher === 'single') {
    const f = level.functions[0];
    return mod(f.a * v + f.b, 26);
  }
  if (level.cipher === 'double') {
    const [f, g] = level.functions;
    v = mod(g.a * v + g.b, 26);
    return mod(f.a * v + f.b, 26);
  }
  const [f, g, h] = level.functions;
  v = mod(h.a * v + h.b, 26);
  v = mod(g.a * v + g.b, 26);
  return mod(f.a * v + f.b, 26);
}

export function decryptNumber(y: number, level: LevelConfig): number {
  if (level.cipher === 'single') {
    const f = level.functions[0];
    const invA = getModularInverse(f.a, 26)!;
    return mod(invA * (y - f.b), 26);
  }
  if (level.cipher === 'double') {
    const [f, g] = level.functions;
    const invF = getModularInverse(f.a, 26)!;
    const invG = getModularInverse(g.a, 26)!;
    const u = mod(invF * (y - f.b), 26);
    return mod(invG * (u - g.b), 26);
  }
  const [f, g, h] = level.functions;
  const invF = getModularInverse(f.a, 26)!;
  const invG = getModularInverse(g.a, 26)!;
  const invH = getModularInverse(h.a, 26)!;
  const u = mod(invF * (y - f.b), 26);
  const w = mod(invG * (u - g.b), 26);
  return mod(invH * (w - h.b), 26);
}

export function generatePuzzle(difficulty: Difficulty, specificWord?: string): PuzzleData {
  const level = LEVELS[difficulty];
  const targetWord = specificWord && WORDS_POOL.includes(specificWord) 
    ? specificWord 
    : WORDS_POOL[Math.floor(Math.random() * WORDS_POOL.length)];
  
  const ciphertextNumbers = [...targetWord].map((char) => {
    const num = char.charCodeAt(0) - 65;
    return encryptNumber(num, level);
  });

  const cipherTextDisplay = ciphertextNumbers
    .map((n) => n.toString().padStart(2, '0'))
    .join('  ');

  return {
    targetWord,
    ciphertextNumbers,
    cipherTextDisplay,
    level,
  };
}
