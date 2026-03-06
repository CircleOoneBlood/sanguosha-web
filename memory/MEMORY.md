# 三国杀项目 · Agent 记忆文件

> 最后更新：会话 #1（2026-03-06）
> 记忆版本：v1.1

---

## 项目基本信息

- **项目名称**：三国杀 Web 在线对战平台
- **GitHub**：git@github.com:CircleOoneBlood/sanguosha-web.git
- **开发模式**：标准身份局优先（主公/忠臣/反贼/内奸）
- **Agent 自主权**：技术决策、文件结构、CLAUDE.md 更新均有自主权
- **用户偏好**：技术细节自主决定，UX 体验反馈由用户提出

---

## 技术决策（已确认，无需重复询问）

| 决策项 | 已选方案 |
|--------|----------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 实时通信 | Socket.io |
| 后端运行时 | Node.js + Express |
| 状态管理 | Zustand |
| 样式方案 | Tailwind CSS |
| 游戏模式 | 标准身份局（标准 108 张牌）|
| 第一版武将 | 曹操/刘备/孙权/诸葛亮/赵云（5 位）|
| 持久化 | 临时房间制，后期加用户系统 |

---

## 已实现功能（会话 #1）

### Phase 1 基础架构 ✅
- `tsconfig.json` + `tsconfig.node.json` + `tsconfig.server.json`
- `vite.config.ts`（路径别名：@game, @ui, @network, @data）
- `tailwind.config.js`（三国主题色：parchment, ink-dark, gold, jade, wei/shu/wu/qun）
- `postcss.config.js`
- `index.html`
- `.gitignore`
- `npm install` 完成，TypeScript 零报错

### Phase 2 游戏引擎 ✅
- `src/game/cards.ts` — 标准 108 张牌堆（createStandardDeck），Fisher-Yates 洗牌
- `src/game/engine.ts` — 完整 GameEngine 实现：
  - `initGame()` 身份分配（2-8人表）、武将分配、发牌
  - `runTurn()` 完整 6 阶段回合
  - `judgePhase()` 延时锦囊判定（闪电/乐不思蜀/兵粮寸断）
  - `playCard()` 出牌验证 + 所有牌效果
  - `resolveSlash()` 杀→等待闪响应链
  - `dealDamage()` 含濒死检查+仁王盾
  - `recoverHp()`
  - `checkGameOver()` 胜负判定（主公死/反贼全死/内奸独活）
  - `getDistance()` 含坐骑计算
- `src/game/heroes.ts` — 5 位武将 + 8 技能骨架

### 网络层基础 ✅
- `src/network/events.ts` — 完整类型化事件定义（ServerToClientEvents / ClientToServerEvents）
- `src/network/client.ts` — Socket.io 客户端封装（单例）
- `src/network/server.ts` — 房间管理 + GameEngine 接入 + waitForResponse 机制

### 前端 UI 骨架 ✅
- `src/store.ts` — Zustand 全局状态
- `src/main.tsx` — React 入口
- `src/ui/styles/index.css` — Tailwind 基础样式 + 组件 class
- `src/ui/App.tsx` — 页面路由（lobby/room/game）
- `src/ui/Lobby.tsx` — 大厅（房间列表/创建/加入）
- `src/ui/Room.tsx` — 房间等待（准备/离开）
- `src/ui/GameTable.tsx` — 游戏桌面骨架
- `src/ui/components/HeroPanel.tsx` — 武将面板（血量/装备/身份）
- `src/ui/components/CardHand.tsx` — 手牌（点击出牌/弃牌）
- `src/ui/components/ResponseDialog.tsx` — 响应弹窗（闪/无懈/桃，带倒计时）

---

## 已知待完善（下次会话优先）

1. **出牌目标选择**：GameTable 中点击手牌后需要点击目标玩家才能出（杀/决斗/锦囊）
2. **引擎回合推进**：playPhase/discardPhase 需要与 Socket 事件协调（Promise 解决方案）
3. **武将技能 Phase 3**：奸雄/护驾/龙胆等具体逻辑待实现
4. **用户系统**：未来加 JWT + 账号体系
5. **弃牌逻辑**：dismantle/steal 的 select_card 响应待完善

---

## 关键架构决策（供继承参考）

- **引擎纯 TS，通过 ctx.emit 回调与网络解耦**：GameEngine 不 import socket.io，emit 由 server.ts 注入
- **waitForResponse 模式**：引擎 await Promise，server.ts 用 Map<requestId, resolve> 等待客户端响应
- **GameState 是唯一真相来源**：server 每次 emit 后广播完整 state_sync
- **身份表**：IDENTITY_TABLE 定义 2-8 人身份组合，主公始终在 index 0

---

## 文件结构快速索引

```
src/
  game/
    engine.ts   ← 游戏引擎（核心）
    cards.ts    ← 108张牌堆定义
    heroes.ts   ← 5位武将数据
  network/
    server.ts   ← Node.js 服务端
    client.ts   ← 前端 Socket 客户端
    events.ts   ← 事件类型定义
  ui/
    App.tsx / Lobby.tsx / Room.tsx / GameTable.tsx
    components/
      HeroPanel.tsx / CardHand.tsx / ResponseDialog.tsx
    styles/index.css
  store.ts      ← Zustand 状态
  main.tsx      ← React 入口
```
