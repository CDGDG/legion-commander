import { Container } from 'pixi.js';
import { lerp } from '../utils/math';

export class Camera {
  container: Container;
  x = 0;
  y = 0;
  /** Zoom level — smaller shows more of the world. Target set externally, lerped here. */
  zoom = 1;
  private targetZoom = 1;
  private screenW: number;
  private screenH: number;
  private shakeAmount = 0;
  private shakeDuration = 0;

  constructor(container: Container, screenW: number, screenH: number) {
    this.container = container;
    this.screenW = screenW;
    this.screenH = screenH;
  }

  /** Set desired zoom. Eased toward this each frame. 1 = default, 0.6 = zoomed out for mobile. */
  setZoomTarget(z: number): void {
    this.targetZoom = z;
  }
  /** Skip zoom easing — snap current to target. Useful after resize at game start. */
  snapZoom(): void {
    this.zoom = this.targetZoom;
  }

  follow(targetX: number, targetY: number, dt: number): void {
    this.x = lerp(this.x, targetX, Math.min(1, dt * 5));
    this.y = lerp(this.y, targetY, Math.min(1, dt * 5));
  }

  shake(amount: number, duration: number): void {
    this.shakeAmount = amount;
    this.shakeDuration = duration;
  }

  update(dt: number): void {
    let offsetX = 0, offsetY = 0;
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      offsetX = (Math.random() - 0.5) * this.shakeAmount * 2;
      offsetY = (Math.random() - 0.5) * this.shakeAmount * 2;
    }
    // Ease zoom toward target
    this.zoom = lerp(this.zoom, this.targetZoom, Math.min(1, dt * 4));
    this.container.scale.set(this.zoom);
    // Center: world position multiplied by zoom, then centered on screen
    this.container.x = this.screenW / 2 - this.x * this.zoom + offsetX;
    this.container.y = this.screenH / 2 - this.y * this.zoom + offsetY;
  }

  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.container.x) / this.zoom,
      y: (sy - this.container.y) / this.zoom,
    };
  }
}
