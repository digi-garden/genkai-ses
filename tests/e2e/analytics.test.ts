import { expect, test } from '@playwright/test';

/**
 * 計測（06 の 2章）。E2E のビルドには測定 ID を入れないので、イベントはコンソールに出る。
 */
const TOP = '/genkai-ses/';

test('プレイのイベントが送られる（測定 ID なし → コンソール）', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => {
    if (m.text().startsWith('[analytics]')) logs.push(m.text());
  });
  await page.goto(TOP);
  await page.getByRole('button', { name: '経営を始める' }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'この会社で始める' }).click();
  await expect.poll(() => logs.some((l) => l.includes('game_start'))).toBe(true);
  // 同意が不要な地域ではバナーを出さない
  await expect(page.getByRole('region', { name: 'アクセス解析の同意' })).toHaveCount(0);
});

test.describe('EEA と推定される環境', () => {
  test.use({ timezoneId: 'Europe/Berlin' });

  test('同意バナーを出し、選択を保存する。規約のモーダルから変更できる', async ({ page }) => {
    await page.goto(TOP);
    const banner = page.getByRole('region', { name: 'アクセス解析の同意' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: /拒否する/ }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(banner).toHaveCount(0);
    await page.getByRole('button', { name: '規約・プライバシー・免責' }).click();
    await expect(page.getByRole('dialog')).toContainText('現在：拒否している');
  });
});
