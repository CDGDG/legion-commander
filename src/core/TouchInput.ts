import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { FONT_MONO } from '../utils/Fonts';

/**
 * Mobile touch overlay: virtual joystick (left thumb), dash button (right thumb),
 * and stance hotkeys (right edge).
 *
 * Auto-attack handles all attacks — no attack button needed (VS-style).
 *
 * Auto-shows on touch devices. Hidden on desktop.
 */
export class TouchInput {
  container: Container;
  private screenW: number;
  private screenH: number;

  // Joystick
  private joyOuter: Graphics;
  private joyInner: Graphics;
  private joyId: number = -1;       // active touch identifier
  private joyOriginX = 0;
  private joyOriginY = 0;
  private joyDx = 0;
  private joyDy = 0;
  private joyActive = false;

  // Dash button (right thumb — primary action since attack is automatic)
  private dashBtn: Graphics;
  private dashId: number = -1;
  private dashEdge = false; // true for one frame after dash press

  // Stance buttons (1-8)
  private stanceBtns: Graphics[] = [];
  stancePressed: number | null = null;

  enabled = false; // toggled true on touchstart anywhere

  constructor(parent: Container, screenW: number, screenH: number) {
    this.screenW = screenW;
    this.screenH = screenH;

    this.container = new Container();
    this.container.zIndex = 5000;
    this.container.visible = false;
    parent.addChild(this.container);

    // === JOYSTICK (left thumb) ===
    this.joyOuter = new Graphics();
    this.joyInner = new Graphics();
    this.container.addChild(this.joyOuter);
    this.container.addChild(this.joyInner);

    // === DASH BUTTON (right thumb — primary action) ===
    this.dashBtn = new Graphics();
    this.container.addChild(this.dashBtn);

    // === STANCE BAR (3 slots: Q/W/E) ===
    for (let i = 0; i < 3; i++) {
      const b = new Graphics();
      this.stanceBtns.push(b);
      this.container.addChild(b);
    }

    this.layout();
    this.attachListeners();

    // Auto-enable on first touch
    window.addEventListener('touchstart', () => {
      if (!this.enabled) {
        this.enabled = true;
        this.container.visible = true;
      }
    }, { passive: false });
  }

  private layout(): void {
    const w = this.screenW;
    const h = this.screenH;

    // Joystick: bottom-left
    const joyR = Math.min(70, h * 0.18);
    const joyX = joyR + 30;
    const joyY = h - joyR - 60;
    this.joyOriginX = joyX;
    this.joyOriginY = joyY;

    this.joyOuter.clear();
    this.joyOuter.beginFill(0x000000, 0.35);
    this.joyOuter.drawCircle(joyX, joyY, joyR);
    this.joyOuter.endFill();
    this.joyOuter.lineStyle(2, 0xffffff, 0.4);
    this.joyOuter.drawCircle(joyX, joyY, joyR);
    this.joyOuter.lineStyle(0);

    this.joyInner.clear();
    this.joyInner.beginFill(0xffd700, 0.6);
    this.joyInner.drawCircle(0, 0, joyR * 0.4);
    this.joyInner.endFill();
    this.joyInner.x = joyX; this.joyInner.y = joyY;

    // Dash button: bottom-right (primary right-thumb action)
    const dR = Math.min(60, h * 0.16);
    const dX = w - dR - 24;
    const dY = h - dR - 52;
    this.drawCircleBtn(this.dashBtn, dX, dY, dR, 0x44aaff, '↯');

    // Stance buttons (Q/W/E) — horizontal row above the HP bar, left of the dash button.
    // This keeps the middle Y-zone clear of UI so gameplay (enemies, player) stays visible.
    const slotKeys = ['Q', 'W', 'E'];
    const sBtnW = Math.min(56, (w * 0.5 - 160) / 3); // squeeze between joystick and dash
    const sBtnH = Math.min(44, h * 0.14);
    const gap = 6;
    const totalRowW = sBtnW * 3 + gap * 2;
    // Center the row between joystick (left cluster) and dash (right cluster).
    // Joystick occupies up to ~x=170, dash occupies from ~x=w-120.
    const rowStartX = Math.max(180, (w - totalRowW) / 2 - 40);
    const rowY = h - sBtnH - 48;
    for (let i = 0; i < 3; i++) {
      const x = rowStartX + i * (sBtnW + gap);
      this.drawStanceBtn(this.stanceBtns[i], x, rowY, sBtnW, sBtnH, i, slotKeys[i]);
    }
  }

  private drawCircleBtn(g: Graphics, x: number, y: number, r: number, color: number, label: string): void {
    g.removeChildren();
    g.clear();
    g.beginFill(0x000000, 0.35);
    g.drawCircle(x, y, r);
    g.endFill();
    g.lineStyle(3, color, 0.85);
    g.drawCircle(x, y, r);
    g.lineStyle(0);
    g.beginFill(color, 0.25);
    g.drawCircle(x, y, r * 0.85);
    g.endFill();

    const txt = new Text(label, new TextStyle({
      fontFamily: FONT_MONO, fontSize: r * 0.7, fill: color, fontWeight: 'bold',
    }));
    txt.anchor.set(0.5);
    txt.x = x; txt.y = y;
    g.addChild(txt);
  }

  private drawStanceBtn(g: Graphics, x: number, y: number, w: number, h: number, slotIdx: number, keyLabel: string): void {
    g.removeChildren();
    g.clear();
    g.beginFill(0x111122, 0.75);
    g.drawRoundedRect(x, y, w, h, 6);
    g.endFill();
    g.lineStyle(2, 0x6688aa, 0.6);
    g.drawRoundedRect(x, y, w, h, 6);
    g.lineStyle(0);
    const txt = new Text(keyLabel, new TextStyle({
      fontFamily: FONT_MONO, fontSize: 18, fill: 0xddddee, fontWeight: 'bold',
    }));
    txt.anchor.set(0.5);
    txt.x = x + w / 2; txt.y = y + h / 2;
    g.addChild(txt);
    // Hit area carries slot index (0/1/2)
    (g as any)._hitArea = { x, y, w, h, num: slotIdx };
  }

  private attachListeners(): void {
    const handle = (e: TouchEvent, kind: 'start' | 'move' | 'end') => {
      if (!this.enabled) return;
      e.preventDefault();
      const touches = kind === 'end' ? e.changedTouches : e.touches;
      // For move/start, walk all current touches and assign actions
      if (kind !== 'end') {
        let joyStill = false;
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          this.processTouch(t, 'continue');
          if (t.identifier === this.joyId) joyStill = true;
        }
        if (!joyStill) { this.joyActive = false; this.joyDx = 0; this.joyDy = 0; this.joyId = -1; this.joyInner.x = this.joyOriginX; this.joyInner.y = this.joyOriginY; }
      }
      // For new touches, classify
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        this.processTouch(t, kind);
      }
    };
    window.addEventListener('touchstart', (e) => handle(e, 'start'), { passive: false });
    window.addEventListener('touchmove', (e) => handle(e, 'move'), { passive: false });
    window.addEventListener('touchend', (e) => handle(e, 'end'), { passive: false });
    window.addEventListener('touchcancel', (e) => handle(e, 'end'), { passive: false });

    window.addEventListener('resize', () => {
      this.screenW = window.innerWidth;
      this.screenH = window.innerHeight;
      this.layout();
    });
  }

  private processTouch(t: Touch, kind: 'start' | 'continue' | 'move' | 'end'): void {
    const x = t.clientX, y = t.clientY;

    // === Joystick area (left half + bottom) ===
    if (kind === 'start' && this.joyId === -1 && x < this.screenW * 0.45 && y > this.screenH * 0.5) {
      this.joyId = t.identifier;
      this.joyOriginX = x; // recenter joystick at touch point
      this.joyOriginY = y;
      this.joyOuter.x = 0; this.joyOuter.y = 0;
      // redraw joy outer at this position
      const joyR = Math.min(70, this.screenH * 0.18);
      this.joyOuter.clear();
      this.joyOuter.beginFill(0x000000, 0.35);
      this.joyOuter.drawCircle(x, y, joyR);
      this.joyOuter.endFill();
      this.joyOuter.lineStyle(2, 0xffffff, 0.4);
      this.joyOuter.drawCircle(x, y, joyR);
      this.joyOuter.lineStyle(0);
      this.joyInner.x = x; this.joyInner.y = y;
      this.joyActive = true;
      this.updateJoyVector(x, y);
      return;
    }
    if (this.joyId === t.identifier && kind !== 'end') {
      this.updateJoyVector(x, y);
      return;
    }
    if (this.joyId === t.identifier && kind === 'end') {
      this.joyId = -1; this.joyActive = false; this.joyDx = 0; this.joyDy = 0;
      this.joyInner.x = this.joyOriginX; this.joyInner.y = this.joyOriginY;
      return;
    }

    // === Dash button area (right thumb — primary action) ===
    const dR = Math.min(60, this.screenH * 0.16);
    const dX = this.screenW - dR - 24;
    const dY = this.screenH - dR - 52;
    if (this.isInsideCircle(x, y, dX, dY, dR + 10)) {
      if (kind === 'start') {
        this.dashId = t.identifier;
        this.dashEdge = true;
      }
      return;
    }

    // === Stance buttons ===
    for (let i = 0; i < this.stanceBtns.length; i++) {
      const ha = (this.stanceBtns[i] as any)._hitArea;
      if (ha && x >= ha.x && x <= ha.x + ha.w && y >= ha.y && y <= ha.y + ha.h) {
        if (kind === 'start') {
          this.stancePressed = ha.num;
        }
        return;
      }
    }
  }

  private isInsideCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
    const dx = px - cx, dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  }

  private updateJoyVector(touchX: number, touchY: number): void {
    const dx = touchX - this.joyOriginX;
    const dy = touchY - this.joyOriginY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const max = Math.min(70, this.screenH * 0.18);
    if (len < 5) {
      this.joyDx = 0; this.joyDy = 0;
    } else {
      const clamped = Math.min(len, max);
      this.joyDx = (dx / len) * (clamped / max);
      this.joyDy = (dy / len) * (clamped / max);
    }
    // Move inner stick
    const visualR = max * 0.6;
    this.joyInner.x = this.joyOriginX + (dx / Math.max(len, 1)) * Math.min(len, visualR);
    this.joyInner.y = this.joyOriginY + (dy / Math.max(len, 1)) * Math.min(len, visualR);
  }

  // === Public read interface ===
  getMovementVector(): { x: number; y: number } | null {
    if (!this.enabled || !this.joyActive) return null;
    return { x: this.joyDx, y: this.joyDy };
  }
  /** Always false — auto-attack handles all firing now. Kept for Input bridge compat. */
  isAttackHeld(): boolean { return false; }
  consumeDash(): boolean {
    if (!this.enabled) return false;
    const d = this.dashEdge;
    this.dashEdge = false;
    return d;
  }
  consumeStance(): number | null {
    if (!this.enabled) return null;
    const s = this.stancePressed;
    this.stancePressed = null;
    return s;
  }
}
