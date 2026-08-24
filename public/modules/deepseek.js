// 浏览器直连 DeepSeek 的客户端。
// 前提：DeepSeek /chat/completions 端点允许浏览器跨域（preflight 会回显请求方 Origin）。
// 输出严格按 contracts.js 的 JSON Schema 校验后再交给确定性 reducer。
import { BRAIN_SYSTEM, TASK_SYSTEM, validateBrainResult, validateTaskResult } from './contracts.js';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export async function deepseekChat({ apiKey, model = 'deepseek-chat', messages, maxTokens = 4096, json = true }) {
  if (!apiKey) throw Object.assign(new Error('缺少 DeepSeek API Key。'), { statusCode: 400 });
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      stream: false,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `DeepSeek 请求失败（${response.status}）。`);
    error.statusCode = response.status;
    throw error;
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) throw new Error('DeepSeek 没有返回内容。');
  if (!json) return content;
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('DeepSeek 返回的内容不是合法 JSON。');
  }
}

// 把对话记录规整成 DeepSeek 消息（过滤掉 choice/update/conflict 卡片）。
function toHistory(recentMessages, userMessage) {
  const history = (recentMessages || [])
    .slice(-10)
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }));
  // 最新一句用户消息已在对话里，避免重复
  if (history.length && history[history.length - 1].role === 'user' && history[history.length - 1].content === userMessage) {
    history.pop();
  }
  return history;
}

export async function deepseekBrainTurn({ project, recentMessages = [], userMessage, choice = null, guidanceStep = null, apiKey, model = 'deepseek-chat' }) {
  const history = toHistory(recentMessages, userMessage);
  const input = JSON.stringify({
    project,
    recentMessages: history,
    latestUserMessage: userMessage,
    ...(choice ? { answeredChoice: choice } : {}),
    ...(guidanceStep ? { guidanceStep } : {}),
  });
  const promptNote = guidanceStep ? `（用户正在回答澄清引导中的「${guidanceStep}」这一步，请把回答沉淀为对应的事实。）` : '';
  const messages = [
    { role: 'system', content: BRAIN_SYSTEM },
    ...history,
    { role: 'user', content: `请根据最新一句用户输入处理这条消息，并按契约返回 JSON：\n${userMessage}${promptNote}\n\n输入数据：\n${input}` },
  ];
  const raw = await deepseekChat({ apiKey, model, messages });
  const errors = validateBrainResult(raw);
  if (errors.length) {
    throw new Error(`DeepSeek 返回结果不符合契约：${errors.slice(0, 3).join('；')}`);
  }
  raw.mode = 'deepseek';
  return raw;
}

export async function deepseekTask({ project, apiKey, model = 'deepseek-chat' }) {
  const messages = [
    { role: 'system', content: TASK_SYSTEM },
    { role: 'user', content: `请根据项目状态生成一个聚焦的构建任务，并按契约返回 JSON：\n${JSON.stringify({ project })}` },
  ];
  const raw = await deepseekChat({ apiKey, model, messages });
  const errors = validateTaskResult(raw);
  if (errors.length) {
    throw new Error(`DeepSeek 返回任务不符合契约：${errors.slice(0, 3).join('；')}`);
  }
  return raw;
}

// 用一次极小的请求验证 Key 是否有效（max_tokens=1，成本可忽略）。
export async function testDeepSeekConnection({ apiKey, model = 'deepseek-chat' }) {
  await deepseekChat({ apiKey, model, messages: [{ role: 'user', content: 'hi' }], maxTokens: 1, json: false });
  return true;
}
