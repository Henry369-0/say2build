import test from 'node:test';
import assert from 'node:assert/strict';
import { createStructuredResponse } from '../server/openai.mjs';

const realFetch = globalThis.fetch;

const validResult = {
  assistantReply: '你好，这是测试。',
  turnType: 'explore',
  understanding: 'ok',
  changes: [],
  conflicts: [],
  choice: null,
  nextAction: { title: 'x', reason: 'y', type: 'clarify', canGenerateTask: false },
  stageSignal: { suggestedStage: null, reason: null },
};

function withKey() {
  process.env.OPENAI_API_KEY = 'test-key';
}
function withoutKey() {
  delete process.env.OPENAI_API_KEY;
}
function restore() {
  globalThis.fetch = realFetch;
  withoutKey();
}

test('missing key throws a 503', async () => {
  withoutKey();
  await assert.rejects(
    createStructuredResponse({ name:'t', schema:{ type:'object' }, instructions:'', input:'{}' }),
    (error) => error.statusCode === 503,
  );
});

test('parses structured output from the Responses API', async () => {
  withKey();
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(validResult) }) });
  try {
    const out = await createStructuredResponse({ name:'t', schema:{ type:'object' }, instructions:'', input:'{}' });
    assert.equal(out.assistantReply, '你好，这是测试。');
    assert.equal(out.nextAction.type, 'clarify');
  } finally {
    restore();
  }
});

test('extracts output from the output[] array shape as a fallback', async () => {
  withKey();
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      output: [{ content: [{ type: 'output_text', text: JSON.stringify(validResult) }] }],
    }),
  });
  try {
    const out = await createStructuredResponse({ name:'t', schema:{ type:'object' }, instructions:'', input:'{}' });
    assert.equal(out.assistantReply, '你好，这是测试。');
  } finally {
    restore();
  }
});

test('non-ok response throws with the API status code', async () => {
  withKey();
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'bad key' } }) });
  try {
    await assert.rejects(
      createStructuredResponse({ name:'t', schema:{ type:'object' }, instructions:'', input:'{}' }),
      (error) => error.statusCode === 401,
    );
  } finally {
    restore();
  }
});

test('unparseable model output throws', async () => {
  withKey();
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output_text: 'not json {' }) });
  try {
    await assert.rejects(createStructuredResponse({ name:'t', schema:{ type:'object' }, instructions:'', input:'{}' }));
  } finally {
    restore();
  }
});
