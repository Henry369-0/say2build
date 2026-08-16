export const PROJECT_STAGES = [
  'exploring',
  'shaping',
  'ready_to_build',
  'building',
  'usable_mvp',
  'validating',
  'releasing',
  'iterating',
];

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createEmptyProject({ idea = '', title = '' } = {}) {
  const time = nowIso();
  return {
    schemaVersion: '1.0',
    projectId: uid('project'),
    identity: {
      title: title || inferTitle(idea),
      oneLiner: idea?.trim() || 'A project that is still taking shape.',
      problem: '',
      targetUsers: [],
    },
    intent: {
      currentGoal: 'Turn the idea into a clear, buildable first version.',
      coreWorkflow: [],
      successLooksLike: '',
    },
    scope: {
      inScope: [],
      laterIdeas: [],
      nonGoals: [],
    },
    decisions: [],
    constraints: [],
    openQuestions: [],
    stage: {
      current: 'exploring',
      reason: 'The project is still being shaped.',
    },
    execution: {
      currentFocus: 'Clarify the smallest useful version.',
      nextAction: {
        title: 'Shape the first useful version',
        reason: 'A vague idea needs a small, concrete starting point before coding.',
        type: 'clarify',
        canGenerateTask: false,
      },
      activeTaskId: '',
      taskIndex: [],
    },
    artifacts: {
      projectMdUpdatedAt: '',
      agentsMdUpdatedAt: '',
      taskCount: 0,
    },
    history: {
      importantRevisions: [],
    },
    meta: {
      createdAt: time,
      updatedAt: time,
    },
  };
}

export function inferTitle(idea = '') {
  const cleaned = String(idea).replace(/[\n\r]/g, ' ').trim();
  if (!cleaned) return 'Untitled project';
  const stripped = cleaned
    .replace(/^(i want to|i'd like to|help me|build|make|create|我想做一个|我想做|帮我做一个|帮我做)/i, '')
    .trim();
  const candidate = stripped || cleaned;
  return candidate.length > 34 ? `${candidate.slice(0, 34).trim()}…` : candidate;
}

function normalizeStatement(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function activeDecision(state, id) {
  return state.decisions.find((item) => item.id === id && item.status === 'confirmed');
}

function activeConstraint(state, id) {
  return state.constraints.find((item) => item.id === id && item.status !== 'superseded');
}

function scopeBucket(state, target) {
  if (target === 'in_scope') return state.scope.inScope;
  if (target === 'later_idea') return state.scope.laterIdeas;
  if (target === 'non_goal') return state.scope.nonGoals;
  return null;
}

function upsertTextList(list, statement, meta = {}) {
  const normalized = normalizeStatement(statement);
  if (!normalized) return list;
  const existing = list.find((item) => normalizeStatement(item.statement).toLowerCase() === normalized.toLowerCase());
  if (existing) return list.map((item) => item.id === existing.id ? { ...item, ...meta, statement: normalized } : item);
  return [...list, { id: uid('scope'), statement: normalized, source: meta.source || 'explicit', createdAt: nowIso(), ...meta }];
}

function removeFromAllScope(state, statement, entityId) {
  const normalized = normalizeStatement(statement).toLowerCase();
  const matches = (item) => (entityId && item.id === entityId) || normalizeStatement(item.statement).toLowerCase() === normalized;
  state.scope.inScope = state.scope.inScope.filter((item) => !matches(item));
  state.scope.laterIdeas = state.scope.laterIdeas.filter((item) => !matches(item));
  state.scope.nonGoals = state.scope.nonGoals.filter((item) => !matches(item));
}

export function validateChange(state, change) {
  const allowedActions = new Set(['add', 'update', 'confirm', 'move_to_later', 'supersede', 'resolve']);
  const allowedTargets = new Set([
    'one_liner', 'problem', 'target_user', 'current_goal', 'core_workflow', 'in_scope',
    'later_idea', 'non_goal', 'decision', 'constraint', 'open_question', 'stage', 'next_action',
  ]);
  if (!change || !allowedActions.has(change.action) || !allowedTargets.has(change.target)) {
    return { ok: false, reason: 'Unsupported change operation.' };
  }
  if (!normalizeStatement(change.statement)) return { ok: false, reason: 'Empty statement.' };

  if (change.action === 'supersede') {
    if (!change.supersedesId) return { ok: false, reason: 'Supersede requires supersedesId.' };
    const target = activeDecision(state, change.supersedesId) || activeConstraint(state, change.supersedesId);
    if (!target) return { ok: false, reason: 'Supersede target is not active.' };
    if (change.source === 'ai_inferred' && change.impact === 'high') {
      return { ok: false, reason: 'High-impact AI inference cannot silently supersede confirmed truth.' };
    }
  }

  if (change.target === 'stage' && !PROJECT_STAGES.includes(change.statement)) {
    return { ok: false, reason: 'Unknown project stage.' };
  }
  return { ok: true };
}

export function applyBrainOperations(inputState, changes = []) {
  const state = structuredClone(inputState);
  const applied = [];
  const rejected = [];

  for (const change of changes) {
    const validation = validateChange(state, change);
    if (!validation.ok) {
      rejected.push({ change, reason: validation.reason });
      continue;
    }
    const statement = normalizeStatement(change.statement);
    const baseMeta = { source: change.source || 'explicit' };

    switch (change.target) {
      case 'one_liner':
        state.identity.oneLiner = statement;
        break;
      case 'problem':
        state.identity.problem = statement;
        break;
      case 'target_user':
        if (!state.identity.targetUsers.some((item) => item.toLowerCase() === statement.toLowerCase())) {
          state.identity.targetUsers.push(statement);
        }
        break;
      case 'current_goal':
        state.intent.currentGoal = statement;
        break;
      case 'core_workflow':
        if (!state.intent.coreWorkflow.some((item) => item.toLowerCase() === statement.toLowerCase())) {
          state.intent.coreWorkflow.push(statement);
        }
        break;
      case 'in_scope':
      case 'later_idea':
      case 'non_goal': {
        removeFromAllScope(state, statement, change.entityId);
        const bucket = scopeBucket(state, change.target);
        state.scope[change.target === 'in_scope' ? 'inScope' : change.target === 'later_idea' ? 'laterIdeas' : 'nonGoals'] = upsertTextList(bucket, statement, baseMeta);
        break;
      }
      case 'decision': {
        if (change.action === 'supersede') {
          const old = activeDecision(state, change.supersedesId);
          if (old) {
            const newItem = {
              id: uid('decision'), statement, rationale: change.reason || '', source: change.source || 'explicit',
              status: 'confirmed', impact: change.impact || 'medium', createdAt: nowIso(), supersededBy: '',
            };
            state.decisions = state.decisions.map((item) => item.id === old.id ? { ...item, status: 'superseded', supersededBy: newItem.id } : item);
            state.decisions.push(newItem);
            state.history.importantRevisions.push({
              id: uid('revision'), at: nowIso(), from: old.statement, to: statement, reason: change.reason || 'Direction changed.',
            });
          }
        } else {
          const existing = state.decisions.find((item) => item.status === 'confirmed' && item.statement.toLowerCase() === statement.toLowerCase());
          if (!existing) state.decisions.push({
            id: uid('decision'), statement, rationale: change.reason || '', source: change.source || 'explicit',
            status: 'confirmed', impact: change.impact || 'medium', createdAt: nowIso(), supersededBy: '',
          });
        }
        break;
      }
      case 'constraint': {
        if (change.action === 'supersede') {
          const old = activeConstraint(state, change.supersedesId);
          if (old) state.constraints = state.constraints.map((item) => item.id === old.id ? { ...item, status: 'superseded' } : item);
        }
        const existing = state.constraints.find((item) => item.status !== 'superseded' && item.statement.toLowerCase() === statement.toLowerCase());
        if (!existing) state.constraints.push({
          id: uid('constraint'), statement, reason: change.reason || '', source: change.source || 'explicit',
          status: change.impact === 'high' ? 'stable' : 'confirmed',
          appliesTo: ['product'], createdAt: nowIso(),
        });
        break;
      }
      case 'open_question': {
        if (change.action === 'resolve') {
          state.openQuestions = state.openQuestions.filter((item) => item.id !== change.entityId && item.question.toLowerCase() !== statement.toLowerCase());
        } else if (!state.openQuestions.some((item) => item.question.toLowerCase() === statement.toLowerCase())) {
          state.openQuestions.push({ id: uid('question'), question: statement, impact: change.impact || 'medium', source: change.source || 'derived', createdAt: nowIso() });
        }
        break;
      }
      case 'stage':
        state.stage.current = statement;
        state.stage.reason = change.reason || state.stage.reason;
        break;
      case 'next_action':
        state.execution.nextAction = {
          title: statement,
          reason: change.reason || 'This is the most useful next step.',
          type: change.nextActionType || inferNextActionType(state.stage.current),
          canGenerateTask: change.canGenerateTask ?? ['ready_to_build', 'building', 'iterating'].includes(state.stage.current),
        };
        break;
      default:
        break;
    }
    applied.push(change);
  }

  state.meta.updatedAt = nowIso();
  return { state, applied, rejected };
}

export function inferNextActionType(stage) {
  if (['exploring', 'shaping'].includes(stage)) return 'clarify';
  if (['ready_to_build', 'building', 'iterating'].includes(stage)) return 'build';
  if (stage === 'usable_mvp') return 'validate';
  if (stage === 'validating') return 'test';
  if (stage === 'releasing') return 'release';
  return 'build';
}

export function activeDecisions(state) {
  return state.decisions.filter((item) => item.status === 'confirmed');
}

export function activeConstraints(state) {
  return state.constraints.filter((item) => item.status !== 'superseded');
}

export function deriveConsensus(state) {
  return {
    what: state.identity.oneLiner,
    forWhom: state.identity.targetUsers.length ? state.identity.targetUsers.join(' · ') : 'Still being clarified',
    focus: state.execution.currentFocus || state.intent.currentGoal,
    confirmed: activeDecisions(state).slice(-5),
    parking: state.scope.laterIdeas.slice(-2),
    next: state.execution.nextAction,
  };
}

export function brainCompleteness(state) {
  const checks = [
    Boolean(state.identity.oneLiner),
    state.identity.targetUsers.length > 0,
    Boolean(state.intent.currentGoal),
    state.scope.inScope.length > 0 || activeDecisions(state).length > 0,
    Boolean(state.execution.nextAction?.title),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
