const OPENAI_URL = 'https://api.openai.com/v1/responses';

export function openAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text;
  const pieces = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content?.text === 'string') {
        pieces.push(content.text);
      }
    }
  }
  return pieces.join('\n').trim();
}

export async function createStructuredResponse({ name, schema, instructions, input }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
      store: false,
      instructions,
      input,
      text: {
        format: {
          type: 'json_schema',
          name,
          strict: true,
          schema,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  const raw = extractOutputText(payload);
  if (!raw) throw new Error('The model returned no structured output.');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('The model response could not be parsed as JSON.');
  }
}
