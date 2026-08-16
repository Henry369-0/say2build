import { access, readFile } from 'node:fs/promises';

const required = [
  'public/index.html','public/app.js','public/styles.css','public/modules/brain.js','public/modules/artifacts.js',
  'public/modules/storage.js','public/modules/demo-engine.js','server.mjs','server/brain.mjs','server/task.mjs',
  'README.md','AGENTS.md','docs/PRODUCT.md','docs/ARCHITECTURE.md','.env.example','LICENSE',
];

let failed = false;
for (const file of required) {
  try { await access(file); }
  catch { console.error(`Missing required file: ${file}`); failed = true; }
}

try {
  const html = await readFile('public/index.html','utf8');
  const app = await readFile('public/app.js','utf8');
  if (!html.includes('Say2Build')) throw new Error('index.html is missing product identity');
  if (!app.includes('Project Brain')) throw new Error('app.js is missing Project Brain UI');
} catch (error) {
  console.error(error.message); failed = true;
}

if (failed) process.exit(1);
console.log(`Static integrity check passed (${required.length} required files).`);
