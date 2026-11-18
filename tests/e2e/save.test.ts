import { expect, test, type Page } from '@playwright/test';

/**
 * 保存と再開（docs/design/07_test_design.md 4章 T5・T8 の範囲、05 の 5・6章）
 */
const TOP = '/genkai-ses/';

async function startRun(page: Page) {
  await page.getByRole('button', { name: /経営を始める/ }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'この会社で始める' }).click();
  await expect(page.getByTestId('event-card')).toBeVisible();
}

async function playToEnd(page: Page) {
  for (let i = 0; i < 70; i++) {
    if (await page.getByTestId('report').isVisible().catch(() => false)) return;
    await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(300);
  }
  await expect(page.getByTestId('report')).toBeVisible();
}

test('T5：途中で再読み込みしても、同じ週・同じカードから再開できる', async ({ page }) => {
  await page.goto(TOP);
  await startRun(page);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
  }
  const week = await page.getByTestId('week').textContent();
  const message = await page.getByTestId('event-card').textContent();
  await page.reload();
  const resume = page.getByTestId('resume');
  await expect(resume).toContainText('第4週から');
  await resume.click();
  await expect(page.getByTestId('week')).toHaveText(week ?? '');
  await expect(page.getByTestId('event-card')).toHaveText(message ?? '');
});

test('タブを閉じて開き直しても、続きから再開できる（R20）', async ({ page, context }) => {
  await page.goto(TOP);
  await startRun(page);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  await page.close();
  const again = await context.newPage();
  await again.goto(TOP);
  await expect(again.getByTestId('resume')).toContainText('第2週から');
});

test('導入カードは生涯で最初の1回だけ。2回目は前回の会社名が入っている', async ({ page }) => {
  await page.goto(TOP);
  await page.getByRole('button', { name: '経営を始める' }).click();
  await page.getByLabel(/会社名/).fill('二度目工業');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'この会社で始める' }).click();
  await expect(page.getByTestId('event-card')).toContainText('秘書 森');
  await playToEnd(page);
  await page.reload(); // 再読み込みしても、プレイ回数は保存されている
  await page.getByRole('button', { name: '経営を始める' }).click();
  await expect(page.getByLabel(/会社名/)).toHaveValue('二度目工業');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'この会社で始める' }).click();
  await expect(page.getByTestId('event-card')).not.toContainText('就任おめでとうございます');
});

test('終了した結末が図鑑に載り、最高記録とプレイ回数が出る', async ({ page }) => {
  await page.goto(TOP);
  await startRun(page);
  await playToEnd(page);
  const title = (await page.getByRole('heading', { level: 1 }).textContent())?.replace('NEW', '').trim() ?? '';
  await page.getByRole('button', { name: '図鑑' }).click();
  const dialog = page.getByRole('dialog', { name: '図鑑' });
  await expect(dialog).toContainText('プレイ回数1回');
  await expect(dialog.getByRole('tab', { name: /結末（1\/9）/ })).toBeVisible();
  await expect(dialog.getByTestId('zukan-endings')).toContainText(title);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('遊び方と規約のモーダルを開いて閉じられる', async ({ page }) => {
  await page.goto(TOP);
  await page.getByRole('button', { name: '遊び方' }).click();
  await expect(page.getByRole('dialog', { name: '遊び方' })).toContainText('増えるか減るかは、選ぶまで分かりません');
  await page.getByRole('button', { name: '閉じる' }).click();
  await page.getByRole('button', { name: '規約・プライバシー・免責' }).click();
  const terms = page.getByRole('dialog', { name: '規約・プライバシー・免責' });
  await expect(terms.getByRole('link', { name: 'プライバシーポリシー' })).toHaveAttribute('href', 'https://promptlab-games.com/privacy');
  await page.keyboard.press('Escape');
  await expect(terms).toBeHidden();
});

test('T8：ストレージが使えなくても遊べて、記録が残らないことを知らせる', async ({ page }) => {
  await page.addInitScript(() => {
    const deny = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', { get: deny });
    Object.defineProperty(window, 'sessionStorage', { get: deny });
  });
  await page.goto(TOP);
  await expect(page.getByRole('status')).toContainText('記録を保存できません');
  await startRun(page);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('week')).toHaveText('Week 2/52');
});

test('効果音は初期値オフ。パネルでオンと音量を選ぶと保存される', async ({ page }) => {
  await page.goto(TOP);
  const button = page.getByRole('button', { name: /効果音/ });
  await expect(button).toContainText('効果音 オフ');
  await button.click();
  const panel = page.getByRole('group', { name: '効果音の設定' });
  await panel.getByRole('button', { name: '大' }).click();
  await expect(button).toContainText('効果音 オン・大');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await page.reload();
  await expect(page.getByRole('button', { name: /効果音/ })).toContainText('効果音 オン・大');
});
