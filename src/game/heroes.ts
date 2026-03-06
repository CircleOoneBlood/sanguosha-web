/**
 * heroes.ts — 武将数据库 + 技能实现
 */

import type { Hero, Skill, GameContext, Player, Card } from "./engine";
import { CARD_NAMES, isCardName } from "./cards";
import type { ExtCard } from "./cards";

// ═══════════════════════════════════════════════
// 工具：从引擎上下文获取 GameEngine 实例
// （技能通过 ctx.state 操作，用 ctx.emit 通知）
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// 曹操技能
// ═══════════════════════════════════════════════

const 奸雄: Skill = {
  id: "jianyiong",
  name: "奸雄",
  type: "passive",
  description: "当你造成伤害后，你可以立即获得造成伤害的牌。",
  execute: (ctx: GameContext, player: Player) => {
    // 通过 skillEvent 检测：仅在 on_deal_damage 时触发
    const engine = ctx.state as unknown as { _engine?: { isSkillEvent?: (t: string) => boolean; getSkillEventData?: () => { card?: Card } } };
    // 注：技能系统通过 engine.triggerSkills 调用，ctx.state 不直接持有 engine
    // 实际触发在 engine.dealDamage → triggerSkills("on_deal_damage") 中
    // 此处的实现模式：技能执行时检查 ctx.state 的临时事件标记
    const flag = player.flags["jianyiong_card"] as Card | undefined;
    if (!flag) return;
    delete player.flags["jianyiong_card"];
    // 从弃牌堆找回该牌
    const idx = ctx.state.discard.findIndex(c => c.id === flag.id);
    if (idx !== -1) {
      const [card] = ctx.state.discard.splice(idx, 1);
      player.hand.push(card);
      ctx.emit("skill:trigger", { skillId: "jianyiong", playerId: player.id });
      ctx.emit("player:draw", { playerId: player.id, count: 1, cards: [card] });
    }
  },
};

const 护驾: Skill = {
  id: "hujia",
  name: "护驾",
  type: "passive",
  description: "主公技：当你需要打出「闪」时，可令其他魏势力角色打出一张「闪」，视为由你打出。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3.5：需要在响应链中拦截，较复杂，留待专项实现
  },
};

// ═══════════════════════════════════════════════
// 刘备技能
// ═══════════════════════════════════════════════

const 仁德: Skill = {
  id: "rende",
  name: "仁德",
  type: "active",
  description: "出牌阶段，你可以将任意张手牌交给其他角色，每给出第二张牌时回复1点体力。",
  execute: (_ctx: GameContext, _player: Player) => {
    // 主动技能，由前端触发 skill:use 事件，Phase 3.5 实现
  },
};

const 激将: Skill = {
  id: "jijang",
  name: "激将",
  type: "passive",
  description: "主公技：需要使用「杀」时，可令其他蜀势力角色出一张「杀」，视为由你使用。",
  execute: (_ctx: GameContext, _player: Player) => {
    // Phase 3.5 实现
  },
};

// ═══════════════════════════════════════════════
// 孙权技能
// ═══════════════════════════════════════════════

const 制衡: Skill = {
  id: "zhiheng",
  name: "制衡",
  type: "active",
  description: "出牌阶段限一次，弃置任意张牌，然后摸等量的牌。",
  execute: (ctx: GameContext, player: Player) => {
    // 检查技能使用标记
    const cards = player.flags["zhiheng_cards"] as string[] | undefined;
    if (!cards || cards.length === 0) return;
    delete player.flags["zhiheng_cards"];

    // 记录本回合已使用
    player.flags["zhiheng_used"] = true;

    const count = cards.length;
    // 弃置选定手牌
    for (const cardId of cards) {
      const idx = player.hand.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const [card] = player.hand.splice(idx, 1);
        ctx.state.discard.push(card);
      }
    }
    ctx.emit("card:discard", { cardIds: cards });
    ctx.emit("skill:trigger", { skillId: "zhiheng", playerId: player.id });

    // 摸等量牌
    for (let i = 0; i < count; i++) {
      if (ctx.state.deck.length === 0) {
        // 补牌堆（借用引擎内部方法）
        const { discard } = ctx.state;
        ctx.state.deck = discard.splice(0, discard.length).sort(() => Math.random() - 0.5);
        ctx.emit("deck:reshuffle", {});
      }
      const card = ctx.state.deck.pop();
      if (card) player.hand.push(card);
    }
    ctx.emit("player:draw", { playerId: player.id, count, cards: player.hand.slice(-count) });
  },
};

// ═══════════════════════════════════════════════
// 诸葛亮技能
// ═══════════════════════════════════════════════

const 观星: Skill = {
  id: "guanxing",
  name: "观星",
  type: "active",
  description: "准备阶段，观看牌堆顶至多X张牌（X为存活角色数，最多5张），任意顺序放回顶/底。",
  execute: (_ctx: GameContext, _player: Player) => {
    // 需要 UI 交互（展示牌堆顶，让玩家拖排），Phase 3.5 实现
  },
};

const 空城: Skill = {
  id: "kongcheng",
  name: "空城",
  type: "passive",
  description: "当你没有手牌时，不能成为「杀」或决斗的目标。",
  execute: (_ctx: GameContext, _player: Player) => {
    // 在引擎的目标验证 _canPlayCard 中通过检查目标的空城标志实现
    // 此处仅作标记用
  },
};

// ═══════════════════════════════════════════════
// 赵云技能
// ═══════════════════════════════════════════════

const 龙胆: Skill = {
  id: "longdan",
  name: "龙胆",
  type: "passive",
  description: "你可以将「杀」当「闪」、「闪」当「杀」使用或打出。",
  execute: (ctx: GameContext, player: Player) => {
    // 通过 flags 标记，让引擎在验证出牌时扩展合法牌
    // 此技能的核心逻辑在 engine._canPlayCard 中检查
    // 标记：当引擎请求出「闪」或「杀」时，检查此技能
    player.flags["longdan_active"] = true;
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
