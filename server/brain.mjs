import { createStructuredResponse } from './openai.mjs';
import { brainTurnSchema, BRAIN_SYSTEM } from '../public/modules/contracts.js';

function compactProject(project) {
  const clone = structuredClone(project || {});
  if (clone?.history?.importantRevisions?.length > 10) clone.history.importantRevisions = clone.history.importantRevisions.slice(-10);
  return clone;
}

export async function runBrainTurn({ project, recentMessages = [], userMessage, choice = null }) {
  const input = JSON.stringify({
    project: compactProject(project),
    recentMessages: recentMessages.slice(-10).map(({ role, content }) => ({ role, content })),
    latestUserMessage: userMessage,
    ...(choice ? { answeredChoice: choice } : {}),
  });
  return createStructuredResponse({ name: 'say2build_brain_turn', schema: brainTurnSchema, instructions: BRAIN_SYSTEM, input });
}
