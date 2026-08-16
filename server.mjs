import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBrainTurn } from './server/brain.mjs';
import { runTaskGeneration } from './server/task.mjs';

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
    if (size > 1_000_000) throw Object.assign(new Error('Request too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function handleApi(req, res, pathname) {
  if (req.method !== 'POST') return json(res, 405, { error:'Method not allowed.' });
  try {
    const body = await readJson(req);
    if (pathname === '/api/brain') {
      if (!body?.project || typeof body?.userMessage !== 'string') return json(res, 400, { error:'project and userMessage are required.' });
      const result = await runBrainTurn(body);
      return json(res, 200, { result });
    }
    if (pathname === '/api/task') {
      if (!body?.project) return json(res, 400, { error:'project is required.' });
      const task = await runTaskGeneration(body);
      return json(res, 200, { task });
    }
    return json(res, 404, { error:'Not found.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error:error.message || 'Unexpected server error.' });
  }
}

async function serveStatic(req, res, pathname) {
  let requestPath = pathname === '/' ? '/index.html' : pathname;
  requestPath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(ROOT, requestPath);
  if (!filePath.startsWith(ROOT)) return json(res, 403, { error:'Forbidden.' });
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache' });
      res.end(body);
    } catch { json(res, 404, { error:'Not found.' }); }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url.pathname);
  return serveStatic(req, res, decodeURIComponent(url.pathname));
});

server.listen(PORT, () => {
  console.log(`Say2Build running at http://localhost:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? `AI mode: ${process.env.OPENAI_MODEL || 'gpt-5.6'}` : 'AI mode: demo fallback (set OPENAI_API_KEY for live AI)');
});
