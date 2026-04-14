/**
 * Leaderboard system.
 * - Works offline with localStorage fallback.
 * - When env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set,
 *   uses Supabase for a shared global leaderboard.
 */

export interface ScoreEntry {
  name: string;
  score: number;
  room: number;
  ascension: number;
  kills: number;
  weapon: string;
  createdAt: number; // unix ms
}

const LOCAL_KEY = 'legion_leaderboard';
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
const USE_CLOUD = !!(SUPABASE_URL && SUPABASE_KEY);

/** Save player name locally for convenience */
const NAME_KEY = 'legion_player_name';

export function savePlayerName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function loadPlayerName(): string {
  return localStorage.getItem(NAME_KEY) || '';
}

/** === LOCAL LEADERBOARD === */
function getLocalScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScoreEntry[];
  } catch {
    return [];
  }
}

function saveLocalScores(scores: ScoreEntry[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(scores));
}

/** === SUPABASE CLOUD LEADERBOARD === */
async function submitToCloud(entry: ScoreEntry): Promise<void> {
  if (!USE_CLOUD) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY!}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        name: entry.name,
        score: entry.score,
        room: entry.room,
        ascension: entry.ascension,
        kills: entry.kills,
        weapon: entry.weapon,
      }),
    });
  } catch (err) {
    console.warn('Cloud submit failed, saved locally:', err);
  }
}

async function fetchFromCloud(limit = 20): Promise<ScoreEntry[]> {
  if (!USE_CLOUD) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=*&order=score.desc&limit=${limit}`,
      {
        headers: {
          'apikey': SUPABASE_KEY!,
          'Authorization': `Bearer ${SUPABASE_KEY!}`,
        },
      }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: any) => ({
      name: r.name,
      score: r.score,
      room: r.room,
      ascension: r.ascension ?? 0,
      kills: r.kills ?? 0,
      weapon: r.weapon ?? '',
      createdAt: new Date(r.created_at ?? Date.now()).getTime(),
    }));
  } catch (err) {
    console.warn('Cloud fetch failed:', err);
    return [];
  }
}

/** === PUBLIC API === */

export async function submitScore(entry: Omit<ScoreEntry, 'createdAt'>): Promise<void> {
  const full: ScoreEntry = { ...entry, createdAt: Date.now() };

  // Always save locally (as cache)
  const local = getLocalScores();
  local.push(full);
  local.sort((a, b) => b.score - a.score);
  saveLocalScores(local.slice(0, 100));

  // Submit to cloud if configured
  if (USE_CLOUD) {
    await submitToCloud(full);
  }
}

export async function getTopScores(limit = 20): Promise<ScoreEntry[]> {
  if (USE_CLOUD) {
    const cloud = await fetchFromCloud(limit);
    if (cloud.length > 0) return cloud;
  }
  return getLocalScores().slice(0, limit);
}

export function isCloudEnabled(): boolean {
  return USE_CLOUD;
}
