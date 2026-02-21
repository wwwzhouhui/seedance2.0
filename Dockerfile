# 全局参数
ARG NODE_VERSION=22

# ==========================================
# 第一阶段：构建前端 (Frontend Build)
# ==========================================
FROM node:${NODE_VERSION}-alpine AS frontend-build
WORKDIR /app

# 复制前端依赖文件并安装
COPY package.json package-lock.json ./
RUN npm install

# 复制前端源代码及构建配置
COPY src/ ./src/
COPY index.html tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./

# Vite 构建参数（构建时注入，可选）
ARG VITE_DEFAULT_SESSION_ID
ENV VITE_DEFAULT_SESSION_ID=$VITE_DEFAULT_SESSION_ID

# 执行前端构建
RUN npm run build

# ==========================================
# 第二阶段：生产运行环境 (Production Runtime)
# ==========================================
FROM node:${NODE_VERSION}-slim AS production
WORKDIR /app

# 安装 Chromium 运行所需的系统依赖 + curl（用于健康检查）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libwayland-client0 \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖文件并安装（仅生产依赖）
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm install --production

# 安装 Chromium 浏览器（Playwright）
RUN cd server && npx playwright-core install chromium

# 复制后端代码
COPY server/index.js server/browser-service.js ./server/

# 从第一阶段复制前端构建产物
COPY --from=frontend-build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "server/index.js"]
