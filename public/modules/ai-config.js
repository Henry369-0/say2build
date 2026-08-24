// AI 接入配置：只保存在本机浏览器（localStorage），绝不发送到任何服务器。
export const SETTINGS_KEY = 'say2build.settings.v1';

export const AI_PROVIDERS = [
  { id: 'demo', label: '演示模式', hint: '零配置，内置规则引擎，适合先体验。' },
  { id: 'deepseek', label: 'DeepSeek（浏览器直连）', hint: '填你自己的 API Key，密钥只存在这台设备。' },
  { id: 'server', label: '服务器 AI（OpenAI）', hint: '需要自托管 / 部署时配置 OPENAI_API_KEY。' },
];

export const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', label: 'deepseek-chat（推荐，快）' },
  { id: 'deepseek-reasoner', label: 'deepseek-reasoner（深度思考，慢）' },
];

const DEFAULTS = { provider: 'demo', deepseekKey: '', deepseekModel: 'deepseek-chat' };

function read() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getAISettings() {
  return read();
}

export function saveAISettings(patch) {
  const next = { ...read(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function aiModeLabel(settings) {
  if (settings?.provider === 'deepseek' && settings.deepseekKey) return `DeepSeek · ${settings.deepseekModel || 'deepseek-chat'}`;
  if (settings?.provider === 'server') return '服务器 AI';
  return '演示模式';
}

// 当前是否真的走浏览器直连的 DeepSeek。
export function deepseekEnabled(settings) {
  return settings?.provider === 'deepseek' && Boolean(settings.deepseekKey);
}
