import { applyBrainOperations, brainCompleteness, createEmptyProject, deriveConsensus } from './modules/brain.js';
import { createProjectExport, createTaskSpec, downloadText, renderAgentsMd, renderProjectMd, renderTaskMd, safeFileName } from './modules/artifacts.js';
import { deleteStoredProject, importStoredProject, listStoredProjects, loadStoredProject, saveStoredProject } from './modules/storage.js';
import { demoBrainTurn, demoChoiceResult } from './modules/demo-engine.js';

const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
let current = null;
let pending = false;
let mobileBrainOpen = false;

const icons = {
  arrow: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  brain: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.3A3.6 3.6 0 0 0 4 11.5a3.5 3.5 0 0 0 2.1 3.2A3.5 3.5 0 0 0 9.5 19H12V5.8a2 2 0 0 0-2.5-1.3Z" stroke="currentColor" stroke-width="1.7"/><path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.3a3.6 3.6 0 0 1 2 3.2 3.5 3.5 0 0 1-2.1 3.2 3.5 3.5 0 0 1-3.4 4.3H12V5.8a2 2 0 0 1 2.5-1.3Z" stroke="currentColor" stroke-width="1.7"/></svg>`,
  download: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  copy: `<svg class="icon" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/></svg>`,
  upload: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  menu: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
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
  return `<header class="topbar"><div class="topbar-inner"><button class="brand btn-ghost" data-action="home" aria-label="Say2Build home"><img src="./assets/logo-mark.svg" alt=""/><span>Say2Build</span></button><nav class="nav-actions"><button class="btn btn-ghost" data-action="open-import">Bring a project</button><button class="btn btn-primary" data-action="focus-idea">Start a project ${icons.arrow}</button></nav></div></header>`;
}

function landing() {
  const recents = listStoredProjects().slice(0, 6);
  return `<div class="landing">
    ${nav()}
    <main>
      <section class="hero">
        <div>
          <span class="eyebrow"><i class="eyebrow-dot"></i> Project Brain for AI builders</span>
          <h1>Your ideas can stay messy. <span>Your project doesn’t have to.</span></h1>
          <p class="hero-sub">Say what you’re trying to build in normal language. <strong>Say2Build keeps the current truth, catches real conflicts, and turns the next step into something Codex or Claude Code can execute.</strong></p>
          <div class="idea-card" id="idea-card">
            <label class="sr-only" for="idea-input">What are you trying to build?</label>
            <textarea id="idea-input" placeholder="I want to build a small website for sharing study materials. I have a rough idea, but I’m not sure what I need yet…"></textarea>
            <div class="idea-actions">
              <span class="idea-hint">You don’t need a PRD. Start with the thought you already have.</span>
              <button class="btn btn-primary" data-action="create-project">Start shaping ${icons.arrow}</button>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <img src="./assets/hero-flow.svg" alt="Illustration showing a vague idea becoming a Project Brain and a buildable next task"/>
          <div class="hero-note"><strong>Not another coding IDE.</strong>It keeps the layer above the coding agent clear.</div>
        </div>
      </section>

      <div class="trust-strip"><div class="trust-inner"><span>Built for people who already use AI to make things — but don’t want project decisions buried in giant chats.</span><div class="trust-points"><span class="trust-point"><i class="check-dot">✓</i> No login required</span><span class="trust-point"><i class="check-dot">✓</i> Saved on this device</span><span class="trust-point"><i class="check-dot">✓</i> Demo mode works without an API key</span></div></div></div>

      <section class="section">
        <div class="section-kicker">The problem</div>
        <h2>AI can build fast. Beginner projects still lose the plot.</h2>
        <p class="section-lead">Vibe coding works because you can think out loud. It breaks when every new thought lives only in the chat, old decisions never leave, and nobody knows what the project currently believes.</p>
        <div class="problem-grid">
          <div class="problem-card"><h3>Without a Project Brain</h3><div class="flow-line"><div class="step">Idea</div><span class="flow-arrow">→</span><div class="step">Chat</div></div><div class="flow-line"><div class="step">More chat</div><span class="flow-arrow">→</span><div class="step">More chat</div></div><div class="flow-line"><div class="step">Conflicting decisions</div><span class="flow-arrow">→</span><div class="step flow-end">“What are we building now?”</div></div></div>
          <div class="problem-card dark"><h3>With Say2Build</h3><div class="flow-line"><div class="step">Natural conversation</div><span class="flow-arrow">→</span><div class="step">Current truth</div></div><div class="flow-line"><div class="step">Decision changes</div><span class="flow-arrow">→</span><div class="step">Superseded cleanly</div></div><div class="flow-line"><div class="step">Project Brain</div><span class="flow-arrow">→</span><div class="step flow-end">Next build task</div></div></div>
        </div>
      </section>

      <section class="section" style="padding-top:20px">
        <div class="section-kicker">How it works</div>
        <h2>Just enough structure to keep moving.</h2>
        <div class="how-grid">
          <article class="how-card"><div class="how-num">01 · SAY</div><h3>Start with a rough thought</h3><p>No prompt engineering and no product template. The messy version is valid input.</p></article>
          <article class="how-card"><div class="how-num">02 · SHAPE</div><h3>AI handles the easy decisions</h3><p>It only asks when an ambiguity can actually change the product shape — and it recommends an option.</p></article>
          <article class="how-card"><div class="how-num">03 · REMEMBER</div><h3>Keep current truth, not chat clutter</h3><p>Important decisions persist. Old decisions can be superseded instead of silently coexisting.</p></article>
          <article class="how-card"><div class="how-num">04 · BUILD</div><h3>Hand off one executable task</h3><p>Generate PROJECT.md and a focused task file instead of dumping the whole conversation into Codex.</p></article>
        </div>
      </section>

      ${recents.length ? `<section class="recent-section"><div class="recent-header"><div><div class="section-kicker" style="margin:0 0 7px">On this device</div><h3>Recent projects</h3></div></div><div class="recent-list">${recents.map(recentCard).join('')}</div></section>` : ''}
    </main>
    <footer class="footer"><div class="footer-inner"><span>Say2Build · Build freely. Don’t let the project forget.</span><span>Local-first MVP · MIT License</span></div></footer>
  </div>`;
}

function recentCard(item) {
  const state = item.state;
  return `<button class="recent-card" data-action="open-project" data-project-id="${escapeHtml(state.projectId)}"><div class="recent-title">${escapeHtml(state.identity.title || state.identity.oneLiner)}</div><div class="recent-meta"><span>${escapeHtml(state.stage.current.replaceAll('_',' '))}</span><span>${new Date(state.meta.updatedAt).toLocaleDateString()}</span></div></button>`;
}

function workspace() {
  if (!current) return '';
  const state = current.state;
  const consensus = deriveConsensus(state);
  const completion = brainCompleteness(state);
  const tasks = current.taskSpecs || [];
  const messages = current.conversations || [];

  return `<div class="workspace-shell">
    <header class="workspace-topbar"><div class="topbar-inner">
      <div class="project-breadcrumb"><button class="btn btn-ghost btn-small mobile-brain-btn" data-action="toggle-brain" aria-label="Open Project Brain">${icons.brain}</button><button class="brand btn-ghost" data-action="home"><img src="./assets/logo-mark.svg" alt=""/><span>Say2Build</span></button><span style="color:#c3ccd8">/</span><span class="project-title">${escapeHtml(state.identity.title || 'Untitled project')}</span><span class="stage-pill">${escapeHtml(state.stage.current.replaceAll('_',' '))}</span><span class="saved-pill">Saved on this device</span></div>
      <div class="nav-actions"><button class="btn btn-small" data-action="new-project">${icons.plus}<span class="label">New</span></button><button class="btn btn-small" data-action="export-menu">${icons.download}<span class="label">Export</span></button></div>
    </div></header>
    <main class="workspace">
      <aside class="brain-panel ${mobileBrainOpen ? 'open' : ''}" id="brain-panel">
        <div class="panel-head"><span class="panel-label">Project Brain</span><span class="completeness">${completion}% shaped</span></div>
        <div class="brain-block"><h4>What we're building</h4><p>${escapeHtml(consensus.what)}</p></div>
        <div class="brain-block"><h4>For whom</h4><p>${escapeHtml(consensus.forWhom)}</p></div>
        <div class="brain-block"><h4>Current focus</h4><p>${escapeHtml(consensus.focus)}</p></div>
        <div class="brain-block"><h4>Confirmed</h4>${consensus.confirmed.length ? `<ul class="brain-list">${consensus.confirmed.map((d) => `<li>${escapeHtml(d.statement)}</li>`).join('')}</ul>` : `<p style="color:#96a1b0">No durable decisions yet.</p>`}</div>
        <div class="brain-block"><h4>Parking lot</h4>${state.scope.laterIdeas.length ? `<ul class="brain-list">${consensus.parking.map((d) => `<li>${escapeHtml(d.statement)}</li>`).join('')}<li style="color:#8d99a9">${state.scope.laterIdeas.length} later idea${state.scope.laterIdeas.length === 1 ? '' : 's'} total</li></ul>` : `<p style="color:#96a1b0">Nothing parked yet.</p>`}</div>
        <div class="next-block"><h4>Next</h4><div class="next-title">${escapeHtml(consensus.next.title)}</div><div class="next-reason">${escapeHtml(consensus.next.reason)}</div>${consensus.next.canGenerateTask ? `<button class="btn btn-blue btn-small" style="margin-top:10px;width:100%" data-action="generate-task">Generate build task ${icons.arrow}</button>` : ''}</div>
        <div class="brain-block" style="margin-top:12px"><h4>Artifacts</h4><div class="artifact-list"><button class="artifact-row" data-action="preview-project-md"><span>PROJECT.md</span><span>View</span></button><button class="artifact-row" data-action="preview-agents-md"><span>AGENTS.md</span><span>View</span></button>${tasks.slice(-3).reverse().map((task) => `<button class="artifact-row" data-action="preview-task" data-task-id="${escapeHtml(task.id)}"><span>${escapeHtml(task.id)}.md</span><span>View</span></button>`).join('')}</div></div>
      </aside>
      <section class="conversation-area">
        <div class="conversation-scroll" id="conversation-scroll"><div class="thread">
          ${messages.length ? messages.map(renderMessage).join('') : welcomeMessage()}
          ${pending ? `<div class="message assistant" id="pending-message"><div class="message-role">Say2Build</div><div class="message-bubble"><span class="loading-dots"><i></i><i></i><i></i></span></div></div>` : ''}
        </div></div>
        <div class="composer-shell"><div class="composer"><label class="sr-only" for="chat-input">Tell Say2Build your next thought</label><textarea id="chat-input" placeholder="Tell me the next thought, change, or doubt. It can be messy."></textarea><div class="composer-bottom"><span class="composer-hint">Enter to send · Shift+Enter for a new line</span><button class="btn btn-primary btn-small" data-action="send-message" ${pending ? 'disabled' : ''}>Send ${icons.arrow}</button></div></div></div>
      </section>
    </main>
  </div>`;
}

function welcomeMessage() {
  return `<div class="message assistant"><div class="message-role">Say2Build</div><div class="message-bubble">I’ve created a Project Brain from your starting idea. Keep talking naturally — I’ll only persist the parts that should still matter later, and I’ll call out a real conflict instead of quietly stacking contradictory decisions.</div></div>`;
}

function renderMessage(message) {
  if (message.type === 'choice') return renderChoiceCard(message);
  if (message.type === 'update') return renderUpdateCard(message);
  if (message.type === 'conflict') return renderConflictCard(message);
  if (message.type === 'task') return renderTaskCard(message.task);
  const role = message.role === 'user' ? 'user' : 'assistant';
  return `<div class="message ${role}"><div class="message-role">${role === 'user' ? 'You' : `Say2Build${message.mode === 'demo' ? '<span class="demo-badge">demo brain</span>' : ''}`}</div><div class="message-bubble">${nl2br(message.content)}</div></div>`;
}

function renderChoiceCard(message) {
  const choice = message.choice;
  return `<div class="interaction-card"><div class="card-head"><div class="card-eyebrow">One choice that changes the shape</div><div class="card-title">${escapeHtml(choice.question)}</div>${choice.whyItMatters ? `<div class="card-copy">${escapeHtml(choice.whyItMatters)}</div>` : ''}</div><div class="card-body"><div class="choice-options">${choice.options.map((option) => `<button class="choice-option ${option.id === choice.recommendedOptionId ? 'recommended' : ''}" data-action="select-choice" data-choice-id="${escapeHtml(message.id)}" data-option-id="${escapeHtml(option.id)}"><div class="option-row"><span class="option-label">${escapeHtml(option.label)}</span>${option.id === choice.recommendedOptionId ? '<span class="rec-tag">Recommended</span>' : ''}</div>${option.consequence ? `<div class="option-consequence">${escapeHtml(option.consequence)}</div>` : ''}</button>`).join('')}</div></div><div class="card-actions"><button class="btn btn-blue btn-small" data-action="use-recommendation" data-choice-id="${escapeHtml(message.id)}">Use recommendation</button><button class="btn btn-ghost btn-small" data-action="focus-chat">Something else</button></div></div>`;
}

function renderUpdateCard(message) {
  return `<div class="interaction-card update-card"><div class="card-head"><div class="card-eyebrow">✓ Project updated</div><div class="card-copy">Only durable changes were added to the Project Brain.</div></div><div class="card-body"><ul class="change-list">${message.changes.slice(0, 5).map((change) => `<li><span class="change-symbol">+</span><span><strong>${escapeHtml(change.target.replaceAll('_',' '))}</strong> · ${escapeHtml(change.statement)}</span></li>`).join('')}</ul></div><div class="card-actions"><button class="btn btn-ghost btn-small" data-action="undo">Undo last update</button></div></div>`;
}

function renderConflictCard(message) {
  const c = message.conflict;
  return `<div class="interaction-card conflict-card"><div class="card-head"><div class="card-eyebrow">This changes an earlier decision</div><div class="card-title">${escapeHtml(c.summary)}</div></div><div class="card-body"><div class="conflict-pair"><div class="conflict-side"><small>Earlier</small><p>${escapeHtml(c.priorStatement)}</p></div><div class="conflict-side"><small>New direction</small><p>${escapeHtml(c.newDirection)}</p></div></div><div class="card-copy" style="margin-top:10px"><strong>Recommended:</strong> ${escapeHtml(c.recommendedResolution)}</div></div></div>`;
}

function renderTaskCard(task) {
  return `<div class="interaction-card task-card"><div class="card-head"><div class="card-eyebrow">Ready for Codex / Claude Code</div><div class="card-title">${escapeHtml(task.title)}</div><div class="card-copy">${escapeHtml(task.objective)}</div></div><div class="card-body"><div class="task-scope"><div class="task-scope-box"><h5>Will do</h5><ul>${task.inScope.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>Implement the objective as the smallest useful slice.</li>'}</ul></div><div class="task-scope-box"><h5>Won’t touch</h5><ul>${task.outOfScope.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No unrelated scope expansion.</li>'}</ul></div></div></div><div class="card-actions"><button class="btn btn-blue btn-small" data-action="copy-task" data-task-id="${escapeHtml(task.id)}">${icons.copy} Copy for Codex</button><button class="btn btn-small" data-action="download-task" data-task-id="${escapeHtml(task.id)}">${icons.download} Download .md</button><button class="btn btn-ghost btn-small" data-action="preview-task" data-task-id="${escapeHtml(task.id)}">View full task</button></div></div>`;
}

function persist() {
  if (!current) return;
  current = saveStoredProject(current);
}

async function createProject() {
  const input = document.querySelector('#idea-input');
  const idea = input?.value.trim();
  if (!idea) { toast('Start with one rough sentence.'); input?.focus(); return; }
  const state = createEmptyProject({ idea });
  current = { state, conversations: [{ id: `msg-${Date.now()}`, role: 'user', content: idea, createdAt: new Date().toISOString() }], taskSpecs: [], snapshots: [], ui: {} };
  persist();
  setRoute(state.projectId);
  await processTurn(idea, { initial: true });
}

async function processTurn(userMessage, { initial = false } = {}) {
  if (!current || pending) return;
  if (!initial) current.conversations.push({ id: `msg-${Date.now()}`, role: 'user', content: userMessage, createdAt: new Date().toISOString() });
  pending = true;
  persist();
  render();
  scrollBottom();

  let result;
  try {
    const response = await fetch('./api/brain', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: current.state, recentMessages: current.conversations.slice(-8), userMessage }),
    });
    if (!response.ok) throw new Error('API unavailable');
    const payload = await response.json();
    result = payload.result;
  } catch {
    result = demoBrainTurn(current.state, userMessage, current.conversations.slice(-8));
  }

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

  current.conversations.push({ id: `msg-${Date.now()}-a`, role: 'assistant', content: result.assistantReply || result.understanding || 'Project updated.', createdAt: new Date().toISOString(), mode: result.mode });
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
  if (!option) return;
  current.conversations = current.conversations.filter((item) => item.id !== choiceMessageId);
  current.conversations.push({ id: `msg-${Date.now()}`, role: 'user', content: option.label, createdAt: new Date().toISOString() });
  const result = demoChoiceResult(current.state, message.choice, option);
  applyTurnResult(result);
  persist();
  render();
  scrollBottom();
}

async function generateTask() {
  if (!current) return;
  let task;
  try {
    const response = await fetch('./api/task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: current.state }) });
    if (!response.ok) throw new Error('Task API unavailable');
    const payload = await response.json();
    task = payload.task;
  } catch {
    task = createTaskSpec(current.state);
  }
  if (!task) return;
  const nextTaskNumber = current.taskSpecs.length + 1;
  task.id = `task-${String(nextTaskNumber).padStart(3, '0')}`;
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

function undo() {
  if (!current?.snapshots?.length) { toast('Nothing to undo yet.'); return; }
  current.state = current.snapshots.pop();
  current.conversations.push({ id: `msg-${Date.now()}`, role: 'assistant', content: 'I rolled back the most recent Project Brain update. The conversation is still here, but that change is no longer part of current truth.', createdAt: new Date().toISOString() });
  persist();
  render();
  toast('Last Project Brain update undone.');
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
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h3>${escapeHtml(title)}</h3>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><button class="btn btn-ghost icon-btn" data-modal-close aria-label="Close">${icons.close}</button></div><div class="modal-body">${body}${actions}</div></div>`;
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
  const encoded = encodeURIComponent(content);
  const modal = showModal({ title, subtitle: 'Derived from current Project Brain — not from the raw chat history.', body: `<pre class="preview">${escapeHtml(content)}</pre><div class="modal-actions"><button class="btn" data-preview-copy>${icons.copy} Copy</button><button class="btn btn-primary" data-preview-download>${icons.download} Download</button></div>` });
  modal.querySelector('[data-preview-copy]').addEventListener('click', async () => { await navigator.clipboard.writeText(content); toast('Copied.'); });
  modal.querySelector('[data-preview-download]').addEventListener('click', () => downloadText(title, content, 'text/markdown;charset=utf-8'));
}

function exportMenu() {
  if (!current) return;
  const projectMd = renderProjectMd(current.state);
  const agentsMd = renderAgentsMd(current.state);
  const payload = createProjectExport(current.state, current.conversations, current.taskSpecs);
  const base = safeFileName(current.state.identity.title || 'say2build-project');
  const modal = showModal({ title: 'Export project', subtitle: 'JSON restores the project. Markdown is for you and your coding agent.', body: `<div class="artifact-list"><button class="artifact-row" data-export="json"><span>say2build.project.json</span><span>Restore later</span></button><button class="artifact-row" data-export="project"><span>PROJECT.md</span><span>Current truth</span></button><button class="artifact-row" data-export="agents"><span>AGENTS.md</span><span>Stable agent context</span></button>${current.taskSpecs.slice(-3).map((task) => `<button class="artifact-row" data-export-task="${escapeHtml(task.id)}"><span>${escapeHtml(task.id)}.md</span><span>Build task</span></button>`).join('')}</div>` });
  modal.querySelector('[data-export="json"]').addEventListener('click', () => downloadText(`${base}.say2build.project.json`, JSON.stringify(payload, null, 2), 'application/json'));
  modal.querySelector('[data-export="project"]').addEventListener('click', () => downloadText('PROJECT.md', projectMd, 'text/markdown;charset=utf-8'));
  modal.querySelector('[data-export="agents"]').addEventListener('click', () => downloadText('AGENTS.md', agentsMd, 'text/markdown;charset=utf-8'));
  modal.querySelectorAll('[data-export-task]').forEach((el) => el.addEventListener('click', () => {
    const task = current.taskSpecs.find((item) => item.id === el.dataset.exportTask);
    if (task) downloadText(`${task.id}.md`, renderTaskMd(task), 'text/markdown;charset=utf-8');
  }));
}

function openImport() {
  const modal = showModal({ title: 'Bring an existing project', subtitle: 'Paste a short README / project recap, or import a previous Say2Build project file.', body: `<label class="panel-label" for="existing-project-text">Project recap or Markdown</label><textarea id="existing-project-text" placeholder="Paste the current project goal, README, AGENTS.md, or simply explain what you have already built and what feels messy…"></textarea><div class="modal-actions"><label class="btn">${icons.upload} Import .json<input id="project-file" type="file" accept="application/json,.json" hidden/></label><button class="btn btn-primary" data-shape-existing>Shape this project ${icons.arrow}</button></div>` });
  modal.querySelector('#project-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const stored = importStoredProject(payload);
      current = stored;
      modal.remove();
      setRoute(stored.state.projectId);
      toast('Project restored.');
    } catch (error) { toast(error.message || 'Could not import that file.'); }
  });
  modal.querySelector('[data-shape-existing]').addEventListener('click', async () => {
    const text = modal.querySelector('#existing-project-text').value.trim();
    if (!text) { toast('Paste a short project recap first.'); return; }
    const state = createEmptyProject({ idea: text, title: 'Imported project' });
    current = { state, conversations: [{ id:`msg-${Date.now()}`, role:'user', content:`Existing project recap:\n${text}`, createdAt:new Date().toISOString() }], taskSpecs: [], snapshots: [], ui: {} };
    persist(); modal.remove(); setRoute(state.projectId); await processTurn(text, { initial: true });
  });
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'home') { current = null; setRoute(''); }
  if (action === 'focus-idea') document.querySelector('#idea-input')?.focus();
  if (action === 'create-project') createProject();
  if (action === 'open-import') openImport();
  if (action === 'open-project') { const stored = loadStoredProject(target.dataset.projectId); if (stored) { current = stored; setRoute(stored.state.projectId); } }
  if (action === 'new-project') { current = null; setRoute(''); setTimeout(() => document.querySelector('#idea-input')?.focus(), 30); }
  if (action === 'toggle-brain') { mobileBrainOpen = !mobileBrainOpen; document.querySelector('#brain-panel')?.classList.toggle('open', mobileBrainOpen); }
  if (action === 'send-message') sendComposer();
  if (action === 'focus-chat') document.querySelector('#chat-input')?.focus();
  if (action === 'select-choice') chooseOption(target.dataset.choiceId, target.dataset.optionId);
  if (action === 'use-recommendation') {
    const msg = current?.conversations.find((item) => item.id === target.dataset.choiceId);
    if (msg?.choice) chooseOption(msg.id, msg.choice.recommendedOptionId);
  }
  if (action === 'undo') undo();
  if (action === 'generate-task') generateTask();
  if (action === 'preview-project-md') previewArtifact('PROJECT.md');
  if (action === 'preview-agents-md') previewArtifact('AGENTS.md');
  if (action === 'preview-task') previewArtifact('task', target.dataset.taskId);
  if (action === 'export-menu') exportMenu();
  if (action === 'copy-task') {
    const task = current?.taskSpecs.find((item) => item.id === target.dataset.taskId);
    if (task) navigator.clipboard.writeText(renderTaskMd(task)).then(() => toast('Task copied for Codex.'));
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
