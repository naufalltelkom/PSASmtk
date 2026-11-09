import React, { useState, useEffect, useRef } from 'react';
import { PuzzleData } from '../game/types';
import {
  ALPHABET_MAP,
  MOD_INVERSE_TABLE,
  getModularInverse,
  mod,
  decryptNumber,
} from '../game/cipher';
import { sound } from '../game/audio';
import {
  X,
  Terminal as TerminalIcon,
  HelpCircle,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface TerminalModalProps {
  puzzle: PuzzleData;
  lives: number;
  onClose: () => void;
  onSolve: () => void;
  onWrongAnswer: () => void;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({
  puzzle,
  lives,
  onClose,
  onSolve,
  onWrongAnswer,
}) => {
  const [inputAnswer, setInputAnswer] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [activeTab, setActiveTab] = useState<'puzzle' | 'helper' | 'scratchpad'>('puzzle');
  const [testNumber, setTestNumber] = useState<number>(puzzle.ciphertextNumbers[0] ?? 0);
  const [testResult, setTestResult] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sound.playTerminalOpen();
    inputRef.current?.focus();
  }, []);

  const handleTestCalculate = () => {
    sound.playClick();
    const decNum = decryptNumber(testNumber, puzzle.level);
    const letter = String.fromCharCode(65 + decNum);

    if (puzzle.level.cipher === 'single') {
      const f = puzzle.level.functions[0];
      const invA = getModularInverse(f.a, 26)!;
      const sub = mod(testNumber - f.b, 26);
      const mult = mod(invA * sub, 26);
      setTestResult(
        `Langkah: (${testNumber} - ${f.b}) mod 26 = ${sub} ➔ ${invA} × ${sub} mod 26 = ${mult} ➔ Huruf '${letter}'`
      );
    } else {
      setTestResult(`Hasil dekripsi angka ${testNumber} ➔ ${decNum} (Huruf '${letter}')`);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanGuess = inputAnswer.trim().toUpperCase().replace(/[^A-Z]/g, '');

    if (!cleanGuess) {
      setFeedback({
        type: 'error',
        message: 'Masukkan kata sandi terlebih dahulu.',
      });
      return;
    }

    if (cleanGuess === puzzle.targetWord) {
      sound.playSuccess();
      setFeedback({
        type: 'success',
        message: 'ACCESS GRANTED // PINTU KELUAR TERBUKA!',
      });
      setTimeout(() => {
        onSolve();
      }, 900);
    } else {
      sound.playError();
      const nextLives = lives - 1;
      setFeedback({
        type: 'error',
        message:
          nextLives > 0
            ? `KODE SALAH! Sisa kesempatan: ${nextLives} nyawa.`
            : 'SEMUA KESEMPATAN HABIS! Backrooms terkunci permanen.',
      });
      onWrongAnswer();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0b120f] border border-[#6fffea]/40 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Terminal Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#070b09] border-b border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-mono text-[#6fffea] font-semibold tracking-wider">
            <TerminalIcon size={16} />
            <span>SECURITY MAINFRAME // TERMINAL_01</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="Tutup Terminal"
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-[#080d0a] text-xs font-mono">
          <button
            onClick={() => setActiveTab('puzzle')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'puzzle'
                ? 'border-[#6fffea] text-[#6fffea] bg-neutral-900/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <TerminalIcon size={14} /> DEKRIPSI KODE
          </button>

          <button
            onClick={() => setActiveTab('helper')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'helper'
                ? 'border-[#6fffea] text-[#6fffea] bg-neutral-900/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <HelpCircle size={14} /> PANDUAN MODULO 26
          </button>

          <button
            onClick={() => setActiveTab('scratchpad')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === 'scratchpad'
                ? 'border-[#6fffea] text-[#6fffea] bg-neutral-900/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calculator size={14} /> KALKULATOR UJI
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-neutral-200">
          {activeTab === 'puzzle' && (
            <>
              {/* Status Header */}
              <div>
                <p className="text-[10px] font-mono text-[#6fffea] tracking-widest uppercase">
                  ENCRYPTION LOCK // LEVEL: {puzzle.level.id}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                  DECRYPT CIPHERTEXT
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Pintu keluar terkunci oleh enkripsi affine. Ubah angka ciphertext menjadi huruf pesan asli.
                </p>
              </div>

              {/* Ciphertext Display Box */}
              <div className="bg-[#050807] border border-[#6fffea]/30 rounded-lg p-4 text-center">
                <span className="block text-[10px] font-mono text-neutral-400 tracking-widest mb-1.5">
                  CIPHERTEXT (ANGKA MODULO 26)
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.3em] text-[#6fffea] drop-shadow-[0_0_12px_rgba(111,255,234,0.4)]">
                  {puzzle.cipherTextDisplay}
                </div>
              </div>

              {/* Mathematical Formulas */}
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3.5 space-y-1.5 font-mono text-xs text-[#d6c77a]">
                <div className="text-[10px] text-neutral-400 tracking-wider">
                  FUNGSI ENKRIPSI SISTEM:
                </div>
                {puzzle.level.functions.map((fn) => (
                  <div key={fn.name} className="font-semibold text-sm">
                    {fn.name}(x) = ({fn.a}x + {fn.b}) mod 26
                  </div>
                ))}
                <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80">
                  Tip Invers: f⁻¹(y) = {getModularInverse(puzzle.level.functions[0].a, 26)} × (y - {puzzle.level.functions[0].b}) mod 26
                </div>
              </div>

              {/* Answer Input Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-xs font-mono text-neutral-300">
                  MASUKKAN KATA ASLI (PLAINTEXT):
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputAnswer}
                    onChange={(e) => setInputAnswer(e.target.value.toUpperCase())}
                    placeholder="Contoh: KELUAR..."
                    maxLength={15}
                    className="flex-1 px-4 py-3 bg-[#050807] border border-neutral-700 focus:border-[#6fffea] rounded font-mono text-base tracking-widest uppercase text-white outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#d6c77a] hover:bg-[#e6d88c] text-neutral-950 font-mono font-bold text-xs tracking-wider rounded transition-colors cursor-pointer shadow-md"
                  >
                    UNLOCK EXIT
                  </button>
                </div>
              </form>

              {/* Feedback Alert */}
              {feedback.type && (
                <div
                  className={`flex items-center gap-2 p-3 rounded text-xs font-mono ${
                    feedback.type === 'success'
                      ? 'bg-[#42e6bf]/15 text-[#42e6bf] border border-[#42e6bf]/30'
                      : 'bg-[#ff5252]/15 text-[#ff5252] border border-[#ff5252]/30'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}
            </>
          )}

          {activeTab === 'helper' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lightbulb size={16} className="text-[#6fffea]" /> Cara Dekripsi Affine Cipher
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Enkripsi affine menggunakan rumus: <code className="text-[#d6c77a]">y = (a · x + b) mod 26</code>.
                  Untuk mengembalikan angka ciphertext (<code className="text-[#6fffea]">y</code>) menjadi angka asli (<code className="text-[#6fffea]">x</code>):
                </p>
                <div className="mt-2 p-3 bg-black/60 border border-neutral-800 rounded font-mono text-xs text-[#6fffea]">
                  x = a⁻¹ · (y - b) mod 26
                </div>
              </div>

              {/* Modulo Inverse Table */}
              <div>
                <div className="text-xs font-mono text-neutral-300 mb-2 font-semibold">
                  TABEL INVERS PERKALIAN MODULO 26 (a⁻¹):
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 font-mono text-xs">
                  {Object.entries(MOD_INVERSE_TABLE).map(([key, inv]) => (
                    <div
                      key={key}
                      className="p-1.5 bg-neutral-900/80 border border-neutral-800 rounded text-center"
                    >
                      <span className="text-neutral-400">a = {key}</span> ➔{' '}
                      <span className="text-[#d6c77a] font-bold">{inv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alphabet Map (A=0, B=1...) */}
              <div>
                <div className="text-xs font-mono text-neutral-300 mb-2 font-semibold">
                  TABEL NILAI HURUF (A=0 ... Z=25):
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 font-mono text-[11px]">
                  {ALPHABET_MAP.map(({ letter, num }) => (
                    <div
                      key={letter}
                      className="p-1 bg-black/50 border border-neutral-800/80 rounded text-center"
                    >
                      <span className="text-white font-bold">{letter}</span>:
                      <span className="text-[#6fffea] ml-1">{num}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scratchpad' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calculator size={16} className="text-[#6fffea]" /> Uji Hitung Per Karakter
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Pilih salah satu angka ciphertext untuk melihat proses dekripsinya secara detail:
                </p>
              </div>

              {/* Clickable Ciphertext buttons */}
              <div className="flex flex-wrap gap-2">
                {puzzle.ciphertextNumbers.map((num, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTestNumber(num);
                      setTestResult(null);
                    }}
                    className={`px-3 py-1.5 rounded font-mono text-sm border transition-colors ${
                      testNumber === num
                        ? 'bg-[#6fffea]/20 border-[#6fffea] text-[#6fffea]'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                  >
                    #{i + 1}: {num.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestCalculate}
                  className="px-4 py-2 bg-[#6fffea] hover:bg-[#8afff0] text-neutral-950 font-mono font-bold text-xs rounded transition-colors"
                >
                  HITUNG DEKRIPSI ANGKA {testNumber}
                </button>
              </div>

              {testResult && (
                <div className="p-3 bg-[#050807] border border-[#6fffea]/40 rounded font-mono text-xs text-[#6fffea] leading-relaxed">
                  {testResult}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-[#070b09] border-t border-neutral-800 flex justify-between items-center text-[11px] font-mono text-neutral-400">
          <span>TIPS: TEKAN ESC UNTUK KEMBALI KE PENJELAJAHAN</span>
          <span className="text-neutral-500">A=0, B=1, ... Z=25 (mod 26)</span>
        </div>
      </div>
    </div>
  );
};
