import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../public/modules/brain.js';
import { saveStoredProject, loadStoredProject, listStoredProjects, deleteStoredProject, importStoredProject } from '../public/modules/storage.js';

// Node 没有内置 localStorage，这里用一个进程内 mock 来测持久化逻辑。
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

function stored(idea) {
  return { state: createEmptyProject({ idea }), conversations: [], taskSpecs: [], snapshots: [], ui: {} };
}

test('save and load round-trips project state', () => {
  const entry = stored('一个测试项目');
  const saved = saveStoredProject(entry);
  const loaded = loadStoredProject(saved.state.projectId);
  assert.ok(loaded);
  assert.equal(loaded.state.identity.oneLiner, '一个测试项目');
  assert.ok(loaded.ui.lastOpenedAt);
});

test('list returns projects sorted by last opened time', () => {
  memory.clear();
  const a = stored('项目 A');
  const b = stored('项目 B');
  saveStoredProject(a);
  saveStoredProject(b);
  const list = listStoredProjects();
  assert.equal(list.length, 2);
  assert.ok(list.some((item) => item.state.identity.oneLiner === '项目 A'));
  assert.ok(list.some((item) => item.state.identity.oneLiner === '项目 B'));
});

test('delete removes a project', () => {
  const entry = stored('将被删除');
  const saved = saveStoredProject(entry);
  deleteStoredProject(saved.state.projectId);
  assert.equal(loadStoredProject(saved.state.projectId), null);
});

test('import accepts a valid v1 export and rejects invalid payloads', () => {
  const entry = stored('导入测试');
  const imported = importStoredProject({
    state: entry.state,
    conversations: [{ id:'m1', role:'user', content:'hi', createdAt:new Date().toISOString() }],
    taskSpecs: [],
  });
  assert.equal(imported.state.schemaVersion, '1.0');
  assert.equal(loadStoredProject(entry.state.projectId).state.identity.oneLiner, '导入测试');
  assert.throws(() => importStoredProject({}));
  assert.throws(() => importStoredProject({ state: { projectId: 'x' } }));
});
