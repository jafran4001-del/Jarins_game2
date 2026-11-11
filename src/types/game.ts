/**
 * Game Types and Constants
 */

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'SHOP' | 'GAME_OVER';

export type ZombieType = 'WALKER' | 'RUNNER' | 'TANK' | 'SPITTER' | 'BOSS';

export type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'plasma' | 'rocket';

export interface Weapon {
  id: WeaponId;
  name: string;
  description: string;
  price: number;
  damage: number;
  fireRate: number; // shots per second
  bulletSpeed: number;
  bulletCount: number; // e.g. 5 for shotgun
  spread: number; // radians
  penetration: number;
  splashRadius?: number;
  color: string;
  bulletSize: number;
  unlocked: boolean;
  tier: number;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  moveSpeed: number;
  damageMultiplier: number;
  fireRateMultiplier: number;
  magnetRadius: number;
  coins: number;
  totalCoinsEarned: number;
  zombiesKilled: number;
  score: number;
  hasDrone: boolean;
  droneDamage: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  angle: number;
  vx: number;
  vy: number;
  currentWeaponId: WeaponId;
  lastShotTime: number;
  invulnerableTime: number;
  shieldTime: number;
  overdriveTime: number;
  magnetActiveTime: number;
}

export interface Drone {
  x: number;
  y: number;
  angle: number;
  lastShotTime: number;
  orbitAngle: number;
}

export interface Zombie {
  id: number;
  type: ZombieType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  damage: number;
  coinsDrop: number;
  color: string;
  lastAttackTime: number;
  lastSpitTime?: number;
  hitFlashTime: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  isPlayer: boolean;
  penetration: number;
  life: number;
  maxLife: number;
  splashRadius?: number;
  isAcid?: boolean;
}

export interface CoinItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  radius: number;
  rotation: number;
  life: number;
  isMagnetized: boolean;
}

export type PowerUpType = 'MEDKIT' | 'MAGNET' | 'NUKE' | 'OVERDRIVE' | 'SHIELD';

export interface PowerUpItem {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  radius: number;
  life: number;
  bobOffset: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface Splatter {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  alpha: number;
  vy: number;
}

export interface WaveInfo {
  number: number;
  zombiesToSpawn: number;
  zombiesRemaining: number;
  spawnTimer: number;
  spawnInterval: number;
  isBossWave: boolean;
  active: boolean;
  countdownToNext: number;
}

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  statKey: string;
  increment: number;
}
