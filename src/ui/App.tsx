import { useEffect } from "react";
import { useStore } from "../store";
import { connect, getSocket } from "../network/client";
import Lobby from "./Lobby";
import Room from "./Room";
import GameTable from "./GameTable";
import SkillToastLayer from "./components/SkillToastLayer";

export default function App() {
  const { page, setPage, setCurrentRoom, setGameState, setPendingRequest, setRoomId, setMyPlayerId, userId, addSkillToast } = useStore();

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
      const myPlayer = store.gameState?.players.find(p => p.id === myId);
      if (!myPlayer) return;

      if (req.type === "trick_nullify") {
        // 无懈：出牌者本人不能是第一个无懈自己的牌（可以反无懈，但暂不实现链式）
        const iAmSource = req.sourceId === myId;
        const hasNullify = myPlayer.hand.some(c => c.name === "无懈可击");
        if (!iAmSource && hasNullify) setPendingRequest(req);
      } else if (req.targetId === myId) {
        // 闪/桃/杀：只对目标玩家
        setPendingRequest(req);
      }
    });

    socket.on("skill:trigger", ({ skillId, playerId }: { skillId: string; playerId: string }) => {
      const state = useStore.getState().gameState;
      const player = state?.players.find(p => p.id === playerId);
      if (!player) return;
      const skill = player.hero.skills.find(s => s.id === skillId);
      if (!skill) return;
      const toast = {
        id: `${skillId}_${Date.now()}`,
        playerId,
        playerName: player.name,
        skillName: skill.name,
      };
      addSkillToast(toast);
      setTimeout(() => useStore.getState().removeSkillToast(toast.id), 2500);
    });

    return () => {
      socket.off("room:joined");
      socket.off("game:start");
      socket.off("game:init");
      socket.off("game:state_sync");
      socket.off("request:response");
      socket.off("skill:trigger");
    };
  }, [setPage, setCurrentRoom, setGameState, setPendingRequest, setRoomId, setMyPlayerId, userId, addSkillToast]);

  return (
    <div className="min-h-screen">
      {page === "lobby" && <Lobby />}
      {page === "room" && <Room />}
      {page === "game" && <GameTable />}
      <SkillToastLayer />
    </div>
  );
}
