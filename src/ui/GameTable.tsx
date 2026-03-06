import { useState, useEffect } from "react";
import { useStore } from "../store";
import { getSocket } from "../network/client";
import type { Player } from "../game/engine";
import { CARD_NAMES } from "../game/cards";
import type { ExtCard } from "../game/cards";
import CardHand from "./components/CardHand";
import HeroPanel from "./components/HeroPanel";
import ResponseDialog from "./components/ResponseDialog";

// 需要选目标的牌
const NEEDS_TARGET = new Set([
  CARD_NAMES.SLASH,
  CARD_NAMES.DUEL,
  CARD_NAMES.DISMANTLE,
  CARD_NAMES.STEAL,
]);

// 延时锦囊也需要目标（放到别人判定区）
const DELAYED_TRICKS = new Set([
  CARD_NAMES.LIGHTNING,
  CARD_NAMES.CAROUSING,
  CARD_NAMES.FAMINE,
]);

export default function GameTable() {
  const { gameState, myPlayerId, pendingRequest, roomId } = useStore();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [discardSelected, setDiscardSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 每次阶段切换清空选择状态
    setSelectedCardId(null);
    setSelectingTarget(false);
    setDiscardSelected(new Set());
  }, [gameState?.phase]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold/50 border-t-gold rounded-full animate-spin mx-auto mb-3" />
          <p className="text-parchment/60 text-sm">游戏加载中...</p>
        </div>
      </div>
    );
  }

  const me = gameState.players.find(p => p.id === myPlayerId);
  const others = gameState.players.filter(p => p.id !== myPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const isPlayPhase = isMyTurn && gameState.phase === "play";
  const isDiscardPhase = isMyTurn && gameState.phase === "discard";

  const socket = getSocket();

  // 点击手牌
  function handleCardClick(cardId: string) {
    if (!isPlayPhase || !me) return;
    const card = me.hand.find(c => c.id === cardId) as ExtCard | undefined;
    if (!card) return;

    const needsTarget = NEEDS_TARGET.has(card.name as never) || DELAYED_TRICKS.has(card.name as never);

    if (needsTarget) {
      if (selectedCardId === cardId) {
        // 再次点击取消
        setSelectedCardId(null);
        setSelectingTarget(false);
      } else {
        setSelectedCardId(cardId);
        setSelectingTarget(true);
      }
    } else {
      // 无目标牌直接出
      socket.emit("game:play_card", { roomId, cardId, targetIds: [] });
      setSelectedCardId(null);
    }
  }

  // 点击目标玩家
  function handleTargetClick(targetId: string) {
    if (!selectingTarget || !selectedCardId) return;
    socket.emit("game:play_card", { roomId, cardId: selectedCardId, targetIds: [targetId] });
    setSelectedCardId(null);
    setSelectingTarget(false);
  }

  // 结束出牌
  function handleEndPlay() {
    socket.emit("game:end_play", { roomId });
    setSelectedCardId(null);
    setSelectingTarget(false);
  }

  // 弃牌选择
  function toggleDiscardCard(cardId: string) {
    setDiscardSelected(prev => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  // 确认弃牌
  function handleDiscard() {
    if (!me || discardSelected.size === 0) return;
    socket.emit("game:discard", { roomId, cardIds: [...discardSelected] });
    setDiscardSelected(new Set());
  }

  const mustDiscardCount = me ? Math.max(0, me.hand.length - me.hp) : 0;

  const phaseLabel: Record<string, string> = {
    start: "开始阶段", judge: "判定阶段", draw: "摸牌阶段",
    play: "出牌阶段", discard: "弃牌阶段", end: "结束阶段",
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-[#1a0d06] to-[#0d0703]">

      {/* ── 顶部状态栏 ─────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-parchment/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gold font-serif text-sm">第 {gameState.round} 回合</span>
          <span className="text-parchment/30">|</span>
          <span className={`text-sm ${isMyTurn ? "text-gold font-semibold" : "text-parchment/70"}`}>
            {currentPlayer?.name} · {phaseLabel[gameState.phase]}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-parchment/40">
          <span>牌堆 {gameState.deck.length}</span>
          <span>弃牌 {gameState.discard.length}</span>
        </div>
      </div>

      {/* ── 其他玩家区 ─────────────────────── */}
      <div className="flex-shrink-0 flex justify-center gap-3 px-4 py-3 flex-wrap">
        {others.map(player => (
          <div
            key={player.id}
            className={`transition-all duration-200 ${
              selectingTarget && player.isAlive
                ? "cursor-pointer scale-105 ring-2 ring-gold/80 rounded-xl"
                : ""
            }`}
            onClick={() => selectingTarget && player.isAlive && handleTargetClick(player.id)}
          >
            <HeroPanel
              player={player}
              isCurrentTurn={currentPlayer?.id === player.id}
              compact
              isTargetable={selectingTarget && player.isAlive}
            />
          </div>
        ))}
      </div>

      {/* ── 中央区域 ───────────────────────── */}
      <div className="flex-1 flex gap-3 px-4 py-2 min-h-0">
        {/* 游戏日志 */}
        <div className="flex-1 panel p-3 overflow-y-auto">
          <p className="text-parchment/30 text-xs mb-2">游戏日志</p>
          <div className="space-y-0.5">
            {gameState.log.slice(-20).map((msg, i) => (
              <p key={i} className="text-parchment/60 text-xs leading-relaxed">{msg}</p>
            ))}
          </div>
        </div>

        {/* 操作提示 */}
        {(selectingTarget || isDiscardPhase) && (
          <div className="w-36 panel p-3 flex flex-col justify-center items-center text-center gap-2">
            {selectingTarget && (
              <>
                <p className="text-gold text-xs font-semibold">选择目标</p>
                <p className="text-parchment/50 text-xs">点击对手武将</p>
                <button
                  className="btn-secondary text-xs py-1 px-2 w-full"
                  onClick={() => { setSelectedCardId(null); setSelectingTarget(false); }}
                >
                  取消
                </button>
              </>
            )}
            {isDiscardPhase && !selectingTarget && (
              <>
                <p className="text-red-400 text-xs font-semibold animate-pulse">
                  弃置 {mustDiscardCount} 张
                </p>
                <p className="text-parchment/40 text-xs">
                  已选 {discardSelected.size}/{mustDiscardCount}
                </p>
                <button
                  className={`text-xs py-1 px-2 w-full rounded-lg border transition-all ${
                    discardSelected.size >= mustDiscardCount
                      ? "btn-danger"
                      : "opacity-40 bg-transparent border-parchment/20 text-parchment/40 cursor-not-allowed"
                  }`}
                  onClick={handleDiscard}
                  disabled={discardSelected.size < mustDiscardCount}
                >
                  确认弃牌
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 我的区域 ───────────────────────── */}
      {me && (
        <div className="flex-shrink-0 border-t border-parchment/10 bg-black/50 p-3">
          <div className="flex items-start gap-3">
            {/* 我的武将面板 */}
            <div>
              <HeroPanel player={me} isCurrentTurn={isMyTurn} />
              {/* 出牌阶段操作按钮 */}
              {isPlayPhase && (
                <button
                  className="mt-2 btn-secondary text-xs py-1 w-full"
                  onClick={handleEndPlay}
                >
                  结束出牌
                </button>
              )}
            </div>

            {/* 手牌区 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-parchment/50 text-xs">手牌 {me.hand.length}</span>
                {isPlayPhase && selectedCardId && (
                  <span className="text-gold text-xs animate-pulse">▶ 请选择目标</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {me.hand.map(card => {
                  const ec = card as ExtCard;
                  const isSelected = card.id === selectedCardId || discardSelected.has(card.id);
                  const suitColor = ["heart", "diamond"].includes(card.suit) ? "text-red-400" : "text-parchment";
                  const suitSym = { spade: "♠", heart: "♥", club: "♣", diamond: "♦" }[card.suit];
                  const numStr = card.number === 1 ? "A" : card.number === 11 ? "J" : card.number === 12 ? "Q" : card.number === 13 ? "K" : String(card.number);
                  const typeColor = {
                    basic: "from-slate-700 to-slate-800 border-slate-500",
                    trick: "from-amber-800 to-amber-900 border-amber-600",
                    equip: "from-emerald-800 to-emerald-900 border-emerald-600",
                  }[card.type];
                  const canInteract = isPlayPhase || (isDiscardPhase && !selectingTarget);

                  return (
                    <div
                      key={card.id}
                      className={`relative cursor-pointer select-none rounded-lg border bg-gradient-to-b
                        ${typeColor}
                        ${isSelected ? "ring-2 ring-gold -translate-y-3 z-10" : canInteract ? "hover:-translate-y-1" : ""}
                        transition-all duration-150 w-12 h-18`}
                      style={{ width: "48px", height: "72px" }}
                      onClick={() => {
                        if (isPlayPhase) handleCardClick(card.id);
                        else if (isDiscardPhase) toggleDiscardCard(card.id);
                      }}
                    >
                      <div className={`absolute top-0.5 left-0.5 text-xs leading-none ${suitColor}`}>
                        <div>{suitSym}</div>
                        <div className="text-xs">{numStr}</div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-parchment text-center leading-tight px-0.5">
                          {card.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 响应弹窗 ───────────────────────── */}
      {pendingRequest && (
        <ResponseDialog
          request={pendingRequest}
          myHand={me?.hand ?? []}
          onRespond={(cardId) => {
            socket.emit("game:respond", {
              roomId,
              requestId: pendingRequest.requestId,
              cardId,
            });
            useStore.getState().setPendingRequest(null);
          }}
          onSkip={() => {
            socket.emit("game:respond", { roomId, requestId: pendingRequest.requestId });
            useStore.getState().setPendingRequest(null);
          }}
        />
      )}

      {/* ── 游戏结束遮罩 ───────────────────── */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50">
          <div className="panel p-10 text-center">
            <h2 className="text-4xl font-serif text-gold mb-4 tracking-widest">游戏结束</h2>
            <p className="text-parchment text-xl mb-6">
              {gameState.winner?.map(w => (
                { lord: "主公", loyalist: "忠臣", rebel: "反贼", spy: "内奸" }[w]
              )).join(" & ")} 获胜！
            </p>
            <button
              className="btn-primary"
              onClick={() => useStore.getState().setPage("lobby")}
            >
              返回大厅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
