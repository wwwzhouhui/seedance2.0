# Seedance 2.0 AI 视频生成

> 基于字节跳动即梦平台 Seedance 2.0 模型的全能参考视频生成 Web 应用

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v1.0.0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Docker](https://img.shields.io/badge/Docker-supported-2496ED.svg)

---

## 项目介绍

Seedance 2.0 Web 是一款面向内容创作者、设计师、营销人员的 AI 视频生成工具。用户只需上传 1-5 张参考图片，配合自然语言描述，即可通过即梦（jimeng.jianying.com）平台的 Seedance 2.0 模型生成高质量 AI 视频。

后端直接对接即梦 API，无需依赖 jimeng-free-api 等中间代理服务，架构简洁、部署方便，支持 Docker 一键部署。

 项目体验地址 https://seedance2.duckcloud.fun/

![image-20260214150856225](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/image-20260214150856225.png)

由于Seedance 2.0 太火爆了，本人积分也有限，需要体验可以设置自己的Session ID，体验完成后把Session ID删除

![image-20260214151003775](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/image-20260214151003775.png)

### 核心亮点

- 双模型可选：Seedance 2.0（高质量）/ Seedance 2.0 Fast（快速生成）
- 多图全能参考：最多 5 张参考图，`@1` `@2` 占位符灵活引用
- 异步任务架构：提交即返回，后台生成 + 实时进度反馈
- 视频代理播放：自动绕过 CDN CORS 限制，生成即可预览下载

## 功能清单

| 功能名称 | 功能说明 | 状态 |
|---------|---------|------|
| 双模型选择 | Seedance 2.0（高质量）和 Seedance 2.0 Fast（快速） | ✅ |
| 多图参考上传 | 支持点击 / 拖拽上传 1-5 张参考图片 | ✅ |
| 提示词编辑 | 5000 字符，`@1` `@2` 占位符引用图片 | ✅ |
| 参考模式 | 全能参考、首帧参考、尾帧参考 | ✅ |
| 画面比例 | 21:9 / 16:9 / 4:3 / 1:1 / 3:4 / 9:16 | ✅ |
| 视频时长 | 4 - 15 秒可选 | ✅ |
| 实时进度 | 生成过程实时显示上传、排队、生成状态 | ✅ |
| 视频预览 | 生成完成自动播放，循环播放 | ✅ |
| 视频下载 | 一键下载 MP4 格式 | ✅ |
| SessionID 配置 | 支持环境变量预设 + 界面运行时修改 | ✅ |
| 响应式布局 | 桌面端左右分栏，移动端自适应 | ✅ |
| Docker 部署 | 多阶段构建，docker compose 一键启动 | ✅ |

## 安装说明

### 环境要求

- **Node.js** >= 18（本地开发）或 **Docker**（容器部署）
- 有效的即梦平台 **SessionID**（从 `jimeng.jianying.com` Cookie 获取）

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/wwwzhouhui/seedance2.0.git
cd seedance

# 2. 安装所有依赖（前端 + 后端）
npm run install:all

# 3. 配置环境变量
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 默认 SessionID（可选，也可在界面中设置）
VITE_DEFAULT_SESSION_ID=your_sessionid_here

# Express 后端端口
PORT=3001
```

## 使用说明

### 快速开始

```bash
# 启动开发模式（同时启动前端 :5173 + 后端 :3001）
npm run dev
```

浏览器访问 `http://localhost:5173`

也可单独启动：

```bash
npm run dev:client   # 仅启动 Vite 前端 (:5173)
npm run dev:server   # 仅启动 Express 后端 (:3001)
```

### 配置说明

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VITE_DEFAULT_SESSION_ID` | 即梦 sessionid | 空（界面设置） |
| `PORT` | Express 后端端口 | `3001` |

**SessionID 优先级**：请求体中的 `sessionId` > `.env` 中的 `VITE_DEFAULT_SESSION_ID`

### 使用示例

1. 打开浏览器，如未配置 SessionID 会自动弹出设置窗口

   1. 访问 [即梦 AI](https://jimeng.jianying.com/) 并登录账号
   2. 按 F12 打开开发者工具
   3. 进入 Application > Cookies
   4. 找到 `sessionid` 的值

   ![获取 sessionid](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/example-0.png)

   设置seesion id

   ![image-20260214135132639](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/image-20260214135132639.png)

2. 选择模型：Seedance 2.0（高质量）或 Seedance 2.0 Fast（快速）

3. 上传参考图片（至少 1 张，最多 5 张）

4. 在提示词框中描述视频场景，使用 `@1`、`@2` 引用对应图片

5. 选择参考模式、画面比例和视频时长

6. 点击「生成视频」按钮，等待生成完成

   ![image-20260214135034451](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/image-20260214135034451.png)

7. 生成完成后自动播放，悬停视频右上角可下载

​    ![image-20260214135051255](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/image-20260214135051255.png)



## 项目结构

```
seedance/
├── package.json                # 前端依赖与脚本
├── vite.config.ts              # Vite 配置（开发代理 /api → :3001）
├── tsconfig.json               # TypeScript 配置（strict 模式）
├── tailwind.config.js          # Tailwind CSS 主题配置
├── postcss.config.js           # PostCSS 配置
├── index.html                  # HTML 入口
├── .env.example                # 环境变量模板
├── Dockerfile                  # Docker 多阶段构建
├── docker-compose.yml          # Docker Compose 编排
├── .dockerignore               # Docker 构建排除
├── server/
│   ├── package.json            # 后端独立依赖（Express、Multer、dotenv）
│   └── index.js                # Express 后端（纯 JS ESM，直接对接即梦 API）
├── src/
│   ├── main.tsx                # 应用入口
│   ├── App.tsx                 # 根组件（全局状态管理 + 左右分栏布局）
│   ├── types.ts                # 类型定义与常量（模型、比例、时长、参考模式）
│   ├── services/
│   │   └── videoService.ts     # 异步任务：提交生成 + 轮询结果
│   └── components/
│       ├── VideoPlayer.tsx     # 视频播放（代理绕过 CORS）
│       ├── SettingsModal.tsx   # SessionID 设置弹窗
│       └── Icons.tsx           # SVG 图标组件集合
└── doc/
    ├── PRD.md                  # 产品需求文档
    ├── 概要设计.md              # 概要设计文档
    ├── 详细设计.md              # 详细设计文档
    └── 数据字典.md              # 数据字典
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | 前端 UI 框架 |
| TypeScript | 5.6+ | 前端类型系统（strict 模式） |
| Vite | 6 | 前端构建工具 |
| Tailwind CSS | 3.4 | 原子化 CSS 样式方案 |
| Express | 4.21 | 后端 HTTP 服务（纯 JavaScript ESM） |
| Multer | 1.4 | 文件上传中间件 |
| Docker | - | 容器化部署 |
| ImageX CDN | - | 图片上传（AWS4-HMAC-SHA256 签名） |

## 架构说明

```
浏览器                    Express 后端                    即梦 API
  │                          │                              │
  │ POST /api/generate-video │                              │
  │ (multipart form-data)    │                              │
  │ ────────────────────────>│                              │
  │                          │  上传图片到 ImageX CDN        │
  │                          │ ────────────────────────────>│
  │                          │                              │
  │      { taskId }          │  提交生成任务                  │
  │ <────────────────────────│ ────────────────────────────>│
  │                          │                              │
  │ GET /api/task/:taskId    │  后端轮询生成状态              │
  │ (前端每3秒轮询)           │ ────────────────────────────>│
  │ ────────────────────────>│                              │
  │    { status, result }    │  获取高清视频 URL              │
  │ <────────────────────────│ <────────────────────────────│
  │                          │                              │
  │ GET /api/video-proxy     │  代理视频流（绕过 CORS）       │
  │ ────────────────────────>│ ────────────────────────────>│
  │     video stream         │                              │
  │ <────────────────────────│                              │
```

## API 接口

### POST /api/generate-video

提交视频生成任务，立即返回任务 ID。

**请求参数（multipart/form-data）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | 是 | 提示词，支持 `@1` `@2` 引用图片 |
| `model` | string | 否 | 模型：`seedance-2.0`（默认）或 `seedance-2.0-fast` |
| `ratio` | string | 否 | 画面比例：`16:9` `9:16` `4:3` `1:1` `3:4` `21:9`，默认 `4:3` |
| `duration` | number | 否 | 视频时长：4-15 秒，默认 4 |
| `sessionId` | string | 否 | 即梦 sessionid（未提供则使用环境变量） |
| `files` | File[] | 是 | 参考图片，1-5 张，单文件最大 20MB |

**响应：**

```json
{ "taskId": "task_1_1707900000000" }
```

### GET /api/task/:taskId

查询任务状态。

**响应示例：**

```json
// 处理中
{ "status": "processing", "elapsed": 45, "progress": "AI正在生成视频，请耐心等待..." }

// 完成
{
  "status": "done",
  "elapsed": 120,
  "result": {
    "created": 1707900000,
    "data": [{ "url": "https://...", "revised_prompt": "..." }]
  }
}

// 失败
{ "status": "error", "elapsed": 30, "error": "错误信息" }
```

### GET /api/video-proxy?url=

代理即梦 CDN 视频流，解决浏览器 CORS 限制。

### GET /api/health

健康检查。

```json
{ "status": "ok", "mode": "direct-jimeng-api" }
```

## 开发指南

### 本地开发

```bash
# 安装依赖
npm run install:all

# 启动开发服务（前端热更新 + 后端）
npm run dev

# 仅类型检查（只覆盖 src/ 前端代码，后端为纯 JS）
npx tsc --noEmit
```

### 构建部署

#### 方式一：直接部署

```bash
# 构建前端（tsc 类型检查 + vite build）
npm run build

# 启动生产服务（Express 同时提供静态文件 + API）
npm start
```

生产模式下 Express 监听 `3001` 端口，同时提供 `dist/` 静态文件服务和 API 接口。

#### 方式二：Docker 部署（推荐）

**使用 docker compose：**

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 VITE_DEFAULT_SESSION_ID

# 拉取镜像并启动
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

**使用 docker run 直接启动：**

```bash
docker run -d \
  --name seedance-web \
  -p 3001:3001 \
  -e VITE_DEFAULT_SESSION_ID=your_sessionid_here \
  --restart unless-stopped \
  wwwzhouhui569/seedance2.0:latest
```

**本地构建镜像（可选）：**

```bash
docker build -t seedance-web:latest .
docker run -d --name seedance-web -p 3001:3001 seedance-web:latest
```

部署后访问 `http://localhost:3001`。

### 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add your feature'`
4. 推送到远程：`git push origin feature/your-feature`
5. 提交 Pull Request

## 常见问题

<details>
<summary>如何获取即梦 SessionID？</summary>

1. 浏览器访问 [jimeng.jianying.com](https://jimeng.jianying.com) 并登录
2. 打开浏览器开发者工具（F12）→ Application → Cookies
3. 找到 `sessionid` 字段，复制其值
4. 填入 `.env` 文件或在界面设置弹窗中粘贴

</details>

<details>
<summary>SessionID 过期了怎么办？</summary>

SessionID 有效期有限，过期后需要重新登录 jimeng.jianying.com 获取新的 sessionid，然后在界面设置弹窗中更新即可，无需重启服务。

</details>

<details>
<summary>视频生成失败提示「积分不足」？</summary>

即梦平台生成视频需要消耗积分，请前往 [jimeng.jianying.com](https://jimeng.jianying.com) 官网领取或购买积分后重试。

</details>

<details>
<summary>视频无法播放？</summary>

即梦 CDN 视频有 CORS 限制，必须通过后端 `/api/video-proxy` 代理访问。如果视频无法播放，请检查：
1. 后端服务是否正常运行
2. 开发模式下 Vite 代理配置是否正确（`/api` → `:3001`）

</details>

<details>
<summary>Docker 构建失败？</summary>

1. 确保 Docker 版本支持多阶段构建（17.05+）
2. 检查网络连接，npm install 需要访问 npm registry
3. 如果网络问题，可在 Dockerfile 中配置国内镜像源

</details>

<details>
<summary>Seedance 2.0 和 Seedance 2.0 Fast 有什么区别？</summary>

- **Seedance 2.0**：高质量模式，生成效果更好，耗时较长
- **Seedance 2.0 Fast**：快速模式，生成速度更快，适合快速预览

</details>

## 技术交流群

欢迎加入技术交流群，分享使用心得和创作成果：

![技术交流群](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/Screenshot_20260210_085255_com.tencent.mm.jpg)

## 作者联系

- **微信**: laohaibao2025
- **邮箱**: 75271002@qq.com

![微信二维码](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Screenshot_20260123_095617_com.tencent.mm.jpg)

## 打赏

如果这个项目对你有帮助，欢迎请我喝杯咖啡 ☕

**微信支付**

![微信支付](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/Obsidian/image-20250914152855543.png)

## 项目统计

### 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | 2025-02-12 | 初始版本，支持 Seedance 2.0 视频生成 |
| v1.1.0 | 2025-02-13 | 新增 Seedance 2.0 Fast 模型、响应式布局 |
| v1.2.0 | 2025-02-14 | 新增 Docker 容器化部署支持 |

## 路线图

### 计划功能

- [ ] 生成历史记录（本地存储）
- [ ] 批量生成模式
- [ ] 视频参数预设模板
- [ ] 多语言界面支持（中/英）
- [ ] 生成结果分享功能

### 优化项

- [ ] 添加测试框架（Vitest + Playwright）
- [ ] ESLint + Prettier 代码规范
- [ ] 后端 TypeScript 重构
- [ ] WebSocket 替代轮询，实时推送生成状态
- [ ] 视频缩略图预览

## 致谢

本项目的即梦 API 对接方案参考了 [jimeng-free-api-all](https://github.com/wwwzhouhui/jimeng-free-api-all) 项目，感谢该项目对即梦平台接口的逆向分析和文档整理，包括认证签名机制、ImageX CDN 上传流程、视频生成任务轮询等核心逻辑，为本项目的开发提供了重要参考。

## License

本项目基于 [MIT](LICENSE) 协议开源。

SPDX-License-Identifier: MIT

## Star History

如果觉得项目不错，欢迎点个 Star ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=wwwzhouhui/seedance2.0&type=Date)](https://star-history.com/#wwwzhouhui/seedance2.0&Date)
