import type { Player } from "../../game/engine";

interface Props {
  player: Player;
  isCurrentTurn: boolean;
  compact?: boolean;
  isTargetable?: boolean;
}

const kingdomColor: Record<string, string> = {
  wei: "border-wei/60 bg-wei/10",
  shu: "border-shu/60 bg-shu/10",
  wu: "border-wu/60 bg-wu/10",
  qun: "border-qun/60 bg-qun/10",
};

const kingdomText: Record<string, string> = {
  wei: "text-wei", shu: "text-shu", wu: "text-wu", qun: "text-qun",
};

export default function HeroPanel({ player, isCurrentTurn, compact = false, isTargetable = false }: Props) {
  const kingdom = player.hero.kingdom;
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const isDanger = player.hp <= 1;

  return (
    <div
      className={`panel border ${kingdomColor[kingdom]} ${
        isCurrentTurn ? "ring-1 ring-gold/60" : ""
      } ${isTargetable ? "ring-2 ring-red-400/80 shadow-lg shadow-red-900/50 animate-pulse" : ""}
      ${compact ? "p-2 min-w-[100px]" : "p-3 min-w-[140px]"} ${
        !player.isAlive ? "opacity-40 grayscale" : ""
      } transition-all`}
    >
      {/* 武将名 */}
      <div className="flex items-center justify-between mb-1">
        <span className={`font-serif font-bold ${compact ? "text-sm" : "text-base"} ${kingdomText[kingdom]}`}>
          {player.hero.name}
        </span>
        {isCurrentTurn && (
          <span className="text-gold text-xs animate-pulse">▶</span>
        )}
      </div>

      {/* 玩家名 */}
      <p className="text-parchment/60 text-xs mb-2">{player.name}</p>

      {/* 血量 */}
      <div className="mb-1">
        <div className="flex items-center gap-1 mb-0.5">
          {Array.from({ length: player.maxHp }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-sm transition-colors ${
                i < player.hp
                  ? isDanger ? "bg-red-500" : "bg-jade"
                  : "bg-black/50 border border-parchment/10"
              }`}
            />
          ))}
        </div>
        <p className="text-parchment/40 text-xs text-right">{player.hp}/{player.maxHp}</p>
      </div>

      {/* 手牌数 */}
      {!compact && (
        <div className="flex items-center gap-2 text-xs text-parchment/50">
          <span>手牌 {player.hand.length}</span>
          {player.judgeArea.length > 0 && (
            <span className="text-yellow-400">判定 {player.judgeArea.length}</span>
          )}
        </div>
      )}

      {/* 装备 */}
      {!compact && Object.values(player.equips).some(Boolean) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Object.entries(player.equips).map(([slot, card]) =>
            card ? (
              <span key={slot} className="text-xs bg-black/40 px-1 rounded text-parchment/60">
                {card.name}
              </span>
            ) : null,
          )}
        </div>
      )}

      {/* 身份（已公开时显示） */}
      {player.identityRevealed && (
        <div className="mt-1">
          <span className={`text-xs px-1 rounded ${
            player.identity === "lord" ? "text-gold bg-gold/10" :
            player.identity === "loyalist" ? "text-blue-400 bg-blue-400/10" :
            player.identity === "rebel" ? "text-red-400 bg-red-400/10" :
            "text-purple-400 bg-purple-400/10"
          }`}>
            {{ lord: "主公", loyalist: "忠臣", rebel: "反贼", spy: "内奸" }[player.identity]}
          </span>
        </div>
      )}
    </div>
  );
}
