<div align="center">
  <img src="public/assets/logo-mark.svg" width="72" alt="Say2Build logo" />

# Say2Build

**随便聊，项目状态不丢。**

一个给 AI 开发新手用的轻量"项目大脑"。

[快速开始](#快速开始) · [产品说明](docs/PRODUCT.md) · [架构说明](docs/ARCHITECTURE.md) · [完整规格](docs/CANONICAL_SPEC.zh-CN.md)

<p>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node.js >= 20" />
  <img src="https://img.shields.io/badge/runtime%20dependencies-0-orange.svg" alt="Zero runtime dependencies" />
</p>
</div>

![Say2Build 首页](docs/assets/home.png)

## 要解决的问题

AI 编程工具很会干活，但刚开始用的人，项目常常丢在聊天记录里：想法一直在变、旧决定没人清理、随口一提的小实验慢慢变成了"需求"，下一步该做什么越来越看不清。

Say2Build 在编程工具**之上**加一层很薄的状态管理：

```text
没有 Say2Build                  有 Say2Build

想法                              想法
  ↓                                ↓
聊天                              自然聊天
  ↓                                ↓
更多的聊天                        项目大脑
  ↓                                ↓
互相矛盾的决定                    当前真实状态
  ↓                                ↓
"我们现在到底在做什么？"            一个明确的下一步
                                    ↓
                                  Codex / Claude Code
```

它不是又一个代码 IDE。Say2Build 负责把"项目现在是什么样"理清楚，具体实现还是交给 Codex、Claude Code、Cursor 这些工具。

## 功能

- 从模糊的想法直接开始，不需要先写 PRD
- 少问问题：低风险的事自己推断，影响大的选择才问你，并给出建议
- 维护"当前真实状态"，而不是聊天记录摘要
- 改主意也没关系：新决定取代旧决定，不会两个并存
- 提过一句的"以后再说"默认不进 MVP，先放到一边
- 始终给出一个明确的下一步（构建 / 测试 / 验证 / 发布）
- 能生成给编程工具用的文件：`PROJECT.md`、`AGENTS.md`、聚焦的 `task-xxx.md`、可导入导出的项目 JSON
- 本地就能用，不需要登录

## 演示

![Say2Build 项目大脑演示](docs/assets/demo.gif)

内置的 demo 不需要 API key。从一个很粗糙的想法开始，比如：

> 我想做一个分享学习资料的小工具。大概知道要什么，但流程还没想清楚。

然后改主意：

> 每份 PDF 都要带上学生的名字。

Say2Build 会更新项目真实状态、把没定下来的想法单独放一边、遇到真正的冲突会提醒你，最后整理出一个聚焦的构建任务。

![Say2Build 工作区](docs/assets/workspace.png)

## 快速开始

要求：**Node.js 20+**。

```bash
git clone https://github.com/Henry369-0/say2build.git
cd say2build
npm start
```

打开 `http://localhost:3000` 即可。

v0.1 没有任何运行时 npm 依赖，clone 下来直接跑，不用先装包。

### Demo 模式（零配置）

直接 `npm start`。没配置模型密钥时，会自动用内置的 Demo Brain，界面、状态更新、任务生成、本地保存、导出这些流程都能完整体验。

### 接入真实 AI

复制环境变量模板，填上服务端密钥：

```bash
cp .env.example .env
```

然后在启动前设置环境变量（或在部署平台上配置）：

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-5.6"
npm start
```

密钥只在服务端使用，浏览器拿不到。真实 AI 暂时不可用时，客户端自动回退到 Demo Brain，项目状态不会丢。

## 它是怎么工作的

核心规则只有一条：

> **AI 只负责提方案，改状态由确定性的代码来做。**

```text
当前项目状态 + 最新一句想法
          │
          ▼
        对话解释器
          │
          ▼
     BrainTurnResult
     （只包含提议的修改）
          │
          ▼
        校验 + 确定性 reducer
          │
          ▼
      项目状态（真实状态）
        │        │        │
        ▼        ▼        ▼
    共识结论  生成文件  下一步行动
```

模型不会在每句话之后重写整个项目。这样需求变化、冲突处理、撤销、回归测试、长对话都好处理得多。

更完整的说明见 [架构文档](docs/ARCHITECTURE.md)。

## 生成的文件

- **PROJECT.md**：给人看的项目当前状态，包括目标用户、问题、当前目标、MVP 范围、非目标、决策、约束、阶段、下一步。
- **AGENTS.md**：只放编码工具需要长期知道的稳定信息，临时的任务说明不放这里。
- **task-xxx.md**：给一次独立编码会话用的任务交接单，范围收得很窄：

```md
# 任务：搭建第一个资料分发流程

## 目标
...

## 范围内
...

## 范围外
...

## 需要保留
...

## 验收标准
...

## 完成后
1. 改了什么
2. 改了哪些文件
3. 怎么验证的
4. 还有什么没解决
```

- **say2build.project.json**：项目状态的机器可读版本。Markdown 是给人（和工具）看的；JSON 保留了 id、来源、状态、取代关系这些结构化信息。

## 测试

Say2Build 针对它想预防的几类问题，内置了固定的评估场景：

1. 模糊的想法
2. 用户说"你来定"
3. 需求变更
4. 真实冲突
5. 需求蔓延
6. 不值得保存的小改动
7. 从 demo 到正式产品的提醒
8. 改动很多的长对话

跑一下：

```bash
npm test
npm run check
```

## 目录结构

```text
say2build/
├── public/                  # 浏览器端应用 + 项目大脑核心逻辑
├── server/                  # 可选的真实 AI 适配层
├── api/                     # serverless API 封装
├── tests/                   # 确定性 reducer / 文件生成测试
├── evals/                   # 行为评估用例
├── examples/                # 示例项目状态
├── docs/                    # 产品、架构、规格文档
├── .github/workflows/       # CI
├── AGENTS.md
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

## 不做的事情

v0.1 不包含代码编辑器、终端、仓库浏览器、自动执行代码、多智能体编排、团队项目管理、计费，也不打算替代 Codex / Claude Code。

这些功能看起来厉害，但对目标用户可能反而没用。第一个要回答的问题很小：**新手能不能一边保持自然思考，一边让项目本身越来越清楚、越来越可执行？**

## 部署

- **本地 / 自托管**：`npm start`。
- **接真实 AI 的部署**：把整个仓库部署到服务器或 serverless 平台，在服务端配置 `OPENAI_API_KEY`。

## 路线图

核心行为验证完之后，计划做：

- 从更多已有文件恢复项目状态
- 连接 GitHub 仓库
- 直接交接给编码工具
- 可选的云同步 / 账号
- 更完整的 `DESIGN.md` 支持
- 项目模板和个性化

## 参与贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。最有价值的贡献不是"多加功能"，而是更好的 reducer 约束、评估用例、无障碍支持、文件质量，以及"项目大脑真的能帮人做完项目"的证据。

## License

MIT © 2026 Say2Build contributors.
