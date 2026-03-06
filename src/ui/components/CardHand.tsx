import { useState } from "react";
import type { Card } from "../../game/engine";

interface Props {
  cards: Card[];
  canPlay: boolean;
  canDiscard: boolean;
  mustDiscardCount: number;
  onPlay: (cardId: string, targetIds: string[]) => void;
  onDiscard: (cardIds: string[]) => void;
}

const suitSymbol: Record<string, string> = {
  spade: "♠", heart: "♥", club: "♣", diamond: "♦",
};

const suitColor: Record<string, string> = {
  spade: "text-parchment", heart: "text-red-400",
  club: "text-parchment", diamond: "text-red-400",
};

const cardTypeColor: Record<string, string> = {
  basic: "from-slate-800 to-slate-900 border-slate-600",
  trick: "from-amber-900 to-amber-950 border-amber-700",
  equip: "from-emerald-900 to-emerald-950 border-emerald-700",
};

export default function CardHand({ cards, canPlay, canDiscard, mustDiscardCount, onPlay, onDiscard }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(cardId: string) {
    if (!canPlay && !canDiscard) return;

    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  function handlePlay(cardId: string) {
    if (!canPlay) return;
    onPlay(cardId, []); // 目标选择在 GameTable 层处理
    setSelected(new Set());
  }

  function handleDiscard() {
    if (!canDiscard) return;
    if (selected.size === 0) return;
    onDiscard([...selected]);
    setSelected(new Set());
  }

  return (
    <div>
      {/* 手牌 */}
      <div className="flex flex-wrap gap-2">
        {cards.map(card => {
          const isSelected = selected.has(card.id);
          return (
            <div
              key={card.id}
              className={`relative cursor-pointer rounded-lg border bg-gradient-to-b
                ${cardTypeColor[card.type]}
                ${isSelected ? "ring-2 ring-gold -translate-y-2" : "hover:-translate-y-1"}
                transition-transform duration-150 select-none
                w-14 h-20 flex flex-col items-center justify-center p-1`}
              onClick={() => canPlay ? handlePlay(card.id) : toggleSelect(card.id)}
            >
              {/* 花色+点数 */}
              <div className={`absolute top-1 left-1 text-xs leading-none ${suitColor[card.suit]}`}>
                <div>{suitSymbol[card.suit]}</div>
                <div>{card.number === 1 ? "A" : card.number === 11 ? "J" : card.number === 12 ? "Q" : card.number === 13 ? "K" : card.number}</div>
              </div>

              {/* 牌名 */}
              <span className="text-xs font-semibold text-center text-parchment leading-tight">
                {card.name}
              </span>

              {/* 类型标记 */}
              <div className="absolute bottom-1 right-1">
                <span className="text-parchment/30 text-xs">
                  {card.type === "equip" ? "装" : card.type === "trick" ? "囊" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 弃牌按钮 */}
      {canDiscard && selected.size > 0 && (
        <button
          className={`mt-2 btn-danger text-sm ${
            selected.size < mustDiscardCount ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleDiscard}
          disabled={selected.size < mustDiscardCount}
        >
          弃置 {selected.size} 张牌
          {mustDiscardCount > 0 && ` (还需 ${Math.max(0, mustDiscardCount - selected.size)} 张)`}
        </button>
      )}
    </div>
  );
}
