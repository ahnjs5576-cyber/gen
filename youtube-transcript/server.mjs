// 유튜브 자막 뷰어 서버. 정적 파일(public/)과 /api/transcript 를 제공한다.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTranscript, TranscriptError } from './lib/youtube.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const safe = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    // 알 수 없는 경로는 앱 셸로 (예: /?v=... 외의 경로 공유 시)
    if (!path.extname(filePath)) {
      const html = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
      res.end(html);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true });

  if (url.pathname === '/api/transcript') {
    const q = url.searchParams;
    const input = q.get('url') || q.get('v') || q.get('id') || '';
    try {
      const result = await getTranscript({
        url: input,
        track: q.get('track') || undefined,
        tlang: q.get('tlang') || undefined,
      });
      return sendJson(res, 200, result);
    } catch (e) {
      if (e instanceof TranscriptError) {
        return sendJson(res, e.status, { error: e.code, message: e.message });
      }
      console.error(`[api] ${input}:`, e);
      return sendJson(res, 500, { error: 'INTERNAL', message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  }
  return sendJson(res, 404, { error: 'NOT_FOUND', message: '없는 API 경로입니다.' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else await serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: 'INTERNAL', message: '서버 오류' });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`유튜브 자막 뷰어: http://localhost:${PORT}`);
});
