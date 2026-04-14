import { Container } from 'pixi.js';
import { lerp } from '../utils/math';

export class Camera {
  container: Container;
  x = 0;
  y = 0;
  private screenW: number;
  private screenH: number;
  private shakeAmount = 0;
  private shakeDuration = 0;

  constructor(container: Container, screenW: number, screenH: number) {
    this.container = container;
    this.screenW = screenW;
    this.screenH = screenH;
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
    this.container.x = this.screenW / 2 - this.x + offsetX;
    this.container.y = this.screenH / 2 - this.y + offsetY;
  }

  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: sx - this.container.x,
      y: sy - this.container.y,
    };
  }
}
