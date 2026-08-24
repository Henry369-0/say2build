import { applyBrainOperations, brainCompleteness, createEmptyProject, deriveConsensus } from './modules/brain.js';
import { createProjectExport, createTaskSpec, downloadText, renderAgentsMd, renderProjectMd, renderTaskMd, safeFileName } from './modules/artifacts.js';
import { deleteStoredProject, importStoredProject, listStoredProjects, loadStoredProject, saveStoredProject } from './modules/storage.js';
import { demoBrainTurn } from './modules/demo-engine.js';
import { AI_PROVIDERS, DEEPSEEK_MODELS, deepseekEnabled, getAISettings, saveAISettings, aiModeLabel } from './modules/ai-config.js';
import { deepseekBrainTurn, deepseekTask, testDeepSeekConnection } from './modules/deepseek.js';
import { buildClaudeCommand, buildCodexExecCommand, buildHandoffNote } from './modules/codex.js';
import { changeTargetLabel, stageLabel } from './modules/labels.js';
import { GUIDANCE_STEPS, deriveGuidance } from './modules/guidance.js';

const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
let current = null;
let pending = false;
let mobileBrainOpen = false;
let pendingGuidanceStep = null; // 用户点了「我来回答」后，下一次发送按这个引导维度处理

const icons = {
  arrow: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  brain: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.3A3.6 3.6 0 0 0 4 11.5a3.5 3.5 0 0 0 2.1 3.2A3.5 3.5 0 0 0 9.5 19H12V5.8a2 2 0 0 0-2.5-1.3Z" stroke="currentColor" stroke-width="1.7"/><path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.3a3.6 3.6 0 0 1 2 3.2 3.5 3.5 0 0 1-2.1 3.2 3.5 3.5 0 0 1-3.4 4.3H12V5.8a2 2 0 0 1 2.5-1.3Z" stroke="currentColor" stroke-width="1.7"/></svg>`,
  download: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  copy: `<svg class="icon" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/></svg>`,
  upload: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  menu: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  gear: `<svg class="icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" stroke="currentColor" stroke-width="1.5"/></svg>`,
  close: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}
function nl2br(value = '') { return escapeHtml(value).replace(/\n/g, '<br>'); }

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function setRoute(projectId = '') {
  const url = new URL(location.href);
  if (projectId) url.searchParams.set('project', projectId); else url.searchParams.delete('project');
  history.pushState({}, '', url);
  render();
}

function getRouteProject() {
  return new URL(location.href).searchParams.get('project');
}

function nav() {
  return `<header class="topbar"><div class="topbar-inner"><button class="brand btn-ghost" data-action="home" aria-label="Say2Build 首页"><img src="./assets/logo-mark.svg" alt=""/><span>Say2Build</span></button><nav class="nav-actions"><button class="btn btn-ghost" data-action="open-ai-settings">${icons.gear} AI 设置</button><button class="btn btn-ghost" data-action="open-import">导入项目</button><button class="btn btn-primary" data-action="focus-idea">开始新项目 ${icons.arrow}</button></nav></div></header>`;
}

function landing() {
  const recents = listStoredProjects().slice(0, 6);
  return `<div class="landing">
    ${nav()}
    <main>
      <section class="hero">
        <div>
          <span class="eyebrow"><i class="eyebrow-dot"></i> AI 开发者的项目大脑</span>
          <h1>想法可以乱，<span>项目不能乱。</span></h1>
          <p class="hero-sub">用平常话说你想做什么。<strong>Say2Build 会维护项目当前的真实状态、识别真正的冲突，并把下一步整理成 Codex 或 Claude Code 可以直接执行的任务。</strong></p>
          <div class="idea-card" id="idea-card">
            <label class="sr-only" for="idea-input">你想做什么？</label>
            <textarea id="idea-input" placeholder="我想做一个分享学习资料的小网站。大概知道要什么，但流程还没想清楚……"></textarea>
            <div class="idea-actions">
              <span class="idea-hint">不需要先写 PRD，从你脑子里现有的想法开始就行。</span>
              <button class="btn btn-primary" data-action="create-project">开始成型 ${icons.arrow}</button>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <img src="./assets/hero-flow.svg?v=0.3.2" alt="一个模糊的想法变成项目大脑，再变成一个可构建的下一步"/>
          <div class="hero-note"><strong>不是又一个编码 IDE。</strong>它负责编码工具上面那一层，让项目状态一直清楚。</div>
        </div>
      </section>

      <div class="trust-strip"><div class="trust-inner"><span>为已经在用 AI 做东西的人准备——但不想让项目决策埋在越来越长的聊天记录里。</span><div class="trust-points"><span class="trust-point"><i class="check-dot">✓</i> 无需登录</span><span class="trust-point"><i class="check-dot">✓</i> 保存在本机</span><span class="trust-point"><i class="check-dot">✓</i> 没有 API key 也能用演示模式</span></div></div></div>

      <section class="section">
        <div class="section-kicker">要解决的问题</div>
        <h2>AI 能做得很快，新手项目还是会跑偏。</h2>
        <p class="section-lead">Vibe coding 之所以有效，是因为你可以边想边说。它的问题在于：每个新想法只活在聊天里、旧决定从不清场、没人知道项目现在到底信什么。</p>
        <div class="problem-grid">
          <div class="problem-card"><h3>没有项目大脑</h3><div class="flow-line"><div class="step">想法</div><span class="flow-arrow">→</span><div class="step">聊天</div></div><div class="flow-line"><div class="step">更多的聊天</div><span class="flow-arrow">→</span><div class="step">更多的聊天</div></div><div class="flow-line"><div class="step">互相矛盾的决定</div><span class="flow-arrow">→</span><div class="step flow-end">“我们现在到底在做什么？”</div></div></div>
          <div class="problem-card dark"><h3>有 Say2Build</h3><div class="flow-line"><div class="step">自然对话</div><span class="flow-arrow">→</span><div class="step">当前真实状态</div></div><div class="flow-line"><div class="step">决定变了</div><span class="flow-arrow">→</span><div class="step">干净地取代</div></div><div class="flow-line"><div class="step">项目大脑</div><span class="flow-arrow">→</span><div class="step flow-end">下一个构建任务</div></div></div>
        </div>
      </section>

      <section class="section" style="padding-top:20px">
        <div class="section-kicker">怎么工作</div>
        <h2>刚刚好的结构，让你继续往前走。</h2>
        <div class="how-grid">
          <article class="how-card"><div class="how-num">01 · 说</div><h3>从一个粗糙的想法开始</h3><p>不需要提示词技巧，也不需要产品模板。乱七八糟的版本也是有效输入。</p></article>
          <article class="how-card"><div class="how-num">02 · 成型</div><h3>AI 处理低风险的判断</h3><p>只有当模糊点真的会改变产品形态时它才发问，而且会给出推荐选项。</p></article>
          <article class="how-card"><div class="how-num">03 · 记住</div><h3>保存当前真相，而不是聊天垃圾</h3><p>重要决策会保留。旧决定会被取代，而不是悄悄并存。</p></article>
          <article class="how-card"><div class="how-num">04 · 构建</div><h3>交接一个可执行的任务</h3><p>生成 PROJECT.md 和一个聚焦的任务文件，而不是把整个聊天记录倒给 Codex。</p></article>
        </div>
      </section>

      ${recents.length ? `<section class="recent-section"><div class="recent-header"><div><div class="section-kicker" style="margin:0 0 7px">本机</div><h3>最近的项目</h3></div></div><div class="recent-list">${recents.map(recentCard).join('')}</div></section>` : ''}
    </main>
    <footer class="footer"><div class="footer-inner"><span>Say2Build · 放心地构建，别让项目失忆。</span><span>本地优先 MVP · MIT License</span></div></footer>
  </div>`;
}

function recentCard(item) {
  const state = item.state;
  return `<button class="recent-card" data-action="open-project" data-project-id="${escapeHtml(state.projectId)}"><div class="recent-title">${escapeHtml(state.identity.title || state.identity.oneLiner)}</div><div class="recent-meta"><span>${escapeHtml(stageLabel(state.stage.current))}</span><span>${new Date(state.meta.updatedAt).toLocaleDateString()}</span></div></button>`;
}

function workspace() {
  if (!current) return '';
  const state = current.state;
  const consensus = deriveConsensus(state);
  const completion = brainCompleteness(state);
  const tasks = current.taskSpecs || [];
  const messages = current.conversations || [];
  const guidance = deriveGuidance(state);

  return `<div class="workspace-shell">
    <header class="workspace-topbar"><div class="topbar-inner">
      <div class="project-breadcrumb"><button class="btn btn-ghost btn-small mobile-brain-btn" data-action="toggle-brain" aria-label="打开项目大脑">${icons.brain}</button><button class="brand btn-ghost" data-action="home"><img src="./assets/logo-mark.svg" alt=""/><span>Say2Build</span></button><span style="color:#c3ccd8">/</span><span class="project-title">${escapeHtml(state.identity.title || '未命名项目')}</span><span class="stage-pill">${escapeHtml(stageLabel(state.stage.current))}</span><span class="saved-pill">已保存在本机</span><span class="ai-pill">${escapeHtml(aiModeLabel(getAISettings()))}</span></div>
      <div class="nav-actions"><button class="btn btn-ghost icon-btn" data-action="open-ai-settings" aria-label="AI 设置" title="AI 设置">${icons.gear}</button><button class="btn btn-small" data-action="new-project">${icons.plus}<span class="label">新建</span></button><button class="btn btn-small" data-action="export-menu">${icons.download}<span class="label">导出</span></button></div>
    </div></header>
    <main class="workspace">
      <aside class="brain-panel ${mobileBrainOpen ? 'open' : ''}" id="brain-panel">
        <div class="panel-head"><span class="panel-label">项目大脑</span><span class="completeness">${completion}% 成型</span></div>
        <div class="brain-block"><h4>我们在做什么</h4><p>${escapeHtml(consensus.what)}</p></div>
        <div class="brain-block"><h4>给谁用</h4><p>${escapeHtml(consensus.forWhom)}</p></div>
        <div class="brain-block"><h4>当前焦点</h4><p>${escapeHtml(consensus.focus)}</p></div>
        <div class="brain-block"><h4>已确认的决策</h4>${consensus.confirmed.length ? `<ul class="brain-list">${consensus.confirmed.map((d) => `<li>${escapeHtml(d.statement)}</li>`).join('')}</ul>` : `<p style="color:#96a1b0">还没有长期决策。</p>`}</div>
        <div class="brain-block"><h4>暂存区</h4>${state.scope.laterIdeas.length ? `<ul class="brain-list">${consensus.parking.map((d) => `<li>${escapeHtml(d.statement)}</li>`).join('')}<li style="color:#8d99a9">共 ${state.scope.laterIdeas.length} 个「以后再说」</li></ul>` : `<p style="color:#96a1b0">暂无暂存的想法。</p>`}</div>
        <div class="brain-block"><h4>澄清进度</h4><div class="guide-steps">${GUIDANCE_STEPS.map((step, i) => `<span class="guide-step ${i < guidance.completed ? 'done' : i === guidance.completed ? 'current' : ''}">${i < guidance.completed ? '✓' : i + 1}</span>`).join('')}</div>${guidance.current ? `<p class="guide-next">下一步：${escapeHtml(guidance.current.label)}</p>` : `<p class="guide-next ready">项目已经够清楚，可以开工了。</p>`}</div>
        <div class="next-block"><h4>下一步</h4><div class="next-title">${escapeHtml(consensus.next.title)}</div><div class="next-reason">${escapeHtml(consensus.next.reason)}</div>${consensus.next.canGenerateTask ? `<button class="btn btn-blue btn-small" style="margin-top:10px;width:100%" data-action="generate-task">生成构建任务 ${icons.arrow}</button>` : ''}</div>
        <div class="brain-block" style="margin-top:12px"><h4>产出文件</h4><div class="artifact-list"><button class="artifact-row" data-action="preview-project-md"><span>PROJECT.md</span><span>查看</span></button><button class="artifact-row" data-action="preview-agents-md"><span>AGENTS.md</span><span>查看</span></button>${tasks.slice(-3).reverse().map((task) => `<button class="artifact-row" data-action="preview-task" data-task-id="${escapeHtml(task.id)}"><span>${escapeHtml(task.id)}.md</span><span>查看</span></button>`).join('')}</div></div>
      </aside>
      <section class="conversation-area">
        <div class="conversation-scroll" id="conversation-scroll"><div class="thread">
          ${messages.length ? messages.map(renderMessage).join('') : welcomeMessage()}
          ${pending ? `<div class="message assistant" id="pending-message"><div class="message-role">Say2Build</div><div class="message-bubble"><span class="loading-dots"><i></i><i></i><i></i></span></div></div>` : ''}
        </div></div>
        <div class="composer-shell">${guidance.current && guidance.current.question ? `<div class="guide-strip"><span>为了让项目更清楚，建议先确认：<strong>${escapeHtml(guidance.current.question)}</strong></span><button class="btn btn-small btn-blue" data-action="answer-guidance" data-guidance-step="${escapeHtml(guidance.current.id)}">我来回答</button></div>` : ''}<div class="composer"><label class="sr-only" for="chat-input">告诉 Say2Build 你的下一个想法</label><textarea id="chat-input" placeholder="把下一个想法、改动或疑问告诉我。乱一点没关系。"></textarea><div class="composer-bottom"><span class="composer-hint">Enter 发送 · Shift+Enter 换行</span><button class="btn btn-primary btn-small" data-action="send-message" ${pending ? 'disabled' : ''}>发送 ${icons.arrow}</button></div></div></div>
      </section>
    </main>
  </div>`;
}

function welcomeMessage() {
  return `<div class="message assistant"><div class="message-role">Say2Build</div><div class="message-bubble">我已经根据你的初始想法创建了一个项目大脑。继续自然地说就行——我只会保存以后还用得上的部分，遇到真正的冲突会直接提醒你，而不是悄悄堆两个互相矛盾的决策。</div></div>`;
}

function renderMessage(message) {
  if (message.type === 'choice') return renderChoiceCard(message);
  if (message.type === 'update') return renderUpdateCard(message);
  if (message.type === 'conflict') return renderConflictCard(message);
  if (message.type === 'task') return renderTaskCard(message.task);
  const role = message.role === 'user' ? 'user' : 'assistant';
  const badge = message.mode === 'demo' ? '演示模式' : message.mode === 'deepseek' ? 'DeepSeek' : '';
  return `<div class="message ${role}"><div class="message-role">${role === 'user' ? '你' : `Say2Build${badge ? `<span class="demo-badge">${badge}</span>` : ''}`}</div><div class="message-bubble">${nl2br(message.content)}</div></div>`;
}

function renderChoiceCard(message) {
  const choice = message.choice;
  const answered = Boolean(message.answered);
  return `<div class="interaction-card choice-card ${answered ? 'answered' : ''}"><div class="card-head"><div class="card-eyebrow">影响产品形态的一个选择</div><div class="card-title">${escapeHtml(choice.question)}</div>${choice.whyItMatters ? `<div class="card-copy">${escapeHtml(choice.whyItMatters)}</div>` : ''}</div><div class="card-body"><div class="choice-options">${choice.options.map((option) => {
    const chosen = answered && message.answeredOptionId === option.id;
    return `<button class="choice-option ${option.id === choice.recommendedOptionId && !chosen ? 'recommended' : ''} ${chosen ? 'chosen' : ''}" data-action="select-choice" data-choice-id="${escapeHtml(message.id)}" data-option-id="${escapeHtml(option.id)}" ${answered ? 'disabled' : ''}><div class="option-row"><span class="option-label">${escapeHtml(option.label)}</span>${option.id === choice.recommendedOptionId ? '<span class="rec-tag">推荐</span>' : ''}${chosen ? '<span class="rec-tag chosen-tag">已选择</span>' : ''}</div>${option.consequence ? `<div class="option-consequence">${escapeHtml(option.consequence)}</div>` : ''}</button>`;
  }).join('')}</div></div><div class="card-actions">${answered ? `<button class="btn btn-ghost btn-small" data-action="focus-chat">继续补充</button>` : `<button class="btn btn-blue btn-small" data-action="use-recommendation" data-choice-id="${escapeHtml(message.id)}">采纳推荐</button><button class="btn btn-ghost btn-small" data-action="focus-chat">换一个思路</button>`}</div></div>`;
}

function renderUpdateCard(message) {
  return `<div class="interaction-card update-card"><div class="card-head"><div class="card-eyebrow">✓ 项目已更新</div><div class="card-copy">只有值得长期记住的改动被写进了项目大脑。</div></div><div class="card-body"><ul class="change-list">${message.changes.slice(0, 5).map((change) => `<li><span class="change-symbol">+</span><span><strong>${escapeHtml(changeTargetLabel(change.target))}</strong> · ${escapeHtml(change.statement)}</span></li>`).join('')}</ul></div><div class="card-actions"><button class="btn btn-ghost btn-small" data-action="undo">撤销上一次更新</button></div></div>`;
}

function renderConflictCard(message) {
  const c = message.conflict;
  return `<div class="interaction-card conflict-card"><div class="card-head"><div class="card-eyebrow">这改变了之前的一个决定</div><div class="card-title">${escapeHtml(c.summary)}</div></div><div class="card-body"><div class="conflict-pair"><div class="conflict-side"><small>之前</small><p>${escapeHtml(c.priorStatement)}</p></div><div class="conflict-side"><small>新方向</small><p>${escapeHtml(c.newDirection)}</p></div></div><div class="card-copy" style="margin-top:10px"><strong>推荐：</strong> ${escapeHtml(c.recommendedResolution)}</div></div></div>`;
}

function renderTaskCard(task) {
  const done = task.status === 'done';
  return `<div class="interaction-card task-card ${done ? 'done' : ''}"><div class="card-head"><div class="card-eyebrow">${done ? '✓ 已完成' : '可以交给 Codex / Claude Code'}</div><div class="card-title">${escapeHtml(task.title)}</div><div class="card-copy">${escapeHtml(task.objective)}</div></div><div class="card-body"><div class="task-scope"><div class="task-scope-box"><h5>会做</h5><ul>${task.inScope.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>把目标实现成最小的可用切片。</li>'}</ul></div><div class="task-scope-box"><h5>不碰</h5><ul>${task.outOfScope.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>不做无关的范围扩张。</li>'}</ul></div></div>${done && task.report ? `<div class="task-report"><strong>完成报告</strong><pre>${escapeHtml(task.report)}</pre></div>` : ''}</div><div class="card-actions">${done ? '' : `<button class="btn btn-blue btn-small" data-action="copy-task" data-task-id="${escapeHtml(task.id)}">${icons.copy} 复制给 Codex</button><button class="btn btn-small" data-action="codex-handoff" data-task-id="${escapeHtml(task.id)}">用 Codex 执行</button>`}<button class="btn btn-small" data-action="download-task" data-task-id="${escapeHtml(task.id)}">${icons.download} 下载 .md</button><button class="btn btn-ghost btn-small" data-action="preview-task" data-task-id="${escapeHtml(task.id)}">查看完整任务</button>${done ? '' : `<button class="btn btn-ghost btn-small" data-action="complete-task" data-task-id="${escapeHtml(task.id)}">标记完成</button>`}</div></div>`;
}

function persist() {
  if (!current) return;
  current = saveStoredProject(current);
}

async function createProject() {
  const input = document.querySelector('#idea-input');
  const idea = input?.value.trim();
  if (!idea) { toast('先写一句粗糙的想法。'); input?.focus(); return; }
  const state = createEmptyProject({ idea });
  current = { state, conversations: [{ id: `msg-${Date.now()}`, role: 'user', content: idea, createdAt: new Date().toISOString() }], taskSpecs: [], snapshots: [], ui: {} };
  persist();
  setRoute(state.projectId);
  await processTurn(idea, { initial: true });
}

async function processTurn(userMessage, { initial = false, alreadyAdded = false, choiceContext = null } = {}) {
  if (!current || pending) return;
  if (!initial && !alreadyAdded) current.conversations.push({ id: `msg-${Date.now()}`, role: 'user', content: userMessage, createdAt: new Date().toISOString() });
  pending = true;
  persist();
  render();
  scrollBottom();

  const recent = current.conversations.slice(-8);
  const choicePayload = choiceContext ? { question: choiceContext.choice.question, optionLabel: choiceContext.option.label } : null;
  const guidanceStep = pendingGuidanceStep || null;
  pendingGuidanceStep = null;
  let result = null;

  // 1) 浏览器直连 DeepSeek（用户在前端「AI 设置」里配置的 Key）
  const settings = getAISettings();
  if (deepseekEnabled(settings)) {
    try {
      result = await deepseekBrainTurn({
        project: current.state, recentMessages: recent, userMessage,
        choice: choicePayload, guidanceStep, apiKey: settings.deepseekKey, model: settings.deepseekModel,
      });
    } catch (error) {
      toast(`DeepSeek 调用失败，已改用备用大脑：${error.message}`);
    }
  }

  // 2) 服务器 AI（自托管 / 部署时配置的 OPENAI_API_KEY）
  if (!result) {
    try {
      const response = await fetch('./api/brain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: current.state, recentMessages: recent, userMessage, choice: choicePayload, guidanceStep }),
      });
      if (!response.ok) throw new Error('API unavailable');
      const payload = await response.json();
      result = payload.result;
    } catch { /* 继续走演示模式 */ }
  }

  // 3) 演示模式兜底（永远可用）
  if (!result) result = demoBrainTurn(current.state, userMessage, recent, { ...(choiceContext || {}), guidanceStep });

  applyTurnResult(result);
  pending = false;
  persist();
  render();
  scrollBottom();
}

function applyTurnResult(result) {
  if (!current) return;
  const previous = structuredClone(current.state);
  const { state, applied } = applyBrainOperations(current.state, result.changes || []);
  state.execution.nextAction = result.nextAction || state.execution.nextAction;
  if (result.stageSignal?.suggestedStage && !(result.changes || []).some((c) => c.target === 'stage')) {
    state.stage.current = result.stageSignal.suggestedStage;
    state.stage.reason = result.stageSignal.reason || state.stage.reason;
  }
  current.state = state;

  current.conversations.push({ id: `msg-${Date.now()}-a`, role: 'assistant', content: result.assistantReply || result.understanding || '项目已更新。', createdAt: new Date().toISOString(), mode: result.mode });
  for (const conflict of result.conflicts || []) current.conversations.push({ id: `conf-${conflict.id}`, type: 'conflict', conflict, createdAt: new Date().toISOString() });
  if (result.choice) current.conversations.push({ id: `choice-${Date.now()}`, type: 'choice', choice: result.choice, createdAt: new Date().toISOString() });
  if (applied.length) {
    current.snapshots = [...(current.snapshots || []), previous].slice(-8);
    current.conversations.push({ id: `update-${Date.now()}`, type: 'update', changes: applied, createdAt: new Date().toISOString() });
  }
}

async function chooseOption(choiceMessageId, optionId) {
  const message = current?.conversations.find((item) => item.id === choiceMessageId);
  if (!message?.choice) return;
  const option = message.choice.options.find((item) => item.id === optionId);
  if (!option || message.answered) return;
  message.answered = true;
  message.answeredOptionId = optionId;
  await processTurn(`我选择：${option.label}`, { choiceContext: { choice: message.choice, option } });
}

async function generateTask() {
  if (!current) return;
  let task = null;

  // 1) 浏览器直连 DeepSeek 生成任务
  const settings = getAISettings();
  if (deepseekEnabled(settings)) {
    try {
      task = await deepseekTask({ project: current.state, apiKey: settings.deepseekKey, model: settings.deepseekModel });
    } catch (error) {
      toast(`DeepSeek 生成任务失败，已改用本地生成：${error.message}`);
    }
  }

  // 2) 服务器 AI
  if (!task) {
    try {
      const response = await fetch('./api/task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: current.state }) });
      if (!response.ok) throw new Error('Task API unavailable');
      const payload = await response.json();
      task = payload.task;
    } catch {
      task = null;
    }
  }

  // 3) 确定性本地生成兜底
  if (!task) task = createTaskSpec(current.state);

  const nextTaskNumber = current.taskSpecs.length + 1;
  task.id = `task-${String(nextTaskNumber).padStart(3, '0')}`;
  task.status = task.status || 'ready';
  task.createdAt = task.createdAt || new Date().toISOString();
  current.taskSpecs.push(task);
  current.state.execution.taskIndex = [...(current.state.execution.taskIndex || []).filter((item) => item.id !== task.id), { id: task.id, title: task.title, status: 'ready', createdAt: task.createdAt }];
  current.state.execution.activeTaskId = task.id;
  current.state.artifacts.taskCount = current.taskSpecs.length;
  current.conversations.push({ id: `taskmsg-${Date.now()}`, type: 'task', task, createdAt: new Date().toISOString() });
  persist();
  render();
  scrollBottom();
}

function completeTask(taskId) {
  const task = current?.taskSpecs.find((item) => item.id === taskId);
  if (!task || task.status === 'done') return;
  const prompts = task.completionReport || ['改了什么', '改了哪些文件', '怎么验证的', '还有什么没解决'];
  const modal = showModal({
    title: '完成任务',
    subtitle: '把编码工具的报告填进来，Say2Build 会把它记入项目状态。',
    body: `<label class="panel-label" for="task-report">完成报告</label><textarea id="task-report" placeholder="${escapeHtml(prompts.map((p, i) => `${i + 1}. ${p}`).join('\n'))}"></textarea>`,
    actions: `<button class="btn btn-primary" data-task-confirm>确认完成</button>`,
  });
  modal.querySelector('[data-task-confirm]').addEventListener('click', () => {
    const report = modal.querySelector('#task-report').value.trim();
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    task.report = report;
    const indexEntry = (current.state.execution.taskIndex || []).find((item) => item.id === task.id);
    if (indexEntry) { indexEntry.status = 'done'; indexEntry.completedAt = task.completedAt; }
    current.conversations.push({
      id: `taskdone-${Date.now()}`,
      role: 'assistant',
      content: `任务「${task.title}」已标记完成。${report ? `\n\n完成报告：\n${report}` : ''}\n\n下一步建议：先验证这次改动真的可用，再把结果放回项目状态。`,
      createdAt: new Date().toISOString(),
    });
    persist();
    render();
    modal.remove();
    toast('任务已标记完成。');
  });
}

function undo() {
  if (!current?.snapshots?.length) { toast('还没有可撤销的更新。'); return; }
  current.state = current.snapshots.pop();
  current.conversations.push({ id: `msg-${Date.now()}`, role: 'assistant', content: '我回滚了最近一次项目大脑更新。对话还在，但那个改动不再属于当前真实状态。', createdAt: new Date().toISOString() });
  persist();
  render();
  toast('已撤销最近一次项目大脑更新。');
}

function scrollBottom() {
  requestAnimationFrame(() => {
    const el = document.querySelector('#conversation-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function showModal({ title, subtitle = '', body, actions = '' }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h3>${escapeHtml(title)}</h3>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><button class="btn btn-ghost icon-btn" data-modal-close aria-label="关闭">${icons.close}</button></div><div class="modal-body">${body}<div class="modal-actions">${actions}</div></div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-modal-close]')) wrap.remove(); });
  return wrap;
}

function previewArtifact(kind, taskId) {
  if (!current) return;
  let title = kind;
  let content = '';
  if (kind === 'PROJECT.md') content = renderProjectMd(current.state);
  else if (kind === 'AGENTS.md') content = renderAgentsMd(current.state);
  else {
    const task = current.taskSpecs.find((item) => item.id === taskId);
    if (!task) return;
    title = `${task.id}.md`;
    content = renderTaskMd(task);
  }
  const modal = showModal({ title, subtitle: '由当前项目大脑派生——不是原始聊天记录。', body: `<pre class="preview">${escapeHtml(content)}</pre><div class="modal-actions"><button class="btn" data-preview-copy>${icons.copy} 复制</button><button class="btn btn-primary" data-preview-download>${icons.download} 下载</button></div>` });
  modal.querySelector('[data-preview-copy]').addEventListener('click', async () => { await navigator.clipboard.writeText(content); toast('已复制。'); });
  modal.querySelector('[data-preview-download]').addEventListener('click', () => downloadText(title, content, 'text/markdown;charset=utf-8'));
}

function exportMenu() {
  if (!current) return;
  const projectMd = renderProjectMd(current.state);
  const agentsMd = renderAgentsMd(current.state);
  const payload = createProjectExport(current.state, current.conversations, current.taskSpecs);
  const base = safeFileName(current.state.identity.title || 'say2build-project');
  const modal = showModal({ title: '导出项目', subtitle: 'JSON 用于之后恢复项目；Markdown 给你和编码工具看。', body: `<div class="artifact-list"><button class="artifact-row" data-export="json"><span>say2build.project.json</span><span>之后可恢复</span></button><button class="artifact-row" data-export="project"><span>PROJECT.md</span><span>当前真实状态</span></button><button class="artifact-row" data-export="agents"><span>AGENTS.md</span><span>稳定的编码上下文</span></button>${current.taskSpecs.slice(-3).map((task) => `<button class="artifact-row" data-export-task="${escapeHtml(task.id)}"><span>${escapeHtml(task.id)}.md</span><span>构建任务</span></button>`).join('')}</div>` });
  modal.querySelector('[data-export="json"]').addEventListener('click', () => downloadText(`${base}.say2build.project.json`, JSON.stringify(payload, null, 2), 'application/json'));
  modal.querySelector('[data-export="project"]').addEventListener('click', () => downloadText('PROJECT.md', projectMd, 'text/markdown;charset=utf-8'));
  modal.querySelector('[data-export="agents"]').addEventListener('click', () => downloadText('AGENTS.md', agentsMd, 'text/markdown;charset=utf-8'));
  modal.querySelectorAll('[data-export-task]').forEach((el) => el.addEventListener('click', () => {
    const task = current.taskSpecs.find((item) => item.id === el.dataset.exportTask);
    if (task) downloadText(`${task.id}.md`, renderTaskMd(task), 'text/markdown;charset=utf-8');
  }));
}

function openImport() {
  const modal = showModal({ title: '导入已有项目', subtitle: '粘贴一段 README / 项目说明，或导入之前导出的 Say2Build 项目文件。', body: `<label class="panel-label" for="existing-project-text">项目说明或 Markdown</label><textarea id="existing-project-text" placeholder="粘贴当前的项目目标、README、AGENTS.md，或直接说说你已经建了什么、哪里感觉乱……"></textarea><div class="modal-actions"><label class="btn">${icons.upload} 导入 .json<input id="project-file" type="file" accept="application/json,.json" hidden/></label><button class="btn btn-primary" data-shape-existing>把这个项目成型 ${icons.arrow}</button></div>` });
  modal.querySelector('#project-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const stored = importStoredProject(payload);
      current = stored;
      modal.remove();
      setRoute(stored.state.projectId);
      toast('项目已恢复。');
    } catch (error) { toast(error.message || '无法导入这个文件。'); }
  });
  modal.querySelector('[data-shape-existing]').addEventListener('click', async () => {
    const text = modal.querySelector('#existing-project-text').value.trim();
    if (!text) { toast('先粘贴一段项目说明。'); return; }
    const state = createEmptyProject({ idea: text, title: '导入的项目' });
    current = { state, conversations: [{ id:`msg-${Date.now()}`, role:'user', content:`已有项目说明：\n${text}`, createdAt:new Date().toISOString() }], taskSpecs: [], snapshots: [], ui: {} };
    persist(); modal.remove(); setRoute(state.projectId); await processTurn(text, { initial: true });
  });
}

function settingsModal() {
  const settings = getAISettings();
  const modal = showModal({
    title: 'AI 接入设置',
    subtitle: '选择交互时使用的“大脑”。DeepSeek 的 Key 只保存在本机浏览器，不会发送给任何服务器。',
    body: `<div class="provider-list">
        ${AI_PROVIDERS.map((p) => `<button class="provider-card ${settings.provider === p.id ? 'selected' : ''}" data-provider="${escapeHtml(p.id)}"><span class="provider-name">${escapeHtml(p.label)}</span><span class="provider-hint">${escapeHtml(p.hint)}</span></button>`).join('')}
      </div>
      <div class="deepseek-fields ${settings.provider === 'deepseek' ? '' : 'hidden'}">
        <label class="panel-label" for="deepseek-key">DeepSeek API Key（platform.deepseek.com 获取）</label>
        <input id="deepseek-key" type="password" value="${escapeHtml(settings.deepseekKey)}" placeholder="sk-..." autocomplete="off"/>
        <label class="panel-label" for="deepseek-model" style="margin-top:12px">模型</label>
        <select id="deepseek-model">${DEEPSEEK_MODELS.map((m) => `<option value="${escapeHtml(m.id)}" ${settings.deepseekModel === m.id ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')}</select>
        <button class="btn btn-small" data-test-deepseek style="margin-top:12px">测试连接</button>
        <span class="test-result" data-test-result></span>
      </div>`,
    actions: `<button class="btn btn-primary" data-save-ai>保存</button>`,
  });

  modal.querySelectorAll('[data-provider]').forEach((btn) => btn.addEventListener('click', () => {
    modal.querySelectorAll('[data-provider]').forEach((b) => b.classList.toggle('selected', b === btn));
    modal.querySelector('.deepseek-fields')?.classList.toggle('hidden', btn.dataset.provider !== 'deepseek');
  }));

  modal.querySelector('[data-test-deepseek]')?.addEventListener('click', async () => {
    const key = modal.querySelector('#deepseek-key').value.trim();
    const model = modal.querySelector('#deepseek-model').value;
    const el = modal.querySelector('[data-test-result]');
    if (!key) { el.textContent = '请先填写 Key。'; el.className = 'test-result fail'; return; }
    el.textContent = '测试中…'; el.className = 'test-result';
    try {
      await testDeepSeekConnection({ apiKey: key, model });
      el.textContent = '连接成功 ✓'; el.className = 'test-result ok';
    } catch (error) {
      el.textContent = `失败：${error.message}`; el.className = 'test-result fail';
    }
  });

  modal.querySelector('[data-save-ai]').addEventListener('click', () => {
    const provider = modal.querySelector('.provider-card.selected')?.dataset.provider || 'demo';
    const patch = { provider };
    if (provider === 'deepseek') {
      const key = modal.querySelector('#deepseek-key').value.trim();
      if (!key) { toast('请先填写 DeepSeek API Key。'); return; }
      patch.deepseekKey = key;
      patch.deepseekModel = modal.querySelector('#deepseek-model').value;
    }
    saveAISettings(patch);
    toast('AI 设置已保存。');
    modal.remove();
    render();
  });
}

function codexHandoffModal(taskId) {
  const task = current?.taskSpecs.find((item) => item.id === taskId);
  if (!task) return;
  const codexCmd = buildCodexExecCommand(task);
  const claudeCmd = buildClaudeCommand(task);
  const note = buildHandoffNote(task);
  showModal({
    title: '交接给 Codex / Claude Code',
    subtitle: '把任务文件放进项目仓库，然后在项目目录里运行命令。',
    body: `<div class="handoff-note"><pre class="preview">${escapeHtml(note)}</pre></div>
      <label class="panel-label" style="margin-top:14px">Codex CLI</label>
      <div class="cmd-row"><pre class="cmd">${escapeHtml(codexCmd)}</pre><button class="btn btn-small" data-copy-cmd="${escapeHtml(codexCmd)}">${icons.copy} 复制</button></div>
      <label class="panel-label" style="margin-top:12px">Claude Code</label>
      <div class="cmd-row"><pre class="cmd">${escapeHtml(claudeCmd)}</pre><button class="btn btn-small" data-copy-cmd="${escapeHtml(claudeCmd)}">${icons.copy} 复制</button></div>`,
    actions: `<button class="btn btn-ghost" data-modal-close>关闭</button>`,
  }).querySelectorAll('[data-copy-cmd]').forEach((btn) => btn.addEventListener('click', () => {
    navigator.clipboard.writeText(btn.dataset.copyCmd).then(() => toast('命令已复制。'));
  }));
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'home') { current = null; setRoute(''); }
  if (action === 'focus-idea') document.querySelector('#idea-input')?.focus();
  if (action === 'open-ai-settings') settingsModal();
  if (action === 'create-project') createProject();
  if (action === 'open-import') openImport();
  if (action === 'open-project') { const stored = loadStoredProject(target.dataset.projectId); if (stored) { current = stored; setRoute(stored.state.projectId); } }
  if (action === 'new-project') { current = null; setRoute(''); setTimeout(() => document.querySelector('#idea-input')?.focus(), 30); }
  if (action === 'toggle-brain') { mobileBrainOpen = !mobileBrainOpen; document.querySelector('#brain-panel')?.classList.toggle('open', mobileBrainOpen); }
  if (action === 'send-message') sendComposer();
  if (action === 'focus-chat') document.querySelector('#chat-input')?.focus();
  if (action === 'answer-guidance') {
    pendingGuidanceStep = target.dataset.guidanceStep || null;
    document.querySelector('#chat-input')?.focus();
  }
  if (action === 'select-choice') chooseOption(target.dataset.choiceId, target.dataset.optionId);
  if (action === 'use-recommendation') {
    const msg = current?.conversations.find((item) => item.id === target.dataset.choiceId);
    if (msg?.choice && !msg.answered) chooseOption(msg.id, msg.choice.recommendedOptionId);
  }
  if (action === 'undo') undo();
  if (action === 'generate-task') generateTask();
  if (action === 'complete-task') completeTask(target.dataset.taskId);
  if (action === 'codex-handoff') codexHandoffModal(target.dataset.taskId);
  if (action === 'preview-project-md') previewArtifact('PROJECT.md');
  if (action === 'preview-agents-md') previewArtifact('AGENTS.md');
  if (action === 'preview-task') previewArtifact('task', target.dataset.taskId);
  if (action === 'export-menu') exportMenu();
  if (action === 'copy-task') {
    const task = current?.taskSpecs.find((item) => item.id === target.dataset.taskId);
    if (task) navigator.clipboard.writeText(renderTaskMd(task)).then(() => toast('任务已复制给 Codex。'));
  }
  if (action === 'download-task') {
    const task = current?.taskSpecs.find((item) => item.id === target.dataset.taskId);
    if (task) downloadText(`${task.id}.md`, renderTaskMd(task), 'text/markdown;charset=utf-8');
  }
}

function sendComposer() {
  const input = document.querySelector('#chat-input');
  const text = input?.value.trim();
  if (!text || pending) return;
  input.value = '';
  processTurn(text);
}

function handleKeydown(event) {
  if (event.target?.id === 'chat-input' && event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendComposer(); }
  if (event.target?.id === 'idea-input' && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); createProject(); }
  if (event.key === 'Escape' && mobileBrainOpen) { mobileBrainOpen = false; document.querySelector('#brain-panel')?.classList.remove('open'); }
}

function render() {
  const projectId = getRouteProject();
  if (projectId) {
    if (!current || current.state.projectId !== projectId) current = loadStoredProject(projectId);
    if (!current) { history.replaceState({}, '', location.pathname); app.innerHTML = landing(); }
    else app.innerHTML = workspace();
  } else {
    current = null;
    app.innerHTML = landing();
  }
}

app.addEventListener('click', handleClick);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('popstate', render);
render();
