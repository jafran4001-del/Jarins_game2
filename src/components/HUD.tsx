import React from 'react';
import { PlayerStats, WaveInfo, Weapon } from '../types/game';
import {
  Volume2,
  VolumeX,
  ShoppingBag,
  Pause,
  Play,
  Crosshair,
  Coins,
  Shield,
  Zap,
  Magnet,
  Heart
} from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  wave: WaveInfo;
  weapon: Weapon;
  unlockedWeapons: Weapon[];
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenShop: () => void;
  onTogglePause: () => void;
  isPaused: boolean;
  autoFire: boolean;
  onToggleAutoFire: () => void;
  onSelectWeapon: (id: any) => void;
  bossZombie: { hp: number; maxHp: number } | null;
  activeBuffs: {
    shieldTime: number;
    overdriveTime: number;
    magnetTime: number;
  };
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  wave,
  weapon,
  unlockedWeapons,
  isMuted,
  onToggleMute,
  onOpenShop,
  onTogglePause,
  isPaused,
  autoFire,
  onToggleAutoFire,
  onSelectWeapon,
  bossZombie,
  activeBuffs,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const isLowHp = hpPercent <= 25;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none">
      {/* Top Header Row */}
      <header className="flex items-center justify-between gap-4 pointer-events-auto">
        {/* Left: Health & Status */}
        <div className="flex flex-col gap-1.5 bg-slate-950/80 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-xl max-w-xs w-full">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Heart className={`w-3.5 h-3.5 ${isLowHp ? 'text-rose-500 animate-pulse' : 'text-rose-400'}`} />
              <span>HEALTH</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {Math.round(stats.hp)} / {stats.maxHp} HP
            </span>
          </div>

          {/* Health Bar */}
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                isLowHp ? 'bg-rose-500 animate-pulse' : hpPercent > 50 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className={isLowHp ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              {isLowHp ? 'CRITICAL DAMAGE' : 'STABLE'}
            </span>
            <span>Speed: {stats.moveSpeed.toFixed(1)}x</span>
          </div>
        </div>

        {/* Center: Wave & Boss Tracker */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/85 backdrop-blur-md px-5 py-2.5 rounded-xl border border-slate-800 shadow-xl text-center">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              {wave.isBossWave ? 'BOSS SIEGE' : 'SURVIVAL PROGRESS'}
            </div>
            <div className="text-xl md:text-2xl font-black font-display tracking-tight text-white flex items-center justify-center gap-2">
              <span>WAVE {wave.number}</span>
              {wave.active ? (
                <span className="text-xs font-mono font-normal text-rose-400">
                  ({wave.zombiesRemaining} left)
                </span>
              ) : (
                <span className="text-xs font-mono font-medium text-emerald-400">
                  Next in {Math.ceil(wave.countdownToNext)}s
                </span>
              )}
            </div>
          </div>

          {/* Boss HP Bar */}
          {bossZombie && (
            <div className="mt-2 w-72 bg-slate-950/90 backdrop-blur-md p-2 rounded-lg border border-rose-900/60 shadow-2xl">
              <div className="flex justify-between text-[11px] font-bold text-rose-300 mb-1">
                <span>GOLIATH ABOMINATION</span>
                <span className="font-mono tabular-nums">
                  {Math.round(bossZombie.hp)} / {bossZombie.maxHp}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, (bossZombie.hp / bossZombie.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Coins & Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Gold Coin Counter */}
          <div className="flex items-center gap-2.5 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-500/30 shadow-xl">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-amber-300/80 tracking-wider">
                COINS
              </span>
              <span className="text-lg md:text-xl font-bold font-mono tabular-nums text-amber-300 leading-none">
                {stats.coins.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Armory Shop Button */}
          <button
            onClick={onOpenShop}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-xl shadow-lg hover:shadow-sky-500/20 transition-all duration-150 cursor-pointer active:scale-95"
            title="Open Armory Shop"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Armory Shop</span>
          </button>

          {/* Quick Utility Toggles */}
          <div className="flex items-center bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-800">
            <button
              onClick={onToggleMute}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio & Music' : 'Mute Audio & Music'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onTogglePause}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isPaused ? 'Resume Game' : 'Pause Game'}
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mid Active Buffs HUD */}
      <div className="flex items-center gap-2 self-start my-auto pointer-events-none">
        {activeBuffs.shieldTime > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-950/80 border border-sky-500/50 rounded-lg text-sky-300 text-xs font-semibold backdrop-blur-md animate-pulse">
            <Shield className="w-4 h-4" />
            <span>Shield: {activeBuffs.shieldTime.toFixed(1)}s</span>
          </div>
        )}
        {activeBuffs.overdriveTime > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-950/80 border border-orange-500/50 rounded-lg text-orange-300 text-xs font-semibold backdrop-blur-md animate-pulse">
            <Zap className="w-4 h-4" />
            <span>Overdrive: {activeBuffs.overdriveTime.toFixed(1)}s</span>
          </div>
        )}
        {activeBuffs.magnetTime > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/80 border border-amber-500/50 rounded-lg text-amber-300 text-xs font-semibold backdrop-blur-md animate-pulse">
            <Magnet className="w-4 h-4" />
            <span>Magnet: {activeBuffs.magnetTime.toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* Bottom Bar: Weapon Selector & Auto-Aim Control */}
      <footer className="flex flex-wrap items-end justify-between gap-4 pointer-events-auto">
        {/* Quick Weapon Slots */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl overflow-x-auto max-w-full">
          {unlockedWeapons.map((w, idx) => {
            const isEquipped = w.id === weapon.id;
            return (
              <button
                key={w.id}
                onClick={() => onSelectWeapon(w.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isEquipped
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">[{idx + 1}]</span>
                <span className="whitespace-nowrap">{w.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Weapon Details & Auto-Fire Toggle */}
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 shadow-xl">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-white uppercase tracking-wider">{weapon.name}</span>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 justify-end">
              <span>DMG: {Math.round(weapon.damage * stats.damageMultiplier)}</span>
              <span>·</span>
              <span>RPS: {(weapon.fireRate * stats.fireRateMultiplier).toFixed(1)}</span>
            </div>
          </div>

          <button
            onClick={onToggleAutoFire}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              autoFire
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Automatic Aim & Fire"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Auto-Fire: {autoFire ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
