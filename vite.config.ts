/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
  plugins: [react(), tailwindcss()],
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
