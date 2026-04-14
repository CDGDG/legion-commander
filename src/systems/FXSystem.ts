import { Graphics, Container, Text, TextStyle } from 'pixi.js';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: number;
  type: 'spark' | 'smoke' | 'blood' | 'star';
}

interface DmgNumber {
  x: number; y: number;
  vy: number;
  life: number;
  text: Text;
  scale: number;
}

const DMG_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 16, fill: 0xffffff, fontWeight: 'bold', dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 1 });
const CRIT_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 24, fill: 0xffd700, fontWeight: 'bold', dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 2 });

export class FXSystem {
  private container: Container;
  private particles: Particle[] = [];
  private dmgNumbers: DmgNumber[] = [];
  private gfx: Graphics;
  private hitStopTimer = 0;

  constructor(container: Container) {
    this.container = container;
    this.gfx = new Graphics();
    this.gfx.zIndex = 8000;
    container.addChild(this.gfx);
  }

  get isHitStopped(): boolean {
    return this.hitStopTimer > 0;
  }

  // --- Hit sparks ---
  spawnHitSparks(x: number, y: number, count = 6, color = 0xffffff): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.15 + Math.random() * 0.1,
        maxLife: 0.25,
        size: 2 + Math.random() * 3,
        color,
        type: 'spark',
      });
    }
  }

  // --- Slash trail ---
  spawnSlashArc(cx: number, cy: number, angle: number, radius: number, color = 0xffd700): void {
    const arcWidth = 1.2;
    for (let a = -arcWidth; a <= arcWidth; a += 0.08) {
      const sa = angle + a;
      const dist = radius * (0.6 + Math.random() * 0.4);
      const px = cx + Math.cos(sa) * dist;
      const py = cy + Math.sin(sa) * dist;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(sa) * 30,
        vy: Math.sin(sa) * 30,
        life: 0.12 + Math.random() * 0.08,
        maxLife: 0.2,
        size: 4 + Math.random() * 4,
        color,
        type: 'spark',
      });
    }
    // Core bright line
    for (let a = -arcWidth; a <= arcWidth; a += 0.12) {
      const sa = angle + a;
      const px = cx + Math.cos(sa) * radius * 0.8;
      const py = cy + Math.sin(sa) * radius * 0.8;
      this.particles.push({
        x: px, y: py,
        vx: 0, vy: 0,
        life: 0.08,
        maxLife: 0.08,
        size: 6,
        color: 0xffffff,
        type: 'spark',
      });
    }
  }

  // --- Death effect ---
  spawnDeathEffect(x: number, y: number, isEnemy: boolean): void {
    const color = isEnemy ? 0xcc3333 : 0x4488ff;
    // Burst of particles
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 3 + Math.random() * 4,
        color,
        type: 'smoke',
      });
    }
    // Dark smoke
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 30,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 8 + Math.random() * 6,
        color: 0x222222,
        type: 'smoke',
      });
    }
  }

  // --- Damage number ---
  spawnDamageNumber(x: number, y: number, damage: number, crit = false): void {
    const text = new Text(
      crit ? `${damage}!` : `${damage}`,
      crit ? CRIT_STYLE : DMG_STYLE
    );
    text.anchor.set(0.5);
    text.x = x + (Math.random() - 0.5) * 20;
    text.y = y - 15;
    text.zIndex = 9000;
    this.container.addChild(text);

    this.dmgNumbers.push({
      x: text.x,
      y: text.y,
      vy: -60 - (crit ? 30 : 0),
      life: crit ? 0.8 : 0.6,
      text,
      scale: crit ? 1.5 : 1.0,
    });
  }

  // --- Hit stop ---
  triggerHitStop(duration = 0.04): void {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  // --- Screen flash ---
  private flashAlpha = 0;
  private flashColor = 0xffffff;
  triggerFlash(color = 0xffffff, alpha = 0.15): void {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  update(dt: number): void {
    // Hit stop
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
    }

    this.gfx.clear();

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'smoke') p.vy -= 20 * dt; // float up

      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      const size = p.size * (p.life / p.maxLife);

      if (p.type === 'spark') {
        this.gfx.beginFill(p.color, alpha);
        this.gfx.drawCircle(p.x, p.y, size);
        this.gfx.endFill();
        // Additive glow
        this.gfx.beginFill(0xffffff, alpha * 0.3);
        this.gfx.drawCircle(p.x, p.y, size * 0.5);
        this.gfx.endFill();
      } else {
        this.gfx.beginFill(p.color, alpha * 0.6);
        this.gfx.drawCircle(p.x, p.y, size);
        this.gfx.endFill();
      }
    }

    // Damage numbers
    for (let i = this.dmgNumbers.length - 1; i >= 0; i--) {
      const d = this.dmgNumbers[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.container.removeChild(d.text);
        d.text.destroy();
        this.dmgNumbers.splice(i, 1);
        continue;
      }

      d.y += d.vy * dt;
      d.vy *= 0.95;
      d.text.y = d.y;
      d.text.alpha = Math.min(1, d.life * 3);

      // Scale pulse on spawn
      const lifeRatio = 1 - d.life / 0.6;
      d.text.scale.set(d.scale * (1 + Math.max(0, 0.3 - lifeRatio * 0.5)));
    }

    // Screen flash
    if (this.flashAlpha > 0) {
      this.flashAlpha -= dt * 3;
      // Flash is drawn in screen space by Game
    }
  }

  getFlashAlpha(): number {
    return Math.max(0, this.flashAlpha);
  }

  getFlashColor(): number {
    return this.flashColor;
  }
}
