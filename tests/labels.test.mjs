import test from 'node:test';
import assert from 'node:assert/strict';
import { changeTargetLabel, stageLabel } from '../public/modules/labels.js';

test('renders internal change targets as Chinese labels', () => {
  assert.equal(changeTargetLabel('one_liner'), '项目简介');
  assert.equal(changeTargetLabel('current_focus'), '当前焦点');
  assert.equal(changeTargetLabel('stage'), '项目阶段');
});

test('renders known project stages as Chinese labels', () => {
  assert.equal(stageLabel('ready_to_build'), '可以开工');
  assert.equal(stageLabel('usable_mvp'), '可用 MVP');
});
