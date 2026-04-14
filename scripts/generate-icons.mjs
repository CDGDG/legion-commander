import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('public/icons');
fs.mkdirSync(OUT, { recursive: true });

/**
 * Draw app icon: gold shield with crossed swords on dark background.
 * 'safe': true → draws inside a safe zone (for maskable icon).
 */
function drawIcon(size, opts = { safe: false }) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background (dark purple-black gradient feel via two rects)
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, size, size);
  // Radial-ish glow via concentric alpha circles
  const cx = size / 2, cy = size / 2;
  for (let r = size * 0.5; r > size * 0.1; r -= 8) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(60, 30, 80, ${0.04 + (size * 0.5 - r) / size * 0.3})`;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Safe zone (80% for maskable)
  const scale = opts.safe ? 0.65 : 0.8;
  const s = size * scale;
  const ox = (size - s) / 2;
  const oy = (size - s) / 2;

  ctx.save();
  ctx.translate(ox, oy);

  // Shield shape
  ctx.beginPath();
  ctx.moveTo(s * 0.5, 0);
  ctx.lineTo(s * 0.92, s * 0.15);
  ctx.lineTo(s * 0.92, s * 0.55);
  ctx.quadraticCurveTo(s * 0.92, s * 0.85, s * 0.5, s);
  ctx.quadraticCurveTo(s * 0.08, s * 0.85, s * 0.08, s * 0.55);
  ctx.lineTo(s * 0.08, s * 0.15);
  ctx.closePath();

  // Gold gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, '#FFE066');
  grad.addColorStop(0.5, '#FFC933');
  grad.addColorStop(1, '#B88820');
  ctx.fillStyle = grad;
  ctx.fill();

  // Shield outline
  ctx.lineWidth = s * 0.035;
  ctx.strokeStyle = '#5A3A00';
  ctx.stroke();

  // Inner shine
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.08);
  ctx.lineTo(s * 0.85, s * 0.2);
  ctx.lineTo(s * 0.85, s * 0.45);
  ctx.quadraticCurveTo(s * 0.85, s * 0.7, s * 0.5, s * 0.9);
  ctx.quadraticCurveTo(s * 0.15, s * 0.7, s * 0.15, s * 0.45);
  ctx.lineTo(s * 0.15, s * 0.2);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 230, 150, 0.5)';
  ctx.lineWidth = s * 0.015;
  ctx.stroke();

  // Crossed swords
  ctx.save();
  ctx.translate(s * 0.5, s * 0.55);

  // First sword (↖ to ↘)
  ctx.save();
  ctx.rotate(-Math.PI / 4);
  drawSword(ctx, s);
  ctx.restore();

  // Second sword (↗ to ↙)
  ctx.save();
  ctx.rotate(Math.PI / 4);
  drawSword(ctx, s);
  ctx.restore();

  ctx.restore();

  // Crown on top
  ctx.fillStyle = '#FFE066';
  ctx.strokeStyle = '#5A3A00';
  ctx.lineWidth = s * 0.015;
  const cw = s * 0.42;
  const ch = s * 0.1;
  const ctx_cx = s * 0.5;
  const ctx_cy = s * 0.2;
  ctx.beginPath();
  ctx.moveTo(ctx_cx - cw / 2, ctx_cy + ch);
  ctx.lineTo(ctx_cx - cw / 2, ctx_cy);
  ctx.lineTo(ctx_cx - cw / 4, ctx_cy + ch * 0.4);
  ctx.lineTo(ctx_cx - cw / 6, ctx_cy - ch * 0.4);
  ctx.lineTo(ctx_cx, ctx_cy + ch * 0.4);
  ctx.lineTo(ctx_cx + cw / 6, ctx_cy - ch * 0.4);
  ctx.lineTo(ctx_cx + cw / 4, ctx_cy + ch * 0.4);
  ctx.lineTo(ctx_cx + cw / 2, ctx_cy);
  ctx.lineTo(ctx_cx + cw / 2, ctx_cy + ch);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Crown gem
  ctx.fillStyle = '#CC0044';
  ctx.beginPath();
  ctx.arc(ctx_cx, ctx_cy + ch * 0.6, s * 0.025, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return canvas;
}

function drawSword(ctx, s) {
  const bladeLen = s * 0.5;
  const bladeW = s * 0.06;
  // Blade
  ctx.fillStyle = '#CCCCDD';
  ctx.fillRect(-bladeW / 2, -bladeLen / 2, bladeW, bladeLen * 0.8);
  // Blade tip
  ctx.beginPath();
  ctx.moveTo(-bladeW / 2, -bladeLen / 2);
  ctx.lineTo(bladeW / 2, -bladeLen / 2);
  ctx.lineTo(0, -bladeLen / 2 - bladeW);
  ctx.closePath();
  ctx.fill();
  // Edge highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-bladeW / 2, -bladeLen / 2, bladeW * 0.3, bladeLen * 0.8);
  // Guard
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(-bladeW * 2, bladeLen / 2 - bladeW * 0.5, bladeW * 4, bladeW);
  // Grip
  ctx.fillStyle = '#4A2A0A';
  ctx.fillRect(-bladeW / 2, bladeLen / 2, bladeW, bladeLen * 0.25);
  // Pommel
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(0, bladeLen / 2 + bladeLen * 0.28, bladeW, 0, Math.PI * 2);
  ctx.fill();
}

// ==================== GENERATE ====================
const sizes = [192, 512];
for (const size of sizes) {
  const c = drawIcon(size, { safe: false });
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), c.toBuffer('image/png'));
  console.log(`✓ icon-${size}.png`);
}

// Maskable (safe zone version) — Android adaptive icons crop 20% around edges
const maskable = drawIcon(512, { safe: true });
fs.writeFileSync(path.join(OUT, `icon-maskable-512.png`), maskable.toBuffer('image/png'));
console.log(`✓ icon-maskable-512.png`);

// iOS apple-touch-icon (180 is Apple's preferred size)
const apple = drawIcon(180, { safe: false });
fs.writeFileSync(path.join(OUT, `apple-touch-icon.png`), apple.toBuffer('image/png'));
console.log(`✓ apple-touch-icon.png`);

// Favicon
const fav = drawIcon(64, { safe: false });
fs.writeFileSync(path.join(OUT, `favicon.png`), fav.toBuffer('image/png'));
console.log(`✓ favicon.png`);

console.log('\n✅ All icons generated');
