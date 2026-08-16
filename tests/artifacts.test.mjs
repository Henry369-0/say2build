import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBrainOperations, createEmptyProject } from '../public/modules/brain.js';
import { createTaskSpec, renderProjectMd, renderTaskMd } from '../public/modules/artifacts.js';

test('PROJECT.md renders current truth and next action', () => {
  let state = createEmptyProject({ idea:'A lightweight study material tool' });
  state = applyBrainOperations(state, [
    { action:'add', target:'target_user', statement:'Small training teams', reason:'Explicit user group', source:'explicit', impact:'medium' },
    { action:'add', target:'in_scope', statement:'Material list and download', reason:'MVP flow', source:'explicit', impact:'medium' },
    { action:'update', target:'next_action', statement:'Build the first material list and download flow', reason:'Smallest useful slice', source:'derived', impact:'low', nextActionType:'build', canGenerateTask:true },
  ]).state;
  const md = renderProjectMd(state);
  assert.match(md, /# A lightweight study material tool/i);
  assert.match(md, /Small training teams/);
  assert.match(md, /Build the first material list and download flow/);
});

test('task handoff includes scope, guardrails, and completion report', () => {
  let state = createEmptyProject({ idea:'A lightweight study material tool' });
  state.scope.inScope.push({ id:'scope-1', statement:'Material list', source:'explicit', createdAt:new Date().toISOString() });
  state.scope.nonGoals.push({ id:'scope-2', statement:'Community', source:'explicit', createdAt:new Date().toISOString() });
  state.execution.nextAction = { title:'Build material list', reason:'First usable slice', type:'build', canGenerateTask:true };
  const task = createTaskSpec(state);
  const md = renderTaskMd(task);
  assert.match(md, /## In scope/);
  assert.match(md, /Material list/);
  assert.match(md, /Community/);
  assert.match(md, /## When finished/);
});
