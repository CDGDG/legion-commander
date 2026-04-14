interface ExternalProvider {
  getMovement: () => { x: number; y: number } | null;
  isAttackHeld: () => boolean;
  consumeDash: () => boolean;
  consumeStance: () => number | null;
  isEnabled: () => boolean;
}

export class Input {
  private keys = new Set<string>();
  private mouseDown = false;
  private rightMouseDown = false;
  private spaceWasDown = false;
  mouseX = 0;
  mouseY = 0;

  // Touch input bridge
  private external: ExternalProvider | null = null;
  // True for one frame after spacebar transitions from up→down (edge-triggered dash)
  private dashEdge = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' && !this.keys.has(' ')) this.dashEdge = true;
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setExternalProvider(p: ExternalProvider): void {
    this.external = p;
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isMouseDown(): boolean {
    if (this.mouseDown) return true;
    if (this.external?.isEnabled() && this.external.isAttackHeld()) return true;
    return false;
  }

  isRightMouseDown(): boolean {
    return this.rightMouseDown;
  }

  /** Edge-triggered dash for both keyboard (space) and touch. Consumes the edge. */
  consumeDashTrigger(): boolean {
    let triggered = this.dashEdge;
    this.dashEdge = false;
    if (this.external?.isEnabled() && this.external.consumeDash()) triggered = true;
    return triggered;
  }

  /**
   * Stance slot key from keyboard (Q/W/E = slots 0/1/2) OR touch button.
   * Returns slot index 0–2, or null. Edge-triggered via touch.
   * Note: keyboard is held-state (not edge); Game layer dedupes by checking active stance.
   */
  getStanceKey(): number | null {
    // Q/W/E correspond to slot 0/1/2. Korean dual-keys: ㅂ/ㅈ/ㄷ
    if (this.isKeyDown('q') || this.isKeyDown('ㅂ')) return 0;
    if (this.isKeyDown('w') || this.isKeyDown('ㅈ')) return 1;
    if (this.isKeyDown('e') || this.isKeyDown('ㄷ')) return 2;
    if (this.external?.isEnabled()) {
      const s = this.external.consumeStance();
      if (s !== null) return s;
    }
    return null;
  }

  getMovementVector(): { x: number; y: number } {
    // Touch joystick takes priority if active
    if (this.external?.isEnabled()) {
      const t = this.external.getMovement();
      if (t && (t.x !== 0 || t.y !== 0)) return t;
    }
    // Arrow keys only — WASD removed (W/A/S/D now reserved for stance keys & misc)
    let mx = 0, my = 0;
    if (this.isKeyDown('arrowup')) my -= 1;
    if (this.isKeyDown('arrowdown')) my += 1;
    if (this.isKeyDown('arrowleft')) mx -= 1;
    if (this.isKeyDown('arrowright')) mx += 1;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) { mx /= len; my /= len; }
    return { x: mx, y: my };
  }
}
