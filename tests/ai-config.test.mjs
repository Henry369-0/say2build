import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_PROVIDERS, DEEPSEEK_MODELS, aiModeLabel, deepseekEnabled, getAISettings, saveAISettings } from '../public/modules/ai-config.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

test('defaults to demo mode', () => {
  memory.clear();
  const settings = getAISettings();
  assert.equal(settings.provider, 'demo');
  assert.equal(settings.deepseekKey, '');
  assert.equal(settings.deepseekModel, 'deepseek-chat');
});

test('save merges with existing settings', () => {
  memory.clear();
  saveAISettings({ provider: 'deepseek', deepseekKey: 'sk-abc' });
  const settings = getAISettings();
  assert.equal(settings.provider, 'deepseek');
  assert.equal(settings.deepseekKey, 'sk-abc');
  assert.equal(settings.deepseekModel, 'deepseek-chat'); // 保留默认
});

test('corrupt stored settings fall back to defaults', () => {
  memory.clear();
  memory.set('say2build.settings.v1', '{broken json');
  const settings = getAISettings();
  assert.equal(settings.provider, 'demo');
});

test('aiModeLabel reflects the current provider', () => {
  assert.equal(aiModeLabel({ provider: 'demo' }), '演示模式');
  assert.equal(aiModeLabel({ provider: 'server' }), '服务器 AI');
  assert.equal(aiModeLabel({ provider: 'deepseek', deepseekKey: 'sk-x', deepseekModel: 'deepseek-chat' }), 'DeepSeek · deepseek-chat');
  assert.equal(aiModeLabel({ provider: 'deepseek', deepseekKey: '' }), '演示模式');
});

test('deepseekEnabled only when provider and key are set', () => {
  assert.equal(deepseekEnabled({ provider: 'demo' }), false);
  assert.equal(deepseekEnabled({ provider: 'deepseek', deepseekKey: '' }), false);
  assert.equal(deepseekEnabled({ provider: 'deepseek', deepseekKey: 'sk-x' }), true);
});

test('provider and model catalogues are non-empty and well-formed', () => {
  assert.ok(AI_PROVIDERS.length >= 3);
  assert.ok(DEEPSEEK_MODELS.some((m) => m.id === 'deepseek-chat'));
});
