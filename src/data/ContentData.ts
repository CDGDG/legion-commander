/**
 * MASSIVE CONTENT DATA
 * 조합 공간형 설계: 카테고리 × 속성 × 메커니즘 = 수백 가지 조합
 */

// =============================================================
// WEAPONS: 7 categories × element runes × mechanism runes
// =============================================================
export interface WeaponBase {
  id: string;
  name: string;
  category: WeaponCategory;
  atkMult: number;
  rangeMult: number;
  rateMult: number;
  description: string;
  cost: number;
  tier: number; // 0=basic, 1=rare, 2=legend, 3=mythic
}

export type WeaponCategory = 'sword' | 'dagger' | 'spear' | 'axe' | 'bow' | 'staff' | 'mace';

export const WEAPON_BASES: WeaponBase[] = [
  // ===== SWORDS =====
  { id: 'iron_sword', name: '철검', category: 'sword', atkMult: 1.0, rangeMult: 1.0, rateMult: 1.0, description: '기본 검', cost: 0, tier: 0 },
  { id: 'knight_sword', name: '기사검', category: 'sword', atkMult: 1.2, rangeMult: 1.1, rateMult: 0.95, description: '가드 후 강타. 검병 시너지', cost: 80, tier: 1 },
  { id: 'kings_blade', name: '왕의 성검', category: 'sword', atkMult: 1.5, rangeMult: 1.2, rateMult: 0.85, description: '처치 시 5% 재베기. 검병 수 비례 추가 참격', cost: 200, tier: 2 },
  { id: 'divine_sword', name: '신성검 엑스칼리버', category: 'sword', atkMult: 2.0, rangeMult: 1.4, rateMult: 0.8, description: '공격 시 빛의 폭발. 전 병사 공격력 +15%', cost: 500, tier: 3 },

  // ===== DAGGERS =====
  { id: 'iron_dagger', name: '철 단검', category: 'dagger', atkMult: 0.6, rangeMult: 0.7, rateMult: 0.4, description: '빠른 공격', cost: 0, tier: 0 },
  { id: 'venom_fang', name: '독니', category: 'dagger', atkMult: 0.7, rangeMult: 0.7, rateMult: 0.35, description: '공격 시 독 중첩 (3초간 10%추가)', cost: 80, tier: 1 },
  { id: 'shadow_blade', name: '월영쌍도', category: 'dagger', atkMult: 0.8, rangeMult: 0.8, rateMult: 0.3, description: '대시 후 분신 참격. 궁수 연동 크리율+', cost: 200, tier: 2 },
  { id: 'void_edge', name: '공허의 칼날', category: 'dagger', atkMult: 1.0, rangeMult: 0.9, rateMult: 0.25, description: '적 처치마다 영구 공속+2%. 백어택 3배', cost: 500, tier: 3 },

  // ===== SPEARS =====
  { id: 'long_spear', name: '롱스피어', category: 'spear', atkMult: 1.1, rangeMult: 1.6, rateMult: 0.9, description: '긴 사거리, 직선 관통', cost: 0, tier: 0 },
  { id: 'cavalry_lance', name: '기병창', category: 'spear', atkMult: 1.3, rangeMult: 1.8, rateMult: 0.85, description: '이동속도 비례 피해+. 창병 연동', cost: 100, tier: 1 },
  { id: 'dragon_fang', name: '용아창', category: 'spear', atkMult: 1.5, rangeMult: 2.0, rateMult: 0.8, description: '적 밀집도 비례 폭딜. 관통 시 잔상', cost: 250, tier: 2 },
  { id: 'gungnir', name: '궁니르', category: 'spear', atkMult: 2.0, rangeMult: 2.5, rateMult: 0.75, description: '투척 가능. 번개 체인. 창병 궁극 시너지', cost: 600, tier: 3 },

  // ===== AXES =====
  { id: 'hatchet', name: '벌목도끼', category: 'axe', atkMult: 1.3, rangeMult: 0.9, rateMult: 0.7, description: 'HP 30% 이하 적에게 처형 데미지', cost: 60, tier: 0 },
  { id: 'berserker_axe', name: '광전사의 도끼', category: 'axe', atkMult: 1.5, rangeMult: 1.0, rateMult: 0.65, description: '잃은 HP 비례 공격력+. 위험할수록 강함', cost: 120, tier: 1 },
  { id: 'thunder_axe', name: '천둥도끼', category: 'axe', atkMult: 1.8, rangeMult: 1.1, rateMult: 0.6, description: '5회째 공격에 번개 (주변 적 피해)', cost: 300, tier: 2 },
  { id: 'worldsplitter', name: '세계분리자', category: 'axe', atkMult: 2.5, rangeMult: 1.3, rateMult: 0.5, description: '광역 지진 공격. 적 방어 무시. 보스킬러', cost: 700, tier: 3 },

  // ===== BOWS =====
  { id: 'hunting_bow', name: '사냥활', category: 'bow', atkMult: 0.8, rangeMult: 2.5, rateMult: 1.0, description: '가장 먼 적 우선 저격', cost: 0, tier: 0 },
  { id: 'rapid_bow', name: '연사궁', category: 'bow', atkMult: 0.7, rangeMult: 2.0, rateMult: 0.5, description: '연속 사격시 공속 가속. 궁수 연동', cost: 100, tier: 1 },
  { id: 'moonlight_bow', name: '월광궁', category: 'bow', atkMult: 1.0, rangeMult: 3.0, rateMult: 0.8, description: '크리티컬 시 유도 화살 3발', cost: 280, tier: 2 },
  { id: 'star_rain', name: '별비의 궁', category: 'bow', atkMult: 1.2, rangeMult: 4.0, rateMult: 0.7, description: '주기적 화살비. 전 궁수 사거리+50%', cost: 650, tier: 3 },

  // ===== STAVES =====
  { id: 'magic_wand', name: '마도봉', category: 'staff', atkMult: 1.0, rangeMult: 2.0, rateMult: 1.1, description: '평타가 마법탄', cost: 0, tier: 0 },
  { id: 'frost_staff', name: '빙결지팡이', category: 'staff', atkMult: 1.1, rangeMult: 2.2, rateMult: 1.0, description: '둔화 장판 생성. 얼음 테마 강화', cost: 120, tier: 1 },
  { id: 'comet_staff', name: '혜성의 지팡이', category: 'staff', atkMult: 1.5, rangeMult: 2.5, rateMult: 0.9, description: '주기적 운석 소환. 마법사 연동', cost: 300, tier: 2 },
  { id: 'archmage_orb', name: '대마법사의 보주', category: 'staff', atkMult: 2.0, rangeMult: 3.0, rateMult: 0.8, description: '궁극 마법 자동시전. 마법사 궁극 시너지', cost: 700, tier: 3 },

  // ===== MACES =====
  { id: 'iron_mace', name: '철퇴', category: 'mace', atkMult: 1.2, rangeMult: 0.8, rateMult: 0.75, description: '기절 누적. 방패병 관통', cost: 50, tier: 0 },
  { id: 'holy_hammer', name: '성전 망치', category: 'mace', atkMult: 1.4, rangeMult: 0.9, rateMult: 0.7, description: '성직자 수 비례 충격파', cost: 130, tier: 1 },
  { id: 'war_flail', name: '전쟁 도리깨', category: 'mace', atkMult: 1.7, rangeMult: 1.0, rateMult: 0.6, description: '회전 공격. 주변 적 다수 타격', cost: 320, tier: 2 },
  { id: 'mjolnir', name: '묠니르', category: 'mace', atkMult: 2.2, rangeMult: 1.2, rateMult: 0.55, description: '투척+귀환. 번개 폭풍. 전 병사 기절 부여', cost: 750, tier: 3 },
];

// =============================================================
// ARMOR: 5 slots × 4 tiers
// =============================================================
export type ArmorSlot = 'helmet' | 'chest' | 'boots' | 'ring' | 'necklace';

export interface ArmorPiece {
  id: string;
  name: string;
  slot: ArmorSlot;
  tier: number;
  cost: number;
  description: string;
  effects: Record<string, number>; // stat modifications
}

export const ARMOR_DATA: ArmorPiece[] = [
  // HELMETS
  { id: 'iron_helm', name: '철 투구', slot: 'helmet', tier: 0, cost: 40, description: 'HP +15', effects: { hp: 15 } },
  { id: 'scout_helm', name: '정찰병 투구', slot: 'helmet', tier: 1, cost: 100, description: '크리율 +8%. 시야 범위 확대', effects: { crit: 0.08 } },
  { id: 'warlord_helm', name: '전쟁군주 투구', slot: 'helmet', tier: 2, cost: 250, description: '병사 공격력 +10%. 지휘 범위 확대', effects: { armyAtk: 0.1 } },
  { id: 'crown_conqueror', name: '정복자의 왕관', slot: 'helmet', tier: 3, cost: 600, description: '전 병사 시너지 1단계 감소', effects: { synergyReduce: 1 } },

  // CHEST
  { id: 'leather_armor', name: '가죽 갑옷', slot: 'chest', tier: 0, cost: 50, description: '방어력 +10%', effects: { defense: 0.1 } },
  { id: 'chain_mail', name: '사슬 갑옷', slot: 'chest', tier: 1, cost: 120, description: '방어 +15%. 피격시 반격 확률', effects: { defense: 0.15, counter: 0.1 } },
  { id: 'plate_armor', name: '판금 갑옷', slot: 'chest', tier: 2, cost: 280, description: '방어 +25%. 3초마다 보호막 생성', effects: { defense: 0.25, shield: 1 } },
  { id: 'divine_plate', name: '신성 판금갑', slot: 'chest', tier: 3, cost: 650, description: '방어 +40%. 사망 시 전체 힐 후 부활', effects: { defense: 0.4, revive: 1 } },

  // BOOTS
  { id: 'leather_boots', name: '가죽 장화', slot: 'boots', tier: 0, cost: 35, description: '이동속도 +15', effects: { speed: 15 } },
  { id: 'wind_boots', name: '질풍의 장화', slot: 'boots', tier: 1, cost: 90, description: '이동속도 +30. 대시 거리 +20%', effects: { speed: 30, dashRange: 0.2 } },
  { id: 'shadow_boots', name: '그림자 장화', slot: 'boots', tier: 2, cost: 220, description: '대시 쿨 -0.4s. 대시 후 투명 1초', effects: { dashCool: 0.4, stealth: 1 } },
  { id: 'hermes_sandal', name: '헤르메스의 신발', slot: 'boots', tier: 3, cost: 550, description: '이동속도 +80. 대시 횟수 2회. 이동 잔상', effects: { speed: 80, doubleDash: 1 } },

  // RINGS
  { id: 'iron_ring', name: '철 반지', slot: 'ring', tier: 0, cost: 45, description: '공격력 +3', effects: { atk: 3 } },
  { id: 'ruby_ring', name: '루비 반지', slot: 'ring', tier: 1, cost: 110, description: '처치 시 HP 2회복. 골드 +20%', effects: { lifeSteal: 2, goldBonus: 0.2 } },
  { id: 'summon_ring', name: '소환사의 반지', slot: 'ring', tier: 2, cost: 260, description: '보스 처치 시 추가 병사 소환. 시너지 강화', effects: { bossRecruit: 2, synergyBoost: 0.15 } },
  { id: 'ring_domination', name: '지배의 반지', slot: 'ring', tier: 3, cost: 620, description: '적 처치 시 5% 확률로 적을 아군으로 변환', effects: { convert: 0.05 } },

  // NECKLACES
  { id: 'charm', name: '부적', slot: 'necklace', tier: 0, cost: 40, description: 'HP 재생 +1/초', effects: { regen: 1 } },
  { id: 'war_medal', name: '전쟁 훈장', slot: 'necklace', tier: 1, cost: 100, description: '병사 HP +20%. 사기 시스템 활성화', effects: { armyHp: 0.2 } },
  { id: 'generals_insignia', name: '장군의 휘장', slot: 'necklace', tier: 2, cost: 250, description: '지휘 명령 쿨타임 -30%. 전투 오라 범위 확대', effects: { commandCool: 0.3, auraRange: 0.3 } },
  { id: 'amulet_eternity', name: '영원의 목걸이', slot: 'necklace', tier: 3, cost: 600, description: '스킬 쿨 50% 감소. 궁극기 자동 충전', effects: { skillCool: 0.5, autoUlt: 1 } },
];

// =============================================================
// SOLDIERS: 12 types (5 basic + 4 advanced + 3 special)
// =============================================================
export interface SoldierDef {
  id: string;
  name: string;
  tier: 'basic' | 'advanced' | 'special';
  role: string;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackRate: number;
  cost: number; // unlock cost
  description: string;
  synergyDesc: string;
  color: number;
}

export const SOLDIER_DEFS: SoldierDef[] = [
  // BASIC (free / cheap)
  { id: 'swordsman', name: '검병', tier: 'basic', role: '전열 탱커', hp: 50, speed: 110, damage: 7, attackRange: 25, attackRate: 0.7, cost: 0, description: '전열에서 적을 막아내는 기본 전사', synergyDesc: '3/6/12: 플레이어 방어/회피/보호막', color: 0x3366cc },
  { id: 'archer', name: '궁수', tier: 'basic', role: '후열 딜러', hp: 20, speed: 85, damage: 8, attackRange: 200, attackRate: 1.0, cost: 0, description: '후방에서 원거리 사격을 하는 사수', synergyDesc: '3/6/12: 플레이어 크리율/집중사격/화살비', color: 0x33aa33 },
  { id: 'spearman', name: '창병', tier: 'basic', role: '중거리 견제', hp: 35, speed: 120, damage: 10, attackRange: 45, attackRate: 0.9, cost: 60, description: '긴 사거리로 적을 견제하는 창술사', synergyDesc: '3/6/12: 대시관통/대시거리/대시데미지', color: 0x2299aa },
  { id: 'mage', name: '마법사', tier: 'basic', role: '광역 딜러', hp: 15, speed: 75, damage: 14, attackRange: 160, attackRate: 1.8, cost: 80, description: '강력한 마법으로 다수의 적을 쓸어버림', synergyDesc: '3/6/12: 스킬쿨감/스플래시/궁극마법', color: 0x8833cc },
  { id: 'priest', name: '성직자', tier: 'basic', role: '치유 지원', hp: 25, speed: 95, damage: 0, attackRange: 130, attackRate: 2.0, cost: 100, description: '아군을 치유하고 축복을 내리는 신관', synergyDesc: '3/6/12: HP재생/전체힐/부활', color: 0xccaa22 },

  // ADVANCED (expensive, powerful)
  { id: 'royal_guard', name: '근위검사', tier: 'advanced', role: '엘리트 탱커', hp: 100, speed: 95, damage: 12, attackRange: 30, attackRate: 0.6, cost: 200, description: '왕의 호위. 플레이어 근처에서 방어벽 형성', synergyDesc: '2/4: 플레이어 피격 시 대신 막아줌', color: 0x4477dd },
  { id: 'crossbowman', name: '석궁병', tier: 'advanced', role: '관통 딜러', hp: 25, speed: 70, damage: 18, attackRange: 250, attackRate: 2.5, cost: 200, description: '느리지만 강력한 관통 볼트를 발사', synergyDesc: '2/4: 방어 무시/방패병 관통', color: 0x669944 },
  { id: 'archmage', name: '대마도사', tier: 'advanced', role: '궁극 마법', hp: 20, speed: 65, damage: 25, attackRange: 200, attackRate: 3.0, cost: 300, description: '파괴적인 궁극 마법을 시전', synergyDesc: '2/4: 주기적 운석/보스 약화 디버프', color: 0xaa55ff },
  { id: 'high_priest', name: '대사제', tier: 'advanced', role: '전체 버프', hp: 40, speed: 80, damage: 0, attackRange: 180, attackRate: 3.0, cost: 300, description: '전체 아군에게 축복과 보호를 내림', synergyDesc: '2/4: 전체 병사 공격력+/부활 오라', color: 0xddbb44 },

  // SPECIAL (very expensive, unique mechanics)
  { id: 'assassin', name: '암살자', tier: 'special', role: '은밀 처형', hp: 15, speed: 200, damage: 30, attackRange: 15, attackRate: 2.0, cost: 400, description: '적 후방으로 순간이동해 고가치 대상 암살', synergyDesc: '1/3: 엘리트 우선/보스 약점 공격', color: 0x555577 },
  { id: 'banner_bearer', name: '깃발병', tier: 'special', role: '사기 버프', hp: 60, speed: 100, damage: 3, attackRange: 20, attackRate: 1.0, cost: 350, description: '주변 아군의 공격력과 방어력을 증폭', synergyDesc: '1/2: 오라 범위 확대/이동속도 버프', color: 0xff8844 },
  { id: 'berserker', name: '광전사', tier: 'special', role: '자해 딜러', hp: 80, speed: 140, damage: 20, attackRange: 25, attackRate: 0.4, cost: 450, description: 'HP가 낮을수록 강해지는 광기의 전사', synergyDesc: '1/3: 체력 50% 이하 시 공격력 3배', color: 0xcc4444 },
];

// =============================================================
// SKILL TREE: 3 paths
// =============================================================
export interface SkillNode {
  id: string;
  name: string;
  path: 'warrior' | 'mage' | 'commander';
  tier: number; // 0-4, each tier costs more
  cost: number;
  maxLevel: number;
  description: string;
  effect: string;
}

export const SKILL_TREE: SkillNode[] = [
  // WARRIOR PATH
  { id: 'w_power', name: '힘의 단련', path: 'warrior', tier: 0, cost: 30, maxLevel: 5, description: '공격력 +4/레벨', effect: 'atk' },
  { id: 'w_tough', name: '강인함', path: 'warrior', tier: 0, cost: 25, maxLevel: 5, description: 'HP +20/레벨', effect: 'hp' },
  { id: 'w_fury', name: '분노', path: 'warrior', tier: 1, cost: 60, maxLevel: 3, description: '처치 시 3초간 공속 +20%/레벨', effect: 'fury' },
  { id: 'w_cleave', name: '대검술', path: 'warrior', tier: 1, cost: 60, maxLevel: 3, description: '공격 범위 +15%/레벨', effect: 'range' },
  { id: 'w_crit', name: '급소 공격', path: 'warrior', tier: 2, cost: 100, maxLevel: 3, description: '크리율 +8%/레벨, 크리뎀 +25%/레벨', effect: 'crit' },
  { id: 'w_execute', name: '처형자', path: 'warrior', tier: 3, cost: 150, maxLevel: 2, description: 'HP 25% 이하 적에게 2배/3배 피해', effect: 'execute' },
  { id: 'w_ultimate', name: '전쟁의 화신', path: 'warrior', tier: 4, cost: 300, maxLevel: 1, description: 'HP 50% 이하 시 전 능력치 +30%', effect: 'warGod' },

  // MAGE PATH
  { id: 'm_intel', name: '마력 증강', path: 'mage', tier: 0, cost: 30, maxLevel: 5, description: '스킬 데미지 +8%/레벨', effect: 'spellDmg' },
  { id: 'm_regen', name: '마력 재생', path: 'mage', tier: 0, cost: 25, maxLevel: 5, description: 'HP 재생 +1/초/레벨', effect: 'regen' },
  { id: 'm_frost', name: '빙결 장막', path: 'mage', tier: 1, cost: 60, maxLevel: 3, description: '공격 시 15%/레벨 둔화 부여', effect: 'slow' },
  { id: 'm_chain', name: '연쇄 번개', path: 'mage', tier: 1, cost: 60, maxLevel: 3, description: '공격 적중 시 주변 1/2/3 적에게 번개', effect: 'chain' },
  { id: 'm_shield', name: '마법 방벽', path: 'mage', tier: 2, cost: 100, maxLevel: 3, description: '10/8/6초마다 보호막 생성', effect: 'magicShield' },
  { id: 'm_meteor', name: '운석 낙하', path: 'mage', tier: 3, cost: 150, maxLevel: 2, description: '15/10초마다 자동 운석 소환', effect: 'meteor' },
  { id: 'm_ultimate', name: '아크메이지', path: 'mage', tier: 4, cost: 300, maxLevel: 1, description: '모든 마법 효과 2배. 마법사 병종 궁극 해금', effect: 'archmage' },

  // COMMANDER PATH
  { id: 'c_recruit', name: '징집령', path: 'commander', tier: 0, cost: 30, maxLevel: 5, description: '시작 시 추가 병사 +1/레벨', effect: 'startArmy' },
  { id: 'c_morale', name: '사기 고취', path: 'commander', tier: 0, cost: 25, maxLevel: 5, description: '병사 공격력 +5%/레벨', effect: 'armyAtk' },
  { id: 'c_tactics', name: '전술 지휘', path: 'commander', tier: 1, cost: 60, maxLevel: 3, description: '지휘 명령 쿨타임 -15%/레벨', effect: 'commandCool' },
  { id: 'c_formation', name: '진형 유지', path: 'commander', tier: 1, cost: 60, maxLevel: 3, description: '병사 방어력 +10%/레벨', effect: 'armyDef' },
  { id: 'c_synergy', name: '시너지 마스터', path: 'commander', tier: 2, cost: 100, maxLevel: 3, description: '시너지 발동 조건 -1/레벨', effect: 'synergyReduce' },
  { id: 'c_elite', name: '정예 훈련', path: 'commander', tier: 3, cost: 150, maxLevel: 2, description: '병사 등장 시 20%/40% 확률로 강화 버전', effect: 'eliteChance' },
  { id: 'c_ultimate', name: '대원수', path: 'commander', tier: 4, cost: 300, maxLevel: 1, description: '모든 병사 시너지 동시 발동. 군단 궁극기 해금', effect: 'grandMarshal' },
];

// =============================================================
// PRESTIGE / ASCENSION
// =============================================================
export interface AscensionLevel {
  level: number;
  name: string;
  enemyHpMult: number;
  enemyDmgMult: number;
  enemySpeedMult: number;
  goldMult: number;
  newMechanic: string;
}

export const ASCENSION_LEVELS: AscensionLevel[] = [
  { level: 0, name: '일반', enemyHpMult: 1.0, enemyDmgMult: 1.0, enemySpeedMult: 1.0, goldMult: 1.0, newMechanic: '' },
  { level: 1, name: '전사', enemyHpMult: 1.5, enemyDmgMult: 1.3, enemySpeedMult: 1.1, goldMult: 1.5, newMechanic: '적 엘리트 빈도 증가' },
  { level: 2, name: '영웅', enemyHpMult: 2.0, enemyDmgMult: 1.6, enemySpeedMult: 1.2, goldMult: 2.0, newMechanic: '적 특수 능력 해금' },
  { level: 3, name: '전설', enemyHpMult: 3.0, enemyDmgMult: 2.0, enemySpeedMult: 1.3, goldMult: 3.0, newMechanic: '미니보스 추가 등장' },
  { level: 4, name: '신화', enemyHpMult: 4.0, enemyDmgMult: 2.5, enemySpeedMult: 1.4, goldMult: 4.0, newMechanic: '변이 적 등장' },
  { level: 5, name: '불멸', enemyHpMult: 6.0, enemyDmgMult: 3.0, enemySpeedMult: 1.5, goldMult: 6.0, newMechanic: '적 재생/보호막 부여' },
  { level: 6, name: '초월', enemyHpMult: 8.0, enemyDmgMult: 4.0, enemySpeedMult: 1.6, goldMult: 8.0, newMechanic: '2보스 동시 등장' },
  { level: 7, name: '심연', enemyHpMult: 12.0, enemyDmgMult: 5.0, enemySpeedMult: 1.8, goldMult: 12.0, newMechanic: '무한 스케일링 시작' },
];

// =============================================================
// COMMAND STANCES (1-2-3 keys)
// =============================================================
export type CommandStance = 'defensive' | 'aggressive' | 'follow' | 'spread' | 'charge';

export interface StanceDef {
  id: CommandStance;
  key: string;
  name: string;
  description: string;
  armySpeedMult: number;
  armyAtkMult: number;
  armyDefMult: number;
  formation: string; // how soldiers position
}

export const STANCES: StanceDef[] = [
  { id: 'defensive', key: '1', name: '수비', description: '플레이어 주변 밀착. 방어력 UP, 공격력 DOWN', armySpeedMult: 0.8, armyAtkMult: 0.7, armyDefMult: 1.5, formation: 'tight' },
  { id: 'aggressive', key: '2', name: '공격', description: '적극적으로 적 추격. 공격력 UP, 방어력 DOWN', armySpeedMult: 1.3, armyAtkMult: 1.4, armyDefMult: 0.7, formation: 'spread' },
  { id: 'follow', key: '3', name: '추종', description: '플레이어를 따라다니며 균형 잡힌 전투', armySpeedMult: 1.0, armyAtkMult: 1.0, armyDefMult: 1.0, formation: 'medium' },
  { id: 'spread', key: '4', name: '산개', description: '넓게 퍼져 전장 제어. 광역 커버', armySpeedMult: 1.1, armyAtkMult: 0.9, armyDefMult: 0.9, formation: 'wide' },
  { id: 'charge', key: '5', name: '돌격', description: '마우스 위치로 전원 돌격! 폭발적 화력', armySpeedMult: 1.8, armyAtkMult: 1.6, armyDefMult: 0.5, formation: 'charge' },
];

// =============================================================
// ACHIEVEMENTS
// =============================================================
export interface Achievement {
  id: string;
  name: string;
  description: string;
  reward: number; // gold
  condition: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_clear', name: '첫 승리', description: '첫 번째 런 클리어', reward: 50, condition: 'clear_1' },
  { id: 'army_20', name: '소규모 군단', description: '병사 20명 이상 보유', reward: 30, condition: 'army_20' },
  { id: 'army_50', name: '대군단', description: '병사 50명 이상 보유', reward: 80, condition: 'army_50' },
  { id: 'army_100', name: '전쟁의 군주', description: '병사 100명 이상 보유', reward: 200, condition: 'army_100' },
  { id: 'kill_100', name: '백인참', description: '한 런에서 적 100명 처치', reward: 40, condition: 'kills_100' },
  { id: 'kill_500', name: '학살자', description: '한 런에서 적 500명 처치', reward: 100, condition: 'kills_500' },
  { id: 'kill_1000', name: '전설의 전사', description: '한 런에서 적 1000명 처치', reward: 300, condition: 'kills_1000' },
  { id: 'no_damage', name: '무적', description: '보스를 무피해로 처치', reward: 150, condition: 'no_dmg_boss' },
  { id: 'speed_run', name: '속전속결', description: '3분 이내 클리어', reward: 100, condition: 'clear_under_180' },
  { id: 'all_synergy', name: '시너지 마스터', description: '한 런에서 5종 시너지 동시 발동', reward: 200, condition: 'all_synergy' },
  { id: 'ascend_1', name: '전사의 길', description: '승천 1단계 도달', reward: 100, condition: 'ascend_1' },
  { id: 'ascend_3', name: '전설의 시작', description: '승천 3단계 도달', reward: 300, condition: 'ascend_3' },
  { id: 'ascend_5', name: '불멸의 경지', description: '승천 5단계 도달', reward: 500, condition: 'ascend_5' },
  { id: 'ascend_7', name: '심연을 넘어서', description: '승천 7단계 도달', reward: 1000, condition: 'ascend_7' },
  { id: 'all_weapons', name: '무기 수집가', description: '모든 무기 해금', reward: 500, condition: 'all_weapons' },
  { id: 'all_soldiers', name: '군단 완성', description: '모든 병사 해금', reward: 500, condition: 'all_soldiers' },
  { id: 'all_armor', name: '갑옷 수집가', description: '모든 방어구 해금', reward: 500, condition: 'all_armor' },
  { id: 'gold_10000', name: '부자', description: '골드 10,000 누적 획득', reward: 200, condition: 'gold_10000' },
  { id: 'berserker_clear', name: '광전사의 승리', description: '광전사만으로 클리어', reward: 300, condition: 'berserker_only' },
  { id: 'pacifist', name: '지휘관', description: '플레이어 직접 처치 0으로 클리어', reward: 400, condition: 'no_player_kills' },
];
