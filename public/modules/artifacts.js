import { activeConstraints, activeDecisions, uid, nowIso } from './brain.js';

function bullets(items, selector = (x) => x.statement) {
  return items?.length ? items.map((item) => `- ${selector(item)}`).join('\n') : '';
}

function section(title, content) {
  if (!content || !String(content).trim()) return '';
  return `\n## ${title}\n\n${String(content).trim()}\n`;
}

export function renderProjectMd(state) {
  const title = state.identity.title || 'Untitled project';
  let out = `# ${title}\n`;
  out += section('我们在做什么', state.identity.oneLiner);
  out += section('给谁用', state.identity.targetUsers.length ? bullets(state.identity.targetUsers, (x) => x) : '还在明确中。');
  out += section('要解决的问题', state.identity.problem);
  out += section('当前目标', state.intent.currentGoal);
  out += section('MVP 范围', bullets(state.scope.inScope));
  out += section('暂不做', bullets([...state.scope.laterIdeas, ...state.scope.nonGoals]));
  out += section('关键决策', bullets(activeDecisions(state)));
  out += section('稳定约束', bullets(activeConstraints(state)));
  out += section('待定问题', state.openQuestions.length ? bullets(state.openQuestions, (x) => x.question) : '');
  out += section('当前阶段', `${state.stage.current}${state.stage.reason ? ` — ${state.stage.reason}` : ''}`);
  out += section('下一步', `**${state.execution.nextAction.title}**\n\n${state.execution.nextAction.reason}`);
  out += `\n---\n\n_由 Say2Build Project Brain 生成。这是当前真实状态，不是聊天记录。_\n`;
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function renderAgentsMd(state) {
  const constraints = activeConstraints(state).filter((item) => ['stable', 'confirmed'].includes(item.status));
  const decisions = activeDecisions(state).filter((item) => item.impact !== 'low').slice(-6);
  let out = '# AGENTS.md\n';
  out += section('项目意图', `${state.identity.oneLiner}\n\n当前目标：${state.intent.currentGoal}`);
  if (decisions.length) out += section('产品护栏', bullets(decisions));
  if (constraints.length) out += section('稳定规则', bullets(constraints));
  out += section('验证要求', '- 除非任务明确要求，否则保留已确认的产品决策。\n- 汇报改了什么、改了哪些文件、怎么验证的、还有什么没解决。');
  out += '\n> 保持这份文件精简。任务相关的说明放在任务文件里。\n';
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function createTaskSpec(state, overrides = {}) {
  const index = (state.execution.taskIndex?.length || 0) + 1;
  const padded = String(index).padStart(3, '0');
  const title = overrides.title || state.execution.nextAction.title || 'Next build task';
  const relevantDecisions = activeDecisions(state).slice(-5).map((item) => item.statement);
  const constraints = activeConstraints(state).slice(-5).map((item) => item.statement);
  return {
    id: overrides.id || `task-${padded}`,
    title,
    objective: overrides.objective || title,
    whyNow: overrides.whyNow || state.execution.nextAction.reason || '这是当前具体的下一步。',
    context: overrides.context || [state.identity.oneLiner, `当前目标：${state.intent.currentGoal}`, ...relevantDecisions].filter(Boolean),
    inScope: overrides.inScope || state.scope.inScope.slice(0, 6).map((item) => item.statement),
    outOfScope: overrides.outOfScope || [...state.scope.nonGoals, ...state.scope.laterIdeas].slice(0, 6).map((item) => item.statement),
    preserve: overrides.preserve || constraints,
    implementationNotes: overrides.implementationNotes || ['选择能满足验收标准的最轻实现。', '不要引入无关的功能或基础设施。'],
    acceptanceCriteria: overrides.acceptanceCriteria || [
      `目标「${title}」已经可见地完成并且可用。`,
      '已确认的产品决策保持不变。',
      '实现有明确的验证步骤，没有明显的坏状态。',
    ],
    relevantArtifacts: overrides.relevantArtifacts || ['PROJECT.md', 'AGENTS.md（如果有）'],
    completionReport: ['改了什么', '改了哪些文件', '怎么验证的', '还有什么没解决'],
    status: 'ready',
    createdAt: nowIso(),
  };
}

export function renderTaskMd(task) {
  const list = (items) => items?.length ? items.map((item) => `- ${item}`).join('\n') : '- 无';
  return `# 任务：${task.title}\n\n## 目标\n\n${task.objective}\n\n## 为什么现在做\n\n${task.whyNow}\n\n## 背景\n\n${list(task.context)}\n\n## 范围内\n\n${list(task.inScope)}\n\n## 范围外\n\n${list(task.outOfScope)}\n\n## 需要保留\n\n${list(task.preserve)}\n\n## 实现说明\n\n${list(task.implementationNotes)}\n\n## 验收标准\n\n${list(task.acceptanceCriteria)}\n\n## 相关项目材料\n\n${list(task.relevantArtifacts)}\n\n## 完成后\n\n${task.completionReport.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`;
}

export function createProjectExport(project, conversations = [], taskSpecs = []) {
  return {
    format: 'say2build.project',
    exportVersion: '1.0',
    exportedAt: nowIso(),
    state: project,
    conversations,
    taskSpecs,
  };
}

export function safeFileName(name = 'say2build-project') {
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'say2build-project';
}

export function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
