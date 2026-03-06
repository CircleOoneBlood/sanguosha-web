# ─── Stage 1: 构建前端 + 服务端 ──────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# 前端：dist/
# 服务端：dist-server/server.js
RUN npm run build

# ─── Stage 2: 生产服务端 ─────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist-server ./dist-server

EXPOSE 3001
CMD ["node", "dist-server/server.js"]

# ─── Stage 3: nginx 静态文件镜像 ─────────────────
# docker build --target nginx-dist 时使用
FROM nginx:1.25-alpine AS nginx-dist

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
