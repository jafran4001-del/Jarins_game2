import React, { useState } from 'react';
import {
  Skull,
  Coins,
  Shield,
  Volume2,
  VolumeX,
  Play,
  Crosshair,
  Sliders,
  Sparkles,
  Zap
} from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface TitleScreenProps {
  onStartGame: (difficulty: 'CASUAL' | 'SURVIVOR' | 'NIGHTMARE') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  highScore: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
  highScore,
}) => {
  const [difficulty, setDifficulty] = useState<'CASUAL' | 'SURVIVOR' | 'NIGHTMARE'>('SURVIVOR');
  const [musicVol, setMusicVol] = useState(soundEngine.musicVolume);
  const [sfxVol, setSfxVol] = useState(soundEngine.sfxVolume);

  const handleStart = () => {
    soundEngine.init();
    onStartGame(difficulty);
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    soundEngine.setMusicVolume(val);
  };

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    soundEngine.setSfxVolume(val);
    soundEngine.playCoinSound();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950 select-none overflow-y-auto">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl flex flex-col my-auto">
        {/* Title Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-950/60 border border-rose-800/60 rounded-full text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Skull className="w-3.5 h-3.5" /> Zombie Survival Action
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white mb-2 leading-none">
            ZOMBIE OUTBREAK
          </h1>
          <p className="text-sm md:text-base text-slate-300 font-medium">
            Collect coins, upgrade your arsenal, and withstand the relentless undead horde.
          </p>
        </div>

        {/* Highlight Features Strip */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col items-center">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg mb-1.5">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Fallen Coins</span>
            <span className="text-[11px] text-slate-400">Unlock 6 firearms & perks</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col items-center">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg mb-1.5">
              <Volume2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Dynamic Music</span>
            <span className="text-[11px] text-slate-400">Procedural synthwave OST</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col items-center">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg mb-1.5">
              <Crosshair className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Wave Defense</span>
            <span className="text-[11px] text-slate-400">Bosses, spitters & tanks</span>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Combat Difficulty
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {(['CASUAL', 'SURVIVOR', 'NIGHTMARE'] as const).map((mode) => {
              const active = difficulty === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setDifficulty(mode)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? mode === 'NIGHTMARE'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {mode === 'CASUAL' && 'Casual (120 HP)'}
                  {mode === 'SURVIVOR' && 'Survivor (Normal)'}
                  {mode === 'NIGHTMARE' && 'Nightmare (Hard)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Controls */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Audio & Synth Music
            </span>
            <button
              onClick={onToggleMute}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" /> <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> <span>Sound On</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Music Volume</span>
                <span className="font-mono">{Math.round(musicVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVol}
                onChange={(e) => handleMusicChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>SFX Volume</span>
                <span className="font-mono">{Math.round(sfxVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVol}
                onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Controls Info Banner */}
        <div className="text-xs text-slate-400 mb-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Controls:</span>
            <span>WASD / Arrow Keys to move</span>
            <span>·</span>
            <span>Mouse to aim & shoot</span>
            <span>·</span>
            <span>1-6 keys swap weapons</span>
          </div>
          {highScore > 0 && (
            <div className="font-mono text-slate-300 font-semibold">
              Best: {highScore.toLocaleString()} pts
            </div>
          )}
        </div>

        {/* Play Action */}
        <button
          onClick={handleStart}
          className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-500 text-white font-extrabold font-display text-base tracking-wide rounded-2xl shadow-xl shadow-rose-950/60 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>START SURVIVAL</span>
        </button>
      </div>
    </div>
  );
};
