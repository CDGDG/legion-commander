import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WEAPON_BASES, SOLDIER_DEFS, ARMOR_DATA, type WeaponBase, type SoldierDef, type ArmorPiece, type ArmorSlot } from '../data/ContentData';
import { getTopScores, savePlayerName, loadPlayerName, isCloudEnabled, type ScoreEntry } from '../systems/Leaderboard';

// Position for name input (above start button)
function btnYForName(screenH: number): number { return screenH - 100; }

const TITLE_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 42, fill: 0xffd700, fontWeight: 'bold', dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 3 });
const SUB_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 16, fill: 0xaaaaaa });
const BTN_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 18, fill: 0xffffff, fontWeight: 'bold' });
const STAT_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: 0xcccccc });
const GOLD_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 20, fill: 0xffd700, fontWeight: 'bold' });

export interface PermanentUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
  currentLevel: number;
  color: number;
}

const UPGRADES: PermanentUpgrade[] = [
  { id: 'hp', name: 'HP 강화', description: '최대 체력 +20', cost: 50, maxLevel: 10, currentLevel: 0, color: 0x44cc44 },
  { id: 'atk', name: '공격력 강화', description: '공격력 +5', cost: 60, maxLevel: 10, currentLevel: 0, color: 0xff6644 },
  { id: 'speed', name: '이동속도 강화', description: '이동속도 +15', cost: 40, maxLevel: 5, currentLevel: 0, color: 0x44aaff },
  { id: 'army', name: '초기 병사 추가', description: '시작 시 병사 +2', cost: 80, maxLevel: 5, currentLevel: 0, color: 0x3366cc },
  { id: 'dash', name: '대시 강화', description: '대시 쿨타임 -0.2s', cost: 55, maxLevel: 5, currentLevel: 0, color: 0xffaa44 },
];

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  color: number;
  unlocked: boolean;
  category: 'sword' | 'dagger' | 'spear' | 'axe' | 'bow' | 'staff' | 'mace';
  // Effects applied at game start
  atkMult: number;
  rangeMult: number;
  rateMult: number;
  special: string; // synergy link description
}

export interface SoldierUnlock {
  id: string;
  name: string;
  description: string;
  cost: number;
  color: number;
  unlocked: boolean;
}

// Generate weapons from ContentData
const TIER_COLORS = [0xcccccc, 0x44aaff, 0xffaa44, 0xff44ff];
const CATEGORY_COLORS: Record<string, number> = {
  sword: 0xcccccc, dagger: 0x44ffaa, spear: 0x44cccc,
  axe: 0xff6644, bow: 0x66cc44, staff: 0xaa44ff, mace: 0xffdd44,
};

const CAT_LABELS: Record<string, string> = {
  sword: '검', dagger: '단검', spear: '창', axe: '도끼', bow: '활', staff: '지팡이', mace: '둔기',
};

const WEAPONS: WeaponDef[] = WEAPON_BASES.map(wb => ({
  id: wb.id,
  name: wb.name,
  description: wb.description,
  cost: wb.cost,
  color: TIER_COLORS[wb.tier] || CATEGORY_COLORS[wb.category] || 0xcccccc,
  unlocked: wb.cost === 0,
  category: wb.category,
  atkMult: wb.atkMult,
  rangeMult: wb.rangeMult,
  rateMult: wb.rateMult,
  special: `[${CAT_LABELS[wb.category]}] ${wb.description.split('.')[0]}`,
}));

// Generate soldier unlocks from ContentData (exclude swordsman/archer which are free)
const SOLDIER_UNLOCKS: SoldierUnlock[] = SOLDIER_DEFS
  .filter(sd => sd.cost > 0)
  .map(sd => ({
    id: sd.id,
    name: `${sd.name} 해금`,
    description: `${sd.role} · ${sd.description}`,
    cost: sd.cost,
    color: sd.color,
    unlocked: false,
  }));

// Armor unlocks
const ARMOR_UNLOCKS: ArmorPiece[] = ARMOR_DATA;

export class Screens {
  container: Container;
  private gold = 0;
  private upgrades: PermanentUpgrade[] = UPGRADES;
  private weapons: WeaponDef[] = WEAPONS;
  private soldierUnlocks: SoldierUnlock[] = SOLDIER_UNLOCKS;
  private armorUnlocks: Map<string, boolean> = new Map();
  selectedWeapon: WeaponDef = WEAPONS[0];
  equippedArmor: Map<string, string> = new Map(); // slot -> armorId
  playerName: string = '';
  private cachedScores: ScoreEntry[] = [];
  private scoresLoading = false;
  private onStartGame: (() => void) | null = null;

  constructor() {
    this.container = new Container();
    this.container.zIndex = 10000;
    this.loadSave();
    this.playerName = loadPlayerName();
  }

  private loadSave(): void {
    try {
      const data = localStorage.getItem('legion_save');
      if (data) {
        const save = JSON.parse(data);
        this.gold = save.gold || 0;
        if (save.upgrades) {
          for (const u of this.upgrades) {
            if (save.upgrades[u.id] !== undefined) u.currentLevel = save.upgrades[u.id];
          }
        }
        if (save.weapons) {
          for (const w of this.weapons) {
            if (save.weapons[w.id]) w.unlocked = true;
          }
        }
        if (save.soldiers) {
          for (const s of this.soldierUnlocks) {
            if (save.soldiers[s.id]) s.unlocked = true;
          }
        }
        if (save.armor) {
          for (const [id, unlocked] of Object.entries(save.armor)) {
            if (unlocked) this.armorUnlocks.set(id, true);
          }
        }
        if (save.equippedArmor) {
          for (const [slot, id] of Object.entries(save.equippedArmor)) {
            this.equippedArmor.set(slot, id as string);
          }
        }
        if (save.selectedWeapon) {
          const w = this.weapons.find(wp => wp.id === save.selectedWeapon);
          if (w && w.unlocked) this.selectedWeapon = w;
        }
      }
    } catch { /* ignore */ }
  }

  private save(): void {
    const upgradeMap: Record<string, number> = {};
    for (const u of this.upgrades) upgradeMap[u.id] = u.currentLevel;
    const weaponMap: Record<string, boolean> = {};
    for (const w of this.weapons) weaponMap[w.id] = w.unlocked;
    const soldierMap: Record<string, boolean> = {};
    for (const s of this.soldierUnlocks) soldierMap[s.id] = s.unlocked;
    const armorMap: Record<string, boolean> = {};
    for (const [id, unlocked] of this.armorUnlocks) armorMap[id] = unlocked;
    const equippedMap: Record<string, string> = {};
    for (const [slot, id] of this.equippedArmor) equippedMap[slot] = id;
    localStorage.setItem('legion_save', JSON.stringify({
      gold: this.gold, upgrades: upgradeMap, weapons: weaponMap,
      soldiers: soldierMap, selectedWeapon: this.selectedWeapon.id,
      armor: armorMap, equippedArmor: equippedMap,
    }));
  }

  isSoldierUnlocked(id: string): boolean {
    if (id === 'swordsman' || id === 'archer') return true;
    const s = this.soldierUnlocks.find(su => su.id === id);
    return s ? s.unlocked : false;
  }

  getUpgradeValue(id: string): number {
    const u = this.upgrades.find(up => up.id === id);
    return u ? u.currentLevel : 0;
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.save();
  }

  private currentTab: 'upgrades' | 'weapons' | 'soldiers' | 'armor' | 'ranking' = 'upgrades';
  private scrollOffset = 0;

  showTitle(screenW: number, screenH: number, onStart: () => void): void {
    this.container.removeChildren();
    this.container.visible = true;
    this.onStartGame = onStart;

    // Background
    const bg = new Graphics();
    bg.beginFill(0x08080f);
    bg.drawRect(0, 0, screenW, screenH);
    bg.endFill();
    bg.eventMode = 'static';
    this.container.addChild(bg);

    // Title
    const title = new Text('LEGION COMMANDER', new TextStyle({
      fontFamily: 'monospace', fontSize: 32, fill: 0xffd700, fontWeight: 'bold',
      dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 2,
    }));
    title.anchor.set(0.5);
    title.x = screenW / 2;
    title.y = 30;
    this.container.addChild(title);

    // Gold
    const goldText = new Text(`Gold: ${this.gold}`, GOLD_STYLE);
    goldText.anchor.set(0.5);
    goldText.x = screenW / 2;
    goldText.y = 58;
    this.container.addChild(goldText);

    // === TAB BUTTONS ===
    type TabId = 'upgrades' | 'weapons' | 'soldiers' | 'armor' | 'ranking';
    const tabs: { id: TabId; label: string; color: number }[] = [
      { id: 'upgrades', label: '강화', color: 0x44cc44 },
      { id: 'weapons', label: `무기 (${this.weapons.length})`, color: 0xff6644 },
      { id: 'soldiers', label: `병사 (${this.soldierUnlocks.length + 2})`, color: 0x3366cc },
      { id: 'armor', label: `방어구 (${ARMOR_UNLOCKS.length})`, color: 0xffaa44 },
      { id: 'ranking', label: '🏆 랭킹', color: 0xffd700 },
    ];

    const tabW = 140;
    const tabStartX = screenW / 2 - (tabs.length * (tabW + 8)) / 2;
    const tabY = 80;

    tabs.forEach((tab, i) => {
      const isActive = this.currentTab === tab.id;
      const tb = new Graphics();
      tb.beginFill(isActive ? 0x222244 : 0x111118);
      tb.lineStyle(2, isActive ? tab.color : 0x333333, isActive ? 0.8 : 0.4);
      tb.drawRoundedRect(tabStartX + i * (tabW + 8), tabY, tabW, 28, 4);
      tb.endFill();
      tb.eventMode = 'static';
      tb.cursor = 'pointer';
      tb.on('pointerdown', () => {
        this.currentTab = tab.id;
        this.scrollOffset = 0;
        this.showTitle(screenW, screenH, onStart);
      });
      this.container.addChild(tb);

      const tl = new Text(tab.label, new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: isActive ? tab.color : 0x777777, fontWeight: isActive ? 'bold' : 'normal' }));
      tl.anchor.set(0.5);
      tl.x = tabStartX + i * (tabW + 8) + tabW / 2;
      tl.y = tabY + 14;
      this.container.addChild(tl);
    });

    // === CONTENT AREA ===
    const contentY = tabY + 38;
    const contentH = screenH - contentY - 70;
    const contentW = Math.min(screenW - 40, 700);
    const contentX = screenW / 2 - contentW / 2;
    const itemH = 42;

    // Content background with scrollable area
    const contentBg = new Graphics();
    contentBg.beginFill(0x0c0c16);
    contentBg.lineStyle(1, 0x222233, 0.5);
    contentBg.drawRoundedRect(contentX, contentY, contentW, contentH, 6);
    contentBg.endFill();
    contentBg.eventMode = 'static';
    // Scroll support
    contentBg.on('wheel', (e: any) => {
      this.scrollOffset = Math.max(0, this.scrollOffset + (e.deltaY > 0 ? 1 : -1));
      this.showTitle(screenW, screenH, onStart);
    });
    this.container.addChild(contentBg);

    const maxVisible = Math.floor(contentH / (itemH + 4));
    const scrollOff = this.scrollOffset;

    if (this.currentTab === 'upgrades') {
      this.upgrades.forEach((u, i) => {
        if (i < scrollOff || i >= scrollOff + maxVisible) return;
        const y = contentY + 6 + (i - scrollOff) * (itemH + 4);
        this.drawShopItem(contentX + 6, y, contentW - 12, itemH,
          u.name, u.description,
          u.currentLevel >= u.maxLevel ? 'MAX' : `Lv.${u.currentLevel}/${u.maxLevel}`,
          u.currentLevel >= u.maxLevel ? 0 : u.cost * (u.currentLevel + 1),
          u.color, u.currentLevel >= u.maxLevel, false,
          () => {
            const cost = u.cost * (u.currentLevel + 1);
            if (this.gold >= cost && u.currentLevel < u.maxLevel) {
              this.gold -= cost; u.currentLevel++; this.save();
              this.showTitle(screenW, screenH, onStart);
            }
          }
        );
      });
    } else if (this.currentTab === 'weapons') {
      this.weapons.forEach((w, i) => {
        if (i < scrollOff || i >= scrollOff + maxVisible) return;
        const y = contentY + 6 + (i - scrollOff) * (itemH + 4);
        const isEq = this.selectedWeapon.id === w.id;
        this.drawShopItem(contentX + 6, y, contentW - 12, itemH,
          `${w.name}${isEq ? ' ✦' : ''}`, w.description,
          w.unlocked ? (isEq ? 'EQUIPPED' : 'SELECT') : '',
          w.unlocked ? 0 : w.cost, w.color, w.unlocked, isEq,
          () => {
            if (w.unlocked) {
              this.selectedWeapon = w; this.save();
            } else if (this.gold >= w.cost) {
              this.gold -= w.cost; w.unlocked = true; this.selectedWeapon = w; this.save();
            }
            this.showTitle(screenW, screenH, onStart);
          }
        );
      });
    } else if (this.currentTab === 'soldiers') {
      this.soldierUnlocks.forEach((s, i) => {
        if (i < scrollOff || i >= scrollOff + maxVisible) return;
        const y = contentY + 6 + (i - scrollOff) * (itemH + 4);
        this.drawShopItem(contentX + 6, y, contentW - 12, itemH,
          s.name, s.description,
          s.unlocked ? 'UNLOCKED' : '',
          s.unlocked ? 0 : s.cost, s.color, s.unlocked, false,
          () => {
            if (!s.unlocked && this.gold >= s.cost) {
              this.gold -= s.cost; s.unlocked = true; this.save();
              this.showTitle(screenW, screenH, onStart);
            }
          }
        );
      });
    } else if (this.currentTab === 'armor') {
      ARMOR_UNLOCKS.forEach((a, i) => {
        if (i < scrollOff || i >= scrollOff + maxVisible) return;
        const y = contentY + 6 + (i - scrollOff) * (itemH + 4);
        const owned = this.armorUnlocks.get(a.id) || false;
        const equipped = this.equippedArmor.get(a.slot) === a.id;
        const slotNames: Record<string, string> = { helmet: '투구', chest: '갑옷', boots: '장화', ring: '반지', necklace: '목걸이' };
        this.drawShopItem(contentX + 6, y, contentW - 12, itemH,
          `[${slotNames[a.slot]}] ${a.name}${equipped ? ' ✦' : ''}`, a.description,
          owned ? (equipped ? 'EQUIPPED' : 'EQUIP') : '',
          owned ? 0 : a.cost, TIER_COLORS[a.tier], owned, equipped,
          () => {
            if (owned) {
              this.equippedArmor.set(a.slot, a.id); this.save();
            } else if (this.gold >= a.cost) {
              this.gold -= a.cost; this.armorUnlocks.set(a.id, true);
              this.equippedArmor.set(a.slot, a.id); this.save();
            }
            this.showTitle(screenW, screenH, onStart);
          }
        );
      });
    } else if (this.currentTab === 'ranking') {
      this.renderRanking(contentX, contentY, contentW, contentH, screenW, screenH, onStart);
    }

    // === NAME INPUT ===
    this.renderNameInput(screenW, screenH, btnYForName(screenH));

    // === START BUTTON ===
    const btnY = screenH - 58;
    const btn = new Graphics();
    btn.beginFill(0x224422);
    btn.lineStyle(2, 0x44cc44);
    btn.drawRoundedRect(screenW / 2 - 100, btnY, 200, 44, 8);
    btn.endFill();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => { this.container.visible = false; if (this.onStartGame) this.onStartGame(); });
    btn.on('pointerover', () => { btn.tint = 0xaaffaa; });
    btn.on('pointerout', () => { btn.tint = 0xffffff; });
    this.container.addChild(btn);

    const btnText = new Text('START', new TextStyle({ ...BTN_STYLE, fontSize: 20 }));
    btnText.anchor.set(0.5);
    btnText.x = screenW / 2; btnText.y = btnY + 22;
    this.container.addChild(btnText);

    // Controls hint
    const hint = new Text('WASD: Move | Mouse: Attack | Space: Dash | 1-5: Command', new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0x555555 }));
    hint.anchor.set(0.5);
    hint.x = screenW / 2; hint.y = screenH - 10;
    this.container.addChild(hint);
  }

  private renderRanking(
    contentX: number, contentY: number, contentW: number, contentH: number,
    screenW: number, screenH: number, onStart: () => void
  ): void {
    // Header
    const header = new Text(
      isCloudEnabled() ? '🌐 글로벌 랭킹' : '💾 로컬 랭킹 (온라인 랭킹 미설정)',
      new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: isCloudEnabled() ? 0x44ff88 : 0xaaaaaa, fontWeight: 'bold' })
    );
    header.x = contentX + 12;
    header.y = contentY + 10;
    this.container.addChild(header);

    // Load scores asynchronously
    if (!this.scoresLoading && this.cachedScores.length === 0) {
      this.scoresLoading = true;
      getTopScores(50).then(scores => {
        this.cachedScores = scores;
        this.scoresLoading = false;
        if (this.container.visible) this.showTitle(screenW, screenH, onStart);
      });
    }

    if (this.cachedScores.length === 0) {
      const empty = new Text(
        this.scoresLoading ? '불러오는 중...' : '아직 기록이 없습니다. 첫 번째가 되어보세요!',
        new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0x888888 })
      );
      empty.x = contentX + 20;
      empty.y = contentY + 40;
      this.container.addChild(empty);
      return;
    }

    // Column headers
    const headerY = contentY + 34;
    const colStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0x666666, fontWeight: 'bold' });
    const col = (text: string, x: number) => {
      const t = new Text(text, colStyle);
      t.x = x; t.y = headerY;
      this.container.addChild(t);
    };
    col('#', contentX + 14);
    col('이름', contentX + 44);
    col('점수', contentX + 200);
    col('방', contentX + 280);
    col('처치', contentX + 320);
    col('승천', contentX + 380);
    col('무기', contentX + 430);

    const rowH = 22;
    const listStartY = headerY + 18;
    const visibleRows = Math.floor((contentH - 60) / rowH);

    this.cachedScores.slice(0, visibleRows).forEach((s, i) => {
      const y = listStartY + i * rowH;
      const isTop3 = i < 3;
      const isSelf = s.name === this.playerName;

      // Row bg
      if (isSelf || isTop3) {
        const bg = new Graphics();
        bg.beginFill(isSelf ? 0x223355 : 0x1a1a2a, 0.6);
        bg.drawRoundedRect(contentX + 8, y - 2, contentW - 16, rowH - 2, 3);
        bg.endFill();
        this.container.addChild(bg);
      }

      const rankColor = i === 0 ? 0xffd700 : i === 1 ? 0xcccccc : i === 2 ? 0xcd7f32 : 0x666666;
      const textColor = isSelf ? 0x88ccff : 0xcccccc;
      const rowStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: textColor });
      const rankStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: rankColor, fontWeight: 'bold' });

      const addText = (txt: string, x: number, style: TextStyle = rowStyle) => {
        const t = new Text(txt, style);
        t.x = x; t.y = y;
        this.container.addChild(t);
      };

      addText(`${i + 1}`, contentX + 14, rankStyle);
      addText(s.name.slice(0, 14), contentX + 44);
      addText(`${s.score}`, contentX + 200, new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0xffd700, fontWeight: 'bold' }));
      addText(`${s.room ?? 0}`, contentX + 280);
      addText(`${s.kills ?? 0}`, contentX + 320);
      addText(`${s.ascension ?? 0}`, contentX + 380);
      addText(s.weapon.slice(0, 8), contentX + 430);
    });
  }

  private renderNameInput(screenW: number, _screenH: number, y: number): void {
    const boxW = 260;
    const labelStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0x888888 });
    const label = new Text('이름:', labelStyle);
    label.x = screenW / 2 - boxW / 2 - 40;
    label.y = y + 8;
    this.container.addChild(label);

    const box = new Graphics();
    box.beginFill(0x111120);
    box.lineStyle(1, 0x444466, 0.8);
    box.drawRoundedRect(screenW / 2 - boxW / 2, y, boxW, 28, 4);
    box.endFill();
    box.eventMode = 'static';
    box.cursor = 'text';
    box.on('pointerdown', () => {
      const newName = prompt('플레이어 이름을 입력하세요 (최대 14자)', this.playerName);
      if (newName !== null) {
        this.playerName = newName.trim().slice(0, 14) || 'Anonymous';
        savePlayerName(this.playerName);
        this.showTitle(screenW, _screenH, this.onStartGame!);
      }
    });
    this.container.addChild(box);

    const nameText = new Text(
      this.playerName || '(클릭해서 입력)',
      new TextStyle({
        fontFamily: 'monospace', fontSize: 14,
        fill: this.playerName ? 0xffffff : 0x555555,
        fontWeight: this.playerName ? 'bold' : 'normal',
      })
    );
    nameText.anchor.set(0.5);
    nameText.x = screenW / 2;
    nameText.y = y + 14;
    this.container.addChild(nameText);
  }

  private drawShopItem(
    x: number, y: number, w: number, h: number,
    name: string, desc: string, status: string, cost: number,
    color: number, owned: boolean, highlighted: boolean,
    onClick: () => void
  ): void {
    const card = new Graphics();
    card.beginFill(highlighted ? 0x1a1a33 : 0x111120);
    card.lineStyle(1, highlighted ? 0xffd700 : (owned ? color : 0x282830), highlighted ? 0.8 : 0.5);
    card.drawRoundedRect(x, y, w, h, 4);
    card.endFill();
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.on('pointerdown', onClick);
    card.on('pointerover', () => { card.tint = 0xddddff; });
    card.on('pointerout', () => { card.tint = 0xffffff; });
    this.container.addChild(card);

    // Color pip
    const pip = new Graphics();
    pip.beginFill(color);
    pip.drawCircle(x + 14, y + h / 2, 5);
    pip.endFill();
    this.container.addChild(pip);

    // Name
    const nameText = new Text(name, new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: owned ? color : 0x888888, fontWeight: highlighted ? 'bold' : 'normal' }));
    nameText.x = x + 26; nameText.y = y + 4;
    this.container.addChild(nameText);

    // Desc
    const descText = new Text(desc, new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: 0x666666 }));
    descText.x = x + 26; descText.y = y + 22;
    this.container.addChild(descText);

    // Status / Cost
    const rightText = cost > 0 ? `${cost}G` : status;
    const rightColor = cost > 0 ? (this.gold >= cost ? 0xffd700 : 0x555555) : (highlighted ? 0xffd700 : 0x44cc44);
    const rt = new Text(rightText, new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: rightColor, fontWeight: 'bold' }));
    rt.anchor.set(1, 0.5);
    rt.x = x + w - 10; rt.y = y + h / 2;
    this.container.addChild(rt);
  }

  showGameOver(screenW: number, screenH: number, goldEarned: number, roomReached: number, onRestart: () => void): void {
    this.container.removeChildren();
    this.container.visible = true;
    this.addGold(goldEarned);

    const bg = new Graphics();
    bg.beginFill(0x000000, 0.85);
    bg.drawRect(0, 0, screenW, screenH);
    bg.endFill();
    bg.eventMode = 'static';
    this.container.addChild(bg);

    // Death text
    const deathText = new Text('DEFEATED', new TextStyle({
      fontFamily: 'monospace', fontSize: 48, fill: 0xcc2222, fontWeight: 'bold',
      dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 3,
    }));
    deathText.anchor.set(0.5);
    deathText.x = screenW / 2;
    deathText.y = screenH / 2 - 120;
    this.container.addChild(deathText);

    // Stats
    const stats = new Text(`Room Reached: ${roomReached}`, STAT_STYLE);
    stats.anchor.set(0.5);
    stats.x = screenW / 2;
    stats.y = screenH / 2 - 60;
    this.container.addChild(stats);

    // Gold earned
    const goldText = new Text(`+${goldEarned} Gold`, new TextStyle({
      fontFamily: 'monospace', fontSize: 28, fill: 0xffd700, fontWeight: 'bold',
    }));
    goldText.anchor.set(0.5);
    goldText.x = screenW / 2;
    goldText.y = screenH / 2 - 25;
    this.container.addChild(goldText);

    const totalText = new Text(`Total Gold: ${this.gold}`, new TextStyle({
      fontFamily: 'monospace', fontSize: 16, fill: 0xccaa44,
    }));
    totalText.anchor.set(0.5);
    totalText.x = screenW / 2;
    totalText.y = screenH / 2 + 10;
    this.container.addChild(totalText);

    // Return button
    const btn = new Graphics();
    btn.beginFill(0x222244);
    btn.lineStyle(2, 0x6666cc);
    btn.drawRoundedRect(screenW / 2 - 120, screenH / 2 + 50, 240, 50, 8);
    btn.endFill();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => {
      this.container.visible = false;
      onRestart();
    });
    btn.on('pointerover', () => { btn.tint = 0xaaaaff; });
    btn.on('pointerout', () => { btn.tint = 0xffffff; });
    this.container.addChild(btn);

    const btnText = new Text('RETURN TO BASE', BTN_STYLE);
    btnText.anchor.set(0.5);
    btnText.x = screenW / 2;
    btnText.y = screenH / 2 + 75;
    this.container.addChild(btnText);
  }

  showVictory(screenW: number, screenH: number, goldEarned: number, onRestart: () => void): void {
    this.container.removeChildren();
    this.container.visible = true;
    this.addGold(goldEarned);

    const bg = new Graphics();
    bg.beginFill(0x000000, 0.85);
    bg.drawRect(0, 0, screenW, screenH);
    bg.endFill();
    bg.eventMode = 'static';
    this.container.addChild(bg);

    const vicText = new Text('VICTORY!', new TextStyle({
      fontFamily: 'monospace', fontSize: 48, fill: 0xffd700, fontWeight: 'bold',
      dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 3,
    }));
    vicText.anchor.set(0.5);
    vicText.x = screenW / 2;
    vicText.y = screenH / 2 - 100;
    this.container.addChild(vicText);

    const goldText = new Text(`+${goldEarned} Gold`, new TextStyle({
      fontFamily: 'monospace', fontSize: 28, fill: 0xffd700, fontWeight: 'bold',
    }));
    goldText.anchor.set(0.5);
    goldText.x = screenW / 2;
    goldText.y = screenH / 2 - 30;
    this.container.addChild(goldText);

    const btn = new Graphics();
    btn.beginFill(0x224422);
    btn.lineStyle(2, 0x44cc44);
    btn.drawRoundedRect(screenW / 2 - 120, screenH / 2 + 30, 240, 50, 8);
    btn.endFill();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => {
      this.container.visible = false;
      onRestart();
    });
    btn.on('pointerover', () => { btn.tint = 0xaaffaa; });
    btn.on('pointerout', () => { btn.tint = 0xffffff; });
    this.container.addChild(btn);

    const btnText = new Text('RETURN TO BASE', BTN_STYLE);
    btnText.anchor.set(0.5);
    btnText.x = screenW / 2;
    btnText.y = screenH / 2 + 55;
    this.container.addChild(btnText);
  }

  hide(): void {
    this.container.visible = false;
  }
}
