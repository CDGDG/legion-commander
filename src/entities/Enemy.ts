import { Graphics, Container, Sprite } from 'pixi.js';
import { dist, normalize, randomRange } from '../utils/math';
import { updateIsoPosition, createShadow } from '../utils/IsoHelper';
import { loadCharacterSheet, CharacterTextures, getDirIndex } from '../utils/SpriteLoader';

export type EnemyType = 'grunt' | 'charger' | 'sniper' | 'shielder' | 'bomber';

interface EnemyConfig {
  hp: number; speed: number; damage: number; attackRange: number;
  attackRate: number; radius: number; xp: number; sheetUrl: string;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  // HP ×2.0~2.7, DMG ×1.1~1.2 per Codex approach #2
  // Shielder intentionally lower HP mult (×1.8) to avoid boring sponge
  grunt:    { hp: 50, speed: 55, damage: 6, attackRange: 18, attackRate: 1.0, radius: 8, xp: 4, sheetUrl: '/sprites/grunt.png' },
  charger:  { hp: 75, speed: 160, damage: 11, attackRange: 15, attackRate: 0.8, radius: 9, xp: 7, sheetUrl: '/sprites/charger.png' },
  sniper:   { hp: 36, speed: 35, damage: 9, attackRange: 200, attackRate: 2.0, radius: 7, xp: 7, sheetUrl: '/sprites/sniper.png' },
  shielder: { hp: 145, speed: 40, damage: 4, attackRange: 18, attackRate: 1.5, radius: 12, xp: 12, sheetUrl: '/sprites/shielder.png' },
  bomber:   { hp: 55, speed: 100, damage: 28, attackRange: 10, attackRate: 99, radius: 8, xp: 9, sheetUrl: '/sprites/bomber.png' },
};

export class Enemy {
  x = 0; y = 0;
  hp = 20; maxHp = 20;
  speed = 55; damage = 5;
  attackRange = 18; attackRate = 1.0;
  attackCooldown = 0; radius = 8;
  xp = 3;
  type: EnemyType = 'grunt';
  alive = true; active = false;
  isElite = false; isBoss = false;
  /** Status effect bag (synergy-applied marks / vulnerabilities / stuns) */
  status: { markedTimer?: number; vulnTimer?: number; stunTimer?: number } = {};

  gfx: Graphics;
  sprite: Sprite;
  shadow: Graphics;
  hpBarBg: Graphics;
  hpBarFill: Graphics;

  targetX = 0; targetY = 0;
  targetsPlayer = false;
  private textures: CharacterTextures | null = null;
  private facingDir = 'down';
  private idleTime = 0;

  constructor() {
    this.gfx = new Graphics();
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 0.75);
    this.sprite.scale.set(0.28);
    this.shadow = createShadow(8);
    this.shadow.visible = false;
    this.hpBarBg = new Graphics();
    this.hpBarFill = new Graphics();
  }

  init(type: EnemyType, x: number, y: number, hpMult: number, dmgMult: number, elite: boolean, container: Container): void {
    const cfg = ENEMY_CONFIGS[type];
    this.type = type;
    this.x = x; this.y = y;
    this.isBoss = false;
    // Elite: HP ×2 (was ×3), DMG ×1.4 (was ×3) — base enemies are fatter now so tone down elites
    const eliteHpMult = elite ? 2.0 : 1;
    const eliteDmgMult = elite ? 1.4 : 1;
    this.maxHp = cfg.hp * hpMult * eliteHpMult;
    this.hp = this.maxHp;
    this.speed = cfg.speed * (elite ? 0.8 : 1);
    this.damage = cfg.damage * dmgMult * eliteDmgMult;
    this.attackRange = cfg.attackRange;
    this.attackRate = cfg.attackRate;
    this.radius = cfg.radius * (elite ? 1.5 : 1);
    this.xp = cfg.xp * (elite ? 3 : 1);
    this.attackCooldown = randomRange(0, this.attackRate);
    this.targetsPlayer = type === 'charger';
    this.isElite = elite;
    this.alive = true; this.active = true;
    // Reset status bag on init (pooled enemies may retain old state)
    this.status.markedTimer = 0;
    this.status.vulnTimer = 0;
    this.status.stunTimer = 0;

    this.sprite.visible = true;
    this.sprite.scale.set(elite ? 0.38 : 0.28);
    this.shadow.visible = true;
    this.hpBarBg.visible = false;
    this.hpBarFill.visible = false;
    if (!this.shadow.parent) container.addChild(this.shadow);
    if (!this.gfx.parent) container.addChild(this.gfx);
    if (!this.sprite.parent) container.addChild(this.sprite);
    if (!this.hpBarBg.parent) container.addChild(this.hpBarBg);
    if (!this.hpBarFill.parent) container.addChild(this.hpBarFill);

    if (elite) this.sprite.tint = 0xffdd88;

    loadCharacterSheet(cfg.sheetUrl, 2).then(tex => {
      this.textures = tex;
      this.updateFrame();
    });
  }

  initBoss(x: number, y: number, bossLevel: number, container: Container): void {
    this.type = 'grunt';
    this.x = x; this.y = y;
    this.isBoss = true; this.isElite = true;
    // Boss HP ×3 — target TTK ~45-90s (was ~15-30s). Damage tempered to not instakill.
    this.maxHp = 900 + bossLevel * 600;
    this.hp = this.maxHp;
    this.speed = 70;
    this.damage = 14 + bossLevel * 5;
    this.attackRange = 30;
    this.attackRate = 1.2;
    this.radius = 28;
    this.xp = 40 + bossLevel * 20;
    this.targetsPlayer = true;
    this.alive = true; this.active = true;
    this.attackCooldown = 1;

    this.sprite.visible = true;
    this.sprite.scale.set(0.45); // boss is bigger
    this.shadow.visible = true;
    this.hpBarBg.visible = true;
    this.hpBarFill.visible = true;

    if (!this.shadow.parent) container.addChild(this.shadow);
    if (!this.gfx.parent) container.addChild(this.gfx);
    if (!this.sprite.parent) container.addChild(this.sprite);
    if (!this.hpBarBg.parent) container.addChild(this.hpBarBg);
    if (!this.hpBarFill.parent) container.addChild(this.hpBarFill);

    loadCharacterSheet('/sprites/boss.png', 2, 192).then(tex => {
      this.textures = tex;
      this.updateFrame();
    });
  }

  private updateFrame(): void {
    if (!this.textures) return;
    const dir = getDirIndex(this.facingDir);
    const frame = this.textures.frames[dir]?.[0]; // just idle for now
    if (frame) this.sprite.texture = frame;
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.alive || !this.active) return;
    this.attackCooldown -= dt;

    // Tick status timers
    if (this.status.markedTimer && this.status.markedTimer > 0) this.status.markedTimer -= dt;
    if (this.status.vulnTimer   && this.status.vulnTimer   > 0) this.status.vulnTimer   -= dt;
    if (this.status.stunTimer   && this.status.stunTimer   > 0) this.status.stunTimer   -= dt;

    // If stunned, skip movement/attack this frame
    if ((this.status.stunTimer ?? 0) > 0) {
      this.sprite.tint = 0x88aaff; // blue tint while stunned
      return;
    }

    const tx = this.targetsPlayer ? playerX : this.targetX;
    const ty = this.targetsPlayer ? playerY : this.targetY;
    const d = dist(this.x, this.y, tx, ty);

    if (d > this.attackRange) {
      const dir = normalize(tx - this.x, ty - this.y);
      const sm = (this as any).speedMult ?? 1;
      this.x += dir.x * this.speed * sm * dt;
      this.y += dir.y * this.speed * sm * dt;
    }

    // Visual tints for status effects (priority: stun > marked > vuln)
    if ((this.status.markedTimer ?? 0) > 0) {
      this.sprite.tint = 0xffaaff; // pink (marked)
    } else if ((this.status.vulnTimer ?? 0) > 0) {
      this.sprite.tint = 0xffcc88; // amber (vuln)
    } else {
      this.sprite.tint = 0xffffff;
    }

    // Room clamp — match RoomSystem ROOM_ENEMY_H{X,Y}
    this.x = Math.max(-710, Math.min(710, this.x));
    this.y = Math.max(-435, Math.min(435, this.y));

    // Direction
    const dx2 = tx - this.x, dy2 = ty - this.y;
    const newDir = Math.abs(dx2) > Math.abs(dy2) ? (dx2 > 0 ? 'right' : 'left') : (dy2 > 0 ? 'down' : 'up');
    if (newDir !== this.facingDir) {
      this.facingDir = newDir;
      this.updateFrame();
    }

    // Idle bob
    this.idleTime += dt;
    const bob = Math.sin(this.idleTime * 3 + this.x * 0.01) * 1.2;
    updateIsoPosition(this.gfx, this.shadow, this.x, this.y + bob);
    this.sprite.x = this.gfx.x;
    this.sprite.y = this.gfx.y;
    this.sprite.zIndex = this.gfx.zIndex;
    this.gfx.visible = false;

    // HP bar
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio < 1) {
      const barW = this.isBoss ? 50 : (this.isElite ? 24 : 16);
      const barColor = this.isBoss ? 0xff00ff : (this.isElite ? 0xffcc00 : 0xcc3333);
      this.hpBarBg.clear();
      this.hpBarBg.beginFill(0x222222);
      this.hpBarBg.drawRect(-barW / 2, -20, barW, 3);
      this.hpBarBg.endFill();
      this.hpBarBg.visible = true;
      this.hpBarBg.x = this.sprite.x;
      this.hpBarBg.y = this.sprite.y;
      this.hpBarBg.zIndex = this.sprite.zIndex + 1;

      this.hpBarFill.clear();
      this.hpBarFill.beginFill(barColor);
      this.hpBarFill.drawRect(-barW / 2, -20, barW * hpRatio, 3);
      this.hpBarFill.endFill();
      this.hpBarFill.visible = true;
      this.hpBarFill.x = this.sprite.x;
      this.hpBarFill.y = this.sprite.y;
      this.hpBarFill.zIndex = this.sprite.zIndex + 2;
    } else {
      this.hpBarBg.visible = false;
      this.hpBarFill.visible = false;
    }
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.sprite.alpha = 0.5;
    setTimeout(() => { if (this.sprite) this.sprite.alpha = 1; }, 60);
    if (this.hp <= 0) {
      this.alive = false; this.active = false;
      this.sprite.visible = false; this.gfx.visible = false;
      this.shadow.visible = false;
      this.hpBarBg.visible = false; this.hpBarFill.visible = false;
      return true;
    }
    return false;
  }

  deactivate(): void {
    this.alive = false; this.active = false;
    this.sprite.visible = false; this.gfx.visible = false;
    this.shadow.visible = false;
    this.hpBarBg.visible = false; this.hpBarFill.visible = false;
  }
}
