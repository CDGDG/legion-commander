import { Application, Container, Graphics } from 'pixi.js';
import { Input } from './Input';
import { Camera } from './Camera';
import { GameState, SoldierType, RoomRewardType, CommandStance } from './GameState';
import { STANCES } from '../data/ContentData';
import { Player } from '../entities/Player';
import { Soldier } from '../entities/Soldier';
import { WaveSystem } from '../systems/WaveSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { RoomSystem } from '../systems/RoomSystem';
import { HUD } from '../ui/HUD';
import { Screens } from '../ui/Screens';
import { FXSystem } from '../systems/FXSystem';
import { AttackRenderer } from '../systems/AttackRenderer';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { sound } from '../systems/SoundSystem';
import { submitScore } from '../systems/Leaderboard';
import { randomRange, randomInt } from '../utils/math';

const SOLDIER_TYPES: SoldierType[] = ['swordsman', 'spearman', 'archer', 'mage', 'priest'];
const SOLDIER_NAMES: Record<SoldierType, string> = {
  swordsman: '검병', spearman: '창병', archer: '궁수', mage: '마법사', priest: '성직자',
};
const SOLDIER_COLORS: Record<SoldierType, number> = {
  swordsman: 0x3366cc, spearman: 0x2299aa, archer: 0x33aa33, mage: 0x8833cc, priest: 0xccaa22,
};

const SOLDIER_UPGRADES: Record<SoldierType, { label: string; desc: string; apply: (ss: Soldier[], t: SoldierType) => void }[]> = {
  swordsman: [
    { label: '철벽 방어', desc: 'HP +50%', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.maxHp = Math.floor(s.maxHp * 1.5); s.hp = s.maxHp; } } },
    { label: '강철 검', desc: '공격력 +60%', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) s.damage = Math.floor(s.damage * 1.6); } },
    { label: '돌격 훈련', desc: '속도/공속 강화', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.speed *= 1.4; s.attackRate *= 0.8; } } },
  ],
  spearman: [
    { label: '장창술', desc: '사거리/공격력 강화', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.attackRange *= 1.5; s.damage = Math.floor(s.damage * 1.3); } } },
    { label: '밀집 대형', desc: 'HP/공격력 강화', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.maxHp = Math.floor(s.maxHp * 1.4); s.hp = s.maxHp; s.damage = Math.floor(s.damage * 1.2); } } },
    { label: '질풍 돌격', desc: '속도/공속 대폭 강화', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.speed *= 1.6; s.attackRate *= 0.7; } } },
  ],
  archer: [
    { label: '관통 화살', desc: '공격력 +70%', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) s.damage = Math.floor(s.damage * 1.7); } },
    { label: '속사', desc: '공격속도 +50%', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) s.attackRate *= 0.5; } },
    { label: '장거리 저격', desc: '사거리 대폭 증가', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.attackRange *= 1.8; s.damage = Math.floor(s.damage * 1.2); } } },
  ],
  mage: [
    { label: '마력 증폭', desc: '공격력 +80%', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) s.damage = Math.floor(s.damage * 1.8); } },
    { label: '주문 가속', desc: '공격속도 +50%', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) s.attackRate *= 0.5; } },
    { label: '마법 방벽', desc: 'HP 2배', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.maxHp *= 2; s.hp = s.maxHp; } } },
  ],
  priest: [
    { label: '신성한 빛', desc: '사거리 +40%', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) s.attackRange *= 1.4; } },
    { label: '축복의 갑옷', desc: 'HP/속도 강화', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.maxHp = Math.floor(s.maxHp * 1.8); s.hp = s.maxHp; s.speed *= 1.3; } } },
    { label: '심판의 빛', desc: '딜러화', apply: (ss, t) => { for (const s of ss) if (s.active && s.alive && s.type === t) { s.damage = 10; s.attackRate = 1.5; } } },
  ],
};

export class Game {
  app: Application;
  private input: Input;
  private camera!: Camera;
  state: GameState;
  private player!: Player;
  private soldiers: Soldier[] = [];
  private soldierPool: Soldier[] = [];
  waveSystem!: WaveSystem;
  private combatSystem: CombatSystem;
  private roomSystem!: RoomSystem;
  hud: HUD;
  private screens: Screens;
  private worldContainer!: Container;
  private fxSystem!: FXSystem;
  private attackRenderer!: AttackRenderer;
  private projectileSystem!: ProjectileSystem;
  private flashGfx!: Graphics;
  private roomClearTimer = 0;
  private doorChoicesShown = false;
  private goldEarned = 0;
  private totalKills = 0;
  private gameStarted = false;
  private roomCleared = false;

  constructor(app: Application) {
    this.app = app;
    this.state = new GameState();
    this.combatSystem = new CombatSystem();
    this.hud = new HUD(app.screen.width, app.screen.height);
    this.screens = new Screens();
    this.input = new Input(app.view as HTMLCanvasElement);
    this.hud.stanceUnlockedChecker = (id: string) => this.screens.isStanceUnlocked(id as any);

    app.stage.addChild(this.hud.container);
    app.stage.addChild(this.screens.container);

    for (let i = 0; i < 150; i++) this.soldierPool.push(new Soldier());

    window.addEventListener('resize', () => this.resize());
    this.resize();

    // Show title screen
    this.screens.showTitle(app.screen.width, app.screen.height, () => this.startNewGame());
  }

  private startNewGame(): void {
    this.gameStarted = true;
    this.state = new GameState();
    this.goldEarned = 0;
    this.totalKills = 0;
    this.roomClearTimer = 0;
    this.doorChoicesShown = false;

    // Clean up old world
    if (this.worldContainer) {
      this.app.stage.removeChild(this.worldContainer);
      this.worldContainer.destroy({ children: true });
    }

    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.app.stage.addChildAt(this.worldContainer, 0);

    this.camera = new Camera(this.worldContainer, this.app.screen.width, this.app.screen.height);
    this.roomSystem = new RoomSystem(this.worldContainer);
    this.waveSystem = new WaveSystem(this.worldContainer);
    this.fxSystem = new FXSystem(this.worldContainer);
    this.attackRenderer = new AttackRenderer(this.worldContainer);
    this.projectileSystem = new ProjectileSystem(this.worldContainer);
    this.combatSystem.fx = this.fxSystem;
    this.combatSystem.attackRenderer = this.attackRenderer;
    this.combatSystem.projectiles = this.projectileSystem;

    // Screen flash overlay
    this.flashGfx = new Graphics();
    this.flashGfx.zIndex = 9999;
    this.flashGfx.eventMode = 'none';

    // Reset soldiers
    this.soldiers = [];

    // Player with permanent upgrades
    this.player = new Player(this.worldContainer);
    const hpBonus = this.screens.getUpgradeValue('hp') * 20;
    const atkBonus = this.screens.getUpgradeValue('atk') * 5;
    const spdBonus = this.screens.getUpgradeValue('speed') * 15;
    const dashBonus = this.screens.getUpgradeValue('dash') * 0.2;
    const armyBonus = this.screens.getUpgradeValue('army') * 2;

    this.player.maxHp += hpBonus;
    this.player.hp = this.player.maxHp;
    this.player.attackDamage += atkBonus;
    this.player.speed += spdBonus;
    this.player.dashCooldownMax = Math.max(0.3, this.player.dashCooldownMax - dashBonus);

    // Apply selected weapon
    const weapon = this.screens.selectedWeapon;
    this.player.attackDamage = Math.floor(this.player.attackDamage * weapon.atkMult);
    this.player.attackRange = Math.floor(this.player.attackRange * weapon.rangeMult);
    this.player.attackRate = this.player.attackRate * weapon.rateMult;

    // Starting army
    this.spawnSoldiers('swordsman', 3 + Math.floor(armyBonus / 2));
    this.spawnSoldiers('archer', 2 + Math.ceil(armyBonus / 2));

    // Re-add HUD and screens on top
    this.app.stage.removeChild(this.hud.container);
    this.app.stage.removeChild(this.screens.container);
    this.app.stage.addChild(this.hud.container);
    this.app.stage.addChild(this.screens.container);

    this.addVignette();
    this.enterRoom();
  }

  private addVignette(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const vig = new Graphics();
    vig.beginFill(0x000000, 0.5);
    vig.drawRect(0, 0, w * 0.12, h);
    vig.drawRect(w * 0.88, 0, w * 0.12, h);
    vig.endFill();
    vig.beginFill(0x000000, 0.4);
    vig.drawRect(0, 0, w, h * 0.08);
    vig.drawRect(0, h * 0.92, w, h * 0.08);
    vig.endFill();
    vig.zIndex = 9998;
    vig.eventMode = 'none';
    this.app.stage.addChild(vig);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.app.renderer.resize(w, h);
    if (this.camera) this.camera.resize(w, h);
  }

  private enterRoom(): void {
    this.state.phase = 'combat';
    this.roomClearTimer = 0;
    this.doorChoicesShown = false;
    this.roomCleared = false;
    this.roomSystem.drawRoom(this.state.room, this.state.isBossRoom);
    if (this.state.isBossRoom) sound.bossAppear();
    this.player.reset(0, 100);
    for (const s of this.soldiers) {
      if (s.active && s.alive) {
        const a = Math.random() * Math.PI * 2;
        const d = randomRange(25, 70);
        s.x = this.player.x + Math.cos(a) * d;
        s.y = this.player.y + Math.sin(a) * d;
      }
    }
    this.waveSystem.startRoom(this.state);
    this.hud.showCenterMessage(this.state.isBossRoom ? 'BOSS!' : `Room ${this.state.room}`, 1.5);
  }

  private spawnSoldiers(type: SoldierType, count: number): void {
    for (let i = 0; i < count; i++) {
      let soldier: Soldier;
      if (this.soldierPool.length > 0) {
        soldier = this.soldierPool.pop()!;
      } else {
        soldier = new Soldier();
      }
      const a = Math.random() * Math.PI * 2;
      const d = randomRange(30, 70);
      soldier.init(type, this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d, this.worldContainer);
      this.soldiers.push(soldier);
      this.state.soldierCounts[type]++;
    }
  }

  private showDoorChoices(): void {
    if (this.doorChoicesShown) return;
    this.doorChoicesShown = true;
    this.state.phase = 'doorSelect';
    const choices = this.state.generateDoorChoices();
    const colorMap: Record<RoomRewardType, number> = {
      soldier: 0x3366cc, playerBuff: 0xffd700, heal: 0x44cc44, soldierBuff: 0x8833cc, boss: 0xff0066,
    };
    this.roomSystem.showDoors(
      choices.map(c => ({ label: c.label, color: colorMap[c.rewardType] })),
      (idx) => { this.roomSystem.hideDoors(); this.applyReward(choices[idx].rewardType); }
    );
  }

  private applyReward(rewardType: RoomRewardType): void {
    this.state.phase = 'reward';
    const sw = this.app.screen.width, sh = this.app.screen.height;

    switch (rewardType) {
      case 'soldier': {
        const opts = [];
        const unlockedTypes = SOLDIER_TYPES.filter(t => this.screens.isSoldierUnlocked(t));
        for (let i = 0; i < 3; i++) {
          const type = unlockedTypes[randomInt(0, unlockedTypes.length - 1)];
          const count = randomInt(2, 5);
          opts.push({ label: `+${count} ${SOLDIER_NAMES[type]}`, desc: `${SOLDIER_NAMES[type]} ${count}명 합류`, color: SOLDIER_COLORS[type], action: () => this.spawnSoldiers(type, count) });
        }
        this.hud.showReward('병사 영입', opts, sw, sh, () => this.advanceRoom());
        break;
      }
      case 'playerBuff': {
        const buffs = [
          { label: 'HP +30', desc: '최대 체력 증가', color: 0x44cc44, action: () => { this.player.maxHp += 30; this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp); } },
          { label: 'ATK +8', desc: '공격력 증가', color: 0xff6644, action: () => { this.player.attackDamage += 8; } },
          { label: 'Speed +25', desc: '이동속도 증가', color: 0x44aaff, action: () => { this.player.speed += 25; } },
          { label: '공속 강화', desc: '공격속도 +20%', color: 0xffdd44, action: () => { this.player.attackRate *= 0.8; } },
        ];
        this.hud.showReward('전사의 축복', buffs.sort(() => Math.random() - 0.5).slice(0, 3), sw, sh, () => this.advanceRoom());
        break;
      }
      case 'heal': {
        const heal = Math.floor(this.player.maxHp * 0.5);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
        for (const s of this.soldiers) if (s.active && s.alive) s.hp = s.maxHp;
        this.hud.showCenterMessage(`HP +${heal} 회복!`, 1.5);
        setTimeout(() => this.advanceRoom(), 1200);
        break;
      }
      case 'soldierBuff': {
        const existing = SOLDIER_TYPES.filter(t => this.state.soldierCounts[t] > 0);
        if (existing.length === 0) { this.advanceRoom(); return; }
        const opts = existing.slice(0, 3).map(type => {
          const up = SOLDIER_UPGRADES[type][randomInt(0, SOLDIER_UPGRADES[type].length - 1)];
          return { label: `${SOLDIER_NAMES[type]}: ${up.label}`, desc: up.desc, color: SOLDIER_COLORS[type], action: () => up.apply(this.soldiers, type) };
        });
        this.hud.showReward('군단 강화', opts, sw, sh, () => this.advanceRoom());
        break;
      }
      default: this.advanceRoom();
    }
  }

  private submitRunScore(victory: boolean): void {
    const name = this.screens.playerName || 'Anonymous';
    // Score formula: weighted by kills, room, ascension, victory bonus
    const score = this.totalKills * 10
      + this.state.room * 50
      + (this.state.ascension || 0) * 500
      + (victory ? 1000 : 0)
      + this.goldEarned;

    submitScore({
      name,
      score,
      room: this.state.room,
      ascension: this.state.ascension || 0,
      kills: this.totalKills,
      weapon: this.screens.selectedWeapon.name,
    }).catch((e) => console.warn('Score submit failed', e));
  }

  private advanceRoom(): void {
    this.state.room++;
    if (this.state.room > 10) { // 10 rooms for ~2-3 min games
      this.state.phase = 'victory';
      this.submitRunScore(true);
      this.screens.showVictory(this.app.screen.width, this.app.screen.height, this.goldEarned + 20, () => {
        this.screens.showTitle(this.app.screen.width, this.app.screen.height, () => this.startNewGame());
      });
      return;
    }
    this.enterRoom();
  }

  update(dt: number): void {
    if (!this.gameStarted) return;
    if (this.state.phase === 'victory' || this.state.phase === 'gameOver') return;
    if (this.hud.isRewardVisible) return;
    if (this.state.phase === 'doorSelect') return;

    this.state.totalTime += dt;

    // Stance change (1-8 keys) - only available stances
    const stanceKey = this.input.getStanceKey();
    if (stanceKey) {
      const stanceMap: Record<number, CommandStance> = {
        1: 'attack', 2: 'evade', 3: 'protect', 4: 'hold',
        5: 'rally', 6: 'execute', 7: 'surround', 8: 'wall',
      };
      const newStance = stanceMap[stanceKey];
      if (newStance && newStance !== this.state.stance) {
        // Check if unlocked
        const stanceDef = STANCES.find(s => s.id === newStance);
        if (!stanceDef) return;
        const isUnlocked = stanceDef.cost === 0 || this.screens.isStanceUnlocked(newStance);
        if (!isUnlocked) {
          this.hud.showCenterMessage(`🔒 ${stanceDef.name} 미해금 (${stanceDef.cost}G)`, 1.0);
        } else {
          this.state.stance = newStance;
          // Snapshot hold anchor at activation time
          if (newStance === 'hold') {
            this.state.holdAnchorX = this.player.x;
            this.state.holdAnchorY = this.player.y;
          }
          // Rally triggers a flash
          if (newStance === 'rally') {
            this.state.rallyTriggerTime = this.state.totalTime;
          }
          this.hud.showCenterMessage(`${stanceDef.keyword} ${stanceDef.name}`, 0.8);
        }
      }
    }

    this.player.update(dt, this.input, this.camera, this.state);

    const attack = this.player.tryAttack(this.input, this.camera);
    if (attack) {
      const weaponCat = this.screens.selectedWeapon.category;
      const res = this.combatSystem.handlePlayerAttack(this.player, attack.x, attack.y, attack.angle, this.waveSystem.allEnemies, this.state, this.camera, weaponCat);
      this.goldEarned += res.enemiesKilled * 2; // reduced from 5
      this.totalKills += res.enemiesKilled;
    }

    this.waveSystem.update(dt, this.player.x, this.player.y);

    const combatRes = this.combatSystem.update(dt, this.player, this.waveSystem.allEnemies, this.soldiers, this.state, this.camera);
    this.goldEarned += combatRes.enemiesKilled; // reduced from 3
    this.totalKills += combatRes.enemiesKilled;

    for (const type of SOLDIER_TYPES) {
      this.state.soldierCounts[type] = this.soldiers.filter(s => s.active && s.alive && s.type === type).length;
    }

    // Projectile system
    this.projectileSystem.update(
      dt,
      this.waveSystem.allEnemies,
      this.soldiers,
      this.player.x, this.player.y, this.player.radius,
      // onEnemyHit
      (x, y, damage, killed, xp) => {
        if (killed) {
          this.goldEarned += 2;
          this.fxSystem.spawnDeathEffect(x, y, true);
          sound.enemyDeath();
        } else {
          this.fxSystem.spawnHitSparks(x, y, 4, 0x4488ff);
          this.fxSystem.spawnDamageNumber(x, y, damage);
        }
        sound.hitImpact(false);
      },
      // onSoldierHit
      (x, y, damage, killed) => {
        if (killed) this.fxSystem.spawnDeathEffect(x, y, false);
        else this.fxSystem.spawnHitSparks(x, y, 2, 0xff4444);
      },
      // onPlayerHit
      (damage) => {
        if (!this.player.isDashing) {
          this.player.takeDamage(damage, this.state);
          sound.playerHurt();
          this.camera.shake(3, 0.1);
          this.fxSystem.spawnHitSparks(this.player.x, this.player.y, 4, 0xff4444);
          this.fxSystem.triggerFlash(0xff0000, 0.1);
        }
      },
    );

    // FX system
    this.fxSystem.update(dt);
    this.attackRenderer.update(dt);

    // Screen flash
    const flashA = this.fxSystem.getFlashAlpha();
    this.flashGfx.clear();
    if (flashA > 0) {
      this.flashGfx.beginFill(this.fxSystem.getFlashColor(), flashA);
      this.flashGfx.drawRect(-500, -400, 1000, 800);
      this.flashGfx.endFill();
    }

    // Room cleared
    if (this.state.phase === 'combat' && this.waveSystem.isRoomCleared && !this.roomCleared) {
      this.roomCleared = true;
      this.roomClearTimer = 0;
      sound.roomClear();
      this.hud.showCenterMessage('CLEAR!', 1.5);
      setTimeout(() => this.showDoorChoices(), 800);
    }
    if (this.roomCleared) {
      this.roomClearTimer += dt;
    }

    this.roomSystem.update(dt);
    this.camera.follow(this.player.x, this.player.y, dt);
    this.camera.update(dt);

    const activeEnemies = this.waveSystem.activeEnemies.length;
    this.hud.update(this.player, this.state, this.app.screen.width, this.app.screen.height, activeEnemies, dt);

    // Game over
    if (!this.player.alive) {
      this.state.phase = 'gameOver';
      sound.gameOver();
      this.submitRunScore(false);
      setTimeout(() => {
        this.screens.showGameOver(this.app.screen.width, this.app.screen.height, this.goldEarned, this.state.room, () => {
          this.screens.showTitle(this.app.screen.width, this.app.screen.height, () => this.startNewGame());
        });
      }, 1000);
    }
  }
}
