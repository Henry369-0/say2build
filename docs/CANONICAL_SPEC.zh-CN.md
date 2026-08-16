# Say2Build｜产品总纲与 MVP 开发规格

> **文档状态：v0.8 Canonical Spec / 当前开发基线**  
> **用途：后续产品设计、Codex 开发、评测、GitHub 发布的统一 source of truth。**  
> 历史讨论与旧方案已归档到 `Say2Build_产品调研与MVP实施方案_v0.7完整历史.md`。  
> 本文不再保留已被推翻的旧方案；后续修改采用“替换当前真相”，而不是无限追加。

---

# 0. 结论先行

## 0.1 一句话产品定义

> **Say2Build 是一个面向 Vibe Coding 初学者的轻量 Web Project Brain：用户继续用最自然的方式表达和改变想法，系统负责把重要信息沉淀成当前项目共识、发现真正的冲突、给出适度提醒，并把下一步整理成可以交给 Codex / Claude Code 等 Coding Agent 执行的任务。**

英文短定义：

> **A lightweight Project Brain for beginner AI builders.**

当前品牌表达：

> **Build freely. Don’t let the project forget.**

内部产品原则：

> **聊天可以发散，项目必须沉淀。**  
> **开发可以自由，但不能失忆。**  
> **少问，先想；安全的事情自己决定。**  
> **每次聊完，都应该更接近真正做出来。**

---

## 0.2 Say2Build 不是做什么

它不是：

- Prompt 美化器；
- 传统 PRD 填表系统；
- Jira / Linear 替代品；
- 新的 Coding IDE；
- Codex / Claude Code 替代品；
- 强制瀑布开发流程；
- “先把所有需求想清楚再开始”的工具；
- 靠生成一大堆 Markdown 显得专业的文档机。

Say2Build 负责的是 Coding Agent **上面那一层长期项目共识**。

具体执行代码仍然交给专业 Coding Agent。

---

## 0.3 MVP 形态正式锁定

第一版：

> **Hosted Web App。**

目标用户打开网址即可开始使用。

第一版不要求用户：

- 安装 CLI；
- 理解 localhost；
- 配 Git；
- 连接 GitHub；
- 配数据库；
- 学 PRD / Acceptance Criteria 等术语。

MVP 主链路：

```text
模糊想法
  ↓
自然聊天
  ↓
少量高影响选择 / AI 推荐
  ↓
Project Brain
  ↓
持续增量更新
  ↓
当前项目共识
  ↓
下一步 Task
  ↓
Codex / Claude Code / Cursor
```

---

# 1. 目标用户

## 1.1 核心人群

Say2Build 第一版主要服务：

> **已经开始用 AI 做网站 / 小工具 / Side Project，但没有成熟软件开发方法的非技术或轻技术用户。**

典型背景：

- 产品；
- 运营；
- 商业分析；
- 设计；
- 学生；
- 独立创作者；
- 刚开始使用 Codex / Cursor / Claude Code 的用户。

他们不是完全没有执行能力。

很多人已经可以靠 AI：

- 搭页面；
- 改代码；
- 做一个 localhost Demo；
- 一直问 AI 直到功能跑起来。

真正缺的是：

> **如何让一个不断变化的模糊想法，逐渐变成一个清楚、可持续、能真正完成的项目。**

---

## 1.2 最典型状态

用户通常：

1. 脑子里有一个想法；
2. 直接开始和 Coding Agent 聊；
3. 边做边想；
4. 新功能不断出现；
5. 前后决定开始矛盾；
6. 一个主会话越来越长；
7. 重要信息埋在聊天里；
8. 不知道哪些决定应该长期保留；
9. 最后虽然能做出来，但往往停在 Demo；
10. 很难判断下一步应该继续加功能、部署、测试还是找用户。

Say2Build 不消灭这种 Vibe Coding 方式。

它只给它加一层**轻约束和项目记忆**。

---

# 2. 核心用户价值

Say2Build 不追求解决所有开发问题。

第一版只验证四个价值：

## 2.1 帮用户逐渐想清楚

用户不需要一次说清。

AI 负责：

- 先理解；
- 合理推断；
- 给少量选择；
- 在真正高影响的地方让用户决定。

---

## 2.2 帮项目不失忆

聊天可以长，但重要决定不能只活在聊天历史里。

Say2Build 持续维护：

- 当前项目是什么；
- 给谁用；
- 当前目标；
- 已确认决定；
- 稳定约束；
- 暂时不做什么；
- 哪些想法以后再看；
- 当前阶段；
- 下一步。

---

## 2.3 帮用户避免“无意识冲突”

用户可以改变主意。

Say2Build 不阻止改变，而是提醒：

> “这个新想法会改变我们之前的一条决定。”

然后给：

- 后果；
- 2–4 个可理解选项；
- AI 推荐；
- 自定义答案。

---

## 2.4 帮用户始终有一个可执行下一步

Say2Build 不能成为无限陪聊。

每个项目始终应该存在：

> **Next Action**

并且它必须是具体动作，而不是：

> “继续完善需求。”

---

# 3. 产品原则

## 3.1 用户不需要先想清楚

模糊需求是正常输入，不是异常状态。

错误交互：

> 请先填写完整目标用户、商业目标、技术栈、功能清单、验收标准。

正确交互：

> “我先按你的描述理解一下……”

---

## 3.2 默认先推断，再让用户纠正

低风险信息可以 AI 推断。

但必须区分：

```text
explicit
用户明确说过

ai_inferred
AI 合理推断

derived
根据多个已确认信息推导
```

AI 不能把自己的猜测伪装成用户决定。

---

## 3.3 Ask less, think more

行为规则：

```text
低风险 / 可逆
→ AI 自己决定

中影响
→ AI 推荐 + 一键反悔

高影响 / 真实冲突
→ 用户选择

不可逆 / 高风险
→ 明确确认
```

用户说：

> “你决定吧。”

AI 应真的做决定，而不是继续追问。

---

## 3.4 轻约束，不做流程门禁

Say2Build 可以知道专业开发通常需要：

- Git；
- README；
- 环境变量；
- 测试；
- 部署；
- Agent instructions；
- 验收标准。

但不应该第一天全部扔给用户。

正确做法：

> 在它真正变得相关时，用人话提醒。

---

## 3.5 聊必沉淀，但不是聊必保存

每轮都要判断：

> 这件事以后还会影响项目吗？

合法结果包括：

```text
NO_PERSIST
```

例如：

> “首页标题稍微小一点。”

通常不值得进入长期 Project Brain。

---

## 3.6 越聊越清楚，而不是越聊越厚

Say2Build 不追求最大记忆。

目标：

> **Minimum sufficient project memory。**

旧决定被推翻后退出 Current View。

重复决定合并。

完整聊天保留供用户查看，但不是长期 source of truth。

---

## 3.7 学习发生在 Build 过程中

用户前台看到人话。

必要时逐渐出现专业词：

> 信息层级（Visual Hierarchy）

> 验收标准（Acceptance Criteria）

> 项目级 Agent 指令（AGENTS.md）

目的不是上课，而是让用户在实际项目中自然升级认知。

---

# 4. 核心产品模型

## 4.1 最重要的架构判断

**模型不能每一轮重写整个 Project Brain。**

采用：

```text
Current Project Brain
        +
Latest User Turn
        ↓
Conversation Interpreter
        ↓
Structured BrainTurnResult
        ↓
Proposed Changes
        ↓
Validation + Deterministic Reducer
        ↓
New Project Brain
        ↓
UI + Markdown Artifacts
```

即：

> **AI 判断变化，代码应用变化。**

---

## 4.2 为什么不能让 AI 重写 State

否则容易：

- 忘掉旧决定；
- 静默修改用户意图；
- Candidate 变成 Confirmed；
- 多轮措辞漂移；
- 冲突信息同时有效；
- 很难写回归测试。

因此 Project Brain 采用**增量变更协议**。

---

# 5. ProjectBrainState v1

```ts
type ProjectStage =
  | 'exploring'
  | 'shaping'
  | 'ready_to_build'
  | 'building'
  | 'usable_mvp'
  | 'validating'
  | 'releasing'
  | 'iterating'

type SourceType = 'explicit' | 'ai_inferred' | 'derived'

type ImpactLevel = 'low' | 'medium' | 'high'

interface ProjectBrainStateV1 {
  schemaVersion: '1.0'
  projectId: string

  identity: {
    title?: string
    oneLiner: string
    problem?: string
    targetUsers: string[]
  }

  intent: {
    currentGoal: string
    coreWorkflow: string[]
    successLooksLike?: string
  }

  scope: {
    inScope: ScopeItem[]
    laterIdeas: ScopeItem[]
    nonGoals: ScopeItem[]
  }

  decisions: Decision[]
  constraints: Constraint[]
  openQuestions: OpenQuestion[]

  stage: {
    current: ProjectStage
    reason?: string
  }

  execution: {
    currentFocus?: string
    nextAction: NextAction
    activeTaskId?: string
    taskIndex: TaskSummary[]
  }

  artifacts: ArtifactRegistry

  history: {
    importantRevisions: Revision[]
  }

  meta: {
    createdAt: string
    updatedAt: string
  }
}
```

---

## 5.1 Decision

```ts
interface Decision {
  id: string
  statement: string
  rationale?: string
  source: SourceType
  status: 'confirmed' | 'superseded'
  impact: ImpactLevel
  createdAt: string
  supersededBy?: string
}
```

代表：

> 当前已经做出的选择。

---

## 5.2 Constraint

```ts
interface Constraint {
  id: string
  statement: string
  reason?: string
  source: SourceType
  status: 'confirmed' | 'stable' | 'superseded'
  appliesTo: ('product' | 'design' | 'engineering' | 'task')[]
}
```

代表：

> 后续执行不能轻易破坏的长期约束。

---

## 5.3 Later Idea

值得记住，但不进入当前 MVP。

例如：

> 未来接 GitHub Repo。

不能因为用户“提过”就自动进入 `inScope`。

---

## 5.4 Open Question

只保留真正可能改变方向的问题。

不要把所有未知细节都放进来。

---

## 5.5 NextAction

```ts
interface NextAction {
  title: string
  reason: string
  type:
    | 'clarify'
    | 'decide'
    | 'build'
    | 'test'
    | 'validate'
    | 'release'
  canGenerateTask: boolean
}
```

禁止模糊 NextAction。

---

# 6. BrainTurnResult v1

每次模型调用只输出结构化 Turn Result。

```ts
interface BrainTurnResultV1 {
  assistantReply: string

  turnType:
    | 'explore'
    | 'clarify'
    | 'decide'
    | 'revise'
    | 'request_task'
    | 'question'
    | 'feedback'

  understanding: string

  changes: BrainChange[]
  conflicts: BrainConflict[]

  choice: ChoiceCard | null

  nextAction: NextAction

  stageSignal: {
    suggestedStage: ProjectStage | null
    reason: string | null
  }
}
```

---

## 6.1 BrainChange

第一版不用任意 JSON Patch。

```ts
type ChangeAction =
  | 'add'
  | 'update'
  | 'confirm'
  | 'move_to_later'
  | 'supersede'
  | 'resolve'

type ChangeTarget =
  | 'one_liner'
  | 'problem'
  | 'target_user'
  | 'current_goal'
  | 'core_workflow'
  | 'in_scope'
  | 'later_idea'
  | 'non_goal'
  | 'decision'
  | 'constraint'
  | 'open_question'
  | 'stage'
  | 'next_action'

interface BrainChange {
  action: ChangeAction
  target: ChangeTarget
  statement: string
  reason: string
  source: SourceType
  impact: ImpactLevel
  entityId?: string
  supersedesId?: string
}
```

有限 Target 的好处：

- 模型权限更小；
- Reducer 更容易验证；
- eval 更容易写；
- 不会误改 meta / history 等内部字段。

---

## 6.2 ChoiceCard

```ts
interface ChoiceCard {
  question: string
  whyItMatters?: string

  options: {
    id: string
    label: string
    consequence?: string
  }[]

  recommendedOptionId: string
  allowCustomAnswer: true
}
```

Choice 必须作为数据返回，不写死在 Markdown 文案里。

---

## 6.3 Conflict

```ts
interface BrainConflict {
  id: string
  summary: string
  priorEntityId: string
  priorStatement: string
  newDirection: string
  impact: 'medium' | 'high'
  recommendedResolution: string
}
```

只有新方向明确与当前有效信息冲突时才创建 Conflict。

“还没想清楚”不是 Conflict。

---

# 7. Reducer 业务规则

Structured Output 保证格式，不保证业务逻辑。

因此代码层继续验证。

## V01

`ai_inferred + high impact` 不能直接 supersede confirmed / stable。

## V02

`supersede` 必须指向真实且仍 active 的 entity。

## V03

旧决定被新决定推翻：

```text
old.status = superseded
old.supersededBy = new.id
```

不能两个同时 active。

## V04

同一项不能同时处于：

```text
inScope
laterIdeas
nonGoals
```

## V05

stable constraint 不允许静默删除。

## V06

stage 可以前进，也允许回退。

## V07

存在 unresolved high-impact conflict 时，Next Action 优先解决冲突。

## V08

每轮允许 `changes = []`。

## V09

AI inferred 不能自动变成 explicit。

## V10

所有成功 State Mutation 保存前一版 snapshot，支持最近一次 Undo。

---

# 8. 新项目用户流程

## 8.1 首页

```text
Say2Build
Build freely. Don’t let the project forget.

What are you trying to build?
You don't need to have it figured out.

[ large textarea ]
[ Start shaping ]

[ Bring an existing project ]
```

不要先展示：

- 技术栈选择；
- Prompt 模式；
- Agent 类型；
- PRD 表格；
- 专家模式。

---

## 8.2 第一次回复

用户：

> 我想做一个给学生发资料的网站，别太复杂，最好正规一点。

AI：

1. 先用人话复述当前理解；
2. 大胆做低风险假设；
3. 只问当前最影响方向的问题；
4. 给推荐。

例如：

```text
我先按你的描述理解：
你更像是想做一个“小规模资料分发工具”，重点是让学生方便拿资料，同时页面看起来可信、正规，而不是先做一个复杂学习平台。

你现在更接近：
A. 资料已经整理好，重点是方便发给学生 ← Recommended
B. 资料很乱，重点是让学生自己搜索整理
C. 两者都有

[Use recommendation]
```

---

## 8.3 一轮最多解决少数高影响歧义

不要连续十问。

每轮最多 1–2 个真正改变产品形态的问题。

用户可以：

- 点击选项；
- `Use recommendation`；
- 自己回答；
- 全部否定。

---

## 8.4 Bootstrap Minimum

当已经大致知道：

- 项目是什么；
- 给谁；
- 当前问题 / 目标；
- 第一版大概做什么；
- 下一步是什么；

就进入 Workspace。

不追求：

> 100% Requirement Completeness。

提示：

> **已经足够清楚，可以开始了。后面想到什么继续说，方向变了我会一起更新。**

---

# 9. 已有项目恢复流程

真实用户经常不是从零开始。

高价值场景：

> “我已经和 Codex 做了一两天，现在有点乱。”

入口：

```text
Bring an existing project
```

MVP 支持：

- 用户自然语言复盘；
- 粘贴 README；
- 粘贴 AGENTS.md；
- 上传少量 `.md` / `.txt`；
- 导入 `say2build.project.json`。

第一版不支持：

- 整个源码 ZIP；
- GitHub Repo URL 自动读取；
- 代码索引；
- Repo RAG。

目标只是：

> **恢复 Current Project Understanding。**

---

# 10. Project Workspace

桌面端：

```text
┌──────────────────────────────────────────────────────────────┐
│ Say2Build / Project Name       Stage       Export      •••   │
├────────────────┬─────────────────────────────────────────────┤
│ PROJECT BRAIN  │              CONVERSATION                   │
│                │                                             │
│ What           │ AI                                           │
│ For whom       │ Choice / Update / Conflict                   │
│ Focus          │                                             │
│ Confirmed      │                                             │
│ Parking lot    │                                             │
│                │                                             │
│ NEXT           │                                             │
│ ─────────────  │                                             │
│ Artifacts      │                              Composer       │
└────────────────┴─────────────────────────────────────────────┘
```

原则：

- Conversation 最大；
- Project Brain 辅助；
- 不做第三个常驻侧栏；
- Artifacts 次级；
- 手机 Project Brain 收进 Drawer。

---

# 11. Current Project Consensus

默认一屏只展示：

## What we're building

一句话。

## For whom

当前主要用户。

## Current focus

现在正在解决什么。

## Confirmed

3–5 条最重要当前决定。

## Parking lot

Later Ideas 数量 + 最重要 1–2 条。

## Next

唯一下一步。

示例：

```text
WHAT WE'RE BUILDING
A lightweight study-material distribution tool.

FOR WHOM
Small training teams → students

CURRENT FOCUS
Get the first usable distribution flow running.

CONFIRMED
• No complex student account system in MVP
• Materials are maintained by the admin
• Page also supports light promotion

PARKING LOT
2 later ideas

NEXT
Decide how personalized PDF watermarking should work
```

全部 Decisions / Constraints / History 展开查看。

---

# 12. Conversation UI 组件

MVP 只需要 5 类 AI 交互对象。

## 12.1 Normal Guidance

普通聊天回复。

## 12.2 Choice Card

只在高影响不确定性时出现。

必须有推荐选项。

## 12.3 Project Updated

只有发生真实持久变化时出现。

```text
✓ Project updated

Added
Personalized PDF watermark

Next
Choose the lightest implementation for MVP

[Undo]
```

## 12.4 Conflict Card

```text
This changes an earlier decision

之前：不做账号体系
现在：需要跨设备同步

Recommended
先保持本地保存，把同步放到 Later

[Use recommendation]
[Add lightweight account]
[Something else]
```

## 12.5 Ready to Build / Next Task

```text
Ready for the next build task

Build the first material-list + download flow.

[Generate Codex task]
```

---

# 13. What Changed 规则

不是每轮都显示。

如果只是：

> “第二个方案什么意思？”

不显示 `0 changes`。

只有真实变化：

```text
Added
Changed
Superseded
Moved to Later
Resolved
```

高影响变化可以 Review。

低风险变化只轻提示 + Undo。

---

# 14. Stage Awareness

Stage 只是导航，不是门禁。

## exploring

重点：帮用户缩小问题。

## shaping

重点：形成 MVP 边界、Non-goals。

## ready_to_build

已经足够明确，可以停止继续规划。

新项目第一个 Coding Task 可以包括：

- 初始化项目；
- Git；
- `.gitignore`；
- 基础 README；
- 最小运行方式。

这些由 Codex 执行，小白不需要先懂。

## building

重点：

- 控制需求漂移；
- 拆单独任务；
- 保持项目共识。

## usable_mvp

提醒：

> 继续加功能之前，也许更值得先找真实用户试。

## validating

重点：真实反馈，而不是想象功能。

## releasing

提醒：

- 部署；
- `.env.example`；
- README；
- License；
- secrets；
- demo。

## iterating

根据真实使用继续调整。

---

# 15. Artifact 模型

Project Brain 是唯一 current source of truth。

Markdown 是派生视图。

```text
ProjectBrainState
   ↓
Artifact Renderer
   ├── say2build.project.json
   ├── PROJECT.md
   ├── AGENTS.md（按需）
   ├── DESIGN.md（后期）
   └── tasks/NNN-slug.md
```

第一版不允许：

```text
State = A
PROJECT.md = B
AGENTS.md = C
```

---

# 16. say2build.project.json

导出包必须有机器可恢复状态。

原因：Markdown 无法可靠保存：

- source；
- status；
- superseded relation；
- task ids；
- schema version；
- artifact metadata。

因此：

> **JSON 用于恢复，Markdown 用于人和 Agent。**

导出：

```text
project-export/
├── say2build.project.json
├── PROJECT.md
├── AGENTS.md         # optional
└── tasks/
    ├── 001-xxx.md
    └── 002-xxx.md
```

---

# 17. PROJECT.md v1

```md
# <Project Name>

## What we're building

## Who it's for

## Problem

## Current goal

## MVP scope

## Not now

## Key decisions

## Stable constraints

## Open questions

## Current stage

## Next action
```

规则：

- 不记录完整聊天；
- 不写流水账；
- 不为了完整保留空 section；
- Current Truth 优先；
- 由代码模板生成，不额外调用 LLM。

---

# 18. AGENTS.md v1

仅在开始真实 Coding 后生成。

条目进入资格：

> **以后大多数 Coding Task 都需要知道它吗？**

推荐：

```md
# AGENTS.md

## Project intent

## Repository guide

## Commands

## Stable engineering rules

## Product guardrails

## Verification expectations
```

只有知道真实信息才写。

禁止虚构：

- npm script；
- 目录；
- 测试命令；
- 技术栈。

临时任务要求留在 task.md，不污染 AGENTS.md。

---

# 19. TaskSpec v1

Task 是 Say2Build 与 Codex 之间最重要的交接资产。

```ts
interface TaskSpec {
  id: string
  title: string
  objective: string
  whyNow: string
  context: string[]
  inScope: string[]
  outOfScope: string[]
  preserve: string[]
  implementationNotes: string[]
  acceptanceCriteria: string[]
  relevantArtifacts: string[]
  completionReport: string[]
}
```

---

## 19.1 task.md 模板

```md
# Task: <title>

## Objective

## Why now

## Context

## In scope

## Out of scope

## Preserve

## Implementation notes

## Acceptance criteria

## Relevant project context

## When finished
1. What changed
2. Files changed
3. How you verified it
4. Anything unresolved
```

一个 Task 应该尽量：

> **在一个独立 Coding Agent 会话中可以理解并完成。**

Task 不复制整份 Project Brain。

只带本任务相关上下文。

---

# 20. Task Preview

默认不给用户展示一墙 Markdown。

UI：

```text
NEXT BUILD TASK

Build the first material distribution flow

Goal
Students can see available materials and download one successfully.

Will do
• Material list
• Download action
• Basic responsive layout

Won't touch
• Login
• Payment
• Community

[Copy for Codex]
[Download .md]
[View full task]
```

用户关心的是：

> **Codex 接下来做什么。**

---

# 21. AI System Behavior

实现 System Prompt 时遵守：

1. 用户可以自然表达；
2. 不要求专业术语；
3. 能推断的低风险信息自己推断；
4. inferred 必须透明；
5. 只问真正改变方向的问题；
6. 一次最多少量选择；
7. 必须推荐一个；
8. 用户说“你决定”时真的决定；
9. Casual Idea ≠ Confirmed Scope；
10. 用户可以改变主意；
11. 冲突不是错误；
12. 当前确认意图不能被 AI 静默改写；
13. 不因为“专业项目通常都有”就乱加功能；
14. 专业词用“人话 + 术语”；
15. 允许 `NO_PERSIST`；
16. 始终给 Concrete Next Action；
17. 足够清楚时停止继续规划；
18. MVP 能用后适度提醒真实验证；
19. 使用用户语言回复。

核心：

> **Prompt 约束判断风格，Reducer 约束数据权限。**

---

# 22. Context 策略

每次模型输入：

```text
System Behavior
+
Current ProjectBrainState
+
Recent 6–10 messages
+
Latest User Message
```

不默认发送完整历史。

完整聊天保存在本地供用户查看。

Project Brain 本身就是长期 Context Compression Layer。

判断标准：

> 如果一个 30 轮项目必须继续把 30 轮原聊天全部喂回模型，说明 Project Brain 没有发挥价值。

---

# 23. 技术架构

## 23.1 技术栈

MVP 锁定：

```text
Next.js App Router
TypeScript
Tailwind CSS
shadcn/ui（只用基础 primitive）
Zod
IndexedDB
Vercel AI SDK / provider abstraction
```

State：

```text
React Context / State
+
Pure Reducer
+
IndexedDB Repository
```

第一版不引入大型状态管理库。

---

## 23.2 目录

```text
say2build/
├── app/
│   ├── page.tsx
│   ├── project/[id]/page.tsx
│   └── api/
│       └── brain/
│           ├── turn/route.ts
│           └── task/route.ts
│
├── components/
│   ├── landing/
│   ├── workspace/
│   │   ├── conversation.tsx
│   │   ├── project-brain-panel.tsx
│   │   ├── choice-card.tsx
│   │   ├── project-change-card.tsx
│   │   ├── conflict-card.tsx
│   │   ├── next-action-card.tsx
│   │   └── task-preview.tsx
│   └── ui/
│
├── lib/
│   ├── brain/
│   │   ├── schema.ts
│   │   ├── operations.ts
│   │   ├── reducer.ts
│   │   ├── validation.ts
│   │   └── stages.ts
│   ├── ai/
│   │   ├── provider.ts
│   │   ├── prompts.ts
│   │   └── schemas.ts
│   ├── artifacts/
│   │   ├── project-md.ts
│   │   ├── task-md.ts
│   │   └── export-pack.ts
│   ├── storage/
│   │   ├── project-repository.ts
│   │   └── migrations.ts
│   └── utils/
│
├── evals/
├── tests/
├── examples/
├── docs/
│   ├── PRODUCT.md
│   └── ARCHITECTURE.md
├── AGENTS.md
├── README.md
└── .env.example
```

---

# 24. API

## 24.1 Brain Turn

```text
POST /api/brain/turn
```

Request：

```ts
interface BrainTurnRequest {
  project: ProjectBrainStateV1
  recentMessages: ChatMessage[]
  userMessage: string
}
```

Response：

```ts
interface BrainTurnResponse {
  result: BrainTurnResultV1
}
```

流程：

```text
Validate input
↓
Build compact context
↓
Structured model output
↓
Zod validation
↓
Return proposed changes
↓
Client/shared reducer applies changes
```

API 不直接任意重写 Project State。

---

## 24.2 Task Generation

```text
POST /api/brain/task
```

只有：

```text
nextAction.type === build
```

或用户明确要求时调用。

输出 `TaskSpec`。

Markdown 由代码渲染。

---

# 25. Reducer 与核心业务代码

推荐纯函数：

```ts
applyBrainOperations(
  state: ProjectBrainStateV1,
  changes: BrainChange[]
): ReducerResult
```

位置：

```text
lib/brain/reducer.ts
```

Validation：

```text
lib/brain/validation.ts
```

核心业务逻辑不能散落在 React components / API route。

---

# 26. Artifact 生成策略

能 deterministic 就不再次调用 LLM。

## 直接代码生成

- `say2build.project.json`；
- `PROJECT.md`；
- `task.md`。

## 按需模型辅助

- AGENTS.md（已有项目复杂上下文时）；
- README；
- DESIGN.md。

原则：

> **不要让 LLM 做代码模板可以稳定完成的字符串转换。**

---

# 27. Local Persistence

MVP：

```text
IndexedDB
```

产品文案：

> **Saved on this device.**

保存：

```ts
interface StoredProject {
  state: ProjectBrainStateV1
  conversations: ChatMessage[]
  taskSpecs: TaskSpec[]
  ui?: {
    lastOpenedAt: string
  }
}
```

不强制登录。

不做云同步。

支持：

- Recent Projects；
- Export；
- Import；
- Delete。

---

# 28. 错误与恢复

## 28.1 API Failure

如果模型失败：

- 用户消息保留；
- State 不变化；
- 显示 Retry。

文案：

> I couldn't process this change. Your project state wasn't modified.

---

## 28.2 Invalid Structured Output

服务端可内部 retry 一次。

仍失败：

- 不落 State；
- 不应用半截 change。

---

## 28.3 Undo

第一版只支持：

> 撤销最近一次 Project State Change。

不先做复杂版本历史 UI。

---

# 29. 隐私原则

MVP 默认：

- 项目状态存浏览器；
- 模型请求发送必要 Project Context；
- 不做云端 Project DB。

正式文案必须根据真实 Provider / Logging 策略写。

不能做超过实现事实的隐私承诺。

---

# 30. Eval Strategy

Say2Build 不能只靠 Demo Case 看起来聪明。

固定 Eval 至少覆盖：

```text
01 vague idea
02 user says "you decide"
03 changing requirement
04 real conflict
05 feature creep
06 small change / NO_PERSIST
07 demo → product stage reminder
08 15+ turn long conversation
```

---

## 30.1 评估维度

每项：

```text
0 = fail
1 = acceptable
2 = strong
```

### Retention

重要信息是否保留。

### Revision correctness

旧决定是否正确退出 Current Truth。

### Over-persistence

随口想法是否被错误长期保存。

### Conflict handling

真正冲突是否正确提醒。

### Ask discipline

AI 是否过度追问。

### Next-action quality

下一步是否具体可执行。

### Task executability

Task 是否足够让 Coding Agent 单独开始。

---

## 30.2 Deterministic Checks

自动检查：

- Schema valid；
- supersede relation；
- 不存在相反 active decisions；
- nextAction 存在；
- artifact render 成功；
- import/export round trip。

---

## 30.3 Human / Model Assisted Checks

判断：

- 推荐是否自然；
- 是否过度教育；
- Scope 判断是否合理；
- Next Action 是否符合阶段。

---

# 31. MVP 功能边界

## P0 Core

1. Start from vague idea
2. Lightweight clarification
3. AI recommendation / Use recommendation
4. ProjectBrainState v1
5. Delta-based changes
6. Deterministic reducer
7. Decision / Constraint / Later Idea separation
8. Conflict handling
9. Current Project Consensus
10. Concrete Next Action
11. Project Updated + Undo
12. PROJECT.md
13. TaskSpec + task.md
14. Local persistence
15. Export / Import JSON + Markdown
16. Fixed eval suite

---

## P0.5

- Existing project via text / Markdown import；
- AGENTS.md generator；
- Stage-aware nudges；
- ZIP Project Pack；
- What Changed history drawer。

---

## P1

- GitHub Repo integration；
- cloud sync / account；
- DESIGN.md；
- direct Coding Agent handoff；
- personalization；
- project templates。

---

## 明确不做

- Coding IDE；
- code editor；
- terminal；
- repo browser；
- multi-agent；
- MCP；
- billing；
- team workspace；
- complex project management；
- automatic code execution。

---

# 32. 第一批开发任务

## Task 001 — Project shell

- Next.js / TS / Tailwind；
- Landing；
- Workspace skeleton；
- Responsive；
- 全假数据。

## Task 002 — Schema + Reducer

- Zod；
- types；
- BrainChange；
- reducer；
- supersede；
- validation；
- unit tests。

## Task 003 — Local Repository

- IndexedDB；
- CRUD；
- Recent Projects；
- schema version；
- migration shell。

## Task 004 — Static Interaction Prototype

- Choice；
- Project Updated；
- Conflict；
- Next Action；
- Undo；
- Brain panel。

先用 fake BrainTurnResult。

## Task 005 — Brain Turn API

- provider abstraction；
- structured output；
- System Behavior；
- Zod validation；
- failure handling。

## Task 006 — Conversation Loop

- send；
- API；
- apply changes；
- local save；
- render UI；
- recent context。

## Task 007 — PROJECT.md

- deterministic renderer；
- preview；
- copy；
- download；
- snapshot tests。

## Task 008 — TaskSpec

- generate；
- preview；
- copy；
- download；
- numbering。

## Task 009 — Export / Import

- JSON；
- Markdown bundle；
- validation；
- migration path。

## Task 010 — Eval Harness

- fixtures；
- deterministic checks；
- rubric；
- regression snapshots。

## Task 011 — UX Polish

- loading；
- errors；
- mobile Drawer；
- keyboard / accessibility；
- subtle motion；
- remove AI-template feeling。

## Task 012 — GitHub Release

- README；
- demo GIF；
- example；
- LICENSE；
- CONTRIBUTING；
- SECURITY；
- `.env.example`；
- Live Demo。

---

# 33. 开发顺序原则

**前 4 个 Task 不接真实 AI。**

先验证：

> 假设 AI 判断正确，这套交互本身是否舒服？

然后再接模型。

顺序：

```text
Static UX
↓
State / Reducer
↓
Local persistence
↓
Mock conversation flow
↓
Real structured AI
↓
Artifacts
↓
Eval
↓
Visual polish
↓
GitHub release
```

避免：

> 一上来接模型 → 所有 UX 问题都被误认为 Prompt 问题。

---

# 34. GitHub 发布要求

最终仓库：

```text
say2build/
├── app/
├── components/
├── lib/
├── tests/
├── evals/
├── examples/
├── docs/
│   ├── PRODUCT.md
│   └── ARCHITECTURE.md
├── public/
├── README.md
├── AGENTS.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── .env.example
└── package.json
```

推荐 License：MIT。

---

# 35. README 故事

第一屏不要卖技术。

```md
# Say2Build

Build freely. Don’t let the project forget.

A lightweight Project Brain for people building with AI.
```

核心问题：

> **AI coding agents can build fast. Beginner projects still get lost in long chats, changing ideas, and forgotten decisions.**

核心对比：

```text
Without Say2Build          With Say2Build

Idea                       Idea
 ↓                          ↓
Chat                       Chat
 ↓                          ↓
More chat              Project Brain
 ↓                          ↓
More chat              Current truth
 ↓                          ↓
???                     Next task
                            ↓
                          Codex
```

可用标题：

> **Your chat can be messy. Your project doesn't have to be.**

README 顺序：

1. Hero
2. Live Demo
3. 15 秒 GIF
4. Problem
5. What Say2Build does
6. Before / After
7. How it works
8. Quick Start
9. Non-goals
10. Architecture
11. Evals
12. Roadmap
13. Contributing / License

---

# 36. Demo Scenario

固定 Demo：

> 非技术用户做一个考研资料分发工具。

### Turn 1

> 我想做一个给学生发资料的小工具，别太复杂。

### Turn 2

> 页面最好还能做一点宣传。

### Turn 3

> 每个学生下载的 PDF 上都要有自己的名字。

系统发现：

> 静态下载假设需要改变。

### Turn 4

给：

- 预先批量生成；
- 下载时动态生成；
- 暂缓水印。

推荐最轻方案。

### Turn 5

生成：

- PROJECT.md；
- task-001.md；
- Ready for Codex。

Demo 必须证明：

> **连续使用，而不是一次 Prompt 优化。**

---

# 37. Definition of Done

只有全部满足才发布 GitHub `v0.1.0`。

## Product

- [ ] 模糊想法可以建立 Project Brain；
- [ ] 澄清问题少且有推荐；
- [ ] `Use recommendation` 可直接继续；
- [ ] 连续 15+ turns Current State 不明显漂移；
- [ ] 反悔后旧决定正确 supersede；
- [ ] Casual Idea 不会自动进入 Scope；
- [ ] 真冲突能被人话解释；
- [ ] 小改动能正确 NO_PERSIST；
- [ ] 始终有 Concrete Next Action；
- [ ] 可以生成 PROJECT.md；
- [ ] 可以生成 task.md；
- [ ] 可以 Export / Import。

## UX

- [ ] 首次打开不需要懂 Git / PRD / localhost；
- [ ] 首页 5 秒知道产品用途；
- [ ] Workspace 仍然像聊天；
- [ ] 用户知道刚才沉淀了什么；
- [ ] 低风险问题不过度确认；
- [ ] 手机基本可用。

## Engineering

- [ ] API key 仅服务端；
- [ ] Strict structured output；
- [ ] Reducer 有单测；
- [ ] Schema 有版本；
- [ ] export/import round trip；
- [ ] 固定 eval；
- [ ] 基础流程测试；
- [ ] `.env.example`；
- [ ] Live Demo。

## GitHub

- [ ] README；
- [ ] GIF / Screenshot；
- [ ] Live Demo；
- [ ] Example Project；
- [ ] Non-goals；
- [ ] License；
- [ ] CONTRIBUTING；
- [ ] SECURITY；
- [ ] v0.1.0 Release。

---

# 38. 现在故意不锁死的东西

这些不能阻止开发：

1. 最终模型 Provider；
2. 最终部署平台；
3. GitHub OAuth 实现；
4. 是否以后做本地 companion；
5. DESIGN.md 最终格式；
6. 是否长期继续叫 Say2Build。

原则：

> **不会改变核心价值的问题，先 Build 再决定。**

---

# 39. 核心系统图

```text
                    USER
         vague idea / new thought / change
                      │
                      ▼
             ┌─────────────────┐
             │   Conversation   │
             └────────┬────────┘
                      │
                      ▼
          ┌────────────────────────┐
          │ Conversation Interpreter│
          └───────────┬────────────┘
                      │
               BrainTurnResult
                      │
                      ▼
         ┌─────────────────────────┐
         │ Validation + Reducer    │
         └───────────┬─────────────┘
                     │
                     ▼
            ┌────────────────┐
            │ Project Brain  │
            │ source of truth│
            └───────┬────────┘
                    │
         ┌──────────┼─────────────┐
         ▼          ▼             ▼
 Current Consensus  Artifacts    Next Action
                    │             │
        ┌───────────┼──────┐      │
        ▼           ▼      ▼      ▼
   PROJECT.md   AGENTS  tasks   Codex / Claude Code
```

---

# 40. 产品价值判断标准

Say2Build 成不成立，不看：

- Prompt 有多长；
- 生成了多少文档；
- UI 有多少功能；
- 是否用了多 Agent；
- 是否接了 GitHub API。

真正判断：

> **一个不懂标准开发流程的人，能否只靠自然语言不断往前想，而 Say2Build 在背后替他维护一个越来越清楚、没有明显自相矛盾、并且始终可以继续执行的项目状态。**

最重要的真实指标：

> **用户做第二个项目时，会不会主动回来继续用 Say2Build。**

---

# 41. 最终产品公式

```text
Freedom to think
+
Just enough structure
+
Persistent current truth
+
Concrete next action
=
Say2Build
```

中文：

> **允许用户继续乱想，但不允许项目继续乱掉。**

---

# 42. 参考资料

1. GitHub Spec Kit  
   https://github.com/github/spec-kit

2. GitHub — Spec-driven development with AI  
   https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/

3. OpenAI Codex — AGENTS.md  
   https://developers.openai.com/codex/agent-configuration/agents-md

4. OpenAI Codex — Best practices  
   https://developers.openai.com/codex/learn/best-practices

5. OpenAI — Structured model outputs  
   https://developers.openai.com/api/docs/guides/structured-outputs

6. OpenAI — Codex Prompting Guide  
   https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide

7. Anthropic Claude Code — Project memory / CLAUDE.md  
   https://code.claude.com/docs/en/memory

8. Vercel AI SDK — Structured Data  
   https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

9. OpenSpec  
   https://github.com/Fission-AI/OpenSpec

10. Augment Prompt Enhancer  
    https://www.augmentcode.com/blog/prompt-enhancer-live-in-augment-chat

11. Kiro Requirements-First Specs  
    https://kiro.dev/docs/specs/feature-specs/requirements-first/

12. Replit Plan Mode  
    https://docs.replit.com/features/agent/plan-mode

13. EARS — Easy Approach to Requirements Syntax  
    https://alistairmavin.com/ears/

14. GOV.UK — Writing User Stories  
    https://www.gov.uk/service-manual/agile-delivery/writing-user-stories

---

# 43. 当前开发结论

核心产品不再继续无边界发散。

现在已经足够清楚，可以进入：

```text
Static UX
→ Schema / Reducer
→ Mock Project Brain Flow
→ Real Structured AI
→ Artifacts
→ Evals
→ Polish
→ GitHub v0.1.0
```

后续任何修改只在真实 Build 或 Eval 证据表明现有判断有问题时修改核心机制。

> **Build first, refine from evidence.**
