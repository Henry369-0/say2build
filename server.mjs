import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runBrainTurn } from './server/brain.mjs';
import { runTaskGeneration } from './server/task.mjs';
import { applyGuards } from './server/guard.mjs';

const ROOT = fileURLToPath(new URL('./public/', import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif', '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8', '.ico':'image/x-icon',
};

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw Object.assign(new Error('请求体太大。'), { statusCode: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8') || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('请求体不是合法的 JSON。'), { statusCode: 400 });
  }
}

async function handleApi(req, res, pathname) {
  const guardError = applyGuards(req);
  if (guardError) return json(res, guardError.statusCode, { error: guardError.message });
  if (req.method !== 'POST') return json(res, 405, { error:'请求方法不允许。' });
  try {
    const body = await readJson(req);
    if (pathname === '/api/brain') {
      if (!body?.project || typeof body?.userMessage !== 'string') return json(res, 400, { error:'缺少 project 或 userMessage。' });
      const result = await runBrainTurn(body);
      return json(res, 200, { result });
    }
    if (pathname === '/api/task') {
      if (!body?.project) return json(res, 400, { error:'缺少 project。' });
      const task = await runTaskGeneration(body);
      return json(res, 200, { task });
    }
    return json(res, 404, { error:'接口不存在。' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || '服务器内部错误。' });
  }
}

async function serveStatic(req, res, pathname) {
  let requestPath = pathname === '/' ? '/index.html' : pathname;
  requestPath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(ROOT, requestPath);
  if (!filePath.startsWith(ROOT)) return json(res, 403, { error:'禁止访问。' });
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache' });
      res.end(body);
    } catch { json(res, 404, { error:'未找到。' }); }
  }
}

export function createAppServer() {
  return http.createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname);
    } catch {
      return json(res, 400, { error:'请求路径不合法。' });
    }
    if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
    return serveStatic(req, res, pathname);
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const server = createAppServer();
  server.listen(PORT, () => {
    console.log(`Say2Build running at http://localhost:${PORT}`);
    console.log(process.env.OPENAI_API_KEY ? `AI mode: ${process.env.OPENAI_MODEL || 'gpt-5.6'}` : 'AI mode: demo fallback (set OPENAI_API_KEY for live AI)');
  });
}
