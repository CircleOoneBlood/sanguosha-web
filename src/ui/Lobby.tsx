import { useState, useEffect } from "react";
import { getSocket } from "../network/client";
import { useStore } from "../store";
import type { RoomSummary } from "../network/events";

export default function Lobby() {
  const { userId, playerName, setPlayerName } = useStore();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [nameInput, setNameInput] = useState(playerName);
  const [nameSaved, setNameSaved] = useState(!!playerName);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "create">("list");

  const hasName = !!playerName;

  useEffect(() => {
    const socket = getSocket();
    socket.on("lobby:list", setRooms);
    socket.on("lobby:room_added", (room) => {
      setRooms(prev => prev.find(r => r.id === room.id) ? prev : [...prev, room]);
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
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setPlayerName(trimmed);
    setNameSaved(true);
  }

  function createRoom() {
    if (!hasName) { setError("请先设置你的名字"); return; }
    if (!roomName.trim()) { setError("请输入房间名"); return; }
    setError("");
    getSocket().emit("room:create", { name: roomName.trim(), maxPlayers, userId, playerName });
  }

  function joinRoom(roomId: string) {
    if (!hasName) { setError("请先设置你的名字"); return; }
    setError("");
    getSocket().emit("room:join", { roomId, userId, playerName });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-10 px-4">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-serif text-gold tracking-widest mb-1">三国杀</h1>
        <p className="text-parchment/40 text-xs tracking-widest">SANGUOSHA ONLINE</p>
      </div>

      {/* 玩家名字 — 第一步，未设置时高亮提示 */}
      <div className={`panel p-4 w-full max-w-md mb-5 transition-all ${!hasName ? "ring-2 ring-gold/50" : ""}`}>
        <label className="text-parchment/70 text-sm block mb-2">
          {!hasName ? "👆 请先设置你的名字再进入游戏" : "玩家名字"}
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-black/40 border border-parchment/30 rounded-lg px-3 py-2 text-parchment
                       focus:outline-none focus:border-gold/60 placeholder:text-parchment/30"
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setNameSaved(false); }}
            onKeyDown={e => e.key === "Enter" && saveName()}
            placeholder="起个名字..."
            maxLength={12}
            autoFocus={!hasName}
          />
          <button
            className={nameSaved ? "btn-secondary" : "btn-primary"}
            onClick={saveName}
            disabled={!nameInput.trim()}
          >
            {nameSaved ? "已保存" : "确认"}
          </button>
        </div>
        {hasName && (
          <p className="text-jade text-xs mt-1.5">✓ 当前名字：{playerName}</p>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="w-full max-w-md mb-3 px-3 py-2 bg-red-900/40 border border-red-700/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 主内容区 — 名字未设置时半透明遮罩 */}
      <div className={`w-full max-w-2xl transition-opacity ${!hasName ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex gap-1 mb-0">
          {(["list", "create"] as const).map(v => (
            <button
              key={v}
              className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                view === v
                  ? "bg-parchment/10 text-parchment border-b-2 border-gold"
                  : "text-parchment/40 hover:text-parchment/70"
              }`}
              onClick={() => { setView(v); setError(""); }}
            >
              {v === "list" ? "加入房间" : "创建房间"}
            </button>
          ))}
        </div>

        <div className="panel p-4">
          {view === "list" && (
            <div>
              {/* 快速加入 */}
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 bg-black/40 border border-parchment/30 rounded-lg px-3 py-2 text-parchment
                             focus:outline-none focus:border-gold/60 placeholder:text-parchment/30 text-sm uppercase"
                  value={joinId}
                  onChange={e => setJoinId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinId && joinRoom(joinId)}
                  placeholder="输入房间号直接加入（如 ABC123）"
                  maxLength={6}
                />
                <button
                  className="btn-primary text-sm"
                  onClick={() => joinId && joinRoom(joinId)}
                  disabled={!joinId}
                >
                  加入
                </button>
              </div>

              <div className="border-t border-parchment/10 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-parchment/50 text-xs">大厅房间列表</p>
                  <button
                    className="text-parchment/30 text-xs hover:text-parchment/60 transition-colors"
                    onClick={() => getSocket().emit("lobby:list")}
                  >
                    刷新
                  </button>
                </div>

                {rooms.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-parchment/30 text-sm">暂无等待中的房间</p>
                    <p className="text-parchment/20 text-xs mt-1">切换到「创建房间」开始游戏</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rooms.map(room => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-3 bg-black/30 rounded-lg
                                   border border-parchment/10 hover:border-parchment/30 transition-colors"
                      >
                        <div>
                          <span className="text-parchment font-semibold">{room.name}</span>
                          <span className="text-parchment/30 text-xs ml-2">#{room.id}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm ${room.players >= room.maxPlayers ? "text-red-400" : "text-parchment/50"}`}>
                            {room.players}/{room.maxPlayers}
                          </span>
                          <button
                            className="btn-secondary text-xs py-1"
                            onClick={() => joinRoom(room.id)}
                            disabled={room.players >= room.maxPlayers}
                          >
                            {room.players >= room.maxPlayers ? "已满" : "加入"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  onKeyDown={e => e.key === "Enter" && createRoom()}
                  placeholder="给你的房间起个名字..."
                  maxLength={20}
                />
              </div>

              <div>
                <label className="text-parchment/70 text-sm block mb-2">
                  玩家人数（可用机器人填充）
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        maxPlayers === n
                          ? "bg-gold text-ink-dark"
                          : "bg-black/40 text-parchment/50 border border-parchment/20 hover:border-parchment/50"
                      }`}
                      onClick={() => setMaxPlayers(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-parchment/30 text-xs mt-1.5">
                  {maxPlayers <= 3 ? "2-3人：快速局" : maxPlayers <= 5 ? "4-5人：标准局" : "6-8人：大型局"}
                </p>
              </div>

              <button
                className="btn-primary w-full"
                onClick={createRoom}
                disabled={!roomName.trim()}
              >
                创建房间
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
