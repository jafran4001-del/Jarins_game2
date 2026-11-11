import {
  Player,
  PlayerStats,
  Zombie,
  ZombieType,
  Bullet,
  CoinItem,
  PowerUpItem,
  Particle,
  Splatter,
  FloatingText,
  Drone,
  WaveInfo,
  Weapon,
  WeaponId,
  PowerUpType
} from '../types/game';
import { soundEngine } from '../audio/SoundEngine';
import { INITIAL_WEAPONS } from './weaponsAndUpgrades';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onWaveUpdate: (wave: WaveInfo) => void;
  onWeaponUpdate: (weapon: Weapon) => void;
  onGameOver: (finalStats: { wave: number; score: number; kills: number; coins: number }) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // World dimensions
  public readonly worldWidth = 2400;
  public readonly worldHeight = 2400;

  // Camera
  public camera = { x: 0, y: 0 };
  public screenShake = 0;

  // Entities
  public player: Player;
  public stats: PlayerStats;
  public weapons: Map<WeaponId, Weapon>;
  public currentWeapon: Weapon;
  public drone: Drone | null = null;

  public zombies: Zombie[] = [];
  public bullets: Bullet[] = [];
  public coins: CoinItem[] = [];
  public powerUps: PowerUpItem[] = [];
  public particles: Particle[] = [];
  public splatters: Splatter[] = [];
  public floatingTexts: FloatingText[] = [];

  // Wave system
  public wave: WaveInfo = {
    number: 1,
    zombiesToSpawn: 12,
    zombiesRemaining: 12,
    spawnTimer: 0,
    spawnInterval: 1.2,
    isBossWave: false,
    active: true,
    countdownToNext: 0,
  };

  // Input states
  public keys: { [key: string]: boolean } = {};
  public mouse = { x: 0, y: 0, isDown: false, worldX: 0, worldY: 0 };
  public autoFire = true;
  public isTouchDevice = false;

  // Loop control
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private isRunning = false;
  private isPaused = false;
  private nextId = 1;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.callbacks = callbacks;

    // Initialize weapons map
    this.weapons = new Map();
    INITIAL_WEAPONS.forEach(w => this.weapons.set(w.id, { ...w }));
    this.currentWeapon = this.weapons.get('pistol')!;

    // Initial stats
    this.stats = {
      maxHp: 100,
      hp: 100,
      moveSpeed: 4.2,
      damageMultiplier: 1.0,
      fireRateMultiplier: 1.0,
      magnetRadius: 100,
      coins: 0,
      totalCoinsEarned: 0,
      zombiesKilled: 0,
      score: 0,
      hasDrone: false,
      droneDamage: 14,
    };

    // Initial player
    this.player = {
      x: this.worldWidth / 2,
      y: this.worldHeight / 2,
      radius: 18,
      angle: 0,
      vx: 0,
      vy: 0,
      currentWeaponId: 'pistol',
      lastShotTime: 0,
      invulnerableTime: 0,
      shieldTime: 0,
      overdriveTime: 0,
      magnetActiveTime: 0,
    };

    this.bindEvents();
    this.resizeCanvas();
  }

  private bindEvents() {
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch controls
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  public resizeCanvas = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys[key] = true;
    if (e.code) {
      this.keys[e.code.toLowerCase()] = true;
    }

    if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
      const idx = parseInt(e.key) - 1;
      const weaponList = Array.from(this.weapons.values());
      if (weaponList[idx] && weaponList[idx].unlocked) {
        this.selectWeapon(weaponList[idx].id);
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
    if (e.code) {
      this.keys[e.code.toLowerCase()] = false;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.worldX = this.mouse.x + this.camera.x;
    this.mouse.worldY = this.mouse.y + this.camera.y;

    if (this.isRightMouseDown) {
      this.targetDestination = { x: this.mouse.worldX, y: this.mouse.worldY };
    }
  };

  public isRightMouseDown = false;
  public targetDestination: { x: number; y: number } | null = null;

  private handleMouseDown = (e: MouseEvent) => {
    this.canvas.focus();
    if (e.button === 0) {
      this.mouse.isDown = true;
    } else if (e.button === 2) {
      // Right click to move
      this.isRightMouseDown = true;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left + this.camera.x;
      const clickY = e.clientY - rect.top + this.camera.y;
      this.targetDestination = { x: clickX, y: clickY };
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouse.isDown = false;
    } else if (e.button === 2) {
      this.isRightMouseDown = false;
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    this.isTouchDevice = true;
    this.mouse.isDown = true;
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = touch.clientX - rect.left;
      this.mouse.y = touch.clientY - rect.top;
      this.mouse.worldX = this.mouse.x + this.camera.x;
      this.mouse.worldY = this.mouse.y + this.camera.y;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = touch.clientX - rect.left;
      this.mouse.y = touch.clientY - rect.top;
      this.mouse.worldX = this.mouse.x + this.camera.x;
      this.mouse.worldY = this.mouse.y + this.camera.y;
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      this.mouse.isDown = false;
    }
  };

  public selectWeapon(id: WeaponId) {
    const weapon = this.weapons.get(id);
    if (weapon && weapon.unlocked) {
      this.currentWeapon = weapon;
      this.player.currentWeaponId = id;
      this.callbacks.onWeaponUpdate(weapon);
      soundEngine.playGunshot(id);
    }
  }

  public setVirtualMove(vx: number, vy: number) {
    this.virtualMove = { x: vx, y: vy };
  }
  private virtualMove = { x: 0, y: 0 };

  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    soundEngine.startMusic();
    this.loop(this.lastTime);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    soundEngine.stopMusic();
  }

  public reset(difficulty: 'CASUAL' | 'SURVIVOR' | 'NIGHTMARE' = 'SURVIVOR') {
    this.weapons = new Map();
    INITIAL_WEAPONS.forEach(w => this.weapons.set(w.id, { ...w }));
    this.currentWeapon = this.weapons.get('pistol')!;

    const maxHp = difficulty === 'CASUAL' ? 120 : difficulty === 'NIGHTMARE' ? 80 : 100;
    this.stats = {
      maxHp,
      hp: maxHp,
      moveSpeed: 4.2,
      damageMultiplier: difficulty === 'CASUAL' ? 1.25 : 1.0,
      fireRateMultiplier: 1.0,
      magnetRadius: 100,
      coins: 0,
      totalCoinsEarned: 0,
      zombiesKilled: 0,
      score: 0,
      hasDrone: false,
      droneDamage: 14,
    };

    this.player = {
      x: this.worldWidth / 2,
      y: this.worldHeight / 2,
      radius: 18,
      angle: 0,
      vx: 0,
      vy: 0,
      currentWeaponId: 'pistol',
      lastShotTime: 0,
      invulnerableTime: 0,
      shieldTime: 0,
      overdriveTime: 0,
      magnetActiveTime: 0,
    };

    this.drone = null;
    this.zombies = [];
    this.bullets = [];
    this.coins = [];
    this.powerUps = [];
    this.particles = [];
    this.splatters = [];
    this.floatingTexts = [];

    this.wave = {
      number: 1,
      zombiesToSpawn: 14,
      zombiesRemaining: 14,
      spawnTimer: 0,
      spawnInterval: 1.1,
      isBossWave: false,
      active: true,
      countdownToNext: 0,
    };

    this.callbacks.onStatsUpdate({ ...this.stats });
    this.callbacks.onWaveUpdate({ ...this.wave });
    this.callbacks.onWeaponUpdate(this.currentWeapon);

    soundEngine.setBossMode(false);
    this.start();
  }

  // ==================== MAIN GAME LOOP ====================

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // ==================== UPDATE LOGIC ====================

  private update(dt: number) {
    this.updatePlayer(dt);
    this.updateCamera();
    this.updateDrone(dt);
    this.updateShooting(dt);
    this.updateBullets(dt);
    this.updateZombies(dt);
    this.updateCoins(dt);
    this.updatePowerUps(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateWave(dt);

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
  }

  private updatePlayer(dt: number) {
    let moveX = 0;
    let moveY = 0;

    // Support key and code (WASD / Arrows)
    if (this.keys['w'] || this.keys['keyw'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['keys'] || this.keys['arrowdown']) moveY += 1;
    if (this.keys['a'] || this.keys['keya'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['keyd'] || this.keys['arrowright']) moveX += 1;

    // Apply virtual joystick / D-pad move
    if (this.virtualMove.x !== 0 || this.virtualMove.y !== 0) {
      moveX += this.virtualMove.x;
      moveY += this.virtualMove.y;
      this.targetDestination = null; // Clear target when joystick used
    }

    if (moveX !== 0 || moveY !== 0) {
      this.targetDestination = null; // Clear target when keyboard is used
    } else if (this.targetDestination) {
      // Navigate to target destination point (e.g. from right-click or tap-to-move)
      const destDx = this.targetDestination.x - this.player.x;
      const destDy = this.targetDestination.y - this.player.y;
      const destDist = Math.hypot(destDx, destDy);
      if (destDist > 14) {
        moveX = destDx / destDist;
        moveY = destDy / destDist;
      } else {
        this.targetDestination = null;
      }
    }

    const length = Math.hypot(moveX, moveY);
    if (length > 0) {
      const speed = this.stats.moveSpeed * 60;
      this.player.vx = (moveX / length) * speed;
      this.player.vy = (moveY / length) * speed;
    } else {
      this.player.vx *= 0.8;
      this.player.vy *= 0.8;
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Clamp inside world boundaries
    const margin = this.player.radius;
    this.player.x = Math.max(margin, Math.min(this.worldWidth - margin, this.player.x));
    this.player.y = Math.max(margin, Math.min(this.worldHeight - margin, this.player.y));

    // Player aiming angle
    if (this.mouse.worldX !== 0 || this.mouse.worldY !== 0) {
      this.player.angle = Math.atan2(
        this.mouse.worldY - this.player.y,
        this.mouse.worldX - this.player.x
      );
    }

    // Power-up timers
    if (this.player.invulnerableTime > 0) {
      this.player.invulnerableTime = Math.max(0, this.player.invulnerableTime - dt);
    }
    if (this.player.shieldTime > 0) {
      this.player.shieldTime = Math.max(0, this.player.shieldTime - dt);
    }
    if (this.player.overdriveTime > 0) {
      this.player.overdriveTime = Math.max(0, this.player.overdriveTime - dt);
    }
    if (this.player.magnetActiveTime > 0) {
      this.player.magnetActiveTime = Math.max(0, this.player.magnetActiveTime - dt);
    }
  }

  private updateCamera() {
    const targetX = this.player.x - this.canvas.width / 2;
    const targetY = this.player.y - this.canvas.height / 2;

    // Smooth camera interpolation
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;

    // Apply shake offset
    if (this.screenShake > 0) {
      this.camera.x += (Math.random() - 0.5) * this.screenShake;
      this.camera.y += (Math.random() - 0.5) * this.screenShake;
    }
  }

  private updateDrone(dt: number) {
    if (!this.stats.hasDrone) {
      this.drone = null;
      return;
    }

    if (!this.drone) {
      this.drone = {
        x: this.player.x,
        y: this.player.y,
        angle: 0,
        lastShotTime: 0,
        orbitAngle: 0,
      };
    }

    this.drone.orbitAngle += dt * 2.5;
    const orbitDistance = 45;
    this.drone.x = this.player.x + Math.cos(this.drone.orbitAngle) * orbitDistance;
    this.drone.y = this.player.y + Math.sin(this.drone.orbitAngle) * orbitDistance;

    // Find nearest zombie to shoot
    let nearestDist = 320;
    let targetZombie: Zombie | null = null;
    for (const z of this.zombies) {
      const d = Math.hypot(z.x - this.drone.x, z.y - this.drone.y);
      if (d < nearestDist) {
        nearestDist = d;
        targetZombie = z;
      }
    }

    if (targetZombie) {
      this.drone.angle = Math.atan2(targetZombie.y - this.drone.y, targetZombie.x - this.drone.x);
      const now = performance.now() / 1000;
      if (now - this.drone.lastShotTime >= 0.45) {
        this.drone.lastShotTime = now;
        this.fireBullet(
          this.drone.x,
          this.drone.y,
          this.drone.angle,
          15,
          this.stats.droneDamage,
          '#60a5fa',
          1,
          3,
          undefined,
          true
        );
        soundEngine.playGunshot('smg');
      }
    }
  }

  private updateShooting(dt: number) {
    const isOverdrive = this.player.overdriveTime > 0;
    const effectiveFireRate =
      this.currentWeapon.fireRate *
      this.stats.fireRateMultiplier *
      (isOverdrive ? 2.0 : 1.0);

    const shotInterval = 1 / effectiveFireRate;
    const now = performance.now() / 1000;

    const shouldShoot = this.mouse.isDown || (this.autoFire && this.findAutoTarget() !== null);

    if (shouldShoot && now - this.player.lastShotTime >= shotInterval) {
      this.player.lastShotTime = now;
      let shootAngle = this.player.angle;

      if (this.autoFire && !this.mouse.isDown) {
        const autoTarget = this.findAutoTarget();
        if (autoTarget) {
          shootAngle = Math.atan2(autoTarget.y - this.player.y, autoTarget.x - this.player.x);
          this.player.angle = shootAngle;
        }
      }

      this.fireWeapon(shootAngle);
    }
  }

  private findAutoTarget(): Zombie | null {
    let nearestDist = 450;
    let target: Zombie | null = null;
    for (const z of this.zombies) {
      const dist = Math.hypot(z.x - this.player.x, z.y - this.player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        target = z;
      }
    }
    return target;
  }

  private fireWeapon(baseAngle: number) {
    const w = this.currentWeapon;
    const damage = w.damage * this.stats.damageMultiplier * (this.player.overdriveTime > 0 ? 1.5 : 1.0);

    // Muzzle flash particle
    const barrelLength = this.player.radius + 12;
    const spawnX = this.player.x + Math.cos(baseAngle) * barrelLength;
    const spawnY = this.player.y + Math.sin(baseAngle) * barrelLength;

    this.createMuzzleFlash(spawnX, spawnY, baseAngle, w.color);

    soundEngine.playGunshot(w.id);

    // Multi-pellet spread
    for (let i = 0; i < w.bulletCount; i++) {
      const spreadOffset = (Math.random() - 0.5) * w.spread;
      const finalAngle = baseAngle + spreadOffset;

      this.fireBullet(
        spawnX,
        spawnY,
        finalAngle,
        w.bulletSpeed,
        damage,
        w.color,
        w.penetration,
        w.bulletSize,
        w.splashRadius,
        true
      );
    }

    // Slight gun recoil
    this.player.x -= Math.cos(baseAngle) * (w.id === 'shotgun' || w.id === 'rocket' ? 4 : 1.2);
    this.player.y -= Math.sin(baseAngle) * (w.id === 'shotgun' || w.id === 'rocket' ? 4 : 1.2);
  }

  private fireBullet(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    color: string,
    penetration: number,
    size: number,
    splashRadius?: number,
    isPlayer: boolean = true,
    isAcid: boolean = false
  ) {
    this.bullets.push({
      id: this.nextId++,
      x,
      y,
      vx: Math.cos(angle) * speed * 60,
      vy: Math.sin(angle) * speed * 60,
      radius: size,
      damage,
      color,
      isPlayer,
      penetration,
      life: 2.5,
      maxLife: 2.5,
      splashRadius,
      isAcid,
    });
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Rocket/plasma smoke trail
      if (b.splashRadius && Math.random() < 0.6) {
        this.particles.push({
          id: this.nextId++,
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          radius: 3 + Math.random() * 2,
          color: b.color,
          alpha: 0.7,
          decay: 2.5,
        });
      }

      // Check bullet boundary or lifetime
      if (
        b.life <= 0 ||
        b.x < 0 ||
        b.x > this.worldWidth ||
        b.y < 0 ||
        b.y > this.worldHeight
      ) {
        if (b.splashRadius) {
          this.triggerSplashDamage(b);
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision
      if (b.isPlayer) {
        let hitZombie = false;
        for (let j = this.zombies.length - 1; j >= 0; j--) {
          const z = this.zombies[j];
          const dist = Math.hypot(b.x - z.x, b.y - z.y);
          if (dist < b.radius + z.radius) {
            hitZombie = true;
            this.damageZombie(z, b.damage, b.vx, b.vy);

            if (b.splashRadius) {
              this.triggerSplashDamage(b);
              this.bullets.splice(i, 1);
              break;
            }

            b.penetration -= 1;
            if (b.penetration <= 0) {
              this.bullets.splice(i, 1);
              break;
            }
          }
        }
      } else {
        // Enemy acid spit hits player
        const distToPlayer = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (distToPlayer < b.radius + this.player.radius) {
          this.damagePlayer(b.damage);
          this.bullets.splice(i, 1);
        }
      }
    }
  }

  private triggerSplashDamage(b: Bullet) {
    const splash = b.splashRadius || 60;
    this.screenShake = Math.max(this.screenShake, 10);
    soundEngine.playExplosion();

    // Create explosion visual particles
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 180;
      this.particles.push({
        id: this.nextId++,
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 6,
        color: Math.random() < 0.5 ? '#f97316' : '#ef4444',
        alpha: 0.9,
        decay: 1.8,
      });
    }

    // Damage all zombies within radius
    for (let j = this.zombies.length - 1; j >= 0; j--) {
      const z = this.zombies[j];
      const dist = Math.hypot(b.x - z.x, b.y - z.y);
      if (dist < splash + z.radius) {
        const falloff = 1 - dist / (splash + z.radius);
        const splashDmg = b.damage * Math.max(0.4, falloff);
        const pushAngle = Math.atan2(z.y - b.y, z.x - b.x);
        this.damageZombie(z, splashDmg, Math.cos(pushAngle) * 300, Math.sin(pushAngle) * 300);
      }
    }
  }

  private damageZombie(z: Zombie, amount: number, pushVx: number, pushVy: number) {
    z.hp -= amount;
    z.hitFlashTime = 0.12;
    z.vx += pushVx * 0.25;
    z.vy += pushVy * 0.25;

    soundEngine.playZombieHit();

    // Spawn floating damage text
    this.floatingTexts.push({
      id: this.nextId++,
      text: `${Math.round(amount)}`,
      x: z.x + (Math.random() - 0.5) * 16,
      y: z.y - 15,
      color: amount > 50 ? '#fbbf24' : '#f87171',
      size: amount > 50 ? 17 : 13,
      alpha: 1.0,
      vy: -35,
    });

    // Blood droplets
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        id: this.nextId++,
        x: z.x,
        y: z.y,
        vx: (Math.random() - 0.5) * 80 + pushVx * 0.1,
        vy: (Math.random() - 0.5) * 80 + pushVy * 0.1,
        radius: 2 + Math.random() * 3,
        color: z.type === 'SPITTER' ? '#84cc16' : '#991b1b',
        alpha: 0.8,
        decay: 2.0,
      });
    }

    // Check Zombie Death
    if (z.hp <= 0) {
      this.killZombie(z);
    }
  }

  private killZombie(z: Zombie) {
    const idx = this.zombies.indexOf(z);
    if (idx !== -1) {
      this.zombies.splice(idx, 1);
    }

    this.stats.zombiesKilled += 1;
    this.stats.score += z.type === 'BOSS' ? 1000 : z.type === 'TANK' ? 120 : 35;
    soundEngine.playZombieDeath();

    if (z.type === 'BOSS') {
      this.screenShake = 16;
      soundEngine.setBossMode(false);
    }

    // Leave permanent blood splatter decal on asphalt
    this.splatters.push({
      x: z.x,
      y: z.y,
      radius: z.radius * (1.2 + Math.random() * 0.8),
      color: z.type === 'SPITTER' ? 'rgba(101, 163, 13, 0.45)' : 'rgba(127, 29, 29, 0.5)',
      alpha: 0.7,
    });
    if (this.splatters.length > 120) {
      this.splatters.shift();
    }

    // Spawn falling / bursting coins
    const count = z.coinsDrop;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 90;
      this.coins.push({
        id: this.nextId++,
        x: z.x,
        y: z.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        value: z.type === 'BOSS' ? 5 : 1,
        radius: 7,
        rotation: Math.random() * Math.PI * 2,
        life: 30, // seconds until fade
        isMagnetized: false,
      });
    }

    // Chance to drop power-up
    const powerUpChance = z.type === 'BOSS' ? 1.0 : z.type === 'TANK' ? 0.45 : 0.08;
    if (Math.random() < powerUpChance) {
      const types: PowerUpType[] = ['MEDKIT', 'MAGNET', 'NUKE', 'OVERDRIVE', 'SHIELD'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      this.powerUps.push({
        id: this.nextId++,
        type: chosenType,
        x: z.x,
        y: z.y,
        radius: 14,
        life: 25,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private updateZombies(dt: number) {
    for (let i = 0; i < this.zombies.length; i++) {
      const z = this.zombies[i];

      // Flash decay
      if (z.hitFlashTime > 0) {
        z.hitFlashTime = Math.max(0, z.hitFlashTime - dt);
      }

      // Movement towards player
      const dx = this.player.x - z.x;
      const dy = this.player.y - z.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        const targetVx = (dx / dist) * z.speed * 60;
        const targetVy = (dy / dist) * z.speed * 60;
        z.vx += (targetVx - z.vx) * 0.1;
        z.vy += (targetVy - z.vy) * 0.1;
      }

      // Zombie separation (bumping each other so they don't stack on 1 pixel)
      for (let j = i + 1; j < this.zombies.length; j++) {
        const other = this.zombies[j];
        const sepDx = other.x - z.x;
        const sepDy = other.y - z.y;
        const sepDist = Math.hypot(sepDx, sepDy);
        const minDist = z.radius + other.radius;
        if (sepDist < minDist && sepDist > 0) {
          const overlap = (minDist - sepDist) * 0.5;
          const nx = sepDx / sepDist;
          const ny = sepDy / sepDist;
          z.x -= nx * overlap;
          z.y -= ny * overlap;
          other.x += nx * overlap;
          other.y += ny * overlap;
        }
      }

      z.x += z.vx * dt;
      z.y += z.vy * dt;

      // Special Spitter attack
      if (z.type === 'SPITTER') {
        const now = performance.now() / 1000;
        if (!z.lastSpitTime) z.lastSpitTime = now + Math.random() * 2;
        if (now - z.lastSpitTime >= 3.2 && dist < 420) {
          z.lastSpitTime = now;
          const spitAngle = Math.atan2(this.player.y - z.y, this.player.x - z.x);
          this.fireBullet(
            z.x,
            z.y,
            spitAngle,
            6.5,
            12,
            '#a3e635',
            1,
            6,
            undefined,
            false,
            true
          );
        }
      }

      // Boss minion summon & charge
      if (z.type === 'BOSS') {
        const now = performance.now() / 1000;
        if (!z.lastSpitTime) z.lastSpitTime = now;
        if (now - z.lastSpitTime >= 7.0) {
          z.lastSpitTime = now;
          // Spawn 3 runner minions
          for (let m = 0; m < 3; m++) {
            this.spawnSpecificZombie(
              'RUNNER',
              z.x + (Math.random() - 0.5) * 60,
              z.y + (Math.random() - 0.5) * 60
            );
          }
          this.floatingTexts.push({
            id: this.nextId++,
            text: 'SUMMON HORDE!',
            x: z.x,
            y: z.y - 40,
            color: '#ef4444',
            size: 16,
            alpha: 1.0,
            vy: -40,
          });
          this.screenShake = 8;
        }
      }

      // Contact attack on player
      if (dist < z.radius + this.player.radius) {
        const now = performance.now() / 1000;
        if (now - z.lastAttackTime >= 0.75) {
          z.lastAttackTime = now;
          this.damagePlayer(z.damage);
        }
      }
    }
  }

  private damagePlayer(amount: number) {
    if (this.player.invulnerableTime > 0) return;

    if (this.player.shieldTime > 0) {
      // Shield absorbs hit
      this.floatingTexts.push({
        id: this.nextId++,
        text: 'SHIELD BLOCKED!',
        x: this.player.x,
        y: this.player.y - 25,
        color: '#38bdf8',
        size: 14,
        alpha: 1.0,
        vy: -30,
      });
      this.player.invulnerableTime = 0.3;
      return;
    }

    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.player.invulnerableTime = 0.5;
    this.screenShake = 12;
    soundEngine.playPlayerHurt();

    this.floatingTexts.push({
      id: this.nextId++,
      text: `-${Math.round(amount)}`,
      x: this.player.x,
      y: this.player.y - 25,
      color: '#ef4444',
      size: 16,
      alpha: 1.0,
      vy: -35,
    });

    this.callbacks.onStatsUpdate({ ...this.stats });

    if (this.stats.hp <= 0) {
      this.handleGameOver();
    }
  }

  private handleGameOver() {
    this.stop();
    this.callbacks.onGameOver({
      wave: this.wave.number,
      score: this.stats.score,
      kills: this.stats.zombiesKilled,
      coins: this.stats.totalCoinsEarned,
    });
  }

  private updateCoins(dt: number) {
    const isGlobalMagnet = this.player.magnetActiveTime > 0;
    const baseMagnetRadius = this.stats.magnetRadius;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.life -= dt;
      c.rotation += dt * 4;

      // Friction
      c.vx *= 0.92;
      c.vy *= 0.92;
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      if (c.life <= 0) {
        this.coins.splice(i, 1);
        continue;
      }

      const dx = this.player.x - c.x;
      const dy = this.player.y - c.y;
      const dist = Math.hypot(dx, dy);

      // Check magnet pull
      if (isGlobalMagnet || dist < baseMagnetRadius) {
        c.isMagnetized = true;
        const speed = isGlobalMagnet ? 600 : 380;
        c.vx += (dx / dist) * speed * dt * 4;
        c.vy += (dy / dist) * speed * dt * 4;

        // Sparkle particle
        if (Math.random() < 0.25) {
          this.particles.push({
            id: this.nextId++,
            x: c.x,
            y: c.y,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            radius: 2,
            color: '#fbbf24',
            alpha: 0.8,
            decay: 3.0,
          });
        }
      }

      // Check pickup
      if (dist < c.radius + this.player.radius) {
        this.stats.coins += c.value;
        this.stats.totalCoinsEarned += c.value;
        this.stats.score += c.value * 10;
        soundEngine.playCoinSound();

        this.floatingTexts.push({
          id: this.nextId++,
          text: `+${c.value}`,
          x: c.x,
          y: c.y - 12,
          color: '#fbbf24',
          size: 14,
          alpha: 1.0,
          vy: -30,
        });

        this.coins.splice(i, 1);
        this.callbacks.onStatsUpdate({ ...this.stats });
      }
    }
  }

  private updatePowerUps(dt: number) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.life -= dt;
      p.bobOffset += dt * 3;

      if (p.life <= 0) {
        this.powerUps.splice(i, 1);
        continue;
      }

      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < p.radius + this.player.radius) {
        this.activatePowerUp(p.type);
        this.powerUps.splice(i, 1);
      }
    }
  }

  private activatePowerUp(type: PowerUpType) {
    soundEngine.playPowerup();

    switch (type) {
      case 'MEDKIT':
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 50);
        this.floatingTexts.push({
          id: this.nextId++,
          text: '+50 HP!',
          x: this.player.x,
          y: this.player.y - 30,
          color: '#22c55e',
          size: 16,
          alpha: 1.0,
          vy: -35,
        });
        break;

      case 'MAGNET':
        this.player.magnetActiveTime = 8.0;
        this.floatingTexts.push({
          id: this.nextId++,
          text: 'COIN MAGNET!',
          x: this.player.x,
          y: this.player.y - 30,
          color: '#fbbf24',
          size: 16,
          alpha: 1.0,
          vy: -35,
        });
        break;

      case 'NUKE':
        this.triggerNuke();
        break;

      case 'OVERDRIVE':
        this.player.overdriveTime = 8.0;
        this.floatingTexts.push({
          id: this.nextId++,
          text: 'RAPID OVERDRIVE!',
          x: this.player.x,
          y: this.player.y - 30,
          color: '#f97316',
          size: 16,
          alpha: 1.0,
          vy: -35,
        });
        break;

      case 'SHIELD':
        this.player.shieldTime = 10.0;
        this.floatingTexts.push({
          id: this.nextId++,
          text: 'ENERGY SHIELD!',
          x: this.player.x,
          y: this.player.y - 30,
          color: '#38bdf8',
          size: 16,
          alpha: 1.0,
          vy: -35,
        });
        break;
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private triggerNuke() {
    this.screenShake = 22;
    soundEngine.playExplosion();

    this.floatingTexts.push({
      id: this.nextId++,
      text: 'TACTICAL NUKE!',
      x: this.player.x,
      y: this.player.y - 40,
      color: '#ef4444',
      size: 20,
      alpha: 1.0,
      vy: -45,
    });

    // Wipe out non-boss zombies and damage boss
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.type === 'BOSS') {
        this.damageZombie(z, 250, 0, 0);
      } else {
        this.killZombie(z);
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.alpha -= dt * 1.2;
      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateWave(dt: number) {
    if (this.wave.active) {
      this.wave.spawnTimer += dt;
      if (
        this.wave.spawnTimer >= this.wave.spawnInterval &&
        this.wave.zombiesToSpawn > 0
      ) {
        this.wave.spawnTimer = 0;
        this.spawnWaveZombie();
        this.wave.zombiesToSpawn -= 1;
      }

      this.wave.zombiesRemaining = this.wave.zombiesToSpawn + this.zombies.length;

      // Wave cleared
      if (this.wave.zombiesToSpawn === 0 && this.zombies.length === 0) {
        this.wave.active = false;
        this.wave.countdownToNext = 5.0; // 5s respite to shop
        soundEngine.playWaveComplete();

        // Bonus wave completion coins!
        const bonusCoins = 15 + this.wave.number * 5;
        this.stats.coins += bonusCoins;
        this.stats.totalCoinsEarned += bonusCoins;
        this.callbacks.onStatsUpdate({ ...this.stats });

        this.floatingTexts.push({
          id: this.nextId++,
          text: `WAVE CLEAR! +${bonusCoins} COIN BONUS!`,
          x: this.player.x,
          y: this.player.y - 45,
          color: '#4ade80',
          size: 18,
          alpha: 1.0,
          vy: -35,
        });
      }
    } else {
      // Respite countdown before next wave
      this.wave.countdownToNext -= dt;
      if (this.wave.countdownToNext <= 0) {
        this.advanceWave();
      }
    }

    this.callbacks.onWaveUpdate({ ...this.wave });
  }

  private advanceWave() {
    this.wave.number += 1;
    this.wave.active = true;
    this.wave.isBossWave = this.wave.number % 5 === 0;

    const baseCount = 12 + this.wave.number * 4;
    this.wave.zombiesToSpawn = baseCount;
    this.wave.zombiesRemaining = baseCount;
    this.wave.spawnInterval = Math.max(0.4, 1.2 - this.wave.number * 0.07);

    soundEngine.playWaveStart();
    if (this.wave.isBossWave) {
      soundEngine.setBossMode(true);
      // Spawn the Boss directly
      this.spawnBoss();
    }

    this.floatingTexts.push({
      id: this.nextId++,
      text: this.wave.isBossWave ? 'WARNING: BOSS APPROACHING!' : `WAVE ${this.wave.number}!`,
      x: this.player.x,
      y: this.player.y - 50,
      color: this.wave.isBossWave ? '#ef4444' : '#38bdf8',
      size: 22,
      alpha: 1.0,
      vy: -30,
    });
  }

  private spawnWaveZombie() {
    // Determine spawn position around player outside screen viewport
    const angle = Math.random() * Math.PI * 2;
    const distance = 500 + Math.random() * 200;
    const spawnX = Math.max(20, Math.min(this.worldWidth - 20, this.player.x + Math.cos(angle) * distance));
    const spawnY = Math.max(20, Math.min(this.worldHeight - 20, this.player.y + Math.sin(angle) * distance));

    // Choose zombie type based on wave number
    const rand = Math.random();
    let type: ZombieType = 'WALKER';

    if (this.wave.number >= 4 && rand < 0.18) {
      type = 'SPITTER';
    } else if (this.wave.number >= 3 && rand < 0.35) {
      type = 'TANK';
    } else if (this.wave.number >= 2 && rand < 0.65) {
      type = 'RUNNER';
    }

    this.spawnSpecificZombie(type, spawnX, spawnY);
  }

  private spawnSpecificZombie(type: ZombieType, x: number, y: number) {
    const waveScale = 1 + (this.wave.number - 1) * 0.12;

    switch (type) {
      case 'RUNNER':
        this.zombies.push({
          id: this.nextId++,
          type: 'RUNNER',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 14,
          speed: 3.2,
          hp: 16 * waveScale,
          maxHp: 16 * waveScale,
          damage: 10,
          coinsDrop: 2,
          color: '#e11d48',
          lastAttackTime: 0,
          hitFlashTime: 0,
        });
        break;

      case 'TANK':
        this.zombies.push({
          id: this.nextId++,
          type: 'TANK',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 26,
          speed: 1.2,
          hp: 110 * waveScale,
          maxHp: 110 * waveScale,
          damage: 25,
          coinsDrop: 6,
          color: '#581c87',
          lastAttackTime: 0,
          hitFlashTime: 0,
        });
        break;

      case 'SPITTER':
        this.zombies.push({
          id: this.nextId++,
          type: 'SPITTER',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 16,
          speed: 1.8,
          hp: 35 * waveScale,
          maxHp: 35 * waveScale,
          damage: 12,
          coinsDrop: 3,
          color: '#65a30d',
          lastAttackTime: 0,
          lastSpitTime: performance.now() / 1000 + 1,
          hitFlashTime: 0,
        });
        break;

      default:
        // WALKER
        this.zombies.push({
          id: this.nextId++,
          type: 'WALKER',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 17,
          speed: 1.9,
          hp: 24 * waveScale,
          maxHp: 24 * waveScale,
          damage: 14,
          coinsDrop: 1,
          color: '#15803d',
          lastAttackTime: 0,
          hitFlashTime: 0,
        });
        break;
    }
  }

  private spawnBoss() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 450;
    const spawnX = Math.max(50, Math.min(this.worldWidth - 50, this.player.x + Math.cos(angle) * distance));
    const spawnY = Math.max(50, Math.min(this.worldHeight - 50, this.player.y + Math.sin(angle) * distance));

    const bossHp = 500 + this.wave.number * 150;
    this.zombies.push({
      id: this.nextId++,
      type: 'BOSS',
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      radius: 38,
      speed: 1.3,
      hp: bossHp,
      maxHp: bossHp,
      damage: 40,
      coinsDrop: 24,
      color: '#991b1b',
      lastAttackTime: 0,
      lastSpitTime: performance.now() / 1000,
      hitFlashTime: 0,
    });
  }

  private createMuzzleFlash(x: number, y: number, angle: number, color: string) {
    for (let i = 0; i < 6; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        radius: 2 + Math.random() * 2,
        color,
        alpha: 0.9,
        decay: 6.0,
      });
    }
  }

  // ==================== RENDERING ====================

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    // Camera translation
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // 1. Draw Arena Grid & Markings
    this.drawArena(ctx);

    // 2. Draw Splatters on ground
    this.drawSplatters(ctx);

    // Move destination waypoint
    if (this.targetDestination) {
      this.drawWaypoint(ctx);
    }

    // 3. Draw Coins
    this.drawCoins(ctx);

    // 4. Draw Power-ups
    this.drawPowerUps(ctx);

    // 5. Draw Zombies
    this.drawZombies(ctx);

    // 6. Draw Player & Drone
    this.drawPlayer(ctx);

    // 7. Draw Bullets
    this.drawBullets(ctx);

    // 8. Draw Particles
    this.drawParticles(ctx);

    ctx.restore();

    // 9. Screen Dark Scrim & Flashlight Vignette (World coordinates overlay)
    this.drawLightingAndVignette(ctx);

    // 10. Screen-space Floating Texts
    this.drawFloatingTexts(ctx);
  }

  private drawArena(ctx: CanvasRenderingContext2D) {
    // Asphalt base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Grid lines / pavement seams
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    const tileSize = 120;

    ctx.beginPath();
    for (let x = 0; x <= this.worldWidth; x += tileSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.worldHeight);
    }
    for (let y = 0; y <= this.worldHeight; y += tileSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.worldWidth, y);
    }
    ctx.stroke();

    // Red danger zone borders
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, this.worldWidth - 10, this.worldHeight - 10);

    // Road markings & crosswalks
    ctx.fillStyle = '#334155';
    ctx.fillRect(this.worldWidth / 2 - 15, 0, 30, this.worldHeight);
    ctx.fillRect(0, this.worldHeight / 2 - 15, this.worldWidth, 30);
  }

  private drawSplatters(ctx: CanvasRenderingContext2D) {
    for (const s of this.splatters) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWaypoint(ctx: CanvasRenderingContext2D) {
    if (!this.targetDestination) return;
    const pulse = (Math.sin(performance.now() / 150) + 1) * 0.5;
    ctx.save();
    ctx.translate(this.targetDestination.x, this.targetDestination.y);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawCoins(ctx: CanvasRenderingContext2D) {
    for (const c of this.coins) {
      ctx.save();
      ctx.translate(c.x, c.y);

      // Spinning 3D effect by scaling x with cosine of rotation
      const scaleX = Math.cos(c.rotation);
      ctx.scale(scaleX, 1);

      // Gold coin outer glow
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // Coin inner rim
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      // Dollar / star shine center
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-1.5, -3, 3, 6);

      ctx.restore();
    }
  }

  private drawPowerUps(ctx: CanvasRenderingContext2D) {
    for (const p of this.powerUps) {
      const yOffset = Math.sin(p.bobOffset) * 4;
      ctx.save();
      ctx.translate(p.x, p.y + yOffset);

      // Glowing aura
      const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius * 1.5);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Base badge
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let icon = '+';
      if (p.type === 'MAGNET') icon = '🧲';
      if (p.type === 'NUKE') icon = '💣';
      if (p.type === 'OVERDRIVE') icon = '⚡';
      if (p.type === 'SHIELD') icon = '🛡';
      ctx.fillText(icon, 0, 1);

      ctx.restore();
    }
  }

  private drawZombies(ctx: CanvasRenderingContext2D) {
    for (const z of this.zombies) {
      ctx.save();
      ctx.translate(z.x, z.y);

      const angle = Math.atan2(this.player.y - z.y, this.player.x - z.x);
      ctx.rotate(angle);

      // Hit flash white
      if (z.hitFlashTime > 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = z.color;
      }

      // Zombie Body
      ctx.beginPath();
      ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
      ctx.fill();

      // Zombie reaching arms
      ctx.strokeStyle = z.color;
      ctx.lineWidth = z.radius * 0.3;
      ctx.beginPath();
      ctx.moveTo(z.radius * 0.4, -z.radius * 0.6);
      ctx.lineTo(z.radius * 1.2, -z.radius * 0.4);
      ctx.moveTo(z.radius * 0.4, z.radius * 0.6);
      ctx.lineTo(z.radius * 1.2, z.radius * 0.4);
      ctx.stroke();

      // Glowing eyes
      ctx.fillStyle = z.type === 'RUNNER' ? '#ffffff' : '#f87171';
      ctx.beginPath();
      ctx.arc(z.radius * 0.5, -z.radius * 0.35, z.radius * 0.18, 0, Math.PI * 2);
      ctx.arc(z.radius * 0.5, z.radius * 0.35, z.radius * 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Health bar above zombie
      if (z.hp < z.maxHp || z.type === 'BOSS') {
        const barWidth = z.radius * 2.2;
        const barHeight = 4;
        const barX = z.x - barWidth / 2;
        const barY = z.y - z.radius - 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpPct = Math.max(0, z.hp / z.maxHp);
        ctx.fillStyle = z.type === 'BOSS' ? '#ef4444' : '#22c55e';
        ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    // Active Shield bubble
    if (this.player.shieldTime > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.radius * 1.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fill();
    }

    // Active Overdrive aura
    if (this.player.overdriveTime > 0) {
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.radius * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Flash when invulnerable
    if (this.player.invulnerableTime > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Rotate player to aim angle
    ctx.rotate(this.player.angle);

    // Gun Barrel
    ctx.fillStyle = '#475569';
    const barrelLength = this.currentWeapon.id === 'shotgun' || this.currentWeapon.id === 'rifle' ? 24 : 18;
    ctx.fillRect(this.player.radius * 0.4, -3, barrelLength, 6);

    // Dual guns for SMG
    if (this.currentWeapon.id === 'smg') {
      ctx.fillRect(this.player.radius * 0.4, -9, 16, 4);
      ctx.fillRect(this.player.radius * 0.4, 5, 16, 4);
    }

    // Survivor Body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Tactical Vest
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-2, 0, this.player.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Hands
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(this.player.radius * 0.7, -7, 4, 0, Math.PI * 2);
    ctx.arc(this.player.radius * 0.7, 7, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw Drone if present
    if (this.drone) {
      ctx.save();
      ctx.translate(this.drone.x, this.drone.y);
      ctx.rotate(this.drone.angle);

      // Drone Body
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      // Drone Eye / Cannon
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(4, -2, 8, 4);

      // Blue thruster flame
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(-8, 0, 4 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawBullets(ctx: CanvasRenderingContext2D) {
    for (const b of this.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bullet glow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  private drawLightingAndVignette(ctx: CanvasRenderingContext2D) {
    // Flashlight cone pointing from player
    const screenPx = this.player.x - this.camera.x;
    const screenPy = this.player.y - this.camera.y;

    const darkGrad = ctx.createRadialGradient(
      screenPx,
      screenPy,
      60,
      screenPx,
      screenPy,
      Math.max(this.canvas.width, this.canvas.height) * 0.8
    );
    darkGrad.addColorStop(0, 'rgba(11, 15, 25, 0.05)');
    darkGrad.addColorStop(0.5, 'rgba(11, 15, 25, 0.35)');
    darkGrad.addColorStop(1, 'rgba(11, 15, 25, 0.85)');

    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D) {
    for (const t of this.floatingTexts) {
      const screenX = t.x - this.camera.x;
      const screenY = t.y - this.camera.y;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, t.alpha));
      ctx.fillStyle = t.color;
      ctx.font = `800 ${t.size}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, screenX, screenY);
      ctx.restore();
    }
  }
}
