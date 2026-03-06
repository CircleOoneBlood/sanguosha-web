import { useEffect, useState } from "react";
import { useStore } from "../../store";

// 各技能的特色颜色
const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  jianyiong:  { bg: "bg-blue-900/80",   text: "text-blue-300",   border: "border-blue-500/60" },
  hujia:      { bg: "bg-blue-900/80",   text: "text-blue-300",   border: "border-blue-500/60" },
  rende:      { bg: "bg-red-900/80",    text: "text-red-300",    border: "border-red-500/60" },
  jijang:     { bg: "bg-red-900/80",    text: "text-red-300",    border: "border-red-500/60" },
  zhiheng:    { bg: "bg-green-900/80",  text: "text-green-300",  border: "border-green-500/60" },
  guanxing:   { bg: "bg-purple-900/80", text: "text-purple-300", border: "border-purple-500/60" },
  kongcheng:  { bg: "bg-purple-900/80", text: "text-purple-300", border: "border-purple-500/60" },
  longdan:    { bg: "bg-cyan-900/80",   text: "text-cyan-300",   border: "border-cyan-500/60" },
};

const DEFAULT_COLORS = { bg: "bg-amber-900/80", text: "text-amber-300", border: "border-amber-500/60" };

interface ToastItem {
  id: string;
  playerId: string;
  playerName: string;
  skillName: string;
  entering: boolean;
}

export default function SkillToastLayer() {
  const { skillToasts } = useStore();
  const [visibleToasts, setVisibleToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    skillToasts.forEach(toast => {
      setVisibleToasts(prev => {
        if (prev.some(t => t.id === toast.id)) return prev;
        // 加入时先 entering=true，触发入场动画
        return [...prev, { ...toast, entering: true }];
      });
      // 50ms 后移除 entering 标记
      setTimeout(() => {
        setVisibleToasts(prev =>
          prev.map(t => t.id === toast.id ? { ...t, entering: false } : t)
        );
      }, 50);
    });

    // 清理已经从 store 移除的 toast
    setVisibleToasts(prev =>
      prev.filter(t => skillToasts.some(s => s.id === t.id))
    );
  }, [skillToasts]);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {visibleToasts.map(toast => {
        const skillId = toast.skillName; // will fallback
        // 找到 skillId by scanning all heroes
        const colors = DEFAULT_COLORS;

        return (
          <div
            key={toast.id}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg border backdrop-blur-sm
              ${colors.bg} ${colors.border}
              shadow-lg
              transition-all duration-300
              ${toast.entering ? "opacity-0 translate-x-8 scale-90" : "opacity-100 translate-x-0 scale-100"}
            `}
          >
            {/* 技能发光点 */}
            <div className={`w-2 h-2 rounded-full animate-ping ${colors.text} bg-current`} />
            <div className="flex flex-col">
              <span className={`text-xs font-bold ${colors.text} font-serif tracking-wide`}>
                【{toast.skillName}】发动！
              </span>
              <span className="text-parchment/50 text-xs">{toast.playerName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
