import { Graphics } from 'pixi.js';

const S = 1.6;

export type FacingDir = 'down' | 'up' | 'left' | 'right';

function noLine(g: Graphics) { g.lineStyle(0); }

// ==================== PLAYER ====================

export function drawPlayer(g: Graphics, dir: FacingDir = 'down', attacking = false): void {
  g.clear();
  const s = S * 1.1;

  // Ground ring
  g.beginFill(0x44aaff, 0.12);
  g.drawEllipse(0, 10 * s, 12 * s, 5 * s);
  g.endFill();

  const isBack = dir === 'up';
  const isSide = dir === 'left' || dir === 'right';
  const flip = dir === 'left' ? -1 : 1;

  // Cape (behind)
  if (!isBack) {
    g.beginFill(0xaa2233, 0.6);
    g.drawPolygon([-5 * s, 0, 5 * s, 0, 4 * s, 12 * s, -4 * s, 12 * s]);
    g.endFill();
  }

  // Legs
  const legSpread = attacking ? 2 : 0;
  g.beginFill(0x7a5c1e);
  g.drawRect((-5 - legSpread) * s, 5 * s, 4 * s, 7 * s);
  g.drawRect((1 + legSpread) * s, 5 * s, 4 * s, 7 * s);
  g.endFill();

  // Body
  g.lineStyle(1, 0x8a6010, 0.5);
  g.beginFill(isBack ? 0xb08020 : 0xc89020);
  g.drawRoundedRect(-7 * s, -5 * s, 14 * s, 12 * s, 3 * s);
  g.endFill();
  noLine(g);

  // Armor detail
  if (!isBack) {
    g.beginFill(0xdaa530, 0.3);
    g.drawRoundedRect(-5 * s, -4 * s, 4 * s, 8 * s, 2);
    g.endFill();
    // Belt
    g.beginFill(0x5a3a10);
    g.drawRect(-7 * s, 4 * s, 14 * s, 2 * s);
    g.endFill();
    g.beginFill(0xffd700);
    g.drawRect(-1 * s, 3.5 * s, 2 * s, 3 * s);
    g.endFill();
  }
  if (isBack) {
    // Cape on back
    g.beginFill(0xaa2233, 0.8);
    g.drawRoundedRect(-6 * s, -4 * s, 12 * s, 16 * s, 2);
    g.endFill();
  }

  // Head
  g.beginFill(0xffe0bd);
  g.drawCircle(0, -9 * s, 5 * s);
  g.endFill();

  // Helmet
  g.lineStyle(1, 0x8a6a10, 0.4);
  g.beginFill(0xdaa520);
  g.drawRoundedRect(-6 * s, -15 * s, 12 * s, 8 * s, 2 * s);
  g.endFill();
  noLine(g);

  // Face / visor
  if (!isBack) {
    g.beginFill(0x1a1a1a, 0.4);
    g.drawRect(-4 * s, -10 * s, 8 * s, 2 * s);
    g.endFill();
    g.beginFill(0x44ccff);
    g.drawRect(-3 * s, -10 * s, 2, 1.5);
    g.drawRect(1 * s, -10 * s, 2, 1.5);
    g.endFill();
  }

  // Crest
  g.beginFill(0xcc2222);
  g.drawRect(-1 * s, -18 * s, 2 * s, 6 * s);
  g.endFill();

  // Weapon
  if (isSide) {
    const wx = 9 * s * flip;
    if (attacking) {
      // Sword extended forward
      g.beginFill(0xaaaaaa);
      g.drawRect(wx - 1 * s, -14 * s, 2.5 * s, 22 * s);
      g.endFill();
      g.beginFill(0xdaa520);
      g.drawRect(wx - 2 * s, -2 * s, 4 * s, 3 * s);
      g.endFill();
    } else {
      g.beginFill(0xaaaaaa);
      g.drawRect(wx, -10 * s, 2.5 * s, 16 * s);
      g.endFill();
      g.beginFill(0xdaa520);
      g.drawRect(wx - 1 * s, 0, 4 * s, 2.5 * s);
      g.endFill();
    }
    // Shield other side
    const sx = -10 * s * flip;
    g.beginFill(0x3366aa);
    g.drawRoundedRect(sx - 3 * s, -6 * s, 6 * s, 12 * s, 2 * s);
    g.endFill();
    g.beginFill(0xffd700);
    g.drawCircle(sx, 0, 2 * s);
    g.endFill();
  } else {
    // Front/back - sword right, shield left
    if (attacking) {
      g.beginFill(0xaaaaaa);
      g.drawRect(8 * s, -16 * s, 2.5 * s, 24 * s);
      g.endFill();
    } else {
      g.beginFill(0xaaaaaa);
      g.drawRect(8 * s, -10 * s, 2.5 * s, 18 * s);
      g.endFill();
    }
    g.beginFill(0xdaa520);
    g.drawRect(7 * s, 0, 4 * s, 2.5 * s);
    g.endFill();
    g.beginFill(0x3366aa);
    g.drawRoundedRect(-14 * s, -6 * s, 6 * s, 12 * s, 2 * s);
    g.endFill();
    g.beginFill(0xffd700);
    g.drawCircle(-11 * s, 0, 2 * s);
    g.endFill();
  }
}

// ==================== SOLDIERS ====================

function drawSoldierBase(g: Graphics, bodyColor: number, darkColor: number, dir: FacingDir, _atk: boolean): void {
  const s = S;
  const isBack = dir === 'up';
  // Legs
  g.beginFill(darkColor);
  g.drawRect(-4 * s, 4 * s, 3 * s, 5 * s);
  g.drawRect(1 * s, 4 * s, 3 * s, 5 * s);
  g.endFill();
  // Body
  g.lineStyle(1, darkColor, 0.5);
  g.beginFill(bodyColor);
  g.drawRoundedRect(-5 * s, -3 * s, 10 * s, 9 * s, 2 * s);
  g.endFill();
  noLine(g);
  // Head
  g.beginFill(isBack ? 0xeecaa0 : 0xffe0bd);
  g.drawCircle(0, -7 * s, 4 * s);
  g.endFill();
}

export function drawSwordsman(g: Graphics, dir: FacingDir = 'down', atk = false): void {
  g.clear();
  const s = S;
  g.beginFill(0x3366cc, 0.1);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  drawSoldierBase(g, 0x2255aa, 0x1a3a6a, dir, atk);
  // Helmet
  g.beginFill(0x3366cc);
  g.drawRoundedRect(-4 * s, -11 * s, 8 * s, 5.5 * s, 1.5 * s);
  g.endFill();
  // Sword
  const swX = dir === 'left' ? -7 * s : 6 * s;
  if (atk) {
    g.beginFill(0xcccccc);
    g.drawRect(swX, -12 * s, 2 * s, 18 * s);
    g.endFill();
  } else {
    g.beginFill(0xbbbbbb);
    g.drawRect(swX, -6 * s, 2 * s, 12 * s);
    g.endFill();
  }
  g.beginFill(0xdaa520);
  g.drawRect(swX - 1 * s, -1 * s, 4 * s, 2 * s);
  g.endFill();
  // Shield
  const shX = dir === 'left' ? 6 * s : -10 * s;
  g.beginFill(0x4488ff);
  g.drawRoundedRect(shX, -4 * s, 5 * s, 8 * s, 1.5 * s);
  g.endFill();
}

export function drawSpearman(g: Graphics, dir: FacingDir = 'down', atk = false): void {
  g.clear();
  const s = S;
  g.beginFill(0x2299aa, 0.1);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  drawSoldierBase(g, 0x1a7a7a, 0x115555, dir, atk);
  g.beginFill(0x228888);
  g.drawRoundedRect(-4 * s, -11 * s, 8 * s, 5.5 * s, 1.5 * s);
  g.endFill();
  // Spear
  const spX = dir === 'left' ? -6 * s : 5.5 * s;
  const spTop = atk ? -24 * s : -18 * s;
  g.beginFill(0x8B6914);
  g.drawRect(spX, spTop, 2 * s, 28 * s);
  g.endFill();
  g.beginFill(0xcccccc);
  g.drawPolygon([spX - 1 * s, spTop, spX + 3 * s, spTop, spX + 1 * s, spTop - 6 * s]);
  g.endFill();
}

export function drawArcher(g: Graphics, dir: FacingDir = 'down', atk = false): void {
  g.clear();
  const s = S;
  g.beginFill(0x33aa33, 0.1);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  drawSoldierBase(g, 0x2a6e2a, 0x1a4a1a, dir, atk);
  // Hood
  g.beginFill(0x336633);
  g.drawPolygon([-5 * s, -7 * s, 5 * s, -7 * s, 0, -15 * s]);
  g.endFill();
  // Bow
  const bowX = dir === 'left' ? 6 * s : -7 * s;
  g.lineStyle(2.5, 0x8B6914);
  g.arc(bowX, 0, 9 * s, -1.2, 1.2);
  g.lineStyle(1, 0xdddddd);
  g.moveTo(bowX, -8 * s); g.lineTo(bowX, 8 * s);
  noLine(g);
  // Arrow (visible when attacking)
  if (atk) {
    const arrowDir = dir === 'left' ? -1 : 1;
    g.beginFill(0xcccccc);
    g.drawRect(bowX + arrowDir * 2 * s, -1, 12 * s * arrowDir, 2);
    g.endFill();
  }
  // Quiver (back)
  const qX = dir === 'left' ? -8 * s : 6 * s;
  g.beginFill(0x5a3a1a);
  g.drawRect(qX, -10 * s, 3.5 * s, 14 * s);
  g.endFill();
}

export function drawMage(g: Graphics, dir: FacingDir = 'down', atk = false): void {
  g.clear();
  const s = S;
  g.beginFill(0x8833cc, 0.1);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  // Robe
  g.lineStyle(1, 0x3a1166, 0.4);
  g.beginFill(0x6622aa);
  g.drawRoundedRect(-6 * s, -3 * s, 12 * s, 13 * s, 2 * s);
  g.endFill();
  noLine(g);
  g.beginFill(dir === 'up' ? 0xeecaa0 : 0xffe0bd);
  g.drawCircle(0, -7 * s, 4 * s);
  g.endFill();
  // Hat
  g.beginFill(0x7733cc);
  g.drawPolygon([-6 * s, -8 * s, 6 * s, -8 * s, 1 * s, -22 * s]);
  g.endFill();
  g.beginFill(0x5522aa);
  g.drawRect(-7 * s, -9 * s, 14 * s, 2.5 * s);
  g.endFill();
  g.beginFill(0xffdd44);
  g.drawCircle(1 * s, -18 * s, 2.5 * s);
  g.endFill();
  // Staff
  const stX = dir === 'left' ? -8 * s : 7 * s;
  g.beginFill(0x8B6914);
  g.drawRect(stX, -20 * s, 2 * s, 30 * s);
  g.endFill();
  // Staff orb (glows when attacking)
  const orbColor = atk ? 0x88ffff : 0x44ddff;
  const orbR = atk ? 5 * s : 3.5 * s;
  g.beginFill(orbColor, atk ? 0.9 : 0.7);
  g.drawCircle(stX + 1 * s, -22 * s, orbR);
  g.endFill();
  if (atk) {
    g.beginFill(0xffffff, 0.4);
    g.drawCircle(stX + 1 * s, -22 * s, orbR * 0.5);
    g.endFill();
  }
}

export function drawPriest(g: Graphics, dir: FacingDir = 'down', atk = false): void {
  g.clear();
  const s = S;
  g.beginFill(0xccaa22, 0.1);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  g.lineStyle(1, 0x998820, 0.3);
  g.beginFill(0xddcc88);
  g.drawRoundedRect(-6 * s, -3 * s, 12 * s, 13 * s, 2 * s);
  g.endFill();
  noLine(g);
  g.beginFill(dir === 'up' ? 0xeecaa0 : 0xffe0bd);
  g.drawCircle(0, -7 * s, 4 * s);
  g.endFill();
  g.beginFill(0xeeeecc);
  g.drawRoundedRect(-5 * s, -12 * s, 10 * s, 6.5 * s, 2 * s);
  g.endFill();
  // Cross
  g.beginFill(0xffd700);
  g.drawRect(-1 * s, -1 * s, 2 * s, 7 * s);
  g.drawRect(-3 * s, 1 * s, 6 * s, 2 * s);
  g.endFill();
  // Halo (brighter when healing/attacking)
  const haloAlpha = atk ? 0.7 : 0.3;
  g.lineStyle(2, 0xffd700, haloAlpha);
  g.drawEllipse(0, -14 * s, 5 * s, 2 * s);
  noLine(g);
  if (atk) {
    g.beginFill(0xffd700, 0.15);
    g.drawEllipse(0, 0, 20 * s, 14 * s);
    g.endFill();
  }
  // Book
  const bkX = dir === 'left' ? 6 * s : -11 * s;
  g.beginFill(0x8B6914);
  g.drawRoundedRect(bkX, -1 * s, 5 * s, 6 * s, 1);
  g.endFill();
}

// ==================== ENEMIES ====================

export function drawGrunt(g: Graphics, elite: boolean, dir: FacingDir = 'down', atk = false): void {
  g.clear();
  const s = S * (elite ? 1.4 : 1);
  g.beginFill(0xcc3333, 0.08);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  // Legs
  g.beginFill(0x553333);
  g.drawRect(-4 * s, 4 * s, 3 * s, 5 * s);
  g.drawRect(1 * s, 4 * s, 3 * s, 5 * s);
  g.endFill();
  g.lineStyle(1, 0x661111, 0.4);
  g.beginFill(0x882222);
  g.drawRoundedRect(-5 * s, -3 * s, 10 * s, 9 * s, 2 * s);
  g.endFill();
  noLine(g);
  g.beginFill(dir === 'up' ? 0x77996a : 0x88aa77);
  g.drawCircle(0, -7 * s, 4 * s);
  g.endFill();
  if (dir !== 'up') {
    g.beginFill(0xff2222);
    g.drawRect(-3 * s, -8 * s, 2.5, 2);
    g.drawRect(1 * s, -8 * s, 2.5, 2);
    g.endFill();
  }
  // Club
  const clX = dir === 'left' ? -7 * s : 6 * s;
  const clTop = atk ? -10 * s : -6 * s;
  g.beginFill(0x5a3a1a);
  g.drawRect(clX, clTop, 3 * s, 14 * s);
  g.endFill();
  g.beginFill(0x443322);
  g.drawRect(clX - 0.5 * s, clTop - 2 * s, 4 * s, 3 * s);
  g.endFill();
  if (elite) {
    g.lineStyle(2, 0xffcc00, 0.5);
    g.drawCircle(0, 0, 14 * s);
    noLine(g);
  }
}

export function drawCharger(g: Graphics, elite: boolean, dir: FacingDir = 'down', _atk = false): void {
  g.clear();
  const s = S * (elite ? 1.3 : 1);
  g.beginFill(0xff6600, 0.08);
  g.drawEllipse(0, 6 * s, 9 * s, 3 * s);
  g.endFill();
  g.lineStyle(1, 0x773300, 0.4);
  g.beginFill(0xaa5500);
  g.drawRoundedRect(-6 * s, -2 * s, 12 * s, 8 * s, 3 * s);
  g.endFill();
  noLine(g);
  g.beginFill(0x88aa77);
  g.drawCircle(5 * s, -5 * s, 4 * s);
  g.endFill();
  g.beginFill(0xccccaa);
  g.drawPolygon([2 * s, -8 * s, 0, -15 * s, 4 * s, -9 * s]);
  g.drawPolygon([6 * s, -8 * s, 10 * s, -15 * s, 8 * s, -9 * s]);
  g.endFill();
  if (dir !== 'up') {
    g.beginFill(0xff0000);
    g.drawRect(3 * s, -6 * s, 2, 2);
    g.drawRect(6 * s, -6 * s, 2, 2);
    g.endFill();
  }
  g.beginFill(0x774400);
  g.drawRect(-4 * s, 6 * s, 3 * s, 4 * s);
  g.drawRect(2 * s, 6 * s, 3 * s, 4 * s);
  g.endFill();
  if (elite) {
    g.lineStyle(2, 0xffcc00, 0.5);
    g.drawCircle(0, 0, 14 * s);
    noLine(g);
  }
}

export function drawSniper(g: Graphics, elite: boolean, dir: FacingDir = 'down', atk = false): void {
  g.clear();
  const s = S * (elite ? 1.3 : 1);
  g.beginFill(0xcc66cc, 0.08);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  g.lineStyle(1, 0x442244, 0.4);
  g.beginFill(0x663366);
  g.drawRoundedRect(-5 * s, -3 * s, 10 * s, 12 * s, 2 * s);
  g.endFill();
  noLine(g);
  g.beginFill(0x88aa77);
  g.drawCircle(0, -7 * s, 3.5 * s);
  g.endFill();
  g.beginFill(0x553355);
  g.drawPolygon([-5 * s, -7 * s, 5 * s, -7 * s, 0, -15 * s]);
  g.endFill();
  if (dir !== 'up') {
    g.beginFill(atk ? 0xff44ff : 0xff00ff, 0.7);
    g.drawCircle(0, -7 * s, atk ? 3 : 2);
    g.endFill();
  }
  const cbX = dir === 'left' ? -7 * s : 6 * s;
  g.beginFill(0x5a3a1a);
  g.drawRect(cbX, -2 * s, 9 * s, 2 * s);
  g.endFill();
  if (elite) {
    g.lineStyle(2, 0xffcc00, 0.5);
    g.drawCircle(0, 0, 14 * s);
    noLine(g);
  }
}

export function drawShielder(g: Graphics, elite: boolean, dir: FacingDir = 'down', _atk = false): void {
  g.clear();
  const s = S * (elite ? 1.3 : 1);
  g.beginFill(0x888888, 0.08);
  g.drawEllipse(0, 8 * s, 10 * s, 3 * s);
  g.endFill();
  const shX = dir === 'right' ? 4 * s : -11 * s;
  g.lineStyle(1, 0x444444, 0.4);
  g.beginFill(0x666666);
  g.drawRoundedRect(shX, -8 * s, 10 * s, 18 * s, 3 * s);
  g.endFill();
  noLine(g);
  g.beginFill(0x888888, 0.5);
  g.drawCircle(shX + 5 * s, 1 * s, 3 * s);
  g.endFill();
  g.beginFill(0x554444);
  g.drawRoundedRect(-2 * s, -3 * s, 8 * s, 9 * s, 2 * s);
  g.endFill();
  g.beginFill(0x88aa77);
  g.drawCircle(2 * s, -7 * s, 3.5 * s);
  g.endFill();
  if (dir !== 'up') {
    g.beginFill(0xff3333);
    g.drawRect(0, -8 * s, 2, 2);
    g.drawRect(3 * s, -8 * s, 2, 2);
    g.endFill();
  }
  g.beginFill(0x443333);
  g.drawRect(-2 * s, 6 * s, 3 * s, 4 * s);
  g.drawRect(2 * s, 6 * s, 3 * s, 4 * s);
  g.endFill();
  if (elite) {
    g.lineStyle(2, 0xffcc00, 0.5);
    g.drawCircle(0, 0, 16 * s);
    noLine(g);
  }
}

export function drawBomber(g: Graphics, elite: boolean, _dir: FacingDir = 'down', _atk = false): void {
  g.clear();
  const s = S * (elite ? 1.3 : 1);
  g.beginFill(0xff3300, 0.08);
  g.drawEllipse(0, 8 * s, 8 * s, 3 * s);
  g.endFill();
  g.beginFill(0xaa2200);
  g.drawCircle(0, 0, 7 * s);
  g.endFill();
  g.beginFill(0x881800, 0.5);
  g.drawCircle(2 * s, 2 * s, 5 * s);
  g.endFill();
  g.lineStyle(2, 0x8B6914);
  g.moveTo(0, -7 * s); g.lineTo(2, -13 * s);
  noLine(g);
  g.beginFill(0xffff00);
  g.drawCircle(2, -13 * s, 2.5);
  g.endFill();
  g.beginFill(0xffffff);
  g.drawCircle(-2 * s, -1 * s, 2.5);
  g.drawCircle(2 * s, -1 * s, 2.5);
  g.endFill();
  g.beginFill(0x000000);
  g.drawCircle(-2 * s, -1 * s, 1.2);
  g.drawCircle(2 * s, -1 * s, 1.2);
  g.drawRect(-1.5 * s, 3 * s, 3 * s, 1.5);
  g.endFill();
  if (elite) {
    g.lineStyle(2, 0xffcc00, 0.5);
    g.drawCircle(0, 0, 12 * s);
    noLine(g);
  }
}

export function drawBoss(g: Graphics, level: number): void {
  g.clear();
  const s = S * 1.8;
  g.beginFill(0xff0044, 0.06);
  g.drawEllipse(0, 12 * s, 16 * s, 6 * s);
  g.endFill();
  g.beginFill(0x220022);
  g.drawRect(-8 * s, 8 * s, 6 * s, 7 * s);
  g.drawRect(2 * s, 8 * s, 6 * s, 7 * s);
  g.endFill();
  g.beginFill(0x330022, 0.7);
  g.drawPolygon([-10 * s, -3 * s, 10 * s, -3 * s, 8 * s, 14 * s, -8 * s, 14 * s]);
  g.endFill();
  g.lineStyle(1, 0x330033, 0.5);
  g.beginFill(0x440044);
  g.drawRoundedRect(-10 * s, -6 * s, 20 * s, 16 * s, 4 * s);
  g.endFill();
  noLine(g);
  g.beginFill(0x550055);
  g.drawEllipse(-11 * s, -3 * s, 6 * s, 5 * s);
  g.drawEllipse(11 * s, -3 * s, 6 * s, 5 * s);
  g.endFill();
  g.beginFill(0xcccccc);
  g.drawPolygon([-12 * s, -8 * s, -14 * s, -16 * s, -10 * s, -8 * s]);
  g.drawPolygon([12 * s, -8 * s, 14 * s, -16 * s, 10 * s, -8 * s]);
  g.endFill();
  g.beginFill(0x88aa77);
  g.drawCircle(0, -12 * s, 6 * s);
  g.endFill();
  g.beginFill(0xffd700);
  g.drawPolygon([-7 * s, -16 * s, -4 * s, -24 * s, -1 * s, -18 * s, 0, -26 * s, 1 * s, -18 * s, 4 * s, -24 * s, 7 * s, -16 * s]);
  g.endFill();
  g.beginFill(0xff0044);
  g.drawCircle(0, -20 * s, 2);
  g.endFill();
  g.beginFill(0xff0000);
  g.drawCircle(-2.5 * s, -13 * s, 2.5 * s);
  g.drawCircle(2.5 * s, -13 * s, 2.5 * s);
  g.endFill();
  g.beginFill(0xff8800);
  g.drawCircle(-2.5 * s, -13 * s, 1.2 * s);
  g.drawCircle(2.5 * s, -13 * s, 1.2 * s);
  g.endFill();
  g.beginFill(0x666666);
  g.drawRect(14 * s, -18 * s, 3 * s, 28 * s);
  g.endFill();
  g.beginFill(0x888888);
  g.drawPolygon([17 * s, -16 * s, 26 * s, -8 * s, 17 * s, 0]);
  g.endFill();
  g.lineStyle(2, 0xff00ff, 0.25);
  g.drawEllipse(0, 0, 22 * s, 18 * s);
  noLine(g);
}
