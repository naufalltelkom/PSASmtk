import React from 'react';
import { GameStatus, PuzzleData, PlayerStats } from '../game/types';
import { Trophy, Skull, RotateCcw, Menu, Sparkles } from 'lucide-react';
import { sound } from '../game/audio';

interface EndScreenProps {
  status: GameStatus;
  stats: PlayerStats;
  puzzle: PuzzleData;
  onRetry: () => void;
  onMenu: () => void;
}

export const EndScreen: React.FC<EndScreenProps> = ({
  status,
  stats,
  puzzle,
  onRetry,
  onMenu,
}) => {
  const isVictory = status === 'VICTORY';
  const timeUsed = stats.maxTime - stats.timeLeft;
  const minutes = Math.floor(timeUsed / 60);
  const seconds = timeUsed % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#151c18] to-[#0c100e] border border-neutral-700/80 rounded-2xl shadow-[0_25px_90px_rgba(0,0,0,0.9)] p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
        {/* Status Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
            isVictory
              ? 'bg-[#42e6bf]/20 text-[#42e6bf] border border-[#42e6bf]/40 shadow-[0_0_25px_rgba(66,230,191,0.3)]'
              : 'bg-[#ff5252]/20 text-[#ff5252] border border-[#ff5252]/40 shadow-[0_0_25px_rgba(255,82,82,0.3)]'
          }`}
        >
          {isVictory ? <Trophy size={32} /> : <Skull size={32} />}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <p
            className={`font-mono text-xs tracking-widest uppercase ${
              isVictory ? 'text-[#42e6bf]' : 'text-[#ff5252]'
            }`}
          >
            {isVictory ? 'MISSION COMPLETE' : 'MISSION FAILED'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isVictory ? 'YOU ESCAPED' : 'TRAPPED IN BACKROOMS'}
          </h2>
          <p className="text-xs text-neutral-300 max-w-md pt-1">
            {isVictory
              ? 'Kamu berhasil memecahkan sistem keamanan kriptografi dan membuka pintu darurat sebelum waktu habis!'
              : stats.lives <= 0
              ? 'Nyawamu habis akibat kesalahan input kode. Sistem Backrooms mengunci pintunya secara permanen.'
              : 'Waktu habis! Udara dan energimu tidak cukup untuk bertahan di Backrooms.'}
          </p>
        </div>

        {/* Game Stats Summary */}
        <div className="w-full grid grid-cols-3 gap-2 p-3 bg-black/60 border border-neutral-800 rounded-xl font-mono text-xs">
          <div className="flex flex-col items-center p-2 rounded bg-neutral-900/40">
            <span className="text-[10px] text-neutral-500">WAKTU</span>
            <span className="text-sm font-bold text-white mt-0.5">{timeFormatted}</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded bg-neutral-900/40">
            <span className="text-[10px] text-neutral-500">SISA NYAWA</span>
            <span className="text-sm font-bold text-[#ff5252] mt-0.5">
              {'♥ '.repeat(stats.lives)}
            </span>
          </div>

          <div className="flex flex-col items-center p-2 rounded bg-neutral-900/40">
            <span className="text-[10px] text-neutral-500">LEVEL</span>
            <span className="text-sm font-bold text-[#d6c77a] mt-0.5">
              {stats.difficulty}
            </span>
          </div>
        </div>

        {/* Word Reveal */}
        <div className="w-full p-3 bg-[#070b09] border border-neutral-800/80 rounded-lg text-xs font-mono">
          <span className="text-neutral-400">KATA KUNCI RAHASIA: </span>
          <span className="text-[#6fffea] font-bold text-sm tracking-widest">
            {puzzle.targetWord}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={() => {
              sound.playClick();
              onRetry();
            }}
            className="w-full py-3.5 bg-[#d6c77a] hover:bg-[#e6d88c] text-neutral-950 font-mono font-bold text-xs tracking-wider uppercase rounded-lg shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>MAIN LAGI</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onMenu();
            }}
            className="w-full py-2.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 font-mono text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Menu size={16} />
            <span>KEMBALI KE MENU UTAMA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
