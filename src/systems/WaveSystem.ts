import { Container } from 'pixi.js';
import { Enemy, EnemyType } from '../entities/Enemy';
import { GameState } from '../core/GameState';
import { randomRange, randomInt } from '../utils/math';

interface RoomEnemies {
  enemies: { type: EnemyType; count: number }[];
  elites: number;
  hpMult: number;
  dmgMult: number;
}

export class WaveSystem {
  private enemies: Enemy[] = [];
  private pool: Enemy[] = [];
  private container: Container;
  private spawnQueue: { type: EnemyType; elite: boolean; hpMult: number; dmgMult: number }[] = [];
  private spawnTimer = 0;
  private spawnInterval = 0.08;
  private roomStarted = false;

  constructor(container: Container) {
    this.container = container;
    for (let i = 0; i < 200; i++) {
      this.pool.push(new Enemy());
    }
  }

  get activeEnemies(): Enemy[] {
    return this.enemies.filter(e => e.active && e.alive);
  }

  get allEnemies(): Enemy[] {
    return this.enemies;
  }

  private getRoomConfig(room: number): RoomEnemies {
    const region = Math.ceil(room / 5);
    const hpMult = 1 + (room - 1) * 0.1;
    const dmgMult = 1 + (room - 1) * 0.08;

    // Base grunt count scales with room
    const gruntBase = 8 + room * 4;

    const enemies: { type: EnemyType; count: number }[] = [
      { type: 'grunt', count: gruntBase },
    ];

    // Add variety based on room
    if (room >= 2) enemies.push({ type: 'charger', count: 2 + Math.floor(room / 2) });
    if (room >= 3) enemies.push({ type: 'sniper', count: 1 + Math.floor(room / 3) });
    if (room >= 4) enemies.push({ type: 'shielder', count: 1 + Math.floor(room / 4) });
    if (room >= 6) enemies.push({ type: 'bomber', count: Math.floor(room / 4) });

    const elites = room >= 3 ? Math.floor(room / 3) : 0;

    return { enemies, elites, hpMult, dmgMult };
  }

  startRoom(state: GameState): void {
    // Deactivate all existing
    for (const e of this.enemies) {
      if (e.active) e.deactivate();
    }

    if (state.isBossRoom) {
      this.startBossRoom(state);
    } else {
      this.startNormalRoom(state);
    }

    this.roomStarted = true;
    this.spawnTimer = 0.3; // brief delay before spawn starts
  }

  private startNormalRoom(state: GameState): void {
    const cfg = this.getRoomConfig(state.room);
    this.spawnQueue = [];

    for (const entry of cfg.enemies) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({ type: entry.type, elite: false, hpMult: cfg.hpMult, dmgMult: cfg.dmgMult });
      }
    }

    const types: EnemyType[] = ['grunt', 'charger', 'sniper', 'shielder'];
    for (let i = 0; i < cfg.elites; i++) {
      const t = types[randomInt(0, types.length - 1)];
      this.spawnQueue.push({ type: t, elite: true, hpMult: cfg.hpMult, dmgMult: cfg.dmgMult });
    }

    // Shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
  }

  private startBossRoom(state: GameState): void {
    const bossLevel = state.region;

    // Spawn boss
    const boss = this.getFromPool();
    boss.initBoss(0, -100, bossLevel, this.container);

    // Also spawn some adds
    const addCount = 5 + bossLevel * 3;
    this.spawnQueue = [];
    for (let i = 0; i < addCount; i++) {
      this.spawnQueue.push({ type: 'grunt', elite: false, hpMult: 1 + bossLevel * 0.3, dmgMult: 1 + bossLevel * 0.2 });
    }
  }

  private getFromPool(): Enemy {
    for (const e of this.enemies) {
      if (!e.active) return e;
    }
    if (this.pool.length > 0) {
      const e = this.pool.pop()!;
      this.enemies.push(e);
      return e;
    }
    const e = new Enemy();
    this.enemies.push(e);
    return e;
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.roomStarted) return;

    // Staggered spawning
    this.spawnTimer -= dt;
    if (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
      while (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
        const info = this.spawnQueue.pop()!;
        const enemy = this.getFromPool();

        // Spawn from room edges
        const side = randomInt(0, 3);
        let x = 0, y = 0;
        switch (side) {
          case 0: x = randomRange(-350, 350); y = -260; break; // top
          case 1: x = randomRange(-350, 350); y = 260; break;  // bottom
          case 2: x = -360; y = randomRange(-240, 240); break;  // left
          case 3: x = 360; y = randomRange(-240, 240); break;   // right
        }

        enemy.init(info.type, x, y, info.hpMult, info.dmgMult, info.elite, this.container);

        // Enemies target toward center/player area
        enemy.targetX = playerX + randomRange(-50, 50);
        enemy.targetY = playerY + randomRange(-50, 50);

        this.spawnTimer += this.spawnInterval;
      }
    }

    // Update all enemies - always refresh target so they keep moving
    for (const e of this.enemies) {
      if (!e.active || !e.alive) continue;
      if (!e.targetsPlayer) {
        // CombatSystem may override with nearest soldier; default to player position every frame
        // so stationary (stale target) bug doesn't happen when the player moves.
        e.targetX = playerX;
        e.targetY = playerY;
      }
      e.update(dt, playerX, playerY);
    }
  }

  get isRoomCleared(): boolean {
    if (this.spawnQueue.length > 0) return false;
    return !this.enemies.some(e => e.active && e.alive);
  }
}
