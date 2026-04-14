import { Application } from 'pixi.js';
import { Game } from './core/Game';

async function main() {
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
