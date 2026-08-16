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
  out += section("What we're building", state.identity.oneLiner);
  out += section("Who it's for", state.identity.targetUsers.length ? bullets(state.identity.targetUsers, (x) => x) : 'Still being clarified.');
  out += section('Problem', state.identity.problem);
  out += section('Current goal', state.intent.currentGoal);
  out += section('MVP scope', bullets(state.scope.inScope));
  out += section('Not now', bullets([...state.scope.laterIdeas, ...state.scope.nonGoals]));
  out += section('Key decisions', bullets(activeDecisions(state)));
  out += section('Stable constraints', bullets(activeConstraints(state)));
  out += section('Open questions', state.openQuestions.length ? bullets(state.openQuestions, (x) => x.question) : '');
  out += section('Current stage', `${state.stage.current}${state.stage.reason ? ` — ${state.stage.reason}` : ''}`);
  out += section('Next action', `**${state.execution.nextAction.title}**\n\n${state.execution.nextAction.reason}`);
  out += `\n---\n\n_Generated from Say2Build Project Brain. Current truth, not chat history._\n`;
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function renderAgentsMd(state) {
  const constraints = activeConstraints(state).filter((item) => ['stable', 'confirmed'].includes(item.status));
  const decisions = activeDecisions(state).filter((item) => item.impact !== 'low').slice(-6);
  let out = '# AGENTS.md\n';
  out += section('Project intent', `${state.identity.oneLiner}\n\nCurrent goal: ${state.intent.currentGoal}`);
  if (decisions.length) out += section('Product guardrails', bullets(decisions));
  if (constraints.length) out += section('Stable rules', bullets(constraints));
  out += section('Verification expectations', '- Preserve current confirmed product decisions unless the task explicitly changes them.\n- Report what changed, files changed, verification performed, and anything unresolved.');
  out += '\n> Keep this file concise. Task-specific instructions belong in task files.\n';
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
    whyNow: overrides.whyNow || state.execution.nextAction.reason || 'It is the current concrete next action.',
    context: overrides.context || [state.identity.oneLiner, `Current goal: ${state.intent.currentGoal}`, ...relevantDecisions].filter(Boolean),
    inScope: overrides.inScope || state.scope.inScope.slice(0, 6).map((item) => item.statement),
    outOfScope: overrides.outOfScope || [...state.scope.nonGoals, ...state.scope.laterIdeas].slice(0, 6).map((item) => item.statement),
    preserve: overrides.preserve || constraints,
    implementationNotes: overrides.implementationNotes || ['Choose the lightest implementation that satisfies the acceptance criteria.', 'Do not introduce unrelated features or infrastructure.'],
    acceptanceCriteria: overrides.acceptanceCriteria || [
      `The requested outcome “${title}” is visibly complete and usable.`,
      'Existing confirmed product decisions are preserved.',
      'The implementation has a clear verification step and no obvious broken state.',
    ],
    relevantArtifacts: overrides.relevantArtifacts || ['PROJECT.md', 'AGENTS.md (if present)'],
    completionReport: ['What changed', 'Files changed', 'How you verified it', 'Anything unresolved'],
    createdAt: nowIso(),
  };
}

export function renderTaskMd(task) {
  const list = (items) => items?.length ? items.map((item) => `- ${item}`).join('\n') : '- None';
  return `# Task: ${task.title}\n\n## Objective\n\n${task.objective}\n\n## Why now\n\n${task.whyNow}\n\n## Context\n\n${list(task.context)}\n\n## In scope\n\n${list(task.inScope)}\n\n## Out of scope\n\n${list(task.outOfScope)}\n\n## Preserve\n\n${list(task.preserve)}\n\n## Implementation notes\n\n${list(task.implementationNotes)}\n\n## Acceptance criteria\n\n${list(task.acceptanceCriteria)}\n\n## Relevant project context\n\n${list(task.relevantArtifacts)}\n\n## When finished\n\n${task.completionReport.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`;
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
