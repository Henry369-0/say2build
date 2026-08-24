// 生成「交接给编码工具」的终端命令。
// 用法：把 task-xxx.md 存进项目仓库后，在项目目录里运行对应命令。
// 命令是确定性的，方便测试，也方便用户复制。

export function buildCodexExecCommand(task) {
  const file = task?.id || 'task-001';
  return `codex exec "读取 ${file}.md 并完成其中的任务；完成后按文件末尾『完成后』清单汇报：改了什么、改了哪些文件、怎么验证的、还有什么没解决。"`;
}

export function buildClaudeCommand(task) {
  const file = task?.id || 'task-001';
  return `claude -p "读取 ${file}.md 并完成其中的任务；完成后按文件末尾『完成后』清单汇报。"`;
}

export function buildHandoffNote(task) {
  const file = task?.id || 'task-001';
  return [
    `1. 下载 ${file}.md 并保存到你的项目仓库根目录。`,
    '2. 在项目目录打开终端，运行下面的命令（任选其一）。',
    '3. 编码工具完成后，把它的汇报填回 Say2Build 的「标记完成」弹窗。',
  ].join('\n');
}
