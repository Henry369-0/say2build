# Say2Build — 架构说明

## 设计原则

> **AI 判断改动，代码落地改动。**

模型不会在每次对话后重写整个项目状态。它返回一个增量的 `BrainTurnResult`，由确定性的 reducer 校验并应用这些提议的修改。

```text
用户输入
   │
   ▼
当前项目状态 + 最近聊天
   │
   ▼
对话解释器
   │
   ▼
BrainTurnResult（提议的修改）
   │
   ▼
校验 + 确定性 reducer
   │
   ▼
项目状态（唯一事实来源）
   ├────────► 当前共识 UI
   ├────────► PROJECT.md / AGENTS.md
   └────────► TaskSpec / task.md
```

## 为什么 v0.1 零依赖

最初的完整产品规格打算用 Next.js + TypeScript + Tailwind + Zod + IndexedDB。第一次实现时，当时的构建环境连不上 npm registry。与其让产品卡在装依赖上，v0.1 用浏览器原生模块和 Node 自带的 HTTP/fetch API 保住了重要的架构边界。

这是刻意的交付取舍，不是产品模型的改变：

- 浏览器端仍是 Web App。
- 项目大脑逻辑仍然纯净、可测试。
- AI 输出仍然是结构化数据。
- API 密钥仍然只在服务端。
- 默认仍然是本地优先的持久化。
- 生成文件仍然是确定性的派生视图。

零依赖也让 GitHub 上的快速开始异常简单：Node 20+ 上 `npm start` 就够了。

## 运行时分层

### 浏览器端

`public/app.js` 负责渲染首页、工作区、交互卡片、文件预览和导出流程。

### 项目大脑

`public/modules/brain.js` 持有当前项目状态和 reducer 规则。重要不变量包括：

- 一个范围项不能同时属于多个范围分组；
- 高影响的 AI 推断不能悄悄取代已确认的事实；
- 被取代的决定离开当前视图；
- 稳定约束不能被悄悄替换；
- 只有聊天的轮次，空改动列表也是合法的。

### 持久化

v0.1 用浏览器 `localStorage`，因为项目是小型结构化文档，第一个目标就是零摩擦的本地持久化。存储边界是隔离的，以后想换 IndexedDB 或云同步，不用改项目大脑的语义。

### 真实 AI

配置了 `OPENAI_API_KEY` 时，Node/serverless 适配层把精简的项目状态、最近的聊天和最新一句用户输入，按严格的 JSON Schema 输出格式发给 OpenAI Responses API。

没有密钥（或真实 API 不可用）时，浏览器自动回退到 `demo-engine.js`，保证整个交互在没有凭据的情况下也能测。

### 前端直连 DeepSeek（自带 Key）

用户可以在前端「AI 设置」里填入自己的 DeepSeek API Key（存于浏览器 localStorage，不发送到任何服务器）。浏览器直接调用 `https://api.deepseek.com/chat/completions`（该端点支持浏览器跨域），交互过程的项目大脑与任务生成都走 DeepSeek。

关键设计是 **AI 契约唯一来源**：`public/modules/contracts.js` 同时承载 brain/task 的 JSON Schema、系统提示词和小型校验器，浏览器（DeepSeek 直连）与服务端（OpenAI Responses）引用同一份契约。任何一条路径返回的结果，都先经过契约校验，再交给确定性 reducer 落地——两条路径的行为不会漂移。

大脑调用顺序：**浏览器 DeepSeek → 服务器 API → 演示模式**，任何一层失败自动降级。

### 交接给 Codex / Claude Code

任务生成后，「用 Codex 执行」会生成可直接运行的终端命令（`codex exec` / `claude -p`，见 `public/modules/codex.js`），把聚焦的 `task-xxx.md` 交给独立编码会话。

### API 防护

`server/guard.mjs` 在本地服务和 Vercel serverless 函数上统一生效：

- **同源校验**：带 `Origin` 的跨域 POST 直接拒绝（403）。
- **固定窗口限流**：默认 120 次/分钟/IP（429），自托管环境有效，serverless 为尽力而为。
- **可选共享密钥**：设置 `SAY2BUILD_API_KEY` 后，请求必须带 `x-say2build-key` 头。

### 任务闭环

任务生成后可以「标记完成」并填写完成报告：任务状态、`taskIndex` 与对话记录都会更新，项目状态持续演进，而不是停留在「生成一个任务就结束」。

### 生成文件

`PROJECT.md`、`AGENTS.md`、任务 Markdown 和项目 JSON 都由状态生成，它们永远不是独立的"事实来源"。

## 部署方式

- **本地：** `npm start` → Node 内置的静态/API 服务。
- **静态演示：** 把 `public/` 发布到任意静态托管。Demo Brain 可用；真实 AI 不可用。
- **serverless 接真实 AI：** 部署整个仓库，在服务端配置环境变量。
