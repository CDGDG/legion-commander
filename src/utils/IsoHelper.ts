import { Graphics, Container } from 'pixi.js';

const ISO_Y = 0.55;

/** Convert game coords to screen coords (rectangular map, no Y squeeze) */
export function toIso(x: number, y: number): { x: number; y: number } {
  return { x, y };
}

/** Create a shadow ellipse graphic */
export function createShadow(radius: number): Graphics {
  const g = new Graphics();
  g.beginFill(0x000000, 0.3);
  g.drawEllipse(0, 0, radius * 1.2, radius * 0.5);
  g.endFill();
  return g;
}

/** Update an entity's visual position with isometric projection + depth sort */
export function updateIsoPosition(
  gfx: Graphics | Container,
  shadow: Graphics | null,
  gameX: number,
  gameY: number,
  extraGfx?: (Graphics | Container)[]
): void {
  const iso = toIso(gameX, gameY);
  gfx.x = iso.x;
  gfx.y = iso.y;
  // Depth sort: higher Y = in front
  gfx.zIndex = Math.floor(gameY + 1000);

  if (shadow) {
    shadow.x = iso.x;
    shadow.y = iso.y + 2; // slightly below feet
    shadow.zIndex = Math.floor(gameY + 999);
  }

  if (extraGfx) {
    for (const eg of extraGfx) {
      eg.zIndex = Math.floor(gameY + 1001);
    }
  }
}
