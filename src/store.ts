/**
 * store.ts — Zustand 全局状态
 */

import { create } from "zustand";
import type { GameState } from "./game/engine";
import type { RoomInfo } from "./network/events";

type AppPage = "lobby" | "room" | "game";

interface AppStore {
  // 导航
  page: AppPage;
  setPage: (page: AppPage) => void;

  // 用户
  userId: string;
  playerName: string;
  setPlayerName: (name: string) => void;

  // 房间
  currentRoom: RoomInfo | null;
  setCurrentRoom: (room: RoomInfo | null) => void;

  // 游戏
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;
  patchGameState: (partial: Partial<GameState>) => void;

  // 当前房间 ID（房间码，如 "ABC123"，游戏中也需要用它发 socket 事件）
  roomId: string;
  setRoomId: (id: string) => void;

  // 我的 Player ID（对应 GameState.players[].id，等于 userId）
  myPlayerId: string;
  setMyPlayerId: (id: string) => void;

  // 待响应请求
  pendingRequest: PendingRequest | null;
  setPendingRequest: (req: PendingRequest | null) => void;
}

export interface PendingRequest {
  requestId: string;
  type: "slash_dodge" | "trick_nullify" | "duel_slash" | "supply_slash";
  sourceId: string;
  targetId: string;
  cardName?: string;
  timeout: number;
}

// 生成随机用户 ID（临时方案，用户系统实现后替换）
function generateUserId(): string {
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

export const useStore = create<AppStore>((set, get) => ({
  page: "lobby",
  setPage: (page) => set({ page }),

  userId: generateUserId(),
  playerName: "",
  setPlayerName: (playerName) => set({ playerName }),

  currentRoom: null,
  setCurrentRoom: (currentRoom) => set({ currentRoom }),

  gameState: null,
  setGameState: (gameState) => set({ gameState }),
  patchGameState: (partial) => {
    const prev = get().gameState;
    if (prev) set({ gameState: { ...prev, ...partial } });
  },

  roomId: "",
  setRoomId: (roomId) => set({ roomId }),

  myPlayerId: "",
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),

  pendingRequest: null,
  setPendingRequest: (pendingRequest) => set({ pendingRequest }),
}));
