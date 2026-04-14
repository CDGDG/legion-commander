import { Application, Container, Graphics } from 'pixi.js';
import { Input } from './Input';
import { TouchInput } from './TouchInput';
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
import { VisualFX } from '../systems/VisualFX';
import { sound } from '../systems/SoundSystem';
import { submitScore } from '../systems/Leaderboard';
import { randomRange, randomInt } from '../utils/math';
import { computeSynergy, WeaponSynergyBonus, NEUTRAL_SYNERGY } from '../systems/SynergySystem';

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
  touchInput!: TouchInput;
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
  private visualFX!: VisualFX;
  private flashGfx!: Graphics;
  private roomClearTimer = 0;
  private doorChoicesShown = false;
  private goldEarned = 0;
  private totalKills = 0;
  private ambientCooldown = 0;
  private fpsSampleSum = 0;
  private fpsSampleCount = 0;
  private lowQualityMode = false;
  private gameStarted = false;
  private roomCleared = false;
  // === SYNERGY ===
  /** Cached synergy bonus — recomputed only when dirty flag is set. */
  private synergy: WeaponSynergyBonus = { ...NEUTRAL_SYNERGY };
  /** Marked dirty when army composition or weapon changes. */
  private synergyDirty = true;
  /** Track which synergy thresholds have ever been announced — for one-time banner. */
  private synergyBannerShown = new Set<string>();
  /** Internal cooldowns for burst effects (seconds). */
  private arrowRainCooldown = 0;
  /** Attack-counter for bow mark (not every arrow needs a mark, every Nth). */
  private bowAttackCounter = 0;

  constructor(app: Application) {
    this.app = app;
    this.state = new GameState();
    this.combatSystem = new CombatSystem();
    this.hud = new HUD(app.screen.width, app.screen.height);
    this.screens = new Screens();
    this.input = new Input(app.view as HTMLCanvasElement);
    this.hud.stanceUnlockedChecker = (id: string) => this.screens.isStanceUnlocked(id as any);
    this.hud.equippedLoadoutProvider = () => this.screens.equippedStances;
    this.hud.synergyProvider = () => this.synergy;

    // Stage must sort children by zIndex so HUD/reward cards render above world
    app.stage.sortableChildren = true;
    this.hud.container.zIndex = 1000;
    app.stage.addChild(this.hud.container);

    // Touch input overlay (auto-shows on first touch event)
    this.touchInput = new TouchInput(app.stage, app.screen.width, app.screen.height);
    this.touchInput.container.zIndex = 1500;
    // Bridge touch input into the existing Input class
    this.input.setExternalProvider({
      getMovement: () => this.touchInput.getMovementVector(),
      isAttackHeld: () => this.touchInput.isAttackHeld(),
      consumeDash: () => this.touchInput.consumeDash(),
      consumeStance: () => this.touchInput.consumeStance(),
      isEnabled: () => this.touchInput.enabled,
    });
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
    // Reset synergy state for a fresh run
    this.synergy = { ...NEUTRAL_SYNERGY };
    this.synergyDirty = true;
    this.synergyBannerShown.clear();
    this.arrowRainCooldown = 0;

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
    this.projectileSystem.terrainBlocker = (x, y) => this.roomSystem.isBlocked(x, y);
    this.waveSystem.terrainBlocker = (x, y) => this.roomSystem.isBlocked(x, y);
    this.combatSystem.fx = this.fxSystem;
    this.combatSystem.attackRenderer = this.attackRenderer;
    this.combatSystem.projectiles = this.projectileSystem;

    // Cinematic filter stack (bloom, color grade, vignette)
    this.visualFX = new VisualFX(this.app.stage, this.worldContainer, this.app.screen.width, this.app.screen.height);
    this.combatSystem.visualFX = this.visualFX;

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

    this.enterRoom();
  }

  /** Emit a one-time banner when a synergy feature flag transitions from false → true. */
  private checkSynergyBanners(prev: WeaponSynergyBonus, curr: WeaponSynergyBonus): void {
    const banners: Array<[string, boolean, boolean, string]> = [
      ['sword.shockwave', prev.swordShockwave, curr.swordShockwave, '⚔ 충격파 발동! (검 + 검병 3)'],
      ['sword.simul',     prev.swordSimulSwing, curr.swordSimulSwing, '⚔ 동시 참격! (검 + 검병 10)'],
      ['axe.rage.weak',   prev.axeRage !== 'none', curr.axeRage !== 'none' && prev.axeRage === 'none', '🪓 처형 광폭! (도끼 + 검병)'],
      ['axe.rage.strong', prev.axeRage === 'strong', curr.axeRage === 'strong', '🪓 처형 광폭 강화! (도끼 + 검병 8)'],
      ['bow.mark',        prev.bowMark, curr.bowMark, '🏹 표식 시스템! (활 + 궁수 3)'],
      ['bow.rain',        prev.bowArrowRain, curr.bowArrowRain, '🏹 화살비! (활 + 궁수 8)'],
      ['mace.vuln',       prev.maceVulnMark, curr.maceVulnMark, '🔨 취약 노출! (둔기 + 검병 3)'],
      ['mace.stun',       prev.maceEndStun, curr.maceEndStun, '🔨 광역 기절! (둔기 + 검병 8)'],
      ['staff.circle',    prev.staffCircle, curr.staffCircle, '🔮 마법진! (지팡이 + 마법사 3)'],
      ['staff.chain',     prev.staffChain,  curr.staffChain,  '🔮 체인 마법! (지팡이 + 마법사 8)'],
      ['spear.line',      prev.spearLine,   curr.spearLine,   '🗡 관통 라인! (창 + 창병 3)'],
      ['spear.lineplus',  prev.spearLinePlus, curr.spearLinePlus, '🗡 강화 관통 라인! (창 + 창병 6)'],
      ['dagger.mark',     prev.daggerMark,  curr.daggerMark,  '🗡 단검 표식! (단검 + 궁수 3)'],
      ['dagger.markcrit', prev.daggerMarkCrit, curr.daggerMarkCrit, '🗡 표식 크리! (단검 + 궁수 6)'],
    ];
    for (const [key, was, is, label] of banners) {
      if (!was && is && !this.synergyBannerShown.has(key)) {
        this.synergyBannerShown.add(key);
        this.hud.showCenterMessage(label, 1.4);
      }
    }
  }

  /** Get the current synergy snapshot (read-only). */
  getSynergy(): WeaponSynergyBonus { return this.synergy; }

  private spawnAmbientParticle(): void {
    if (!this.player) return;
    // Theme based on room number
    const theme = Math.floor((this.state.room - 1) / 2) % 5;
    // 0=Dungeon dust, 1=Forest pollen, 2=Lava ember, 3=Ice snow, 4=Graveyard ghost
    const types: Array<{ type: 'dust' | 'ember' | 'snow' | 'ghost'; color: number; drift: [number, number] }> = [
      { type: 'dust',  color: 0x665544, drift: [0, -5] },
      { type: 'dust',  color: 0x88aa55, drift: [0, -3] },
      { type: 'ember', color: 0xff6622, drift: [0, -25] },
      { type: 'snow',  color: 0xddeeff, drift: [0, 15] },
      { type: 'ghost', color: 0x88ffaa, drift: [0, -10] },
    ];
    const t = types[theme];
    // Spawn within room bounds, weighted around player
    const sx = (Math.random() - 0.5) * 800 + this.player.x * 0.3;
    const sy = (Math.random() - 0.5) * 500 + this.player.y * 0.3;
    this.fxSystem.spawnAmbient(sx, sy, t.type, t.color, t.drift[0], t.drift[1]);
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

    // === FACE-OFF START ===
    // Pick a random side for the enemy lineup, place player on the OPPOSITE side.
    // Boss rooms keep the boss centered (no face-off — player still slightly back).
    const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
    this.state.faceDir = this.state.isBossRoom ? 'down' : dirs[Math.floor(Math.random() * dirs.length)];

    // Player position = opposite side of the room from faceDir, leaving room for the lineup gap.
    // Room is ~1400×850, so place player ~520 from center horizontally / 280 vertically.
    let px = 0, py = 0;
    switch (this.state.faceDir) {
      case 'right': px = -520; py = 0; break;
      case 'left':  px = 520;  py = 0; break;
      case 'down':  px = 0;    py = -280; break;
      case 'up':    px = 0;    py = 280; break;
    }
    if (this.state.isBossRoom) { px = 0; py = 150; } // boss: keep legacy spawn
    this.player.reset(px, py);

    // Soldiers cluster around the player (will form between player and enemy line via AI)
    for (const s of this.soldiers) {
      if (s.active && s.alive) {
        const a = Math.random() * Math.PI * 2;
        const d = randomRange(25, 70);
        s.x = this.player.x + Math.cos(a) * d;
        s.y = this.player.y + Math.sin(a) * d;
      }
    }
    this.waveSystem.startRoom(this.state);
    const dirLabel = this.state.isBossRoom ? '' :
      ({ right: '→', left: '←', up: '↑', down: '↓' } as const)[this.state.faceDir];
    this.hud.showCenterMessage(this.state.isBossRoom ? 'BOSS!' : `Room ${this.state.room}  ${dirLabel}`, 1.5);
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

  /**
   * Build a flat pool of all possible reward options (soldier recruit, player buff,
   * soldier buff, heal). Returns 3 unique random picks.
   */
  private buildRewardPool(): { label: string; desc: string; color: number; action: () => void }[] {
    const pool: { label: string; desc: string; color: number; action: () => void }[] = [];

    // === Soldier recruits (one entry per unlocked type) ===
    const unlockedTypes = SOLDIER_TYPES.filter(t => this.screens.isSoldierUnlocked(t));
    for (const type of unlockedTypes) {
      const count = randomInt(2, 5);
      pool.push({
        label: `+${count} ${SOLDIER_NAMES[type]}`,
        desc: `${SOLDIER_NAMES[type]} ${count}명 합류`,
        color: SOLDIER_COLORS[type],
        action: () => this.spawnSoldiers(type, count),
      });
    }

    // === Player buffs ===
    pool.push(
      { label: 'HP +30',     desc: '최대 체력 증가',     color: 0x44cc44, action: () => { this.player.maxHp += 30; this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp); } },
      { label: 'ATK +8',     desc: '공격력 증가',         color: 0xff6644, action: () => { this.player.attackDamage += 8; } },
      { label: 'Speed +25',  desc: '이동속도 증가',       color: 0x44aaff, action: () => { this.player.speed += 25; } },
      { label: '공속 강화',  desc: '공격속도 +20%',       color: 0xffdd44, action: () => { this.player.attackRate *= 0.8; } },
      { label: '대시 강화',  desc: '대시 쿨타임 -0.2초',  color: 0xffaa44, action: () => { this.player.dashCooldownMax = Math.max(0.3, this.player.dashCooldownMax - 0.2); } },
    );

    // === Heal ===
    const healAmt = Math.floor(this.player.maxHp * 0.5);
    pool.push({
      label: `+${healAmt} HP 회복`,
      desc: '플레이어 + 모든 병사 회복',
      color: 0x55ee77,
      action: () => {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        for (const s of this.soldiers) if (s.active && s.alive) s.hp = s.maxHp;
      },
    });

    // === Soldier buffs (random per existing type) ===
    const existing = SOLDIER_TYPES.filter(t => this.state.soldierCounts[t] > 0);
    for (const type of existing) {
      const upgrades = SOLDIER_UPGRADES[type];
      const up = upgrades[randomInt(0, upgrades.length - 1)];
      pool.push({
        label: `${SOLDIER_NAMES[type]}: ${up.label}`,
        desc: up.desc,
        color: SOLDIER_COLORS[type],
        action: () => up.apply(this.soldiers, type),
      });
    }

    return pool;
  }

  /**
   * Show 3 random rewards directly (no door selection step).
   */
  private showRewardChoices(): void {
    if (this.doorChoicesShown) return;
    this.doorChoicesShown = true;
    this.state.phase = 'reward';

    const pool = this.buildRewardPool();
    // Shuffle and pick 3 unique
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3);

    this.hud.showReward('보상 선택', shuffled, this.app.screen.width, this.app.screen.height, () => this.advanceRoom());
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

  update(dtRaw: number): void {
    if (!this.gameStarted) return;
    if (this.state.phase === 'victory' || this.state.phase === 'gameOver') return;
    if (this.hud.isRewardVisible) return;
    if (this.state.phase === 'doorSelect') return;

    // Apply slow-mo time scale (boss kills, etc)
    const timeScale = this.visualFX ? this.visualFX.getTimeScale(dtRaw) : 1.0;
    const dt = dtRaw * timeScale;

    this.state.totalTime += dt;

    // Stance change (Q/W/E = slots 0/1/2) — resolves to equipped loadout
    const slotIdx = this.input.getStanceKey();
    if (slotIdx !== null) {
      const newStance = this.screens.equippedStances[slotIdx] ?? null;
      if (newStance && newStance !== this.state.stance) {
        const stanceDef = STANCES.find(s => s.id === newStance);
        if (stanceDef) {
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
      } else if (newStance === null) {
        const slotKeys = ['Q', 'W', 'E'];
        this.hud.showCenterMessage(`${slotKeys[slotIdx]} 슬롯 비어있음`, 0.6);
      }
    }

    // Auto-aim for ALL platforms (Vampire Survivors style): nearest active enemy
    {
      let nearest: { x: number; y: number } | null = null;
      let nd = Infinity;
      for (const e of this.waveSystem.allEnemies) {
        if (!e.active || !e.alive) continue;
        const dx = e.x - this.player.x, dy = e.y - this.player.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nd) { nd = d2; nearest = { x: e.x, y: e.y }; }
      }
      this.player.autoAimX = nearest?.x ?? null;
      this.player.autoAimY = nearest?.y ?? null;
      this.player.autoAimDist2 = nd;
    }

    this.player.update(dt, this.input, this.camera, this.state);
    // Terrain collision — push entities out of obstacles
    this.roomSystem.resolveCollision(this.player, this.player.radius);
    for (const s of this.soldiers) {
      if (s.active && s.alive) this.roomSystem.resolveCollision(s, s.radius);
    }
    for (const e of this.waveSystem.allEnemies) {
      if (e.active && e.alive) this.roomSystem.resolveCollision(e, e.radius);
    }

    const weaponCat = this.screens.selectedWeapon.category;
    const isRanged = weaponCat === 'bow' || weaponCat === 'staff';
    const attack = this.player.tryAttack(this.input, this.camera, isRanged);
    if (attack) {
      const res = this.combatSystem.handlePlayerAttack(this.player, attack.x, attack.y, attack.angle, this.waveSystem.allEnemies, this.state, this.camera, weaponCat, this.synergy);
      this.goldEarned += res.enemiesKilled * 2; // reduced from 5
      this.totalKills += res.enemiesKilled;
      // Axe rage synergy: trigger from CombatSystem signal
      if (this.combatSystem.axeRageTrigger) {
        this.player.triggerRage(this.combatSystem.axeRageTrigger.strong);
        this.combatSystem.axeRageTrigger = null;
      }
    }

    // === SYNERGY: BOW ARROW RAIN (every 12s, drops 5 arrows on random enemies) ===
    if (this.arrowRainCooldown > 0) this.arrowRainCooldown -= dt;
    if (this.synergy.bowArrowRain && this.arrowRainCooldown <= 0 && weaponCat === 'bow') {
      const activeEnemies = this.waveSystem.allEnemies.filter(e => e.active && e.alive);
      if (activeEnemies.length > 0) {
        // Boss room: concentrate all arrows on boss (if present)
        const boss = activeEnemies.find(e => e.isBoss);
        const dmgPerArrow = this.player.attackDamage * (this.synergy.dmgMult) * 0.7;
        for (let i = 0; i < 5; i++) {
          const target = boss ?? activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
          // Spawn arrow from sky toward target
          const sx = target.x + randomRange(-30, 30);
          const sy = target.y - 300;
          const proj = this.projectileSystem.spawn(sx, sy, target.x, target.y, 'arrow', dmgPerArrow, true);
          if (proj && this.synergy.bowMark) proj.applyMark = true;
        }
        this.arrowRainCooldown = 12.0;
      }
    }

    this.waveSystem.update(dt, this.player.x, this.player.y, this.state);

    const combatRes = this.combatSystem.update(dt, this.player, this.waveSystem.allEnemies, this.soldiers, this.state, this.camera);
    this.goldEarned += combatRes.enemiesKilled; // reduced from 3
    this.totalKills += combatRes.enemiesKilled;

    // Recompute soldier counts; mark synergy dirty when any changes.
    let soldierCountsChanged = false;
    for (const type of SOLDIER_TYPES) {
      const n = this.soldiers.filter(s => s.active && s.alive && s.type === type).length;
      if (n !== this.state.soldierCounts[type]) soldierCountsChanged = true;
      this.state.soldierCounts[type] = n;
    }
    if (soldierCountsChanged) this.synergyDirty = true;
    if (this.synergyDirty) {
      const prev = this.synergy;
      this.synergy = computeSynergy(this.screens.selectedWeapon.category, this.state.soldierCounts);
      this.synergyDirty = false;
      this.checkSynergyBanners(prev, this.synergy);
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
    this.visualFX.update(dt);

    // FPS monitor — auto-disable expensive filters if avg FPS drops below 40 over 2s
    if (dtRaw > 0) {
      this.fpsSampleSum += 1 / dtRaw;
      this.fpsSampleCount++;
      if (this.fpsSampleCount >= 120) {
        const avgFps = this.fpsSampleSum / this.fpsSampleCount;
        if (avgFps < 40 && !this.lowQualityMode) {
          this.lowQualityMode = true;
          this.visualFX.setLowQuality(true);
          console.log(`[VisualFX] Low quality mode (avg FPS ${avgFps.toFixed(1)})`);
        } else if (avgFps > 55 && this.lowQualityMode) {
          this.lowQualityMode = false;
          this.visualFX.setLowQuality(false);
        }
        this.fpsSampleSum = 0;
        this.fpsSampleCount = 0;
      }
    }

    // Dash afterimage trail
    if (this.player.isDashing) {
      this.player.lastDashAfterimageTime += dt;
      if (this.player.lastDashAfterimageTime > 0.025) {
        this.fxSystem.spawnAfterimage(this.player.x, this.player.y, 0xffd700);
        this.player.lastDashAfterimageTime = 0;
      }
    }

    // Ambient particles per theme (sparse spawn)
    this.ambientCooldown -= dt;
    if (this.ambientCooldown <= 0) {
      this.ambientCooldown = 0.15 + Math.random() * 0.1;
      this.spawnAmbientParticle();
    }

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
      setTimeout(() => this.showRewardChoices(), 600);
    }
    if (this.roomCleared) {
      this.roomClearTimer += dt;
    }

    this.roomSystem.update(dt);

    // Camera target:
    // - Lineup phase: target the geometric midpoint between player and enemy edge,
    //   so both the player formation and the incoming line are framed in shot.
    // - Combat phase: standard player-follow.
    let camTargetX = this.player.x;
    let camTargetY = this.player.y;
    if (this.state.isLineupPhase && !this.state.isBossRoom) {
      // Enemy line position by faceDir
      const enemyEdgeX = this.state.faceDir === 'right' ? 700 : this.state.faceDir === 'left' ? -700 : this.player.x;
      const enemyEdgeY = this.state.faceDir === 'down'  ? 425 : this.state.faceDir === 'up'   ? -425 : this.player.y;
      camTargetX = (this.player.x + enemyEdgeX) / 2;
      camTargetY = (this.player.y + enemyEdgeY) / 2;
    }
    this.camera.follow(camTargetX, camTargetY, dt);
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
