/**
 * Router Worker（digi-garden/promptlab-games-router）の転送ルールを再現するテスト用プロキシ。
 * docs/design/11_platform_integration.md 6.1
 *
 *   /genkai-ses        → 308 で /genkai-ses/ へ
 *   /genkai-ses/*      → 先頭の /genkai-ses を削ってオリジン（wrangler pages dev）へ転送。
 *                        リダイレクトは追いかけず、Location もそのまま返す（Router と同じ）
 *   それ以外           → 404（Portal の代わり）
 *
 * 使い方：tsx tests/e2e/support/router-proxy.ts <listenPort> <originPort>
 */
import http from 'node:http';

const PREFIX = '/genkai-ses';
const listenPort = Number(process.argv[2] ?? 8790);
const originPort = Number(process.argv[3] ?? 8788);

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${listenPort}`);

  if (url.pathname === PREFIX) {
    res.writeHead(308, { Location: `${PREFIX}/${url.search}` });
    res.end();
    return;
  }

  if (!url.pathname.startsWith(`${PREFIX}/`)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('portal (not served in tests)');
    return;
  }

  const upstreamPath = url.pathname.slice(PREFIX.length) + url.search;
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: originPort,
      path: upstreamPath,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${originPort}` },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(String(err));
  });
  req.pipe(upstream);
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`router-proxy listening on http://127.0.0.1:${listenPort}${PREFIX}/ -> :${originPort}`);
});
