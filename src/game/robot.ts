/**
 * robot.ts — AI 机器人决策逻辑
 * 纯函数，基于当前 GameState 做决策
 * 难度：简单（贪心策略）
 */

import type { Player, Card, GameState, ResponseResult } from "./engine";
import { CARD_NAMES, isCardName } from "./cards";
import type { ExtCard } from "./cards";

// ─────────────────────────────────
// 出牌决策
// ─────────────────────────────────

export interface RobotAction {
  type: "play" | "end_turn";
  cardId?: string;
  targetIds?: string[];
}

/**
 * 机器人决定这回合出什么牌
 * 返回 null 表示不出牌（结束出牌阶段）
 */
export function decidePlay(robot: Player, state: GameState): RobotAction {
  const enemies = getEnemies(robot, state);
  const allies = getAllies(robot, state);

  // 1. 优先用桃回血（血量 ≤ 1 时）
  if (robot.hp <= 1) {
    const peach = robot.hand.find(c => isCardName(c, CARD_NAMES.PEACH));
    if (peach && robot.hp < robot.maxHp) {
      return { type: "play", cardId: peach.id, targetIds: [] };
    }
  }

  // 2. 对血量最低的敌人出杀
  const slash = robot.hand.find(c => isCardName(c, CARD_NAMES.SLASH));
  if (slash && robot.slashCount === 0) {
    const target = pickWeakestEnemy(robot, enemies, state);
    if (target) {
      return { type: "play", cardId: slash.id, targetIds: [target.id] };
    }
  }

  // 3. 对敌人使用决斗（如无杀可用）
  if (!slash || robot.slashCount > 0) {
    const duel = robot.hand.find(c => isCardName(c, CARD_NAMES.DUEL));
    if (duel) {
      const target = pickWeakestEnemy(robot, enemies, state);
      if (target) {
        return { type: "play", cardId: duel.id, targetIds: [target.id] };
      }
    }
  }

  // 4. 南蛮入侵 / 万箭齐发（AOE）
  const aoe = robot.hand.find(c =>
    isCardName(c, CARD_NAMES.BARBARIAN) || isCardName(c, CARD_NAMES.ARROWS)
  );
  if (aoe && enemies.length >= 2) {
    return { type: "play", cardId: aoe.id, targetIds: [] };
  }

  // 5. 桃园结义（自己血量不满时）
  if (robot.hp < robot.maxHp) {
    const peachGarden = robot.hand.find(c => isCardName(c, CARD_NAMES.PEACH_GARDEN));
    if (peachGarden) {
      return { type: "play", cardId: peachGarden.id, targetIds: [] };
    }
  }

  // 6. 过河拆桥 / 顺手牵羊（针对最强敌人）
  const dismantle = robot.hand.find(c => isCardName(c, CARD_NAMES.DISMANTLE));
  const steal = robot.hand.find(c => isCardName(c, CARD_NAMES.STEAL));
  if (dismantle || steal) {
    const richEnemy = enemies
      .filter(p => p.hand.length > 0 || Object.values(p.equips).some(Boolean))
      .sort((a, b) => (b.hand.length + Object.values(b.equips).filter(Boolean).length)
        - (a.hand.length + Object.values(a.equips).filter(Boolean).length))[0];
    if (richEnemy) {
      const card = steal ?? dismantle!;
      return { type: "play", cardId: card.id, targetIds: [richEnemy.id] };
    }
  }

  // 7. 无中生有（摸牌）
  const drawTwo = robot.hand.find(c => isCardName(c, CARD_NAMES.DRAW_TWO));
  if (drawTwo) {
    return { type: "play", cardId: drawTwo.id, targetIds: [] };
  }

  // 8. 装备牌（直接装上）
  const equip = robot.hand.find(c => c.type === "equip");
  if (equip) {
    return { type: "play", cardId: equip.id, targetIds: [] };
  }

  // 9. 普通桃（血量不满时）
  if (robot.hp < robot.maxHp) {
    const peach = robot.hand.find(c => isCardName(c, CARD_NAMES.PEACH));
    if (peach) {
      return { type: "play", cardId: peach.id, targetIds: [] };
    }
  }

  return { type: "end_turn" };
}

/**
 * 机器人决定是否出响应牌（闪/无懈/桃）
 */
export function decideResponse(
  robot: Player,
  requestType: string,
  state: GameState,
): ResponseResult {
  switch (requestType) {
    case "slash_dodge": {
      // 优先出闪；龙胆则杀也可
      const hasLongdan = robot.hero.skills.some(s => s.id === "longdan");
      const dodge = robot.hand.find(c => isCardName(c, CARD_NAMES.DODGE));
      const slashAsDodge = hasLongdan && robot.hand.find(c => isCardName(c, CARD_NAMES.SLASH));
      const card = dodge ?? slashAsDodge;
      // 血量 > 1 才躲，否则留着以后用
      if (card && (robot.hp > 1 || robot.hand.length <= 2)) {
        return { playerId: robot.id, cardId: card.id };
      }
      return { playerId: robot.id };
    }

    case "trick_nullify": {
      // 只在紧急时用无懈（手牌 ≤ 3 时保留）
      if (robot.hand.length <= 3) return { playerId: robot.id };
      const nullify = robot.hand.find(c => isCardName(c, CARD_NAMES.NULLIFICATION));
      if (nullify) return { playerId: robot.id, cardId: nullify.id };
      return { playerId: robot.id };
    }

    case "duel_slash": {
      // 决斗：出杀
      const slash = robot.hand.find(c => isCardName(c, CARD_NAMES.SLASH));
      if (slash) return { playerId: robot.id, cardId: slash.id };
      return { playerId: robot.id };
    }

    case "supply_slash": {
      // 救人：自己先不救（血足），只救主公
      const target = state.players.find(p => p.id === robot.id);
      const isDying = state.players.find(p => p.hp <= 0 && p.isAlive);
      if (!isDying) return { playerId: robot.id };
      const peach = robot.hand.find(c => isCardName(c, CARD_NAMES.PEACH));
      if (peach && (isDying.identity === "lord" || robot.hp > 1)) {
        return { playerId: robot.id, cardId: peach.id };
      }
      return { playerId: robot.id };
    }
  }

  return { playerId: robot.id };
}

/**
 * 机器人弃牌（弃最没用的）
 */
export function decideDiscard(robot: Player, mustDiscard: number): string[] {
  const cards = [...robot.hand];

  // 优先级：保留杀 > 闪 > 桃 > 无懈 > 其他
  const priority = (c: Card): number => {
    if (isCardName(c, CARD_NAMES.SLASH)) return 5;
    if (isCardName(c, CARD_NAMES.DODGE)) return 4;
    if (isCardName(c, CARD_NAMES.PEACH)) return 3;
    if (isCardName(c, CARD_NAMES.NULLIFICATION)) return 2;
    if (c.type === "equip") return 3;
    return 1;
  };

  return cards
    .sort((a, b) => priority(a) - priority(b))
    .slice(0, mustDiscard)
    .map(c => c.id);
}

// ─────────────────────────────────
// 工具函数
// ─────────────────────────────────

function getEnemies(robot: Player, state: GameState): Player[] {
  return state.players.filter(p => {
    if (!p.isAlive || p.id === robot.id) return false;
    // 已知身份的敌人
    if (p.identityRevealed) {
      if (robot.identity === "lord" || robot.identity === "loyalist") {
        return p.identity === "rebel" || p.identity === "spy";
      }
      if (robot.identity === "rebel") {
        return p.identity === "lord" || p.identity === "loyalist";
      }
      if (robot.identity === "spy") {
        // 内奸最后单挑主公
        const aliveCount = state.players.filter(p => p.isAlive).length;
        return aliveCount <= 2 ? p.identity === "lord" : p.identity === "rebel";
      }
    }
    // 未知身份：随机打，倾向于打手牌多的
    return true;
  });
}

function getAllies(robot: Player, state: GameState): Player[] {
  return state.players.filter(p => {
    if (!p.isAlive || p.id === robot.id) return false;
    if (!p.identityRevealed) return false;
    if (robot.identity === "lord" || robot.identity === "loyalist") {
      return p.identity === "lord" || p.identity === "loyalist";
    }
    if (robot.identity === "rebel") return p.identity === "rebel";
    return false;
  });
}

function pickWeakestEnemy(robot: Player, enemies: Player[], state: GameState): Player | undefined {
  // 优先打血量最低的，其次打主公
  return enemies
    .filter(e => canReach(robot, e, state))
    .sort((a, b) => {
      if (a.hp !== b.hp) return a.hp - b.hp;
      if (a.identity === "lord") return -1;
      if (b.identity === "lord") return 1;
      return 0;
    })[0];
}

function canReach(from: Player, to: Player, state: GameState): boolean {
  const alive = state.players.filter(p => p.isAlive);
  const fi = alive.indexOf(from);
  const ti = alive.indexOf(to);
  if (fi === -1 || ti === -1) return false;
  const n = alive.length;
  const cw = Math.abs(fi - ti);
  let dist = Math.min(cw, n - cw);
  if ((to.equips.horse_minus as ExtCard)) dist = Math.max(1, dist - 1);
  if ((from.equips.horse_plus as ExtCard)) dist += 1;
  const range = (from.equips.weapon as ExtCard)?.weaponRange ?? 1;
  return dist <= range;
}
