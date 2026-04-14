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

export class CombatSystem {
  private enemyHash = new SpatialHash<Enemy>(64);
  private soldierHash = new SpatialHash<Soldier>(64);
  fx: FXSystem | null = null;
  attackRenderer: AttackRenderer | null = null;
  projectiles: ProjectileSystem | null = null;

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

    // --- Soldiers attack enemies ---
    for (const s of soldiers) {
      if (!s.active || !s.alive) continue;
      const nearby = this.enemyHash.query(s.x, s.y, s.attackRange * 3);
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      for (const e of nearby) {
        const d = dist(s.x, s.y, e.x, e.y);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
      }
      const didAttack = s.update(dt, player.x, player.y, nearest?.x ?? null, nearest?.y ?? null, nearestDist, state.stance);
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
    weaponCategory: WeaponCategory = 'sword'
  ): { xpGained: number; enemiesKilled: number } {
    let xpGained = 0;
    let enemiesKilled = 0;
    const synergy = state.getSynergyBonus();
    const isCrit = Math.random() < synergy.critChance;
    const dmg = player.attackDamage * (isCrit ? 2 : 1);
    const color = isCrit ? 0xff8844 : 0xffd700;

    // Bow and Staff fire projectiles instead of melee
    if (weaponCategory === 'bow' || weaponCategory === 'staff') {
      if (this.projectiles) {
        const pType: ProjectileType = weaponCategory === 'bow' ? 'arrow' : 'fireball';
        const projRange = player.attackRange * 3; // projectiles travel further
        const tx = player.x + Math.cos(hitAngle) * projRange;
        const ty = player.y + Math.sin(hitAngle) * projRange;
        this.projectiles.spawn(player.x, player.y, tx, ty, pType, dmg, true);
        sound.playerSlash();
      }
      return { xpGained, enemiesKilled };
    }

    // Melee weapons: use AttackRenderer for weapon-specific animation
    this.attackRenderer?.spawnAttack(weaponCategory, player.x, player.y, hitAngle, player.attackRange, color);
    sound.playerSlash();

    // Determine hit area based on weapon category
    const hitArea = this.getWeaponHitArea(weaponCategory, player.x, player.y, hitAngle, player.attackRange);

    const nearby = this.enemyHash.query(hitArea.cx, hitArea.cy, hitArea.radius + 40);
    let hitAny = false;
    const kbMult = this.getKnockbackMult(weaponCategory);

    for (const e of nearby) {
      if (!this.isInHitArea(e.x, e.y, e.radius, hitArea, weaponCategory, player.x, player.y, hitAngle)) continue;
      hitAny = true;

      // Knockback varies by weapon
      const kbDir = normalize(e.x - player.x, e.y - player.y);
      const kbForce = (isCrit ? 25 : 12) * kbMult;
      e.x += kbDir.x * kbForce;
      e.y += kbDir.y * kbForce;

      if (e.takeDamage(dmg)) {
        xpGained += e.xp;
        enemiesKilled++;
        this.fx?.spawnDeathEffect(e.x, e.y, true);
        sound.enemyDeath();
      } else {
        this.fx?.spawnDamageNumber(e.x, e.y, Math.floor(dmg), isCrit);
      }
      this.fx?.spawnHitSparks(e.x, e.y, isCrit ? 12 : 6, isCrit ? 0xffd700 : 0xffffff);
    }

    if (hitAny) {
      sound.hitImpact(isCrit);
      // Heavy weapons shake more
      const shakeMult = weaponCategory === 'axe' || weaponCategory === 'mace' ? 1.5 : 1.0;
      camera.shake((isCrit ? 5 : 3) * shakeMult, isCrit ? 0.1 : 0.06);
      this.fx?.triggerHitStop(isCrit ? 0.08 : 0.05);
      if (isCrit) this.fx?.triggerFlash(0xffd700, 0.15);
    }

    return { xpGained, enemiesKilled };
  }

  /**
   * Returns the hit area center and radius for a given weapon.
   * Different weapons have different hit shapes.
   */
  private getWeaponHitArea(
    category: WeaponCategory, px: number, py: number, angle: number, range: number
  ): { cx: number; cy: number; radius: number; shape: string } {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    switch (category) {
      case 'sword':
        // Wide arc in front
        return { cx: px + cos * range * 0.5, cy: py + sin * range * 0.5, radius: range * 0.7, shape: 'arc' };
      case 'dagger':
        // Narrow, close
        return { cx: px + cos * range * 0.5, cy: py + sin * range * 0.5, radius: range * 0.4, shape: 'line' };
      case 'spear':
        // Long thin line
        return { cx: px + cos * range * 0.7, cy: py + sin * range * 0.7, radius: range * 1.0, shape: 'pierce' };
      case 'axe':
        // Small but heavy, directly in front
        return { cx: px + cos * range * 0.6, cy: py + sin * range * 0.6, radius: range * 0.55, shape: 'impact' };
      case 'mace':
        // Wide circular sweep
        return { cx: px, cy: py, radius: range * 0.95, shape: 'sweep' };
      default:
        return { cx: px + cos * range * 0.5, cy: py + sin * range * 0.5, radius: range * 0.6, shape: 'arc' };
    }
  }

  private isInHitArea(
    ex: number, ey: number, eRadius: number,
    area: { cx: number; cy: number; radius: number; shape: string },
    category: WeaponCategory, px: number, py: number, angle: number
  ): boolean {
    // Sweep: full circle
    if (area.shape === 'sweep') {
      return dist(ex, ey, px, py) <= area.radius + eRadius;
    }
    // Pierce (spear): line check
    if (area.shape === 'pierce') {
      const dx = ex - px, dy = ey - py;
      const along = dx * Math.cos(angle) + dy * Math.sin(angle);
      if (along < 0 || along > area.radius) return false;
      const perp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
      return perp <= 15 + eRadius;
    }
    // Line (dagger): narrow forward
    if (area.shape === 'line') {
      const dx = ex - px, dy = ey - py;
      const along = dx * Math.cos(angle) + dy * Math.sin(angle);
      if (along < 0 || along > area.radius * 1.3) return false;
      const perp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
      return perp <= 12 + eRadius;
    }
    // Default: circular area, but only in front half (for sword/axe)
    const d = dist(ex, ey, area.cx, area.cy);
    if (d > area.radius + eRadius) return false;
    // Must be in front of player (for arc/impact)
    const fx = ex - px, fy = ey - py;
    const dot = fx * Math.cos(angle) + fy * Math.sin(angle);
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
