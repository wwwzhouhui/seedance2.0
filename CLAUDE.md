# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Seedance 2.0 Web — 基于 React 前端 + Express 后端的 AI 视频生成应用。后端直接对接 jimeng.jianying.com（即梦）API，实现 Seedance 2.0 模型的"全能参考"视频生成，包括图片上传（ImageX CDN）、任务提交、轮询获取结果。

## 常用命令

```bash
# 安装所有依赖（前端 + 服务端各自的 node_modules）
npm run install:all

# 开发模式（同时启动 Vite 前端 :5173 + Express 后端 :3001）
npm run dev

# 仅启动前端
npm run dev:client

# 仅启动后端
npm run dev:server

# 类型检查（仅覆盖 src/ 目录，后端为纯 JS 不参与）
npx tsc --noEmit

# 生产构建（先 tsc 类型检查，再 vite build）
npm run build

# 生产启动（Express 同时提供前端静态文件 + API）
npm start
```

当前未配置测试框架和 linter。

## 架构

### 双 package.json 结构

- 根目录 `package.json` — 前端依赖（React、Vite、Tailwind）+ 开发脚本
- `server/package.json` — 后端独立依赖（Express、multer、cors、dotenv）
- `npm run install:all` 会分别安装两处依赖

### 双进程开发模式

- **Vite 开发服务器** (`:5173`) — 提供 React 前端，通过 `vite.config.ts` 将 `/api/*` 请求代理到 Express
- **Express 后端** (`:3001`) — 直接对接 jimeng.jianying.com API，处理图片上传、视频生成、任务轮询

### 前端（React 19 + TypeScript strict + Tailwind CSS 3）

左右分栏布局：左侧配置面板，右侧视频播放区。TypeScript 开启了 strict、noUnusedLocals、noUnusedParameters。

- `src/App.tsx` — 根组件，`useState` 管理所有状态（无外部状态库），包含图片上传、提示词输入、模型选择、参考模式/画面比例/时长选择、生成按钮等全部 UI 逻辑
- `src/types.ts` — 共享 TypeScript 类型定义和常量数组（`RATIO_OPTIONS`、`DURATION_OPTIONS`、`REFERENCE_MODES`、`MODEL_OPTIONS`）
- `src/services/videoService.ts` — `generateVideo()` 函数，实现异步任务模式：POST 提交获取 taskId，然后轮询 GET 获取结果（3秒间隔，最长25分钟）
- `src/components/VideoPlayer.tsx` — 视频播放组件，通过 `/api/video-proxy` 代理 CDN 视频 URL 解决 CORS 问题
- `src/components/SettingsModal.tsx` — 设置弹窗，管理 sessionId；导出 `loadSettings()` 从 `localStorage` 读取配置
- `src/components/Icons.tsx` — SVG 图标组件集合
- `src/components/{UploadArea,PromptInput,RatioSelector,DurationSelector,Toolbar}.tsx` — 已提取但当前未被 App.tsx 引用的组件文件

### 后端（`server/index.js`，纯 JavaScript ESM）

单文件后端，不使用 TypeScript。直接对接 jimeng.jianying.com API，无需中间代理服务。

**API 接口：**
- `POST /api/generate-video` — 接收 multipart form-data（prompt、model、ratio、duration、sessionId、files），异步启动生成任务，立即返回 `{ taskId }`。文件限制：单文件最大 20MB，最多 5 个文件。
- `GET /api/task/:taskId` — 查询任务状态，返回 `{ status: 'processing'|'done'|'error', progress?, result?, error? }`
- `GET /api/video-proxy?url=` — 代理 CDN 视频流，解决浏览器 CORS 限制
- `GET /api/health` — 健康检查

**核心函数：**
- `jimengRequest()` — 封装即梦 API 请求，自动注入 Cookie、Sign、请求头，内置 3 次重试（仅网络错误重试，API 业务错误直接抛出）
- `generateCookie()` / `generateSign()` — 基于 sessionId 生成认证 Cookie 和 MD5 签名
- `createAWSSignature()` — AWS4-HMAC-SHA256 签名，用于 ImageX CDN 上传
- `uploadImageBuffer()` — 四步 ImageX 上传流程：获取 token → 申请权限 → 上传二进制数据 → 提交确认
- `buildMetaListFromPrompt()` — 解析 prompt 中的 `@1`、`@2` 占位符，生成 material_list 和 meta_list
- `generateSeedanceVideo()` — 完整的视频生成流程：上传图片 → 提交生成任务 → 轮询结果 → 获取高清 URL
- `calculateCRC32()` — 计算上传数据的 CRC32 校验值

**模型映射：**
- `seedance-2.0` → `dreamina_seedance_40_pro` (benefit: `dreamina_video_seedance_20_pro`)
- `seedance-2.0-fast` → `dreamina_seedance_40` (benefit: `dreamina_seedance_20_fast`)

**任务管理：**
- 使用内存 Map 存储任务状态，30 分钟自动清理过期任务
- 已完成/失败的任务在返回后 5 分钟清理
- 前端轮询间隔 3 秒，最大轮询时长 25 分钟

## 配置

复制 `.env.example` 为 `.env`，关键变量：
- `VITE_DEFAULT_SESSION_ID` — 即梦 sessionid，从 jimeng.jianying.com 的 Cookie 中获取（也可在运行时通过界面设置弹窗配置）
- `PORT` — Express 后端端口（默认 `3001`）

SessionID 优先级：请求体中的 `sessionId` 字段 > `.env` 中的 `VITE_DEFAULT_SESSION_ID`。

## 即梦 API 接口约定

**Seedance 2.0 模型参数：**
- 画面比例：`21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`
- 时长：整数 4-15 秒
- 参考图片：最多 5 张，通过 ImageX CDN 上传后以 URI 形式传入
- prompt 中使用 `@1`、`@2` 等占位符引用图片

**关键 API 路径：**
- `POST /mweb/v1/aigc_draft/generate` — 提交视频生成任务
- `POST /mweb/v1/get_history_by_ids` — 通过 history_id 查询生成状态
- `POST /mweb/v1/get_local_item_list` — 获取高清视频 URL

**ImageX CDN 上传流程：**
1. `GET /imagex/get_upload_token` — 获取上传凭证（通过即梦 API）
2. `POST /imagex/apply_upload` — 申请上传权限（AWS 签名请求到 imagex.bytedanceapi.com）
3. `POST /{upload_host}/{store_uri}` — 上传二进制数据（带 CRC32 校验）
4. `POST /imagex/commit_upload` — 确认上传完成（AWS 签名请求）

## 界面语言

所有用户可见文本为中文，代码和变量命名使用英文。

## 注意事项

- 后端直接与 jimeng.jianying.com 通信，不依赖 jimeng-free-api 等中间服务
- 视频生成是异步任务模式，后端在内存中管理任务状态并轮询即梦 API
- 浏览器无法直接播放即梦 CDN 视频（CORS），必须通过 `/api/video-proxy` 代理
- 生产模式下 Express 同时提供 `dist/` 静态文件服务
- 后端为纯 JavaScript，`npx tsc --noEmit` 仅检查 `src/` 下的前端代码
