# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的格式，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.2.0] - 2026-08-24

### 新增

- 全中文界面：首页、工作区、对话卡片、弹窗、提示全部中文化（`index.html`、`app.js`、`demo.html`、`manifest.webmanifest`）。
- 生成文件（`PROJECT.md` / `AGENTS.md` / `task-*.md`）标题与模板中文化。
- 任务完成闭环：任务生成后可以「标记完成」，填写完成报告并回写项目状态（`app.js` 的 `completeTask`）。
- API 滥用防护：同源校验 + 固定窗口限流 + 可选共享密钥（`server/guard.mjs`），同时接入本地服务与 Vercel serverless。
- `npm run lint`：零依赖的自定义 lint（含「浏览器代码不得引用 OPENAI_API_KEY」的安全检查）。
- `npm run coverage`：基于 Node 内置 test runner 的覆盖率脚本。
- 新增测试：存储层、HTTP 服务层（含防护与错误路径）、OpenAI 适配层（mock fetch）、JSON Schema 一致性校验。
- GitHub Pages 静态演示部署工作流（`deploy` 分支 / `main` push 触发）。

### 变更

- Demo 引擎从「单一学习资料场景」泛化为概念驱动的规则引擎：支持分发、个性化、账号、同步、社区/付费/商城暂存、部署、验证、细节调整、委托决策等多类概念，中英关键词均可触发。
- 选择卡片修复：点击选项后统一走项目大脑路径（真实 AI 与 demo 行为一致），不再硬编码 demo 结果；已选择的卡片会标记「已选择」并置灰。
- `current_focus` 从死字段变为可更新字段：新增 `current_focus` change target，demo 引擎与真实 AI 都会维护它。
- 服务端健壮性：非法 JSON 返回 400、非法 URL 编码返回 400、错误信息中文化。
- `server.mjs` 重构出 `createAppServer()`，便于 HTTP 层测试；仅作为主模块运行时才监听端口。
- `OPENAI_MODEL` 默认值保持可配置（`gpt-5.6`），部署时请按实际可用模型覆盖。

### 修复

- 真实 AI 模式下点击选择卡片会错误地使用 demo 引擎回复的问题（A2）。
- Demo 引擎对非「学习资料」输入体验过浅的问题（A1）。
- `brainCompleteness` 与「当前焦点」面板展示不一致的问题。
- `importStoredProject` 的错误提示改为中文。

### 文档

- README 增加线上演示链接、新测试说明、防护说明与更新后的功能列表。
- `docs/ARCHITECTURE.md` 补充防护层与中文界面说明。

## [0.1.0] - 2026-08-16

### 新增

- 首个可用版本：项目大脑状态模型、确定性 reducer、免密钥 demo 模式、可选 OpenAI Responses API 适配。
- 生成 `PROJECT.md` / `AGENTS.md` / `task-*.md` / 项目 JSON 导出。
- 本地持久化（localStorage）、导入导出、撤销。
- 7 个单元测试 + 8 个行为评估场景 + CI（GitHub Actions）。
- 完整的中文产品文档（README / PRODUCT / ARCHITECTURE / CANONICAL_SPEC）。
