export class Input {
  private keys = new Set<string>();
  private mouseDown = false;
  private rightMouseDown = false;
  mouseX = 0;
  mouseY = 0;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
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

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  isRightMouseDown(): boolean {
    return this.rightMouseDown;
  }

  getStanceKey(): number | null {
    if (this.isKeyDown('1')) return 1;
    if (this.isKeyDown('2')) return 2;
    if (this.isKeyDown('3')) return 3;
    if (this.isKeyDown('4')) return 4;
    if (this.isKeyDown('5')) return 5;
    return null;
  }

  getMovementVector(): { x: number; y: number } {
    let mx = 0, my = 0;
    if (this.isKeyDown('w') || this.isKeyDown('ㅈ') || this.isKeyDown('arrowup')) my -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('ㄴ') || this.isKeyDown('arrowdown')) my += 1;
    if (this.isKeyDown('a') || this.isKeyDown('ㅁ') || this.isKeyDown('arrowleft')) mx -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('ㅇ') || this.isKeyDown('arrowright')) mx += 1;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) { mx /= len; my /= len; }
    return { x: mx, y: my };
  }
}
