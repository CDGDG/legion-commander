import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('public/sprites');
fs.mkdirSync(OUT, { recursive: true });

// Each frame is LOGICAL × LOGICAL pixels, scaled by PX for output crispness.
const LOGICAL = 40;
const PX = 4;            // 4× nearest-neighbor scale → 160px per frame on disk
const FRAME_PX = LOGICAL * PX;

// Frames per direction: 0=idle, 1=walk-A, 2=walk-B, 3=attack
// Directions per character: 0=down, 1=up, 2=left, 3=right
// Total: 16 frames per character, laid out horizontally
const STATES = 4;
const DIRS = 4;
const FRAMES = STATES * DIRS;

function px(ctx, x, y, color) { ctx.fillStyle = color; ctx.fillRect(x * PX, y * PX, PX, PX); }
function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x * PX, y * PX, w * PX, h * PX); }
function ellipseShadow(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx * PX, cy * PX, rx * PX, ry * PX, 0, 0, Math.PI * 2);
  ctx.fill();
}

function createSheet(framesCount, fw = LOGICAL, fh = LOGICAL) {
  const canvas = createCanvas(fw * PX * framesCount, fh * PX);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// =============================================================
// PALETTE
// =============================================================
const C = {
  // Skin
  skin: '#FFD5A8', skinD: '#C49770', skinL: '#FFE9CC',
  // Player gold armor
  goldL: '#FFE066', gold: '#DAA520', goldD: '#A87A18', goldDD: '#5C4308',
  // Cape (player)
  cape: '#CC2233', capeD: '#7A0F1A',
  // Blue armor (swordsman)
  blueL: '#7AAEFF', blue: '#3366CC', blueD: '#1B3A78',
  // Teal (spearman)
  tealL: '#5DD3D3', teal: '#1F8B8B', tealD: '#0F4D4D',
  // Green (archer)
  grnL: '#7ACC7A', grn: '#2E7E2E', grnD: '#0F4810',
  // Purple (mage)
  purL: '#B47AEA', pur: '#7A2BC4', purD: '#3F0E78',
  // Holy (priest)
  holyL: '#FFEEA6', holy: '#D8B748', holyD: '#8C7320',
  // Red enemy
  redL: '#FF8866', red: '#C8362E', redD: '#741010',
  // Goblin skin (enemies)
  gob: '#88AA77', gobD: '#5A7A4D', gobL: '#A8C896',
  // Orange (charger)
  orgL: '#FFAA66', org: '#C8651A', orgD: '#7A360A',
  // Boss purple
  bossL: '#C44CFF', boss: '#5A1A7E', bossD: '#280840',
  // Metals
  steel: '#D2D6DA', steelD: '#82888E', steelDD: '#3D4248',
  iron: '#A8AAAE', ironD: '#5C5E62',
  wood: '#8B6914', woodD: '#4F3A0A',
  // Other
  white: '#FFFFFF', black: '#1A1A1F', dark: '#0A0A12',
  shadow: 'rgba(0,0,0,0.32)',
};

// =============================================================
// HELPERS — anatomy primitives
// =============================================================

// Body torso (10×11 box centered). Adds a 1-pixel right-side shade for depth.
function torso(ctx, ox, oy, base, light, shade) {
  rect(ctx, ox + 14, oy + 18, 12, 11, base);
  rect(ctx, ox + 15, oy + 19, 8, 3, light);              // top highlight
  rect(ctx, ox + 24, oy + 18, 2, 11, shade);             // right shade
  rect(ctx, ox + 14, oy + 28, 12, 1, shade);             // bottom edge
}

// Head 6×6 with hairline shade
function head(ctx, ox, oy, skin, skinD, eyes = true, faceDir = 'front') {
  rect(ctx, ox + 16, oy + 9, 8, 8, skin);
  // Cheek shade
  rect(ctx, ox + 22, oy + 11, 2, 5, skinD);
  if (eyes && faceDir !== 'back') {
    px(ctx, ox + 18, oy + 13, C.dark);
    px(ctx, ox + 21, oy + 13, C.dark);
  }
}

// Shoulder pads (small bumps)
function shoulders(ctx, ox, oy, color, lightColor) {
  rect(ctx, ox + 12, oy + 18, 3, 3, color);
  rect(ctx, ox + 25, oy + 18, 3, 3, color);
  rect(ctx, ox + 12, oy + 18, 1, 2, lightColor);
}

// Legs with walk-cycle offset (frame: 0=idle, 1=walk-A, 2=walk-B)
function legs(ctx, ox, oy, dark, base, frame) {
  let lL = 0, rL = 0;       // leg vertical offset
  let lX = 15, rX = 21;     // base x positions
  if (frame === 1) { lL = -1; rL = 1; lX = 14; rX = 22; }   // walk A
  else if (frame === 2) { lL = 1; rL = -1; lX = 16; rX = 20; } // walk B
  rect(ctx, ox + lX, oy + 29 + lL, 3, 6 - lL, dark);
  rect(ctx, ox + rX, oy + 29 + rL, 3, 6 - rL, dark);
  // Boots
  rect(ctx, ox + lX, oy + 33, 3, 2, base);
  rect(ctx, ox + rX, oy + 33, 3, 2, base);
}

// Cape (always behind). For up-facing, omit (it shows on back differently)
function cape(ctx, ox, oy, color, dark) {
  rect(ctx, ox + 13, oy + 21, 14, 9, color);
  rect(ctx, ox + 14, oy + 22, 12, 7, dark);
}

function shadow(ctx, ox, oy) {
  ellipseShadow(ctx, ox + 20, oy + 36, 6.5, 1.8, C.shadow);
}

// =============================================================
// PLAYER (gold knight)
// =============================================================
function drawPlayer(ctx, ox, oy, dir, state) {
  shadow(ctx, ox, oy);

  const isBack = dir === 1;
  const isLeft = dir === 2;
  const isRight = dir === 3;
  const flipX = isLeft;

  // Cape (behind body) — visible from down/side
  if (!isBack) cape(ctx, ox, oy, C.cape, C.capeD);

  // Walk-frame leg offset for state 1/2; attack uses idle legs
  legs(ctx, ox, oy, C.goldDD, C.gold, state >= 3 ? 0 : state);

  torso(ctx, ox, oy, C.gold, C.goldL, C.goldD);

  // Belt
  rect(ctx, ox + 14, oy + 27, 12, 2, C.goldDD);
  rect(ctx, ox + 19, oy + 27, 2, 2, C.goldL);

  // Shoulder pads
  shoulders(ctx, ox, oy, C.goldD, C.goldL);

  // Head
  head(ctx, ox, oy, C.skin, C.skinD, true, isBack ? 'back' : 'front');

  // Helmet (with visor on front/sides)
  rect(ctx, ox + 14, oy + 6, 12, 6, C.gold);
  rect(ctx, ox + 15, oy + 7, 10, 2, C.goldL);    // top shine
  if (!isBack) {
    rect(ctx, ox + 16, oy + 12, 8, 2, C.dark);   // visor slot
    px(ctx, ox + 18, oy + 13, '#66CCFF');
    px(ctx, ox + 21, oy + 13, '#66CCFF');
  }
  // Crest
  rect(ctx, ox + 19, oy + 2, 2, 5, C.cape);

  // Weapon (sword) — only visible from sides
  // Front/back: keep sword on right of body
  const swingOffset = state === 3 ? 4 : 0;
  if (isLeft) {
    // mirrored: sword on player's left of screen (their right hand) → ox + 4
    rect(ctx, ox + 6 - swingOffset, oy + 14, 2, 14, C.steel);
    rect(ctx, ox + 6 - swingOffset, oy + 14, 2, 2, C.white);   // tip
    rect(ctx, ox + 5 - swingOffset, oy + 22, 4, 2, C.goldL);   // guard
    rect(ctx, ox + 6 - swingOffset, oy + 24, 2, 4, C.woodD);   // grip
  } else if (isRight) {
    rect(ctx, ox + 32 + swingOffset, oy + 14, 2, 14, C.steel);
    rect(ctx, ox + 32 + swingOffset, oy + 14, 2, 2, C.white);
    rect(ctx, ox + 31 + swingOffset, oy + 22, 4, 2, C.goldL);
    rect(ctx, ox + 32 + swingOffset, oy + 24, 2, 4, C.woodD);
  } else if (!isBack) {
    // Down: sword right
    rect(ctx, ox + 31, oy + 14 - swingOffset, 2, 14, C.steel);
    rect(ctx, ox + 31, oy + 14 - swingOffset, 2, 2, C.white);
    rect(ctx, ox + 30, oy + 22 - swingOffset, 4, 2, C.goldL);
  } else {
    // Up (back facing): scabbard line on back
    rect(ctx, ox + 19, oy + 18, 2, 8, C.steelDD);
  }

  // Shield (opposite hand) — only visible front/sides
  if (!isBack) {
    const shx = isLeft ? ox + 30 : ox + 8;
    rect(ctx, shx, oy + 18, 4, 9, C.blue);
    rect(ctx, shx, oy + 18, 4, 2, C.blueL);
    rect(ctx, shx + 1, oy + 22, 2, 1, C.goldL);   // boss (shield emblem)
  }
}

// =============================================================
// SOLDIER BASE — used by all 5 soldier types via headgear/weapon callbacks
// =============================================================
function drawSoldier(ctx, ox, oy, dir, state, opts) {
  shadow(ctx, ox, oy);

  const isBack = dir === 1;
  const isLeft = dir === 2;
  const isRight = dir === 3;

  // Optional cape
  if (opts.cape && !isBack) cape(ctx, ox, oy, opts.cape, opts.capeD || opts.cape);

  legs(ctx, ox, oy, opts.legDark, opts.body, state >= 3 ? 0 : state);
  torso(ctx, ox, oy, opts.body, opts.bodyLight, opts.bodyDark);
  shoulders(ctx, ox, oy, opts.bodyDark, opts.bodyLight);

  head(ctx, ox, oy, C.skin, C.skinD, true, isBack ? 'back' : 'front');

  if (opts.headgear) opts.headgear(ctx, ox, oy, dir, isBack);

  if (opts.weapon) opts.weapon(ctx, ox, oy, dir, state === 3, isLeft, isRight, isBack);
}

// === SWORDSMAN ===
const swordsmanOpts = {
  body: C.blue, bodyLight: C.blueL, bodyDark: C.blueD, legDark: C.blueD,
  cape: '#22386A', capeD: '#101D3A',
  headgear: (ctx, ox, oy) => {
    rect(ctx, ox + 14, oy + 7, 12, 5, C.blue);
    rect(ctx, ox + 15, oy + 8, 10, 2, C.blueL);
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    const off = atk ? 3 : 0;
    if (isLeft) {
      rect(ctx, ox + 6 - off, oy + 16, 2, 12, C.steel);
      rect(ctx, ox + 5 - off, oy + 22, 4, 2, C.goldL);
    } else if (isRight) {
      rect(ctx, ox + 32 + off, oy + 16, 2, 12, C.steel);
      rect(ctx, ox + 31 + off, oy + 22, 4, 2, C.goldL);
    } else if (!isBack) {
      rect(ctx, ox + 31, oy + 16 - off, 2, 12, C.steel);
      rect(ctx, ox + 30, oy + 22 - off, 4, 2, C.goldL);
    }
    // Shield opposite
    if (!isBack) {
      const shx = isLeft ? ox + 30 : ox + 8;
      rect(ctx, shx, oy + 19, 4, 8, C.blueL);
    }
  },
};

// === SPEARMAN ===
const spearmanOpts = {
  body: C.teal, bodyLight: C.tealL, bodyDark: C.tealD, legDark: C.tealD,
  headgear: (ctx, ox, oy) => {
    rect(ctx, ox + 14, oy + 7, 12, 5, C.teal);
    rect(ctx, ox + 15, oy + 8, 10, 2, C.tealL);
    rect(ctx, ox + 17, oy + 12, 6, 1, C.dark);  // visor line
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    const len = atk ? 24 : 18;
    const top = atk ? oy + 4 : oy + 8;
    if (isLeft) {
      rect(ctx, ox + 5, top, 2, len, C.wood);
      rect(ctx, ox + 4, top - 2, 4, 3, C.steel);  // spearhead
    } else if (isRight) {
      rect(ctx, ox + 33, top, 2, len, C.wood);
      rect(ctx, ox + 32, top - 2, 4, 3, C.steel);
    } else if (!isBack) {
      rect(ctx, ox + 31, top, 2, len, C.wood);
      rect(ctx, ox + 30, top - 2, 4, 3, C.steel);
      px(ctx, ox + 31, top - 3, C.white);
    } else {
      rect(ctx, ox + 19, oy + 4, 2, 22, C.wood);
    }
  },
};

// === ARCHER ===
const archerOpts = {
  body: C.grn, bodyLight: C.grnL, bodyDark: C.grnD, legDark: C.grnD,
  headgear: (ctx, ox, oy, dir, isBack) => {
    // Hood
    rect(ctx, ox + 14, oy + 6, 12, 6, C.grn);
    rect(ctx, ox + 15, oy + 7, 10, 2, C.grnL);
    if (!isBack) rect(ctx, ox + 16, oy + 12, 8, 1, C.grnD); // hood brim shade
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    // Bow on opposite side of quiver
    if (isLeft) {
      // bow on right
      rect(ctx, ox + 33, oy + 16, 2, 10, C.wood);
      px(ctx, ox + 34, oy + 14, C.woodD);
      px(ctx, ox + 34, oy + 27, C.woodD);
      // quiver on left
      rect(ctx, ox + 5, oy + 18, 3, 8, C.woodD);
      px(ctx, ox + 5, oy + 17, C.steel);
      px(ctx, ox + 7, oy + 17, C.steel);
    } else if (isRight) {
      rect(ctx, ox + 5, oy + 16, 2, 10, C.wood);
      px(ctx, ox + 4, oy + 14, C.woodD);
      px(ctx, ox + 4, oy + 27, C.woodD);
      rect(ctx, ox + 32, oy + 18, 3, 8, C.woodD);
      px(ctx, ox + 32, oy + 17, C.steel);
      px(ctx, ox + 34, oy + 17, C.steel);
    } else if (!isBack) {
      rect(ctx, ox + 32, oy + 18, 2, 10, C.wood);
      rect(ctx, ox + 6, oy + 18, 3, 8, C.woodD);
    }
    if (atk && !isBack) {
      // Drawn bowstring/arrow tip
      const ax = isLeft ? ox + 24 : ox + 16;
      rect(ctx, ax, oy + 21, 6, 1, C.steel);
    }
  },
};

// === MAGE ===
const mageOpts = {
  body: C.pur, bodyLight: C.purL, bodyDark: C.purD, legDark: C.purD,
  headgear: (ctx, ox, oy) => {
    // Wizard hat
    rect(ctx, ox + 14, oy + 7, 12, 2, C.purD);
    rect(ctx, ox + 16, oy + 4, 8, 4, C.pur);
    rect(ctx, ox + 18, oy + 1, 4, 4, C.purL);
    px(ctx, ox + 19, oy + 1, C.holyL);  // star
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    if (isLeft) {
      rect(ctx, ox + 5, oy + 4, 2, 22, C.wood);
      rect(ctx, ox + 4, oy + 2, 4, 4, atk ? '#88FFFF' : '#44CCFF');
    } else if (isRight) {
      rect(ctx, ox + 33, oy + 4, 2, 22, C.wood);
      rect(ctx, ox + 32, oy + 2, 4, 4, atk ? '#88FFFF' : '#44CCFF');
    } else if (!isBack) {
      rect(ctx, ox + 31, oy + 4, 2, 22, C.wood);
      rect(ctx, ox + 30, oy + 2, 4, 4, atk ? '#88FFFF' : '#44CCFF');
      if (atk) {
        px(ctx, ox + 31, oy + 1, C.white);
        px(ctx, ox + 28, oy + 4, '#AAEEFF');
      }
    }
  },
};

// === PRIEST ===
const priestOpts = {
  body: C.holy, bodyLight: C.holyL, bodyDark: C.holyD, legDark: C.holyD,
  headgear: (ctx, ox, oy) => {
    // Mitre / hood
    rect(ctx, ox + 14, oy + 6, 12, 5, C.holyL);
    rect(ctx, ox + 17, oy + 3, 6, 4, C.holy);
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    // Staff with cross
    if (isLeft) {
      rect(ctx, ox + 5, oy + 6, 2, 22, C.goldD);
      rect(ctx, ox + 4, oy + 3, 4, 2, C.goldL);
      rect(ctx, ox + 5, oy + 1, 2, 4, C.goldL);
    } else if (isRight) {
      rect(ctx, ox + 33, oy + 6, 2, 22, C.goldD);
      rect(ctx, ox + 32, oy + 3, 4, 2, C.goldL);
      rect(ctx, ox + 33, oy + 1, 2, 4, C.goldL);
    } else if (!isBack) {
      rect(ctx, ox + 31, oy + 6, 2, 22, C.goldD);
      rect(ctx, ox + 30, oy + 3, 4, 2, C.goldL);
      rect(ctx, ox + 31, oy + 1, 2, 4, C.goldL);
    }
    if (atk) {
      // Heal aura
      ctx.fillStyle = 'rgba(255,215,0,0.18)';
      ctx.beginPath();
      ctx.arc((ox + 20) * PX, (oy + 18) * PX, 14 * PX, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

// =============================================================
// ENEMY BASE
// =============================================================
function drawEnemy(ctx, ox, oy, dir, state, opts) {
  shadow(ctx, ox, oy);

  const isBack = dir === 1;

  legs(ctx, ox, oy, opts.legDark, opts.body, state >= 3 ? 0 : state);
  torso(ctx, ox, oy, opts.body, opts.bodyLight, opts.bodyDark);

  // Goblin head with red eyes
  rect(ctx, ox + 16, oy + 9, 8, 8, isBack ? C.gobD : C.gob);
  rect(ctx, ox + 22, oy + 11, 2, 5, C.gobD);
  if (!isBack) {
    px(ctx, ox + 18, oy + 13, '#FF2222');
    px(ctx, ox + 21, oy + 13, '#FF2222');
  }

  if (opts.headgear) opts.headgear(ctx, ox, oy, dir, isBack);
  if (opts.weapon) opts.weapon(ctx, ox, oy, dir, state === 3, dir === 2, dir === 3, isBack);
}

const gruntOpts = {
  body: C.red, bodyLight: C.redL, bodyDark: C.redD, legDark: C.redD,
  headgear: (ctx, ox, oy) => {
    rect(ctx, ox + 14, oy + 7, 12, 4, C.redD);
    rect(ctx, ox + 15, oy + 8, 10, 1, C.red);
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    const off = atk ? 3 : 0;
    if (isLeft) {
      rect(ctx, ox + 5 - off, oy + 14, 3, 14, C.wood);
      rect(ctx, ox + 4 - off, oy + 13, 5, 3, C.woodD);
    } else if (isRight) {
      rect(ctx, ox + 32 + off, oy + 14, 3, 14, C.wood);
      rect(ctx, ox + 31 + off, oy + 13, 5, 3, C.woodD);
    } else if (!isBack) {
      rect(ctx, ox + 30, oy + 14 - off, 3, 14, C.wood);
      rect(ctx, ox + 29, oy + 13 - off, 5, 3, C.woodD);
    }
  },
};

const chargerOpts = {
  body: C.org, bodyLight: C.orgL, bodyDark: C.orgD, legDark: C.orgD,
  headgear: (ctx, ox, oy) => {
    // Horns
    px(ctx, ox + 13, oy + 6, '#CCCCAA');
    px(ctx, ox + 13, oy + 7, '#CCCCAA');
    px(ctx, ox + 12, oy + 5, '#CCCCAA');
    px(ctx, ox + 26, oy + 6, '#CCCCAA');
    px(ctx, ox + 26, oy + 7, '#CCCCAA');
    px(ctx, ox + 27, oy + 5, '#CCCCAA');
  },
  weapon: () => {},
};

const sniperOpts = {
  body: C.boss, bodyLight: C.bossL, bodyDark: C.bossD, legDark: C.bossD,
  headgear: (ctx, ox, oy) => {
    rect(ctx, ox + 14, oy + 6, 12, 5, C.bossD);
    rect(ctx, ox + 17, oy + 3, 6, 4, C.boss);
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    // Crossbow
    if (isLeft) rect(ctx, ox + 4, oy + 19, 8, 2, C.wood);
    else if (isRight) rect(ctx, ox + 28, oy + 19, 8, 2, C.wood);
    else if (!isBack) rect(ctx, ox + 28, oy + 19, 8, 2, C.wood);
  },
};

const shielderOpts = {
  body: C.steelD, bodyLight: C.iron, bodyDark: C.steelDD, legDark: C.steelDD,
  headgear: (ctx, ox, oy) => {
    rect(ctx, ox + 14, oy + 7, 12, 4, C.steelDD);
  },
  weapon: (ctx, ox, oy, dir, atk, isLeft, isRight, isBack) => {
    // Big shield on left
    const sx = isRight ? ox + 26 : ox + 4;
    rect(ctx, sx, oy + 14, 9, 16, C.steelDD);
    rect(ctx, sx + 1, oy + 15, 7, 14, C.iron);
    px(ctx, sx + 4, oy + 21, C.steelDD);
  },
};

function drawBomber(ctx, ox, oy, dir, state) {
  shadow(ctx, ox, oy);
  // Round bomb body
  ctx.fillStyle = '#A82200';
  ctx.beginPath();
  ctx.arc((ox + 20) * PX, (oy + 22) * PX, 9 * PX, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7A1500';
  ctx.beginPath();
  ctx.arc((ox + 22) * PX, (oy + 24) * PX, 5 * PX, 0, Math.PI * 2);
  ctx.fill();
  // Fuse
  rect(ctx, ox + 19, oy + 10, 2, 4, C.wood);
  if (state === 3 || (Math.random() > 0.6)) {
    px(ctx, ox + 19, oy + 8, '#FFFF44');
    px(ctx, ox + 20, oy + 8, '#FF8800');
  }
  if (dir !== 1) {
    // Skull face
    px(ctx, ox + 17, oy + 20, C.white);
    px(ctx, ox + 22, oy + 20, C.white);
    px(ctx, ox + 17, oy + 21, C.dark);
    px(ctx, ox + 22, oy + 21, C.dark);
    rect(ctx, ox + 18, oy + 24, 4, 1, C.dark);
  }
}

// =============================================================
// BOSS — bigger sheet (60×60)
// =============================================================
function drawBoss(ctx, ox, oy, dir, state) {
  ellipseShadow(ctx, ox + 30, oy + 54, 12, 3, C.shadow);

  const isBack = dir === 1;

  // Cape
  rect(ctx, ox + 16, oy + 26, 28, 22, C.bossD);
  rect(ctx, ox + 18, oy + 28, 24, 18, C.boss);

  // Legs (with walk offset)
  const wf = state >= 3 ? 0 : state;
  const lL = wf === 1 ? -1 : (wf === 2 ? 1 : 0);
  const rL = wf === 1 ? 1 : (wf === 2 ? -1 : 0);
  rect(ctx, ox + 20, oy + 46 + lL, 5, 8 - lL, '#220022');
  rect(ctx, ox + 35, oy + 46 + rL, 5, 8 - rL, '#220022');

  // Body (huge)
  rect(ctx, ox + 18, oy + 22, 24, 20, C.boss);
  rect(ctx, ox + 20, oy + 24, 20, 4, C.bossL);
  rect(ctx, ox + 38, oy + 22, 4, 20, C.bossD);

  // Shoulder spikes
  rect(ctx, ox + 14, oy + 22, 6, 6, C.boss);
  rect(ctx, ox + 40, oy + 22, 6, 6, C.boss);
  rect(ctx, ox + 13, oy + 16, 3, 6, C.steel);
  rect(ctx, ox + 44, oy + 16, 3, 6, C.steel);

  // Head
  rect(ctx, ox + 22, oy + 10, 16, 12, isBack ? C.gobD : C.gob);
  rect(ctx, ox + 34, oy + 14, 4, 6, C.gobD);
  if (!isBack) {
    rect(ctx, ox + 25, oy + 14, 3, 3, '#FF0000');
    rect(ctx, ox + 32, oy + 14, 3, 3, '#FF0000');
    px(ctx, ox + 26, oy + 15, '#FF8800');
    px(ctx, ox + 33, oy + 15, '#FF8800');
  }

  // Crown
  rect(ctx, ox + 20, oy + 6, 20, 4, C.goldL);
  rect(ctx, ox + 22, oy + 2, 2, 4, C.goldL);
  rect(ctx, ox + 29, oy + 0, 2, 6, C.goldL);
  rect(ctx, ox + 36, oy + 2, 2, 4, C.goldL);
  px(ctx, ox + 30, oy + 4, '#FF0044');

  // Giant axe
  const ax = state === 3 ? ox + 48 : ox + 46;
  rect(ctx, ax, oy + 6, 4, 38, C.ironD);
  rect(ctx, ax + 3, oy + 6, 8, 14, C.steelD);
  rect(ctx, ax + 4, oy + 7, 6, 12, C.steel);
}

// =============================================================
// GENERATE
// =============================================================
function genCharSheet(name, drawFn, fw = LOGICAL, fh = LOGICAL) {
  const { canvas, ctx } = createSheet(FRAMES, fw, fh);
  let f = 0;
  for (let dir = 0; dir < DIRS; dir++) {
    for (let state = 0; state < STATES; state++) {
      drawFn(ctx, f * fw, 0, dir, state);
      f++;
    }
  }
  fs.writeFileSync(path.join(OUT, `${name}.png`), canvas.toBuffer('image/png'));
  console.log(`✓ ${name}.png  (${FRAMES} frames, ${fw}×${fh} logical, ${fw * PX * FRAMES}×${fh * PX} px)`);
}

genCharSheet('player',    drawPlayer);
genCharSheet('swordsman', (ctx, ox, oy, dir, state) => drawSoldier(ctx, ox, oy, dir, state, swordsmanOpts));
genCharSheet('spearman',  (ctx, ox, oy, dir, state) => drawSoldier(ctx, ox, oy, dir, state, spearmanOpts));
genCharSheet('archer',    (ctx, ox, oy, dir, state) => drawSoldier(ctx, ox, oy, dir, state, archerOpts));
genCharSheet('mage',      (ctx, ox, oy, dir, state) => drawSoldier(ctx, ox, oy, dir, state, mageOpts));
genCharSheet('priest',    (ctx, ox, oy, dir, state) => drawSoldier(ctx, ox, oy, dir, state, priestOpts));
genCharSheet('grunt',     (ctx, ox, oy, dir, state) => drawEnemy(ctx, ox, oy, dir, state, gruntOpts));
genCharSheet('charger',   (ctx, ox, oy, dir, state) => drawEnemy(ctx, ox, oy, dir, state, chargerOpts));
genCharSheet('sniper',    (ctx, ox, oy, dir, state) => drawEnemy(ctx, ox, oy, dir, state, sniperOpts));
genCharSheet('shielder',  (ctx, ox, oy, dir, state) => drawEnemy(ctx, ox, oy, dir, state, shielderOpts));
genCharSheet('bomber',    (ctx, ox, oy, dir, state) => drawBomber(ctx, ox, oy, dir, state));
genCharSheet('boss',      drawBoss, 60, 60);

console.log('\n✅ All sprite sheets generated (4 dirs × 4 states each)');
