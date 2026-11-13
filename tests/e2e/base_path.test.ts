import { expect, test, type Response } from '@playwright/test';

/**
 * 公開パスの E2E（docs/design/11_platform_integration.md 6.1）
 * Phase 0 では、ひな形の範囲（トップの起動、リソースの取得、末尾スラッシュ、存在しないパス）を確かめる。
 * 結末ページ（/genkai-ses/results/dev-zero）の確認は、結末ページを作る Phase 1-B で追加する。
 */

const TOP = '/genkai-ses/';

async function startRun(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '経営を始める' }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'この会社で始める' }).click();
  await expect(page.getByTestId('event-card')).toBeVisible();
}

function collectResponses(page: import('@playwright/test').Page): Response[] {
  const responses: Response[] = [];
  page.on('response', (r) => responses.push(r));
  return responses;
}

test('公開パスのトップが起動し、コンソールにエラーがない', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  const res = await page.goto(TOP);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /限界SES社長/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('読み込むリソースがすべて 200 で、HTML が紛れ込んでいない', async ({ page }) => {
  const responses = collectResponses(page);
  await page.goto(TOP);
  await startRun(page);
  // 画像の読み込み完了を待つ
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
  );

  const assets = responses.filter((r) => new URL(r.url()).pathname.startsWith('/genkai-ses/assets/'));
  expect(assets.length).toBeGreaterThan(0);
  for (const r of assets) {
    expect.soft(r.status(), r.url()).toBe(200);
    // 存在しないファイルも SPA フォールバックで 200 の HTML になるため、content-type で確かめる（09 検証1）
    expect.soft(r.headers()['content-type'] ?? '', r.url()).not.toContain('text/html');
  }
  // 公開パスの外（/assets/... など）を読みに行っていない
  const outside = responses.filter((r) => {
    const u = new URL(r.url());
    return u.host === new URL(page.url()).host && !u.pathname.startsWith('/genkai-ses/');
  });
  expect(outside.map((r) => r.url())).toEqual([]);
});

test('ハッシュ付きの資産に immutable のキャッシュが付き、CSP が返る', async ({ page, request }) => {
  const responses = collectResponses(page);
  await page.goto(TOP);
  await startRun(page);

  const top = await request.get(TOP);
  expect(top.headers()['content-security-policy']).toContain("default-src 'self'");

  const js = responses.find((r) => /\/genkai-ses\/assets\/.+\.js$/.test(new URL(r.url()).pathname));
  expect(js, 'JS が見つからない').toBeDefined();
  expect(js?.headers()['cache-control']).toContain('immutable');
});

test('ページ内のリンクとリソースが末尾スラッシュ付きのパスを指していない', async ({ page }) => {
  await page.goto(TOP);
  const urls = await page.evaluate(() => [
    ...Array.from(document.querySelectorAll('a[href]')).map((a) => (a as HTMLAnchorElement).href),
    ...Array.from(document.querySelectorAll('[src]')).map((e) => (e as HTMLImageElement).src),
    ...Array.from(document.querySelectorAll('link[href]')).map((l) => (l as HTMLLinkElement).href),
  ]);
  for (const u of urls) {
    const p = new URL(u).pathname;
    // トップ（/genkai-ses/）以外で、末尾が / のパスはリダイレクトの原因になる
    if (p !== TOP) expect.soft(p.endsWith('/'), u).toBe(false);
  }
});

test('/genkai-ses（スラッシュなし）は /genkai-ses/ に 308 で移る', async ({ request }) => {
  const res = await request.get('/genkai-ses', { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toBe('/genkai-ses/');
});

test('存在しないパスで開いても、タイトル画面が表示されトップの URL に戻る', async ({ page }) => {
  const res = await page.goto('/genkai-ses/unknown/path');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /限界SES社長/ })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(TOP);
});
