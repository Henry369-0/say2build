import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBrainOperations, createEmptyProject } from '../public/modules/brain.js';

function change(overrides = {}) {
  return {
    action:'add', target:'decision', statement:'Use local storage for MVP', reason:'Keep the first version light',
    source:'explicit', impact:'medium', ...overrides,
  };
}

test('superseding a confirmed decision removes the old decision from current truth', () => {
  let state = createEmptyProject({ idea:'Build a small project planner' });
  state = applyBrainOperations(state, [change()]).state;
  const old = state.decisions.find((item) => item.status === 'confirmed');
  const result = applyBrainOperations(state, [change({ action:'supersede', statement:'Use cloud sync in the validated product', supersedesId:old.id, impact:'high' })]);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.state.decisions.filter((item) => item.status === 'confirmed').length, 1);
  assert.equal(result.state.decisions.find((item) => item.id === old.id).status, 'superseded');
});

test('high-impact AI inference cannot silently supersede confirmed truth', () => {
  let state = createEmptyProject({ idea:'Build a small project planner' });
  state = applyBrainOperations(state, [change()]).state;
  const old = state.decisions.find((item) => item.status === 'confirmed');
  const result = applyBrainOperations(state, [change({ action:'supersede', statement:'Require accounts', supersedesId:old.id, source:'ai_inferred', impact:'high' })]);
  assert.equal(result.applied.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.state.decisions.find((item) => item.id === old.id).status, 'confirmed');
});

test('scope item can exist in only one current bucket', () => {
  let state = createEmptyProject({ idea:'Build a planner' });
  state = applyBrainOperations(state, [change({ target:'in_scope', statement:'GitHub integration' })]).state;
  state = applyBrainOperations(state, [change({ target:'later_idea', action:'move_to_later', statement:'GitHub integration' })]).state;
  assert.equal(state.scope.inScope.length, 0);
  assert.equal(state.scope.laterIdeas.length, 1);
});

test('an empty change list is a valid no-persist turn', () => {
  const state = createEmptyProject({ idea:'Build a planner' });
  const result = applyBrainOperations(state, []);
  assert.equal(result.applied.length, 0);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.state.identity.oneLiner, state.identity.oneLiner);
});
