import { runTaskGeneration } from '../server/task.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const body = req.body || {};
    if (!body?.project) return res.status(400).json({ error: 'project is required.' });
    const task = await runTaskGeneration(body);
    return res.status(200).json({ task });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unexpected server error.' });
  }
}
