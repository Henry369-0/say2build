// 用一个小型 JSON Schema 校验器，保证 demo 引擎输出与真实 AI 的 schema 合约一致，
// 让「结构契约」在无 key 的情况下也能被自动化验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyBrainOperations, createEmptyProject } from '../public/modules/brain.js';
import { demoBrainTurn } from '../public/modules/demo-engine.js';
import { createTaskSpec } from '../public/modules/artifacts.js';
import { brainTurnSchema } from '../server/brain.mjs';
import { taskSchema } from '../server/task.mjs';

const fixtures = JSON.parse(await readFile(new URL('../evals/fixtures.json', import.meta.url), 'utf8'));

function validateValue(value, schema, path = '$') {
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

test('the validator itself rejects a clearly invalid object', () => {
  const errors = validateValue({ nope: true }, { type:'object', additionalProperties:false, required:['assistantReply'], properties:{ assistantReply:{ type:'string' } } });
  assert.ok(errors.length > 0);
});

test('every demo-engine result for every eval fixture conforms to brainTurnSchema', () => {
  for (const fixture of fixtures) {
    let state = createEmptyProject({ idea: 'A lightweight Project Brain test project' });
    if (fixture.id !== '01-vague-idea') {
      state.identity.targetUsers = ['Beginner AI builders'];
      state.decisions.push({ id:'decision-base', statement:'Keep the MVP local.', rationale:'Lightweight', source:'explicit', status:'confirmed', impact:'high', createdAt:new Date().toISOString(), supersededBy:'' });
      state.constraints.push({ id:'constraint-base', statement:'Avoid login unless needed.', reason:'Protect MVP', source:'derived', status:'stable', appliesTo:['product'], createdAt:new Date().toISOString() });
    }
    for (const turn of fixture.turns) {
      const result = demoBrainTurn(state, turn, []);
      const errors = validateValue(result, brainTurnSchema);
      assert.deepEqual(errors, [], `${fixture.id} (turn: "${turn}"): ${errors.slice(0, 3).join('; ')}`);
      // 同时保证 reducer 能接受这些 change
      state = applyBrainOperations(state, result.changes).state;
    }
  }
});

test('createTaskSpec output conforms to taskSchema', () => {
  let state = createEmptyProject({ idea: '一个测试项目' });
  state.identity.targetUsers = ['测试用户'];
  state.scope.inScope.push({ id:'s1', statement:'范围项 A', source:'explicit', createdAt:new Date().toISOString() });
  state.scope.laterIdeas.push({ id:'s2', statement:'以后再说 B', source:'explicit', createdAt:new Date().toISOString() });
  state.execution.nextAction = { title:'构建第一版', reason:'最小可用', type:'build', canGenerateTask:true };
  const task = createTaskSpec(state);
  const errors = validateValue(task, taskSchema);
  assert.deepEqual(errors, [], errors.slice(0, 3).join('; '));
});

test('a hand-written adversarial change fails schema validation', () => {
  const bad = {
    assistantReply: 'x', turnType: 'explore', understanding: 'x',
    changes: [{ action: 'add', target: 'decision', statement: 'y', reason: 'z', source: 'explicit', impact: 'low', target_bad: true }],
    conflicts: [], choice: null,
    nextAction: { title: 'a', reason: 'b', type: 'clarify', canGenerateTask: false },
    stageSignal: { suggestedStage: null, reason: null },
  };
  const errors = validateValue(bad, brainTurnSchema);
  assert.ok(errors.some((error) => error.includes('target_bad')));
});
