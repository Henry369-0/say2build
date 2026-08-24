import { createStructuredResponse } from './openai.mjs';
import { taskSchema, TASK_SYSTEM } from '../public/modules/contracts.js';

export async function runTaskGeneration({ project }) {
  return createStructuredResponse({
    name: 'say2build_task', schema: taskSchema, instructions: TASK_SYSTEM,
    input: JSON.stringify({ project }),
  });
}
