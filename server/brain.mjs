import { createStructuredResponse } from './openai.mjs';

const stages = ['exploring','shaping','ready_to_build','building','usable_mvp','validating','releasing','iterating'];
const changeActions = ['add','update','confirm','move_to_later','supersede','resolve'];
const changeTargets = ['one_liner','problem','target_user','current_goal','core_workflow','in_scope','later_idea','non_goal','decision','constraint','open_question','stage','next_action'];
const sources = ['explicit','ai_inferred','derived'];
const impacts = ['low','medium','high'];
const nextTypes = ['clarify','decide','build','test','validate','release'];

const brainTurnSchema = {
  type: 'object', additionalProperties: false,
  required: ['assistantReply','turnType','understanding','changes','conflicts','choice','nextAction','stageSignal'],
  properties: {
    assistantReply: { type: 'string' },
    turnType: { type: 'string', enum: ['explore','clarify','decide','revise','request_task','question','feedback'] },
    understanding: { type: 'string' },
    changes: {
      type: 'array', maxItems: 10,
      items: {
        type: 'object', additionalProperties: false,
        required: ['action','target','statement','reason','source','impact','entityId','supersedesId','nextActionType','canGenerateTask'],
        properties: {
          action: { type: 'string', enum: changeActions },
          target: { type: 'string', enum: changeTargets },
          statement: { type: 'string' },
          reason: { type: 'string' },
          source: { type: 'string', enum: sources },
          impact: { type: 'string', enum: impacts },
          entityId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          supersedesId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          nextActionType: { anyOf: [{ type: 'string', enum: nextTypes }, { type: 'null' }] },
          canGenerateTask: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
        },
      },
    },
    conflicts: {
      type: 'array', maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id','summary','priorEntityId','priorStatement','newDirection','impact','recommendedResolution'],
        properties: {
          id: { type: 'string' }, summary: { type: 'string' }, priorEntityId: { type: 'string' },
          priorStatement: { type: 'string' }, newDirection: { type: 'string' },
          impact: { type: 'string', enum: ['medium','high'] }, recommendedResolution: { type: 'string' },
        },
      },
    },
    choice: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object', additionalProperties: false,
          required: ['question','whyItMatters','options','recommendedOptionId','allowCustomAnswer'],
          properties: {
            question: { type: 'string' }, whyItMatters: { type: 'string' },
            options: {
              type: 'array', minItems: 2, maxItems: 4,
              items: {
                type: 'object', additionalProperties: false,
                required: ['id','label','consequence'],
                properties: { id: { type: 'string' }, label: { type: 'string' }, consequence: { type: 'string' } },
              },
            },
            recommendedOptionId: { type: 'string' }, allowCustomAnswer: { type: 'boolean', const: true },
          },
        },
      ],
    },
    nextAction: {
      type: 'object', additionalProperties: false,
      required: ['title','reason','type','canGenerateTask'],
      properties: {
        title: { type: 'string' }, reason: { type: 'string' },
        type: { type: 'string', enum: nextTypes }, canGenerateTask: { type: 'boolean' },
      },
    },
    stageSignal: {
      type: 'object', additionalProperties: false,
      required: ['suggestedStage','reason'],
      properties: {
        suggestedStage: { anyOf: [{ type: 'string', enum: stages }, { type: 'null' }] },
        reason: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
    },
  },
};

const SYSTEM = `You are the Project Brain inside Say2Build, a lightweight planning layer for beginner AI builders who use coding agents.

Your job is not to write code. Your job is to keep the project's current truth clear while the user thinks naturally and changes their mind.

Behavior:
- Reply in the same language as the user.
- Treat vague ideas as valid input. Do not demand a PRD or technical vocabulary.
- Ask less, think more. Make low-risk reversible assumptions yourself.
- If an ambiguity truly changes product shape, offer 2-4 understandable choices and recommend one.
- When the user says “you decide”, actually decide.
- Do not persist every sentence. Persist only information likely to matter later.
- A casual idea is not confirmed scope. Park speculative features as later ideas.
- Users may change their mind. If a new direction conflicts with an active confirmed decision or stable constraint, surface a conflict instead of silently stacking both.
- Never silently replace a confirmed high-impact decision with an AI inference.
- Distinguish user-explicit facts from AI-inferred and derived information.
- Keep the project light. Do not add accounts, databases, payments, communities, dashboards, or other “professional” features unless the problem needs them.
- Use plain language first. Introduce professional terms parenthetically only when useful.
- Always leave one concrete next action. “Continue refining requirements” is not concrete.
- When the project is clear enough, stop planning and recommend a build task.
- Project stages are guidance, never gates.

Change protocol:
- Return only incremental proposed changes. Never rewrite the whole Project Brain.
- It is valid to return changes: [] for a conversational turn that should not persist.
- For a supersede operation, use the exact active entity id from the supplied state.
- For next_action changes, set nextActionType and canGenerateTask.
- If you recommend a choice, the recommendedOptionId must match one of the option ids.
`;

function compactProject(project) {
  const clone = structuredClone(project || {});
  if (clone?.history?.importantRevisions?.length > 10) clone.history.importantRevisions = clone.history.importantRevisions.slice(-10);
  return clone;
}

export async function runBrainTurn({ project, recentMessages = [], userMessage }) {
  const input = JSON.stringify({
    project: compactProject(project),
    recentMessages: recentMessages.slice(-10).map(({ role, content }) => ({ role, content })),
    latestUserMessage: userMessage,
  });
  return createStructuredResponse({ name: 'say2build_brain_turn', schema: brainTurnSchema, instructions: SYSTEM, input });
}
