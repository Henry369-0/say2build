import { runTaskGeneration } from '../server/task.mjs';
import { applyGuards } from '../server/guard.mjs';

export default async function handler(req, res) {
  const guardError = applyGuards(req);
  if (guardError) return res.status(guardError.statusCode).json({ error: guardError.message });
  if (req.method !== 'POST') return res.status(405).json({ error: '请求方法不允许。' });
  try {
    const body = req.body || {};
    if (!body?.project) return res.status(400).json({ error: '缺少 project。' });
    const task = await runTaskGeneration(body);
    return res.status(200).json({ task });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || '服务器内部错误。' });
  }
}
