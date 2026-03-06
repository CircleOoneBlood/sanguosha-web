/**
 * server.ts — Socket.io 游戏服务端
 */

import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { GameEngine, createEmptyState } from "../game/engine";
import { HEROES } from "../game/heroes";
import type { GameState, ResponseResult } from "../game/engine";
import type { ServerToClientEvents, ClientToServerEvents, RoomInfo, RoomPlayer } from "./events";

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

// ─────────────────────────────────
// 房间管理
// ─────────────────────────────────

interface Room extends RoomInfo {
  engine?: GameEngine;
  gameState?: GameState;
  // requestId → resolve 函数（等待玩家响应）
  pendingResponses: Map<string, (result: ResponseResult) => void>;
}

const rooms = new Map<string, Room>();

function getRoomOf(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room;
  }
  return undefined;
}

// ─────────────────────────────────
// Socket 事件处理
// ─────────────────────────────────

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[+] 连接: ${socket.id}`);

  // 获取大厅列表
  socket.on("lobby:list", () => {
    const list = Array.from(rooms.values())
      .filter(r => r.state === "waiting")
      .map(r => ({ id: r.id, name: r.name, players: r.players.length, maxPlayers: r.maxPlayers }));
    socket.emit("lobby:list", list);
  });

  // 创建房间
  socket.on("room:create", ({ name, maxPlayers, userId, playerName }) => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    const room: Room = {
      id: roomId,
      name,
      maxPlayers: maxPlayers || 4,
      players: [{ socketId: socket.id, userId, name: playerName, isReady: false, isHost: true }],
      state: "waiting",
      pendingResponses: new Map(),
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("room:joined", { roomId, room });
    io.emit("lobby:room_added", { id: roomId, name, players: 1, maxPlayers: room.maxPlayers });
    console.log(`[Room] 创建 ${roomId}: ${name}`);
  });

  // 加入房间
  socket.on("room:join", ({ roomId, userId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== "waiting") {
      socket.emit("room:error", { message: "房间不存在或已开始" });
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit("room:error", { message: "房间已满" });
      return;
    }
    room.players.push({ socketId: socket.id, userId, name: playerName, isReady: false, isHost: false });
    socket.join(roomId);
    socket.emit("room:joined", { roomId, room });
    io.to(roomId).emit("room:player_joined", { playerName });
    io.to(roomId).emit("room:update", room);
  });

  // 离开房间
  socket.on("room:leave", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter(p => p.socketId !== socket.id);
    socket.leave(roomId);
    if (room.players.length === 0) {
      rooms.delete(roomId);
      io.emit("lobby:room_removed", roomId);
    } else {
      // 转让房主
      if (!room.players.some(p => p.isHost)) room.players[0].isHost = true;
      io.to(roomId).emit("room:update", room);
    }
  });

  // 准备
  socket.on("room:ready", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    player.isReady = !player.isReady;
    io.to(roomId).emit("room:update", room);

    if (room.players.every(p => p.isReady) && room.players.length >= 2) {
      startGame(room);
    }
  });

  // 出牌
  socket.on("game:play_card", ({ roomId, cardId, targetIds }) => {
    const room = rooms.get(roomId);
    if (!room?.engine || !room.gameState) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    room.engine.playCard(player.userId, cardId, targetIds)
      .catch(err => console.error("playCard error", err));
  });

  // 结束出牌阶段
  socket.on("game:end_play", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room?.gameState) return;
    // 触发弃牌阶段（由引擎回合流程驱动，此处仅标记信号）
    // 实际实现：用 EventEmitter 或回调通知引擎继续
  });

  // 弃牌
  socket.on("game:discard", ({ roomId, cardIds }) => {
    const room = rooms.get(roomId);
    if (!room?.gameState) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const gamePlayer = room.gameState.players.find(p => p.id === player.userId);
    if (!gamePlayer) return;
    for (const cardId of cardIds) {
      const idx = gamePlayer.hand.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const [card] = gamePlayer.hand.splice(idx, 1);
        room.gameState.discard.push(card);
      }
    }
    io.to(roomId).emit("game:state_sync", room.gameState);
  });

  // 响应（闪、无懈、桃等）
  socket.on("game:respond", ({ roomId, requestId, cardId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const resolve = room.pendingResponses.get(requestId);
    if (resolve) {
      room.pendingResponses.delete(requestId);
      resolve({ playerId: player.userId, cardId });
    }
  });

  // 断线重连
  socket.on("reconnect_player", ({ roomId, userId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.userId === userId);
    if (player) {
      player.socketId = socket.id;
      socket.join(roomId);
      if (room.gameState) {
        socket.emit("game:state_sync", room.gameState);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`[-] 断线: ${socket.id}`);
    const room = getRoomOf(socket.id);
    if (room) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        io.to(room.id).emit("room:player_left", { playerName: player.name });
      }
    }
  });
});

// ─────────────────────────────────
// 游戏启动
// ─────────────────────────────────

function startGame(room: Room): void {
  room.state = "playing";
  io.to(room.id).emit("lobby:room_removed", room.id);
  io.to(room.id).emit("game:start", { roomId: room.id });

  // 创建 GameContext，注入 emit 和 waitForResponse
  const gameState = createEmptyState();
  room.gameState = gameState;

  const engine = new GameEngine({
    state: gameState,
    emit: (event, data) => {
      io.to(room.id).emit(event as keyof ServerToClientEvents, data as never);
      // 同步完整状态
      if (room.gameState) {
        io.to(room.id).emit("game:state_sync", room.gameState);
      }
    },
    waitForResponse: (req) => {
      return new Promise<ResponseResult>((resolve) => {
        room.pendingResponses.set(req.requestId, resolve);
        // 通知所有客户端有响应请求
        io.to(room.id).emit("request:response", {
          ...req,
          cardName: req.card?.name,
        });
        // 超时自动跳过
        setTimeout(() => {
          if (room.pendingResponses.has(req.requestId)) {
            room.pendingResponses.delete(req.requestId);
            resolve({ playerId: "", cardId: undefined });
          }
        }, req.timeout);
      });
    },
  });

  room.engine = engine;

  const playerDefs = room.players.map(p => ({ id: p.userId, name: p.name }));
  const state = engine.initGame(playerDefs, [...HEROES]);
  room.gameState = state;

  // 启动第一回合
  runGameLoop(room, engine);
}

async function runGameLoop(room: Room, engine: GameEngine): Promise<void> {
  const state = engine.state;
  let turnIndex = 0;

  while (!state.isGameOver) {
    const player = state.players[turnIndex];
    if (player.isAlive) {
      await engine.runTurn(turnIndex);
    }
    turnIndex = (turnIndex + 1) % state.players.length;
    state.round = Math.floor(turnIndex / state.players.length) + 1;
  }
}

// ─────────────────────────────────
// HTTP
// ─────────────────────────────────

app.use(express.static("dist"));
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`三国杀服务端启动: http://localhost:${PORT}`);
});
