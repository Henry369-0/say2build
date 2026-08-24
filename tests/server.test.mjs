import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAppServer } from '../server.mjs';
import { createRateLimiter } from '../server/guard.mjs';
import { createEmptyProject } from '../public/modules/brain.js';

let server;
let port;

function listen(srv) {
  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => resolve(srv.address().port));
  });
}
function close(srv) {
  return new Promise((resolve) => srv.close(resolve));
}
function rawRequest(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      res.resume();
      resolve(res);
    });
    req.on('error', reject);
    req.end();
  });
}

test.before(async () => {
  server = createAppServer();
  port = await listen(server);
});
test.after(async () => {
  await close(server);
});

test('serves the landing page', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Say2Build/);
});

test('unknown static paths fall back to index.html (SPA)', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/some/route`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<!doctype html>/i);
});

test('api/brain without a configured key returns 503', async () => {
  delete process.env.OPENAI_API_KEY;
  const state = createEmptyProject({ idea: '测试' });
  const res = await fetch(`http://127.0.0.1:${port}/api/brain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: state, userMessage: 'hi' }),
  });
  assert.equal(res.status, 503);
  const payload = await res.json();
  assert.ok(payload.error);
});

test('cross-origin POST is rejected with 403', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/brain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: '{}',
  });
  assert.equal(res.status, 403);
});

test('same-origin POST passes the origin check', async () => {
  delete process.env.OPENAI_API_KEY;
  const state = createEmptyProject({ idea: '测试' });
  const res = await fetch(`http://127.0.0.1:${port}/api/brain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: `http://127.0.0.1:${port}` },
    body: JSON.stringify({ project: state, userMessage: 'hi' }),
  });
  // 通过了同源校验，走到模型调用，无 key 时应为 503（而不是 403）
  assert.equal(res.status, 503);
});

test('malformed JSON body returns 400', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/brain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{oops',
  });
  assert.equal(res.status, 400);
});

test('malformed percent-encoding in the path returns 400', async () => {
  const res = await rawRequest('GET', '/%zz');
  assert.equal(res.statusCode, 400);
});

test('non-POST api requests return 405', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/brain`);
  assert.equal(res.status, 405);
});

test('rate limiter rejects requests beyond the limit', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, limit: 3 });
  const req = () => ({ socket: { remoteAddress: '10.0.0.1' } });
  assert.equal(limiter(req()), null);
  assert.equal(limiter(req()), null);
  assert.equal(limiter(req()), null);
  const blocked = limiter(req());
  assert.equal(blocked.statusCode, 429);
  assert.ok(blocked.message);
});

test('rate limiter window resets after the window', () => {
  const limiter = createRateLimiter({ windowMs: 50, limit: 1 });
  const req = () => ({ socket: { remoteAddress: '10.0.0.2' } });
  assert.equal(limiter(req()), null);
  assert.equal(limiter(req()).statusCode, 429);
  return new Promise((resolve) => setTimeout(() => {
    assert.equal(limiter(req()), null);
    resolve();
  }, 80));
});
