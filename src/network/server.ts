/**
 * server.ts — Socket.io 游戏服务端
 */

import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { GameEngine, createEmptyState } from "../game/engine";
import { HEROES } from "../game/heroes";
import { decidePlay, decideResponse, decideDiscard } from "../game/robot";
import type { GameState, ResponseResult, Player } from "../game/engine";
import type { ServerToClientEvents, ClientToServerEvents, RoomInfo } from "./events";

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
  // requestId → resolve（waitForResponse）
  pendingResponses: Map<string, (result: ResponseResult) => void>;
  // playerId_phase → resolve（waitForPhaseEnd）
  pendingPhaseEnd: Map<string, () => void>;
  // 机器人玩家 userId 集合
  robots: Set<string>;
}

const rooms = new Map<string, Room>();

function getRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room;
  }
  return undefined;
}

function getPlayerBySocket(room: Room, socketId: string) {
  return room.players.find(p => p.socketId === socketId);
}

// ─────────────────────────────────
// Socket 事件处理
// ─────────────────────────────────

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[+] 连接: ${socket.id}`);

  // 大厅列表
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
      pendingPhaseEnd: new Map(),
      robots: new Set(),
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
      if (!room.players.some(p => p.isHost)) room.players[0].isHost = true;
      io.to(roomId).emit("room:update", room);
    }
  });

  // 添加机器人
  socket.on("room:add_robot", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== "waiting") return;
    if (room.players.length >= room.maxPlayers) return;
    const robotId = `robot_${Math.random().toString(36).slice(2, 6)}`;
    const robotNames = ["张飞", "关羽", "吕布", "周瑜", "典韦", "马超", "黄盖", "徐晃"];
    const name = robotNames[Math.floor(Math.random() * robotNames.length)] + "·AI";
    room.players.push({ socketId: "", userId: robotId, name, isReady: true, isHost: false });
    room.robots.add(robotId);
    io.to(roomId).emit("room:update", room);
    io.to(roomId).emit("room:player_joined", { playerName: name });
    // 检查是否可以开始
    if (room.players.every(p => p.isReady) && room.players.length >= 2) {
      startGame(room);
    }
  });

  // 准备
  socket.on("room:ready", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = getPlayerBySocket(room, socket.id);
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
    const player = getPlayerBySocket(room, socket.id);
    if (!player) return;
    room.engine.playCard(player.userId, cardId, targetIds)
      .then(() => {
        if (room.gameState) io.to(roomId).emit("game:state_sync", room.gameState);
      })
      .catch(err => {
        console.error("playCard error:", err);
        socket.emit("game:error", { playerId: player.userId, message: String(err) });
      });
  });

  // 结束出牌阶段
  socket.on("game:end_play", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = getPlayerBySocket(room, socket.id);
    if (!player) return;
    const key = `${player.userId}_play`;
    const resolve = room.pendingPhaseEnd.get(key);
    if (resolve) {
      room.pendingPhaseEnd.delete(key);
      resolve();
    }
  });

  // 弃牌
  socket.on("game:discard", ({ roomId, cardIds }) => {
    const room = rooms.get(roomId);
    if (!room?.gameState) return;
    const player = getPlayerBySocket(room, socket.id);
    if (!player) return;
    const gamePlayer = room.gameState.players.find(p => p.id === player.userId);
    if (!gamePlayer) return;

    // 执行弃牌
    for (const cardId of cardIds) {
      const idx = gamePlayer.hand.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const [card] = gamePlayer.hand.splice(idx, 1);
        room.gameState.discard.push(card);
      }
    }

    io.to(roomId).emit("game:state_sync", room.gameState);

    // 弃牌后检查是否达标，达标则结束弃牌阶段
    if (gamePlayer.hand.length <= gamePlayer.hp) {
      const key = `${player.userId}_discard`;
      const resolve = room.pendingPhaseEnd.get(key);
      if (resolve) {
        room.pendingPhaseEnd.delete(key);
        resolve();
      }
    }
  });

  // 弃牌阶段手动完成
  socket.on("game:discard_done", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = getPlayerBySocket(room, socket.id);
    if (!player) return;
    const key = `${player.userId}_discard`;
    const resolve = room.pendingPhaseEnd.get(key);
    if (resolve) {
      room.pendingPhaseEnd.delete(key);
      resolve();
    }
  });

  // 响应（闪/无懈/桃等）
  socket.on("game:respond", ({ roomId, requestId, cardId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = getPlayerBySocket(room, socket.id);
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
      if (room.gameState) socket.emit("game:state_sync", room.gameState);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[-] 断线: ${socket.id}`);
    const room = getRoomBySocket(socket.id);
    if (room) {
      const player = getPlayerBySocket(room, socket.id);
      if (player) io.to(room.id).emit("room:player_left", { playerName: player.name });
    }
  });
});

// ─────────────────────────────────
// 机器人行动
// ─────────────────────────────────

function runRobotTurn(room: Room, robot: Player, phase: "play" | "discard", done: () => void): void {
  if (!room.engine || !room.gameState) { done(); return; }

  if (phase === "play") {
    // 机器人反复出牌，直到没有合适的牌
    const step = () => {
      if (!room.engine || !room.gameState || !robot.isAlive) { done(); return; }
      const action = decidePlay(robot, room.gameState);
      if (action.type === "end_turn" || !action.cardId) {
        setTimeout(done, 300);
        return;
      }
      room.engine.playCard(robot.id, action.cardId!, action.targetIds ?? [])
        .then(() => {
          if (room.gameState) io.to(room.id).emit("game:state_sync", room.gameState);
          setTimeout(step, 600 + Math.random() * 400); // 模拟思考时间
        })
        .catch(() => {
          setTimeout(done, 300);
        });
    };
    setTimeout(step, 800 + Math.random() * 600);
  } else {
    // 弃牌阶段
    setTimeout(() => {
      if (!room.gameState) { done(); return; }
      const mustDiscard = Math.max(0, robot.hand.length - robot.hp);
      if (mustDiscard > 0) {
        const cardIds = decideDiscard(robot, mustDiscard);
        for (const cardId of cardIds) {
          const idx = robot.hand.findIndex(c => c.id === cardId);
          if (idx !== -1) {
            const [card] = robot.hand.splice(idx, 1);
            room.gameState!.discard.push(card);
          }
        }
        io.to(room.id).emit("game:state_sync", room.gameState!);
      }
      done();
    }, 500 + Math.random() * 300);
  }
}

// ─────────────────────────────────
// 游戏启动
// ─────────────────────────────────

function startGame(room: Room): void {
  room.state = "playing";
  io.emit("lobby:room_removed", room.id);
  io.to(room.id).emit("game:start", { roomId: room.id });

  const gameState = createEmptyState();
  room.gameState = gameState;

  const engine = new GameEngine({
    state: gameState,

    emit: (event, data) => {
      io.to(room.id).emit(event as keyof ServerToClientEvents, data as never);
      if (room.gameState) {
        io.to(room.id).emit("game:state_sync", room.gameState);
      }
    },

    waitForResponse: (req) => new Promise<ResponseResult>((resolve) => {
      // 若目标是机器人，直接决策
      const targetPlayer = gameState.players.find(p => p.id === req.targetId);
      if (targetPlayer && room.robots.has(targetPlayer.id)) {
        const result = decideResponse(targetPlayer, req.type, gameState);
        setTimeout(() => resolve(result), 300 + Math.random() * 500);
        return;
      }
      // 若是多人响应（无懈），找有无懈的机器人
      if (req.type === "trick_nullify") {
        for (const robotId of room.robots) {
          const robot = gameState.players.find(p => p.id === robotId);
          if (!robot) continue;
          const result = decideResponse(robot, req.type, gameState);
          if (result.cardId) {
            setTimeout(() => resolve(result), 400 + Math.random() * 400);
            return;
          }
        }
      }

      room.pendingResponses.set(req.requestId, resolve);
      io.to(room.id).emit("request:response", { ...req, cardName: req.card?.name });
      setTimeout(() => {
        if (room.pendingResponses.has(req.requestId)) {
          room.pendingResponses.delete(req.requestId);
          resolve({ playerId: "", cardId: undefined });
        }
      }, req.timeout);
    }),

    waitForPhaseEnd: (playerId, phase, timeout) => new Promise<void>((resolve) => {
      // 机器人自动处理回合
      if (room.robots.has(playerId)) {
        const robot = gameState.players.find(p => p.id === playerId);
        if (robot) {
          runRobotTurn(room, robot, phase, resolve);
        } else {
          resolve();
        }
        return;
      }

      const key = `${playerId}_${phase}`;
      room.pendingPhaseEnd.set(key, resolve);
      setTimeout(() => {
        if (room.pendingPhaseEnd.has(key)) {
          room.pendingPhaseEnd.delete(key);
          resolve();
        }
      }, timeout);
    }),
  });

  room.engine = engine;

  const playerDefs = room.players.map(p => ({ id: p.userId, name: p.name }));
  const state = engine.initGame(playerDefs, [...HEROES]);
  room.gameState = state;
  io.to(room.id).emit("game:state_sync", state);

  runGameLoop(room, engine).catch(err => console.error("Game loop error:", err));
}

async function runGameLoop(room: Room, engine: GameEngine): Promise<void> {
  const state = engine.state;
  let turnIndex = 0;

  while (!state.isGameOver) {
    const player = state.players[turnIndex % state.players.length];
    if (player.isAlive) {
      await engine.runTurn(turnIndex % state.players.length);
      state.round = Math.floor(turnIndex / state.players.length) + 1;
    }
    turnIndex++;
    // 防止死循环（全员阵亡时）
    if (turnIndex > state.players.length * 1000) break;
  }
}

// ─────────────────────────────────
// HTTP
// ─────────────────────────────────

app.use(express.static("dist"));

app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    rooms: rooms.size,
    activeGames: Array.from(rooms.values()).filter(r => r.state === "playing").length,
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`三国杀服务端启动: http://localhost:${PORT}`);
});
