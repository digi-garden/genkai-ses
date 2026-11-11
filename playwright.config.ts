import { defineConfig, devices } from '@playwright/test';

/**
 * E2E は、本番と同じ設定でビルドした dist を `wrangler pages dev` で配信し、
 * その前に Router を再現したプロキシ（/genkai-ses を削る）を置いて実行する。
 * docs/design/07_test_design.md 4章、11_platform_integration.md 6.1
 * 事前に `npm run build` が必要（CI ではビルドの後に実行する）。
 */
const ORIGIN_PORT = 8788;
const PROXY_PORT = 8790;
// Playwright のブラウザを取得できない環境では、インストール済みの Google Chrome を使う（E2E_CHANNEL=chrome）
const channel = process.env.E2E_CHANNEL;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.test.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PROXY_PORT}`,
    trace: 'retain-on-failure',
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
  webServer: [
    {
      command: `npx wrangler pages dev dist --port ${ORIGIN_PORT} --ip 127.0.0.1 --compatibility-date=2026-11-01`,
      url: `http://127.0.0.1:${ORIGIN_PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx tsx tests/e2e/support/router-proxy.ts ${PROXY_PORT} ${ORIGIN_PORT}`,
      url: `http://127.0.0.1:${PROXY_PORT}/genkai-ses/`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
