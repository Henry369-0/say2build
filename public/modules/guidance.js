// 需求澄清引导：把「模糊想法 → 可构建任务」拆成确定性的步骤阶梯。
// 引导是状态的纯函数派生视图（与共识/文件一样），不依赖 AI，两条大脑路径行为一致。
import { activeDecisions } from './brain.js';

export const GUIDANCE_STEPS = [
  {
    id: 'users',
    label: '明确目标用户',
    question: '这个工具主要给谁用？',
    hint: '先定一个人群就够，比如「小规模培训团队的老师」。',
    check: (state) => state.identity.targetUsers.length > 0,
  },
  {
    id: 'problem',
    label: '说清要解决的问题',
    question: '它主要解决什么麻烦？',
    hint: '一句话说明现状痛点，不用写完整 PRD。',
    check: (state) => Boolean(state.identity.problem),
  },
  {
    id: 'workflow',
    label: '明确核心流程',
    question: '用户用它时的核心流程是什么？',
    hint: '比如「上传资料 → 学生查看 → 下载」。',
    check: (state) => state.intent.coreWorkflow.length > 0 || state.scope.inScope.length > 0,
  },
  {
    id: 'scope',
    label: '圈定 MVP 范围',
    question: '第一版必须包含哪些功能？',
    hint: '先列 2-3 个核心功能，其余放「以后再说」。',
    check: (state) => state.scope.inScope.length >= 2,
  },
  {
    id: 'decisions',
    label: '定下关键决策',
    question: '有没有必须现在拍板的方向？',
    hint: '比如要不要登录、要不要付费，先定最重要的一个。',
    check: (state) => activeDecisions(state).filter((d) => d.impact === 'high').length >= 1,
  },
  {
    id: 'ready',
    label: '准备好开工',
    question: null,
    hint: '项目已经足够清楚，生成第一个构建任务吧。',
    check: (state) => state.execution.nextAction?.canGenerateTask === true,
  },
];

export function deriveGuidance(state) {
  let completed = 0;
  for (const step of GUIDANCE_STEPS) {
    if (step.check(state)) {
      completed += 1;
    } else {
      return { completed, total: GUIDANCE_STEPS.length, current: step, ready: false };
    }
  }
  return { completed: GUIDANCE_STEPS.length, total: GUIDANCE_STEPS.length, current: null, ready: true };
}

// 给 AI 的提示：当前最应该澄清的一步。
export function currentGuidanceQuestion(state) {
  return deriveGuidance(state).current?.question || null;
}
