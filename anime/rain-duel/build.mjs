// Concatenate src/*.js into one self-contained HTML file.
import fs from 'fs';
const dir = new URL('./src/', import.meta.url);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
const js = files.map(f => `// ---- ${f} ----\n` + fs.readFileSync(new URL(f, dir), 'utf8')).join('\n');
const tpl = fs.readFileSync(new URL('./template.html', import.meta.url), 'utf8');
const out = tpl.replace('/*__JS__*/', () => js);
fs.writeFileSync(new URL('./rain-duel.html', import.meta.url), out);
console.log('built rain-duel.html', (out.length / 1024).toFixed(1) + 'KB', files.length, 'modules');
