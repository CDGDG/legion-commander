export interface SynergyBonus {
  defense: number;
  dodgeChance: number;
  dashPierce: boolean;
  dashRange: number;
  critChance: number;
  focusFire: boolean;
  skillCooldown: number;
  splash: boolean;
  hpRegen: number;
  revive: boolean;
}

export type SoldierType = 'swordsman' | 'spearman' | 'archer' | 'mage' | 'priest';

export type RoomRewardType = 'soldier' | 'playerBuff' | 'heal' | 'soldierBuff' | 'boss';

export interface DoorChoice {
  rewardType: RoomRewardType;
  label: string;
  description: string;
}

export type CommandStance =
  | 'attack' | 'evade' | 'protect' | 'hold'
  | 'rally' | 'execute' | 'surround' | 'wall';
export type GamePhase = 'combat' | 'doorSelect' | 'reward' | 'gameOver' | 'victory';

export class GameState {
  phase: GamePhase = 'combat';
  stance: CommandStance = 'attack';
  // Hold-stance anchor: where the army was when 'hold' was activated
  holdAnchorX = 0;
  holdAnchorY = 0;
  // Rally trigger timestamp for rally animation
  rallyTriggerTime = -1;
  room = 1;
  ascension = 0;
  totalTime = 0;

  // Rooms per region before boss
  readonly roomsPerBoss = 5;

  soldierCounts: Record<SoldierType, number> = {
    swordsman: 0,
    spearman: 0,
    archer: 0,
    mage: 0,
    priest: 0,
  };

  get totalSoldiers(): number {
    return Object.values(this.soldierCounts).reduce((a, b) => a + b, 0);
  }

  get isBossRoom(): boolean {
    return this.room % this.roomsPerBoss === 0;
  }

  get region(): number {
    return Math.ceil(this.room / this.roomsPerBoss);
  }

  getSynergyBonus(): SynergyBonus {
    const c = this.soldierCounts;
    return {
      defense: c.swordsman >= 3 ? (c.swordsman >= 6 ? 30 : 15) : 0,
      dodgeChance: c.swordsman >= 6 ? 0.2 : 0,
      dashPierce: c.spearman >= 3,
      dashRange: c.spearman >= 6 ? 30 : 0,
      critChance: c.archer >= 3 ? (c.archer >= 6 ? 0.2 : 0.1) : 0,
      focusFire: c.archer >= 6,
      skillCooldown: c.mage >= 3 ? (c.mage >= 6 ? 40 : 20) : 0,
      splash: c.mage >= 6,
      hpRegen: c.priest >= 3 ? (c.priest >= 6 ? 5 : 2) : 0,
      revive: c.priest >= 12,
    };
  }

  generateDoorChoices(): DoorChoice[] {
    const choices: DoorChoice[] = [];
    const types: RoomRewardType[] = ['soldier', 'playerBuff', 'heal', 'soldierBuff'];

    // Shuffle and pick 2-3
    const shuffled = types.sort(() => Math.random() - 0.5);
    const count = Math.random() < 0.4 ? 3 : 2;

    for (let i = 0; i < count; i++) {
      const t = shuffled[i % shuffled.length];
      switch (t) {
        case 'soldier':
          choices.push({ rewardType: 'soldier', label: '병사 영입', description: '새로운 병사를 뽑습니다' });
          break;
        case 'playerBuff':
          choices.push({ rewardType: 'playerBuff', label: '전사의 축복', description: '플레이어 능력 강화' });
          break;
        case 'heal':
          choices.push({ rewardType: 'heal', label: '치유의 샘', description: 'HP를 회복합니다' });
          break;
        case 'soldierBuff':
          choices.push({ rewardType: 'soldierBuff', label: '군단 강화', description: '병사 능력치 상승' });
          break;
      }
    }

    return choices;
  }
}
