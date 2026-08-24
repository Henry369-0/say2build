import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBrainOperations, createEmptyProject } from '../public/modules/brain.js';
import { GUIDANCE_STEPS, deriveGuidance, currentGuidanceQuestion } from '../public/modules/guidance.js';

test('a fresh project starts at the target-users step', () => {
  const state = createEmptyProject({ idea: '一个模糊的想法' });
  const guidance = deriveGuidance(state);
  assert.equal(guidance.ready, false);
  assert.equal(guidance.completed, 0);
  assert.equal(guidance.current.id, 'users');
  assert.equal(currentGuidanceQuestion(state), '这个工具主要给谁用？');
});

test('adding target users advances to the problem step', () => {
  let state = createEmptyProject({ idea: '一个模糊的想法' });
  state = applyBrainOperations(state, [
    { action: 'add', target: 'target_user', statement: '培训机构的老师', reason: 'x', source: 'explicit', impact: 'medium' },
  ]).state;
  const guidance = deriveGuidance(state);
  assert.equal(guidance.current.id, 'problem');
  assert.equal(guidance.completed, 1);
});

test('the ladder completes for a fully shaped project', () => {
  let state = createEmptyProject({ idea: '一个测试项目' });
  state = applyBrainOperations(state, [
    { action: 'add', target: 'target_user', statement: '老师', reason: 'x', source: 'explicit', impact: 'medium' },
    { action: 'update', target: 'problem', statement: '资料总是被二次传播', reason: 'x', source: 'explicit', impact: 'medium' },
    { action: 'add', target: 'core_workflow', statement: '上传资料', reason: 'x', source: 'explicit', impact: 'medium' },
    { action: 'add', target: 'in_scope', statement: '资料列表', reason: 'x', source: 'explicit', impact: 'medium' },
    { action: 'add', target: 'in_scope', statement: '下载流程', reason: 'x', source: 'explicit', impact: 'medium' },
    { action: 'add', target: 'decision', statement: 'MVP 不做复杂账号体系。', reason: 'x', source: 'explicit', impact: 'high' },
    { action: 'update', target: 'next_action', statement: '做出第一个能用的版本', reason: 'x', source: 'derived', impact: 'low', nextActionType: 'build', canGenerateTask: true },
  ]).state;
  const guidance = deriveGuidance(state);
  assert.equal(guidance.ready, true);
  assert.equal(guidance.current, null);
  assert.equal(guidance.completed, GUIDANCE_STEPS.length);
  assert.equal(currentGuidanceQuestion(state), null);
});

test('the guidance ladder is a fixed, ordered set of steps', () => {
  assert.deepEqual(GUIDANCE_STEPS.map((s) => s.id), ['users', 'problem', 'workflow', 'scope', 'decisions', 'ready']);
  for (const step of GUIDANCE_STEPS) {
    assert.ok(step.label);
    assert.ok(typeof step.check === 'function');
  }
});
