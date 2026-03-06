import type { Player } from "../../game/engine";
import type { ExtCard } from "../../game/cards";

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

const identityLabel: Record<string, string> = {
  lord: "主公", loyalist: "忠臣", rebel: "反贼", spy: "内奸",
};

const identityColor: Record<string, string> = {
  lord: "text-gold bg-gold/15",
  loyalist: "text-blue-400 bg-blue-400/10",
  rebel: "text-red-400 bg-red-400/10",
  spy: "text-purple-400 bg-purple-400/10",
};

export default function HeroPanel({ player, isCurrentTurn, compact = false, isTargetable = false }: Props) {
  const kingdom = player.hero.kingdom;
  const isDanger = player.hp <= 1;
  const isDead = !player.isAlive;

  return (
    <div
      className={[
        "panel border transition-all",
        kingdomColor[kingdom],
        isCurrentTurn && !isTargetable ? "ring-1 ring-gold/60" : "",
        isTargetable ? "ring-2 ring-red-400 shadow-lg shadow-red-900/40 animate-pulse cursor-pointer" : "",
        compact ? "p-2 w-28" : "p-3 w-36",
        isDead ? "opacity-35 grayscale" : "",
      ].filter(Boolean).join(" ")}
    >
      {/* 武将名 + 回合指示 */}
      <div className="flex items-center justify-between mb-0.5">
        <span className={`font-serif font-bold leading-tight ${compact ? "text-sm" : "text-base"} ${kingdomText[kingdom]}`}>
          {player.hero.name}
        </span>
        {isCurrentTurn && !isTargetable && (
          <span className="text-gold text-xs animate-pulse">▶</span>
        )}
        {isTargetable && (
          <span className="text-red-400 text-xs animate-bounce">⚔</span>
        )}
      </div>

      {/* 玩家名 */}
      <p className="text-parchment/50 text-xs mb-1.5 truncate">{player.name}</p>

      {/* 血量格 */}
      <div className="mb-1">
        <div className="flex items-center gap-0.5 mb-0.5">
          {Array.from({ length: player.maxHp }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-sm transition-colors ${
                i < player.hp
                  ? isDanger ? "bg-red-500 shadow-sm shadow-red-500/50" : "bg-jade"
                  : "bg-black/50 border border-parchment/10"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-mono ${isDanger ? "text-red-400" : "text-parchment/40"}`}>
            {player.hp}/{player.maxHp}
          </span>
          {/* 手牌数 — compact 和完整都显示，这是关键情报 */}
          <span className="text-xs text-parchment/40">
            🃏{player.hand.length}
          </span>
        </div>
      </div>

      {/* 判定区 */}
      {player.judgeArea.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-1">
          {player.judgeArea.map(c => (
            <span key={c.id} className="text-xs bg-yellow-900/40 border border-yellow-700/40 px-1 rounded text-yellow-400">
              {c.name}
            </span>
          ))}
        </div>
      )}

      {/* 装备（仅完整模式，compact 只显示装备数量提示） */}
      {compact && Object.values(player.equips).some(Boolean) && (
        <div className="text-parchment/30 text-xs">
          装备 {Object.values(player.equips).filter(Boolean).length} 件
        </div>
      )}
      {!compact && Object.values(player.equips).some(Boolean) && (
        <div className="flex flex-wrap gap-1 mb-1">
          {Object.entries(player.equips).map(([slot, card]) =>
            card ? (
              <span key={slot} className="text-xs bg-emerald-900/30 border border-emerald-700/30 px-1 rounded text-emerald-400">
                {card.name}
              </span>
            ) : null,
          )}
        </div>
      )}

      {/* 技能列表 */}
      {player.hero.skills.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {player.hero.skills.map(skill => (
            <div
              key={skill.id}
              className="group relative"
            >
              <span className={`
                text-xs px-1.5 py-0.5 rounded cursor-help font-semibold
                ${skill.type === "limit" ? "bg-red-900/50 text-red-300 border border-red-700/40" :
                  skill.type === "awaken" ? "bg-yellow-900/50 text-yellow-300 border border-yellow-700/40" :
                  "bg-parchment/10 text-parchment/70 border border-parchment/20"}
              `}>
                {skill.name}
              </span>
              {/* 悬停 tooltip 显示技能描述 */}
              {!compact && (
                <div className="absolute bottom-full left-0 mb-1 w-44 bg-black/95 border border-parchment/20
                                rounded-lg p-2 text-xs text-parchment/80 leading-relaxed
                                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50
                                shadow-xl">
                  <p className="font-semibold text-parchment mb-0.5">{skill.name}</p>
                  <p>{skill.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 身份 */}
      {player.identityRevealed && (
        <div className="mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${identityColor[player.identity]}`}>
            {identityLabel[player.identity]}
          </span>
        </div>
      )}
    </div>
  );
}
