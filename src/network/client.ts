/**
 * client.ts — Socket.io 客户端封装
 * 自动适配 dev/staging/prod 环境
 */

import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "./events";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

function getServerUrl(): string {
  // 生产/staging 环境：同域，不需要指定 URL（Nginx 代理）
  // 开发环境：指向本地服务端端口
  const url = import.meta.env.VITE_SERVER_URL as string | undefined;
  return url ?? "";
}

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(getServerUrl(), {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
      timeout: 10000,
    });

    // 连接生命周期日志（仅 dev）
    if (import.meta.env.DEV) {
      socket.on("connect", () => console.log("[Socket] 已连接", socket?.id));
      socket.on("disconnect", (reason) => console.warn("[Socket] 断开:", reason));
      socket.on("connect_error", (err) => console.error("[Socket] 连接失败:", err.message));
    }
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
