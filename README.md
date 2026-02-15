# Tucao Online (在线吐槽)

一个基于 Vue 3 + Tailwind CSS + Socket.io + Redis 的在线实时互动吐槽平台。不仅支持即时聊天，还内置了红包、抽奖、投票、点歌等多种互动玩法。

## ✨ 功能特性

### 💬 基础聊天
*   **实时通信**：基于 Socket.io 的全双工通信，消息秒级送达。
*   **多媒体支持**：支持发送文字、Emoji 表情及本地图片。
*   **消息过期**：所有消息（包括互动记录）在 30 分钟后自动过期清除，保持聊天室清爽。
*   **用户管理**：
    *   实时在线用户列表展示。
    *   支持自定义修改昵称。
    *   **自动清理**：用户断开连接后，自动清除其所有历史消息及相关数据。

### 🎉 互动玩法
*   **🧧 拼手气红包**：支持发送拼手气红包，实时抢红包，自动结算余额。
*   **🎲 摇骰子/赌大小**：多人参与的骰子游戏，支持压注大小或豹子，系统自动开奖分配奖金。
*   **📊 投票系统**：发起自定义投票，实时显示投票进度和结果。
*   **🎁 抽奖活动**：发布抽奖活动，上传奖品图片，设定参与人数，自动开奖。
*   **🎵 音乐点歌**：集成网易云音乐搜索，支持点歌分享，全员同步播放。
*   **🍻 干杯/烟花**：全屏干杯特效和烟花庆祝动画，活跃气氛。
*   **🚫 投票踢人**：社区自治功能，用户可发起投票踢出违规用户。

### 🛠️ 系统特性
*   **联系作者**：内置联系作者模态框，支持一键复制微信、域名及作者其他作品链接。
*   **移动端适配**：响应式设计，完美支持移动端访问（移动端自动隐藏部分非核心 UI）。
*   **Redis 存储**：使用 Redis 存储用户状态、消息记录及互动数据，支持分布式部署扩展。

## 🛠️ 技术栈

*   **前端**：Vue 3, TypeScript, Tailwind CSS, Vite
*   **后端**：Node.js, Express, Socket.io
*   **数据库/缓存**：Redis (ioredis)
*   **部署**：Docker, Docker Compose, Nginx

## 🚀 本地开发

### 前置要求
*   Node.js >= 16
*   Redis 服务已启动

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
确保本地 Redis 运行在默认端口 6379，或者通过环境变量配置：
```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

### 3. 启动后端服务器
```bash
npm run server
# 运行在 http://localhost:3000
```

### 4. 启动前端开发服务器
```bash
npm run dev
# 运行在 http://localhost:5173
```

## 🐳 Docker 部署

项目包含完整的 Docker 配置，支持一键部署（包含 Redis）。

### 1. 构建并启动
```bash
docker-compose up -d --build
```

### 2. 访问
打开浏览器访问 `http://localhost:80` (默认 HTTP 端口)

## 📁 项目结构

*   `/src`: 前端 Vue 源码
    *   `/components`: 聊天框、用户列表、互动组件等
    *   `/composables`: 核心聊天逻辑 (useChat.ts)
*   `/server`: 后端 Node.js 源码
    *   `index.js`: Socket.io 服务入口
    *   `state.js`: Redis 状态管理逻辑
*   `Dockerfile`: 前端构建镜像配置
*   `Dockerfile.server`: 后端服务镜像配置
*   `docker-compose.yml`: 容器编排配置 (包含 Nginx, Server, Redis)

## 🔗 关于作者

*   **微信**: ns2250225
*   **在线吐槽**: [https://tucao.yyrun.top/](https://tucao.yyrun.top/)
*   **简历优化**: [https://www.resume.monster/](https://www.resume.monster/)
*   **表情包生成**: [https://layman.xin/](https://layman.xin/)
*   **漫画生成**: [http://47.107.180.19:5173/](http://47.107.180.19:5173/)
