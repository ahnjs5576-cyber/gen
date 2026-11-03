// src/ 의 조각들을 합쳐 두 가지 결과물을 만든다.
//  - index.html          : 완전한 단일 HTML 문서 (GitHub Pages, 더블클릭으로 열기)
//  - dist/artifact.html  : Claude Artifact 용 (doctype/html/head/body 없이 내용만)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const head = read('src/head.html').trim();
const body = read('src/body.html').trim();
const css = read('src/styles.css');
const js = ['src/content/part1.js', 'src/content/part2.js', 'src/app.js'].map(read).join('\n;\n');

// 인라인 <script> 안에서 "</script" 가 나오면 문서가 깨지므로 방어
if (/<\/script/i.test(js)) throw new Error('JS 안에 </script 문자열이 있습니다.');

const inner = `${head}
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`;

const full = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f3f6f5">
${head}
<style>
:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
[hidden] { display: none !important; }
img { max-width: 100%; }
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'index.html'), full);
writeFileSync(join(root, 'dist/artifact.html'), inner);
console.log(`index.html ${(full.length / 1024).toFixed(1)} KB, dist/artifact.html ${(inner.length / 1024).toFixed(1)} KB`);
