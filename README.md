# ⚔️ 三国杀 Web — Claude Code Agent 项目

> 本项目由 Claude Code 自主 Agent 驱动开发。

## 🚀 快速开始（人类操作员）

### 1. 初始化项目
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
# 前端: http://localhost:5173
# 服务端: http://localhost:3001
```

### 3. 启动 Claude Code Agent
```bash
claude  # 在项目根目录运行
```

Claude 会自动读取 `CLAUDE.md`，加载记忆，并询问本次开发目标。

---

## 🧠 记忆系统使用

### Agent 自动记录（Agent 调用）
```bash
# 记录新事实
npm run memory:update -- --fact "完成了牌堆系统"

# 记录决策
npm run memory:update -- --decision-key "游戏模式" --decision "标准身份局"

# 标记任务完成
npm run memory:update -- --progress "项目初始化（Vite + React + TS）"
```

### 导出给下次 Claude 会话
```bash
npm run memory:export
# 生成: memory/EXPORT_FOR_NEXT_SESSION.md
# 将此文件内容粘贴给新会话即可继续
```

### 压缩（上下文快满时）
```bash
npm run memory:compress
```

---

## 📁 关键文件

| 文件 | 说明 |
|------|------|
| `CLAUDE.md` | Agent 主指令文件，每次会话必读 |
| `memory/MEMORY.md` | 持久化事实 & 决策记忆 |
| `memory/PROGRESS.md` | 开发进度追踪 |
| `src/game/engine.ts` | 游戏引擎（待 Agent 实现 TODO 部分）|
| `src/game/heroes.ts` | 武将数据 & 技能（待实现）|
| `src/network/server.ts` | Socket.io 服务端（待实现）|

---

## 🗺️ 开发路线图

见 `CLAUDE.md` 或 `memory/PROGRESS.md`

---

## 📋 Agent 工作流程

```
会话开始
  ↓
读取 memory/MEMORY.md & PROGRESS.md
  ↓
汇报状态，询问本次目标
  ↓
搜索参考资料（如需要）
  ↓
遇到决策点 → 询问用户确认
  ↓
实现功能，写代码
  ↓
运行 npm run memory:update 记录完成情况
  ↓
上下文 > 60% → npm run memory:compress
  ↓
会话结束 → npm run memory:export
```
