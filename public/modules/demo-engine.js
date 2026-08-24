import { activeConstraints, activeDecisions } from './brain.js';

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

function currentNext(state) {
  return {
    title: state.execution.nextAction?.title || '先确定第一个能用的版本形态',
    reason: state.execution.nextAction?.reason || '这能让项目继续往前走，又不会过度规划。',
    type: state.execution.nextAction?.type || 'clarify',
    canGenerateTask: Boolean(state.execution.nextAction?.canGenerateTask),
  };
}

// ---- 选择卡片识别 ---------------------------------------------------------

function normalizeChoiceText(text) {
  return String(text || '').trim()
    .replace(/^(我选择|我选|选择|就选|选第[一二三四1-4]个|就用|用|决定用|采纳|请用|选|choose|use|pick|i pick|i choose|i select)[:：\s]*/i, '')
    .trim();
}

function findSelectedOption(userMessage, recentMessages) {
  const cleaned = normalizeChoiceText(userMessage);
  if (!cleaned) return null;
  for (const msg of [...(recentMessages || [])].reverse()) {
    if (!msg?.choice?.options) continue;
    for (const option of msg.choice.options) {
      if (option?.label && cleaned === option.label) return { choice: msg.choice, option };
    }
  }
  return null;
}

function decidedResult(choice, option) {
  const label = (option && option.label) || choice?.question || '采纳推荐方案';
  const result = baseResult(
    `好，就按「${label}」来。这个方向已经足够清楚，先做出第一个能用的版本；实际用下来如果发现不对，随时可以改。`,
    { title: '做出第一个能用的版本', reason: '影响产品形态的关键选择已经定下来，实际动手比继续规划更有价值。', type: 'build', canGenerateTask: true },
  );
  result.turnType = 'decide';
  result.changes = [
    { action: 'add', target: 'decision', statement: label, reason: '用户选择了这个方向。', source: 'explicit', impact: 'high' },
    { action: 'update', target: 'current_focus', statement: '实现第一个能用的核心流程', reason: '核心方向已定，聚焦最小可用的实现。', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'stage', statement: 'ready_to_build', reason: '核心方向已足够清晰，可以开始第一次实现。', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'next_action', statement: '做出第一个能用的版本', reason: '主要的不确定已经解决。', source: 'derived', impact: 'medium', nextActionType: 'build', canGenerateTask: true },
  ];
  result.stageSignal = { suggestedStage: 'ready_to_build', reason: '影响产品形态的关键选择已经解决。' };
  return result;
}

// ---- 行为处理器 ------------------------------------------------------------

function handleDelegate(state) {
  const result = baseResult('我按更轻的路径来，先保持推进。如果实际用下来证明这个选择不对，随时可以改。', {
    title: '先做出第一版最薄的部分',
    reason: '大方向已经清楚，继续规划只会增加摩擦，不会降低多少风险。',
    type: 'build',
    canGenerateTask: true,
  });
  result.turnType = 'decide';
  result.changes = [
    { action: 'add', target: 'decision', statement: '多个方案都可接受时，优先选择最简单、可逆的实现。', reason: '用户把选择权交给了 AI，且看重推进速度。', source: 'explicit', impact: 'medium' },
    { action: 'update', target: 'current_focus', statement: '确定第一个最薄的可实现切片', reason: '方向清晰，聚焦动手。', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'stage', statement: 'ready_to_build', reason: '已经足够清楚，可以开始第一个构建切片。', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'next_action', statement: '先做出第一版最薄的部分', reason: '一个具体的构建比继续抽象规划能带来更好的证据。', source: 'derived', impact: 'medium', nextActionType: 'build', canGenerateTask: true },
  ];
  result.stageSignal = { suggestedStage: 'ready_to_build', reason: '用户委托了剩余的低风险选择。' };
  return result;
}

function handlePersonalization(state) {
  const existingStatic = activeDecisions(state).find((d) => includesAny(d.statement, ['static', '静态', 'no account', '不做账号', '无需登录', '本地']));
  const result = baseResult('个性化文件是一个有分量的变化：产品现在需要知道这份文件属于谁。仍然可以保持轻量，但下载流程不能再当作纯静态来处理。', {
    title: '选择最轻的个性化实现方式',
    reason: '个性化会影响文件生成和用户识别方式。',
    type: 'decide',
    canGenerateTask: false,
  });
  result.turnType = 'revise';
  result.changes.push(
    { action: 'add', target: 'in_scope', statement: '带名字的个性化文件（如 PDF 水印）', reason: '用户明确要求个性化文件。', source: 'explicit', impact: 'high' },
    { action: 'update', target: 'current_focus', statement: '确定个性化文件的最小实现方式', reason: '个性化会影响文件生成和身份识别。', source: 'derived', impact: 'medium' },
  );
  if (existingStatic) {
    result.conflicts.push({
      id: `conflict-${Date.now()}`,
      summary: '个性化下载改变了之前「完全静态」的假设。',
      priorEntityId: existingStatic.id,
      priorStatement: existingStatic.statement,
      newDirection: '在下载时生成或选择一份属于特定用户的文件。',
      impact: 'high',
      recommendedResolution: '产品保持轻量，但只在个性化下载这一步引入最小限度的身份信息。',
    });
  }
  result.choice = {
    question: '第一版 MVP 如何生成个性化文件？',
    whyItMatters: '这是第一个会实质影响产品形态的技术选择。',
    options: [
      { id: 'prebuild', label: '为每个用户预生成一份文件', consequence: '运行期最简单，适合人数不多的情况。' },
      { id: 'dynamic', label: '下载时动态生成水印', consequence: '更灵活，但需要后端处理。' },
      { id: 'later', label: '个性化放到下一版再做', consequence: '最快上线，但放弃防扩散的收益。' },
    ],
    recommendedOptionId: 'prebuild',
    allowCustomAnswer: true,
  };
  return result;
}

function handleDistribution(state, text) {
  // 已经在分发流程上成型过的项目，再提到相关内容就当作补充范围，而不是重新问一遍选择
  const alreadyShaped = activeDecisions(state).some((d) => includesAny(d.statement, ['轻量', 'lightweight', '不做成完整平台']));
  if (alreadyShaped) {
    const result = baseResult('好的，我把它加进第一版范围。', currentNext(state));
    result.turnType = 'decide';
    result.changes.push({ action: 'add', target: 'in_scope', statement: text, reason: '用户补充了第一版范围。', source: 'explicit', impact: 'medium' });
    return result;
  }
  const result = baseResult('我把它理解成一个轻量的内容/资料分发工具，而不是一个完整的学习平台。第一版保持小，以分发流程为核心。', {
    title: '确定第一个分发流程',
    reason: '流程形态决定了它是保持简单，还是需要账号和后端状态。',
    type: 'decide',
    canGenerateTask: false,
  });
  result.turnType = 'clarify';
  result.changes.push(
    { action: 'update', target: 'one_liner', statement: '一个轻量的内容/资料分发工具，不做成复杂的平台。', reason: '这最符合用户表达的意图。', source: 'derived', impact: 'medium' },
    { action: 'add', target: 'target_user', statement: '小规模团队和他们的成员', reason: '从分发场景看这是最可能的使用人群。', source: 'ai_inferred', impact: 'low' },
    { action: 'update', target: 'problem', statement: '内容/资料难以干净、一致地分发，同时不引入不必要的运营复杂度。', reason: '这抓住了要解决的核心问题。', source: 'derived', impact: 'medium' },
    { action: 'add', target: 'in_scope', statement: '清晰的内容/资料列表与下载流程', reason: '这是最薄但最有用的分发体验。', source: 'derived', impact: 'medium' },
    { action: 'add', target: 'decision', statement: '第一版保持轻量，不做成完整平台。', reason: '用户明确希望避免不必要的复杂度。', source: 'explicit', impact: 'high' },
    { action: 'update', target: 'current_focus', statement: '确定第一个分发流程的形态', reason: '这个选择决定后续是否需要搜索、账号等能力。', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'stage', statement: 'shaping', reason: '产品形态正在成型，还有一个关键流程选择。', source: 'derived', impact: 'medium' },
  );
  result.choice = {
    question: '第一版优先把哪件事做好？',
    whyItMatters: '这决定了是否需要搜索、账号，还是只需要一条干净的分发路径。',
    options: [
      { id: 'distribute', label: '内容已经整理好——把分发做顺', consequence: '最轻的构建：从列表 + 下载开始。' },
      { id: 'organize', label: '成员需要搜索和整理内容', consequence: '需要加入搜索、分类和更多内容结构。' },
      { id: 'both', label: '两者都重要', consequence: '也成立，但第一版的范围会变大。' },
    ],
    recommendedOptionId: 'distribute',
    allowCustomAnswer: true,
  };
  return result;
}

function handleStorage(state) {
  const result = baseResult('好的，「本地优先」是一个值得长期记住的方向。我把它记为已确认的决策；云同步这类需求，等真实使用证明它重要再说。', currentNext(state));
  result.turnType = 'decide';
  result.changes.push(
    { action: 'add', target: 'decision', statement: '优先本地存储，数据默认保存在本机。', reason: '用户明确希望保持本地优先。', source: 'explicit', impact: 'high' },
    { action: 'update', target: 'current_focus', statement: '围绕本地优先设计数据与流程', reason: '本地优先会影响存储与同步相关决策。', source: 'derived', impact: 'low' },
  );
  return result;
}

function handleIdentity(state, text) {
  const negated = includesAny(text, ['不要', '不搞', '不做', '不需要', 'no', 'without', 'never', '没有']);
  if (negated) {
    const result = baseResult('这是一个很好的 MVP 护栏。我把「MVP 不做复杂账号体系」记为已确认的产品决策，同时给未来真正需要身份的功能留一个轻量入口。', {
      title: '定义第一个无需登录的可用流程',
      reason: '产品现在可以围绕更简单的入口和存储模型来成型。',
      type: 'clarify',
      canGenerateTask: false,
    });
    result.turnType = 'decide';
    result.changes.push(
      { action: 'add', target: 'decision', statement: 'MVP 不做复杂的账号体系。', reason: '用户明确想要更轻的产品。', source: 'explicit', impact: 'high' },
      { action: 'add', target: 'constraint', statement: '除非某个已确认的核心流程确实需要身份，否则不引入登录。', reason: '保护轻量 MVP，防止范围蔓延。', source: 'derived', impact: 'high' },
    );
    return result;
  }
  const result = baseResult('需要账号是一个有分量的决定：它会影响入口、数据存储和隐私。先记下来，但第一版是否要完整的账号体系，值得再确认一下范围。', {
    title: '确认账号体系的最小范围',
    reason: '账号会影响整个产品的形态和复杂度。',
    type: 'decide',
    canGenerateTask: false,
  });
  result.turnType = 'decide';
  result.changes.push(
    { action: 'add', target: 'decision', statement: '产品需要登录 / 账号能力。', reason: '用户明确提出了账号需求。', source: 'explicit', impact: 'high' },
  );
  result.choice = {
    question: '账号体系做到什么程度？',
    whyItMatters: '完整账号体系会显著增加 MVP 的复杂度。',
    options: [
      { id: 'minimal', label: '只做最小的身份标识（如昵称 / 邮箱）', consequence: '足以支持个性化，复杂度可控。' },
      { id: 'full', label: '完整注册 / 登录 / 密码体系', consequence: '体验完整，但第一版成本明显上升。' },
      { id: 'later', label: '先不做账号，记为待定', consequence: 'MVP 最快，后续再补。' },
    ],
    recommendedOptionId: 'minimal',
    allowCustomAnswer: true,
  };
  return result;
}

function handleSync(state) {
  const prior = activeDecisions(state).find((d) => includesAny(d.statement, ['本地', 'local', 'no login', 'without login', '不做账号']))
    || activeConstraints(state).find((c) => includesAny(c.statement, ['登录', 'login', '本地', 'local']));
  if (prior) {
    const result = baseResult('跨设备同步可以做，但它会改变之前「轻量 / 本地」的假设。我不会只因为「同步听起来方便」就引入一整套账号体系。', {
      title: '确认跨设备同步到底有多重要',
      reason: '这个选择可能给整个产品引入身份、云存储和隐私复杂度。',
      type: 'decide',
      canGenerateTask: false,
    });
    result.turnType = 'revise';
    result.conflicts.push({
      id: `conflict-${Date.now()}`,
      summary: '跨设备同步改变了之前「轻量 / 本地」的方向。',
      priorEntityId: prior.id,
      priorStatement: prior.statement,
      newDirection: '让项目在多个设备间保持同步。',
      impact: 'high',
      recommendedResolution: 'MVP 保持本地存储，把跨设备同步放入「以后再说」，等真实使用证明它重要再考虑。',
    });
    result.choice = {
      question: '跨设备同步怎么处理？',
      whyItMatters: '它可能把一个本地优先的工具变成「账号 + 云存储」产品。',
      options: [
        { id: 'later', label: 'MVP 保持本地，同步放入「以后再说」', consequence: '保持轻量发布。' },
        { id: 'light-account', label: '只为了同步加一个轻量账号', consequence: '多了一些基础设施，但产品目标仍然聚焦。' },
        { id: 'must-sync', label: '现在就把跨设备同步作为核心', consequence: '架构和上手复杂度都会明显上升。' },
      ],
      recommendedOptionId: 'later',
      allowCustomAnswer: true,
    };
    return result;
  }
  const result = baseResult('跨设备同步会带来身份和云存储的复杂度。第一版我倾向于先不做，把它放进「以后再说」。', {
    title: state.execution.nextAction?.title || '先完成核心流程，再考虑同步',
    reason: '同步不是证明核心价值所必需的。',
    type: state.execution.nextAction?.type || 'build',
    canGenerateTask: Boolean(state.execution.nextAction?.canGenerateTask),
  });
  result.turnType = 'feedback';
  result.changes.push({ action: 'add', target: 'later_idea', statement: '跨设备云同步', reason: '可能以后需要，但会给 MVP 引入账号和云存储复杂度。', source: 'explicit', impact: 'high' });
  return result;
}

function makeParkHandler(ideaStatement, reason) {
  return function handlePark(state) {
    const result = baseResult('这个想法现在加上去，会把产品从「聚焦的小工具」变成需要持续运营的系统。我建议先放进「以后再说」，不让它在 MVP 阶段抢走焦点。', {
      title: state.execution.nextAction?.title || '先完成当前核心流程',
      reason: `${ideaStatement}成本高，而且不是证明核心价值所必需的。`,
      type: state.execution.nextAction?.type || 'build',
      canGenerateTask: Boolean(state.execution.nextAction?.canGenerateTask),
    });
    result.turnType = 'feedback';
    result.changes.push({ action: 'add', target: 'later_idea', statement: ideaStatement, reason, source: 'explicit', impact: 'high' });
    return result;
  };
}

function handleRelease(state) {
  const result = baseResult('你不再只是做一个 demo 了。当前最有价值的下一步，是让现有版本能被真实用户访问和试用，而不是继续加想象中的功能。', {
    title: '准备一个可分享的发布版本',
    reason: '项目形态已经足够，真实反馈比又一个设想中的功能更有价值。',
    type: 'release',
    canGenerateTask: true,
  });
  result.turnType = 'decide';
  result.changes.push(
    { action: 'update', target: 'stage', statement: 'releasing', reason: '用户明确在走向可分享的版本。', source: 'explicit', impact: 'medium' },
    { action: 'update', target: 'current_focus', statement: '准备可分享的发布版本', reason: '部署和发布准备现在是最高价值的下一步。', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'next_action', statement: '准备一个可分享的发布版本', reason: '让真实用户能访问，比继续加功能更有价值。', source: 'derived', impact: 'medium', nextActionType: 'release', canGenerateTask: true },
  );
  result.stageSignal = { suggestedStage: 'releasing', reason: '用户想把项目发布上线。' };
  return result;
}

function handleValidate(state) {
  const result = baseResult('核心流程听起来已经能用了。在继续加想象中的功能之前，最高价值的下一步是把它放到几个真实用户面前，看他们卡在哪里。', {
    title: '做一轮小范围真实用户验证',
    reason: '可用的 MVP 通过真实使用带来的证据，比继续推测性规划更有价值。',
    type: 'validate',
    canGenerateTask: false,
  });
  result.turnType = 'feedback';
  result.changes.push(
    { action: 'update', target: 'stage', statement: 'usable_mvp', reason: '用户反馈核心流程已经可用。', source: 'explicit', impact: 'medium' },
    { action: 'update', target: 'current_focus', statement: '收集真实使用中的卡点', reason: '真实摩擦比想象更能指导下一步。', source: 'derived', impact: 'medium' },
    { action: 'update', target: 'next_action', statement: '做一轮小范围真实用户验证', reason: '先收集真实摩擦，再决定是否扩范围。', source: 'derived', impact: 'medium', nextActionType: 'validate', canGenerateTask: false },
  );
  result.stageSignal = { suggestedStage: 'usable_mvp', reason: '核心流程据反馈已经可用。' };
  return result;
}

function handleTweak(state) {
  return baseResult('这听起来是具体实现里的小调整，不需要项目大脑长期记住。让编码任务顺手处理就行，不用变成项目级规则。', currentNext(state));
}

// ---- 需求澄清引导的应答处理器 ------------------------------------------------

const NEGATION = ['不用', '算了', '没有', '不需要', '先这样', '不知道', '还没想好', 'skip', 'none', 'nothing', 'not sure'];

function handleAudience(state, text) {
  if (includesAny(text, NEGATION)) {
    return baseResult('没关系，先用一个假设的人群开始，后面随时可以改。', currentNext(state));
  }
  const cleaned = String(text).replace(/^(主要是给|主要给|给|面向|为|用户是|目标用户是|主要用户)\s*/i, '').replace(/(用|使用)$/i, '').trim() || text;
  const result = baseResult(`好，「${cleaned}」就是主要用户。后面围绕这个人群收窄范围。`, currentNext(state));
  result.turnType = 'decide';
  result.changes.push({ action: 'add', target: 'target_user', statement: cleaned, reason: '用户明确了目标人群。', source: 'explicit', impact: 'medium' });
  return result;
}

function handleProblem(state, text) {
  if (includesAny(text, NEGATION)) {
    return baseResult('没关系，先从一个大概的印象开始，边做边把问题说清楚。', currentNext(state));
  }
  const cleaned = String(text).replace(/^(主要)?(问题|痛点)(是|在于|就是)?[:：]?\s*/i, '').replace(/[。.]+$/, '').trim() || text;
  const result = baseResult(`明白了，核心问题记成：「${cleaned}」。`, currentNext(state));
  result.turnType = 'decide';
  result.changes.push({ action: 'update', target: 'problem', statement: cleaned, reason: '用户说清了要解决的问题。', source: 'explicit', impact: 'medium' });
  return result;
}

function handleWorkflow(state, text) {
  if (includesAny(text, NEGATION)) {
    return baseResult('没关系，先从一个大概的流程开始，后面再细化。', currentNext(state));
  }
  const cleaned = String(text).replace(/^(核心)?(流程|步骤)(是|就是)?[:：]?\s*/i, '').trim();
  const steps = cleaned.split(/[，,、;；→>]+/).map((s) => s.trim()).filter(Boolean);
  const items = steps.length ? steps : [cleaned || text];
  const result = baseResult('好，核心流程我记下来了。', currentNext(state));
  result.turnType = 'decide';
  result.changes.push(...items.map((statement, index) => ({
    action: 'add', target: 'core_workflow', statement,
    reason: '用户描述了核心流程。', source: 'explicit', impact: index === 0 ? 'medium' : 'low',
  })));
  return result;
}

function handleScopeAdd(state, text) {
  if (includesAny(text, NEGATION)) {
    return baseResult('好的，那先保持当前范围，想到再补。', currentNext(state));
  }
  const items = String(text).split(/[，,、;；]+/).map((s) => s.trim()).filter(Boolean);
  const result = baseResult('好，第一版范围我记下来了。', currentNext(state));
  result.turnType = 'decide';
  result.changes.push(...items.map((statement) => ({
    action: 'add', target: 'in_scope', statement,
    reason: '用户明确了第一版要包含的功能。', source: 'explicit', impact: 'medium',
  })));
  return result;
}

function handleDecisionAdd(state, text) {
  if (includesAny(text, NEGATION)) {
    return baseResult('好的，那这个方向先不定，等有依据了再拍板。', currentNext(state));
  }
  const highImpact = includesAny(text, ['登录', '账号', '付费', '支付', '本地', '云', '技术', '架构', '平台', '后台']);
  const result = baseResult('好，这个方向我记成关键决策。', currentNext(state));
  result.turnType = 'decide';
  result.changes.push({
    action: 'add', target: 'decision', statement: text,
    reason: '用户明确了关键决策。', source: 'explicit', impact: highImpact ? 'high' : 'medium',
  });
  return result;
}

function earlyBootstrap(state, text) {
  const result = baseResult(`我可以从这个想法开始。我现在的理解是：「${text}」。我不会逼你写一份完整 PRD——先只确定一个对第一版影响最大的选择。`, {
    title: '确定第一批用户和最小的可用结果',
    reason: '一个小用户 + 一个小问题，足够在不做过度规划的情况下开始。',
    type: 'clarify',
    canGenerateTask: false,
  });
  result.turnType = 'clarify';
  result.changes.push(
    { action: 'update', target: 'one_liner', statement: text, reason: '这是用户明确的初始想法。', source: 'explicit', impact: 'medium' },
    { action: 'update', target: 'stage', statement: 'shaping', reason: '想法足够具体，可以开始收窄 MVP。', source: 'derived', impact: 'low' },
    { action: 'update', target: 'current_focus', statement: '确定第一版优先的方向', reason: '先定方向，再谈细节。', source: 'derived', impact: 'low' },
  );
  result.choice = {
    question: '第一版优先偏向哪个方向？',
    whyItMatters: '这让你不用一开始就把整个产品设计完，也能开始第一个构建。',
    options: [
      { id: 'simple', label: '一个明确的小功能，简单做好', consequence: '最快走到可用的 MVP。' },
      { id: 'flexible', label: '更通用的工具，留扩展空间', consequence: '更灵活，但动手前要多做一些决定。' },
      { id: 'showcase', label: '先做一个漂亮的演示', consequence: '优先呈现效果，产品验证稍后。' },
    ],
    recommendedOptionId: 'simple',
    allowCustomAnswer: true,
  };
  return result;
}

function genericRevise(state, text, lc) {
  const result = baseResult('这听起来是对当前方向的合理补充，而不是要推翻重来。我会保留已确认的方向，只把之后还会用到的那部分记下来。', currentNext(state));
  result.turnType = 'revise';
  const laterSignal = includesAny(lc, ['以后', 'later', 'someday', 'maybe', '也许', '或许', '将来', '最后']);
  const directive = includesAny(lc, ['必须', 'must', '不要', 'should', '第一版', 'first version', '优先', '核心', '一定要']);
  if (laterSignal) {
    result.changes.push({ action: 'add', target: 'later_idea', statement: text, reason: '用户把它表述为将来可能的想法，而不是当前范围。', source: 'explicit', impact: 'low' });
  } else if (directive || text.length > 28) {
    result.changes.push({ action: 'add', target: 'decision', statement: text, reason: '用户把这句话表述为项目级方向，而不是很小的视觉调整。', source: 'explicit', impact: 'medium' });
  }
  return result;
}

// ---- 主入口 ----------------------------------------------------------------

const MATCHERS = [
  { id: 'delegate', k: ['你决定', '你来定', '你看着办', '都行', '随便你', '随便', 'you decide', 'your call', 'whatever', 'up to you'], h: handleDelegate },
  { id: 'personalization', k: ['水印', '名字', '姓名', '个性化', '定制', 'watermark', 'personalized', 'name on', 'student name', 'customized'], h: handlePersonalization },
  { id: 'distribution', k: ['资料', '学习材料', '分享', '分发', '下载', 'pdf', 'material', 'share', 'download', 'distribute', '内容'], h: handleDistribution },
  { id: 'storage', k: ['本地', 'local-only', 'local only', 'local'], h: handleStorage },
  { id: 'identity', k: ['登录', '账号', '注册', '密码', 'login', 'account', 'signup', 'password'], h: handleIdentity },
  { id: 'sync', k: ['同步', '跨设备', '云同步', '任何设备', '所有设备', 'sync', 'cross-device', 'any device', 'every device', 'available on any device'], h: handleSync },
  { id: 'social', k: ['社区', '社群', '社交', '评论', '点赞', '动态', 'community', 'social', 'feed', 'comments', 'forum', 'badges'], h: makeParkHandler('社区 / 社交层', '可能以后有用，但会给 MVP 引入账号、审核和运营复杂度。') },
  { id: 'monetization', k: ['付费', '收费', '支付', '订阅', '会员', 'payment', 'pay', 'subscription', 'monetize', 'money'], h: makeParkHandler('付费 / 商业化', '可能以后需要，但会给 MVP 引入支付和运营复杂度。') },
  { id: 'marketplace', k: ['市场', '商城', '商店', 'marketplace', 'store', 'shop'], h: makeParkHandler('商城 / 市场', '可能以后需要，但会显著扩大 MVP 的范围。') },
  { id: 'release', k: ['部署', '上线', '发布', 'deploy', 'release', 'launch', 'publish'], h: handleRelease },
  { id: 'validate', k: ['能用', '可以用了', '有人用', '朋友用', '真实用户', 'usable', 'works', 'people can use', 'friends can use', 'real users', 'core flow now works'], h: handleValidate },
  { id: 'tweak', k: ['字号', '字体大小', '颜色', '像素', '间距', '标题小', '按钮小', 'font size', 'pixel', 'color', 'spacing', 'smaller', 'bigger', 'two pixels', '2px'], h: handleTweak },
  { id: 'audience', k: ['谁用', '给谁', '用户是', '目标用户是', '主要用户', '面向', '受众', 'for whom', 'audience'], h: handleAudience },
  { id: 'problem', k: ['痛点', '核心问题', '问题是', '要解决的问题', '问题在于', '麻烦在于'], h: handleProblem },
  { id: 'workflow', k: ['核心流程', '流程是', '流程：', '流程为', '步骤是'], h: handleWorkflow },
];

export function demoBrainTurn(state, userMessage, recentMessages = [], context = {}) {
  const text = String(userMessage || '').trim();
  const lc = lower(text);

  // 1) 用户点击了选择卡片上的选项（真实 AI 与 demo 走同一条路径）
  if (context?.choice && context?.option) return decidedResult(context.choice, context.option);

  // 2) 用户自己输入了某个选项的文字
  const selected = findSelectedOption(text, recentMessages);
  if (selected) return decidedResult(selected.choice, selected.option);

  if (!text) return baseResult('把脑子里那个想法说出来就行，不需要打磨。', currentNext(state));

  // 3) 用户通过「下一步建议」引导条回答了当前澄清问题（精确分发，优先于概念匹配）
  if (context?.guidanceStep) {
    const handlerByStep = {
      users: handleAudience,
      problem: handleProblem,
      workflow: handleWorkflow,
      scope: handleScopeAdd,
      decisions: handleDecisionAdd,
    };
    const handler = handlerByStep[context.guidanceStep];
    if (handler) return handler(state, text);
  }

  const decisions = activeDecisions(state);
  const isEarly = state.identity.targetUsers.length === 0 || decisions.length < 1;

  for (const matcher of MATCHERS) {
    if (includesAny(lc, matcher.k)) return matcher.h(state, text);
  }

  if (isEarly) return earlyBootstrap(state, text);
  return genericRevise(state, text, lc);
}

// 兼容入口：直接根据某个 choice + option 生成「已决定」的结果。
export function demoChoiceResult(state, choice, option) {
  return decidedResult(choice, option);
}
