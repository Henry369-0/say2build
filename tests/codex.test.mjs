import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClaudeCommand, buildCodexExecCommand, buildHandoffNote } from '../public/modules/codex.js';

test('codex exec command references the task file and completion report', () => {
  const cmd = buildCodexExecCommand({ id: 'task-007' });
  assert.match(cmd, /task-007\.md/);
  assert.match(cmd, /codex exec/);
  assert.match(cmd, /完成后/);
});

test('claude command references the task file', () => {
  const cmd = buildClaudeCommand({ id: 'task-007' });
  assert.match(cmd, /claude -p/);
  assert.match(cmd, /task-007\.md/);
});

test('commands fall back to task-001 when id is missing', () => {
  assert.match(buildCodexExecCommand({}), /task-001\.md/);
  assert.match(buildClaudeCommand(null), /task-001\.md/);
});

test('handoff note explains the three steps', () => {
  const note = buildHandoffNote({ id: 'task-002' });
  assert.match(note, /task-002\.md/);
  assert.match(note, /终端/);
  assert.match(note, /标记完成/);
});
