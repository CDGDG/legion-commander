import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { RoomTheme, getTheme, getBossTheme } from './ThemeSystem';
import { randomRange } from '../utils/math';
import { FONT_MONO } from '../utils/Fonts';

// Room size — tuned to fill a typical landscape browser viewport (~1.65:1 ratio)
const ROOM_W = 1400;
const ROOM_H = 850;
// Player/Soldier clamp leaves a small inner margin from the wall
export const ROOM_PLAYER_HX = ROOM_W / 2 - 20; // 680
export const ROOM_PLAYER_HY = ROOM_H / 2 - 20; // 405
// Enemy clamp is slightly looser (they can briefly step on the wall edge)
export const ROOM_ENEMY_HX = ROOM_W / 2 + 10;  // 710
export const ROOM_ENEMY_HY = ROOM_H / 2 + 10;  // 435
// Spawn line — exactly at room edge
export const ROOM_SPAWN_HX = ROOM_W / 2;       // 700
export const ROOM_SPAWN_HY = ROOM_H / 2;       // 425

// Obstacle types for room variety
interface Obstacle {
  x: number; y: number;
  w: number; h: number;
  type: 'pillar' | 'rock' | 'pit';
}

export class RoomSystem {
  container: Container;
  private floorGfx: Graphics;
  private decorGfx: Graphics;
  private wallGfx: Graphics;
  private fogGfx: Graphics;
  private lightGfx: Graphics;
  private obstacleGfx: Graphics;
  private doorGfx: Container;
  private roomLabel: Text;
  private time = 0;
  obstacles: Obstacle[] = [];
  private theme!: RoomTheme;

  constructor(parent: Container) {
    this.container = new Container();
    this.container.sortableChildren = true;
    parent.addChild(this.container);

    this.floorGfx = new Graphics();
    this.floorGfx.zIndex = -100;
    this.container.addChild(this.floorGfx);

    this.decorGfx = new Graphics();
    this.decorGfx.zIndex = -90;
    this.container.addChild(this.decorGfx);

    this.obstacleGfx = new Graphics();
    this.obstacleGfx.zIndex = -50;
    this.container.addChild(this.obstacleGfx);

    this.fogGfx = new Graphics();
    this.fogGfx.zIndex = -80;
    this.fogGfx.alpha = 0.1;
    this.container.addChild(this.fogGfx);

    this.lightGfx = new Graphics();
    this.lightGfx.zIndex = 5000;
    this.lightGfx.alpha = 0.08;
    this.lightGfx.blendMode = 1;
    this.container.addChild(this.lightGfx);

    this.wallGfx = new Graphics();
    this.wallGfx.zIndex = -70;
    this.container.addChild(this.wallGfx);

    this.roomLabel = new Text('', new TextStyle({ fontFamily: FONT_MONO, fontSize: 14, fill: 0x556666 }));
    this.roomLabel.anchor.set(0.5);
    this.roomLabel.zIndex = 5001;
    this.container.addChild(this.roomLabel);

    this.doorGfx = new Container();
    this.doorGfx.zIndex = 5002;
    this.container.addChild(this.doorGfx);
  }

  drawRoom(roomNumber: number, isBoss: boolean): void {
    this.theme = isBoss ? getBossTheme(roomNumber) : getTheme(roomNumber);
    const t = this.theme;
    const hw = ROOM_W / 2;
    const hh = ROOM_H / 2;

    // === FLOOR ===
    this.floorGfx.clear();
    this.floorGfx.beginFill(t.floorBase);
    this.floorGfx.drawRect(-hw, -hh, ROOM_W, ROOM_H);
    this.floorGfx.endFill();

    // Stone tiles
    const tileW = 48, tileH = 48;
    for (let tx = -Math.ceil(hw / tileW); tx <= Math.ceil(hw / tileW); tx++) {
      for (let ty = -Math.ceil(hh / tileH); ty <= Math.ceil(hh / tileH); ty++) {
        const wx = tx * tileW + (ty % 2) * (tileW / 2);
        const wy = ty * tileH;
        if (Math.abs(wx) > hw || Math.abs(wy) > hh) continue;
        const seed = Math.abs(Math.sin(tx * 127 + ty * 311 + roomNumber * 7));
        const tileColor = seed > 0.5 ? t.floorTile : t.floorTileAlt;
        this.floorGfx.beginFill(tileColor);
        this.floorGfx.drawRect(wx - tileW / 2 + 1, wy - tileH / 2 + 1, tileW - 2, tileH - 2);
        this.floorGfx.endFill();
        if (seed > 0.7) {
          this.floorGfx.lineStyle(1, t.crackColor, 0.3);
          this.floorGfx.moveTo(wx - 10, wy);
          this.floorGfx.lineTo(wx + 10, wy - 8);
          this.floorGfx.lineStyle(0);
        }
      }
    }

    // Mortar
    this.floorGfx.lineStyle(1, 0x000000, 0.12);
    for (let x = -hw; x <= hw; x += tileW) { this.floorGfx.moveTo(x, -hh); this.floorGfx.lineTo(x, hh); }
    for (let y = -hh; y <= hh; y += tileH) { this.floorGfx.moveTo(-hw, y); this.floorGfx.lineTo(hw, y); }
    this.floorGfx.lineStyle(0);

    // === DECORATIONS ===
    this.decorGfx.clear();
    // Rune circles
    this.decorGfx.lineStyle(1.5, t.runeColor, 0.35);
    this.decorGfx.drawEllipse(0, 0, 120, 80);
    this.decorGfx.drawEllipse(0, 0, 75, 50);
    this.decorGfx.lineStyle(0);
    // Rune markers
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rx = Math.cos(a) * 98, ry = Math.sin(a) * 65;
      this.decorGfx.beginFill(t.runeColor, 0.25);
      this.decorGfx.drawPolygon([rx, ry - 4, rx + 4, ry, rx, ry + 4, rx - 4, ry]);
      this.decorGfx.endFill();
    }
    // Cracks
    this.decorGfx.lineStyle(1, t.crackColor, 0.4);
    for (let c = 0; c < 5; c++) {
      const sx = Math.sin(c * 73 + roomNumber) * 250;
      const sy = Math.cos(c * 117 + roomNumber) * 150;
      this.decorGfx.moveTo(sx, sy);
      this.decorGfx.lineTo(sx + Math.sin(c * 31) * 80, sy + Math.cos(c * 47) * 50);
    }
    this.decorGfx.lineStyle(0);

    // Torches
    const torchPos = [
      [-hw + 30, -hh + 25], [0, -hh + 18], [hw - 30, -hh + 25],
      [-hw + 30, hh - 25], [0, hh - 18], [hw - 30, hh - 25],
    ];
    for (const [fx, fy] of torchPos) this.drawTorch(fx, fy, t);

    // === OBSTACLES ===
    this.obstacles = [];
    this.obstacleGfx.clear();
    this.generateObstacles(roomNumber, isBoss, t);

    // === FOG ===
    this.fogGfx.clear();
    for (let i = 0; i < 8; i++) {
      const fx = Math.sin(i * 2.1 + roomNumber) * 250;
      const fy = Math.cos(i * 3.7 + roomNumber) * 150;
      this.fogGfx.beginFill(t.fogColor, 0.35);
      this.fogGfx.drawEllipse(fx, fy, 100 + i * 18, 40 + i * 10);
      this.fogGfx.endFill();
    }

    // === LIGHTS ===
    this.lightGfx.clear();
    for (const [lx, ly] of torchPos) {
      this.lightGfx.beginFill(t.lightColor, 0.45);
      this.lightGfx.drawEllipse(lx, ly, 85, 55);
      this.lightGfx.endFill();
    }
    this.lightGfx.beginFill(t.ambientLight, 0.25);
    this.lightGfx.drawEllipse(0, 0, 220, 140);
    this.lightGfx.endFill();

    // === WALLS ===
    this.wallGfx.clear();
    const wallH = 32;
    this.wallGfx.beginFill(t.wallColor);
    this.wallGfx.drawRect(-hw, -hh - wallH, ROOM_W, wallH);
    this.wallGfx.endFill();
    this.wallGfx.beginFill(t.wallColor, 0.7);
    this.wallGfx.drawRect(-hw, -hh - wallH, ROOM_W, wallH * 0.35);
    this.wallGfx.endFill();
    this.wallGfx.lineStyle(2, t.wallHighlight, 0.35);
    this.wallGfx.moveTo(-hw, -hh); this.wallGfx.lineTo(hw, -hh);
    this.wallGfx.lineStyle(0);
    // Side walls
    this.wallGfx.beginFill(t.wallColor, 0.5);
    this.wallGfx.drawRect(-hw - 10, -hh - wallH, 10, ROOM_H + wallH);
    this.wallGfx.drawRect(hw, -hh - wallH, 10, ROOM_H + wallH);
    this.wallGfx.endFill();
    // Border
    this.wallGfx.lineStyle(3, t.borderColor, 0.5);
    this.wallGfx.drawRect(-hw, -hh, ROOM_W, ROOM_H);
    this.wallGfx.lineStyle(0);
    // Pillars
    for (const [px, py] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh], [0, -hh], [-hw, 0], [hw, 0], [0, hh]]) {
      this.drawPillar(px, py, t);
    }

    this.roomLabel.text = `${t.name}${isBoss ? ' - BOSS' : ''} · Room ${roomNumber}`;
    this.roomLabel.y = -hh - wallH - 10;
    this.roomLabel.style.fill = isBoss ? 0xff3366 : 0x667788;

    this.hideDoors();
  }

  private generateObstacles(room: number, isBoss: boolean, t: RoomTheme): void {
    if (isBoss) return; // boss rooms are open arenas
    const layouts = [
      // 0: 4 pillars
      [{ x: -150, y: -80, w: 25, h: 25, type: 'pillar' as const }, { x: 150, y: -80, w: 25, h: 25, type: 'pillar' as const },
       { x: -150, y: 80, w: 25, h: 25, type: 'pillar' as const }, { x: 150, y: 80, w: 25, h: 25, type: 'pillar' as const }],
      // 1: center rock
      [{ x: -20, y: -20, w: 40, h: 40, type: 'rock' as const }],
      // 2: corridor
      [{ x: -300, y: -40, w: 200, h: 20, type: 'rock' as const }, { x: 100, y: 40, w: 200, h: 20, type: 'rock' as const }],
      // 3: scattered
      [{ x: -200, y: -100, w: 30, h: 30, type: 'rock' as const }, { x: 200, y: 100, w: 30, h: 30, type: 'rock' as const },
       { x: -100, y: 80, w: 20, h: 20, type: 'pillar' as const }, { x: 100, y: -80, w: 20, h: 20, type: 'pillar' as const }],
      // 4: open (no obstacles)
      [],
    ];

    const layout = layouts[room % layouts.length];
    this.obstacles = layout;

    for (const obs of layout) {
      if (obs.type === 'pillar') {
        this.obstacleGfx.beginFill(t.pillarColor);
        this.obstacleGfx.drawRect(obs.x - obs.w / 2, obs.y - obs.h / 2 - 15, obs.w, obs.h + 15);
        this.obstacleGfx.endFill();
        this.obstacleGfx.beginFill(t.wallHighlight, 0.15);
        this.obstacleGfx.drawRect(obs.x - obs.w / 2, obs.y - obs.h / 2 - 15, obs.w * 0.3, obs.h + 15);
        this.obstacleGfx.endFill();
        this.obstacleGfx.beginFill(t.pillarGlow, 0.2);
        this.obstacleGfx.drawCircle(obs.x, obs.y - obs.h / 2 - 18, 4);
        this.obstacleGfx.endFill();
      } else {
        // Rock
        this.obstacleGfx.beginFill(t.pillarColor, 0.8);
        this.obstacleGfx.drawRoundedRect(obs.x - obs.w / 2, obs.y - obs.h / 2, obs.w, obs.h, 4);
        this.obstacleGfx.endFill();
        this.obstacleGfx.beginFill(0x000000, 0.2);
        this.obstacleGfx.drawEllipse(obs.x, obs.y + obs.h / 2 + 3, obs.w * 0.6, 4);
        this.obstacleGfx.endFill();
      }
    }
  }

  private drawTorch(x: number, y: number, t: RoomTheme): void {
    this.decorGfx.beginFill(0x443322);
    this.decorGfx.drawRect(x - 2, y - 10, 4, 10);
    this.decorGfx.endFill();
    this.decorGfx.beginFill(t.flameColor1, 0.7);
    this.decorGfx.drawPolygon([x - 4, y - 10, x, y - 20, x + 4, y - 10]);
    this.decorGfx.endFill();
    this.decorGfx.beginFill(t.flameColor2, 0.5);
    this.decorGfx.drawPolygon([x - 2, y - 12, x, y - 17, x + 2, y - 12]);
    this.decorGfx.endFill();
    this.decorGfx.beginFill(t.flameColor2, 0.3);
    this.decorGfx.drawCircle(x, y - 14, 2);
    this.decorGfx.endFill();
    this.decorGfx.beginFill(t.flameColor1, 0.05);
    this.decorGfx.drawEllipse(x, y + 4, 28, 10);
    this.decorGfx.endFill();
  }

  private drawPillar(x: number, y: number, t: RoomTheme): void {
    this.wallGfx.beginFill(0x000000, 0.15);
    this.wallGfx.drawEllipse(x, y + 3, 9, 4);
    this.wallGfx.endFill();
    this.wallGfx.beginFill(t.pillarColor);
    this.wallGfx.drawRect(x - 5, y - 20, 10, 22);
    this.wallGfx.endFill();
    this.wallGfx.beginFill(t.wallHighlight, 0.2);
    this.wallGfx.drawRect(x - 5, y - 20, 3, 22);
    this.wallGfx.endFill();
    this.wallGfx.beginFill(0x444466, 0.4);
    this.wallGfx.drawEllipse(x, y - 20, 6, 3);
    this.wallGfx.endFill();
    this.wallGfx.beginFill(t.pillarGlow, 0.2);
    this.wallGfx.drawCircle(x, y - 24, 3);
    this.wallGfx.endFill();
  }

  update(dt: number): void {
    this.time += dt;
    this.fogGfx.x = Math.sin(this.time * 0.25) * 12;
    this.fogGfx.y = Math.cos(this.time * 0.18) * 6;
    this.fogGfx.alpha = 0.07 + Math.sin(this.time * 0.4) * 0.015;
    this.lightGfx.alpha = 0.07 + Math.sin(this.time * 3.5) * 0.012 + Math.sin(this.time * 7) * 0.006;
  }

  showDoors(choices: { label: string; color: number }[], onSelect: (idx: number) => void): void {
    this.doorGfx.removeChildren();
    const spacing = 160;
    const startX = -(choices.length - 1) * spacing / 2;
    const doorY = 0; // center of room

    choices.forEach((choice, i) => {
      const dc = new Container();
      dc.x = startX + i * spacing;
      dc.y = doorY;

      // Pedestal / altar base
      const base = new Graphics();
      base.beginFill(0x000000, 0.25);
      base.drawEllipse(0, 40, 45, 14);
      base.endFill();
      base.beginFill(0x1a1a2e);
      base.drawRoundedRect(-40, 20, 80, 20, 4);
      base.endFill();
      base.beginFill(0x222244);
      base.drawEllipse(0, 20, 40, 10);
      base.endFill();
      dc.addChild(base);

      // Glowing orb/portal
      const portal = new Graphics();
      // Outer glow
      portal.beginFill(choice.color, 0.08);
      portal.drawCircle(0, -10, 50);
      portal.endFill();
      // Portal body
      portal.beginFill(0x0a0a1a);
      portal.lineStyle(3, choice.color, 0.7);
      portal.drawRoundedRect(-38, -55, 76, 70, 12);
      portal.endFill();
      portal.lineStyle(0);
      // Inner glow
      portal.beginFill(choice.color, 0.12);
      portal.drawRoundedRect(-32, -49, 64, 58, 10);
      portal.endFill();
      // Arch top glow
      portal.beginFill(choice.color, 0.15);
      portal.drawEllipse(0, -55, 32, 10);
      portal.endFill();

      // Reward icon (large, centered)
      const icon = new Graphics();
      icon.beginFill(choice.color, 0.85);
      icon.drawCircle(0, -22, 16);
      icon.endFill();
      icon.beginFill(0xffffff, 0.25);
      icon.drawCircle(-4, -26, 5);
      icon.endFill();
      // Icon symbol based on color
      icon.beginFill(0xffffff, 0.5);
      icon.drawCircle(0, -22, 6);
      icon.endFill();
      portal.addChild(icon);

      portal.eventMode = 'static';
      portal.cursor = 'pointer';
      portal.on('pointerdown', () => onSelect(i));
      portal.on('pointerover', () => { dc.scale.set(1.08); });
      portal.on('pointerout', () => { dc.scale.set(1); });
      dc.addChild(portal);

      // Label (below portal)
      const label = new Text(choice.label, new TextStyle({
        fontFamily: FONT_MONO, fontSize: 13, fill: choice.color,
        fontWeight: 'bold',
        dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 1,
      }));
      label.anchor.set(0.5);
      label.y = 50;
      dc.addChild(label);

      // Bottom light fan
      const fan = new Graphics();
      fan.beginFill(choice.color, 0.04);
      fan.drawEllipse(0, 25, 50, 20);
      fan.endFill();
      dc.addChild(fan);

      this.doorGfx.addChild(dc);
    });
  }

  hideDoors(): void { this.doorGfx.removeChildren(); }
  static get ROOM_W() { return ROOM_W; }
  static get ROOM_H() { return ROOM_H; }
}
