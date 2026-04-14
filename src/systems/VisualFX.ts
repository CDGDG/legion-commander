import { Container, Graphics, ColorMatrixFilter, NoiseFilter } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';

/**
 * Cinematic visual effects stack.
 *  - World layer gets bloom + color grading
 *  - UI overlay gets vignette + film grain
 *  - Exposes helpers for zoom/slowmo/screen flash/chromatic
 */
export class VisualFX {
  private worldContainer: Container;
  private stage: Container;
  private bloom: AdvancedBloomFilter;
  private colorGrade: ColorMatrixFilter;
  private noise: NoiseFilter;

  // Overlays
  private vignette: Graphics;

  // State
  private targetZoom = 1.0;
  private currentZoom = 1.0;
  private screenW: number;
  private screenH: number;

  // Slowmo
  private slowMoFactor = 1.0;
  private slowMoTimer = 0;

  constructor(stage: Container, world: Container, screenW: number, screenH: number) {
    this.stage = stage;
    this.worldContainer = world;
    this.screenW = screenW;
    this.screenH = screenH;

    // === WORLD FILTERS (perf-tuned) ===
    // AdvancedBloomFilter is expensive at high quality/blur. Use minimum viable settings.
    this.bloom = new AdvancedBloomFilter({
      threshold: 0.65,   // only bright pixels bloom (reduce work)
      bloomScale: 0.8,
      brightness: 1.0,
      blur: 2,           // smaller blur = much cheaper
      quality: 2,        // lower quality = cheaper
    });

    this.colorGrade = new ColorMatrixFilter();
    this.applyColorGrade('cinematic');

    this.worldContainer.filters = [this.bloom as any, this.colorGrade];

    // Noise only exists for potential use; DON'T apply to stage by default (per-frame cost)
    this.noise = new NoiseFilter(0.06, Math.random());

    // === VIGNETTE OVERLAY (custom gradient via Graphics) ===
    this.vignette = this.createVignette(screenW, screenH);
    this.vignette.zIndex = 9998;
    this.vignette.eventMode = 'none';
    this.stage.addChild(this.vignette);
  }

  /** Smooth vignette that doesn't kill center visibility */
  private createVignette(w: number, h: number): Graphics {
    const g = new Graphics();
    // Four corner darkenings
    g.beginFill(0x000000, 0.55);
    g.drawRect(0, 0, w * 0.10, h);
    g.drawRect(w * 0.90, 0, w * 0.10, h);
    g.endFill();
    g.beginFill(0x000000, 0.4);
    g.drawRect(w * 0.10, 0, w * 0.80, h * 0.08);
    g.drawRect(w * 0.10, h * 0.92, w * 0.80, h * 0.08);
    g.endFill();
    // Subtle color fringe on edges (warm tint)
    g.beginFill(0x1a0a0a, 0.15);
    g.drawRect(0, 0, w * 0.04, h);
    g.drawRect(w * 0.96, 0, w * 0.04, h);
    g.endFill();
    return g;
  }

  applyColorGrade(preset: 'cinematic' | 'boss' | 'victory' | 'neutral' = 'cinematic'): void {
    this.colorGrade.reset();
    switch (preset) {
      case 'cinematic':
        // Teal-orange style: slight warm highlights, cool shadows
        this.colorGrade.contrast(0.15, false);
        this.colorGrade.saturate(0.15, true);
        this.colorGrade.brightness(1.02, true);
        break;
      case 'boss':
        // Desaturated with red tint
        this.colorGrade.desaturate();
        this.colorGrade.contrast(0.2, true);
        this.colorGrade.tint(0xff8866, true);
        break;
      case 'victory':
        this.colorGrade.saturate(0.3, false);
        this.colorGrade.brightness(1.1, true);
        break;
      case 'neutral':
        // identity
        break;
    }
  }

  /** Set zoom target — smoothly interpolated in update() */
  setZoom(scale: number, duration = 0.25): void {
    this.targetZoom = scale;
    this._zoomDuration = duration;
  }
  private _zoomDuration = 0.25;

  /** Trigger slow-motion for given duration */
  triggerSlowMo(factor: number, duration: number): void {
    this.slowMoFactor = factor;
    this.slowMoTimer = duration;
  }

  /** Returns current time-scale multiplier for the game update */
  getTimeScale(dt: number): number {
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.slowMoFactor = 1.0;
      }
    }
    return this.slowMoFactor;
  }

  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
    this.stage.removeChild(this.vignette);
    this.vignette.destroy();
    this.vignette = this.createVignette(w, h);
    this.vignette.zIndex = 9998;
    this.vignette.eventMode = 'none';
    this.stage.addChild(this.vignette);
  }

  update(dt: number): void {
    // Smooth zoom interpolation
    if (Math.abs(this.currentZoom - this.targetZoom) > 0.001) {
      const t = Math.min(1, dt * 8);
      this.currentZoom += (this.targetZoom - this.currentZoom) * t;
      this.worldContainer.scale.set(this.currentZoom);
    }
    // Noise seed NOT refreshed every frame (perf). Only when noise is active on stage.
  }

  /** Pulse bloom intensity briefly (e.g., on special attack hit) */
  pulseBloom(intensity: number, duration: number): void {
    const originalScale = this.bloom.bloomScale;
    this.bloom.bloomScale = intensity;
    setTimeout(() => {
      this.bloom.bloomScale = originalScale;
    }, duration * 1000);
  }

  /** Toggle expensive filters off if FPS is low. Call from a perf monitor. */
  setLowQuality(low: boolean): void {
    if (low) {
      this.worldContainer.filters = [this.colorGrade];
    } else {
      this.worldContainer.filters = [this.bloom as any, this.colorGrade];
    }
  }
}
