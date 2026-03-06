/**
 * client.ts — Socket.io 客户端封装
 */

import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "./events";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connect(): AppSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnect(): void {
  socket?.disconnect();
  socket = null;
}
