# 三国杀 Web 项目 · Claude Code Agent 指令文件

## 🎯 项目使命
开发一款完整的**三国杀（SanguoSha）在线对战游戏网站**，支持多人实时对战。

## 🤖 Agent 行为规范

### 启动时必做（每次会话开始）
1. 读取 `memory/MEMORY.md` — 加载上次会话记忆（DECISIONS.md 已并入 MEMORY.md）
2. 读取 `memory/PROGRESS.md` — 了解当前开发进度
3. 汇报当前状态，然后**主动询问本次会话目标**

### Agent 自主权（重要）
以下事项 Agent 可以**自行决定，无需询问用户**：
- 技术实现细节（算法选择、代码组织方式）
- 文件结构调整（在已确认的整体架构内）
- 依赖库的具体版本和配置
- 代码风格和重构
- 更新 `CLAUDE.md`、`memory/MEMORY.md`、`memory/PROGRESS.md`
- 已在 MEMORY.md 中记录的技术决策（无需重复询问）

### 需要询问用户的情况（仅限以下）
- 游戏规则有明显歧义（如某张牌的效果有争议）
- 用户体验/视觉风格方向（用户会主动反馈）
- 影响项目整体方向的大决策（如增加新游戏模式）

询问格式（仅在真正需要时使用）：
```
决策点：[问题描述]
选项 A：[方案] — 优点/缺点
选项 B：[方案] — 优点/缺点
请选择（A/B）或提供其他方向：
```

### 记忆更新规则
每完成一个功能模块后，必须更新记忆文件：
```bash
# 完成功能后运行
node scripts/update-memory.js --fact "实现了XX功能" --file src/xx.ts
```
上下文用量超过 60% 时，主动执行记忆压缩：
```bash
node scripts/compress-memory.js
```

### 网络搜索规范
需要参考资料时，先搜索，再实现：
```bash
# 搜索三国杀规则参考
node scripts/search-ref.js "三国杀 [具体规则]"
```

---

## 📁 项目结构

```
sanguosha/
├── CLAUDE.md              ← 你正在读这个
├── memory/
│   ├── MEMORY.md          ← 持久化事实记忆
│   ├── DECISIONS.md       ← 技术决策记录
│   └── PROGRESS.md        ← 开发进度追踪
├── src/
│   ├── game/              ← 游戏核心逻辑（纯 TypeScript，无框架依赖）
│   │   ├── engine.ts      ← 游戏引擎主循环
│   │   ├── cards.ts       ← 牌堆系统
│   │   ├── heroes.ts      ← 武将数据 & 技能
│   │   ├── phases.ts      ← 回合阶段管理
│   │   ├── skills.ts      ← 技能执行引擎
│   │   └── damage.ts      ← 伤害计算
│   ├── ui/                ← React 前端
│   │   ├── App.tsx
│   │   ├── Lobby.tsx      ← 游戏大厅
│   │   ├── Room.tsx       ← 房间页
│   │   ├── GameTable.tsx  ← 对战桌面
│   │   ├── CardHand.tsx   ← 手牌区
│   │   ├── HeroPanel.tsx  ← 武将面板
│   │   └── styles/
│   ├── network/           ← Socket.io 实时通信
│   │   ├── server.ts      ← Node.js 服务端
│   │   ├── client.ts      ← 前端 Socket 客户端
│   │   └── events.ts      ← 事件类型定义
│   └── data/              ← 游戏数据（JSON）
│       ├── heroes.json    ← 武将数据库
│       ├── cards.json     ← 牌库数据
│       └── skills.json    ← 技能描述
├── scripts/               ← Agent 工具脚本
│   ├── update-memory.js
│   ├── compress-memory.js
│   └── search-ref.js
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🗺️ 开发路线图

### Phase 1: 基础架构 [当前阶段]
- [ ] 项目初始化（Vite + React + TypeScript）
- [ ] Socket.io 服务端搭建
- [ ] 基础游戏引擎骨架
- [ ] 牌堆系统（基本牌 52 张）

### Phase 2: 核心游戏逻辑
- [ ] 回合系统（摸牌、出牌、弃牌、结束）
- [ ] 响应链（杀→闪，锦囊→无懈可击）
- [ ] 伤害系统（普通伤害、火焰、雷电）
- [ ] 装备系统（武器、防具、坐骑）

### Phase 3: 武将系统
- [ ] 武将框架（技能槽、体力）
- [ ] 基础武将 × 10（曹操、刘备、孙权、诸葛亮等）
- [ ] 技能触发机制（主动/被动/限定）

### Phase 4: 网络 & 大厅
- [ ] 房间创建 / 加入 / 观战
- [ ] 玩家状态同步
- [ ] 断线重连
- [ ] 观战系统

### Phase 5: UI 精化
- [ ] 三国风格视觉设计
- [ ] 卡牌动画
- [ ] 技能特效
- [ ] 音效系统

### Phase 6: 测试 & 部署
- [ ] 2-8 人游戏测试
- [ ] 性能优化
- [ ] Docker 部署方案
- [ ] Nginx 配置

---

## ⚙️ 技术栈（已确认）

| 层级 | 技术 | 理由 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 组件化，生态丰富 |
| 构建工具 | Vite | 极速 HMR |
| 样式 | Tailwind CSS + CSS Modules | 工具类 + 局部样式 |
| 实时通信 | Socket.io | 成熟，支持断线重连 |
| 后端 | Node.js + Express | 同语言，低门槛 |
| 状态管理 | Zustand | 轻量，适合游戏状态 |
| 测试 | Vitest | Vite 原生 |

---

## 🎮 三国杀核心规则摘要

### 身份模式（标准）
- 主公 1 人，忠臣 N 人，反贼 N 人，内奸 1 人
- 主公体力上限 +1，技能先亮

### 回合流程
```
开始阶段 → 判定阶段 → 摸牌阶段(+2) → 出牌阶段 → 弃牌阶段 → 结束阶段
```

### 响应链
```
出牌 → 等待响应（顺时针） → 结算
杀 → [闪] or [受到伤害]
决斗 → 轮流出杀 → 先不出者受1伤害
```

### 伤害类型
- 普通伤害（黑色）
- 火焰伤害（红色，触发特定技能）
- 雷电伤害（蓝色，触发特定技能）

---

## 📋 开发规范

### 代码风格
- 游戏逻辑：**纯函数优先**，状态集中在 GameState 对象
- 组件：**函数组件 + Hooks**，避免 class
- 事件命名：`game:phase:start`，`player:card:play` 格式

### 提交规范
```
feat(heroes): 添加曹操技能「奸雄」「护驾」
fix(engine): 修复锦囊响应链死锁问题
refactor(ui): 优化 CardHand 拖拽性能
```

### 文件命名
- 组件：PascalCase（`GameTable.tsx`）
- 工具/逻辑：camelCase（`damageCalc.ts`）
- 数据：kebab-case（`hero-list.json`）
