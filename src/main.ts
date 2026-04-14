import { Application } from 'pixi.js';
import { Game } from './core/Game';
import { waitForFontsReady } from './utils/Fonts';

// Register Service Worker (PWA) — only in production to avoid caching HMR
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

/**
 * Request landscape orientation on mobile (works in fullscreen / PWA modes).
 * Manifest's "orientation: landscape" handles installed PWA; this is the runtime hint
 * for browsers that support the Screen Orientation API.
 */
function tryLockLandscape() {
  try {
    const so = (screen as any).orientation;
    if (so && typeof so.lock === 'function') {
      // Only works when page is in fullscreen on some browsers; catch silently if not.
      so.lock('landscape').catch(() => {});
    }
  } catch { /* ignore */ }
}

/** Unlock Web Audio on first user gesture (iOS Safari requirement). */
function setupAudioUnlock() {
  const unlock = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      // brief silent buffer to fully unlock
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start(0);
    } catch { /* ignore */ }
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('mousedown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('touchstart', unlock, { once: true, passive: false });
  window.addEventListener('mousedown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

async function main() {
  setupAudioUnlock();
  tryLockLandscape();
  // Wait for web fonts to load so initial render isn't garbled on Windows
  await waitForFontsReady();

  const app = new Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x08080f,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.body.appendChild(app.view as HTMLCanvasElement);

  const game = new Game(app);
  (window as any).__game__ = game;

  // Use pixi ticker but also ensure it runs via interval fallback
  let lastTime = performance.now();

  function tick() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    try {
      game.update(dt);
    } catch (e) {
      console.error('Game loop error:', e);
    }
  }

  // Primary: rAF
  function loop() {
    tick();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Fallback: interval for background tabs
  setInterval(() => {
    const now = performance.now();
    // Only tick if rAF hasn't run recently (> 100ms gap)
    if (now - lastTime > 100) {
      tick();
    }
  }, 50);
}

main().catch(console.error);
