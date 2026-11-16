/**
 * 結末紹介ページ（docs/design/06_external_interface.md 5章、02 の P01）。ビルドの最後に実行する。
 * - dist/results/{slug}.html を9枚出力する（R13：URL は末尾スラッシュなしの /genkai-ses/results/{slug}）
 * - JavaScript は使わない。スタイルはページ内に書き、フォントは端末のものを使う
 * - リンクと画像は相対パス（公開パス /genkai-ses/ でも、プレビューの / でも動く）。OGP と canonical だけ絶対 URL
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { endings } from '../src/content/endings';

const ORIGIN = (process.env.VITE_SITE_ORIGIN || 'https://promptlab-games.com').replace(/\/$/, '');
const BASE = (process.env.VITE_PUBLIC_BASE ?? '/genkai-ses').replace(/\/$/, '');
const OUT = 'dist/results';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CHALLENGE = '誰かこのブラック業界で1年間（52週）生き残ってみてくれ。';

export function resultPage(e: (typeof endings)[keyof typeof endings]): string {
  const title = `${e.title.web}｜限界SES社長`;
  const url = `${ORIGIN}${BASE}/results/${e.slug}`;
  const image = `${ORIGIN}${BASE}/ogp/end_${e.id}.png`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(e.subtitle.web)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<meta property="og:type" content="website">
<meta property="og:site_name" content="限界SES社長">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${CHALLENGE}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<style>
*{box-sizing:border-box}
body{margin:0;background:#1e1f22;color:#f2f3f5;font-family:ui-monospace,"Hiragino Sans","Noto Sans JP",monospace;line-height:1.7}
main{max-width:640px;margin:0 auto;padding:32px 16px 40px;text-align:center}
.brand{font-size:12px;color:#949ba4;margin:0 0 8px}
.game{font-size:20px;font-weight:700;margin:0}
.sub{font-size:13px;color:#b5bac1;margin:0 0 20px}
img{width:100%;height:auto;border-radius:10px;image-rendering:pixelated;display:block}
h1{font-size:26px;margin:20px 0 4px;text-wrap:balance}
.desc{color:#b5bac1;font-size:14px;margin:0 0 24px;text-wrap:balance}
.challenge{font-size:16px;font-weight:700;margin:0 0 20px;text-wrap:balance}
.cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 28px;border-radius:10px;background:#22c55e;color:#0b1a10;font-weight:700;text-decoration:none}
.cta:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.note{margin-top:32px;font-size:12px;color:#949ba4;text-wrap:balance}
</style>
</head>
<body>
<main>
<p class="brand">PromptLab Games</p>
<p class="game">限界SES社長</p>
<p class="sub">〜人月ピラミッドの頂点へ〜</p>
<img src="../ogp/end_${e.id}.png" width="1200" height="630" alt="${esc(e.subtitle.web)}">
<h1>${esc(e.title.web)}</h1>
<p class="desc">${esc(e.subtitle.web)}</p>
<p class="challenge">${CHALLENGE}</p>
<a class="cta" href="../">このブラック業界に挑む</a>
<p class="note">このゲームはフィクションです。登場する人物・団体・会社名は架空のもので、実在のものとは関係ありません。</p>
</main>
</body>
</html>
`;
}

mkdirSync(OUT, { recursive: true });
for (const e of Object.values(endings)) {
  writeFileSync(`${OUT}/${e.slug}.html`, resultPage(e));
}
console.log(`${OUT}/ に結末ページを ${Object.keys(endings).length} 枚書き出した（${ORIGIN}${BASE}）`);
