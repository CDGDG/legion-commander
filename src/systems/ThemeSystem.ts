export interface RoomTheme {
  name: string;
  floorBase: number;
  floorTile: number;
  floorTileAlt: number;
  wallColor: number;
  wallHighlight: number;
  borderColor: number;
  lightColor: number;
  fogColor: number;
  runeColor: number;
  crackColor: number;
  pillarColor: number;
  pillarGlow: number;
  flameColor1: number;
  flameColor2: number;
  ambientLight: number;
  particleColor: number; // floating ambient particles
}

const THEMES: RoomTheme[] = [
  {
    name: 'Dungeon',
    floorBase: 0x0c0c18, floorTile: 0x141428, floorTileAlt: 0x101020,
    wallColor: 0x0e0e1e, wallHighlight: 0x334455,
    borderColor: 0x2a2a44, lightColor: 0xffaa44, fogColor: 0x182030,
    runeColor: 0x1a1a3a, crackColor: 0x1a1a33, pillarColor: 0x181830,
    pillarGlow: 0x3388bb, flameColor1: 0xff5511, flameColor2: 0xffaa33,
    ambientLight: 0x223344, particleColor: 0x445566,
  },
  {
    name: 'Forest',
    floorBase: 0x0a120a, floorTile: 0x142214, floorTileAlt: 0x0e1a0e,
    wallColor: 0x0a140a, wallHighlight: 0x336633,
    borderColor: 0x2a442a, lightColor: 0x88cc44, fogColor: 0x102818,
    runeColor: 0x1a3a1a, crackColor: 0x223322, pillarColor: 0x1a2a1a,
    pillarGlow: 0x44aa44, flameColor1: 0x44cc22, flameColor2: 0x88ff66,
    ambientLight: 0x1a3322, particleColor: 0x88cc88,
  },
  {
    name: 'Lava',
    floorBase: 0x1a0808, floorTile: 0x221010, floorTileAlt: 0x1a0a0a,
    wallColor: 0x1a0a08, wallHighlight: 0x664422,
    borderColor: 0x663311, lightColor: 0xff6622, fogColor: 0x301810,
    runeColor: 0x441111, crackColor: 0xff4400, pillarColor: 0x2a1a10,
    pillarGlow: 0xff4400, flameColor1: 0xff4400, flameColor2: 0xffaa00,
    ambientLight: 0x442211, particleColor: 0xff8844,
  },
  {
    name: 'Ice',
    floorBase: 0x081018, floorTile: 0x102030, floorTileAlt: 0x0c1824,
    wallColor: 0x0a1420, wallHighlight: 0x446688,
    borderColor: 0x3366aa, lightColor: 0x66bbff, fogColor: 0x102838,
    runeColor: 0x1a3a5a, crackColor: 0x4488cc, pillarColor: 0x1a2a3a,
    pillarGlow: 0x44aaff, flameColor1: 0x4488ff, flameColor2: 0x88ccff,
    ambientLight: 0x1a3344, particleColor: 0xaaddff,
  },
  {
    name: 'Graveyard',
    floorBase: 0x0a0a0c, floorTile: 0x161618, floorTileAlt: 0x101012,
    wallColor: 0x0c0c10, wallHighlight: 0x444455,
    borderColor: 0x333344, lightColor: 0x88ff88, fogColor: 0x182018,
    runeColor: 0x222233, crackColor: 0x333344, pillarColor: 0x1a1a22,
    pillarGlow: 0x44ff66, flameColor1: 0x22ff44, flameColor2: 0x88ff88,
    ambientLight: 0x1a2a1a, particleColor: 0x66aa88,
  },
];

export function getTheme(room: number): RoomTheme {
  // Boss rooms use special dark variant of current theme
  const idx = Math.floor((room - 1) / 2) % THEMES.length;
  return THEMES[idx];
}

export function getBossTheme(room: number): RoomTheme {
  const base = getTheme(room);
  return {
    ...base,
    name: base.name + ' (Boss)',
    lightColor: 0xff0044,
    fogColor: 0x200810,
    flameColor1: 0xff2244,
    flameColor2: 0xff6688,
    pillarGlow: 0xff2244,
    ambientLight: 0x331122,
    borderColor: 0x660033,
  };
}
