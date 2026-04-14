import { Container } from 'pixi.js';
import { Enemy, EnemyType } from '../entities/Enemy';
import { GameState, FaceDir } from '../core/GameState';
import { randomRange, randomInt } from '../utils/math';

// Room spawn bounds — at the visual room edge (matches RoomSystem ROOM_SPAWN_H{X,Y})
const ROOM_MIN_X = -700, ROOM_MAX_X = 700;
const ROOM_MIN_Y = -425, ROOM_MAX_Y = 425;

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
  /** Total enemies queued at room start — used to decide when lineup phase ends. */
  private totalSpawnedThisRoom = 0;

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
    // Codex approach #2 scaling: gentle convex curve (not pure linear)
    // Room 1: ×1.0, Room 5: ×1.40, Room 10: ×2.04
    const r = room - 1;
    const hpMult = 1 + 0.07 * r + 0.005 * r * r;
    // DMG grows slower to preserve player survival
    // Room 1: ×1.0, Room 5: ×1.22, Room 10: ×1.63
    const dmgMult = 1 + 0.045 * r + 0.0025 * r * r;

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

    this.totalSpawnedThisRoom = this.spawnQueue.length;
    // Reset face-off phase tracking (Game.enterRoom sets faceDir before this call)
    state.roomTime = 0;
    state.isPrepPhase = true;
    state.isLineupPhase = !state.isBossRoom; // boss rooms skip lineup (boss already centered)

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

    // Also spawn some adds using current room scaling (not just bossLevel)
    const addCount = 5 + bossLevel * 3;
    this.spawnQueue = [];
    const r = state.room - 1;
    const hpMult = 1 + 0.07 * r + 0.005 * r * r;
    const dmgMult = 1 + 0.045 * r + 0.0025 * r * r;
    for (let i = 0; i < addCount; i++) {
      this.spawnQueue.push({ type: 'grunt', elite: false, hpMult, dmgMult });
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

  /**
   * Pick a spawn position based on current phase.
   * - Lineup phase: spawn only from `faceDir` edge (face-off start).
   * - Otherwise: spawn from any edge (encirclement, like before).
   */
  private pickSpawnPosition(state: GameState): { x: number; y: number } {
    if (state.isLineupPhase) {
      // Spawn from faceDir edge only — creates a clear front line
      switch (state.faceDir) {
        case 'right': return { x: ROOM_MAX_X, y: randomRange(ROOM_MIN_Y + 20, ROOM_MAX_Y - 20) };
        case 'left':  return { x: ROOM_MIN_X, y: randomRange(ROOM_MIN_Y + 20, ROOM_MAX_Y - 20) };
        case 'down':  return { x: randomRange(ROOM_MIN_X + 20, ROOM_MAX_X - 20), y: ROOM_MAX_Y };
        case 'up':    return { x: randomRange(ROOM_MIN_X + 20, ROOM_MAX_X - 20), y: ROOM_MIN_Y };
      }
    }
    // All sides (legacy behavior)
    const side = randomInt(0, 3);
    switch (side) {
      case 0: return { x: randomRange(ROOM_MIN_X + 10, ROOM_MAX_X - 10), y: ROOM_MIN_Y };
      case 1: return { x: randomRange(ROOM_MIN_X + 10, ROOM_MAX_X - 10), y: ROOM_MAX_Y };
      case 2: return { x: ROOM_MIN_X, y: randomRange(ROOM_MIN_Y + 20, ROOM_MAX_Y - 20) };
      default: return { x: ROOM_MAX_X, y: randomRange(ROOM_MIN_Y + 20, ROOM_MAX_Y - 20) };
    }
  }

  update(dt: number, playerX: number, playerY: number, state?: GameState): void {
    if (!this.roomStarted) return;

    // Phase tick (face-off start)
    if (state) {
      state.roomTime += dt;
      // Prep phase: first 2s, enemies move slowly so player can position + pick stance
      state.isPrepPhase = state.roomTime < 2.0;
      // Lineup phase ends when (a) 6s elapsed OR (b) all initial spawns are done AND <50% remain
      if (state.isLineupPhase) {
        const allSpawned = this.spawnQueue.length === 0;
        const aliveCount = this.activeEnemies.length;
        if (state.roomTime > 6.0 || (allSpawned && aliveCount < (this.totalSpawnedThisRoom * 0.5))) {
          state.isLineupPhase = false;
        }
      }
    }

    // Staggered spawning
    this.spawnTimer -= dt;
    if (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
      while (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
        const info = this.spawnQueue.pop()!;
        const enemy = this.getFromPool();

        // Pick position based on current phase
        const pos = state ? this.pickSpawnPosition(state) : { x: ROOM_MAX_X, y: randomRange(ROOM_MIN_Y, ROOM_MAX_Y) };
        enemy.init(info.type, pos.x, pos.y, info.hpMult, info.dmgMult, info.elite, this.container);

        // During prep phase, slow approach for the first 2s of the room
        const prepSlow = state?.isPrepPhase ? 0.5 : 1.0;
        (enemy as any).speedMult = prepSlow;

        // Enemies target toward center/player area
        enemy.targetX = playerX + randomRange(-50, 50);
        enemy.targetY = playerY + randomRange(-50, 50);

        this.spawnTimer += this.spawnInterval;
      }
    }

    // Restore enemy speed once prep phase ends
    if (state && !state.isPrepPhase) {
      for (const e of this.enemies) {
        if ((e as any).speedMult !== undefined && (e as any).speedMult < 1) {
          (e as any).speedMult = 1;
        }
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
