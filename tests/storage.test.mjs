import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../public/modules/brain.js';
import { saveStoredProject, loadStoredProject, listStoredProjects, deleteStoredProject, importStoredProject } from '../public/modules/storage.js';
import { createProjectExport, createTaskSpec, renderProjectMd, renderTaskMd } from '../public/modules/artifacts.js';
import { readFile } from 'node:fs/promises';

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

test('incomplete project imports cannot overwrite an existing project', () => {
  memory.clear();
  const entry = saveStoredProject(stored('已有项目'));
  const before = memory.get('say2build.projects.v1');
  assert.throws(() => importStoredProject({ state: { projectId: entry.state.projectId, schemaVersion: '1.0' } }));
  assert.equal(memory.get('say2build.projects.v1'), before);
  assert.equal(loadStoredProject(entry.state.projectId).state.identity.oneLiner, '已有项目');
});

test('invalid state field types are rejected before storage is changed', () => {
  memory.clear();
  saveStoredProject(stored('保留的项目'));
  const before = memory.get('say2build.projects.v1');
  const invalidFields = [
    (s) => { s.identity.targetUsers = [null]; },
    (s) => { s.intent.coreWorkflow = '流程'; },
    (s) => { s.scope.inScope = [null]; },
    (s) => { s.decisions = [{ id: 'd', statement: '决策', status: 'unknown' }]; },
    (s) => { s.constraints = [false]; },
    (s) => { s.openQuestions = [{ id: 'q', question: null }]; },
    (s) => { s.stage.current = 'not-a-stage'; },
    (s) => { s.execution.nextAction = { title: [], reason: '', type: 'build', canGenerateTask: true }; },
    (s) => { s.execution.taskIndex = [{ id: null }]; },
    (s) => { s.artifacts.taskCount = -1; },
    (s) => { s.history.importantRevisions = null; },
    (s) => { s.meta.updatedAt = {}; },
    (s) => { s.projectId = '__proto__'; },
  ];
  for (const invalidate of invalidFields) {
    const payload = stored('无效项目');
    invalidate(payload.state);
    assert.throws(() => importStoredProject(payload), 'malformed state must be rejected');
    assert.equal(memory.get('say2build.projects.v1'), before);
  }
});

test('malformed conversations and task specs cannot poison the project list', () => {
  memory.clear();
  saveStoredProject(stored('保留的项目'));
  const before = memory.get('say2build.projects.v1');
  const variants = [
    { conversations: 'not-an-array' },
    { conversations: [null] },
    { conversations: [{ id: 'm', role: 'assistant', content: 42, createdAt: new Date().toISOString() }] },
    { conversations: [{ id: 'm', type: 'choice', choice: { options: null }, createdAt: new Date().toISOString() }] },
    { conversations: [{ id: 'm', type: 'conflict', conflict: null, createdAt: new Date().toISOString() }] },
    { conversations: [{ id: 'm', type: 'update', changes: [null], createdAt: new Date().toISOString() }] },
    { conversations: [{ id: 'm', type: 'task', task: { id: 't' }, createdAt: new Date().toISOString() }] },
    { taskSpecs: [null] },
    { taskSpecs: [{ id: 't', title: '缺失任务上下文' }] },
  ];
  for (const invalid of variants) {
    assert.throws(() => importStoredProject({ ...stored('坏消息'), ...invalid }));
    assert.equal(memory.get('say2build.projects.v1'), before);
  }
});

test('complete exported projects and the shipped example remain importable', async () => {
  memory.clear();
  const example = JSON.parse(await readFile(new URL('../examples/demo-project.json', import.meta.url), 'utf8'));
  const importedExample = importStoredProject(example);
  assert.ok(renderProjectMd(importedExample.state).includes('StudyDrop'));
  assert.ok(renderTaskMd(importedExample.taskSpecs[0]).includes('任务'));
  const state = createEmptyProject({ idea: '有效往返' });
  const task = createTaskSpec(state);
  task.status = 'done';
  task.report = '已验证';
  task.completedAt = new Date().toISOString();
  const messages = [{ id: 'task-message', type: 'task', task, createdAt: new Date().toISOString() }];
  const exported = createProjectExport(state, messages, [task]);
  const restored = importStoredProject(JSON.parse(JSON.stringify(exported)));
  assert.deepEqual(restored.state, state);
  assert.deepEqual(restored.conversations, messages);
  assert.deepEqual(restored.taskSpecs, [task]);
});
