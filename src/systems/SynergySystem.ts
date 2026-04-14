// Weapon × Soldier synergy calculation.
//
// Design notes (from Codex collab, Phase 2):
//  - Pure function computeSynergy() — no side effects, dirty+cached pattern in caller.
//  - Stats (dmg/radius/projectileSpeed) use conservative caps, esp. on axe/bow.
//  - Feature flags (axeRage / bowMark / bowArrowRain / maceVulnMark / maceEndStun / swordShockwave / swordSimulSwing)
//    unlock at thresholds and change *combat rules*, not just numbers.
//  - Heavy effects (arrow rain, AoE stun, execute rage) have internal cooldowns in their owners,
//    not encoded here — this module reports capability only.
//
// This is intentionally designed so only sword/axe/bow/mace have synergies in v1.
// staff/spear get neutral (all flags false, 1.0 multipliers) — Phase 2b will add them.

import { SoldierType } from '../core/GameState';
import { WeaponCategory } from './AttackRenderer';

export interface SoldierCounts {
  swordsman: number; spearman: number; archer: number; mage: number; priest: number;
}

export interface WeaponSynergyBonus {
  dmgMult: number;              // multiplicative damage bonus (1.0 = no bonus)
  radiusMult: number;           // attack area scaling (sweep / AoE)
  projectileSpeedMult: number;  // bow
  knockbackMult: number;        // mace extra
  // Feature flags — threshold unlocks
  swordShockwave: boolean;       // swordsman ≥ 3
  swordSimulSwing: boolean;      // swordsman ≥ 10
  axeRage: 'none' | 'weak' | 'strong'; // swordsman ≥ 1 weak, ≥ 8 strong
  bowMark: boolean;              // archer ≥ 3
  bowArrowRain: boolean;         // archer ≥ 8
  maceVulnMark: boolean;         // swordsman ≥ 3
  maceEndStun: boolean;          // swordsman ≥ 8
  // Which soldier type is the "primary synergy partner" for this weapon (for HUD)
  partner: SoldierType | null;
  partnerCount: number;
  // Progression: next threshold info for HUD
  nextThreshold: number; // 0 if none above current
  nextUnlock: string;    // short label
}

export const NEUTRAL_SYNERGY: WeaponSynergyBonus = {
  dmgMult: 1, radiusMult: 1, projectileSpeedMult: 1, knockbackMult: 1,
  swordShockwave: false, swordSimulSwing: false,
  axeRage: 'none',
  bowMark: false, bowArrowRain: false,
  maceVulnMark: false, maceEndStun: false,
  partner: null, partnerCount: 0,
  nextThreshold: 0, nextUnlock: '',
};

function nextStep(curr: number, ...thresholds: { at: number; label: string }[]): { t: number; l: string } {
  for (const step of thresholds) {
    if (curr < step.at) return { t: step.at, l: step.label };
  }
  return { t: 0, l: '' };
}

export function computeSynergy(cat: WeaponCategory, counts: SoldierCounts): WeaponSynergyBonus {
  switch (cat) {
    case 'sword': {
      const N = counts.swordsman;
      const capped = Math.min(N, 40);
      const nx = nextStep(N, { at: 3, label: '충격파' }, { at: 10, label: '동시 참격' });
      return {
        ...NEUTRAL_SYNERGY,
        dmgMult: 1 + capped * 0.015,        // cap +60%
        radiusMult: 1 + capped * 0.005,     // cap +20%
        swordShockwave: N >= 3,
        swordSimulSwing: N >= 10,
        partner: 'swordsman', partnerCount: N,
        nextThreshold: nx.t, nextUnlock: nx.l,
      };
    }
    case 'axe': {
      // Codex: NO multiplier stacking. Trigger-form only.
      const N = counts.swordsman;
      const rage: 'none' | 'weak' | 'strong' = N >= 8 ? 'strong' : N >= 1 ? 'weak' : 'none';
      const nx = nextStep(N, { at: 1, label: '처형 광폭 (약)' }, { at: 8, label: '처형 광폭 (강)' });
      return {
        ...NEUTRAL_SYNERGY,
        // Minimal raw dmg — the weapon already has very high base DPS
        dmgMult: 1 + Math.min(N, 20) * 0.005, // cap +10%
        axeRage: rage,
        partner: 'swordsman', partnerCount: N,
        nextThreshold: nx.t, nextUnlock: nx.l,
      };
    }
    case 'bow': {
      // Codex: low raw dmg, use mark/focus/speed instead.
      const N = counts.archer;
      const capped = Math.min(N, 40);
      const nx = nextStep(N, { at: 3, label: '표식' }, { at: 8, label: '화살비' });
      return {
        ...NEUTRAL_SYNERGY,
        dmgMult: 1 + capped * 0.005,           // cap +20% only
        projectileSpeedMult: 1 + Math.min(N, 20) * 0.015, // cap +30%
        bowMark: N >= 3,
        bowArrowRain: N >= 8,
        partner: 'archer', partnerCount: N,
        nextThreshold: nx.t, nextUnlock: nx.l,
      };
    }
    case 'mace': {
      // Codex: convert CC to team-damage via vuln mark.
      const N = counts.swordsman;
      const capped = Math.min(N, 50);
      const nx = nextStep(N, { at: 3, label: '취약 노출' }, { at: 8, label: '회전 끝 기절' });
      return {
        ...NEUTRAL_SYNERGY,
        radiusMult: 1 + capped * 0.01,         // cap +50%
        knockbackMult: 1 + Math.min(N, 30) * 0.02, // cap +60%
        maceVulnMark: N >= 3,
        maceEndStun: N >= 8,
        partner: 'swordsman', partnerCount: N,
        nextThreshold: nx.t, nextUnlock: nx.l,
      };
    }
    // Phase 2b will add staff/spear/dagger here.
    default:
      return { ...NEUTRAL_SYNERGY };
  }
}

// ===== Status bag on Enemy =====
// Lightweight. If this grows beyond ~4 fields, refactor into StatusEffect manager.
export interface EnemyStatus {
  /** Time remaining (seconds) where this enemy takes +20% damage from everyone */
  markedTimer?: number;
  /** Time remaining where this enemy takes +15% damage (mace vuln) */
  vulnTimer?: number;
  /** Time remaining where this enemy cannot act (mace end-stun) */
  stunTimer?: number;
}

/** Apply marked status to an enemy. Returns true if newly applied. */
export function applyMark(status: EnemyStatus, duration = 0.8): void {
  const remaining = status.markedTimer ?? 0;
  if (duration > remaining) status.markedTimer = duration;
}
export function applyVuln(status: EnemyStatus, duration = 2.0): void {
  const remaining = status.vulnTimer ?? 0;
  if (duration > remaining) status.vulnTimer = duration;
}
export function applyStun(status: EnemyStatus, duration = 0.3): void {
  const remaining = status.stunTimer ?? 0;
  if (duration > remaining) status.stunTimer = duration;
}

/** Compute damage multiplier on an enemy based on its status flags. */
export function statusDamageMult(status: EnemyStatus | undefined): number {
  if (!status) return 1;
  let m = 1;
  if ((status.markedTimer ?? 0) > 0) m *= 1.20;
  if ((status.vulnTimer ?? 0) > 0)   m *= 1.15;
  return m;
}

/** Tick down all timers on a status. Mutates in place. */
export function tickStatus(status: EnemyStatus | undefined, dt: number): void {
  if (!status) return;
  if ((status.markedTimer ?? 0) > 0) status.markedTimer = Math.max(0, (status.markedTimer ?? 0) - dt);
  if ((status.vulnTimer ?? 0) > 0)   status.vulnTimer   = Math.max(0, (status.vulnTimer ?? 0) - dt);
  if ((status.stunTimer ?? 0) > 0)   status.stunTimer   = Math.max(0, (status.stunTimer ?? 0) - dt);
}
