import { Graphics, Container, Sprite } from 'pixi.js';
import { Input } from '../core/Input';
import { Camera } from '../core/Camera';
import { GameState } from '../core/GameState';
import { angle, normalize } from '../utils/math';
import { FacingDir } from '../utils/SpriteFactory';
import { updateIsoPosition, createShadow } from '../utils/IsoHelper';
import { loadCharacterSheet, CharacterTextures, getDirIndex } from '../utils/SpriteLoader';
import { sound } from '../systems/SoundSystem';

export class Player {
  x = 0;
  y = 0;
  hp = 120;            // +20% — Codex approach #2
  maxHp = 120;
  speed = 200;
  attackDamage = 20;   // -9% — extend TTK
  attackRange = 65;
  attackCooldown = 0;
  attackRate = 0.5;    // DPS now 40 (was 44)
  radius = 14;

  dashSpeed = 600;
  dashDuration = 0.15;
  dashCooldown = 0;
  dashCooldownMax = 1.2;
  isDashing = false;
  private dashTimer = 0;
  private dashDirX = 0;
  private dashDirY = 0;

  // Visuals
  gfx: Graphics; // kept for compatibility (shadow ring etc)
  sprite: Sprite;
  weaponGfx: Graphics;
  shadow: Graphics;
  private textures: CharacterTextures | null = null;
  private facingAngle = 0;
  private facingDir: FacingDir = 'down';
  private isAttacking = false;
  private idleTime = 0;
  private hitRecoilTimer = 0;
  private attackVisTimer = 0;
  lastDashAfterimageTime = 999;

  alive = true;

  constructor(container: Container) {
    this.shadow = createShadow(14);
    container.addChild(this.shadow);

    this.gfx = new Graphics();
    container.addChild(this.gfx);

    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 0.75); // anchor at feet area
    this.sprite.scale.set(0.35); // 128px sheet → ~45px on screen
    container.addChild(this.sprite);

    this.weaponGfx = new Graphics();
    container.addChild(this.weaponGfx);

    // Load spritesheet
    loadCharacterSheet('/sprites/player.png', 3).then(tex => {
      this.textures = tex;
      this.updateFrame();
    });
  }

  private updateFrame(): void {
    if (!this.textures) return;
    const dir = getDirIndex(this.facingDir);
    const state = this.isAttacking ? 2 : 0; // idle or attack
    const frame = this.textures.frames[dir]?.[state];
    if (frame) this.sprite.texture = frame;
  }

  /** Auto-targeting position (set externally each frame — nearest enemy) */
  autoAimX: number | null = null;
  autoAimY: number | null = null;
  /** Distance to nearest enemy (squared, for auto-attack range check) */
  autoAimDist2: number = Infinity;

  update(dt: number, input: Input, camera: Camera, state: GameState): void {
    if (!this.alive) return;

    const synergy = state.getSynergyBonus();
    if (synergy.hpRegen > 0) this.hp = Math.min(this.maxHp, this.hp + synergy.hpRegen * dt);

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Auto-aim: face nearest enemy if any, otherwise face movement direction
    if (this.autoAimX !== null && this.autoAimY !== null) {
      this.facingAngle = angle(this.x, this.y, this.autoAimX, this.autoAimY);
    } else {
      const m = input.getMovementVector();
      if (m.x !== 0 || m.y !== 0) {
        this.facingAngle = Math.atan2(m.y, m.x);
      }
    }
    // (camera is no longer used for aim, kept in signature for compat)
    void camera;

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.x += this.dashDirX * this.dashSpeed * dt;
      this.y += this.dashDirY * this.dashSpeed * dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    } else {
      const move = input.getMovementVector();
      this.x += move.x * this.speed * dt;
      this.y += move.y * this.speed * dt;

      // Dash: spacebar (edge) on desktop OR touch dash button
      if (this.dashCooldown <= 0 && input.consumeDashTrigger()) {
        const dirX = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(this.facingAngle);
        const dirY = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(this.facingAngle);
        this.isDashing = true;
        this.dashTimer = this.dashDuration * (1 + synergy.dashRange / 100);
        this.dashDirX = dirX;
        this.dashDirY = dirY;
        this.dashCooldown = this.dashCooldownMax;
        this.lastDashAfterimageTime = 0;
        sound.dash();
      }
    }

    // Room clamp — match RoomSystem ROOM_PLAYER_H{X,Y}
    this.x = Math.max(-680, Math.min(680, this.x));
    this.y = Math.max(-405, Math.min(405, this.y));

    // Facing direction
    const deg = this.facingAngle * 180 / Math.PI;
    const newDir: FacingDir = deg > -45 && deg <= 45 ? 'right' : deg > 45 && deg <= 135 ? 'down' : deg > -135 && deg <= -45 ? 'up' : 'left';
    if (newDir !== this.facingDir || this.isAttacking) {
      this.facingDir = newDir;
      this.updateFrame();
    }

    // Idle bob
    this.idleTime += dt;
    const bob = Math.sin(this.idleTime * 4) * 1.5;

    // Hit recoil
    if (this.hitRecoilTimer > 0) {
      this.hitRecoilTimer -= dt;
      this.sprite.tint = 0xff8888;
    } else {
      this.sprite.tint = 0xffffff;
    }

    // Position
    updateIsoPosition(this.gfx, this.shadow, this.x, this.y + bob);
    this.sprite.x = this.gfx.x;
    this.sprite.y = this.gfx.y;
    this.sprite.zIndex = this.gfx.zIndex;
    this.sprite.alpha = this.isDashing ? 0.4 : 1;
    this.shadow.alpha = this.isDashing ? 0.15 : 0.3;
    this.gfx.visible = false; // hide placeholder graphics

    // Attack visual timer
    if (this.attackVisTimer > 0) {
      this.attackVisTimer -= dt;
      if (this.attackVisTimer <= 0) this.isAttacking = false;
    }
  }

  /**
   * Auto-attack: fires whenever cooldown is ready AND a target is within range.
   * Vampire Survivors style — no input needed.
   * For mace (360° sweep), fires whenever any enemy is in range.
   * For ranged (bow/staff), fires at a generous range multiplier (3x).
   */
  tryAttack(_input: Input, _camera: Camera, isRanged: boolean = false): { x: number; y: number; angle: number } | null {
    if (!this.alive || this.isDashing) return null;
    if (this.attackCooldown > 0) return null;
    if (this.autoAimX === null || this.autoAimY === null) return null;

    // Range check: melee uses attackRange × 1.2 buffer; ranged uses 3× (matches projectile range)
    const effectiveRange = isRanged ? this.attackRange * 3 : this.attackRange * 1.2;
    if (this.autoAimDist2 > effectiveRange * effectiveRange) return null;

    this.attackCooldown = this.attackRate;
    this.isAttacking = true;
    this.attackVisTimer = 0.3;
    this.updateFrame();

    const dir = normalize(Math.cos(this.facingAngle), Math.sin(this.facingAngle));

    // Lunge forward slightly on melee attack only
    if (!isRanged) {
      this.x += dir.x * 12;
      this.y += dir.y * 12;
    }

    return {
      x: this.x + dir.x * this.attackRange * 0.6,
      y: this.y + dir.y * this.attackRange * 0.6,
      angle: this.facingAngle,
    };
  }

  takeDamage(amount: number, state: GameState): void {
    if (this.isDashing) return;
    const synergy = state.getSynergyBonus();
    if (synergy.dodgeChance > 0 && Math.random() < synergy.dodgeChance) return;
    const reduction = synergy.defense / 100;
    const finalDmg = amount * (1 - reduction);
    this.hp -= finalDmg;
    this.hitRecoilTimer = 0.15;
    if (this.hp <= 0) {
      if (synergy.revive) {
        this.hp = this.maxHp * 0.5;
      } else {
        this.alive = false;
        this.sprite.visible = false;
        this.gfx.visible = false;
        this.weaponGfx.visible = false;
      }
    }
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
