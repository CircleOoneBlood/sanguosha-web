import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { getSocket } from "../network/client";
import { CARD_NAMES } from "../game/cards";
import type { ExtCard } from "../game/cards";
import type { Player } from "../game/engine";
import HeroPanel from "./components/HeroPanel";
import ResponseDialog from "./components/ResponseDialog";

const NEEDS_TARGET = new Set([
  CARD_NAMES.SLASH, CARD_NAMES.DUEL, CARD_NAMES.DISMANTLE, CARD_NAMES.STEAL,
  CARD_NAMES.LIGHTNING, CARD_NAMES.CAROUSING, CARD_NAMES.FAMINE,
]);

const PHASE_ZH: Record<string, string> = {
  start: "开始阶段", judge: "判定阶段", draw: "摸牌阶段",
  play: "出牌阶段", discard: "弃牌阶段", end: "结束阶段",
};

export default function GameTable() {
  const { gameState, myPlayerId, pendingRequest, roomId } = useStore();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [discardSelected, setDiscardSelected] = useState<Set<string>>(new Set());
  const [myTurnFlash, setMyTurnFlash] = useState(false);
  const prevPhaseRef = useRef<string>("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const socket = getSocket();

  // 阶段切换时清空选择
  useEffect(() => {
    setSelectedCardId(null);
    setSelectingTarget(false);
    setDiscardSelected(new Set());
  }, [gameState?.phase, gameState?.currentPlayerIndex]);

  // 轮到我出牌时闪烁提示
  useEffect(() => {
    if (!gameState) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isNowMyTurn = currentPlayer?.id === myPlayerId && gameState.phase === "play";
    const wasNotMyTurn = prevPhaseRef.current !== `${myPlayerId}_play`;
    if (isNowMyTurn && wasNotMyTurn) {
      setMyTurnFlash(true);
      setTimeout(() => setMyTurnFlash(false), 2500);
    }
    prevPhaseRef.current = isNowMyTurn ? `${myPlayerId}_play` : "";
  }, [gameState?.currentPlayerIndex, gameState?.phase, myPlayerId]);

  // 日志自动滚底
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState?.log.length]);

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
  const mustDiscardCount = me ? Math.max(0, me.hand.length - me.hp) : 0;

  function handleCardClick(cardId: string) {
    if (!isPlayPhase || !me) return;
    const card = me.hand.find(c => c.id === cardId) as ExtCard | undefined;
    if (!card) return;

    if (NEEDS_TARGET.has(card.name as never)) {
      setSelectedCardId(selectedCardId === cardId ? null : cardId);
      setSelectingTarget(selectedCardId !== cardId);
    } else {
      socket.emit("game:play_card", { roomId, cardId, targetIds: [] });
    }
  }

  function handleTargetClick(targetId: string) {
    if (!selectingTarget || !selectedCardId) return;
    socket.emit("game:play_card", { roomId, cardId: selectedCardId, targetIds: [targetId] });
    setSelectedCardId(null);
    setSelectingTarget(false);
  }

  function handleEndPlay() {
    socket.emit("game:end_play", { roomId });
    setSelectedCardId(null);
    setSelectingTarget(false);
  }

  function toggleDiscardCard(cardId: string) {
    if (!isDiscardPhase) return;
    setDiscardSelected(prev => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  function handleDiscard() {
    if (discardSelected.size < mustDiscardCount) return;
    socket.emit("game:discard", { roomId, cardIds: [...discardSelected] });
    setDiscardSelected(new Set());
  }

  // 判断某张手牌当前是否可点击
  function cardClickable(card: ExtCard): boolean {
    if (isPlayPhase) return true;
    if (isDiscardPhase) return true;
    return false;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-[#1a0d06] to-[#0d0703] relative">

      {/* ── 轮到我了：全屏闪烁提示 ──────────── */}
      {myTurnFlash && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="bg-gold/10 border-2 border-gold/60 rounded-2xl px-8 py-4 animate-pulse">
            <p className="text-gold text-2xl font-serif tracking-widest">⚔ 轮到你了！</p>
          </div>
        </div>
      )}

      {/* ── 弃牌提醒横幅 ─────────────────────── */}
      {isDiscardPhase && mustDiscardCount > 0 && (
        <div className="absolute top-10 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-red-900/80 border border-red-500/60 rounded-lg px-6 py-2 animate-bounce">
            <p className="text-red-300 font-bold text-sm">
              手牌超限！请弃置 {mustDiscardCount} 张（已选 {discardSelected.size}）
            </p>
          </div>
        </div>
      )}

      {/* ── 顶部状态栏 ─────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/70 border-b border-parchment/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gold font-serif text-sm">第 {gameState.round} 回合</span>
          <span className="text-parchment/30">·</span>
          <span className={`text-sm font-semibold ${isMyTurn ? "text-gold" : "text-parchment/60"}`}>
            {isMyTurn ? "你的" : `${currentPlayer?.name} 的`} {PHASE_ZH[gameState.phase]}
          </span>
          {!isMyTurn && (
            <span className="text-parchment/30 text-xs">（等待中）</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-parchment/40">
          <span>牌堆 {gameState.deck.length}</span>
          <span>弃牌 {gameState.discard.length}</span>
        </div>
      </div>

      {/* ── 其他玩家 ──────────────────────── */}
      <div className="flex-shrink-0 flex justify-center gap-3 px-4 py-3 flex-wrap min-h-[100px] items-start">
        {others.map(player => (
          <div
            key={player.id}
            className={`transition-all duration-200 ${
              selectingTarget && player.isAlive && player.id !== myPlayerId
                ? "cursor-pointer"
                : ""
            }`}
            onClick={() => selectingTarget && player.isAlive && handleTargetClick(player.id)}
          >
            <HeroPanel
              player={player}
              isCurrentTurn={currentPlayer?.id === player.id}
              compact
              isTargetable={selectingTarget && player.isAlive && player.id !== myPlayerId}
            />
          </div>
        ))}
      </div>

      {/* ── 目标选择提示 + 日志 ──────────── */}
      <div className="flex-1 flex gap-3 px-4 py-2 min-h-0">
        {selectingTarget && (
          <div className="w-40 flex-shrink-0 panel p-3 flex flex-col items-center justify-center gap-3 border-gold/40">
            <p className="text-gold text-sm font-semibold text-center">↑ 点击上方武将选择目标</p>
            <div className="w-8 h-0.5 bg-gold/30" />
            <button
              className="btn-secondary text-xs py-1 px-3 w-full"
              onClick={() => { setSelectedCardId(null); setSelectingTarget(false); }}
            >
              取消
            </button>
          </div>
        )}

        <div className="flex-1 panel p-3 overflow-y-auto text-xs space-y-0.5">
          <p className="text-parchment/30 mb-2 sticky top-0 bg-black/40">游戏日志</p>
          {gameState.log.map((msg, i) => {
            const isRecent = i >= gameState.log.length - 3;
            return (
              <p key={i} className={`leading-relaxed ${isRecent ? "text-parchment/80" : "text-parchment/40"}`}>
                {msg}
              </p>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* ── 我的区域 ──────────────────────── */}
      {me && (
        <div className="flex-shrink-0 border-t border-parchment/10 bg-black/60 p-3">
          <div className="flex items-start gap-3">
            {/* 我的武将面板 + 操作按钮 */}
            <div className="flex-shrink-0">
              <HeroPanel player={me} isCurrentTurn={isMyTurn} />
              <div className="mt-2 space-y-1">
                {isPlayPhase && (
                  <button className="btn-secondary text-xs py-1 w-full" onClick={handleEndPlay}>
                    结束出牌
                  </button>
                )}
                {isDiscardPhase && (
                  <button
                    className={`text-xs py-1 w-full rounded-lg border font-bold transition-all ${
                      discardSelected.size >= mustDiscardCount && discardSelected.size > 0
                        ? "btn-danger"
                        : "opacity-40 bg-transparent border-parchment/20 text-parchment/40 cursor-not-allowed"
                    }`}
                    onClick={handleDiscard}
                    disabled={discardSelected.size < mustDiscardCount}
                  >
                    弃置 ({discardSelected.size}/{mustDiscardCount})
                  </button>
                )}
              </div>
            </div>

            {/* 手牌 */}
            <div className="flex-1 min-w-0">
              <p className="text-parchment/40 text-xs mb-2">
                手牌 {me.hand.length}
                {isPlayPhase && <span className="text-gold ml-2">· 点击出牌</span>}
                {isDiscardPhase && mustDiscardCount > 0 && (
                  <span className="text-red-400 ml-2">· 选择要弃置的牌</span>
                )}
                {!isMyTurn && <span className="text-parchment/30 ml-2">· 等待对方</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {me.hand.map(card => {
                  const ec = card as ExtCard;
                  const isSelected = card.id === selectedCardId || discardSelected.has(card.id);
                  const canAct = cardClickable(ec);
                  const isRedSuit = card.suit === "heart" || card.suit === "diamond";
                  const suitSym = { spade: "♠", heart: "♥", club: "♣", diamond: "♦" }[card.suit];
                  const numStr = { 1: "A", 11: "J", 12: "Q", 13: "K" }[card.number as 1|11|12|13] ?? String(card.number);
                  const typeGrad = {
                    basic: "from-slate-700 to-slate-800 border-slate-500",
                    trick: "from-amber-800 to-amber-900 border-amber-600",
                    equip: "from-emerald-800 to-emerald-900 border-emerald-600",
                  }[card.type];

                  return (
                    <div
                      key={card.id}
                      style={{ width: 48, height: 72 }}
                      className={`
                        relative select-none rounded-lg border bg-gradient-to-b ${typeGrad}
                        ${isSelected ? "ring-2 ring-gold -translate-y-3 z-10 shadow-lg shadow-gold/30" : ""}
                        ${canAct && !isSelected ? "hover:-translate-y-1 cursor-pointer" : ""}
                        ${!canAct ? "opacity-40 cursor-not-allowed grayscale" : ""}
                        transition-all duration-150
                      `}
                      onClick={() => {
                        if (isPlayPhase) handleCardClick(card.id);
                        else if (isDiscardPhase) toggleDiscardCard(card.id);
                      }}
                    >
                      <div className={`absolute top-0.5 left-0.5 text-xs leading-tight ${isRedSuit ? "text-red-400" : "text-parchment/80"}`}>
                        <div>{suitSym}</div>
                        <div>{numStr}</div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center px-0.5">
                        <span className="text-xs font-semibold text-parchment text-center leading-tight">
                          {card.name}
                        </span>
                      </div>
                      {card.type !== "basic" && (
                        <div className="absolute bottom-0.5 right-0.5 text-parchment/30 text-xs">
                          {card.type === "equip" ? "装" : "囊"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 响应弹窗 ──────────────────────── */}
      {pendingRequest && (
        <ResponseDialog
          request={pendingRequest}
          myHand={me?.hand ?? []}
          onRespond={(cardId) => {
            socket.emit("game:respond", { roomId, requestId: pendingRequest.requestId, cardId });
            useStore.getState().setPendingRequest(null);
          }}
          onSkip={() => {
            socket.emit("game:respond", { roomId, requestId: pendingRequest.requestId });
            useStore.getState().setPendingRequest(null);
          }}
        />
      )}

      {/* ── 游戏结束 ──────────────────────── */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50">
          <div className="panel p-10 text-center max-w-sm w-full mx-4">
            <h2 className="text-4xl font-serif text-gold mb-2 tracking-widest">游戏结束</h2>
            <div className="w-16 h-0.5 bg-gold/40 mx-auto mb-4" />
            <p className="text-parchment text-xl mb-2">
              {gameState.winner?.map(w =>
                ({ lord: "主公", loyalist: "忠臣", rebel: "反贼", spy: "内奸" }[w])
              ).join(" & ")} 获胜
            </p>
            <div className="mt-6 space-y-2">
              {gameState.players.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm px-2">
                  <span className={p.isAlive ? "text-parchment" : "text-parchment/40 line-through"}>
                    {p.name}
                    {p.id === myPlayerId && " （你）"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.identity === "lord" ? "bg-gold/20 text-gold" :
                    p.identity === "loyalist" ? "bg-blue-500/20 text-blue-400" :
                    p.identity === "rebel" ? "bg-red-500/20 text-red-400" :
                    "bg-purple-500/20 text-purple-400"
                  }`}>
                    {{ lord: "主公", loyalist: "忠臣", rebel: "反贼", spy: "内奸" }[p.identity]}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="btn-primary mt-6 w-full"
              onClick={() => {
                useStore.getState().setGameState(null);
                useStore.getState().setCurrentRoom(null);
                useStore.getState().setRoomId("");
                useStore.getState().setMyPlayerId("");
                useStore.getState().setPage("lobby");
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
