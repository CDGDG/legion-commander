import { Graphics, Container } from 'pixi.js';

export type WeaponCategory = 'sword' | 'dagger' | 'spear' | 'axe' | 'bow' | 'staff' | 'mace';

interface BaseAttack {
  cx: number; cy: number;
  angle: number;
  life: number;
  maxLife: number;
  color: number;
}

interface SlashAttack extends BaseAttack { kind: 'slash'; radius: number; bladeLength: number; currentAngle: number; startAngle: number; endAngle: number; phase: 'windup' | 'swing' | 'follow'; phaseTime: number; }
interface StabAttack extends BaseAttack { kind: 'stab'; distance: number; phase: 'windup' | 'thrust' | 'retract'; phaseTime: number; bladeLength: number; }
interface ThrustAttack extends BaseAttack { kind: 'thrust'; length: number; phase: 'windup' | 'thrust' | 'retract'; phaseTime: number; currentLength: number; }
interface ChopAttack extends BaseAttack { kind: 'chop'; radius: number; bladeLength: number; currentAngle: number; phase: 'raise' | 'chop' | 'impact'; phaseTime: number; impactRadius: number; }
interface SweepAttack extends BaseAttack { kind: 'sweep'; radius: number; bladeLength: number; currentAngle: number; startAngle: number; endAngle: number; phase: 'windup' | 'sweep' | 'impact'; phaseTime: number; }

type Attack = SlashAttack | StabAttack | ThrustAttack | ChopAttack | SweepAttack;

interface TrailPoint { x: number; y: number; age: number; color: number; }

export class AttackRenderer {
  private container: Container;
  private gfx: Graphics;
  private attacks: Attack[] = [];
  private trails: TrailPoint[] = [];

  constructor(container: Container) {
    this.container = container;
    this.gfx = new Graphics();
    this.gfx.zIndex = 7000;
    container.addChild(this.gfx);
  }

  /**
   * Spawn an attack animation based on weapon category.
   * Each category has a completely different attack style.
   */
  spawnAttack(
    category: WeaponCategory,
    cx: number, cy: number, angle: number,
    range: number, color: number
  ): void {
    switch (category) {
      case 'sword':
        this.attacks.push({
          kind: 'slash',
          cx, cy, angle,
          startAngle: angle - 1.3,
          endAngle: angle + 1.3,
          currentAngle: angle - 1.3,
          radius: range * 0.3,
          bladeLength: range * 0.75,
          phase: 'windup', phaseTime: 0,
          life: 0, maxLife: 0.4, color,
        });
        break;

      case 'dagger':
        // Two quick stabs in rapid succession
        this.attacks.push({
          kind: 'stab', cx, cy, angle,
          distance: range * 0.8,
          phase: 'windup', phaseTime: 0,
          bladeLength: range * 0.35,
          life: 0, maxLife: 0.2, color,
        });
        // Second stab slightly delayed
        setTimeout(() => {
          this.attacks.push({
            kind: 'stab', cx: cx + Math.cos(angle) * 4, cy: cy + Math.sin(angle) * 4, angle: angle + 0.15,
            distance: range * 0.8,
            phase: 'windup', phaseTime: 0,
            bladeLength: range * 0.35,
            life: 0, maxLife: 0.2, color,
          });
        }, 100);
        break;

      case 'spear':
        // Long linear thrust
        this.attacks.push({
          kind: 'thrust', cx, cy, angle,
          length: range * 1.2,
          currentLength: 0,
          phase: 'windup', phaseTime: 0,
          life: 0, maxLife: 0.35, color,
        });
        break;

      case 'axe':
        // Overhead chop - vertical down
        this.attacks.push({
          kind: 'chop', cx, cy, angle,
          radius: range * 0.2,
          bladeLength: range * 0.8,
          currentAngle: angle - Math.PI / 2, // start above
          impactRadius: range * 0.6,
          phase: 'raise', phaseTime: 0,
          life: 0, maxLife: 0.5, color,
        });
        break;

      case 'mace':
        // Wide sweep
        this.attacks.push({
          kind: 'sweep', cx, cy, angle,
          startAngle: angle - 1.8,
          endAngle: angle + 1.8,
          currentAngle: angle - 1.8,
          radius: range * 0.3,
          bladeLength: range * 0.65,
          phase: 'windup', phaseTime: 0,
          life: 0, maxLife: 0.55, color,
        });
        break;

      // Bow and staff use projectile system, not here
      case 'bow':
      case 'staff':
        break;
    }
  }

  update(dt: number): void {
    this.gfx.clear();

    // Update trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].age += dt;
      if (this.trails[i].age > 0.2) this.trails.splice(i, 1);
    }

    // Render trails
    for (const tp of this.trails) {
      const alpha = 1 - tp.age / 0.2;
      this.gfx.beginFill(tp.color, alpha * 0.4);
      this.gfx.drawCircle(tp.x, tp.y, 6 * alpha);
      this.gfx.endFill();
      this.gfx.beginFill(0xffffff, alpha * 0.7);
      this.gfx.drawCircle(tp.x, tp.y, 2.5 * alpha);
      this.gfx.endFill();
    }

    // Update and render attacks
    for (let i = this.attacks.length - 1; i >= 0; i--) {
      const a = this.attacks[i];
      a.life += dt;
      if (a.life > a.maxLife) {
        this.attacks.splice(i, 1);
        continue;
      }

      a.phaseTime = (a.phaseTime || 0) + dt;

      switch (a.kind) {
        case 'slash': this.updateSlash(a); break;
        case 'stab': this.updateStab(a); break;
        case 'thrust': this.updateThrust(a); break;
        case 'chop': this.updateChop(a); break;
        case 'sweep': this.updateSweep(a); break;
      }
    }
  }

  // =============================================================
  // SWORD - Wide horizontal arc
  // =============================================================
  private updateSlash(s: SlashAttack): void {
    const WINDUP = 0.07, SWING = 0.13;
    if (s.phase === 'windup') {
      const t = s.phaseTime / WINDUP;
      s.currentAngle = s.startAngle - 0.3 * (1 - t);
      if (s.phaseTime >= WINDUP) { s.phase = 'swing'; s.phaseTime = 0; }
    } else if (s.phase === 'swing') {
      const t = Math.min(1, s.phaseTime / SWING);
      const eased = 1 - (1 - t) * (1 - t);
      s.currentAngle = s.startAngle + (s.endAngle - s.startAngle) * eased;
      // Trail at blade tip
      const tipX = s.cx + Math.cos(s.currentAngle) * (s.radius + s.bladeLength);
      const tipY = s.cy + Math.sin(s.currentAngle) * (s.radius + s.bladeLength);
      this.trails.push({ x: tipX, y: tipY, age: 0, color: s.color });
      if (s.phaseTime >= SWING) { s.phase = 'follow'; s.phaseTime = 0; }
    } else {
      s.currentAngle = s.endAngle + 0.15 * (s.phaseTime / 0.2);
    }
    this.drawBlade(s.cx, s.cy, s.currentAngle, s.radius, s.bladeLength, s.color, 6, s.phase === 'swing');

    // Arc glow during swing
    if (s.phase === 'swing') {
      this.drawArcGlow(s.cx, s.cy, s.startAngle + 0.2, s.currentAngle, s.radius + s.bladeLength * 0.7, s.color);
    }
  }

  // =============================================================
  // DAGGER - Quick stab
  // =============================================================
  private updateStab(s: StabAttack): void {
    const WINDUP = 0.04, THRUST = 0.05, RETRACT = 0.11;
    let dist = 0;
    if (s.phase === 'windup') {
      dist = -6 * (s.phaseTime / WINDUP);
      if (s.phaseTime >= WINDUP) { s.phase = 'thrust'; s.phaseTime = 0; }
    } else if (s.phase === 'thrust') {
      const t = s.phaseTime / THRUST;
      dist = -6 + (s.distance + 6) * t;
      if (s.phaseTime >= THRUST) { s.phase = 'retract'; s.phaseTime = 0; }
    } else {
      const t = s.phaseTime / RETRACT;
      dist = s.distance * (1 - t);
    }

    const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
    const bx = s.cx + cos * dist;
    const by = s.cy + sin * dist;
    const tx = bx + cos * s.bladeLength;
    const ty = by + sin * s.bladeLength;

    // Thin sharp blade
    const perpX = -sin, perpY = cos;
    this.gfx.beginFill(0xddddee);
    this.gfx.drawPolygon([
      bx + perpX * 2, by + perpY * 2,
      bx - perpX * 2, by - perpY * 2,
      tx, ty,
    ]);
    this.gfx.endFill();
    // Blade glint
    this.gfx.beginFill(0xffffff, 0.7);
    this.gfx.drawPolygon([
      bx + perpX * 1, by + perpY * 1,
      bx + perpX * 0.3, by + perpY * 0.3,
      tx + perpX * 0.3, ty + perpY * 0.3,
    ]);
    this.gfx.endFill();
    // Guard
    this.gfx.beginFill(s.color);
    this.gfx.drawCircle(bx, by, 3);
    this.gfx.endFill();

    // Trail during thrust
    if (s.phase === 'thrust' || (s.phase === 'retract' && s.phaseTime < 0.05)) {
      this.trails.push({ x: tx, y: ty, age: 0, color: s.color });
      // Impact flash at tip
      this.gfx.beginFill(0xffffff, 0.9);
      this.gfx.drawCircle(tx, ty, 4);
      this.gfx.endFill();
      this.gfx.beginFill(s.color, 0.5);
      this.gfx.drawCircle(tx, ty, 10);
      this.gfx.endFill();
    }
  }

  // =============================================================
  // SPEAR - Linear thrust forward, piercing
  // =============================================================
  private updateThrust(t: ThrustAttack): void {
    const WINDUP = 0.08, THRUST = 0.08, HOLD = 0.08, RETRACT = 0.11;
    if (t.phase === 'windup') {
      const p = t.phaseTime / WINDUP;
      t.currentLength = -8 * p; // pull back
      if (t.phaseTime >= WINDUP) { t.phase = 'thrust'; t.phaseTime = 0; }
    } else if (t.phase === 'thrust') {
      const p = t.phaseTime / THRUST;
      const eased = 1 - (1 - p) * (1 - p) * (1 - p);
      t.currentLength = -8 + (t.length + 8) * eased;
      if (t.phaseTime >= THRUST + HOLD) { t.phase = 'retract'; t.phaseTime = 0; }
    } else {
      const p = t.phaseTime / RETRACT;
      t.currentLength = t.length * (1 - p);
    }

    const cos = Math.cos(t.angle), sin = Math.sin(t.angle);
    const perpX = -sin, perpY = cos;

    const startX = t.cx + cos * 8; // start from slight forward of player
    const startY = t.cy + sin * 8;
    const endX = t.cx + cos * Math.max(0, t.currentLength);
    const endY = t.cy + sin * Math.max(0, t.currentLength);

    // Spear shaft
    this.gfx.beginFill(0x8B6914);
    this.gfx.drawPolygon([
      startX + perpX * 2, startY + perpY * 2,
      startX - perpX * 2, startY - perpY * 2,
      endX - perpX * 1.5, endY - perpY * 1.5,
      endX + perpX * 1.5, endY + perpY * 1.5,
    ]);
    this.gfx.endFill();

    // Spearhead (metallic blade)
    if (t.currentLength > 0) {
      const headLen = 14;
      const tipX = endX + cos * headLen;
      const tipY = endY + sin * headLen;
      this.gfx.beginFill(0xcccccc);
      this.gfx.drawPolygon([
        endX + perpX * 4, endY + perpY * 4,
        endX - perpX * 4, endY - perpY * 4,
        tipX, tipY,
      ]);
      this.gfx.endFill();
      // Highlight
      this.gfx.beginFill(0xffffff, 0.6);
      this.gfx.drawPolygon([
        endX + perpX * 2, endY + perpY * 2,
        endX + perpX * 0.5, endY + perpY * 0.5,
        tipX, tipY,
      ]);
      this.gfx.endFill();

      // Energy trail during thrust
      if (t.phase === 'thrust') {
        for (let i = 0; i < 5; i++) {
          const tr = i / 5;
          const trX = startX + (tipX - startX) * tr;
          const trY = startY + (tipY - startY) * tr;
          this.gfx.beginFill(t.color, 0.3 * (1 - tr));
          this.gfx.drawCircle(trX, trY, 6 * (1 - tr));
          this.gfx.endFill();
        }
      }

      // Impact burst at tip
      if (t.phase === 'thrust' && t.phaseTime > THRUST * 0.6) {
        this.gfx.beginFill(0xffffff, 0.8);
        this.gfx.drawCircle(tipX, tipY, 5);
        this.gfx.endFill();
        this.gfx.beginFill(t.color, 0.5);
        this.gfx.drawCircle(tipX, tipY, 12);
        this.gfx.endFill();
      }
    }
  }

  // =============================================================
  // AXE - Overhead chop down
  // =============================================================
  private updateChop(c: ChopAttack): void {
    const RAISE = 0.18, CHOP = 0.08, IMPACT = 0.24;
    const targetAngle = c.angle; // aim direction
    const raiseAngle = c.angle - Math.PI / 2; // straight up from aim direction

    if (c.phase === 'raise') {
      // Slowly raise the axe
      const t = c.phaseTime / RAISE;
      c.currentAngle = raiseAngle - 0.3 * Math.sin(t * Math.PI * 0.5);
      if (c.phaseTime >= RAISE) { c.phase = 'chop'; c.phaseTime = 0; }
    } else if (c.phase === 'chop') {
      // Fast chop down
      const t = c.phaseTime / CHOP;
      const eased = t * t; // accelerating
      c.currentAngle = raiseAngle + (targetAngle - raiseAngle) * eased;
      // Trail
      const tipX = c.cx + Math.cos(c.currentAngle) * (c.radius + c.bladeLength);
      const tipY = c.cy + Math.sin(c.currentAngle) * (c.radius + c.bladeLength);
      this.trails.push({ x: tipX, y: tipY, age: 0, color: c.color });
      if (c.phaseTime >= CHOP) { c.phase = 'impact'; c.phaseTime = 0; }
    } else {
      c.currentAngle = targetAngle;
    }

    // Draw axe
    const a = c.currentAngle;
    const cos = Math.cos(a), sin = Math.sin(a);
    const hx = c.cx + cos * c.radius;
    const hy = c.cy + sin * c.radius;
    const tipX = c.cx + cos * (c.radius + c.bladeLength);
    const tipY = c.cy + sin * (c.radius + c.bladeLength);
    const perpX = -sin, perpY = cos;

    // Handle
    this.gfx.beginFill(0x5A3A10);
    this.gfx.drawPolygon([
      hx + perpX * 2, hy + perpY * 2,
      hx - perpX * 2, hy - perpY * 2,
      tipX - perpX * 1.5 - cos * 15, tipY - perpY * 1.5 - sin * 15,
      tipX + perpX * 1.5 - cos * 15, tipY + perpY * 1.5 - sin * 15,
    ]);
    this.gfx.endFill();

    // Axe head (wide blade)
    const headCenterX = tipX - cos * 8;
    const headCenterY = tipY - sin * 8;
    this.gfx.beginFill(0x888888);
    this.gfx.drawPolygon([
      headCenterX + perpX * 12, headCenterY + perpY * 12,
      headCenterX - perpX * 12, headCenterY - perpY * 12,
      tipX - perpX * 4 + cos * 4, tipY - perpY * 4 + sin * 4,
      tipX + perpX * 4 + cos * 4, tipY + perpY * 4 + sin * 4,
    ]);
    this.gfx.endFill();
    // Blade edge highlight
    this.gfx.beginFill(0xcccccc, 0.7);
    this.gfx.drawPolygon([
      headCenterX + perpX * 10, headCenterY + perpY * 10,
      headCenterX + perpX * 2, headCenterY + perpY * 2,
      tipX + perpX * 2 + cos * 4, tipY + perpY * 2 + sin * 4,
      tipX + perpX * 3 + cos * 2, tipY + perpY * 3 + sin * 2,
    ]);
    this.gfx.endFill();

    // Impact shockwave
    if (c.phase === 'impact') {
      const impactT = c.phaseTime / IMPACT;
      const radius = c.impactRadius * impactT;
      const alpha = 1 - impactT;
      this.gfx.lineStyle(4, c.color, alpha * 0.6);
      this.gfx.drawCircle(tipX, tipY, radius);
      this.gfx.lineStyle(2, 0xffffff, alpha);
      this.gfx.drawCircle(tipX, tipY, radius * 0.6);
      this.gfx.lineStyle(0);
      // Cracks
      for (let i = 0; i < 6; i++) {
        const cra = (i / 6) * Math.PI * 2;
        const cracX = tipX + Math.cos(cra) * radius * 0.8;
        const cracY = tipY + Math.sin(cra) * radius * 0.8;
        this.gfx.beginFill(0x000000, alpha * 0.4);
        this.gfx.drawCircle(cracX, cracY, 3);
        this.gfx.endFill();
      }
    }
  }

  // =============================================================
  // MACE - Wide sweep with impact wave
  // =============================================================
  private updateSweep(s: SweepAttack): void {
    const WINDUP = 0.12, SWEEP = 0.18, IMPACT = 0.25;
    if (s.phase === 'windup') {
      const t = s.phaseTime / WINDUP;
      s.currentAngle = s.startAngle - 0.4 * (1 - t);
      if (s.phaseTime >= WINDUP) { s.phase = 'sweep'; s.phaseTime = 0; }
    } else if (s.phase === 'sweep') {
      const t = Math.min(1, s.phaseTime / SWEEP);
      const eased = 1 - (1 - t) * (1 - t);
      s.currentAngle = s.startAngle + (s.endAngle - s.startAngle) * eased;
      const tipX = s.cx + Math.cos(s.currentAngle) * (s.radius + s.bladeLength);
      const tipY = s.cy + Math.sin(s.currentAngle) * (s.radius + s.bladeLength);
      this.trails.push({ x: tipX, y: tipY, age: 0, color: s.color });
      if (s.phaseTime >= SWEEP) { s.phase = 'impact'; s.phaseTime = 0; }
    }

    const a = s.currentAngle;
    const cos = Math.cos(a), sin = Math.sin(a);
    const hx = s.cx + cos * s.radius;
    const hy = s.cy + sin * s.radius;
    const headX = s.cx + cos * (s.radius + s.bladeLength);
    const headY = s.cy + sin * (s.radius + s.bladeLength);
    const perpX = -sin, perpY = cos;

    // Handle
    this.gfx.beginFill(0x5A3A10);
    this.gfx.drawPolygon([
      hx + perpX * 2, hy + perpY * 2,
      hx - perpX * 2, hy - perpY * 2,
      headX - perpX * 2 - cos * 4, headY - perpY * 2 - sin * 4,
      headX + perpX * 2 - cos * 4, headY + perpY * 2 - sin * 4,
    ]);
    this.gfx.endFill();

    // Mace head (spiked ball)
    this.gfx.beginFill(0x666666);
    this.gfx.drawCircle(headX, headY, 9);
    this.gfx.endFill();
    // Spikes
    for (let k = 0; k < 6; k++) {
      const sa = (k / 6) * Math.PI * 2;
      const sx = headX + Math.cos(sa) * 10;
      const sy = headY + Math.sin(sa) * 10;
      const tx = headX + Math.cos(sa) * 14;
      const ty = headY + Math.sin(sa) * 14;
      this.gfx.beginFill(0x888888);
      this.gfx.drawPolygon([
        headX + Math.cos(sa + 0.4) * 8, headY + Math.sin(sa + 0.4) * 8,
        headX + Math.cos(sa - 0.4) * 8, headY + Math.sin(sa - 0.4) * 8,
        tx, ty,
      ]);
      this.gfx.endFill();
    }
    // Highlight
    this.gfx.beginFill(0xaaaaaa, 0.6);
    this.gfx.drawCircle(headX - 2, headY - 2, 4);
    this.gfx.endFill();

    // Sweep arc glow during sweep
    if (s.phase === 'sweep') {
      this.drawArcGlow(s.cx, s.cy, s.startAngle + 0.2, s.currentAngle, s.radius + s.bladeLength * 0.7, s.color);
    }

    // Impact shockwave
    if (s.phase === 'impact') {
      const impactT = s.phaseTime / IMPACT;
      const radius = s.bladeLength * 1.2 * impactT;
      const alpha = 1 - impactT;
      this.gfx.lineStyle(5, s.color, alpha * 0.5);
      this.gfx.drawCircle(headX, headY, radius);
      this.gfx.lineStyle(2, 0xffffff, alpha * 0.8);
      this.gfx.drawCircle(headX, headY, radius * 0.5);
      this.gfx.lineStyle(0);
    }
  }

  // =============================================================
  // HELPERS
  // =============================================================
  private drawBlade(
    cx: number, cy: number, angle: number,
    radius: number, bladeLen: number, color: number,
    width: number, bright: boolean
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const hx = cx + cos * radius;
    const hy = cy + sin * radius;
    const tx = cx + cos * (radius + bladeLen);
    const ty = cy + sin * (radius + bladeLen);
    const perpX = -sin, perpY = cos;

    // Blade body
    this.gfx.beginFill(0xcccccc);
    this.gfx.drawPolygon([
      hx + perpX * width, hy + perpY * width,
      hx - perpX * width, hy - perpY * width,
      tx - perpX * (width * 0.2), ty - perpY * (width * 0.2),
      tx + perpX * (width * 0.2), ty + perpY * (width * 0.2),
    ]);
    this.gfx.endFill();

    // Edge highlight
    this.gfx.beginFill(0xffffff, bright ? 0.6 : 0.3);
    this.gfx.drawPolygon([
      hx + perpX * (width - 1), hy + perpY * (width - 1),
      hx + perpX * (width * 0.4), hy + perpY * (width * 0.4),
      tx + perpX * 0.5, ty + perpY * 0.5,
      tx + perpX * (width * 0.15), ty + perpY * (width * 0.15),
    ]);
    this.gfx.endFill();

    // Guard
    this.gfx.beginFill(color);
    this.gfx.drawCircle(hx, hy, 4);
    this.gfx.endFill();
    this.gfx.beginFill(color, 0.7);
    this.gfx.drawPolygon([
      hx + perpX * 8, hy + perpY * 8,
      hx - perpX * 8, hy - perpY * 8,
      hx - perpX * 6 - cos * 2, hy - perpY * 6 - sin * 2,
      hx + perpX * 6 - cos * 2, hy + perpY * 6 - sin * 2,
    ]);
    this.gfx.endFill();

    if (bright) {
      this.gfx.beginFill(0xffffff, 0.8);
      this.gfx.drawCircle(tx, ty, 4);
      this.gfx.endFill();
      this.gfx.beginFill(color, 0.4);
      this.gfx.drawCircle(tx, ty, 10);
      this.gfx.endFill();
    }
  }

  private drawArcGlow(
    cx: number, cy: number,
    startA: number, endA: number,
    radius: number, color: number
  ): void {
    const steps = 15;
    const step = (endA - startA) / steps;
    for (let j = 0; j < steps; j++) {
      const a1 = startA + j * step;
      const t = j / steps;
      const x1 = cx + Math.cos(a1) * radius;
      const y1 = cy + Math.sin(a1) * radius;
      this.gfx.beginFill(color, t * 0.4);
      this.gfx.drawCircle(x1, y1, 3 + t * 8);
      this.gfx.endFill();
    }
  }

  // Legacy compat
  spawnSlash(cx: number, cy: number, angle: number, radius: number, color = 0xffd700): void {
    this.spawnAttack('sword', cx, cy, angle, radius, color);
  }
}
