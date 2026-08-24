// AI 接口契约的唯一来源：结构化输出的 JSON Schema + 系统提示词 + 校验器。
// 浏览器（DeepSeek 直连）与服务端（OpenAI Responses API）共用同一份契约，
// 保证无论哪条路径，返回结果都能被确定性 reducer 接受。

export const BRAIN_STAGES = ['exploring','shaping','ready_to_build','building','usable_mvp','validating','releasing','iterating'];
export const CHANGE_ACTIONS = ['add','update','confirm','move_to_later','supersede','resolve'];
export const CHANGE_TARGETS = ['one_liner','problem','target_user','current_goal','current_focus','core_workflow','in_scope','later_idea','non_goal','decision','constraint','open_question','stage','next_action'];
export const SOURCES = ['explicit','ai_inferred','derived'];
export const IMPACTS = ['low','medium','high'];
export const NEXT_TYPES = ['clarify','decide','build','test','validate','release'];

export const brainTurnSchema = {
  type: 'object', additionalProperties: false,
  required: ['assistantReply','turnType','understanding','changes','conflicts','choice','nextAction','stageSignal'],
  properties: {
    assistantReply: { type: 'string' },
    turnType: { type: 'string', enum: ['explore','clarify','decide','revise','request_task','question','feedback'] },
    understanding: { type: 'string' },
    mode: { anyOf: [{ type: 'string', enum: ['demo'] }, { type: 'null' }] },
    changes: {
      type: 'array', maxItems: 10,
      items: {
        type: 'object', additionalProperties: false,
        required: ['action', 'target', 'statement', 'reason', 'source', 'impact'],
        properties: {
          action: { type: 'string', enum: CHANGE_ACTIONS },
          target: { type: 'string', enum: CHANGE_TARGETS },
          statement: { type: 'string' },
          reason: { type: 'string' },
          source: { type: 'string', enum: SOURCES },
          impact: { type: 'string', enum: IMPACTS },
          entityId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          supersedesId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          nextActionType: { anyOf: [{ type: 'string', enum: NEXT_TYPES }, { type: 'null' }] },
          canGenerateTask: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
        },
      },
    },
    conflicts: {
      type: 'array', maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id','summary','priorEntityId','priorStatement','newDirection','impact','recommendedResolution'],
        properties: {
          id: { type: 'string' }, summary: { type: 'string' }, priorEntityId: { type: 'string' },
          priorStatement: { type: 'string' }, newDirection: { type: 'string' },
          impact: { type: 'string', enum: ['medium','high'] }, recommendedResolution: { type: 'string' },
        },
      },
    },
    choice: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object', additionalProperties: false,
          required: ['question','whyItMatters','options','recommendedOptionId','allowCustomAnswer'],
          properties: {
            question: { type: 'string' }, whyItMatters: { type: 'string' },
            options: {
              type: 'array', minItems: 2, maxItems: 4,
              items: {
                type: 'object', additionalProperties: false,
                required: ['id','label','consequence'],
                properties: { id: { type: 'string' }, label: { type: 'string' }, consequence: { type: 'string' } },
              },
            },
            recommendedOptionId: { type: 'string' }, allowCustomAnswer: { type: 'boolean', const: true },
          },
        },
      ],
    },
    nextAction: {
      type: 'object', additionalProperties: false,
      required: ['title','reason','type','canGenerateTask'],
      properties: {
        title: { type: 'string' }, reason: { type: 'string' },
        type: { type: 'string', enum: NEXT_TYPES }, canGenerateTask: { type: 'boolean' },
      },
    },
    stageSignal: {
      type: 'object', additionalProperties: false,
      required: ['suggestedStage','reason'],
      properties: {
        suggestedStage: { anyOf: [{ type: 'string', enum: BRAIN_STAGES }, { type: 'null' }] },
        reason: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
    },
  },
};

export const taskSchema = {
  type: 'object', additionalProperties: false,
  required: ['id','title','objective','whyNow','context','inScope','outOfScope','preserve','implementationNotes','acceptanceCriteria','relevantArtifacts','completionReport'],
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, objective: { type: 'string' }, whyNow: { type: 'string' },
    context: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    inScope: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    outOfScope: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    preserve: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    implementationNotes: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    acceptanceCriteria: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 12 },
    relevantArtifacts: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    completionReport: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    status: { anyOf: [{ type: 'string', enum: ['ready', 'done'] }, { type: 'null' }] },
    createdAt: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
};

export const BRAIN_SYSTEM = `You are the Project Brain inside Say2Build, a lightweight planning layer for beginner AI builders who use coding agents.

Your job is not to write code. Your job is to keep the project's current truth clear while the user thinks naturally and changes their mind.

Behavior:
- Reply in the same language as the user.
- Treat vague ideas as valid input. Do not demand a PRD or technical vocabulary.
- Ask less, think more. Make low-risk reversible assumptions yourself.
- If an ambiguity truly changes product shape, offer 2-4 understandable choices and recommend one.
- When the user says “you decide”, actually decide.
- Do not persist every sentence. Persist only information likely to matter later.
- A casual idea is not confirmed scope. Park speculative features as later ideas.
- Users may change their mind. If a new direction conflicts with an active confirmed decision or stable constraint, surface a conflict instead of silently stacking both.
- Never silently replace a confirmed high-impact decision with an AI inference.
- Distinguish user-explicit facts from AI-inferred and derived information.
- Keep the project light. Do not add accounts, databases, payments, communities, dashboards, or other “professional” features unless the problem needs them.
- Use plain language first. Introduce professional terms parenthetically only when useful.
- Always leave one concrete next action. “Continue refining requirements” is not concrete.
- When the project is clear enough, stop planning and recommend a build task.
- Project stages are guidance, never gates.
- Guide beginners step by step: clarify in this order — target users → problem → core workflow → MVP scope → key decisions → build task. Ask at most one question per turn, and when the user answers a clarification question, persist it as the corresponding fact.

Change protocol:
- Return only incremental proposed changes. Never rewrite the whole Project Brain.
- It is valid to return changes: [] for a conversational turn that should not persist.
- For a supersede operation, use the exact active entity id from the supplied state.
- For next_action changes, set nextActionType and canGenerateTask.
- When the user picks an option from a choice card, treat that option label as an explicit user decision and move the project toward a buildable first version.
- When the current focus shifts, propose a current_focus change so the panel stays accurate.
- If you recommend a choice, the recommendedOptionId must match one of the option ids.
`;

export const TASK_SYSTEM = `You create one focused coding-agent task from a Say2Build Project Brain.
- The task must be understandable in one independent Codex / Claude Code session.
- Use only project facts supplied in the Project Brain. Never invent repo paths, commands, technologies, APIs, or files that are not known.
- Keep scope narrow enough to complete and verify.
- Preserve current confirmed decisions and stable constraints.
- Out of scope should block obvious feature creep.
- Acceptance criteria must be observable.
- Completion report should ask for what changed, files changed, verification, and unresolved items.
- Use the same language as the project content when possible.
- Set id to task-001; the client may renumber it deterministically.
`;

// ---- 小型 JSON Schema 校验器（覆盖本项目用到的子集） -----------------------

export function validateValue(value, schema, path = '$') {
  if (schema.anyOf) {
    const allErrors = [];
    for (const sub of schema.anyOf) {
      const errors = validateValue(value, sub, path);
      if (errors.length === 0) return [];
      allErrors.push(...errors);
    }
    return allErrors;
  }
  if (schema.const !== undefined) return value === schema.const ? [] : [`${path}: 期望常量 ${JSON.stringify(schema.const)}`];
  if (schema.type === 'null') return value === null ? [] : [`${path}: 期望 null`];
  if (value === null) return [`${path}: 不允许 null`];

  const errors = [];
  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) return [`${path}: 期望对象`];
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!schema.properties || !(key in schema.properties)) errors.push(`${path}.${key}: 未定义的属性`);
        }
      }
      for (const key of schema.required || []) {
        if (!(key in value)) errors.push(`${path}.${key}: 缺少必填属性`);
      }
      for (const [key, sub] of Object.entries(schema.properties || {})) {
        if (key in value) errors.push(...validateValue(value[key], sub, `${path}.${key}`));
      }
      return errors;
    }
    case 'array': {
      if (!Array.isArray(value)) return [`${path}: 期望数组`];
      if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: 元素过多`);
      if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: 元素过少`);
      value.forEach((item, index) => errors.push(...validateValue(item, schema.items, `${path}[${index}]`)));
      return errors;
    }
    case 'string': {
      if (typeof value !== 'string') return [`${path}: 期望字符串`];
      if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: 不在枚举 ${schema.enum.join('/')} 内`);
      return errors;
    }
    case 'boolean': return typeof value === 'boolean' ? [] : [`${path}: 期望布尔值`];
    default: return [`${path}: 不支持的 schema 类型 ${schema.type}`];
  }
}

export function validateBrainResult(result) {
  return validateValue(result, brainTurnSchema);
}

export function validateTaskResult(task) {
  return validateValue(task, taskSchema);
}
