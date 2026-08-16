import { activeDecisions } from './brain.js';

function lower(text) { return String(text || '').toLowerCase(); }
function includesAny(text, values) { const t = lower(text); return values.some((v) => t.includes(v)); }

function baseResult(reply, nextAction) {
  return {
    assistantReply: reply,
    turnType: 'explore',
    understanding: reply,
    changes: [],
    conflicts: [],
    choice: null,
    nextAction,
    stageSignal: { suggestedStage: null, reason: null },
    mode: 'demo',
  };
}

export function demoBrainTurn(state, userMessage, recentMessages = []) {
  const text = String(userMessage || '').trim();
  const lc = lower(text);
  const decisions = activeDecisions(state);
  const isEarly = state.identity.targetUsers.length === 0 || decisions.length < 1;

  const defaultNext = {
    title: state.execution.nextAction?.title || 'Clarify the smallest useful version',
    reason: state.execution.nextAction?.reason || 'This keeps the project moving without over-planning.',
    type: state.execution.nextAction?.type || 'clarify',
    canGenerateTask: Boolean(state.execution.nextAction?.canGenerateTask),
  };

  if (!text) return baseResult('Tell me the thought as it exists in your head. It does not need to be polished.', defaultNext);

  if (includesAny(lc, ['you decide', '你决定', '你来决定', '都行', '随便你'])) {
    const result = baseResult('I’ll choose the lighter path so we can keep moving. We can revise it later if real use proves it wrong.', {
      title: 'Build the first thin slice',
      reason: 'The core direction is clear enough; more planning would add friction without reducing much risk.',
      type: 'build',
      canGenerateTask: true,
    });
    result.turnType = 'decide';
    result.changes = [
      { action: 'add', target: 'decision', statement: 'Prefer the lightest reversible implementation when multiple options are acceptable.', reason: 'The user delegated the choice and values momentum.', source: 'explicit', impact: 'medium' },
      { action: 'update', target: 'stage', statement: 'ready_to_build', reason: 'There is enough clarity for a first build slice.', source: 'derived', impact: 'medium' },
      { action: 'update', target: 'next_action', statement: 'Build the first thin slice', reason: 'A concrete build will produce better evidence than more abstract planning.', source: 'derived', impact: 'medium', nextActionType: 'build', canGenerateTask: true },
    ];
    result.stageSignal = { suggestedStage: 'ready_to_build', reason: 'The user delegated remaining low-risk choices.' };
    return result;
  }

  if (includesAny(lc, ['pdf', '资料', 'material', 'download', '下载']) && !includesAny(lc, ['水印', 'watermark', '名字', 'name on', 'student name'])) {
    const result = baseResult('I read this as a lightweight material-distribution product, not a full learning platform. I’ll keep the first version small and make the distribution flow the center.', {
      title: 'Choose the first distribution flow',
      reason: 'The workflow determines whether this stays simple or needs accounts and backend state.',
      type: 'decide',
      canGenerateTask: false,
    });
    result.turnType = 'clarify';
    result.changes.push(
      { action: 'update', target: 'one_liner', statement: 'A lightweight tool for distributing study materials without turning into a complex learning platform.', reason: 'This best matches the user’s stated intent.', source: 'derived', impact: 'medium' },
      { action: 'add', target: 'target_user', statement: 'Small training teams and their students', reason: 'This is the most likely user group from the distribution context.', source: 'ai_inferred', impact: 'low' },
      { action: 'update', target: 'problem', statement: 'Materials are hard to distribute cleanly and consistently without creating unnecessary operational complexity.', reason: 'This captures the underlying job to be done.', source: 'derived', impact: 'medium' },
      { action: 'add', target: 'in_scope', statement: 'A clear material list and download flow', reason: 'It is the thinnest useful distribution experience.', source: 'derived', impact: 'medium' },
      { action: 'add', target: 'decision', statement: 'Keep the first version lightweight instead of building a full learning platform.', reason: 'The user explicitly wants to avoid unnecessary complexity.', source: 'explicit', impact: 'high' },
      { action: 'update', target: 'stage', statement: 'shaping', reason: 'The product shape is emerging but one workflow decision still matters.', source: 'derived', impact: 'medium' },
    );
    result.choice = {
      question: 'What should the first version optimize for?',
      whyItMatters: 'This decides whether we need search, accounts, or only a clean distribution path.',
      options: [
        { id: 'distribute', label: 'Materials are already organized — make distribution easy', consequence: 'Lightest build. Start with list + download.' },
        { id: 'organize', label: 'Students need to search and organize materials', consequence: 'Adds search, categorization, and more content structure.' },
        { id: 'both', label: 'Both matter', consequence: 'Still possible, but the first release becomes broader.' },
      ],
      recommendedOptionId: 'distribute',
      allowCustomAnswer: true,
    };
    return result;
  }

  if (includesAny(lc, ['水印', 'watermark', '名字', 'name on'])) {
    const existingStatic = decisions.find((d) => includesAny(d.statement, ['static', '静态', 'no account', '不做账号']));
    const result = baseResult('Personalized files are a meaningful change: the product now needs to know who the file belongs to. We can still keep it lightweight, but the download flow can no longer be treated as purely static.', {
      title: 'Choose the lightest personalization method',
      reason: 'Personalization affects file generation and user identification.',
      type: 'decide',
      canGenerateTask: false,
    });
    result.turnType = 'revise';
    result.changes.push({ action: 'add', target: 'in_scope', statement: 'Personalized PDF watermark with the student name', reason: 'The user explicitly requested personalized files.', source: 'explicit', impact: 'high' });
    if (existingStatic) {
      result.conflicts.push({
        id: `conflict-${Date.now()}`,
        summary: 'Personalized downloads change an earlier “fully static” assumption.',
        priorEntityId: existingStatic.id,
        priorStatement: existingStatic.statement,
        newDirection: 'Generate or select a student-specific PDF at download time.',
        impact: 'high',
        recommendedResolution: 'Keep the product lightweight but allow a minimal identity step only for personalized downloads.',
      });
    }
    result.choice = {
      question: 'How should the first MVP create personalized PDFs?',
      whyItMatters: 'This is the first technical choice that materially changes the product shape.',
      options: [
        { id: 'prebuild', label: 'Pre-generate a file for each student', consequence: 'Simplest runtime; best for a small class.' },
        { id: 'dynamic', label: 'Generate the watermark at download time', consequence: 'More flexible, but needs backend processing.' },
        { id: 'later', label: 'Keep watermarking for the next version', consequence: 'Fastest launch, but skips the anti-sharing benefit.' },
      ],
      recommendedOptionId: 'prebuild',
      allowCustomAnswer: true,
    };
    return result;
  }

  if (includesAny(lc, ['社区', 'community', 'feed', 'social'])) {
    const result = baseResult('A community could be useful later, but it changes the product from a focused tool into an ongoing content and moderation system. I would park it for now rather than letting it hijack the MVP.', {
      title: state.execution.nextAction?.title || 'Finish the current core workflow first',
      reason: 'The community idea is high-cost and not required to prove the core value.',
      type: state.execution.nextAction?.type || 'build',
      canGenerateTask: Boolean(state.execution.nextAction?.canGenerateTask),
    });
    result.turnType = 'feedback';
    result.changes.push({ action: 'add', target: 'later_idea', statement: 'Community / social layer', reason: 'Potential future idea, but it would add account, moderation, and operations complexity now.', source: 'explicit', impact: 'high' });
    return result;
  }

  if (includesAny(lc, ['不要登录', 'no login', 'without login'])) {
    const result = baseResult('That is a good MVP guardrail. I’ll treat “no complex account system” as a confirmed product decision, while leaving room for a lightweight identity step later if a feature genuinely requires it.', {
      title: 'Define the first usable no-login workflow',
      reason: 'The product can now be shaped around a simpler entry and storage model.',
      type: 'clarify',
      canGenerateTask: false,
    });
    result.turnType = 'decide';
    result.changes.push(
      { action: 'add', target: 'decision', statement: 'Do not build a complex account system in the MVP.', reason: 'The user explicitly wants a lighter product.', source: 'explicit', impact: 'high' },
      { action: 'add', target: 'constraint', statement: 'Avoid adding login unless a confirmed core workflow truly requires identity.', reason: 'Protect the lightweight MVP from scope creep.', source: 'derived', impact: 'high' },
    );
    return result;
  }

  if (includesAny(lc, ['sync', 'cross-device', 'cross device', 'any device', 'every device', '跨设备', '云同步', '任何设备'])) {
    const prior = decisions.find((d) => includesAny(d.statement, ['no login', 'without login', 'local only', 'local-only', '不做账号', '本地']))
      || state.constraints.find((c) => c.status !== 'superseded' && includesAny(c.statement, ['login', 'local', '账号', '本地']));
    if (prior) {
      const result = baseResult('Cross-device sync is possible, but it changes an earlier lightweight identity/storage assumption. I would not add a full account system just because sync sounds convenient.', {
        title: 'Resolve how important cross-device sync really is',
        reason: 'This choice can add identity, cloud storage, and privacy complexity to the whole product.',
        type: 'decide',
        canGenerateTask: false,
      });
      result.turnType = 'revise';
      result.conflicts.push({
        id: `conflict-${Date.now()}`,
        summary: 'Cross-device sync changes an earlier lightweight/local direction.',
        priorEntityId: prior.id,
        priorStatement: prior.statement,
        newDirection: 'Keep projects synchronized across devices.',
        impact: 'high',
        recommendedResolution: 'Keep local storage for the MVP and park cross-device sync until real use proves it matters.',
      });
      result.choice = {
        question: 'What should we do with cross-device sync?',
        whyItMatters: 'It can turn a local-first tool into an account + cloud-storage product.',
        options: [
          { id: 'later', label: 'Keep it local for MVP; put sync in Later', consequence: 'Preserves the lightweight launch.' },
          { id: 'light-account', label: 'Add a lightweight account only for sync', consequence: 'More infrastructure, but keeps the product goal focused.' },
          { id: 'must-sync', label: 'Make cross-device sync core now', consequence: 'The architecture and onboarding both become more complex.' },
        ],
        recommendedOptionId: 'later',
        allowCustomAnswer: true,
      };
      return result;
    }
  }

  if (includesAny(lc, ['core flow now works', 'friends can use', 'people can use it', 'usable mvp', '已经能用了', '可以用了', '有人能用'])) {
    const result = baseResult('The core flow sounds usable now. Before adding more imagined features, the highest-value next step is to put it in front of a few real people and watch where they get stuck.', {
      title: 'Run a small real-user validation',
      reason: 'A usable MVP creates better evidence through real use than through more speculative planning.',
      type: 'validate',
      canGenerateTask: false,
    });
    result.turnType = 'feedback';
    result.changes.push(
      { action: 'update', target: 'stage', statement: 'usable_mvp', reason: 'The user reports that the core flow works for other people.', source: 'explicit', impact: 'medium' },
      { action: 'update', target: 'next_action', statement: 'Run a small real-user validation', reason: 'Collect real friction before expanding scope.', source: 'derived', impact: 'medium', nextActionType: 'validate', canGenerateTask: false },
    );
    result.stageSignal = { suggestedStage: 'usable_mvp', reason: 'The core flow is reportedly usable.' };
    return result;
  }

  if (includesAny(lc, ['部署', 'deploy', '上线', 'release'])) {
    const result = baseResult('You are no longer just making a demo. The next useful step is to make the current version reachable and testable by real people before adding more features.', {
      title: 'Prepare a shareable release',
      reason: 'The project has enough shape that real feedback is more valuable than another speculative feature.',
      type: 'release',
      canGenerateTask: true,
    });
    result.turnType = 'decide';
    result.changes.push(
      { action: 'update', target: 'stage', statement: 'releasing', reason: 'The user is explicitly moving toward a shareable version.', source: 'explicit', impact: 'medium' },
      { action: 'update', target: 'next_action', statement: 'Prepare a shareable release', reason: 'Deployment and basic release hygiene are now the highest-value next step.', source: 'derived', impact: 'medium', nextActionType: 'release', canGenerateTask: true },
    );
    result.stageSignal = { suggestedStage: 'releasing', reason: 'The user wants to put the project online.' };
    return result;
  }

  if (!isEarly && includesAny(lc, ['two pixels', '2px', 'font size', 'headline smaller', 'button smaller', '间距小一点', '字号小一点', '标题小一点', '颜色浅一点'])) {
    return baseResult('That sounds like a local implementation tweak, not something the long-term Project Brain needs to remember. I’d let the coding task handle it without turning it into project policy.', defaultNext);
  }

  if (isEarly) {
    const result = baseResult(`I can work with that. My current read is: “${text}”. I won’t force a full PRD yet — I only want to settle the one choice that most changes the first version.`, {
      title: 'Choose the first user and smallest useful outcome',
      reason: 'A small user + small problem is enough to start without over-planning.',
      type: 'clarify',
      canGenerateTask: false,
    });
    result.turnType = 'clarify';
    result.changes.push(
      { action: 'update', target: 'one_liner', statement: text, reason: 'This is the user’s explicit starting idea.', source: 'explicit', impact: 'medium' },
      { action: 'update', target: 'stage', statement: 'shaping', reason: 'The idea is concrete enough to start narrowing the MVP.', source: 'derived', impact: 'low' },
    );
    result.choice = {
      question: 'Which direction should the first version favor?',
      whyItMatters: 'This keeps the first build useful without making you design the whole product up front.',
      options: [
        { id: 'simple', label: 'One clear job, done simply', consequence: 'Fastest path to a usable MVP.' },
        { id: 'flexible', label: 'A broader tool with room to grow', consequence: 'More flexible, but more decisions before building.' },
        { id: 'showcase', label: 'A polished demo first', consequence: 'Optimizes presentation before deeper product proof.' },
      ],
      recommendedOptionId: 'simple',
      allowCustomAnswer: true,
    };
    return result;
  }

  const result = baseResult('This sounds like a useful refinement rather than a reason to restart the project. I’ll keep the confirmed direction and only persist the part that will matter later.', defaultNext);
  result.turnType = 'revise';
  const shouldPersist = text.length > 28 || includesAny(lc, ['必须', 'must', '不要', 'should', '以后', 'later', 'first version', '第一版']);
  if (shouldPersist) {
    result.changes.push({ action: 'add', target: 'decision', statement: text, reason: 'The user phrased this as a project-level direction rather than a tiny visual tweak.', source: 'explicit', impact: 'medium' });
  }
  return result;
}

export function demoChoiceResult(state, choice, option) {
  const label = option?.label || choice?.question || 'Use the recommendation';
  const result = baseResult(`Got it. I’ll use “${label}” as the current direction. This is enough to move forward; we can revise it later if the build teaches us something different.`, {
    title: 'Build the first useful slice',
    reason: 'The highest-impact ambiguity is resolved, so a concrete build will create better evidence than more planning.',
    type: 'build',
    canGenerateTask: true,
  });
  result.turnType = 'decide';
  result.changes = [
    { action: 'add', target: 'decision', statement: label, reason: 'The user selected this option.', source: 'explicit', impact: 'high' },
    { action: 'update', target: 'stage', statement: 'ready_to_build', reason: 'The core direction is now clear enough for a first implementation.', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'next_action', statement: 'Build the first useful slice', reason: 'The main ambiguity is resolved.', source: 'derived', impact: 'medium', nextActionType: 'build', canGenerateTask: true },
  ];
  result.stageSignal = { suggestedStage: 'ready_to_build', reason: 'A high-impact product choice has been resolved.' };
  return result;
}
