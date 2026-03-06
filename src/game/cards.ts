/**
 * cards.ts — 标准108张牌堆定义
 * 纯数据，无副作用
 */

import type { Card, CardSuit, CardType } from "./engine";

// ─────────────────────────────────
// 牌名常量
// ─────────────────────────────────

export const CARD_NAMES = {
  // 基本牌
  SLASH: "杀",
  DODGE: "闪",
  PEACH: "桃",
  WINE: "酒",
  // 即时锦囊
  NULLIFICATION: "无懈可击",
  DISMANTLE: "过河拆桥",
  STEAL: "顺手牵羊",
  DUEL: "决斗",
  BARBARIAN: "南蛮入侵",
  ARROWS: "万箭齐发",
  PEACH_GARDEN: "桃园结义",
  DRAW_TWO: "无中生有",
  // 延时锦囊
  LIGHTNING: "闪电",
  CAROUSING: "乐不思蜀",
  FAMINE: "兵粮寸断",
  // 武器
  ZHUGE_BOW: "诸葛连弩",
  BLUE_DRAGON: "青龙偃月刀",
  TWIN_SWORDS: "雌雄双股剑",
  SKY_HALBERD: "方天画戟",
  ROCK_AXE: "贯石斧",
  KYLIN_BOW: "麒麟弓",
  ANCIENT_SWORD: "古锭刀",
  SERPENT_SPEAR: "丈八蛇矛",
  // 防具
  EIGHT_TRIGRAMS: "八卦阵",
  RENWANG_SHIELD: "仁王盾",
  // 坐骑（+1马 攻距+1）
  RED_HARE: "赤兔马",
  PURPLE_STALLION: "紫骍马",
  // 坐骑（-1马 守距-1）
  DILU: "的卢马",
  HEX_MARK: "绝影",
} as const;

export type CardName = (typeof CARD_NAMES)[keyof typeof CARD_NAMES];

// 卡牌子类型
export type BasicCardName = typeof CARD_NAMES.SLASH | typeof CARD_NAMES.DODGE | typeof CARD_NAMES.PEACH | typeof CARD_NAMES.WINE;
export type TrickCardName = typeof CARD_NAMES.NULLIFICATION | typeof CARD_NAMES.DISMANTLE | typeof CARD_NAMES.STEAL |
  typeof CARD_NAMES.DUEL | typeof CARD_NAMES.BARBARIAN | typeof CARD_NAMES.ARROWS |
  typeof CARD_NAMES.PEACH_GARDEN | typeof CARD_NAMES.DRAW_TWO |
  typeof CARD_NAMES.LIGHTNING | typeof CARD_NAMES.CAROUSING | typeof CARD_NAMES.FAMINE;

// 延时锦囊标识
export const DELAYED_TRICKS = new Set([
  CARD_NAMES.LIGHTNING,
  CARD_NAMES.CAROUSING,
  CARD_NAMES.FAMINE,
]);

// 装备类型
export type WeaponName = typeof CARD_NAMES.ZHUGE_BOW | typeof CARD_NAMES.BLUE_DRAGON | typeof CARD_NAMES.TWIN_SWORDS |
  typeof CARD_NAMES.SKY_HALBERD | typeof CARD_NAMES.ROCK_AXE | typeof CARD_NAMES.KYLIN_BOW |
  typeof CARD_NAMES.ANCIENT_SWORD | typeof CARD_NAMES.SERPENT_SPEAR;

// 武器攻击距离
export const WEAPON_RANGE: Record<WeaponName, number> = {
  [CARD_NAMES.ZHUGE_BOW]: 1,
  [CARD_NAMES.BLUE_DRAGON]: 3,
  [CARD_NAMES.TWIN_SWORDS]: 2,
  [CARD_NAMES.SKY_HALBERD]: 4,
  [CARD_NAMES.ROCK_AXE]: 3,
  [CARD_NAMES.KYLIN_BOW]: 5,
  [CARD_NAMES.ANCIENT_SWORD]: 2,
  [CARD_NAMES.SERPENT_SPEAR]: 3,
};

// ─────────────────────────────────
// 牌的扩展属性
// ─────────────────────────────────

export interface ExtCard extends Card {
  name: CardName;
  isDelayed?: boolean;   // 延时锦囊
  weaponRange?: number;  // 武器攻击范围
  equipSlot?: "weapon" | "armor" | "horse_plus" | "horse_minus";
}

// ─────────────────────────────────
// 私有：创建单张牌
// ─────────────────────────────────

let _idCounter = 0;

function mkCard(
  name: CardName,
  type: CardType,
  suit: CardSuit,
  number: number,
  extra?: Partial<ExtCard>,
): ExtCard {
  return {
    id: `card_${++_idCounter}`,
    name,
    type,
    suit,
    number,
    description: "",
    ...extra,
  };
}

function mkCards(
  name: CardName,
  type: CardType,
  entries: Array<[CardSuit, number]>,
  extra?: Partial<ExtCard>,
): ExtCard[] {
  return entries.map(([suit, num]) => mkCard(name, type, suit, num, extra));
}

// ─────────────────────────────────
// 标准108张牌堆
// ─────────────────────────────────

export function createStandardDeck(): ExtCard[] {
  _idCounter = 0; // 每次创建新牌堆重置计数器
  const deck: ExtCard[] = [];

  // ── 基本牌 ──────────────────────
  // 杀 ×30
  deck.push(...mkCards(CARD_NAMES.SLASH, "basic", [
    ["spade", 7], ["spade", 8], ["spade", 9], ["spade", 10], ["spade", 11],
    ["spade", 11], ["spade", 12], ["spade", 13], ["spade", 1],
    ["heart", 10], ["heart", 11], ["heart", 12], ["heart", 13],
    ["club", 2], ["club", 3], ["club", 4], ["club", 5], ["club", 6],
    ["club", 7], ["club", 8], ["club", 8], ["club", 9], ["club", 10],
    ["club", 11], ["club", 12], ["club", 13],
    ["diamond", 6], ["diamond", 7], ["diamond", 8], ["diamond", 9],
  ]));

  // 闪 ×15
  deck.push(...mkCards(CARD_NAMES.DODGE, "basic", [
    ["heart", 2], ["heart", 3], ["heart", 4], ["heart", 5], ["heart", 6],
    ["heart", 7], ["heart", 8], ["heart", 9],
    ["diamond", 2], ["diamond", 3], ["diamond", 4], ["diamond", 5],
    ["diamond", 10], ["diamond", 11], ["diamond", 12],
  ]));

  // 桃 ×8
  deck.push(...mkCards(CARD_NAMES.PEACH, "basic", [
    ["heart", 3], ["heart", 4], ["heart", 6], ["heart", 7],
    ["diamond", 2], ["diamond", 3], ["diamond", 4], ["diamond", 5],
  ]));

  // 酒 ×6
  deck.push(...mkCards(CARD_NAMES.WINE, "basic", [
    ["spade", 3], ["spade", 4],
    ["club", 3], ["club", 4],
    ["diamond", 3], ["diamond", 4],
  ]));

  // ── 即时锦囊 ─────────────────────
  // 无懈可击 ×4
  deck.push(...mkCards(CARD_NAMES.NULLIFICATION, "trick", [
    ["spade", 12], ["club", 12],
    ["heart", 1], ["diamond", 12],
  ]));

  // 过河拆桥 ×4
  deck.push(...mkCards(CARD_NAMES.DISMANTLE, "trick", [
    ["spade", 3], ["spade", 4], ["spade", 12],
    ["heart", 12],
  ]));

  // 顺手牵羊 ×5
  deck.push(...mkCards(CARD_NAMES.STEAL, "trick", [
    ["spade", 7], ["spade", 8],
    ["heart", 7], ["heart", 8],
    ["diamond", 7],
  ]));

  // 决斗 ×3
  deck.push(...mkCards(CARD_NAMES.DUEL, "trick", [
    ["spade", 1], ["club", 1], ["diamond", 1],
  ]));

  // 南蛮入侵 ×2
  deck.push(...mkCards(CARD_NAMES.BARBARIAN, "trick", [
    ["spade", 7], ["club", 7],
  ]));

  // 万箭齐发 ×2
  deck.push(...mkCards(CARD_NAMES.ARROWS, "trick", [
    ["heart", 1], ["diamond", 1],
  ]));

  // 桃园结义 ×1
  deck.push(mkCard(CARD_NAMES.PEACH_GARDEN, "trick", "heart", 1));

  // 无中生有 ×4
  deck.push(...mkCards(CARD_NAMES.DRAW_TWO, "trick", [
    ["heart", 7], ["heart", 8], ["heart", 9], ["heart", 11],
  ]));

  // ── 延时锦囊 ─────────────────────
  // 闪电 ×1
  deck.push(mkCard(CARD_NAMES.LIGHTNING, "trick", "spade", 1, { isDelayed: true }));

  // 乐不思蜀 ×3
  deck.push(...mkCards(CARD_NAMES.CAROUSING, "trick", [
    ["heart", 6], ["heart", 7], ["heart", 8],
  ], { isDelayed: true }));

  // 兵粮寸断 ×4
  deck.push(...mkCards(CARD_NAMES.FAMINE, "trick", [
    ["spade", 10], ["club", 4], ["club", 10], ["diamond", 4],
  ], { isDelayed: true }));

  // ── 装备牌 ───────────────────────
  // 武器
  deck.push(mkCard(CARD_NAMES.ZHUGE_BOW, "equip", "spade", 1,
    { equipSlot: "weapon", weaponRange: 1 }));
  deck.push(mkCard(CARD_NAMES.BLUE_DRAGON, "equip", "spade", 5,
    { equipSlot: "weapon", weaponRange: 3 }));
  deck.push(mkCard(CARD_NAMES.TWIN_SWORDS, "equip", "spade", 2,
    { equipSlot: "weapon", weaponRange: 2 }));
  deck.push(mkCard(CARD_NAMES.SKY_HALBERD, "equip", "heart", 12,
    { equipSlot: "weapon", weaponRange: 4 }));
  deck.push(mkCard(CARD_NAMES.ROCK_AXE, "equip", "spade", 6,
    { equipSlot: "weapon", weaponRange: 3 }));
  deck.push(mkCard(CARD_NAMES.KYLIN_BOW, "equip", "heart", 5,
    { equipSlot: "weapon", weaponRange: 5 }));
  deck.push(mkCard(CARD_NAMES.ANCIENT_SWORD, "equip", "spade", 6,
    { equipSlot: "weapon", weaponRange: 2 }));
  deck.push(mkCard(CARD_NAMES.SERPENT_SPEAR, "equip", "spade", 12,
    { equipSlot: "weapon", weaponRange: 3 }));

  // 防具
  deck.push(mkCard(CARD_NAMES.EIGHT_TRIGRAMS, "equip", "spade", 2,
    { equipSlot: "armor" }));
  deck.push(mkCard(CARD_NAMES.RENWANG_SHIELD, "equip", "club", 2,
    { equipSlot: "armor" }));

  // +1马（攻击距离+1）
  deck.push(mkCard(CARD_NAMES.RED_HARE, "equip", "heart", 5,
    { equipSlot: "horse_plus" }));
  deck.push(mkCard(CARD_NAMES.PURPLE_STALLION, "equip", "spade", 5,
    { equipSlot: "horse_plus" }));

  // -1马（防御距离-1）
  deck.push(mkCard(CARD_NAMES.DILU, "equip", "club", 5,
    { equipSlot: "horse_minus" }));
  deck.push(mkCard(CARD_NAMES.HEX_MARK, "equip", "diamond", 5,
    { equipSlot: "horse_minus" }));

  return shuffle(deck);
}

// Fisher-Yates 洗牌
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 判断是否为某名称的牌
export function isCardName(card: Card, name: CardName): boolean {
  return (card as ExtCard).name === name;
}

export function isBasicCard(card: Card): boolean {
  return card.type === "basic";
}

export function isEquip(card: Card): boolean {
  return card.type === "equip";
}

export function isDelayedTrick(card: Card): boolean {
  return !!(card as ExtCard).isDelayed;
}
