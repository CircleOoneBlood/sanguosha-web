import { useState, useEffect } from "react";
import type { Card } from "../../game/engine";
import type { PendingRequest } from "../../store";
import { CARD_NAMES } from "../../game/cards";

interface Props {
  request: PendingRequest;
  myHand: Card[];
  onRespond: (cardId: string) => void;
  onSkip: () => void;
}

const requestLabel: Record<string, string> = {
  slash_dodge: "请出「闪」",
  trick_nullify: "是否使用「无懈可击」？",
  duel_slash: "决斗：请出「杀」",
  supply_slash: "是否出「桃」救援？",
};

const allowedCard: Record<string, string> = {
  slash_dodge: CARD_NAMES.DODGE,
  trick_nullify: CARD_NAMES.NULLIFICATION,
  duel_slash: CARD_NAMES.SLASH,
  supply_slash: CARD_NAMES.PEACH,
};

export default function ResponseDialog({ request, myHand, onRespond, onSkip }: Props) {
  const [timeLeft, setTimeLeft] = useState(Math.floor(request.timeout / 1000));

  useEffect(() => {
    if (timeLeft <= 0) { onSkip(); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onSkip]);

  const validCards = myHand.filter(c => c.name === allowedCard[request.type]);

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
      <div className="panel p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-parchment font-serif text-lg">
            {requestLabel[request.type] ?? "响应请求"}
          </h3>
          <span className={`text-sm font-bold ${timeLeft <= 3 ? "text-red-400 animate-pulse" : "text-parchment/60"}`}>
            {timeLeft}s
          </span>
        </div>

        {validCards.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {validCards.map(card => (
              <button
                key={card.id}
                className="px-3 py-2 bg-gold/20 border border-gold/50 rounded-lg text-parchment
                           hover:bg-gold/30 transition-colors text-sm font-semibold"
                onClick={() => onRespond(card.id)}
              >
                {card.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-parchment/40 text-sm mb-4">没有可用的牌</p>
        )}

        <button className="btn-secondary w-full text-sm" onClick={onSkip}>
          跳过
        </button>
      </div>
    </div>
  );
}
