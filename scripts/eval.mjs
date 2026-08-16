import { readFile } from 'node:fs/promises';
import { applyBrainOperations, createEmptyProject } from '../public/modules/brain.js';
import { demoBrainTurn } from '../public/modules/demo-engine.js';

const fixtures = JSON.parse(await readFile(new URL('../evals/fixtures.json', import.meta.url), 'utf8'));
let passed = 0;
let failed = 0;

function basicResultCheck(result) {
  return result && typeof result.assistantReply === 'string' && Array.isArray(result.changes)
    && result.nextAction && typeof result.nextAction.title === 'string';
}

for (const fixture of fixtures) {
  let state = createEmptyProject({ idea:'A lightweight Project Brain test project' });
  // Give non-bootstrap fixtures enough established truth to exercise revision behavior.
  if (fixture.id !== '01-vague-idea') {
    state.identity.targetUsers = ['Beginner AI builders'];
    state.decisions.push({ id:'decision-base', statement:'Keep the MVP local and avoid a complex login system.', rationale:'Lightweight MVP', source:'explicit', status:'confirmed', impact:'high', createdAt:new Date().toISOString(), supersededBy:'' });
    state.constraints.push({ id:'constraint-base', statement:'Avoid adding login unless a core workflow truly requires identity.', reason:'Protect MVP', source:'derived', status:'stable', appliesTo:['product'], createdAt:new Date().toISOString() });
  }
  let ok = true;
  let last = null;
  for (const turn of fixture.turns) {
    last = demoBrainTurn(state, turn, []);
    if (!basicResultCheck(last)) { ok = false; break; }
    state = applyBrainOperations(state, last.changes).state;
  }
  if (fixture.id === '02-you-decide') ok = ok && last.nextAction.canGenerateTask === true;
  if (fixture.id === '04-real-conflict') ok = ok && last.conflicts.length > 0;
  if (fixture.id === '05-feature-creep') ok = ok && state.scope.laterIdeas.length > 0;
  if (fixture.id === '06-no-persist') ok = ok && last.changes.length === 0;
  if (fixture.id === '07-demo-to-product') ok = ok && ['validate','release'].includes(last.nextAction.type);
  if (ok) { passed += 1; console.log(`✓ ${fixture.id}`); }
  else { failed += 1; console.error(`✗ ${fixture.id} — ${fixture.goal}`); }
}

console.log(`\nBehavioral demo eval: ${passed}/${fixtures.length} passed.`);
if (failed) process.exit(1);
