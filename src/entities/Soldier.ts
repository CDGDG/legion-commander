import { Graphics, Container, Sprite } from 'pixi.js';
import { dist, normalize, randomRange } from '../utils/math';
import type { SoldierType, CommandStance } from '../core/GameState';
import { STANCES } from '../data/ContentData';
import { updateIsoPosition, createShadow } from '../utils/IsoHelper';
import { loadCharacterSheet, CharacterTextures, getDirIndex } from '../utils/SpriteLoader';

interface SoldierConfig {
  hp: number; speed: number; damage: number; attackRange: number;
  attackRate: number; radius: number; sheetUrl: string;
}

const SOLDIER_CONFIGS: Record<SoldierType, SoldierConfig> = {
  swordsman: { hp: 50, speed: 110, damage: 7, attackRange: 25, attackRate: 0.8, radius: 7, sheetUrl: '/sprites/swordsman.png' },
  spearman:  { hp: 35, speed: 120, damage: 10, attackRange: 45, attackRate: 1.0, radius: 7, sheetUrl: '/sprites/spearman.png' },
  archer:    { hp: 20, speed: 85, damage: 8, attackRange: 200, attackRate: 1.5, radius: 6, sheetUrl: '/sprites/archer.png' },
  mage:      { hp: 15, speed: 75, damage: 16, attackRange: 160, attackRate: 2.5, radius: 6, sheetUrl: '/sprites/mage.png' },
  priest:    { hp: 25, speed: 95, damage: 0, attackRange: 130, attackRate: 3.0, radius: 6, sheetUrl: '/sprites/priest.png' },
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

  update(dt: number, playerX: number, playerY: number, targetX: number | null, targetY: number | null, targetDist: number, stance: CommandStance = 'follow'): boolean {
    if (!this.alive || !this.active) return false;
    this.attackCooldown -= dt;

    if (this.atkVisTimer > 0) {
      this.atkVisTimer -= dt;
      this.atkGfx.alpha = this.atkVisTimer / 0.1;
      if (this.atkVisTimer <= 0) { this.atkGfx.visible = false; this.isAtk = false; }
    }

    const stanceDef = STANCES.find(s => s.id === stance);
    const spdMult = stanceDef?.armySpeedMult ?? 1;
    const atkMult = stanceDef?.armyAtkMult ?? 1;

    // Formation offset varies by stance
    let formRange = 40;
    if (stance === 'defensive') formRange = 20;
    else if (stance === 'aggressive') formRange = 80;
    else if (stance === 'spread') formRange = 100;
    else if (stance === 'charge') formRange = 120;

    const formX = playerX + this.offsetX * (formRange / 40);
    const formY = playerY + this.offsetY * (formRange / 40);
    let shouldAttack = false;

    // Aggressive/charge: pursue enemies further
    const pursuitRange = stance === 'aggressive' ? 5 : stance === 'charge' ? 8 : 3;

    if (targetX !== null && targetY !== null && targetDist < this.attackRange * pursuitRange) {
      const d = dist(this.x, this.y, targetX, targetY);
      if (d > this.attackRange * 0.9) {
        const dir = normalize(targetX - this.x, targetY - this.y);
        this.x += dir.x * this.speed * spdMult * dt;
        this.y += dir.y * this.speed * spdMult * dt;
      } else if (this.attackCooldown <= 0) {
        shouldAttack = true;
        this.attackCooldown = this.attackRate;
        this.isAtk = true;
        this.atkVisTimer = 0.1;
        this.showAttackVisual(targetX, targetY);
      }
    } else {
      const d = dist(this.x, this.y, formX, formY);
      if (d > 5) {
        const dir = normalize(formX - this.x, formY - this.y);
        const spd = Math.min(this.speed * 1.5, d * 3);
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
