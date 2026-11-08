import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let proc;
let base;

before(async () => {
  // 가짜 유튜브로 동작하는 모드로 서버를 띄운다 (test/fake-youtube.mjs 참고)
  proc = spawn(process.execPath, ['--import', './test/fake-youtube.mjs', 'server.mjs'], {
    cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  base = await new Promise((resolve, reject) => {
    proc.stdout.on('data', (d) => { const m = String(d).match(/http:\/\/localhost:(\d+)/); if (m) resolve(`http://127.0.0.1:${m[1]}`); });
    proc.on('exit', (c) => reject(new Error(`server exited ${c}`)));
  });
});
after(() => proc?.kill());

test('정적 파일과 health', async () => {
  const html = await fetch(`${base}/`);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /text\/html/);
  assert.match(await html.text(), /유튜브 자막 뷰어/);
  assert.equal((await fetch(`${base}/app.js`)).status, 200);
  assert.equal((await fetch(`${base}/styles.css`)).status, 200);
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true });
  assert.equal((await fetch(`${base}/..%2Fserver.mjs`)).status, 404);
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
  assert.equal((await fetch(`${base}/api/health`, { method: 'POST' })).status, 405);
});

test('/api/transcript 성공과 오류', async () => {
  const ok = await fetch(`${base}/api/transcript?url=https://youtu.be/fakefakefak`);
  assert.equal(ok.status, 200);
  const data = await ok.json();
  assert.equal(data.video.title, '가짜 영상');
  assert.equal(data.segments.length, 3);
  assert.equal(data.selected.code, 'ko');

  const tr = await (await fetch(`${base}/api/transcript?v=fakefakefak&tlang=en`)).json();
  assert.equal(tr.selected.tlang, 'en');
  assert.match(tr.segments[0].text, /^en:/);

  const bad = await fetch(`${base}/api/transcript?url=garbage`);
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'INVALID_URL');

  const none = await fetch(`${base}/api/transcript?url=nocapsnocap`);
  assert.equal(none.status, 404);
  assert.equal((await none.json()).error, 'NO_CAPTIONS');
});
