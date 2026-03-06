import { useStore } from "../store";
import { getSocket } from "../network/client";
import type { Player, Card } from "../game/engine";
import CardHand from "./components/CardHand";
import HeroPanel from "./components/HeroPanel";
import ResponseDialog from "./components/ResponseDialog";

export default function GameTable() {
  const { gameState, myPlayerId, pendingRequest } = useStore();

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-parchment/60">游戏加载中...</p>
      </div>
    );
  }

  const me = gameState.players.find(p => p.id === myPlayerId);
  const others = gameState.players.filter(p => p.id !== myPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;

  function handlePlayCard(cardId: string, targetIds: string[]) {
    // TODO: 需要目标选择逻辑，目前先不带目标
    getSocket().emit("game:play_card", {
      roomId: gameState!.id,
      cardId,
      targetIds,
    });
  }

  function handleEndPlay() {
    getSocket().emit("game:end_play", { roomId: gameState!.id });
  }

  function handleDiscard(cardIds: string[]) {
    getSocket().emit("game:discard", { roomId: gameState!.id, cardIds });
  }

  const phaseLabel: Record<string, string> = {
    start: "开始阶段",
    judge: "判定阶段",
    draw: "摸牌阶段",
    play: "出牌阶段",
    discard: "弃牌阶段",
    end: "结束阶段",
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/50 border-b border-parchment/10">
        <div className="flex items-center gap-3">
          <span className="text-gold font-serif text-sm">第 {gameState.round} 回合</span>
          <span className="text-parchment/60 text-xs">|</span>
          <span className="text-parchment/80 text-sm">
            {currentPlayer?.name} 的 {phaseLabel[gameState.phase] ?? gameState.phase}
          </span>
        </div>
        <div className="text-parchment/40 text-xs">
          牌堆 {gameState.deck.length} 张 · 弃牌堆 {gameState.discard.length} 张
        </div>
      </div>

      {/* 其他玩家区 */}
      <div className="flex justify-around px-4 py-3 flex-wrap gap-2">
        {others.map(player => (
          <HeroPanel key={player.id} player={player} isCurrentTurn={currentPlayer?.id === player.id} compact />
        ))}
      </div>

      {/* 中间区域（桌面/日志） */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="panel p-3 w-full max-w-lg max-h-32 overflow-y-auto">
          <h4 className="text-parchment/40 text-xs mb-1">游戏日志</h4>
          {gameState.log.slice(-8).map((msg, i) => (
            <p key={i} className="text-parchment/70 text-xs">{msg}</p>
          ))}
        </div>
      </div>

      {/* 自己的区域 */}
      {me && (
        <div className="border-t border-parchment/10 bg-black/40 p-3">
          <div className="flex items-start gap-4">
            {/* 武将面板 */}
            <HeroPanel player={me} isCurrentTurn={isMyTurn} />

            {/* 手牌 */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-parchment/60 text-xs">手牌 ({me.hand.length})</span>
                {isMyTurn && gameState.phase === "play" && (
                  <button className="btn-secondary text-xs py-1 px-2" onClick={handleEndPlay}>
                    结束出牌
                  </button>
                )}
                {isMyTurn && gameState.phase === "discard" && me.hand.length > me.hp && (
                  <span className="text-red-400 text-xs animate-pulse">
                    请弃置 {me.hand.length - me.hp} 张牌
                  </span>
                )}
              </div>
              <CardHand
                cards={me.hand}
                canPlay={isMyTurn && gameState.phase === "play"}
                canDiscard={isMyTurn && gameState.phase === "discard" && me.hand.length > me.hp}
                mustDiscardCount={isMyTurn && gameState.phase === "discard" ? Math.max(0, me.hand.length - me.hp) : 0}
                onPlay={handlePlayCard}
                onDiscard={handleDiscard}
              />
            </div>
          </div>
        </div>
      )}

      {/* 响应弹窗 */}
      {pendingRequest && (
        <ResponseDialog
          request={pendingRequest}
          myHand={me?.hand ?? []}
          onRespond={(cardId) => {
            getSocket().emit("game:respond", {
              roomId: gameState.id,
              requestId: pendingRequest.requestId,
              cardId,
            });
            useStore.getState().setPendingRequest(null);
          }}
          onSkip={() => {
            getSocket().emit("game:respond", {
              roomId: gameState.id,
              requestId: pendingRequest.requestId,
            });
            useStore.getState().setPendingRequest(null);
          }}
        />
      )}

      {/* 游戏结束遮罩 */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="panel p-8 text-center">
            <h2 className="text-3xl font-serif text-gold mb-4">游戏结束</h2>
            <p className="text-parchment text-lg">
              {gameState.winner?.map(w => ({
                lord: "主公", loyalist: "忠臣", rebel: "反贼", spy: "内奸",
              }[w])).join("、")} 获胜！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
