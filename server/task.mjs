import { createStructuredResponse } from './openai.mjs';

const taskSchema = {
  type: 'object', additionalProperties: false,
  required: ['id','title','objective','whyNow','context','inScope','outOfScope','preserve','implementationNotes','acceptanceCriteria','relevantArtifacts','completionReport'],
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, objective: { type: 'string' }, whyNow: { type: 'string' },
    context: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    inScope: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    outOfScope: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    preserve: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    implementationNotes: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    acceptanceCriteria: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 12 },
    relevantArtifacts: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    completionReport: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
  },
};

const SYSTEM = `You create one focused coding-agent task from a Say2Build Project Brain.
- The task must be understandable in one independent Codex / Claude Code session.
- Use only project facts supplied in the Project Brain. Never invent repo paths, commands, technologies, APIs, or files that are not known.
- Keep scope narrow enough to complete and verify.
- Preserve current confirmed decisions and stable constraints.
- Out of scope should block obvious feature creep.
- Acceptance criteria must be observable.
- Completion report should ask for what changed, files changed, verification, and unresolved items.
- Use the same language as the project content when possible.
- Set id to task-001; the client may renumber it deterministically.
`;

export async function runTaskGeneration({ project }) {
  return createStructuredResponse({
    name: 'say2build_task', schema: taskSchema, instructions: SYSTEM,
    input: JSON.stringify({ project }),
  });
}
