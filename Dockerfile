# ─── 构建阶段 ───────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── 运行阶段 ───────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# 只安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 从构建阶段复制产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

EXPOSE 3001

CMD ["node", "dist-server/server.js"]
