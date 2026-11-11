import React from 'react';
import { RotateCcw, Trophy, Skull, Coins, Flame } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  onRestart: () => void;
  stats: {
    wave: number;
    score: number;
    kills: number;
    coins: number;
  };
  highScore: number;
  isNewHigh: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onRestart,
  stats,
  highScore,
  isNewHigh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl">
        {/* Skull / Badge */}
        <div className="w-16 h-16 bg-rose-950/80 border border-rose-600/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-950/50">
          <Skull className="w-8 h-8 text-rose-500" />
        </div>

        <h2 className="text-2xl font-black font-display tracking-tight text-white mb-1">
          SURVIVOR DOWN
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          The zombie horde overwhelmed your perimeter defense.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Waves Cleared
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {stats.wave}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-0.5">
              <Skull className="w-3.5 h-3.5 text-rose-400" /> Zombies Slain
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {stats.kills}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-0.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Coins Earned
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-amber-300">
              {stats.coins.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-0.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Final Score
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {stats.score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* High Score Status */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800 mb-6 text-xs">
          <span className="text-slate-400 font-medium">Personal Best</span>
          <div className="flex items-center gap-2">
            {isNewHigh && (
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                New Record!
              </span>
            )}
            <span className="font-mono font-bold text-slate-200">
              {highScore.toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold font-display text-sm tracking-wide rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Deploy Again</span>
        </button>
      </div>
    </div>
  );
};
