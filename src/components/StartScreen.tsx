import React from 'react';
import { Difficulty } from '../game/types';
import { LEVELS } from '../game/cipher';
import { sound } from '../game/audio';
import { Compass, Play, Shield, Zap, Sparkles } from 'lucide-react';

interface StartScreenProps {
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  selectedDifficulty,
  onSelectDifficulty,
  onStart,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-gradient-to-br from-[#0c0f0c]/95 via-[#111612]/95 to-[#080b08]/95 backdrop-blur-md">
      <div className="w-full max-w-xl bg-gradient-to-b from-[#161c18]/95 to-[#0b0e0c]/98 border border-[#d6c77a]/30 rounded-2xl shadow-[0_25px_90px_rgba(0,0,0,0.95)] p-6 sm:p-8 flex flex-col space-y-6">
        {/* Eyebrow & Title Lockup */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6fffea]/10 border border-[#6fffea]/30 text-[#6fffea] font-mono text-[10px] tracking-widest uppercase">
            <Sparkles size={12} />
            <span>YOU ARE NOT SUPPOSED TO BE HERE</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
            THE LAST <span className="text-[#d6c77a]">EXIT</span>
          </h1>

          <p className="text-xs font-mono text-neutral-400 tracking-wider">
            MATHCIPHER 3D // PENJELAJAHAN BACKROOMS & KRIPTOGRAFI AFFINE
          </p>
        </div>

        {/* Narrative */}
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed text-center font-normal px-2">
          Kamu terjebak di lorong Backrooms yang sepi dan membingungkan. Pintu keluar darurat
          terkunci oleh kode terminal kriptografi. Telusuri lorong, cari terminal, pecahkan fungsi
          matematika modulo 26, dan capai pintu keluar sebelum energimu habis!
        </p>

        {/* Difficulty Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>PILIH TINGKAT KESULITAN:</span>
            <span className="text-[#d6c77a]">{LEVELS[selectedDifficulty].badge}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => {
              const active = selectedDifficulty === diff;
              const lvl = LEVELS[diff];
              return (
                <button
                  key={diff}
                  onClick={() => {
                    sound.playClick();
                    onSelectDifficulty(diff);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'bg-[#d6c77a]/15 border-[#d6c77a] text-white shadow-[0_0_15px_rgba(214,199,122,0.25)]'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <span className="font-mono text-xs font-bold tracking-wider">
                    {lvl.id}
                  </span>
                  <span className="text-[10px] font-mono opacity-80 mt-1">
                    10 Menit • {lvl.initialLives}♥
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-2.5 bg-black/50 border border-neutral-800/80 rounded-md text-[11px] font-mono text-neutral-400 leading-normal">
            {LEVELS[selectedDifficulty].desc}
          </div>
        </div>

        {/* Start Game CTA */}
        <button
          onClick={() => {
            sound.playClick();
            onStart();
          }}
          className="w-full py-4 bg-gradient-to-r from-[#d6c77a] to-[#e6d88c] hover:brightness-110 text-neutral-950 font-mono font-bold text-sm tracking-widest uppercase rounded-lg shadow-[0_10px_30px_rgba(214,199,122,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Play size={18} fill="currentColor" />
          <span>MASUK KE BACKROOMS (MULAI)</span>
        </button>

        {/* Controls Footer */}
        <div className="pt-2 border-t border-neutral-800/80 flex flex-col items-center gap-1.5 text-center text-[10px] font-mono text-neutral-400">
          <div className="flex items-center gap-2 text-neutral-300">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700">WASD</kbd>
            <span>Gerak</span>
            <span>•</span>
            <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700">SHIFT</kbd>
            <span>Lari</span>
            <span>•</span>
            <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700">MOUSE</kbd>
            <span>Kamera</span>
            <span>•</span>
            <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700">E</kbd>
            <span>Interaksi</span>
          </div>
          <span>Tekan ENTER atau SPACE untuk memulai</span>
        </div>
      </div>
    </div>
  );
};
