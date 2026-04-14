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

    // Bloom disabled — kept instantiated only so pulseBloom() calls don't crash
    this.worldContainer.filters = [this.colorGrade];

    // Noise only exists for potential use; DON'T apply to stage by default (per-frame cost)
    this.noise = new NoiseFilter(0.06, Math.random());

    // Vignette removed — map fills the screen edge to edge.
    this.vignette = new Graphics(); // kept as no-op to satisfy field init / destroy() call
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
    // Vignette removed — nothing to redraw
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

  /** Toggle expensive filters off if FPS is low. (Bloom permanently disabled per design.) */
  setLowQuality(_low: boolean): void {
    this.worldContainer.filters = [this.colorGrade];
  }
}
