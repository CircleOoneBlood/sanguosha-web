import { useState, useEffect } from "react";
import { getSocket } from "../network/client";
import { useStore } from "../store";
import type { RoomSummary } from "../network/events";

export default function Lobby() {
  const { userId, playerName, setPlayerName } = useStore();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [nameInput, setNameInput] = useState(playerName);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "create">("list");

  useEffect(() => {
    const socket = getSocket();

    socket.on("lobby:list", setRooms);
    socket.on("lobby:room_added", (room) => {
      setRooms(prev => {
        if (prev.find(r => r.id === room.id)) return prev;
        return [...prev, room];
      });
    });
    socket.on("lobby:room_removed", (roomId) => {
      setRooms(prev => prev.filter(r => r.id !== roomId));
    });
    socket.on("room:error", ({ message }) => setError(message));

    socket.emit("lobby:list");

    return () => {
      socket.off("lobby:list");
      socket.off("lobby:room_added");
      socket.off("lobby:room_removed");
      socket.off("room:error");
    };
  }, []);

  function saveName() {
    if (nameInput.trim()) setPlayerName(nameInput.trim());
  }

  function createRoom() {
    if (!playerName) { setError("请先输入玩家名字"); return; }
    if (!roomName.trim()) { setError("请输入房间名"); return; }
    setError("");
    getSocket().emit("room:create", {
      name: roomName.trim(),
      maxPlayers,
      userId,
      playerName,
    });
  }

  function joinRoom(roomId: string) {
    if (!playerName) { setError("请先输入玩家名字"); return; }
    setError("");
    getSocket().emit("room:join", { roomId, userId, playerName });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 px-4">
      {/* 标题 */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-serif text-gold mb-2 tracking-widest">三国杀</h1>
        <p className="text-parchment/60 text-sm tracking-wider">SANGUOSHA ONLINE</p>
      </div>

      {/* 玩家名字 */}
      <div className="panel p-4 w-full max-w-md mb-6">
        <label className="text-parchment/70 text-sm block mb-2">玩家名字</label>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-black/40 border border-parchment/30 rounded-lg px-3 py-2 text-parchment
                       focus:outline-none focus:border-gold/60 placeholder:text-parchment/30"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === "Enter" && saveName()}
            placeholder="输入你的名字..."
            maxLength={12}
          />
          <button className="btn-primary" onClick={saveName}>确认</button>
        </div>
        {playerName && (
          <p className="text-jade text-xs mt-1">当前名字：{playerName}</p>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="w-full max-w-md mb-4 px-3 py-2 bg-red-900/40 border border-red-700/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 主内容 */}
      <div className="w-full max-w-2xl">
        {/* Tab */}
        <div className="flex gap-1 mb-4">
          <button
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              view === "list" ? "bg-parchment/15 text-parchment border-b-2 border-gold" : "text-parchment/50 hover:text-parchment"
            }`}
            onClick={() => setView("list")}
          >
            房间列表
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              view === "create" ? "bg-parchment/15 text-parchment border-b-2 border-gold" : "text-parchment/50 hover:text-parchment"
            }`}
            onClick={() => setView("create")}
          >
            创建房间
          </button>
        </div>

        <div className="panel p-4">
          {view === "list" && (
            <div>
              {/* 快速加入 */}
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 bg-black/40 border border-parchment/30 rounded-lg px-3 py-2 text-parchment
                             focus:outline-none focus:border-gold/60 placeholder:text-parchment/30 text-sm"
                  value={joinId}
                  onChange={e => setJoinId(e.target.value.toUpperCase())}
                  placeholder="输入房间 ID 直接加入..."
                  maxLength={6}
                />
                <button className="btn-primary text-sm" onClick={() => joinId && joinRoom(joinId)}>
                  加入
                </button>
              </div>

              {/* 房间列表 */}
              {rooms.length === 0 ? (
                <div className="text-center py-8 text-parchment/40">
                  <p>暂无房间</p>
                  <p className="text-xs mt-1">创建第一个房间开始游戏</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-parchment/10
                                 hover:border-parchment/30 transition-colors"
                    >
                      <div>
                        <span className="text-parchment font-semibold">{room.name}</span>
                        <span className="text-parchment/40 text-xs ml-2">#{room.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-parchment/60 text-sm">
                          {room.players}/{room.maxPlayers} 人
                        </span>
                        <button
                          className="btn-secondary text-xs py-1"
                          onClick={() => joinRoom(room.id)}
                        >
                          加入
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="mt-3 text-parchment/40 text-xs hover:text-parchment/60 transition-colors"
                onClick={() => getSocket().emit("lobby:list")}
              >
                刷新列表
              </button>
            </div>
          )}

          {view === "create" && (
            <div className="space-y-4">
              <div>
                <label className="text-parchment/70 text-sm block mb-1">房间名称</label>
                <input
                  className="w-full bg-black/40 border border-parchment/30 rounded-lg px-3 py-2 text-parchment
                             focus:outline-none focus:border-gold/60 placeholder:text-parchment/30"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="房间名..."
                  maxLength={20}
                />
              </div>

              <div>
                <label className="text-parchment/70 text-sm block mb-2">玩家人数</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        maxPlayers === n
                          ? "bg-gold text-ink-dark"
                          : "bg-black/40 text-parchment/60 border border-parchment/20 hover:border-parchment/50"
                      }`}
                      onClick={() => setMaxPlayers(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn-primary w-full" onClick={createRoom}>
                创建房间
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
