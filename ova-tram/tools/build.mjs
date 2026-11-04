import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const js = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort().map(f => `// ── ${f}\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
const tpl = fs.readFileSync(path.join(src, 'template.html'), 'utf8');
const out = tpl.replace('/*@@JS@@*/', () => js);
fs.writeFileSync(path.join(root, 'moon-tram.html'), out);
console.log('built', (out.length / 1024).toFixed(1) + ' KB');
// syntax gate: fail the build loudly instead of a silent blank page
import { execFileSync } from 'node:child_process'; import os from 'node:os';
const tmp = path.join(os.tmpdir(), 'moon-tram-check.js'); fs.writeFileSync(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { console.error(String(e.stderr)); process.exit(1); }
