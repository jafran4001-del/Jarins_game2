import React, { useState } from 'react';
import { Weapon, UpgradeOption, PlayerStats, WeaponId } from '../types/game';
import { Coins, X, Check, Lock, Shield, Zap, Crosshair, Heart, ArrowUpRight } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  weapons: Weapon[];
  currentWeaponId: WeaponId;
  upgrades: UpgradeOption[];
  onBuyWeapon: (weaponId: WeaponId) => void;
  onEquipWeapon: (weaponId: WeaponId) => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onBuyMedkit: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  stats,
  weapons,
  currentWeaponId,
  upgrades,
  onBuyWeapon,
  onEquipWeapon,
  onBuyUpgrade,
  onBuyMedkit,
}) => {
  const [activeTab, setActiveTab] = useState<'weapons' | 'upgrades'>('weapons');

  if (!isOpen) return null;

  const canAffordMedkit = stats.coins >= 20 && stats.hp < stats.maxHp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-display tracking-tight text-white">
              Armory & Survivor Upgrades
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Spend coins to reinforce firepower and survival stats
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Coins Balance */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-300 font-bold font-mono tabular-nums text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{stats.coins.toLocaleString()} Coins</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Shop"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Tab Bar & Quick Emergency Heal */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('weapons')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'weapons'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Weapons Arsenal ({weapons.filter((w) => w.unlocked).length}/{weapons.length})
            </button>
            <button
              onClick={() => setActiveTab('upgrades')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'upgrades'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Survivor Enhancements
            </button>
          </div>

          {/* Quick Medkit Purchase */}
          <button
            onClick={() => {
              if (canAffordMedkit) {
                onBuyMedkit();
                soundEngine.playPurchase();
              }
            }}
            disabled={!canAffordMedkit}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              canAffordMedkit
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm active:scale-95'
                : 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>Emergency Medkit (+50 HP): 20 Coins</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'weapons' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weapons.map((w) => {
                const isEquipped = w.id === currentWeaponId;
                const canAfford = stats.coins >= w.price;

                return (
                  <div
                    key={w.id}
                    className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                      isEquipped
                        ? 'bg-sky-950/30 border-sky-500/50 shadow-md shadow-sky-500/10'
                        : w.unlocked
                        ? 'bg-slate-800/40 border-slate-700/60'
                        : 'bg-slate-900/60 border-slate-800 opacity-90'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-white text-base leading-snug">{w.name}</h3>
                          <span className="text-[11px] text-slate-400">Tier {w.tier} Firearm</span>
                        </div>
                        {isEquipped ? (
                          <span className="text-[11px] font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                            Equipped
                          </span>
                        ) : !w.unlocked ? (
                          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-400 mb-4 min-h-[32px]">{w.description}</p>

                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-lg mb-4">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Damage</span>
                          <span className="font-mono font-bold text-slate-200">
                            {Math.round(w.damage * stats.damageMultiplier)}
                            {w.bulletCount > 1 && ` x${w.bulletCount}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Fire Rate</span>
                          <span className="font-mono font-bold text-slate-200">
                            {(w.fireRate * stats.fireRateMultiplier).toFixed(1)} /s
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Penetration</span>
                          <span className="font-mono font-bold text-slate-200">{w.penetration} targets</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Special</span>
                          <span className="font-mono font-bold text-slate-200">
                            {w.splashRadius ? `Splash ${w.splashRadius}px` : 'Direct hit'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {w.unlocked ? (
                      <button
                        onClick={() => {
                          onEquipWeapon(w.id);
                        }}
                        disabled={isEquipped}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isEquipped
                            ? 'bg-slate-800 text-slate-400 cursor-default'
                            : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95'
                        }`}
                      >
                        {isEquipped ? 'Currently Equipped' : 'Equip Weapon'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (canAfford) {
                            onBuyWeapon(w.id);
                            soundEngine.playPurchase();
                          }
                        }}
                        disabled={!canAfford}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Unlock for {w.price} Coins</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upgrades.map((u) => {
                const isMax = u.level >= u.maxLevel;
                const canAfford = stats.coins >= u.cost && !isMax;

                return (
                  <div
                    key={u.id}
                    className="flex flex-col justify-between p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-white text-base">{u.title}</h3>
                        <span className="font-mono text-xs text-sky-400 font-semibold">
                          Rank {u.level} / {u.maxLevel}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mb-3">{u.description}</p>

                      {/* Level Progress Pip Bars */}
                      <div className="flex items-center gap-1 mb-4">
                        {Array.from({ length: u.maxLevel }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 flex-1 rounded-sm ${
                              i < u.level ? 'bg-sky-500' : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (canAfford) {
                          onBuyUpgrade(u.id);
                          soundEngine.playPurchase();
                        }
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 cursor-default'
                          : canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? (
                        <span>Max Rank Reached</span>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span>Upgrade Rank {u.level + 1} ({u.cost} Coins)</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Coins are earned by defeating zombies and clearing waves.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-sky-500/20 transition-all cursor-pointer"
          >
            Return to Battle
          </button>
        </footer>
      </div>
    </div>
  );
};
