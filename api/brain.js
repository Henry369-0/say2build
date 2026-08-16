import { runBrainTurn } from '../server/brain.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const body = req.body || {};
    if (!body?.project || typeof body?.userMessage !== 'string') return res.status(400).json({ error: 'project and userMessage are required.' });
    const result = await runBrainTurn(body);
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unexpected server error.' });
  }
}
