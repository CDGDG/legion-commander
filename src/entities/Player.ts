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

  update(dt: number, input: Input, camera: Camera, state: GameState): void {
    if (!this.alive) return;

    const synergy = state.getSynergyBonus();
    if (synergy.hpRegen > 0) this.hp = Math.min(this.maxHp, this.hp + synergy.hpRegen * dt);

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const world = camera.screenToWorld(input.mouseX, input.mouseY);
    this.facingAngle = angle(this.x, this.y, world.x, world.y);

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.x += this.dashDirX * this.dashSpeed * dt;
      this.y += this.dashDirY * this.dashSpeed * dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    } else {
      const move = input.getMovementVector();
      this.x += move.x * this.speed * dt;
      this.y += move.y * this.speed * dt;

      if (input.isKeyDown(' ') && this.dashCooldown <= 0) {
        const dirX = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(this.facingAngle);
        const dirY = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(this.facingAngle);
        this.isDashing = true;
        this.dashTimer = this.dashDuration * (1 + synergy.dashRange / 100);
        this.dashDirX = dirX;
        this.dashDirY = dirY;
        this.dashCooldown = this.dashCooldownMax;
        sound.dash();
      }
    }

    this.x = Math.max(-430, Math.min(430, this.x));
    this.y = Math.max(-260, Math.min(260, this.y));

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

  tryAttack(input: Input, camera: Camera): { x: number; y: number; angle: number } | null {
    if (!this.alive || this.isDashing) return null;
    if (!input.isMouseDown()) return null;
    if (this.attackCooldown > 0) return null;

    this.attackCooldown = this.attackRate;
    this.isAttacking = true;
    this.attackVisTimer = 0.3;
    this.updateFrame();

    const dir = normalize(Math.cos(this.facingAngle), Math.sin(this.facingAngle));

    // Lunge forward slightly on attack
    this.x += dir.x * 12;
    this.y += dir.y * 12;

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
