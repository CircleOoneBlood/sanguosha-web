import { useEffect } from "react";
import { getSocket } from "../network/client";
import { useStore } from "../store";

export default function Room() {
  const { currentRoom, setCurrentRoom, userId, setPage } = useStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on("room:update", (room) => setCurrentRoom(room));
    socket.on("room:player_joined", ({ playerName }) => {
      console.log(`${playerName} 加入了房间`);
    });

    return () => {
      socket.off("room:update");
      socket.off("room:player_joined");
    };
  }, [setCurrentRoom]);

  if (!currentRoom) return null;

  const myPlayer = currentRoom.players.find(p => p.userId === userId);
  const isHost = myPlayer?.isHost ?? false;

  function toggleReady() {
    getSocket().emit("room:ready", { roomId: currentRoom!.id });
  }

  function leaveRoom() {
    getSocket().emit("room:leave", { roomId: currentRoom!.id });
    setCurrentRoom(null);
    setPage("lobby");
  }

  const kingdomColor: Record<string, string> = {
    wei: "text-wei", shu: "text-shu", wu: "text-wu", qun: "text-qun",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* 房间信息 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-serif text-gold">{currentRoom.name}</h2>
          <p className="text-parchment/50 text-sm">房间号：{currentRoom.id}</p>
        </div>

        {/* 玩家列表 */}
        <div className="panel p-4 mb-4">
          <h3 className="text-parchment/70 text-sm mb-3">玩家列表 ({currentRoom.players.length}/{currentRoom.maxPlayers})</h3>
          <div className="space-y-2">
            {currentRoom.players.map((player, i) => (
              <div
                key={player.socketId}
                className="flex items-center justify-between p-2 bg-black/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-parchment/40 text-xs w-4">{i + 1}</span>
                  <span className="text-parchment font-semibold">{player.name}</span>
                  {player.isHost && (
                    <span className="text-xs text-gold bg-gold/10 px-1.5 py-0.5 rounded">房主</span>
                  )}
                  {player.userId === userId && (
                    <span className="text-xs text-jade bg-jade/10 px-1.5 py-0.5 rounded">你</span>
                  )}
                </div>
                <span className={`text-sm font-semibold ${player.isReady ? "text-jade" : "text-parchment/40"}`}>
                  {player.isReady ? "已准备" : "未准备"}
                </span>
              </div>
            ))}

            {/* 空位 */}
            {Array.from({ length: currentRoom.maxPlayers - currentRoom.players.length }).map((_, i) => (
              <div key={`empty_${i}`} className="flex items-center p-2 bg-black/20 rounded-lg border border-dashed border-parchment/10">
                <span className="text-parchment/20 text-sm">等待玩家加入...</span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-sm" onClick={leaveRoom}>
            离开
          </button>
          {isHost && currentRoom.players.length < currentRoom.maxPlayers && (
            <button
              className="px-3 py-2 text-sm bg-purple-900/40 border border-purple-700/50 text-purple-300
                         rounded-lg hover:bg-purple-900/60 transition-colors"
              onClick={() => getSocket().emit("room:add_robot", { roomId: currentRoom.id })}
            >
              + 机器人
            </button>
          )}
          <button
            className={`flex-1 font-bold py-2 px-4 rounded-lg border transition-all ${
              myPlayer?.isReady
                ? "bg-jade/20 text-jade border-jade/40 hover:bg-jade/30"
                : "btn-primary"
            }`}
            onClick={toggleReady}
          >
            {myPlayer?.isReady ? "取消准备" : "准备"}
          </button>
        </div>

        {isHost && (
          <p className="text-center text-parchment/40 text-xs mt-3">
            所有玩家准备后游戏自动开始 · 可添加 AI 机器人填充空位
          </p>
        )}
      </div>
    </div>
  );
}
