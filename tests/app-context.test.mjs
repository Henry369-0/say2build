import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProject } from '../public/modules/brain.js';
import { createTaskSpec } from '../public/modules/artifacts.js';

let instance = 0;
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(setImmediate); };

async function workspace() {
  const a = createEmptyProject({ idea: '项目甲', title: '项目甲' });
  const b = createEmptyProject({ idea: '项目乙', title: '项目乙' });
  const entry = state => ({ state, conversations: [], taskSpecs: [], snapshots: [], ui: {} });
  const values = new Map([['say2build.projects.v1', JSON.stringify({ [a.projectId]: entry(a), [b.projectId]: entry(b) })]]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,String(value)) };
  const handlers = {};
  const inputs = { '#chat-input': { value: '', focus() {} } };
  const app = { innerHTML: '', addEventListener: (name, handler) => { handlers[name] = handler; } };
  const toastRoot = { appendChild() {} };
  globalThis.document = {
    querySelector: selector => selector === '#app' ? app : selector === '#toast-root' ? toastRoot : inputs[selector] ?? null,
    addEventListener() {},
    createElement: () => ({ remove() {} }),
  };
  globalThis.window = { addEventListener: (name,handler) => { handlers[name] = handler; } };
  globalThis.requestAnimationFrame = callback => callback();
  globalThis.location = new URL(`http://localhost:3000/?project=${a.projectId}`);
  globalThis.history = {
    pushState: (_state,_title,url) => { globalThis.location = new URL(url,globalThis.location); },
    replaceState: (_state,_title,url) => { globalThis.location = new URL(url,globalThis.location); },
  };
  const requests = [];
  globalThis.fetch = (url,options) => new Promise(resolve => requests.push({url,body:JSON.parse(options.body),resolve}));
  await import(`../public/app.js?context-test=${instance++}`);
  return {
    a, b, app, requests,
    click: (action,data = {}) => handlers.click({ target: { closest: () => ({ dataset: { action,...data } }) } }),
    send: text => { inputs['#chat-input'].value = text; handlers.click({ target: { closest: () => ({ dataset: { action: 'send-message' } }) } }); },
    read: state => JSON.parse(values.get('say2build.projects.v1'))[state.projectId],
  };
}

function reply(request, marker) {
  request.resolve({ok:true,json:async () => ({ result:{assistantReply:marker,changes:[],nextAction:{title:marker,reason:'回归验证',type:'clarify',canGenerateTask:false}} })});
}

test('late brain replies cannot write into a different project', async () => {
  const ui = await workspace();
  ui.send('甲的消息');
  assert.equal(ui.requests[0].body.project.projectId,ui.a.projectId);
  ui.click('open-project',{projectId:ui.b.projectId});
  reply(ui.requests[0],'仅属于甲的回复');
  await flush();
  assert.deepEqual(ui.read(ui.b).state,ui.b);
  assert.equal(ui.read(ui.b).conversations.length,0);
  assert.ok(!ui.app.innerHTML.includes('仅属于甲的回复'));
});

test('switching projects permits a new turn and an old reply cannot clear its pending state', async () => {
  const ui = await workspace();
  ui.send('甲的消息');
  ui.click('open-project',{projectId:ui.b.projectId});
  ui.send('乙的消息');
  assert.equal(ui.requests.length,2,'new project must not inherit another project pending flag');
  reply(ui.requests[0],'甲迟到');
  await flush();
  assert.ok(ui.app.innerHTML.includes('id="pending-message"'));
  reply(ui.requests[1],'乙正确回复');
  await flush();
  assert.equal(ui.read(ui.b).state.execution.nextAction.title,'乙正确回复');
  assert.ok(!ui.app.innerHTML.includes('id="pending-message"'));
});

test('reopening the same project creates a fresh context for late replies', async () => {
  const ui = await workspace();
  ui.send('离开前的消息');
  ui.click('home');
  ui.click('open-project',{projectId:ui.a.projectId});
  reply(ui.requests[0],'旧会话的回复');
  await flush();
  assert.equal(ui.read(ui.a).state.execution.nextAction.title,ui.a.execution.nextAction.title);
  assert.ok(!ui.app.innerHTML.includes('旧会话的回复'));
});

test('late task generation cannot append tasks to the next project', async () => {
  const ui = await workspace();
  ui.click('generate-task');
  const task = createTaskSpec(ui.a,{title:'甲的任务'});
  ui.click('open-project',{projectId:ui.b.projectId});
  ui.requests[0].resolve({ok:true,json:async () => ({task})});
  await flush();
  assert.equal(ui.read(ui.b).taskSpecs.length,0);
  assert.deepEqual(ui.read(ui.b).state,ui.b);
});

test('the current context still receives its brain reply and task', async () => {
  const ui = await workspace();
  ui.send('当前项目的消息');
  reply(ui.requests[0],'当前项目正确回复');
  await flush();
  ui.click('generate-task');
  const task = createTaskSpec(ui.read(ui.a).state,{title:'当前项目的任务'});
  ui.requests[1].resolve({ok:true,json:async () => ({task})});
  await flush();
  assert.equal(ui.read(ui.a).state.execution.nextAction.title,'当前项目正确回复');
  assert.equal(ui.read(ui.a).taskSpecs[0].title,'当前项目的任务');
});
