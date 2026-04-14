import { Graphics, Container, Sprite } from 'pixi.js';
import { dist, normalize, randomRange } from '../utils/math';
import type { SoldierType, CommandStance } from '../core/GameState';
import { getStance } from '../data/ContentData';
import { updateIsoPosition, createShadow } from '../utils/IsoHelper';
import { loadCharacterSheet, CharacterTextures, getDirIndex } from '../utils/SpriteLoader';

interface SoldierConfig {
  hp: number; speed: number; damage: number; attackRange: number;
  attackRate: number; radius: number; sheetUrl: string;
}

const SOLDIER_CONFIGS: Record<SoldierType, SoldierConfig> = {
  // HP ×1.7~1.9 per Codex approach #2 (extend frontline survival without sponging)
  swordsman: { hp: 95, speed: 110, damage: 7, attackRange: 25, attackRate: 0.8, radius: 7, sheetUrl: '/sprites/swordsman.png' },
  spearman:  { hp: 63, speed: 120, damage: 10, attackRange: 45, attackRate: 1.0, radius: 7, sheetUrl: '/sprites/spearman.png' },
  archer:    { hp: 34, speed: 85, damage: 8, attackRange: 200, attackRate: 1.5, radius: 6, sheetUrl: '/sprites/archer.png' },
  mage:      { hp: 26, speed: 75, damage: 16, attackRange: 160, attackRate: 2.5, radius: 6, sheetUrl: '/sprites/mage.png' },
  priest:    { hp: 45, speed: 95, damage: 0, attackRange: 130, attackRate: 3.0, radius: 6, sheetUrl: '/sprites/priest.png' },
};

export class Soldier {
  x = 0; y = 0;
  hp = 50; maxHp = 50;
  speed = 110; damage = 7;
  attackRange = 25; attackRate = 0.7;
  attackCooldown = 0; radius = 7;
  type: SoldierType = 'swordsman';
  alive = true; active = false;
  offsetX = 0; offsetY = 0;
  targetEnemyId = -1;

  gfx: Graphics;
  sprite: Sprite;
  shadow: Graphics;
  hpBarGfx: Graphics;
  private atkGfx: Graphics;
  private atkVisTimer = 0;
  private textures: CharacterTextures | null = null;
  private facingDir = 'down';
  private isAtk = false;
  private idleTime = 0;

  constructor() {
    this.gfx = new Graphics();
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 0.75);
    this.sprite.scale.set(0.28);
    this.atkGfx = new Graphics();
    this.atkGfx.visible = false;
    this.shadow = createShadow(6);
    this.shadow.visible = false;
    this.hpBarGfx = new Graphics();
    this.hpBarGfx.visible = false;
  }

  init(type: SoldierType, x: number, y: number, container: Container): void {
    const cfg = SOLDIER_CONFIGS[type];
    this.type = type;
    this.x = x; this.y = y;
    this.maxHp = cfg.hp; this.hp = cfg.hp;
    this.speed = cfg.speed; this.damage = cfg.damage;
    this.attackRange = cfg.attackRange; this.attackRate = cfg.attackRate;
    this.radius = cfg.radius;
    this.attackCooldown = randomRange(0, this.attackRate);
    this.alive = true; this.active = true;
    this.offsetX = randomRange(-30, 30);
    this.offsetY = randomRange(-30, 30);

    this.sprite.visible = true;
    this.shadow.visible = true;
    this.hpBarGfx.visible = true;
    if (!this.shadow.parent) container.addChild(this.shadow);
    if (!this.gfx.parent) container.addChild(this.gfx);
    if (!this.sprite.parent) container.addChild(this.sprite);
    if (!this.atkGfx.parent) container.addChild(this.atkGfx);
    if (!this.hpBarGfx.parent) container.addChild(this.hpBarGfx);

    // Load sheet
    loadCharacterSheet(cfg.sheetUrl, 2).then(tex => {
      this.textures = tex;
      this.updateFrame();
    });
  }

  private updateFrame(): void {
    if (!this.textures) return;
    const dir = getDirIndex(this.facingDir);
    const state = this.isAtk ? 1 : 0;
    const frame = this.textures.frames[dir]?.[state];
    if (frame) this.sprite.texture = frame;
  }

  /**
   * Update soldier AI.
   * @param anchorX/Y - stance-specific anchor point (hold=hold anchor, protect=rear mass, else player)
   */
  update(
    dt: number, playerX: number, playerY: number,
    targetX: number | null, targetY: number | null, targetDist: number,
    stance: CommandStance = 'attack',
    anchorX?: number, anchorY?: number,
  ): boolean {
    if (!this.alive || !this.active) return false;
    this.attackCooldown -= dt;

    if (this.atkVisTimer > 0) {
      this.atkVisTimer -= dt;
      this.atkGfx.alpha = this.atkVisTimer / 0.1;
      if (this.atkVisTimer <= 0) { this.atkGfx.visible = false; this.isAtk = false; }
    }

    const stanceDef = getStance(stance);
    const spdMult = stanceDef.armySpeedMult;

    // Is this soldier a ranged unit? (drives evade/protect/wall behavior)
    const isRanged = this.type === 'archer' || this.type === 'mage' || this.type === 'priest';
    const isMelee = !isRanged;

    // Formation offset and pursuit vary per stance + class
    let formRange = 40;           // scale of per-soldier offset around anchor
    let pursuitMult = 3;          // how far to chase from anchor (×attackRange)
    let returnSpeedMult = 1.5;    // speed toward anchor when idle
    let willEngage = true;        // does this soldier chase/attack?
    let idealDistFromTarget = this.attackRange * 0.9; // where to stop approaching

    // Anchor = stance-specific, defaults to player
    let aX = anchorX ?? playerX;
    let aY = anchorY ?? playerY;

    switch (stance) {
      case 'attack':
        formRange = 70;
        pursuitMult = 10;          // chase enemies FAR from anchor
        willEngage = true;
        break;
      case 'evade':
        // Ranged kite; melee mostly idle back
        formRange = 30;
        if (isRanged) {
          pursuitMult = 1;          // don't chase, stay at edge of range
          idealDistFromTarget = this.attackRange * 0.95; // stay at max range
        } else {
          pursuitMult = 0.5;        // melee retreats
          willEngage = false;
        }
        returnSpeedMult = 2.0;     // flee faster
        break;
      case 'protect':
        // Melee ring around rear anchor; ranged cluster at anchor
        if (isMelee) {
          formRange = 55;           // outer ring
          pursuitMult = 2;          // short intercept range
        } else {
          formRange = 20;           // tight cluster at anchor
          pursuitMult = 1.5;
        }
        break;
      case 'hold':
        // Use hold anchor (from state), tight leash
        formRange = 35;
        pursuitMult = 1;            // only attack enemies within own range
        returnSpeedMult = 1.2;
        break;
      case 'rally':
        // Everyone snap to player
        formRange = 25;
        pursuitMult = 0.5;          // don't chase during rally
        returnSpeedMult = 3.5;      // very fast return
        willEngage = false;
        break;
      case 'execute':
        formRange = 80;
        pursuitMult = 12;           // aggressive chase of weak targets
        break;
      case 'surround':
        // Spread wide, push through
        formRange = 130;
        pursuitMult = 8;
        break;
      case 'wall':
        // Melee form a wall in front of player; ranged stay behind
        formRange = isMelee ? 50 : 30;
        pursuitMult = isMelee ? 2 : 1;
        break;
    }

    // Formation position around anchor
    const formX = aX + this.offsetX * (formRange / 40);
    const formY = aY + this.offsetY * (formRange / 40);
    let shouldAttack = false;

    // --- COMBAT / MOVEMENT ---
    const hasTarget = targetX !== null && targetY !== null;
    const inReachOfAnchor = hasTarget && targetDist < this.attackRange * pursuitMult;

    if (willEngage && hasTarget && inReachOfAnchor) {
      const d = dist(this.x, this.y, targetX!, targetY!);

      // EVADE: ranged keeps distance — back away if too close
      if (stance === 'evade' && isRanged && d < this.attackRange * 0.7) {
        const awayX = this.x - targetX!, awayY = this.y - targetY!;
        const awayLen = Math.sqrt(awayX * awayX + awayY * awayY) || 1;
        this.x += (awayX / awayLen) * this.speed * spdMult * dt;
        this.y += (awayY / awayLen) * this.speed * spdMult * dt;
      } else if (d > idealDistFromTarget) {
        // Approach target
        const dir = normalize(targetX! - this.x, targetY! - this.y);
        this.x += dir.x * this.speed * spdMult * dt;
        this.y += dir.y * this.speed * spdMult * dt;
      } else if (this.attackCooldown <= 0) {
        // In range — attack
        shouldAttack = true;
        this.attackCooldown = this.attackRate;
        this.isAtk = true;
        this.atkVisTimer = 0.1;
        this.showAttackVisual(targetX!, targetY!);
      }
    } else {
      // Return to formation / anchor
      const d = dist(this.x, this.y, formX, formY);
      if (d > 5) {
        const dir = normalize(formX - this.x, formY - this.y);
        const spd = Math.min(this.speed * returnSpeedMult, d * 4);
        this.x += dir.x * spd * dt;
        this.y += dir.y * spd * dt;
      }
    }

    this.x = Math.max(-430, Math.min(430, this.x));
    this.y = Math.max(-260, Math.min(260, this.y));

    // Direction
    if (targetX !== null && targetY !== null && targetDist < this.attackRange * 3) {
      const dx = targetX - this.x, dy = targetY - this.y;
      this.facingDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    this.updateFrame();

    // Idle bob
    this.idleTime += dt;
    const bob = Math.sin(this.idleTime * 3.5 + this.offsetX) * 1;
    updateIsoPosition(this.gfx, this.shadow, this.x, this.y + bob);
    this.sprite.x = this.gfx.x;
    this.sprite.y = this.gfx.y;
    this.sprite.zIndex = this.gfx.zIndex;
    this.gfx.visible = false;

    // HP bar
    const hpRatio = this.hp / this.maxHp;
    this.hpBarGfx.clear();
    if (hpRatio < 1) {
      this.hpBarGfx.beginFill(0x333333);
      this.hpBarGfx.drawRect(-8, -20, 16, 3);
      this.hpBarGfx.endFill();
      this.hpBarGfx.beginFill(0x44cc44);
      this.hpBarGfx.drawRect(-8, -20, 16 * hpRatio, 3);
      this.hpBarGfx.endFill();
    }
    this.hpBarGfx.x = this.sprite.x;
    this.hpBarGfx.y = this.sprite.y;
    this.hpBarGfx.zIndex = this.sprite.zIndex + 1;

    return shouldAttack;
  }

  private showAttackVisual(tx: number, ty: number): void {
    this.atkGfx.clear();
    // Ranged classes (archer/mage/priest) use projectile system for visuals — skip here
    if (this.type === 'archer' || this.type === 'mage' || this.type === 'priest') {
      this.atkGfx.visible = false;
      return;
    }
    // Melee classes: small impact flash at hit point
    const color = this.type === 'swordsman' ? 0x88aaff : 0x66ddee;
    this.atkGfx.beginFill(color, 0.5);
    this.atkGfx.drawCircle((this.x + tx) / 2, (this.y + ty) / 2, 6);
    this.atkGfx.endFill();
    this.atkGfx.beginFill(0xffffff, 0.7);
    this.atkGfx.drawCircle((this.x + tx) / 2, (this.y + ty) / 2, 3);
    this.atkGfx.endFill();
    this.atkGfx.visible = true;
    this.atkGfx.zIndex = 7500;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false; this.active = false;
      this.sprite.visible = false; this.gfx.visible = false;
      this.atkGfx.visible = false; this.shadow.visible = false;
      this.hpBarGfx.visible = false;
      return true;
    }
    return false;
  }

  deactivate(): void {
    this.alive = false; this.active = false;
    this.sprite.visible = false; this.gfx.visible = false;
    this.atkGfx.visible = false; this.shadow.visible = false;
    this.hpBarGfx.visible = false;
  }
}
