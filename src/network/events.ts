/**
 * events.ts — Socket.io 事件类型定义（客户端 ↔ 服务端）
 */

import type { GameState, Identity } from "../game/engine";

// ─────────────────────────────────
// 服务端 → 客户端
// ─────────────────────────────────

export interface ServerToClientEvents {
  // 大厅
  "lobby:list": (rooms: RoomSummary[]) => void;
  "lobby:room_added": (room: RoomSummary) => void;
  "lobby:room_removed": (roomId: string) => void;

  // 房间
  "room:joined": (data: { roomId: string; room: RoomInfo }) => void;
  "room:update": (room: RoomInfo) => void;
  "room:player_joined": (data: { playerName: string }) => void;
  "room:player_left": (data: { playerName: string }) => void;
  "room:error": (data: { message: string }) => void;

  // 游戏
  "game:start": (data: { roomId: string }) => void;
  "game:init": (data: { state: GameState }) => void;
  "game:state_sync": (state: GameState) => void;
  "game:log": (data: { message: string }) => void;
  "game:over": (data: { winners: Identity[] }) => void;
  "game:error": (data: { playerId: string; message: string }) => void;

  // 回合/阶段
  "turn:start": (data: { playerId: string }) => void;
  "phase:start": (data: { phase: string; playerId: string }) => void;
  "phase:judge": (data: { playerId: string }) => void;
  "phase:draw": (data: { playerId: string; count: number }) => void;
  "phase:draw:skip": (data: { playerId: string }) => void;
  "phase:play": (data: { playerId: string }) => void;
  "phase:play:skip": (data: { playerId: string }) => void;
  "phase:discard": (data: { playerId: string; handCount: number; hp: number; mustDiscard: number }) => void;
  "phase:discard:skip": (data: { playerId: string }) => void;
  "phase:end": (data: { playerId: string }) => void;

  // 牌操作
  "card:play": (data: { playerId: string; cardId: string; targetIds: string[] }) => void;
  "card:discard": (data: { cardIds: string[] }) => void;
  "card:move": (data: { cardId: string; to: string }) => void;

  // 玩家状态
  "player:draw": (data: { playerId: string; count: number; cards: unknown[] }) => void;
  "player:damage": (data: { targetId: string; amount: number; type: string; hp: number }) => void;
  "player:recover": (data: { targetId: string; amount: number; hp: number }) => void;
  "player:dying": (data: { playerId: string }) => void;
  "player:dead": (data: { playerId: string; identity: Identity; killerId?: string }) => void;
  "player:equip": (data: { playerId: string; slot: string; cardId: string }) => void;
  "player:wine": (data: { playerId: string }) => void;

  // 判定
  "judge:flip": (data: { playerId: string; delayCardId: string; judgeCardId: string }) => void;

  // 牌堆
  "deck:reshuffle": (data: Record<string, never>) => void;

  // 响应请求
  "request:response": (data: RequestData) => void;
  "request:select_card": (data: SelectCardRequest) => void;
}

// ─────────────────────────────────
// 客户端 → 服务端
// ─────────────────────────────────

export interface ClientToServerEvents {
  // 大厅
  "lobby:list": () => void;

  // 房间
  "room:create": (data: { name: string; maxPlayers: number; userId: string; playerName: string }) => void;
  "room:join": (data: { roomId: string; userId: string; playerName: string }) => void;
  "room:ready": (data: { roomId: string }) => void;
  "room:leave": (data: { roomId: string }) => void;
  "room:add_robot": (data: { roomId: string }) => void;

  // 游戏
  "game:play_card": (data: { roomId: string; cardId: string; targetIds: string[] }) => void;
  "game:end_play": (data: { roomId: string }) => void;
  "game:discard": (data: { roomId: string; cardIds: string[] }) => void;
  "game:discard_done": (data: { roomId: string }) => void;
  "game:respond": (data: { roomId: string; requestId: string; cardId?: string }) => void;
  "game:dismantle_select": (data: { roomId: string; requestId: string; cardId: string }) => void;

  // 断线重连
  "reconnect_player": (data: { roomId: string; userId: string }) => void;
}

// ─────────────────────────────────
// 共用数据类型
// ─────────────────────────────────

export interface RoomSummary {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  maxPlayers: number;
  players: RoomPlayer[];
  state: "waiting" | "playing" | "finished";
}

export interface RoomPlayer {
  socketId: string;
  userId: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
}

export interface RequestData {
  requestId: string;
  type: "slash_dodge" | "trick_nullify" | "duel_slash" | "supply_slash";
  sourceId: string;
  targetId: string;
  cardName?: string;
  timeout: number;
}

export interface SelectCardRequest {
  playerId: string;
  targetId: string;
  cards: string[];
  reason: "dismantle" | "steal";
}
