import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../public/modules/brain.js';
import { deepseekBrainTurn, deepseekChat, deepseekTask, testDeepSeekConnection } from '../public/modules/deepseek.js';

const realFetch = globalThis.fetch;

function validBrainResult() {
  return {
    assistantReply: '好的，这是一个测试回复。',
    turnType: 'explore',
    understanding: 'ok',
    changes: [],
    conflicts: [],
    choice: null,
    nextAction: { title: 'x', reason: 'y', type: 'clarify', canGenerateTask: false },
    stageSignal: { suggestedStage: null, reason: null },
  };
}

function validTaskResult() {
  return {
    id: 'task-001', title: '构建第一版', objective: '构建第一版', whyNow: '最小可用',
    context: ['背景'], inScope: ['做 A'], outOfScope: ['不做 B'], preserve: ['保留决策'],
    implementationNotes: ['最轻实现'], acceptanceCriteria: ['可见且可用'], relevantArtifacts: ['PROJECT.md'],
    completionReport: ['改了什么', '改了哪些文件', '怎么验证的', '还有什么没解决'],
  };
}

function mockFetch(handler) {
  globalThis.fetch = async (url, options) => handler(url, options);
}

function restore() {
  globalThis.fetch = realFetch;
}

test('deepseekChat builds a proper chat/completions request and parses JSON', async () => {
  let captured = null;
  mockFetch(async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
  });
  try {
    const out = await deepseekChat({ apiKey: 'sk-test', model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }] });
    assert.deepEqual(out, { ok: true });
    assert.equal(captured.url, 'https://api.deepseek.com/chat/completions');
    const body = JSON.parse(captured.options.body);
    assert.equal(body.model, 'deepseek-chat');
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.equal(captured.options.headers.Authorization, 'Bearer sk-test');
  } finally {
    restore();
  }
});

test('deepseekChat surfaces API errors with status code', async () => {
  mockFetch(async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Authentication Fails' } }) }));
  try {
    await assert.rejects(
      deepseekChat({ apiKey: 'sk-bad', model: 'deepseek-chat', messages: [] }),
      (error) => error.statusCode === 401,
    );
  } finally {
    restore();
  }
});

test('deepseekChat rejects non-JSON content when json mode is on', async () => {
  mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'not json' } }] }) }));
  try {
    await assert.rejects(deepseekChat({ apiKey: 'sk-test', model: 'deepseek-chat', messages: [] }));
  } finally {
    restore();
  }
});

test('deepseekBrainTurn validates the model output against the contract', async () => {
  mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(validBrainResult()) } }] }) }));
  try {
    const state = createEmptyProject({ idea: '测试' });
    const result = await deepseekBrainTurn({ project: state, recentMessages: [{ role: 'user', content: '你好' }], userMessage: '你好', apiKey: 'sk-test' });
    assert.equal(result.assistantReply, '好的，这是一个测试回复。');
    assert.equal(result.mode, 'deepseek');
  } finally {
    restore();
  }
});

test('deepseekBrainTurn rejects contract-violating output', async () => {
  const bad = { ...validBrainResult(), changes: [{ action: 'add', target: 'nope' }] };
  mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(bad) } }] }) }));
  try {
    await assert.rejects(
      deepseekBrainTurn({ project: createEmptyProject({ idea: 'x' }), recentMessages: [], userMessage: 'hi', apiKey: 'sk-test' }),
      /不符合契约/,
    );
  } finally {
    restore();
  }
});

test('deepseekTask validates the task output', async () => {
  mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(validTaskResult()) } }] }) }));
  try {
    const task = await deepseekTask({ project: createEmptyProject({ idea: 'x' }), apiKey: 'sk-test' });
    assert.equal(task.id, 'task-001');
  } finally {
    restore();
  }
});

test('testDeepSeekConnection succeeds on a 200 response', async () => {
  mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'hi' } }] }) }));
  try {
    assert.equal(await testDeepSeekConnection({ apiKey: 'sk-test' }), true);
  } finally {
    restore();
  }
});
