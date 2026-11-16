/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

/** トップページの OGP（06 の 5.2）。絶対 URL は環境変数から作る（未設定なら本番の値） */
function ogpTags(): Plugin {
  const origin = (process.env.VITE_SITE_ORIGIN || 'https://promptlab-games.com').replace(/\/$/, '');
  const base = (process.env.VITE_PUBLIC_BASE ?? '/genkai-ses').replace(/\/$/, '');
  const title = '限界SES社長 〜人月ピラミッドの頂点へ〜';
  const desc = 'SES企業の社長として、資金・顧客・現場・コンプラの4つのバランスを取りながら1期52週を生き延びる、2択の風刺経営ゲーム。';
  return {
    name: 'genkai-ogp',
    transformIndexHtml: () => [
      { tag: 'link', attrs: { rel: 'canonical', href: `${origin}${base}/` }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:site_name', content: '限界SES社長' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:description', content: desc }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:url', content: `${origin}${base}/` }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image', content: `${origin}${base}/ogp/title.png` }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
    ],
  };
}

/**
 * 公開パス（11 の 2章・2.2）
 * - 本番（Cloudflare Pages の `develop` ブランチ）と、CI・E2E の本番相当ビルド：`/genkai-ses/`
 * - それ以外のブランチのプレビュー（`preview/*`）：`/`
 * Pages はビルド時に CF_PAGES_BRANCH を設定する。ローカルでは未設定なので本番と同じ `/genkai-ses/` になる。
 */
const branch = process.env.CF_PAGES_BRANCH;
const base = branch && branch !== 'develop' ? '/' : '/genkai-ses/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), ogpTags()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0, // 画像はすべてファイルとして出す（_headers の immutable を効かせるため）
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/app/**/*.ts'],
      reporter: ['text-summary', 'html'],
    },
  },
});
