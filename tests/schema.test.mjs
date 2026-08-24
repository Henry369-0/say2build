// 契约测试：共享的 contracts.js（schema + 校验器）必须同时约束 demo 引擎、真实 AI 和本地生成。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyBrainOperations, createEmptyProject } from '../public/modules/brain.js';
import { demoBrainTurn } from '../public/modules/demo-engine.js';
import { createTaskSpec } from '../public/modules/artifacts.js';
import { brainTurnSchema, taskSchema, validateValue, validateBrainResult, validateTaskResult } from '../public/modules/contracts.js';

const fixtures = JSON.parse(await readFile(new URL('../evals/fixtures.json', import.meta.url), 'utf8'));

test('the validator itself rejects a clearly invalid object', () => {
  const errors = validateValue({ nope: true }, { type:'object', additionalProperties:false, required:['assistantReply'], properties:{ assistantReply:{ type:'string' } } });
  assert.ok(errors.length > 0);
});

test('validateBrainResult and validateTaskResult helpers work', () => {
  assert.ok(validateBrainResult(null).length > 0);
  assert.ok(validateTaskResult({}).length > 0);
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
