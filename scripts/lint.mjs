// 零依赖的轻量 lint：不引入外部包，保证 npm run check 在任何环境都能跑。
import { readFile, readdir, access } from 'node:fs/promises';
import { join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SKIP_DIRS = new Set(['node_modules', '.git']);
const WATCH_DIRS = ['public', 'server', 'api', 'scripts', 'tests'];
const JS_EXT = new Set(['.js', '.mjs']);

let failed = false;

function report(file, message) {
  failed = true;
  console.error(`${file}: ${message}`);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

// 1) 遍历需要检查的目录
for (const dir of WATCH_DIRS) {
  const dirPath = join(ROOT, dir);
  try {
    await access(dirPath);
  } catch {
    continue; // 目录不存在时跳过
  }
  const files = await walk(dirPath);
  for (const file of files) {
    const ext = extname(file);
    const content = await readFile(file, 'utf8');

    if (JS_EXT.has(ext)) {
      const inPublic = file.includes(`${sep}public${sep}`);
      const inScripts = file.includes(`${sep}scripts${sep}`);
      // 浏览器代码不允许 console.log；CLI 脚本与服务端日志是合法的
      if (inPublic && /console\.(log|debug)\s*\(/.test(content)) report(file, 'contains console.log/debug');
      if (!inScripts && /TODO|FIXME|HACK|XXX/.test(content)) report(file, 'contains TODO/FIXME/HACK marker');
      // 浏览器代码不允许读取服务端密钥；仅在文案中提及变量名是合法的
      if (inPublic && /process\.env\.OPENAI_API_KEY/.test(content)) report(file, 'browser code must never access OPENAI_API_KEY');
    }

    if (/\t/.test(content)) report(file, 'contains tab characters (use spaces)');
    if (/[ \t]+$/.test(content)) report(file, 'contains trailing whitespace');
  }
}

// 2) JSON 文件必须能解析
for (const file of ['package.json', 'vercel.json', 'evals/fixtures.json', 'public/manifest.webmanifest', 'examples/demo-project.json']) {
  try {
    const content = await readFile(join(ROOT, file), 'utf8');
    JSON.parse(content);
  } catch (error) {
    report(file, `invalid JSON: ${error.message}`);
  }
}

// 3) 关键文件完整性
for (const file of ['public/index.html', 'public/app.js', 'public/modules/brain.js', 'server.mjs', 'server/guard.mjs']) {
  try {
    await access(join(ROOT, file));
  } catch {
    report(file, 'missing required file');
  }
}

if (failed) {
  console.error('\nLint failed. Fix the issues above and re-run.');
  process.exit(1);
}
console.log('Lint passed (no deps, custom checks).');
