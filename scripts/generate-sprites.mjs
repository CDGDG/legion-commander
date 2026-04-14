import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('public/sprites');
fs.mkdirSync(OUT, { recursive: true });

const PX = 4; // Each "pixel" is 4x4 real pixels for 128x128 (32 logical pixels * 4 = 128)
const FRAME_SIZE = 128;

/** Draw a single pixel on canvas context (scaled) */
function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, PX, PX);
}

/** Fill a rect of pixels (scaled) */
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

/** Create a spritesheet with multiple frames in a row (128x128 each by default) */
function createSheet(frameCount, logicalW = 32, logicalH = 32) {
  const canvas = createCanvas(logicalW * PX * frameCount, logicalH * PX);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// =============================================================
// COLOR PALETTES
// =============================================================
const PAL = {
  // Skin
  skin: '#FFD5A8', skinDark: '#D4A574', skinLight: '#FFE8CC',
  // Gold armor (player)
  goldLight: '#FFD700', gold: '#DAA520', goldDark: '#B8860B', goldDeep: '#8B6914',
  // Blue armor (swordsman)
  blueLight: '#6699FF', blue: '#3366CC', blueDark: '#1A3A7A',
  // Teal (spearman)
  tealLight: '#44CCCC', teal: '#228888', tealDark: '#115555',
  // Green (archer)
  greenLight: '#66CC66', green: '#338833', greenDark: '#1A4A1A',
  // Purple (mage)
  purpleLight: '#AA66FF', purple: '#7733CC', purpleDark: '#4A1199',
  // Yellow/white (priest)
  holyLight: '#FFEE88', holy: '#DDCC77', holyDark: '#AA9944',
  // Red (enemy)
  redLight: '#FF6644', red: '#CC3333', redDark: '#882222',
  // Enemy skin
  goblin: '#88AA77', goblinDark: '#668855',
  // Orange (charger)
  orange: '#DD7722', orangeDark: '#AA5500',
  // Boss purple
  bossLight: '#AA44FF', boss: '#660066', bossDark: '#440044',
  // Metals
  steel: '#CCCCCC', steelDark: '#888888', steelDeep: '#555555',
  iron: '#AAAAAA', ironDark: '#666666',
  wood: '#8B6914', woodDark: '#5A3A0A',
  // Other
  white: '#FFFFFF', black: '#000000', outline: '#222222',
  cape: '#CC2233', capeD: '#881122',
  hair: '#553311',
};

// =============================================================
// PLAYER — Gold Knight (4 dirs × 3 states: idle, walk, attack)
// =============================================================
function drawPlayerFrame(ctx, ox, oy, dir, state) {
  // (outline reference removed)
  // dir: 0=down, 1=up, 2=left, 3=right
  // state: 0=idle, 1=walk, 2=attack

  const facing = dir === 0 ? 'down' : dir === 1 ? 'up' : dir === 2 ? 'left' : 'right';
  const atk = state === 2;
  const walk = state === 1;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse((ox + 16) * PX, (oy + 30) * PX, 8 * PX, 3 * PX, 0, 0, Math.PI * 2);
  ctx.fill();

  // === LEGS ===
  const legOff = walk ? 2 : 0;
  rect(ctx, ox + 10, oy + 22, 4, 6, PAL.goldDark);
  rect(ctx, ox + 18, oy + 22, 4, 6, PAL.goldDark);
  // Boots
  rect(ctx, ox + 10, oy + 26, 4, 3, PAL.goldDeep);
  rect(ctx, ox + 18, oy + 26, 4, 3, PAL.goldDeep);

  // === CAPE (behind body) ===
  if (facing !== 'up') {
    rect(ctx, ox + 9, oy + 12, 14, 14, PAL.cape);
    rect(ctx, ox + 10, oy + 14, 12, 12, PAL.capeD);
  }

  // === BODY ARMOR ===
  rect(ctx, ox + 9, oy + 12, 14, 11, PAL.gold);
  rect(ctx, ox + 10, oy + 13, 12, 9, PAL.goldLight);
  // Armor detail
  rect(ctx, ox + 14, oy + 14, 4, 7, PAL.gold);
  // Belt
  rect(ctx, ox + 9, oy + 21, 14, 2, PAL.goldDeep);
  rect(ctx, ox + 15, oy + 21, 2, 2, PAL.goldLight);

  // === HEAD ===
  if (facing === 'up') {
    // Back of helmet
    rect(ctx, ox + 11, oy + 4, 10, 9, PAL.gold);
    rect(ctx, ox + 12, oy + 5, 8, 7, PAL.goldDark);
    // Crest
    rect(ctx, ox + 15, oy + 1, 2, 5, PAL.cape);
  } else {
    // Face
    rect(ctx, ox + 11, oy + 5, 10, 8, PAL.skin);
    // Helmet
    rect(ctx, ox + 10, oy + 2, 12, 5, PAL.gold);
    rect(ctx, ox + 11, oy + 3, 10, 3, PAL.goldLight);
    // Visor
    rect(ctx, ox + 12, oy + 7, 8, 2, PAL.outline);
    // Eyes
    px(ctx, ox + 13, oy + 8, '#44CCFF');
    px(ctx, ox + 18, oy + 8, '#44CCFF');
    // Crest
    rect(ctx, ox + 15, oy + 0, 2, 4, PAL.cape);
  }

  // === SHOULDER PADS ===
  rect(ctx, ox + 7, oy + 12, 4, 4, PAL.goldDark);
  rect(ctx, ox + 21, oy + 12, 4, 4, PAL.goldDark);

  // === WEAPON ===
  if (facing === 'left' || facing === 'right') {
    const sx = facing === 'right' ? ox + 24 : ox + 4;
    const shx = facing === 'right' ? ox + 2 : ox + 22;
    if (atk) {
      // Sword extended
      rect(ctx, sx, oy + 4, 3, 18, PAL.steel);
      rect(ctx, sx, oy + 4, 3, 2, PAL.white);
      rect(ctx, sx - 1, oy + 14, 5, 2, PAL.goldLight); // guard
      rect(ctx, sx, oy + 16, 3, 4, PAL.woodDark); // grip
    } else {
      rect(ctx, sx, oy + 8, 3, 14, PAL.steel);
      rect(ctx, sx - 1, oy + 14, 5, 2, PAL.goldLight);
    }
    // Shield
    rect(ctx, shx, oy + 10, 5, 10, PAL.blue);
    rect(ctx, shx + 1, oy + 11, 3, 8, PAL.blueLight);
    px(ctx, shx + 2, oy + 15, PAL.goldLight);
  } else {
    // Front/back - sword right side
    const swordX = ox + 24;
    if (atk) {
      rect(ctx, swordX, oy + 2, 3, 20, PAL.steel);
      rect(ctx, swordX, oy + 2, 3, 2, PAL.white);
      rect(ctx, swordX - 1, oy + 14, 5, 2, PAL.goldLight);
    } else {
      rect(ctx, swordX, oy + 8, 3, 14, PAL.steel);
      rect(ctx, swordX - 1, oy + 14, 5, 2, PAL.goldLight);
    }
    // Shield left side
    rect(ctx, ox + 3, oy + 10, 5, 10, PAL.blue);
    rect(ctx, ox + 4, oy + 11, 3, 8, PAL.blueLight);
    px(ctx, ox + 5, oy + 15, PAL.goldLight);
  }
}

function generatePlayer() {
  const FRAMES = 12; // 4 dirs × 3 states
  const { canvas, ctx } = createSheet(FRAMES, 32, 32);
  let f = 0;
  for (let dir = 0; dir < 4; dir++) {
    for (let state = 0; state < 3; state++) {
      drawPlayerFrame(ctx, f * 32, 0, dir, state); // ox/oy are in logical pixels
      f++;
    }
  }
  fs.writeFileSync(path.join(OUT, 'player.png'), canvas.toBuffer('image/png'));
  console.log('Generated player.png (12 frames)');
}

// =============================================================
// SOLDIER TYPES — 4 dirs × 2 states each
// =============================================================
function drawSoldiersSheet(name, bodyColor, bodyLight, bodyDark, headgear, weaponFn) {
  const FRAMES = 8;
  const { canvas, ctx } = createSheet(FRAMES, 32, 32);
  let f = 0;
  for (let dir = 0; dir < 4; dir++) {
    for (let state = 0; state < 2; state++) {
      const ox = f * 32, oy = 0;
      const facing = dir === 0 ? 'down' : dir === 1 ? 'up' : dir === 2 ? 'left' : 'right';
      const atk = state === 1;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse((ox + 16) * PX, (oy + 29) * PX, 7 * PX, 3 * PX, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      rect(ctx, ox + 11, oy + 22, 3, 5, bodyDark);
      rect(ctx, ox + 18, oy + 22, 3, 5, bodyDark);

      // Body
      rect(ctx, ox + 10, oy + 13, 12, 10, bodyColor);
      rect(ctx, ox + 11, oy + 14, 10, 8, bodyLight);
      rect(ctx, ox + 14, oy + 15, 4, 6, bodyColor);

      // Head
      if (facing === 'up') {
        rect(ctx, ox + 12, oy + 6, 8, 8, bodyColor);
      } else {
        rect(ctx, ox + 12, oy + 6, 8, 8, PAL.skin);
        // Eyes
        px(ctx, ox + 13, oy + 9, PAL.outline);
        px(ctx, ox + 18, oy + 9, PAL.outline);
      }

      // Headgear
      headgear(ctx, ox, oy, facing, bodyColor, bodyLight);

      // Weapon
      weaponFn(ctx, ox, oy, facing, atk);

      f++;
    }
  }
  fs.writeFileSync(path.join(OUT, `${name}.png`), canvas.toBuffer('image/png'));
  console.log(`Generated ${name}.png (8 frames)`);
}

// --- SWORDSMAN ---
function swordsmanHead(ctx, ox, oy, facing, bc, bl) {
  rect(ctx, ox + 11, oy + 3, 10, 5, bc);
  rect(ctx, ox + 12, oy + 4, 8, 3, bl);
}
function swordsmanWeapon(ctx, ox, oy, facing, atk) {
  const right = facing === 'right' || facing === 'down';
  const wx = right ? ox + 23 : ox + 5;
  const shx = right ? ox + 3 : ox + 22;
  if (atk) {
    rect(ctx, wx, oy + 4, 2, 16, PAL.steel);
    rect(ctx, wx, oy + 4, 2, 2, PAL.white);
  } else {
    rect(ctx, wx, oy + 9, 2, 12, PAL.steel);
  }
  rect(ctx, wx - 1, oy + 13, 4, 2, PAL.goldLight);
  rect(ctx, shx, oy + 11, 5, 9, PAL.blueLight);
  px(ctx, shx + 2, oy + 15, PAL.goldLight);
}

// --- SPEARMAN ---
function spearmanHead(ctx, ox, oy, facing, bc, bl) {
  rect(ctx, ox + 11, oy + 3, 10, 5, bc);
  rect(ctx, ox + 12, oy + 4, 8, 3, bl);
  // Visor line
  rect(ctx, ox + 12, oy + 7, 8, 1, PAL.outline);
}
function spearmanWeapon(ctx, ox, oy, facing, atk) {
  const right = facing === 'right' || facing === 'down';
  const sx = right ? ox + 24 : ox + 6;
  const tipY = atk ? oy + 0 : oy + 4;
  rect(ctx, sx, tipY, 2, 24, PAL.wood);
  // Spear tip
  rect(ctx, sx - 1, tipY - 3, 4, 4, PAL.steel);
  px(ctx, sx, tipY - 4, PAL.white);
}

// --- ARCHER ---
function archerHead(ctx, ox, oy, facing, bc, bl) {
  // Hood
  ctx.fillStyle = PAL.greenDark;
  // Simple triangle hood
  rect(ctx, ox + 11, oy + 3, 10, 4, PAL.green);
  rect(ctx, ox + 14, oy + 0, 4, 4, PAL.greenDark);
  px(ctx, ox + 15, oy + 0, PAL.green);
  px(ctx, ox + 16, oy + 0, PAL.green);
}
function archerWeapon(ctx, ox, oy, facing, atk) {
  const right = facing === 'right' || facing === 'down';
  const bx = right ? ox + 3 : ox + 24;
  // Bow
  rect(ctx, bx, oy + 8, 2, 14, PAL.wood);
  rect(ctx, bx, oy + 7, 2, 1, PAL.woodDark);
  rect(ctx, bx, oy + 22, 2, 1, PAL.woodDark);
  // String
  px(ctx, bx + 1, oy + 9, PAL.steelDark);
  px(ctx, bx + 1, oy + 20, PAL.steelDark);
  // Quiver (back)
  const qx = right ? ox + 22 : ox + 5;
  rect(ctx, qx, oy + 8, 3, 10, PAL.woodDark);
  if (atk) {
    // Arrow
    const ax = right ? bx + 3 : bx - 8;
    rect(ctx, right ? bx + 2 : bx - 6, oy + 14, 8, 1, PAL.steel);
    px(ctx, right ? bx + 10 : bx - 7, oy + 14, PAL.white);
  }
}

// --- MAGE ---
function mageHead(ctx, ox, oy, facing, bc, bl) {
  // Wizard hat
  rect(ctx, ox + 10, oy + 5, 12, 2, PAL.purpleDark);
  rect(ctx, ox + 12, oy + 2, 8, 4, PAL.purple);
  rect(ctx, ox + 14, oy + 0, 4, 3, PAL.purpleLight);
  px(ctx, ox + 15, oy + 0, PAL.holyLight); // star
}
function mageWeapon(ctx, ox, oy, facing, atk) {
  const right = facing === 'right' || facing === 'down';
  const sx = right ? ox + 24 : ox + 5;
  rect(ctx, sx, oy + 4, 2, 22, PAL.wood);
  // Orb
  const orbColor = atk ? '#88FFFF' : '#44DDFF';
  rect(ctx, sx - 1, oy + 2, 4, 4, orbColor);
  if (atk) {
    px(ctx, sx, oy + 1, PAL.white);
    rect(ctx, sx - 2, oy + 1, 6, 6, 'rgba(68,221,255,0.3)');
  }
}

// --- PRIEST ---
function priestHead(ctx, ox, oy, facing, bc, bl) {
  // Hood/mitre
  rect(ctx, ox + 11, oy + 3, 10, 4, PAL.holyLight);
  rect(ctx, ox + 13, oy + 1, 6, 3, PAL.holy);
}
function priestWeapon(ctx, ox, oy, facing, atk) {
  // Holy book + cross staff
  const right = facing === 'right' || facing === 'down';
  const sx = right ? ox + 24 : ox + 4;
  // Staff
  rect(ctx, sx, oy + 6, 2, 18, PAL.goldDark);
  // Cross top
  rect(ctx, sx - 1, oy + 4, 4, 2, PAL.goldLight);
  rect(ctx, sx, oy + 2, 2, 4, PAL.goldLight);
  // Book other hand
  const bx = right ? ox + 3 : ox + 23;
  rect(ctx, bx, oy + 13, 4, 5, PAL.woodDark);
  rect(ctx, bx + 1, oy + 14, 2, 3, PAL.goldLight);
  if (atk) {
    // Heal glow
    ctx.fillStyle = 'rgba(255,215,0,0.2)';
    ctx.beginPath();
    ctx.ellipse((ox + 16) * PX, (oy + 16) * PX, 12 * PX, 10 * PX, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// =============================================================
// ENEMIES
// =============================================================
function drawEnemySheet(name, bodyColor, bodyDark, skinColor, skinDark, headFn, weaponFn, isRound) {
  const FRAMES = 8;
  const { canvas, ctx } = createSheet(FRAMES, 32, 32);
  let f = 0;
  for (let dir = 0; dir < 4; dir++) {
    for (let state = 0; state < 2; state++) {
      const ox = f * 32, oy = 0;
      const facing = dir === 0 ? 'down' : dir === 1 ? 'up' : dir === 2 ? 'left' : 'right';
      const atk = state === 1;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse((ox + 16) * PX, (oy + 29) * PX, 7 * PX, 3 * PX, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isRound) {
        // Round body (bomber)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc((ox + 16) * PX, (oy + 17) * PX, 9 * PX, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Legs
        rect(ctx, ox + 11, oy + 22, 3, 5, bodyDark);
        rect(ctx, ox + 18, oy + 22, 3, 5, bodyDark);
        // Body
        rect(ctx, ox + 10, oy + 13, 12, 10, bodyColor);
        rect(ctx, ox + 11, oy + 14, 10, 8, bodyDark);
      }

      // Head
      if (!isRound) {
        if (facing === 'up') {
          rect(ctx, ox + 12, oy + 6, 8, 8, skinDark);
        } else {
          rect(ctx, ox + 12, oy + 6, 8, 8, skinColor);
          // Red eyes
          px(ctx, ox + 13, oy + 9, '#FF2222');
          px(ctx, ox + 18, oy + 9, '#FF2222');
        }
      }

      headFn(ctx, ox, oy, facing);
      weaponFn(ctx, ox, oy, facing, atk);

      f++;
    }
  }
  fs.writeFileSync(path.join(OUT, `${name}.png`), canvas.toBuffer('image/png'));
  console.log(`Generated ${name}.png (8 frames)`);
}

// Grunt
function gruntHead(ctx, ox, oy, facing) {
  // Simple helm
  rect(ctx, ox + 11, oy + 4, 10, 3, PAL.redDark);
}
function gruntWeapon(ctx, ox, oy, facing, atk) {
  const right = facing === 'right' || facing === 'down';
  const wx = right ? ox + 23 : ox + 5;
  const ty = atk ? oy + 4 : oy + 8;
  rect(ctx, wx, ty, 3, 14, PAL.wood);
  rect(ctx, wx - 1, ty, 5, 3, PAL.woodDark);
}

// Charger
function chargerHead(ctx, ox, oy, facing) {
  // Horns
  rect(ctx, ox + 10, oy + 2, 3, 5, '#CCCCAA');
  rect(ctx, ox + 19, oy + 2, 3, 5, '#CCCCAA');
  px(ctx, ox + 10, oy + 1, '#CCCCAA');
  px(ctx, ox + 21, oy + 1, '#CCCCAA');
}
function chargerWeapon(ctx, ox, oy, facing, atk) {
  // No weapon, charges with horns
}

// Boss
function generateBoss() {
  const FRAMES = 8;
  const { canvas, ctx } = createSheet(FRAMES, 48, 48); // 48 logical = 192px real
  let f = 0;
  for (let dir = 0; dir < 4; dir++) {
    for (let state = 0; state < 2; state++) {
      const ox = f * 48, oy = 0; // logical pixels
      const facing = dir === 0 ? 'down' : dir === 1 ? 'up' : dir === 2 ? 'left' : 'right';
      const atk = state === 1;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse((ox + 24) * PX, (oy + 44) * PX, 14 * PX, 5 * PX, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cape
      rect(ctx, ox + 12, oy + 18, 24, 22, PAL.bossDark);

      // Legs
      rect(ctx, ox + 14, oy + 34, 6, 8, PAL.bossDark);
      rect(ctx, ox + 28, oy + 34, 6, 8, PAL.bossDark);

      // Body - large armor
      rect(ctx, ox + 12, oy + 16, 24, 18, PAL.boss);
      rect(ctx, ox + 14, oy + 18, 20, 14, '#550055');

      // Shoulder pads
      rect(ctx, ox + 7, oy + 16, 8, 6, PAL.boss);
      rect(ctx, ox + 33, oy + 16, 8, 6, PAL.boss);
      // Spikes
      rect(ctx, ox + 8, oy + 12, 2, 5, PAL.steel);
      rect(ctx, ox + 38, oy + 12, 2, 5, PAL.steel);

      // Head
      if (facing === 'up') {
        rect(ctx, ox + 16, oy + 6, 16, 12, PAL.goblinDark);
      } else {
        rect(ctx, ox + 16, oy + 6, 16, 12, PAL.goblin);
        // Eyes
        rect(ctx, ox + 18, oy + 10, 3, 3, '#FF0000');
        rect(ctx, ox + 27, oy + 10, 3, 3, '#FF0000');
        px(ctx, ox + 19, oy + 11, '#FF8800');
        px(ctx, ox + 28, oy + 11, '#FF8800');
      }

      // Crown
      rect(ctx, ox + 15, oy + 2, 18, 5, PAL.goldLight);
      rect(ctx, ox + 17, oy + 0, 2, 4, PAL.goldLight);
      rect(ctx, ox + 23, oy + 0, 2, 4, PAL.goldLight);
      rect(ctx, ox + 29, oy + 0, 2, 4, PAL.goldLight);
      px(ctx, ox + 23, oy + 0, '#FF0044'); // jewel

      // Giant axe
      const ax = facing === 'left' ? ox + 0 : ox + 38;
      if (atk) {
        rect(ctx, ax, oy + 4, 4, 34, PAL.ironDark);
        // Axe blade
        rect(ctx, ax + 3, oy + 4, 8, 12, PAL.steelDark);
        rect(ctx, ax + 4, oy + 5, 6, 10, PAL.steel);
      } else {
        rect(ctx, ax, oy + 10, 4, 28, PAL.ironDark);
        rect(ctx, ax + 3, oy + 8, 8, 12, PAL.steelDark);
        rect(ctx, ax + 4, oy + 9, 6, 10, PAL.steel);
      }

      f++;
    }
  }
  fs.writeFileSync(path.join(OUT, 'boss.png'), canvas.toBuffer('image/png'));
  console.log('Generated boss.png (8 frames, 48x48)');
}

// Bomber (round body)
function bomberHead(ctx, ox, oy, facing) {
  // Fuse
  rect(ctx, ox + 15, oy + 5, 2, 5, PAL.wood);
  px(ctx, ox + 15, oy + 4, '#FFFF00');
  px(ctx, ox + 16, oy + 4, '#FF8800');
  // Skull face
  if (facing !== 'up') {
    px(ctx, ox + 13, oy + 16, PAL.white);
    px(ctx, ox + 19, oy + 16, PAL.white);
    px(ctx, ox + 13, oy + 17, PAL.black);
    px(ctx, ox + 19, oy + 17, PAL.black);
    rect(ctx, ox + 14, oy + 20, 4, 1, PAL.black);
  }
}
function bomberWeapon(ctx, ox, oy, facing, atk) {}

// Shielder
function shielderHead(ctx, ox, oy, facing) {
  rect(ctx, ox + 11, oy + 4, 10, 3, PAL.steelDark);
}
function shielderWeapon(ctx, ox, oy, facing, atk) {
  // Big shield on left
  const right = facing === 'right' || facing === 'down';
  const sx = right ? ox + 2 : ox + 22;
  rect(ctx, sx, oy + 8, 7, 16, PAL.steelDark);
  rect(ctx, sx + 1, oy + 9, 5, 14, PAL.iron);
  px(ctx, sx + 3, oy + 15, PAL.steelDeep);
}

// Sniper
function sniperHead(ctx, ox, oy, facing) {
  // Hood
  rect(ctx, ox + 11, oy + 3, 10, 4, '#553355');
  rect(ctx, ox + 13, oy + 1, 6, 3, '#663366');
  if (facing !== 'up') {
    // Glowing eye
    px(ctx, ox + 15, oy + 9, '#FF00FF');
    px(ctx, ox + 16, oy + 9, '#FF00FF');
  }
}
function sniperWeapon(ctx, ox, oy, facing, atk) {
  const right = facing === 'right' || facing === 'down';
  const cx = right ? ox + 22 : ox + 4;
  rect(ctx, cx, oy + 14, 8, 2, PAL.wood);
  rect(ctx, cx + 6, oy + 10, 2, 8, PAL.woodDark);
}

// =============================================================
// GENERATE ALL
// =============================================================
generatePlayer();
drawSoldiersSheet('swordsman', PAL.blue, PAL.blueLight, PAL.blueDark, swordsmanHead, swordsmanWeapon);
drawSoldiersSheet('spearman', PAL.teal, PAL.tealLight, PAL.tealDark, spearmanHead, spearmanWeapon);
drawSoldiersSheet('archer', PAL.green, PAL.greenLight, PAL.greenDark, archerHead, archerWeapon);
drawSoldiersSheet('mage', PAL.purple, PAL.purpleLight, PAL.purpleDark, mageHead, mageWeapon);
drawSoldiersSheet('priest', PAL.holy, PAL.holyLight, PAL.holyDark, priestHead, priestWeapon);
drawEnemySheet('grunt', PAL.red, PAL.redDark, PAL.goblin, PAL.goblinDark, gruntHead, gruntWeapon, false);
drawEnemySheet('charger', PAL.orange, PAL.orangeDark, PAL.goblin, PAL.goblinDark, chargerHead, chargerWeapon, false);
drawEnemySheet('sniper', '#663366', '#553355', PAL.goblin, PAL.goblinDark, sniperHead, sniperWeapon, false);
drawEnemySheet('shielder', PAL.steelDark, PAL.steelDeep, PAL.goblin, PAL.goblinDark, shielderHead, shielderWeapon, false);
drawEnemySheet('bomber', '#AA2200', '#881800', PAL.goblin, PAL.goblinDark, bomberHead, bomberWeapon, true);
generateBoss();

console.log('\n✅ All sprite sheets generated in public/sprites/');
