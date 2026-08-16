import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../public/modules/brain.js';
import { demoBrainTurn } from '../public/modules/demo-engine.js';

test('a personalized PDF request is treated as watermark personalization, not generic material setup', () => {
  const state = createEmptyProject({ idea:'A study material tool' });
  const result = demoBrainTurn(state, 'Every PDF should have the student name as a watermark.');
  assert.equal(result.turnType, 'revise');
  assert.ok(result.changes.some((item) => item.statement.includes('Personalized PDF watermark')));
  assert.equal(result.choice?.recommendedOptionId, 'prebuild');
});
