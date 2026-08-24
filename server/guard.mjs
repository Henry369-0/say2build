// 轻量 API 防护：同源校验 + 固定窗口限流 + 可选共享密钥。
// 目标：减少公网部署（如 Vercel）上的滥用，避免白烧模型 API 额度。
// 说明：限流基于进程内内存，自托管有效；serverless 上为尽力而为。

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 120;

export function checkSameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return null; // 非浏览器客户端没有 Origin，放行
  const host = req.headers?.host;
  if (!host) return null;
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
    return { statusCode: 403, message: '跨域请求被拒绝。' };
  } catch {
    return { statusCode: 400, message: 'Origin 头无效。' };
  }
}

export function createRateLimiter({ windowMs = DEFAULT_WINDOW_MS, limit = DEFAULT_LIMIT } = {}) {
  const hits = new Map();
  return function rateLimit(req) {
    const ip = req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = hits.get(ip);
    if (!bucket || now - bucket.start >= windowMs) {
      hits.set(ip, { start: now, count: 1 });
      if (hits.size > 1000) {
        for (const [key, value] of hits) {
          if (now - value.start >= windowMs) hits.delete(key);
        }
      }
      return null;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      const wait = Math.max(1, Math.ceil((windowMs - (now - bucket.start)) / 1000));
      return { statusCode: 429, message: `请求太频繁，请在 ${wait} 秒后再试。` };
    }
    return null;
  };
}

export const defaultRateLimiter = createRateLimiter();

export function checkSharedSecret(req) {
  const secret = process.env.SAY2BUILD_API_KEY;
  if (!secret) return null; // 未配置密钥时不启用
  const provided = req.headers?.['x-say2build-key'];
  if (provided === secret) return null;
  return { statusCode: 401, message: '缺少或错误的 API 密钥。' };
}

// 依次执行所有防护，返回第一个失败项；全部通过返回 null。
export function applyGuards(req) {
  return checkSameOrigin(req) || checkSharedSecret(req) || defaultRateLimiter(req) || null;
}
