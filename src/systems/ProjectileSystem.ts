import { Graphics, Container } from 'pixi.js';
import { dist, normalize, angle } from '../utils/math';

export type ProjectileType = 'arrow' | 'magic_bolt' | 'crossbow_bolt' | 'heal_orb' | 'fireball';

interface ProjectileConfig {
  speed: number;
  size: number;
  color: number;
  trailColor: number;
  trailLength: number;
  hasGravity: boolean;
  splashRadius: number; // 0 = no splash
  piercing: boolean;
}

const PROJ_CONFIGS: Record<ProjectileType, ProjectileConfig> = {
  arrow: {
    speed: 450, size: 3, color: 0xddcc88, trailColor: 0x887744,
    trailLength: 4, hasGravity: true, splashRadius: 0, piercing: false,
  },
  magic_bolt: {
    speed: 350, size: 5, color: 0x8844ff, trailColor: 0x6622cc,
    trailLength: 6, hasGravity: false, splashRadius: 30, piercing: false,
  },
  crossbow_bolt: {
    speed: 550, size: 4, color: 0xaaaaaa, trailColor: 0x666666,
    trailLength: 3, hasGravity: false, splashRadius: 0, piercing: true,
  },
  heal_orb: {
    speed: 250, size: 6, color: 0xffdd44, trailColor: 0xddaa22,
    trailLength: 5, hasGravity: false, splashRadius: 40, piercing: false,
  },
  fireball: {
    speed: 300, size: 7, color: 0xff6622, trailColor: 0xcc4400,
    trailLength: 8, hasGravity: false, splashRadius: 45, piercing: false,
  },
};

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  type: ProjectileType;
  damage: number;
  fromPlayer: boolean; // true = friendly, false = enemy
  life: number;
  trail: { x: number; y: number }[];
  hitIds: Set<number>; // for piercing, track already-hit targets
  active: boolean;
  rotation: number;
  /** Synergy flag: this projectile applies a bow mark on hit */
  applyMark?: boolean;
  /** Synergy flag: staff spell — expand splash radius on impact */
  staffCircle?: boolean;
  /** Synergy flag: staff spell — chain to nearest enemy once */
  staffChain?: boolean;
  /** Set true after chain has fired once — prevents infinite chaining */
  staffChainUsed?: boolean;
}

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private pool: Projectile[] = [];
  private gfx: Graphics;
  private container: Container;
  /** Optional terrain blocker — projectiles die on blocked tiles. */
  terrainBlocker: ((x: number, y: number) => boolean) | null = null;

  constructor(container: Container) {
    this.container = container;
    this.gfx = new Graphics();
    this.gfx.zIndex = 6000;
    container.addChild(this.gfx);

    // Pre-allocate pool
    for (let i = 0; i < 100; i++) {
      this.pool.push(this.createEmpty());
    }
  }

  private createEmpty(): Projectile {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      type: 'arrow', damage: 0, fromPlayer: true,
      life: 0, trail: [], hitIds: new Set(), active: false, rotation: 0,
    };
  }

  spawn(
    fromX: number, fromY: number,
    toX: number, toY: number,
    type: ProjectileType,
    damage: number,
    friendly: boolean
  ): Projectile {
    const cfg = PROJ_CONFIGS[type];
    const dir = normalize(toX - fromX, toY - fromY);

    let proj: Projectile;
    if (this.pool.length > 0) {
      proj = this.pool.pop()!;
    } else {
      proj = this.createEmpty();
    }

    proj.x = fromX;
    proj.y = fromY;
    proj.vx = dir.x * cfg.speed;
    proj.vy = dir.y * cfg.speed;
    proj.type = type;
    proj.damage = damage;
    proj.fromPlayer = friendly;
    proj.life = 2.0; // max 2 seconds
    proj.trail = [];
    proj.hitIds.clear();
    proj.active = true;
    proj.rotation = angle(fromX, fromY, toX, toY);
    proj.applyMark = false; // reset from pool

    this.projectiles.push(proj);
    return proj;
  }

  update(
    dt: number,
    enemies: { x: number; y: number; radius: number; alive: boolean; active: boolean; takeDamage: (d: number) => boolean; xp: number; status?: { markedTimer?: number } }[],
    soldiers: { x: number; y: number; radius: number; alive: boolean; active: boolean; takeDamage: (d: number) => boolean }[],
    playerX: number, playerY: number, playerRadius: number,
    onEnemyHit: (x: number, y: number, damage: number, killed: boolean, xp: number) => void,
    onSoldierHit: (x: number, y: number, damage: number, killed: boolean) => void,
    onPlayerHit: (damage: number) => void,
  ): void {
    this.gfx.clear();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.pool.push(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      const cfg = PROJ_CONFIGS[p.type];

      // Gravity for arrows
      if (cfg.hasGravity) {
        p.vy += 80 * dt;
      }

      // Move
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation = Math.atan2(p.vy, p.vx);

      // Terrain collision
      if (this.terrainBlocker && this.terrainBlocker(p.x, p.y)) {
        p.active = false;
        this.pool.push(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > cfg.trailLength) p.trail.shift();

      // Collision check
      let hit = false;

      if (p.fromPlayer) {
        // Hit enemies
        for (let ei = 0; ei < enemies.length; ei++) {
          const e = enemies[ei];
          if (!e.alive || !e.active) continue;
          if (cfg.piercing && p.hitIds.has(ei)) continue;

          const d = dist(p.x, p.y, e.x, e.y);
          if (d < e.radius + cfg.size) {
            // Apply status-based damage amplification (marked / vuln)
            let statusMult = 1;
            const st = e.status as { markedTimer?: number; vulnTimer?: number } | undefined;
            if (st) {
              if ((st.markedTimer ?? 0) > 0) statusMult *= 1.20;
              if ((st.vulnTimer ?? 0) > 0) statusMult *= 1.15;
            }
            const finalDmg = Math.floor(p.damage * statusMult);
            const killed = e.takeDamage(finalDmg);
            onEnemyHit(e.x, e.y, finalDmg, killed, e.xp);
            p.hitIds.add(ei);
            // Synergy: bow mark on hit
            if (p.applyMark && e.status) {
              e.status.markedTimer = Math.max(e.status.markedTimer ?? 0, 0.8);
            }

            if (cfg.splashRadius > 0) {
              // Staff synergy: enlarge splash if staffCircle active
              const splashR = p.staffCircle ? cfg.splashRadius * 1.3 : cfg.splashRadius;
              for (const e2 of enemies) {
                if (!e2.alive || !e2.active || e2 === e) continue;
                if (dist(p.x, p.y, e2.x, e2.y) < splashR) {
                  const k2 = e2.takeDamage(Math.floor(p.damage * 0.5));
                  onEnemyHit(e2.x, e2.y, Math.floor(p.damage * 0.5), k2, e2.xp);
                }
              }
              this.drawExplosion(p.x, p.y, splashR, cfg.color);
            }

            // Staff chain: spawn a secondary projectile to nearest other enemy (once)
            if (p.staffChain && !p.staffChainUsed) {
              let nearest: { x: number; y: number } | null = null;
              let nd = Infinity;
              for (const e2 of enemies) {
                if (!e2.alive || !e2.active || e2 === e) continue;
                const d2 = (e2.x - p.x) ** 2 + (e2.y - p.y) ** 2;
                if (d2 < nd && d2 < 140 * 140) { nd = d2; nearest = { x: e2.x, y: e2.y }; }
              }
              if (nearest) {
                const chainDmg = Math.max(1, Math.floor(p.damage * 0.6));
                const proj2 = this.spawn(p.x, p.y, nearest.x, nearest.y, p.type, chainDmg, true);
                proj2.staffChainUsed = true; // no further chaining
                proj2.life = 0.6;
              }
            }

            if (!cfg.piercing) { hit = true; break; }
          }
        }
      } else {
        // Hit soldiers
        for (const s of soldiers) {
          if (!s.alive || !s.active) continue;
          const d = dist(p.x, p.y, s.x, s.y);
          if (d < s.radius + cfg.size) {
            const killed = s.takeDamage(p.damage);
            onSoldierHit(s.x, s.y, p.damage, killed);
            hit = true; break;
          }
        }
        // Hit player
        if (!hit) {
          const dp = dist(p.x, p.y, playerX, playerY);
          if (dp < playerRadius + cfg.size) {
            onPlayerHit(p.damage);
            hit = true;
          }
        }
      }

      if (hit && !cfg.piercing) {
        p.active = false;
        this.pool.push(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      // === RENDER ===
      this.renderProjectile(p, cfg);
    }
  }

  private renderProjectile(p: Projectile, cfg: ProjectileConfig): void {
    // Trail
    if (p.trail.length > 1) {
      for (let t = 0; t < p.trail.length - 1; t++) {
        const alpha = (t / p.trail.length) * 0.5;
        const width = (t / p.trail.length) * cfg.size * 0.8;
        this.gfx.lineStyle(width, cfg.trailColor, alpha);
        this.gfx.moveTo(p.trail[t].x, p.trail[t].y);
        this.gfx.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
      }
      this.gfx.lineStyle(0);
    }

    // Projectile body
    switch (p.type) {
      case 'arrow': {
        // Arrow shaft
        const len = 12;
        const dx = Math.cos(p.rotation);
        const dy = Math.sin(p.rotation);
        this.gfx.lineStyle(2, 0x8B6914);
        this.gfx.moveTo(p.x - dx * len, p.y - dy * len);
        this.gfx.lineTo(p.x, p.y);
        this.gfx.lineStyle(0);
        // Arrowhead
        this.gfx.beginFill(0xcccccc);
        this.gfx.drawPolygon([
          p.x + dx * 5, p.y + dy * 5,
          p.x - dy * 3, p.y + dx * 3,
          p.x + dy * 3, p.y - dx * 3,
        ]);
        this.gfx.endFill();
        // Fletching
        this.gfx.beginFill(0xcc4444, 0.7);
        const fx = p.x - dx * len;
        const fy = p.y - dy * len;
        this.gfx.drawPolygon([
          fx, fy,
          fx - dy * 3, fy + dx * 3,
          fx - dx * 3, fy - dy * 3,
        ]);
        this.gfx.endFill();
        break;
      }
      case 'magic_bolt': {
        // Glowing orb
        this.gfx.beginFill(cfg.color, 0.3);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 2.5);
        this.gfx.endFill();
        this.gfx.beginFill(cfg.color, 0.7);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 1.5);
        this.gfx.endFill();
        this.gfx.beginFill(0xffffff, 0.8);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 0.6);
        this.gfx.endFill();
        // Sparkles around
        for (let s = 0; s < 3; s++) {
          const sa = (Date.now() * 0.01 + s * 2.1) % (Math.PI * 2);
          const sr = cfg.size * 2;
          this.gfx.beginFill(0xcc88ff, 0.5);
          this.gfx.drawCircle(p.x + Math.cos(sa) * sr, p.y + Math.sin(sa) * sr, 1.5);
          this.gfx.endFill();
        }
        break;
      }
      case 'crossbow_bolt': {
        const len = 10;
        const dx = Math.cos(p.rotation);
        const dy = Math.sin(p.rotation);
        this.gfx.lineStyle(2.5, 0xaaaaaa);
        this.gfx.moveTo(p.x - dx * len, p.y - dy * len);
        this.gfx.lineTo(p.x + dx * 3, p.y + dy * 3);
        this.gfx.lineStyle(0);
        // Metal tip
        this.gfx.beginFill(0xdddddd);
        this.gfx.drawCircle(p.x + dx * 3, p.y + dy * 3, 2);
        this.gfx.endFill();
        break;
      }
      case 'heal_orb': {
        // Golden healing orb
        this.gfx.beginFill(0xffd700, 0.2);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 2);
        this.gfx.endFill();
        this.gfx.beginFill(0xffd700, 0.6);
        this.gfx.drawCircle(p.x, p.y, cfg.size);
        this.gfx.endFill();
        // Cross
        this.gfx.beginFill(0xffffff, 0.8);
        this.gfx.drawRect(p.x - 1, p.y - 4, 2, 8);
        this.gfx.drawRect(p.x - 4, p.y - 1, 8, 2);
        this.gfx.endFill();
        break;
      }
      case 'fireball': {
        // Fire core
        this.gfx.beginFill(0xff4400, 0.3);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 2.5);
        this.gfx.endFill();
        this.gfx.beginFill(0xff6622, 0.6);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 1.5);
        this.gfx.endFill();
        this.gfx.beginFill(0xffaa44, 0.8);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 0.8);
        this.gfx.endFill();
        this.gfx.beginFill(0xffdd88, 0.9);
        this.gfx.drawCircle(p.x, p.y, cfg.size * 0.3);
        this.gfx.endFill();
        break;
      }
    }
  }

  private drawExplosion(x: number, y: number, radius: number, color: number): void {
    // Brief explosion circle (will be drawn for 1 frame)
    this.gfx.beginFill(color, 0.2);
    this.gfx.drawCircle(x, y, radius);
    this.gfx.endFill();
    this.gfx.lineStyle(2, color, 0.5);
    this.gfx.drawCircle(x, y, radius * 0.7);
    this.gfx.lineStyle(0);
  }
}
