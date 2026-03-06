import { useEffect } from "react";
import { useStore } from "../store";
import { connect, getSocket } from "../network/client";
import Lobby from "./Lobby";
import Room from "./Room";
import GameTable from "./GameTable";

export default function App() {
  const { page, setPage, setCurrentRoom, setGameState, setPendingRequest, setRoomId, setMyPlayerId, userId } = useStore();

  useEffect(() => {
    const socket = connect();

    socket.on("room:joined", ({ roomId, room }) => {
      setCurrentRoom(room);
      setRoomId(roomId);
      setPage("room");
    });

    socket.on("game:start", ({ roomId }) => {
      // 确保 roomId 已记录（room:joined 时也会设，这里是保险）
      setRoomId(roomId);
      // myPlayerId 等于 userId（服务端用 userId 作为 player.id）
      setMyPlayerId(userId);
      setPage("game");
    });

    socket.on("game:init", ({ state }) => {
      setGameState(state);
    });

    socket.on("game:state_sync", (state) => {
      setGameState(state);
    });

    socket.on("request:response", (req) => {
      const store = useStore.getState();
      const myId = store.myPlayerId;
      // 无懈可击：任何人都可以响应
      // 其他响应：只有目标玩家
      const shouldShow = req.type === "trick_nullify"
        ? true
        : req.targetId === myId;
      if (shouldShow) setPendingRequest(req);
    });

    return () => {
      socket.off("room:joined");
      socket.off("game:start");
      socket.off("game:init");
      socket.off("game:state_sync");
      socket.off("request:response");
    };
  }, [setPage, setCurrentRoom, setGameState, setPendingRequest, setRoomId, setMyPlayerId, userId]);

  return (
    <div className="min-h-screen">
      {page === "lobby" && <Lobby />}
      {page === "room" && <Room />}
      {page === "game" && <GameTable />}
    </div>
  );
}
