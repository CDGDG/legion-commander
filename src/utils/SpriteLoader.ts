import { BaseTexture, Texture, Rectangle, Sprite } from 'pixi.js';

/**
 * Loads spritesheets and extracts individual frame textures.
 * Each sheet is a horizontal strip: frame0 | frame1 | frame2 | ...
 *
 * Player: 12 frames (4 dirs × 3 states: idle/walk/attack), 128x128 each
 * Soldiers/Enemies: 8 frames (4 dirs × 2 states: idle/attack), 128x128 each
 * Boss: 8 frames, 192x192 each
 */

export interface CharacterTextures {
  frames: Texture[][]; // [dir][state]
}

const FRAME_SIZE = 128;
const BOSS_FRAME_SIZE = 192;

// dir: 0=down, 1=up, 2=left, 3=right
// player states: 0=idle, 1=walk, 2=attack
// soldier/enemy states: 0=idle, 1=attack

const cache = new Map<string, CharacterTextures>();

export async function loadCharacterSheet(
  url: string,
  statesPerDir: number,
  frameSize = FRAME_SIZE
): Promise<CharacterTextures> {
  if (cache.has(url)) return cache.get(url)!;

  const base = BaseTexture.from(url);
  await new Promise<void>((resolve) => {
    if (base.valid) { resolve(); return; }
    base.once('loaded', () => resolve());
  });

  const frames: Texture[][] = [];
  let idx = 0;
  for (let dir = 0; dir < 4; dir++) {
    const dirFrames: Texture[] = [];
    for (let state = 0; state < statesPerDir; state++) {
      const rect = new Rectangle(idx * frameSize, 0, frameSize, frameSize);
      dirFrames.push(new Texture(base, rect));
      idx++;
    }
    frames.push(dirFrames);
  }

  const result = { frames };
  cache.set(url, result);
  return result;
}

export function getDirIndex(facingDir: string): number {
  switch (facingDir) {
    case 'down': return 0;
    case 'up': return 1;
    case 'left': return 2;
    case 'right': return 3;
    default: return 0;
  }
}
