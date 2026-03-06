/**
 * engine.ts — 三国杀游戏引擎
 * 纯 TypeScript，不依赖任何框架或网络层
 * 通过 emit 回调与外部通信
 */

import { createStandardDeck, shuffle, CARD_NAMES, DELAYED_TRICKS, isCardName } from "./cards";
import type { ExtCard } from "./cards";

// ═══════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════

export type Identity = "lord" | "loyalist" | "rebel" | "spy";
export type Phase = "start" | "judge" | "draw" | "play" | "discard" | "end";
export type DamageType = "normal" | "fire" | "thunder";
export type CardSuit = "spade" | "heart" | "club" | "diamond";
export type CardType = "basic" | "trick" | "equip";

export interface Card {
  id: string;
  name: string;
  type: CardType;
  suit: CardSuit;
  number: number; // 1-13
  description?: string;
}

export interface Hero {
  id: string;
  name: string;
  kingdom: "wei" | "shu" | "wu" | "qun";
  gender: "male" | "female";
  maxHp: number;
  skills: Skill[];
}

export interface Skill {
  id: string;
  name: string;
  type: "active" | "passive" | "limit" | "awaken";
  description: string;
  execute?: (ctx: GameContext, player: Player) => void;
}

export interface Player {
  id: string;
  name: string;
  identity: Identity;
  identityRevealed: boolean; // 身份是否已公开
  hero: Hero;
  hp: number;
  maxHp: number;
  hand: Card[];
  equips: {
    weapon?: Card;
    armor?: Card;
    horse_plus?: Card;
    horse_minus?: Card;
  };
  judgeArea: Card[];   // 延时锦囊区
  isAlive: boolean;
  isTurnPlayer: boolean;
  slashCount: number;  // 本回合出杀次数
  flags: Record<string, unknown>;
}

export interface GameState {
  id: string;
  phase: Phase;
  round: number;
  currentPlayerIndex: number;
  players: Player[];
  deck: Card[];
  discard: Card[];
  responseChain: ResponseRequest[];
  isGameOver: boolean;
  winner?: Identity[];
  log: string[];
}

export interface ResponseRequest {
  requestId: string;
  type: "slash_dodge" | "trick_nullify" | "duel_slash" | "supply_slash";
  sourceId: string;
  targetId: string;
  card?: Card;
  timeout: number;
  resolve: (response: ResponseResult) => void;
}

export interface ResponseResult {
  playerId: string;
  cardId?: string; // 出了什么牌，undefined = 跳过
}

export interface GameContext {
  state: GameState;
  emit: (event: string, data: unknown) => void;
  waitForResponse: (req: Omit<ResponseRequest, "resolve">) => Promise<ResponseResult>;
}

// ═══════════════════════════════════════════════
// 身份分配表（人数 → 身份列表）
// ═══════════════════════════════════════════════

const IDENTITY_TABLE: Record<number, Identity[]> = {
  2: ["lord", "rebel"],
  3: ["lord", "rebel", "spy"],
  4: ["lord", "loyalist", "rebel", "rebel"],
  5: ["lord", "loyalist", "rebel", "rebel", "spy"],
  6: ["lord", "loyalist", "rebel", "rebel", "rebel", "spy"],
  7: ["lord", "loyalist", "loyalist", "rebel", "rebel", "rebel", "spy"],
  8: ["lord", "loyalist", "loyalist", "rebel", "rebel", "rebel", "rebel", "spy"],
};

// ═══════════════════════════════════════════════
// 游戏引擎
// ═══════════════════════════════════════════════

export class GameEngine {
  private ctx: GameContext;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
  }

  get state() {
    return this.ctx.state;
  }

  // ──────────────────────────────
  // 初始化
  // ──────────────────────────────

  initGame(playerDefs: Array<{ id: string; name: string }>, heroPool: Hero[]): GameState {
    const count = playerDefs.length;
    if (count < 2 || count > 8) throw new Error("游戏人数必须在 2-8 人");
    if (heroPool.length < count) throw new Error("武将池数量不足");

    // 1. 分配身份并洗牌
    const identities = shuffle([...IDENTITY_TABLE[count]]);

    // 2. 打乱武将顺序，每人分一个
    const heroes = shuffle([...heroPool]).slice(0, count);

    // 3. 初始化牌堆
    const deck = createStandardDeck() as Card[];

    // 4. 创建玩家（主公排第一位）
    const lordIndex = identities.indexOf("lord");
    const reordered = [...playerDefs];
    [reordered[0], reordered[lordIndex]] = [reordered[lordIndex], reordered[0]];
    [identities[0], identities[lordIndex]] = [identities[lordIndex], identities[0]];
    [heroes[0], heroes[lordIndex]] = [heroes[lordIndex], heroes[0]];

    const players: Player[] = reordered.map((def, i) => {
      const identity = identities[i];
      const hero = heroes[i];
      const maxHp = identity === "lord" ? hero.maxHp + 1 : hero.maxHp;
      return {
        id: def.id,
        name: def.name,
        identity,
        identityRevealed: identity === "lord", // 主公身份公开
        hero,
        hp: maxHp,
        maxHp,
        hand: [],
        equips: {},
        judgeArea: [],
        isAlive: true,
        isTurnPlayer: i === 0,
        slashCount: 0,
        flags: {},
      };
    });

    // 5. 发初始手牌（每人4张）
    const state: GameState = {
      id: `game_${Date.now()}`,
      phase: "start",
      round: 1,
      currentPlayerIndex: 0,
      players,
      deck,
      discard: [],
      responseChain: [],
      isGameOver: false,
      log: [],
    };

    this.ctx = { ...this.ctx, state };

    for (const player of players) {
      this._drawCardsTo(player, 4);
    }

    this.log("游戏开始！");
    this.ctx.emit("game:init", { state });
    return state;
  }

  // ──────────────────────────────
  // 回合主流程
  // ──────────────────────────────

  async runTurn(playerIndex: number): Promise<void> {
    const { state } = this.ctx;
    const player = state.players[playerIndex];
    if (!player.isAlive) return;

    state.currentPlayerIndex = playerIndex;
    state.players.forEach(p => (p.isTurnPlayer = false));
    player.isTurnPlayer = true;
    player.slashCount = 0;

    this.log(`${player.name} 的回合开始`);
    this.ctx.emit("turn:start", { playerId: player.id });

    await this.startPhase(player);
    await this.judgePhase(player);
    await this.drawPhase(player);
    await this.playPhase(player);
    await this.discardPhase(player);
    await this.endPhase(player);
  }

  private async startPhase(player: Player): Promise<void> {
    this.ctx.state.phase = "start";
    this.ctx.emit("phase:start", { phase: "start", playerId: player.id });
    // 触发开始阶段技能（如激将）
    this.triggerSkills("on_start_phase", player);
  }

  private async judgePhase(player: Player): Promise<void> {
    this.ctx.state.phase = "judge";
    if (player.judgeArea.length === 0) return;

    this.ctx.emit("phase:judge", { playerId: player.id });

    // 逐一处理判定牌（顺序：后放入的先判定）
    for (let i = player.judgeArea.length - 1; i >= 0; i--) {
      const delayCard = player.judgeArea[i] as ExtCard;
      const judgeCard = this._flipTopCard();
      if (!judgeCard) continue;

      this.log(`${player.name} 对 ${delayCard.name} 进行判定，翻出 ${this._cardStr(judgeCard)}`);
      this.ctx.emit("judge:flip", { playerId: player.id, delayCardId: delayCard.id, judgeCardId: judgeCard.id });

      if (delayCard.name === CARD_NAMES.LIGHTNING) {
        // 黑桃2-9触发闪电
        if (judgeCard.suit === "spade" && judgeCard.number >= 2 && judgeCard.number <= 9) {
          this.log(`${player.name} 受到闪电，承受3点雷电伤害！`);
          await this.dealDamage(null, player, 3, "thunder");
        } else {
          this.log(`闪电跳至下一名角色`);
          // 移给下一个存活角色
          player.judgeArea.splice(i, 1);
          const next = this._nextAlivePlayer(player);
          next.judgeArea.push(delayCard);
          this.ctx.emit("card:move", { cardId: delayCard.id, to: `judge:${next.id}` });
          continue;
        }
      } else if (delayCard.name === CARD_NAMES.CAROUSING) {
        // 非红心则不能出牌
        if (judgeCard.suit !== "heart") {
          this.log(`${player.name} 乐不思蜀，本回合跳过出牌阶段`);
          player.flags["skip_play"] = true;
        }
      } else if (delayCard.name === CARD_NAMES.FAMINE) {
        // 非梅花则跳过摸牌
        if (judgeCard.suit !== "club") {
          this.log(`${player.name} 兵粮寸断，本回合跳过摸牌阶段`);
          player.flags["skip_draw"] = true;
        }
      }

      player.judgeArea.splice(i, 1);
      this.ctx.state.discard.push(delayCard, judgeCard);
      this.ctx.emit("card:discard", { cardIds: [delayCard.id, judgeCard.id] });
    }
  }

  async drawPhase(player?: Player, count = 2): Promise<void> {
    const p = player ?? this._currentPlayer();
    this.ctx.state.phase = "draw";

    if (p.flags["skip_draw"]) {
      delete p.flags["skip_draw"];
      this.ctx.emit("phase:draw:skip", { playerId: p.id });
      return;
    }

    this.ctx.emit("phase:draw", { playerId: p.id, count });
    this._drawCardsTo(p, count);
  }

  async playPhase(player?: Player): Promise<void> {
    const p = player ?? this._currentPlayer();
    this.ctx.state.phase = "play";

    if (p.flags["skip_play"]) {
      delete p.flags["skip_play"];
      this.ctx.emit("phase:play:skip", { playerId: p.id });
      return;
    }

    this.ctx.emit("phase:play", { playerId: p.id });
    // 实际出牌由前端事件驱动（game:play_card）
    // 引擎等待 phase:play:end 信号
  }

  async discardPhase(player?: Player): Promise<void> {
    const p = player ?? this._currentPlayer();
    this.ctx.state.phase = "discard";
    this.ctx.emit("phase:discard", { playerId: p.id, handCount: p.hand.length, hp: p.hp });
    // 实际弃牌由前端事件驱动（game:discard）
  }

  private async endPhase(player: Player): Promise<void> {
    this.ctx.state.phase = "end";
    this.ctx.emit("phase:end", { playerId: player.id });
    this.triggerSkills("on_end_phase", player);
    this.log(`${player.name} 的回合结束`);
  }

  // ──────────────────────────────
  // 出牌处理
  // ──────────────────────────────

  async playCard(playerId: string, cardId: string, targetIds: string[]): Promise<boolean> {
    const { state } = this.ctx;
    const player = this._getPlayer(playerId);
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = player.hand[cardIndex] as ExtCard;
    const targets = targetIds.map(id => this._getPlayer(id));

    // 验证出牌合法性
    if (!this._canPlayCard(player, card, targets)) {
      this.ctx.emit("game:error", { playerId, message: "不能出这张牌" });
      return false;
    }

    // 从手牌移除
    player.hand.splice(cardIndex, 1);
    this.ctx.emit("card:play", { playerId, cardId, targetIds });
    this.log(`${player.name} 使用了 ${card.name}`);

    switch (card.type) {
      case "basic":
        await this._resolveBasicCard(player, card, targets);
        break;
      case "trick":
        if (card.isDelayed) {
          await this._resolveDelayedTrick(player, card, targets[0]);
        } else {
          await this._resolveInstantTrick(player, card, targets);
        }
        break;
      case "equip":
        this._resolveEquip(player, card);
        break;
    }

    // 装备牌不进弃牌堆
    if (card.type !== "equip") {
      state.discard.push(card);
    }

    this.checkGameOver();
    return true;
  }

  private _canPlayCard(player: Player, card: ExtCard, targets: Player[]): boolean {
    // 出牌阶段检查
    if (this.ctx.state.phase !== "play" && !card.isDelayed) return false;

    if (card.name === CARD_NAMES.SLASH) {
      // 每回合只能出一次杀（诸葛连弩除外）
      const hasZhugeBow = (player.equips.weapon as ExtCard)?.name === CARD_NAMES.ZHUGE_BOW;
      if (player.slashCount >= 1 && !hasZhugeBow) return false;
      if (targets.length !== 1) return false;
      // 检查距离
      if (!this._inAttackRange(player, targets[0])) return false;
    }

    if (card.name === CARD_NAMES.DUEL && targets.length !== 1) return false;
    if (card.name === CARD_NAMES.DISMANTLE && targets.length !== 1) return false;
    if (card.name === CARD_NAMES.STEAL && targets.length !== 1) return false;

    return true;
  }

  private async _resolveBasicCard(player: Player, card: ExtCard, targets: Player[]): Promise<void> {
    if (card.name === CARD_NAMES.SLASH) {
      player.slashCount++;
      await this.resolveSlash(player, targets[0], card);
    } else if (card.name === CARD_NAMES.PEACH) {
      await this.recoverHp(player, 1);
    } else if (card.name === CARD_NAMES.WINE) {
      player.flags["wine_boost"] = true;
      this.ctx.emit("player:wine", { playerId: player.id });
    }
  }

  private async _resolveInstantTrick(player: Player, card: ExtCard, targets: Player[]): Promise<void> {
    const { state } = this.ctx;

    // 等待无懈可击（对除无懈可击本身以外的锦囊）
    if (card.name !== CARD_NAMES.NULLIFICATION) {
      const nullified = await this._waitNullification(player, card);
      if (nullified) {
        this.log(`${card.name} 被无懈可击抵消`);
        return;
      }
    }

    switch (card.name) {
      case CARD_NAMES.DISMANTLE:
        await this._resolveTrickDismantle(player, targets[0]);
        break;
      case CARD_NAMES.STEAL:
        await this._resolveTrickSteal(player, targets[0]);
        break;
      case CARD_NAMES.DUEL:
        await this._resolveTrickDuel(player, targets[0]);
        break;
      case CARD_NAMES.BARBARIAN:
        for (const p of state.players.filter(p => p.isAlive && p.id !== player.id)) {
          const responded = await this._waitSlash(p);
          if (!responded) await this.dealDamage(player, p, 1);
        }
        break;
      case CARD_NAMES.ARROWS:
        for (const p of state.players.filter(p => p.isAlive && p.id !== player.id)) {
          const responded = await this._waitDodge(p);
          if (!responded) await this.dealDamage(player, p, 1);
        }
        break;
      case CARD_NAMES.PEACH_GARDEN:
        for (const p of state.players.filter(p => p.isAlive)) {
          if (p.hp < p.maxHp) await this.recoverHp(p, 1);
        }
        break;
      case CARD_NAMES.DRAW_TWO:
        this._drawCardsTo(player, 2);
        break;
    }
  }

  private async _resolveDelayedTrick(player: Player, card: ExtCard, target: Player): Promise<void> {
    // 延时锦囊放入目标的判定区
    target.judgeArea.push(card);
    this.ctx.emit("card:move", { cardId: card.id, to: `judge:${target.id}` });
    this.log(`${player.name} 对 ${target.name} 使用了 ${card.name}`);
  }

  private _resolveEquip(player: Player, card: ExtCard): void {
    const slot = card.equipSlot;
    if (!slot) return;

    // 替换旧装备进弃牌堆
    const old = player.equips[slot];
    if (old) {
      this.ctx.state.discard.push(old);
      this.ctx.emit("card:discard", { cardIds: [old.id] });
    }

    player.equips[slot] = card;
    this.ctx.emit("player:equip", { playerId: player.id, slot, cardId: card.id });
    this.log(`${player.name} 装备了 ${card.name}`);
  }

  private async _resolveTrickDismantle(player: Player, target: Player): Promise<void> {
    // 弃置目标一张牌（装备区或手牌）
    const allCards = [...target.hand, ...Object.values(target.equips).filter(Boolean) as Card[]];
    if (allCards.length === 0) return;

    this.ctx.emit("request:select_card", {
      playerId: player.id,
      targetId: target.id,
      cards: allCards.map(c => c.id),
      reason: "dismantle",
    });
    // 实际弃牌逻辑在收到 game:dismantle_select 后处理
  }

  private async _resolveTrickSteal(player: Player, target: Player): Promise<void> {
    // 获取目标一张牌
    const allCards = [...target.hand, ...Object.values(target.equips).filter(Boolean) as Card[]];
    if (allCards.length === 0) return;

    this.ctx.emit("request:select_card", {
      playerId: player.id,
      targetId: target.id,
      cards: allCards.map(c => c.id),
      reason: "steal",
    });
  }

  private async _resolveTrickDuel(source: Player, target: Player): Promise<void> {
    // 决斗：轮流出杀，先不出者受1点伤害
    let current = target;
    const other = (p: Player) => (p === target ? source : target);

    while (true) {
      const responded = await this._waitSlash(current);
      if (!responded) {
        await this.dealDamage(other(current), current, 1);
        break;
      }
      current = other(current);
    }
  }

  // ──────────────────────────────
  // 响应等待（由网络层注入 waitForResponse）
  // ──────────────────────────────

  private async _waitNullification(source: Player, card: Card): Promise<boolean> {
    // 广播等待无懈可击，任何人都可响应
    const result = await this.ctx.waitForResponse({
      requestId: `nullify_${Date.now()}`,
      type: "trick_nullify",
      sourceId: source.id,
      targetId: source.id,
      card,
      timeout: 8000,
    });
    if (result.cardId) {
      const responder = this._getPlayer(result.playerId);
      const idx = responder.hand.findIndex(c => c.id === result.cardId);
      if (idx !== -1) {
        const nullCard = responder.hand.splice(idx, 1)[0];
        this.ctx.state.discard.push(nullCard);
        this.log(`${responder.name} 使用无懈可击`);
        return true;
      }
    }
    return false;
  }

  private async _waitSlash(target: Player): Promise<boolean> {
    const result = await this.ctx.waitForResponse({
      requestId: `slash_${Date.now()}`,
      type: "duel_slash",
      sourceId: target.id,
      targetId: target.id,
      timeout: 10000,
    });
    if (result.cardId) {
      const idx = target.hand.findIndex(c => c.id === result.cardId);
      if (idx !== -1 && isCardName(target.hand[idx], CARD_NAMES.SLASH)) {
        const used = target.hand.splice(idx, 1)[0];
        this.ctx.state.discard.push(used);
        return true;
      }
    }
    return false;
  }

  private async _waitDodge(target: Player): Promise<boolean> {
    const result = await this.ctx.waitForResponse({
      requestId: `dodge_${Date.now()}`,
      type: "slash_dodge",
      sourceId: target.id,
      targetId: target.id,
      timeout: 10000,
    });
    if (result.cardId) {
      const idx = target.hand.findIndex(c => c.id === result.cardId);
      if (idx !== -1 && isCardName(target.hand[idx], CARD_NAMES.DODGE)) {
        const used = target.hand.splice(idx, 1)[0];
        this.ctx.state.discard.push(used);
        return true;
      }
    }
    return false;
  }

  // ──────────────────────────────
  // 杀与伤害
  // ──────────────────────────────

  async resolveSlash(source: Player, target: Player, card: Card): Promise<void> {
    this.log(`${source.name} 对 ${target.name} 出杀`);

    // 等待目标出闪
    const result = await this.ctx.waitForResponse({
      requestId: `slash_${Date.now()}`,
      type: "slash_dodge",
      sourceId: source.id,
      targetId: target.id,
      card,
      timeout: 10000,
    });

    if (result.cardId) {
      // 目标出了闪
      const idx = target.hand.findIndex(c => c.id === result.cardId);
      if (idx !== -1 && isCardName(target.hand[idx], CARD_NAMES.DODGE)) {
        const dodge = target.hand.splice(idx, 1)[0];
        this.ctx.state.discard.push(dodge);
        this.log(`${target.name} 使用了闪`);
        this.ctx.emit("slash:dodged", { sourceId: source.id, targetId: target.id });
        return;
      }
    }

    // 没出闪，造成伤害
    let dmg = 1;
    if (source.flags["wine_boost"]) {
      dmg = 2;
      delete source.flags["wine_boost"];
    }
    await this.dealDamage(source, target, dmg);
  }

  async dealDamage(
    source: Player | null,
    target: Player,
    amount: number,
    type: DamageType = "normal",
  ): Promise<void> {
    if (!target.isAlive) return;

    // 触发被动技能（仁王盾：防黑色杀）
    if (type === "normal" && (target.equips.armor as ExtCard)?.name === CARD_NAMES.RENWANG_SHIELD) {
      // 仁王盾防黑色伤害：由出牌者的牌决定，简化：普通伤害减1
      amount = Math.max(0, amount - 1);
    }
    if (amount <= 0) return;

    target.hp -= amount;
    this.log(`${target.name} 受到 ${amount} 点${type === "fire" ? "火焰" : type === "thunder" ? "雷电" : ""}伤害，剩余 ${target.hp}/${target.maxHp} 血`);
    this.ctx.emit("player:damage", { targetId: target.id, amount, type, hp: target.hp });

    // 触发曹操奸雄等被动
    if (source) this.triggerSkills("on_deal_damage", source, { target, amount, type });
    this.triggerSkills("on_take_damage", target, { source, amount, type });

    // 濒死检查
    if (target.hp <= 0) {
      await this._handleDying(target, source);
    }

    this.checkGameOver();
  }

  async recoverHp(target: Player, amount: number): Promise<void> {
    const before = target.hp;
    target.hp = Math.min(target.hp + amount, target.maxHp);
    const actual = target.hp - before;
    if (actual > 0) {
      this.log(`${target.name} 回复了 ${actual} 点体力`);
      this.ctx.emit("player:recover", { targetId: target.id, amount: actual, hp: target.hp });
    }
  }

  private async _handleDying(player: Player, killer: Player | null): Promise<void> {
    this.log(`${player.name} 濒死！`);
    this.ctx.emit("player:dying", { playerId: player.id });

    // 等待桃救援（出牌者优先，然后其他人按顺序）
    const { players } = this.ctx.state;
    const order = [
      ...players.slice(this.ctx.state.currentPlayerIndex),
      ...players.slice(0, this.ctx.state.currentPlayerIndex),
    ].filter(p => p.isAlive);

    for (const rescuer of order) {
      if (player.hp > 0) break;
      const hasPeach = rescuer.hand.some(c => isCardName(c, CARD_NAMES.PEACH));
      if (!hasPeach) continue;

      const result = await this.ctx.waitForResponse({
        requestId: `rescue_${Date.now()}`,
        type: "supply_slash", // 复用类型，语义：是否出桃
        sourceId: rescuer.id,
        targetId: player.id,
        timeout: 8000,
      });

      if (result.cardId) {
        const idx = rescuer.hand.findIndex(c => c.id === result.cardId);
        if (idx !== -1 && isCardName(rescuer.hand[idx], CARD_NAMES.PEACH)) {
          const peach = rescuer.hand.splice(idx, 1)[0];
          this.ctx.state.discard.push(peach);
          await this.recoverHp(player, 1);
          this.log(`${rescuer.name} 使用桃救了 ${player.name}`);
        }
      }
    }

    if (player.hp <= 0) {
      await this._killPlayer(player, killer);
    }
  }

  private async _killPlayer(player: Player, killer: Player | null): Promise<void> {
    player.isAlive = false;
    player.identityRevealed = true;

    this.log(`${player.name}（${this._identityName(player.identity)}）阵亡！`);
    this.ctx.emit("player:dead", {
      playerId: player.id,
      identity: player.identity,
      killerId: killer?.id,
    });

    // 弃置所有牌
    const allCards = [
      ...player.hand,
      ...Object.values(player.equips).filter(Boolean) as Card[],
      ...player.judgeArea,
    ];
    this.ctx.state.discard.push(...allCards);
    player.hand = [];
    player.equips = {};
    player.judgeArea = [];

    // 反贼被杀：杀手摸3张（主公除外，主公赏三忠臣来的不算）
    if (killer && player.identity === "rebel" && killer.identity !== "lord") {
      this._drawCardsTo(killer, 3);
      this.log(`${killer.name} 因杀死反贼摸3张牌`);
    }

    // 忠臣被主公杀：主公弃置所有牌
    if (killer && killer.identity === "lord" && player.identity === "loyalist") {
      const lordCards = [
        ...killer.hand,
        ...Object.values(killer.equips).filter(Boolean) as Card[],
      ];
      this.ctx.state.discard.push(...lordCards);
      killer.hand = [];
      killer.equips = {};
      this.log(`${killer.name} 因杀死忠臣弃置所有牌！`);
    }
  }

  // ──────────────────────────────
  // 胜负判定
  // ──────────────────────────────

  checkGameOver(): boolean {
    const { players, isGameOver } = this.ctx.state;
    if (isGameOver) return true;

    const lord = players.find(p => p.identity === "lord");
    const rebels = players.filter(p => p.identity === "rebel");
    const spy = players.find(p => p.identity === "spy");
    const others = players.filter(p => p.isAlive && p.identity !== "lord");

    // 主公死亡
    if (lord && !lord.isAlive) {
      const aliveRebels = rebels.filter(p => p.isAlive);
      // 内奸单挑主公胜利：内奸存活且其他人都死了
      if (spy?.isAlive && aliveRebels.length === 0 && others.filter(p => p.isAlive).length === 1) {
        return this._endGame(["spy"]);
      }
      // 反贼胜利
      return this._endGame(["rebel"]);
    }

    // 反贼全灭
    if (rebels.every(p => !p.isAlive)) {
      // 内奸还活着 → 内奸单独胜利（主公 vs 内奸最后一战，主公赢则主公忠臣赢）
      if (spy?.isAlive) {
        const aliveCount = players.filter(p => p.isAlive).length;
        if (aliveCount === 2) {
          // 还需要继续打，不算结束
          return false;
        }
        // 内奸独活时主公胜
        return this._endGame(["lord", "loyalist"]);
      }
      return this._endGame(["lord", "loyalist"]);
    }

    return false;
  }

  private _endGame(winners: Identity[]): boolean {
    this.ctx.state.isGameOver = true;
    this.ctx.state.winner = winners;
    this.log(`游戏结束！${winners.map(this._identityName).join("、")}获胜！`);
    this.ctx.emit("game:over", { winners });
    return true;
  }

  // ──────────────────────────────
  // 技能触发框架（留给各武将实现）
  // ──────────────────────────────

  private triggerSkills(event: string, player: Player, data?: unknown): void {
    for (const skill of player.hero.skills) {
      if (skill.type === "passive" && skill.execute) {
        try {
          skill.execute(this.ctx, player);
        } catch {
          // 技能执行错误不中断游戏
        }
      }
    }
  }

  // ──────────────────────────────
  // 工具方法
  // ──────────────────────────────

  drawCards(player: Player, count: number): Card[] {
    return this._drawCardsTo(player, count);
  }

  private _drawCardsTo(player: Player, count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.ctx.state.deck.length === 0) {
        this._reshuffleDeck();
      }
      const card = this.ctx.state.deck.pop();
      if (card) {
        player.hand.push(card);
        drawn.push(card);
      }
    }
    if (drawn.length > 0) {
      this.ctx.emit("player:draw", { playerId: player.id, count: drawn.length, cards: drawn });
    }
    return drawn;
  }

  private _reshuffleDeck(): void {
    const { state } = this.ctx;
    state.deck = shuffle(state.discard);
    state.discard = [];
    this.ctx.emit("deck:reshuffle", {});
    this.log("牌堆重新洗牌");
  }

  private _flipTopCard(): Card | undefined {
    const { state } = this.ctx;
    if (state.deck.length === 0) this._reshuffleDeck();
    const card = state.deck.pop();
    return card;
  }

  getDistance(from: Player, to: Player): number {
    const { players } = this.ctx.state;
    const alive = players.filter(p => p.isAlive);
    const fromIdx = alive.indexOf(from);
    const toIdx = alive.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return 999;
    const n = alive.length;
    const cw = Math.abs(fromIdx - toIdx);
    let dist = Math.min(cw, n - cw);
    // -1马：to 的防御距离 -1
    if ((to.equips.horse_minus as ExtCard)) dist = Math.max(1, dist - 1);
    // +1马：from 的攻击距离 +1
    if ((from.equips.horse_plus as ExtCard)) dist += 1;
    return dist;
  }

  private _inAttackRange(from: Player, to: Player): boolean {
    const range = (from.equips.weapon as ExtCard)?.weaponRange ?? 1;
    return this.getDistance(from, to) <= range;
  }

  private _nextAlivePlayer(player: Player): Player {
    const { players } = this.ctx.state;
    const idx = players.indexOf(player);
    for (let i = 1; i < players.length; i++) {
      const next = players[(idx + i) % players.length];
      if (next.isAlive) return next;
    }
    return player;
  }

  private _currentPlayer(): Player {
    return this.ctx.state.players[this.ctx.state.currentPlayerIndex];
  }

  private _getPlayer(id: string): Player {
    const p = this.ctx.state.players.find(p => p.id === id);
    if (!p) throw new Error(`找不到玩家 ${id}`);
    return p;
  }

  private _cardStr(card: Card): string {
    const suitMap = { spade: "♠", heart: "♥", club: "♣", diamond: "♦" };
    return `${suitMap[card.suit]}${card.number} ${card.name}`;
  }

  private _identityName(identity: Identity): string {
    const map: Record<Identity, string> = {
      lord: "主公",
      loyalist: "忠臣",
      rebel: "反贼",
      spy: "内奸",
    };
    return map[identity];
  }

  log(msg: string): void {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    this.ctx.state.log.push(entry);
    this.ctx.emit("game:log", { message: msg });
  }
}

// ═══════════════════════════════════════════════
// 工厂：创建初始 GameState（用于测试）
// ═══════════════════════════════════════════════

export function createEmptyState(): GameState {
  return {
    id: "",
    phase: "start",
    round: 1,
    currentPlayerIndex: 0,
    players: [],
    deck: [],
    discard: [],
    responseChain: [],
    isGameOver: false,
    log: [],
  };
}
