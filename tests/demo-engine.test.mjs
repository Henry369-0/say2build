import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBrainOperations, createEmptyProject } from '../public/modules/brain.js';
import { demoBrainTurn } from '../public/modules/demo-engine.js';

test('a personalized PDF request is treated as personalization, not generic material setup', () => {
  const state = createEmptyProject({ idea:'A study material tool' });
  const result = demoBrainTurn(state, 'Every PDF should have the student name as a watermark.');
  assert.equal(result.turnType, 'revise');
  assert.ok(result.changes.some((item) => item.statement.includes('个性化')));
  assert.equal(result.choice?.recommendedOptionId, 'prebuild');
});

test('choosing an option via context produces a decided result (real-AI path uses the same route)', () => {
  const state = createEmptyProject({ idea:'A study material tool' });
  const choice = {
    question:'第一版优先把哪件事做好？',
    options: [
      { id:'distribute', label:'内容已经整理好——把分发做顺', consequence:'最轻的构建。' },
      { id:'organize', label:'成员需要搜索和整理内容', consequence:'需要更多结构。' },
    ],
    recommendedOptionId:'distribute',
  };
  const option = choice.options[0];
  const result = demoBrainTurn(state, '我选择：内容已经整理好——把分发做顺', [], { choice, option });
  assert.equal(result.turnType, 'decide');
  assert.ok(result.changes.some((item) => item.target === 'decision' && item.statement.includes('把分发做顺')));
  assert.equal(result.nextAction.canGenerateTask, true);
  const next = applyBrainOperations(state, result.changes).state;
  assert.equal(next.stage.current, 'ready_to_build');
});

test('typing an option label is recognized from the conversation history', () => {
  const state = createEmptyProject({ idea:'A study material tool' });
  const choice = {
    question:'第一版优先偏向哪个方向？',
    options: [
      { id:'simple', label:'一个明确的小功能，简单做好', consequence:'最快走到可用 MVP。' },
      { id:'flexible', label:'更通用的工具，留扩展空间', consequence:'更灵活。' },
    ],
    recommendedOptionId:'simple',
  };
  const recent = [{ id:'choice-1', type:'choice', choice }];
  const result = demoBrainTurn(state, '我选择：一个明确的小功能，简单做好', recent);
  assert.equal(result.turnType, 'decide');
  assert.ok(result.changes.some((item) => item.target === 'decision' && item.statement.includes('一个明确的小功能')));
});

test('delegating the decision keeps momentum and allows a build task', () => {
  const state = createEmptyProject({ idea:'A study material tool' });
  const result = demoBrainTurn(state, 'Should the first version have accounts or stay local? You decide.');
  assert.equal(result.nextAction.canGenerateTask, true);
  assert.ok(result.changes.some((item) => item.target === 'stage' && item.statement === 'ready_to_build'));
});

test('a tiny visual tweak is not persisted', () => {
  const state = createEmptyProject({ idea:'A study material tool' });
  const result = demoBrainTurn(state, 'Can you make the headline two pixels smaller?');
  assert.equal(result.changes.length, 0);
});

test('cross-device sync conflicts with an earlier local-first decision', () => {
  let state = createEmptyProject({ idea:'A study material tool' });
  state = applyBrainOperations(state, [
    { action:'add', target:'decision', statement:'优先本地存储，数据默认保存在本机。', reason:'用户明确本地优先', source:'explicit', impact:'high' },
  ]).state;
  const result = demoBrainTurn(state, '我需要跨设备同步。');
  assert.ok(result.conflicts.length > 0);
});

test('a community idea is parked as a later idea instead of bloating the MVP', () => {
  let state = createEmptyProject({ idea:'A study material tool' });
  state.identity.targetUsers = ['小规模团队'];
  state.decisions.push({ id:'d1', statement:'MVP 不做复杂的账号体系。', rationale:'轻量', source:'explicit', status:'confirmed', impact:'high', createdAt:new Date().toISOString(), supersededBy:'' });
  const result = demoBrainTurn(state, '以后可以加一个社区功能。');
  const next = applyBrainOperations(state, result.changes).state;
  assert.ok(next.scope.laterIdeas.some((item) => item.statement.includes('社区')));
});

test('an explicit no-login direction becomes a confirmed guardrail', () => {
  const state = createEmptyProject({ idea:'A study material tool' });
  const result = demoBrainTurn(state, '不要登录。');
  assert.ok(result.changes.some((item) => item.target === 'decision' && item.statement.includes('账号')));
  assert.ok(result.changes.some((item) => item.target === 'constraint'));
});

test('answering the guidance question for users persists a target user', () => {
  const state = createEmptyProject({ idea:'一个工具' });
  const result = demoBrainTurn(state, '给培训机构的老师用', [], { guidanceStep: 'users' });
  assert.ok(result.changes.some((item) => item.target === 'target_user' && item.statement.includes('培训机构的老师')));
});

test('answering the guidance question for problem persists the problem', () => {
  const state = createEmptyProject({ idea:'一个工具' });
  const result = demoBrainTurn(state, '主要问题是资料发出去总被二次传播', [], { guidanceStep: 'problem' });
  assert.ok(result.changes.some((item) => item.target === 'problem' && item.statement.includes('二次传播')));
});

test('answering the guidance question for workflow persists core steps', () => {
  const state = createEmptyProject({ idea:'一个工具' });
  const result = demoBrainTurn(state, '先上传资料，学生再下载', [], { guidanceStep: 'workflow' });
  const next = applyBrainOperations(state, result.changes).state;
  assert.ok(next.intent.coreWorkflow.length >= 2);
});

test('answering the guidance question for scope adds in-scope items', () => {
  const state = createEmptyProject({ idea:'一个工具' });
  const result = demoBrainTurn(state, '资料列表、下载功能', [], { guidanceStep: 'scope' });
  const next = applyBrainOperations(state, result.changes).state;
  assert.ok(next.scope.inScope.some((item) => item.statement.includes('下载功能')));
});

test('a negation answer to a guidance question is not persisted', () => {
  const state = createEmptyProject({ idea:'一个工具' });
  const result = demoBrainTurn(state, '还没想好', [], { guidanceStep: 'users' });
  assert.equal(result.changes.length, 0);
});

test('re-mentioning materials after shaping adds scope instead of re-asking the choice', () => {
  let state = createEmptyProject({ idea:'A study material tool' });
  state = applyBrainOperations(state, [
    { action:'add', target:'target_user', statement:'培训团队的老师', reason:'用户明确', source:'explicit', impact:'medium' },
    { action:'add', target:'decision', statement:'第一版保持轻量，不做成完整平台。', reason:'用户明确', source:'explicit', impact:'high' },
    { action:'add', target:'in_scope', statement:'资料列表与下载流程', reason:'MVP', source:'explicit', impact:'medium' },
  ]).state;
  const result = demoBrainTurn(state, '还要能按学科分类下载资料');
  assert.equal(result.choice, null);
  assert.ok(result.changes.some((item) => item.target === 'in_scope' && item.statement.includes('学科分类')));
});
