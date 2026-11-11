import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import {
  GameState,
  PlayerStats,
  WaveInfo,
  Weapon,
  WeaponId,
  UpgradeOption,
} from './types/game';
import { INITIAL_UPGRADES, INITIAL_WEAPONS } from './game/weaponsAndUpgrades';
import { soundEngine } from './audio/SoundEngine';
import { HUD } from './components/HUD';
import { ShopModal } from './components/ShopModal';
import { GameOverModal } from './components/GameOverModal';
import { TitleScreen } from './components/TitleScreen';
import { VirtualControls } from './components/VirtualControls';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [stats, setStats] = useState<PlayerStats>({
    maxHp: 100,
    hp: 100,
    moveSpeed: 3.5,
    damageMultiplier: 1.0,
    fireRateMultiplier: 1.0,
    magnetRadius: 100,
    coins: 0,
    totalCoinsEarned: 0,
    zombiesKilled: 0,
    score: 0,
    hasDrone: false,
    droneDamage: 14,
  });

  const [wave, setWave] = useState<WaveInfo>({
    number: 1,
    zombiesToSpawn: 14,
    zombiesRemaining: 14,
    spawnTimer: 0,
    spawnInterval: 1.1,
    isBossWave: false,
    active: true,
    countdownToNext: 0,
  });

  const [weapons, setWeapons] = useState<Weapon[]>(INITIAL_WEAPONS);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>(INITIAL_WEAPONS[0]);
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>(INITIAL_UPGRADES);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoFire, setAutoFire] = useState<boolean>(true);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('zombie_game_high_score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const [gameOverStats, setGameOverStats] = useState<{
    wave: number;
    score: number;
    kills: number;
    coins: number;
  }>({
    wave: 1,
    score: 0,
    kills: 0,
    coins: 0,
  });

  const [bossStatus, setBossStatus] = useState<{ hp: number; maxHp: number } | null>(null);
  const [activeBuffs, setActiveBuffs] = useState({
    shieldTime: 0,
    overdriveTime: 0,
    magnetTime: 0,
  });

  // Track boss and active buff states for HUD
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current && gameState === 'PLAYING') {
        const eng = engineRef.current;
        const boss = eng.zombies.find((z) => z.type === 'BOSS');
        if (boss) {
          setBossStatus({ hp: boss.hp, maxHp: boss.maxHp });
        } else {
          setBossStatus(null);
        }

        setActiveBuffs({
          shieldTime: eng.player.shieldTime,
          overdriveTime: eng.player.overdriveTime,
          magnetTime: eng.player.magnetActiveTime,
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  // Handle Game Over
  const handleGameOver = useCallback((finalStats: { wave: number; score: number; kills: number; coins: number }) => {
    setGameOverStats(finalStats);
    setGameState('GAME_OVER');

    const currentBest = parseInt(localStorage.getItem('zombie_game_high_score') || '0', 10);
    if (finalStats.score > currentBest) {
      localStorage.setItem('zombie_game_high_score', finalStats.score.toString());
      setHighScore(finalStats.score);
      setIsNewHigh(true);
    } else {
      setIsNewHigh(false);
    }
  }, []);

  // Initialize Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStatsUpdate: (newStats) => setStats(newStats),
      onWaveUpdate: (newWave) => setWave(newWave),
      onWeaponUpdate: (newWeapon) => setCurrentWeapon(newWeapon),
      onGameOver: handleGameOver,
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [handleGameOver]);

  // Keyboard shortcuts for Shop, Mute, Pause
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'PLAYING') {
          togglePause();
        } else if (gameState === 'PAUSED') {
          togglePause();
        } else if (gameState === 'SHOP') {
          closeShop();
        }
      } else if (e.key === 'b' || e.key === 'B') {
        if (gameState === 'PLAYING') {
          openShop();
        } else if (gameState === 'SHOP') {
          closeShop();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameState, isMuted]);

  // Start game with chosen difficulty
  const startGame = (difficulty: 'CASUAL' | 'SURVIVOR' | 'NIGHTMARE') => {
    if (!engineRef.current) return;
    setGameState('PLAYING');
    setUpgrades(INITIAL_UPGRADES.map((u) => ({ ...u })));
    setWeapons(INITIAL_WEAPONS.map((w) => ({ ...w })));
    setCurrentWeapon(INITIAL_WEAPONS[0]);
    engineRef.current.reset(difficulty);
    setTimeout(() => {
      canvasRef.current?.focus();
    }, 50);
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    if (gameState === 'PLAYING') {
      engineRef.current.pause();
      soundEngine.stopMusic();
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      engineRef.current.resume();
      soundEngine.startMusic();
      setGameState('PLAYING');
    }
  };

  const openShop = () => {
    if (!engineRef.current) return;
    engineRef.current.pause();
    setGameState('SHOP');
  };

  const closeShop = () => {
    if (!engineRef.current) return;
    engineRef.current.resume();
    setGameState('PLAYING');
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMute(next);
  };

  const toggleAutoFire = () => {
    const next = !autoFire;
    setAutoFire(next);
    if (engineRef.current) {
      engineRef.current.autoFire = next;
    }
  };

  const handleSelectWeapon = (id: WeaponId) => {
    if (engineRef.current) {
      engineRef.current.selectWeapon(id);
    }
  };

  // Armory: Buy Weapon
  const handleBuyWeapon = (weaponId: WeaponId) => {
    if (!engineRef.current) return;
    const targetWeapon = engineRef.current.weapons.get(weaponId);
    if (!targetWeapon || targetWeapon.unlocked) return;

    if (engineRef.current.stats.coins >= targetWeapon.price) {
      engineRef.current.stats.coins -= targetWeapon.price;
      targetWeapon.unlocked = true;

      // Update state
      const updatedWeapons = Array.from(engineRef.current.weapons.values());
      setWeapons(updatedWeapons);
      setStats({ ...engineRef.current.stats });

      // Automatically equip
      engineRef.current.selectWeapon(weaponId);
    }
  };

  // Armory: Equip Weapon
  const handleEquipWeapon = (weaponId: WeaponId) => {
    if (!engineRef.current) return;
    engineRef.current.selectWeapon(weaponId);
  };

  // Armory: Buy Upgrade
  const handleBuyUpgrade = (upgradeId: string) => {
    if (!engineRef.current) return;
    const upIdx = upgrades.findIndex((u) => u.id === upgradeId);
    if (upIdx === -1) return;

    const up = upgrades[upIdx];
    if (up.level >= up.maxLevel) return;

    if (engineRef.current.stats.coins >= up.cost) {
      engineRef.current.stats.coins -= up.cost;

      // Apply to engine stats
      const currentStats = engineRef.current.stats;
      switch (up.id) {
        case 'damage':
          currentStats.damageMultiplier += up.increment;
          break;
        case 'fireRate':
          currentStats.fireRateMultiplier += up.increment;
          break;
        case 'speed':
          currentStats.moveSpeed += up.increment;
          break;
        case 'magnet':
          currentStats.magnetRadius += up.increment;
          break;
        case 'maxHp':
          currentStats.maxHp += up.increment;
          currentStats.hp = Math.min(currentStats.maxHp, currentStats.hp + up.increment);
          break;
        case 'drone':
          currentStats.hasDrone = true;
          currentStats.droneDamage += 8;
          break;
      }

      // Next level cost increases by 40%
      const newUpgrades = [...upgrades];
      newUpgrades[upIdx] = {
        ...up,
        level: up.level + 1,
        cost: Math.round(up.cost * 1.45),
      };

      setUpgrades(newUpgrades);
      setStats({ ...currentStats });
    }
  };

  // Armory: Buy Emergency Medkit
  const handleBuyMedkit = () => {
    if (!engineRef.current) return;
    const currentStats = engineRef.current.stats;
    if (currentStats.coins >= 20 && currentStats.hp < currentStats.maxHp) {
      currentStats.coins -= 20;
      currentStats.hp = Math.min(currentStats.maxHp, currentStats.hp + 50);
      setStats({ ...currentStats });
    }
  };

  const handleVirtualMove = (vx: number, vy: number) => {
    if (engineRef.current) {
      engineRef.current.setVirtualMove(vx, vy);
    }
  };

  const unlockedWeapons = weapons.filter((w) => w.unlocked);

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden font-sans">
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onClick={() => canvasRef.current?.focus()}
        className="absolute inset-0 w-full h-full cursor-crosshair outline-none"
      />

      {/* Movement Quick Tip */}
      {(gameState === 'PLAYING') && wave.number <= 2 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-full text-xs text-slate-300 font-medium backdrop-blur-md shadow-lg flex items-center gap-2 animate-in fade-in duration-300">
          <span className="font-bold text-sky-400">MOVE:</span>
          <span>WASD / Arrow Keys</span>
          <span className="text-slate-500">·</span>
          <span>Drag Joystick (Lower-Left)</span>
          <span className="text-slate-500">·</span>
          <span>Right-Click Ground</span>
        </div>
      )}

      {/* Title Menu */}
      {gameState === 'MENU' && (
        <TitleScreen
          onStartGame={startGame}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          highScore={highScore}
        />
      )}

      {/* In-Game HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <>
          <HUD
            stats={stats}
            wave={wave}
            weapon={currentWeapon}
            unlockedWeapons={unlockedWeapons}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onOpenShop={openShop}
            onTogglePause={togglePause}
            isPaused={gameState === 'PAUSED'}
            autoFire={autoFire}
            onToggleAutoFire={toggleAutoFire}
            onSelectWeapon={handleSelectWeapon}
            bossZombie={bossStatus}
            activeBuffs={activeBuffs}
          />
          <VirtualControls onMove={handleVirtualMove} />
        </>
      )}

      {/* Pause Screen Overlay */}
      {gameState === 'PAUSED' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold font-display text-white mb-2">GAME PAUSED</h2>
            <p className="text-xs text-slate-400 mb-6">
              Press [P] or click Resume to continue survival.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={togglePause}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Resume Battle
              </button>
              <button
                onClick={openShop}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Open Armory Shop
              </button>
              <button
                onClick={() => {
                  if (engineRef.current) engineRef.current.stop();
                  setGameState('MENU');
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 text-xs rounded-xl transition-all cursor-pointer"
              >
                Quit to Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      <ShopModal
        isOpen={gameState === 'SHOP'}
        onClose={closeShop}
        stats={stats}
        weapons={weapons}
        currentWeaponId={currentWeapon.id}
        upgrades={upgrades}
        onBuyWeapon={handleBuyWeapon}
        onEquipWeapon={handleEquipWeapon}
        onBuyUpgrade={handleBuyUpgrade}
        onBuyMedkit={handleBuyMedkit}
      />

      {/* Game Over Screen */}
      <GameOverModal
        isOpen={gameState === 'GAME_OVER'}
        onRestart={() => startGame('SURVIVOR')}
        stats={gameOverStats}
        highScore={highScore}
        isNewHigh={isNewHigh}
      />
    </div>
  );
}
