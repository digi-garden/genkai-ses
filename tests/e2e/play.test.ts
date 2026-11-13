import { expect, test, type Page } from '@playwright/test';

/**
 * プレイの流れ（docs/design/07_test_design.md 4章 T1・T3 の Phase 1-B 手順1の範囲）
 */
const TOP = '/genkai-ses/';

async function startRun(page: Page, company = '') {
  await page.goto(TOP);
  await page.getByRole('button', { name: '経営を始める' }).click();
  if (company) await page.getByLabel(/会社名/).fill(company);
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'この会社で始める' }).click();
  await expect(page.getByTestId('event-card')).toBeVisible();
}

test('T1：キー操作だけで最後まで遊び、リザルトからもう1期挑める', async ({ page }) => {
  await startRun(page, 'テスト工業');
  await expect(page.getByTestId('week')).toHaveText('Week 1/52');
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('report').isVisible().catch(() => false)) break;
    await page.keyboard.press(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(320);
  }
  const report = page.getByTestId('report');
  await expect(report).toBeVisible({ timeout: 5000 });
  await expect(report).toContainText('テスト工業');
  await expect(report).toContainText(/倒産報告書|決算通知書/);
  await page.getByRole('button', { name: 'もう1期挑む' }).click();
  // 前回の会社名が入った状態で戻る
  await expect(page.getByLabel(/会社名/)).toHaveValue('テスト工業');
});

test('選択すると週が進み、カードが入れ替わる（ボタン操作）', async ({ page }) => {
  await startRun(page);
  await page.getByRole('button', { name: /^← / }).click();
  await expect(page.getByTestId('week')).toHaveText('Week 2/52');
});

test('T3：切り札は2回押しで発動し、Esc で取り消せる', async ({ page }) => {
  await startRun(page);
  const trump = page.getByTestId('trump-button');
  await trump.click();
  await expect(page.getByRole('alert')).toContainText('取り返しがつきません');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(trump).toHaveText('社長の切り札（残り1回）');
  await trump.click();
  await trump.click();
  await expect(trump).toHaveText('社長の切り札（使用済み）');
  await expect(trump).toBeDisabled();
  await expect(page.getByTestId('week')).toHaveText('Week 1/52'); // 週は進まない
});

test('決断ボタンにフォーカスすると予兆ドットが出る', async ({ page }) => {
  await startRun(page);
  await page.getByRole('button', { name: /^← / }).focus();
  await expect(page.locator('[data-testid^="hint-"]').first()).toBeVisible();
});

test('会社名：実在の企業名と URL は使えない。空なら既定の名前', async ({ page }) => {
  await page.goto(TOP);
  await page.getByRole('button', { name: '経営を始める' }).click();
  const input = page.getByLabel(/会社名/);
  await input.fill('株式会社ＮＴＴデータ');
  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page.getByRole('alert')).toHaveText('実在の企業名は使えません');
  await input.fill('https://example.com');
  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page.getByRole('alert')).toContainText('URL');
  await input.fill('');
  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page.getByRole('heading', { name: '経営スタイルを選んでください' })).toBeVisible();
});

test('カードを左へドラッグして選べる', async ({ page }) => {
  await startRun(page);
  const box = await page.getByTestId('event-card').boundingBox();
  if (!box) throw new Error('カードが見つからない');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 140, y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId('week')).toHaveText('Week 2/52');
});
