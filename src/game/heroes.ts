/**
 * heroes.ts — 武将数据库 + 技能实现
 */

import type { Hero, Skill, GameContext, Player } from "./engine";
import { CARD_NAMES } from "./cards";

// ═══════════════════════════════════════════════
// 技能实现
// ═══════════════════════════════════════════════

const 奸雄: Skill = {
  id: "jianyiong",
  name: "奸雄",
  type: "passive",
  description: "当你造成伤害后，你可以立即获得造成伤害的牌。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3: 监听 on_deal_damage 事件，将触发牌加入手牌
  },
};

const 护驾: Skill = {
  id: "hujia",
  name: "护驾",
  type: "passive",
  description: "主公技：当你需要打出「闪」时，可令其他魏势力角色打出一张「闪」，视为由你打出。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3
  },
};

const 仁德: Skill = {
  id: "rende",
  name: "仁德",
  type: "active",
  description: "出牌阶段，你可以将任意张手牌交给其他角色，每给出第二张牌时回复1点体力。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3
  },
};

const 激将: Skill = {
  id: "jijang",
  name: "激将",
  type: "passive",
  description: "主公技：需要使用「杀」时，可令其他蜀势力角色出一张「杀」，视为由你使用。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3
  },
};

const 制衡: Skill = {
  id: "zhiheng",
  name: "制衡",
  type: "active",
  description: "出牌阶段限一次，弃置任意张牌，然后摸等量的牌。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3
  },
};

const 观星: Skill = {
  id: "guanxing",
  name: "观星",
  type: "active",
  description: "准备阶段，观看牌堆顶至多X张牌（X为存活角色数，最多5张），以任意顺序放回顶/底。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3
  },
};

const 空城: Skill = {
  id: "kongcheng",
  name: "空城",
  type: "passive",
  description: "当你没有手牌时，不能成为「杀」或决斗的目标。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3: 在目标选择验证时检查此条件
  },
};

const 龙胆: Skill = {
  id: "longdan",
  name: "龙胆",
  type: "passive",
  description: "你可以将「杀」当「闪」、「闪」当「杀」使用或打出。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3: 在出牌验证时扩展可用牌类型
  },
};

// ═══════════════════════════════════════════════
// 武将数据库
// ═══════════════════════════════════════════════

export const HEROES: Hero[] = [
  {
    id: "caocao",
    name: "曹操",
    kingdom: "wei",
    gender: "male",
    maxHp: 4,
    skills: [奸雄, 护驾],
  },
  {
    id: "liubei",
    name: "刘备",
    kingdom: "shu",
    gender: "male",
    maxHp: 4,
    skills: [仁德, 激将],
  },
  {
    id: "sunquan",
    name: "孙权",
    kingdom: "wu",
    gender: "male",
    maxHp: 4,
    skills: [制衡],
  },
  {
    id: "zhugeliang",
    name: "诸葛亮",
    kingdom: "shu",
    gender: "male",
    maxHp: 3,
    skills: [观星, 空城],
  },
  {
    id: "zhaoyun",
    name: "赵云",
    kingdom: "shu",
    gender: "male",
    maxHp: 4,
    skills: [龙胆],
  },
];

export function getHeroById(id: string): Hero | undefined {
  return HEROES.find(h => h.id === id);
}
