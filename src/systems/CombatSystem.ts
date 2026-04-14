import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Soldier } from '../entities/Soldier';
import { GameState } from '../core/GameState';
import { Camera } from '../core/Camera';
import { SpatialHash } from '../utils/SpatialHash';
import { FXSystem } from './FXSystem';
import { AttackRenderer, WeaponCategory } from './AttackRenderer';
import { ProjectileSystem, ProjectileType } from './ProjectileSystem';
import { sound } from './SoundSystem';
import { dist, normalize } from '../utils/math';
import { statusDamageMult, applyMark, applyStun } from './SynergySystem';

export class CombatSystem {
  private enemyHash = new SpatialHash<Enemy>(64);
  /** One-frame pulse: set when axe execute rage triggers. Player reads + clears. */
  axeRageTrigger: { strong: boolean } | null = null;

  private statusDmgMult(e: Enemy): number {
    return statusDamageMult(e.status);
  }
  private soldierHash = new SpatialHash<Soldier>(64);
  fx: FXSystem | null = null;
  attackRenderer: AttackRenderer | null = null;
  projectiles: ProjectileSystem | null = null;
  visualFX: { pulseBloom: (i: number, d: number) => void; triggerSlowMo: (f: number, d: number) => void; setZoom: (s: number, d?: number) => void } | null = null;

  update(
    dt: number, player: Player, enemies: Enemy[], soldiers: Soldier[],
    state: GameState, camera: Camera
  ): { xpGained: number; enemiesKilled: number } {
    let xpGained = 0;
    let enemiesKilled = 0;

    this.enemyHash.clear();
    this.soldierHash.clear();
    for (const e of enemies) if (e.active && e.alive) this.enemyHash.insert(e);
    for (const s of soldiers) if (s.active && s.alive) this.soldierHash.insert(s);

    // === STANCE ANCHORS ===
    // Compute rear-mass anchor (center of ranged soldiers) for 'protect' stance
    let rearAX = player.x, rearAY = player.y;
    if (state.stance === 'protect') {
      let cnt = 0, sx = 0, sy = 0;
      for (const s of soldiers) {
        if (!s.active || !s.alive) continue;
        if (s.type === 'archer' || s.type === 'mage' || s.type === 'priest') {
          sx += s.x; sy += s.y; cnt++;
        }
      }
      if (cnt > 0) { rearAX = sx / cnt; rearAY = sy / cnt; }
      else { rearAX = player.x; rearAY = player.y; }
    }
    // Wall anchor: point in front of player (between player and nearest enemy)
    let wallAX = player.x, wallAY = player.y;
    if (state.stance === 'wall') {
      // Find nearest enemy to determine wall direction
      let nearestE: Enemy | null = null;
      let nd = Infinity;
      for (const e of enemies) {
        if (!e.active || !e.alive) continue;
        const d = dist(player.x, player.y, e.x, e.y);
        if (d < nd) { nd = d; nearestE = e; }
      }
      if (nearestE) {
        const dx = nearestE.x - player.x, dy = nearestE.y - player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        wallAX = player.x + (dx / len) * 50;
        wallAY = player.y + (dy / len) * 50;
      }
    }

    // --- Soldiers attack enemies ---
    for (const s of soldiers) {
      if (!s.active || !s.alive) continue;

      // Target search: executes stance picks lowest-HP, others pick nearest
      const searchR = s.attackRange * (state.stance === 'hold' ? 1.2 : 3);
      const nearby = this.enemyHash.query(s.x, s.y, searchR);
      let chosen: Enemy | null = null;
      let chosenDist = Infinity;

      if (state.stance === 'execute') {
        // Prefer lowest HP in range
        let lowestHp = Infinity;
        for (const e of nearby) {
          if (e.hp < lowestHp) { lowestHp = e.hp; chosen = e; chosenDist = dist(s.x, s.y, e.x, e.y); }
        }
      } else {
        for (const e of nearby) {
          const d = dist(s.x, s.y, e.x, e.y);
          if (d < chosenDist) { chosenDist = d; chosen = e; }
        }
      }

      // Anchor selection by stance
      const isRangedUnit = s.type === 'archer' || s.type === 'mage' || s.type === 'priest';
      let anchorX = player.x, anchorY = player.y;
      if (state.stance === 'hold') {
        anchorX = state.holdAnchorX; anchorY = state.holdAnchorY;
      } else if (state.stance === 'protect') {
        anchorX = rearAX; anchorY = rearAY;
      } else if (state.stance === 'wall' && !isRangedUnit) {
        anchorX = wallAX; anchorY = wallAY;
      }

      const didAttack = s.update(
        dt, player.x, player.y,
        chosen?.x ?? null, chosen?.y ?? null, chosenDist,
        state.stance,
        anchorX, anchorY,
      );
      const nearest = chosen;
      if (didAttack && nearest) {
        const isRanged = s.type === 'archer' || s.type === 'mage' || s.type === 'priest';
        if (isRanged && this.projectiles) {
          // Fire projectile instead of instant damage
          const projType: ProjectileType =
            s.type === 'archer' ? 'arrow' :
            s.type === 'mage' ? 'magic_bolt' : 'heal_orb';
          this.projectiles.spawn(s.x, s.y, nearest.x, nearest.y, projType, s.damage, true);
        } else {
          // Melee: instant damage
          if (nearest.takeDamage(s.damage)) {
            xpGained += nearest.xp;
            enemiesKilled++;
            this.fx?.spawnDeathEffect(nearest.x, nearest.y, true);
            sound.enemyDeath();
          } else {
            this.fx?.spawnHitSparks(nearest.x, nearest.y, 3, 0x4488ff);
            this.fx?.spawnDamageNumber(nearest.x, nearest.y, s.damage);
          }
        }
      }
    }

    // --- Enemies attack ---
    for (const e of enemies) {
      if (!e.active || !e.alive) continue;
      if (e.attackCooldown > 0) continue;

      const dPlayer = dist(e.x, e.y, player.x, player.y);

      // Bomber
      if (e.type === 'bomber') {
        const nearSoldiers = this.soldierHash.query(e.x, e.y, 25);
        if (nearSoldiers.length > 0 || dPlayer < 30) {
          const blastRadius = 60;
          const blastTargets = this.soldierHash.query(e.x, e.y, blastRadius);
          for (const s of blastTargets) {
            if (s.takeDamage(e.damage)) {
              this.fx?.spawnDeathEffect(s.x, s.y, false);
            }
          }
          if (dPlayer < blastRadius && !player.isDashing) {
            player.takeDamage(e.damage, state);
            sound.playerHurt();
            camera.shake(5, 0.15);
          }
          this.fx?.spawnHitSparks(e.x, e.y, 15, 0xff6600);
          this.fx?.triggerFlash(0xff4400, 0.2);
          sound.hitImpact(true);
          e.takeDamage(9999);
          continue;
        }
      }

      // Find closest target
      let targetType: 'player' | 'soldier' = 'player';
      let closestDist = dPlayer;
      let closestSoldier: Soldier | null = null;

      if (e.type !== 'charger') {
        const nearbySoldiers = this.soldierHash.query(e.x, e.y, e.attackRange + 30);
        for (const s of nearbySoldiers) {
          const d = dist(e.x, e.y, s.x, s.y);
          if (d < closestDist) { closestDist = d; closestSoldier = s; targetType = 'soldier'; }
        }
      }
      if (e.type === 'sniper') {
        const nearbySoldiers = this.soldierHash.query(e.x, e.y, e.attackRange);
        if (nearbySoldiers.length > 0) {
          closestSoldier = nearbySoldiers[0];
          closestDist = dist(e.x, e.y, closestSoldier.x, closestSoldier.y);
          targetType = 'soldier';
        }
      }

      // Attack
      const isEnemyRanged = e.type === 'sniper';

      if (isEnemyRanged && this.projectiles) {
        // Ranged enemy: fire projectile at target
        const targetActual = targetType === 'player'
          ? { x: player.x, y: player.y }
          : closestSoldier ? { x: closestSoldier.x, y: closestSoldier.y } : null;

        if (targetActual && closestDist <= e.attackRange) {
          this.projectiles.spawn(e.x, e.y, targetActual.x, targetActual.y, 'crossbow_bolt', e.damage, false);
          e.attackCooldown = e.attackRate;
        }
      } else if (targetType === 'player' && dPlayer <= e.attackRange + player.radius) {
        if (!player.isDashing) {
          player.takeDamage(e.damage, state);
          sound.playerHurt();
          camera.shake(3, 0.1);
          this.fx?.spawnHitSparks(player.x, player.y, 4, 0xff4444);
          this.fx?.triggerFlash(0xff0000, 0.1);
        }
        e.attackCooldown = e.attackRate;
        // Visible melee attack swing
        this.fx?.spawnHitSparks(
          (e.x + player.x) / 2, (e.y + player.y) / 2, 3, 0xff6644
        );
      } else if (targetType === 'soldier' && closestSoldier && closestDist <= e.attackRange + closestSoldier.radius + 5) {
        if (closestSoldier.takeDamage(e.damage)) {
          this.fx?.spawnDeathEffect(closestSoldier.x, closestSoldier.y, false);
        } else {
          this.fx?.spawnHitSparks(closestSoldier.x, closestSoldier.y, 2, 0xff6666);
          this.fx?.spawnDamageNumber(closestSoldier.x, closestSoldier.y, e.damage);
        }
        e.attackCooldown = e.attackRate;
        // Visible melee swing between enemy and soldier
        this.fx?.spawnHitSparks(
          (e.x + closestSoldier.x) / 2, (e.y + closestSoldier.y) / 2, 2, 0xff4444
        );
      }

      // Enemy movement target
      if (!e.targetsPlayer && closestSoldier && targetType === 'soldier') {
        e.targetX = closestSoldier.x;
        e.targetY = closestSoldier.y;
      }
    }

    // Separation
    for (const a of soldiers) {
      if (!a.active) continue;
      const nearby = this.soldierHash.query(a.x, a.y, 18);
      for (const b of nearby) {
        if (a === b) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 12 && d > 0.1) {
          const push = (12 - d) * 0.4;
          a.x += (dx / d) * push;
          a.y += (dy / d) * push;
        }
      }
    }

    return { xpGained, enemiesKilled };
  }

  handlePlayerAttack(
    player: Player, hitX: number, hitY: number, hitAngle: number,
    enemies: Enemy[], state: GameState, camera: Camera,
    weaponCategory: WeaponCategory = 'sword',
    weaponSynergy?: import('./SynergySystem').WeaponSynergyBonus
  ): { xpGained: number; enemiesKilled: number } {
    let xpGained = 0;
    let enemiesKilled = 0;
    const synergy = state.getSynergyBonus();
    const wsyn = weaponSynergy; // may be undefined for legacy callers
    const isCrit = Math.random() < synergy.critChance;
    // Apply weapon-synergy dmg multiplier
    const baseDmg = player.attackDamage * (isCrit ? 2 : 1);
    const dmg = baseDmg * (wsyn?.dmgMult ?? 1);
    const color = isCrit ? 0xff8844 : 0xffd700;

    // Bow and Staff fire projectiles instead of melee
    if (weaponCategory === 'bow' || weaponCategory === 'staff') {
      if (this.projectiles) {
        const pType: ProjectileType = weaponCategory === 'bow' ? 'arrow' : 'fireball';
        const projRange = player.attackRange * 3; // projectiles travel further
        const tx = player.x + Math.cos(hitAngle) * projRange;
        const ty = player.y + Math.sin(hitAngle) * projRange;
        const speedMult = wsyn?.projectileSpeedMult ?? 1;
        const proj = this.projectiles.spawn(player.x, player.y, tx, ty, pType, dmg, true);
        if (proj && speedMult !== 1) {
          proj.vx *= speedMult;
          proj.vy *= speedMult;
        }
        // Signal to ProjectileSystem: this projectile should leave a bow mark on hit
        if (proj && weaponCategory === 'bow' && wsyn?.bowMark) {
          (proj as any).applyMark = true;
        }
        sound.playerSlash();
      }
      return { xpGained, enemiesKilled };
    }

    // Melee weapons: use AttackRenderer for weapon-specific animation
    // Apply radius multiplier (mace/sword grow with synergy)
    const synRange = player.attackRange * (wsyn?.radiusMult ?? 1);
    this.attackRenderer?.spawnAttack(weaponCategory, player.x, player.y, hitAngle, synRange, color);
    sound.playerSlash();

    // Determine hit area based on weapon category
    const hitArea = this.getWeaponHitArea(weaponCategory, player.x, player.y, hitAngle, synRange);

    const nearby = this.enemyHash.query(hitArea.cx, hitArea.cy, hitArea.radius + 40);
    let hitAny = false;
    const kbMult = this.getKnockbackMult(weaponCategory) * (wsyn?.knockbackMult ?? 1);

    for (const e of nearby) {
      if (!this.isInHitArea(e.x, e.y, e.radius, hitArea, weaponCategory, player.x, player.y, hitAngle)) continue;
      hitAny = true;

      // Knockback varies by weapon
      const kbDir = normalize(e.x - player.x, e.y - player.y);
      const kbForce = (isCrit ? 25 : 12) * kbMult;
      e.x += kbDir.x * kbForce;
      e.y += kbDir.y * kbForce;

      // Status-based damage amplification (marked, vuln)
      const statusMult = this.statusDmgMult(e);
      const finalDmg = dmg * statusMult;

      // === Synergy: mace vuln mark on knocked enemies ===
      if (weaponCategory === 'mace' && wsyn?.maceVulnMark) {
        e.status.vulnTimer = Math.max(e.status.vulnTimer ?? 0, 2.0);
      }

      // Pre-kill check for axe execute rage (low-HP target)
      const wasLowHp = e.hp / e.maxHp < 0.30;

      if (e.takeDamage(finalDmg)) {
        xpGained += e.xp;
        enemiesKilled++;
        this.fx?.spawnDeathEffect(e.x, e.y, true);
        sound.enemyDeath();
        // === Synergy: axe execute rage (kill on low-HP target) ===
        if (weaponCategory === 'axe' && wasLowHp && wsyn?.axeRage && wsyn.axeRage !== 'none') {
          this.axeRageTrigger = { strong: wsyn.axeRage === 'strong' };
        }
        // Boss/elite kill — slow-mo + zoom-in flair
        if (e.isBoss) {
          this.visualFX?.triggerSlowMo(0.3, 0.6);
          this.visualFX?.setZoom(1.25, 0.2);
          setTimeout(() => this.visualFX?.setZoom(1.0, 0.5), 700);
          this.fx?.triggerFlash(0xff00ff, 0.4);
          this.visualFX?.pulseBloom(2.5, 0.5);
        } else if (e.isElite) {
          this.visualFX?.triggerSlowMo(0.5, 0.18);
          this.visualFX?.pulseBloom(1.6, 0.2);
        }
      } else {
        this.fx?.spawnDamageNumber(e.x, e.y, Math.floor(dmg), isCrit);
      }
      this.fx?.spawnHitSparks(e.x, e.y, isCrit ? 12 : 6, isCrit ? 0xffd700 : 0xffffff);
    }

    if (hitAny) {
      sound.hitImpact(isCrit);
      const shakeMult = weaponCategory === 'axe' || weaponCategory === 'mace' ? 1.5 : 1.0;
      camera.shake((isCrit ? 5 : 3) * shakeMult, isCrit ? 0.1 : 0.06);
      this.fx?.triggerHitStop(isCrit ? 0.08 : 0.05);
      if (isCrit) {
        this.fx?.triggerFlash(0xffd700, 0.15);
        this.visualFX?.pulseBloom(1.8, 0.15);
      }

      // === Synergy: sword shockwave on hit ===
      if (weaponCategory === 'sword' && wsyn?.swordShockwave) {
        const swRadius = 80 + (wsyn.radiusMult - 1) * 80;
        const swDmg = dmg * 0.30;
        for (const e2 of this.enemyHash.query(player.x + Math.cos(hitAngle) * 40, player.y + Math.sin(hitAngle) * 40, swRadius)) {
          if (e2 === null || !e2.active || !e2.alive) continue;
          if (dist(e2.x, e2.y, player.x, player.y) > swRadius) continue;
          const sd = swDmg * this.statusDmgMult(e2);
          if (e2.takeDamage(sd)) {
            xpGained += e2.xp; enemiesKilled++;
            this.fx?.spawnDeathEffect(e2.x, e2.y, true);
          } else {
            this.fx?.spawnDamageNumber(e2.x, e2.y, Math.floor(sd));
          }
        }
        this.fx?.spawnHitSparks(player.x + Math.cos(hitAngle) * 30, player.y + Math.sin(hitAngle) * 30, 14, 0xffd700);
      }

      // === Synergy: mace end-of-sweep stun (radius around player) ===
      if (weaponCategory === 'mace' && wsyn?.maceEndStun) {
        const stunR = hitArea.radius * 1.0;
        for (const e2 of this.enemyHash.query(player.x, player.y, stunR)) {
          if (!e2.active || !e2.alive) continue;
          if (dist(e2.x, e2.y, player.x, player.y) > stunR) continue;
          applyStun(e2.status, 0.3);
          applyMark(e2.status, 1.2); // briefly marked so team can follow up
        }
      }
    }

    return { xpGained, enemiesKilled };
  }

  /**
   * Returns the hit area center and radius for a given weapon.
   * Different weapons have different hit shapes.
   */
  private getWeaponHitArea(
    category: WeaponCategory, px: number, py: number, angle: number, range: number
  ): { cx: number; cy: number; radius: number; shape: string; length: number; width: number } {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    switch (category) {
      case 'sword':
        // Wide arc in front
        return { cx: px + cos * range * 0.5, cy: py + sin * range * 0.5, radius: range * 0.75, shape: 'arc', length: 0, width: 0 };
      case 'dagger':
        // Short but decent line (user feedback: range was too short)
        return { cx: px + cos * range * 0.55, cy: py + sin * range * 0.55, radius: range * 0.6, shape: 'line', length: range * 1.1, width: 18 };
      case 'spear':
        // Long pierce line — match visual length (range * 1.2) with decent width
        return { cx: px + cos * range * 0.6, cy: py + sin * range * 0.6, radius: range * 1.3, shape: 'pierce', length: range * 1.35, width: 22 };
      case 'axe':
        // Small but heavy, directly in front
        return { cx: px + cos * range * 0.55, cy: py + sin * range * 0.55, radius: range * 0.55, shape: 'impact', length: 0, width: 0 };
      case 'mace':
        // Widest circular sweep (full 360 circle)
        return { cx: px, cy: py, radius: range * 1.15, shape: 'sweep', length: 0, width: 0 };
      default:
        return { cx: px + cos * range * 0.5, cy: py + sin * range * 0.5, radius: range * 0.7, shape: 'arc', length: 0, width: 0 };
    }
  }

  private isInHitArea(
    ex: number, ey: number, eRadius: number,
    area: { cx: number; cy: number; radius: number; shape: string; length: number; width: number },
    _category: WeaponCategory, px: number, py: number, angle: number
  ): boolean {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    // Sweep: full circle
    if (area.shape === 'sweep') {
      return dist(ex, ey, px, py) <= area.radius + eRadius;
    }
    // Pierce (spear): line check — extends from player forward to `length`, with `width` perpendicular tolerance
    if (area.shape === 'pierce') {
      const dx = ex - px, dy = ey - py;
      const along = dx * cos + dy * sin;
      if (along < -eRadius || along > area.length + eRadius) return false;
      const perp = Math.abs(-dx * sin + dy * cos);
      return perp <= area.width + eRadius;
    }
    // Line (dagger): narrow forward corridor, length/width come from hit area
    if (area.shape === 'line') {
      const dx = ex - px, dy = ey - py;
      const along = dx * cos + dy * sin;
      if (along < -eRadius || along > area.length + eRadius) return false;
      const perp = Math.abs(-dx * sin + dy * cos);
      return perp <= area.width + eRadius;
    }
    // Default: circular area, only in front (for sword/axe)
    const d = dist(ex, ey, area.cx, area.cy);
    if (d > area.radius + eRadius) return false;
    const fx = ex - px, fy = ey - py;
    const dot = fx * cos + fy * sin;
    return dot >= -eRadius;
  }

  private getKnockbackMult(category: WeaponCategory): number {
    switch (category) {
      case 'mace': return 2.0;
      case 'axe': return 1.6;
      case 'spear': return 1.4;
      case 'sword': return 1.0;
      case 'dagger': return 0.4;
      default: return 1.0;
    }
  }
}
