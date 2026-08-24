const STAGE_LABELS = {
  exploring: '探索中',
  shaping: '成型中',
  ready_to_build: '可以开工',
  building: '开发中',
  usable_mvp: '可用 MVP',
  validating: '验证中',
  releasing: '发布中',
  iterating: '迭代中',
};

const CHANGE_TARGET_LABELS = {
  one_liner: '项目简介',
  problem: '要解决的问题',
  target_user: '目标用户',
  current_goal: '当前目标',
  current_focus: '当前焦点',
  core_workflow: '核心流程',
  in_scope: 'MVP 范围',
  later_idea: '暂存想法',
  non_goal: '暂不做',
  decision: '产品决策',
  constraint: '稳定约束',
  open_question: '待定问题',
  stage: '项目阶段',
  next_action: '下一步',
};

export function stageLabel(stage) {
  return STAGE_LABELS[stage] || String(stage || '').replaceAll('_', ' ');
}

export function changeTargetLabel(target) {
  return CHANGE_TARGET_LABELS[target] || String(target || '').replaceAll('_', ' ');
}
