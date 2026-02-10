# Tucao Online (在线吐槽)

一个基于 Vue 3 + Tailwind CSS + Socket.io 的在线实时吐槽平台。

## 功能特性

*   **实时聊天**：所有用户实时连接，消息即时推送。
*   **消息过期**：所有吐槽消息（文字/图片）在 30 分钟后自动过期消失。
*   **表情/图片**：支持发送 Emoji 表情和本地图片。
*   **用户列表**：实时展示在线用户列表。
*   **昵称修改**：用户可以自定义修改自己的显示昵称。
*   **现代 UI**：使用 "ui-ux-pro-max" 设计系统，界面美观大方。

## 技术栈

*   **前端**：Vue 3, Tailwind CSS, Vite
*   **后端**：Node.js, Express, Socket.io
*   **语言**：TypeScript (前端), JavaScript (后端)

## 本地开发

1.  **安装依赖**
    ```bash
    npm install
    ```

2.  **启动后端服务器** (端口 3000)
    ```bash
    npm run server
    ```

3.  **启动前端开发服务器** (端口 5173)
    ```bash
    npm run dev
    ```

4.  **访问**
    打开浏览器访问 `http://localhost:5173`

## Docker 部署

项目包含 Docker 配置，支持一键部署。

1.  **构建并启动**
    ```bash
    docker-compose up -d --build
    ```

2.  **访问**
    打开浏览器访问 `http://localhost:80` (默认 HTTP 端口)

## 项目结构

*   `/src`: 前端 Vue 源码
*   `/server`: 后端 Node.js 源码
*   `Dockerfile`: 前端构建镜像配置
*   `Dockerfile.server`: 后端服务镜像配置
*   `docker-compose.yml`: 容器编排配置
