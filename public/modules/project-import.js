import { PROJECT_STAGES } from './brain.js';
import { brainTurnSchema, taskSchema, validateValue } from './contracts.js';

const text = { type: 'string' };
const id = { type: 'string', minLength: 1 };
const list = (items) => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const statement = object({ id, statement: text, source: text, createdAt: text }, ['id', 'statement']);
const decision = object({ ...statement.properties, status: { type: 'string', enum: ['confirmed', 'superseded'] }, impact: { type: 'string', enum: ['low', 'medium', 'high'] }, rationale: text }, ['id', 'statement', 'status', 'impact']);
const constraint = object({ ...statement.properties, status: { type: 'string', enum: ['stable', 'confirmed', 'superseded'] } }, ['id', 'statement', 'status']);
const nextAction = brainTurnSchema.properties.nextAction;
const storedTaskSchema = {
  ...taskSchema,
  additionalProperties: true,
  properties: { ...taskSchema.properties, report: text, completedAt: text },
};

const projectStateSchema = object({
  schemaVersion: { type: 'string', const: '1.0' },
  projectId: id,
  identity: object({ title: text, oneLiner: text, problem: text, targetUsers: list(text) }),
  intent: object({ currentGoal: text, coreWorkflow: list(text), successLooksLike: text }),
  scope: object({ inScope: list(statement), laterIdeas: list(statement), nonGoals: list(statement) }),
  decisions: list(decision),
  constraints: list(constraint),
  openQuestions: list(object({ id, question: text, status: text }, ['id', 'question'])),
  stage: object({ current: { type: 'string', enum: PROJECT_STAGES }, reason: text }),
  execution: object({
    currentFocus: text, nextAction, activeTaskId: text,
    taskIndex: list(object({ id, title: text, status: { type: 'string', enum: ['ready', 'done'] }, createdAt: text, completedAt: text }, ['id', 'title', 'status', 'createdAt'])),
  }),
  artifacts: object({ projectMdUpdatedAt: text, agentsMdUpdatedAt: text, taskCount: { type: 'integer', minimum: 0 } }),
  history: object({ importantRevisions: list({ type: 'object' }) }),
  meta: object({ createdAt: text, updatedAt: text }),
});

function validateMessage(message, path) {
  const errors = validateValue(message, object({ id, createdAt: text }), path);
  if (errors.length) return errors;
  if (message.type === 'choice') return validateValue(message.choice, brainTurnSchema.properties.choice.anyOf[1], `${path}.choice`);
  if (message.type === 'conflict') return validateValue(message.conflict, brainTurnSchema.properties.conflicts.items, `${path}.conflict`);
  if (message.type === 'update') return validateValue(message.changes, list(object({ target: text, statement: text })), `${path}.changes`);
  if (message.type === 'task') return validateValue(message.task, storedTaskSchema, `${path}.task`);
  if (message.type !== undefined) return [`${path}: 未知的消息类型`];
  return validateValue(message, object({ role: { type: 'string', enum: ['user', 'assistant'] }, content: text }), path);
}

export function validateProjectImport(payload) {
  const errors = validateValue(payload, object({ state: projectStateSchema }), '$');
  if (errors.length) return errors;
  if (!payload.state.projectId.trim() || ['__proto__', 'constructor', 'prototype'].includes(payload.state.projectId)) {
    errors.push('$.state.projectId: 项目标识无效');
  }
  if (payload.format !== undefined && payload.format !== 'say2build.project') errors.push('$.format: 文件格式不匹配');
  if (payload.exportVersion !== undefined && payload.exportVersion !== '1.0') errors.push('$.exportVersion: 不支持的导出版本');
  for (const key of ['conversations', 'taskSpecs']) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) errors.push(`$.${key}: 期望数组`);
  }
  if (errors.length) return errors;
  (payload.conversations || []).forEach((message, index) => errors.push(...validateMessage(message, `$.conversations[${index}]`)));
  (payload.taskSpecs || []).forEach((task, index) => errors.push(...validateValue(task, storedTaskSchema, `$.taskSpecs[${index}]`)));
  return errors;
}
