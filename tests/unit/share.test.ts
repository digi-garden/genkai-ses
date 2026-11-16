import { describe, expect, it, vi } from 'vitest';
import { achievementById } from '../../src/content/achievements';
import { endings } from '../../src/content/endings';
import { buildShareText, shareUrl, weightedLength, X_LIMIT, xIntentUrl } from '../../src/core/share';
import { createShareService } from '../../src/infra/share';

describe('weightedLength（X の数え方）', () => {
  it('英数字は1、日本語は2', () => {
    expect(weightedLength('abc 123')).toBe(7);
    expect(weightedLength('限界SES')).toBe(2 * 2 + 3);
    expect(weightedLength('「」…')).toBe(6); // 「」も …（U+2026）も2
    expect(weightedLength('“”')).toBe(2); // U+201C・U+201D は1
  });
});

const total = (text: string) => weightedLength(text) + 24;

describe('buildShareText（06 の 3.2）', () => {
  it('通常のケースは調整1段目までで収まる', () => {
    const r = buildShareText({
      companyName: 'ブラック工業',
      ending: endings.dev_zero,
      week: 24,
      salesText: '4,800万',
      achievement: achievementById.get('speed_quit'),
      regret: { week: 18, regretText: { web: '新人の経歴をJava歴3年にプロデュースした' } },
    });
    expect(r.step).toBeLessThanOrEqual(1);
    expect(total(r.text)).toBeLessThanOrEqual(X_LIMIT);
    expect(r.text).toContain('ブラック工業は、第24週に「全員蒸発エンド」で倒産しました（売上4,800万）。');
    expect(r.text).toContain('獲得称号：［スピード退職］');
    expect(r.text).toContain('敗因：第18週「新人の経歴をJava歴3年にプロデュースした」');
    expect(r.text).toContain('※会社名は架空です');
    expect(r.text).toContain('#限界SES社長 #SESあるある');
  });

  it('最悪のケース（会社名15文字、長い結末名、5桁の売上、長い称号、30文字の敗因）でも 280 以内', () => {
    const r = buildShareText({
      companyName: 'あ'.repeat(15),
      ending: endings.legal_max,
      week: 51,
      salesText: '1億2,345万',
      achievement: achievementById.get('bicycle'),
      regret: { week: 50, regretText: { web: 'い'.repeat(30) } },
    });
    expect(total(r.text)).toBeLessThanOrEqual(X_LIMIT);
    expect(r.text).toContain('※会社名は架空です');
    expect(r.text).toContain('#限界SES社長');
    // 投稿画面の URL も 2,000 文字以内（06 の 3.2）
    expect(xIntentUrl(r.text, shareUrl('https://promptlab-games.com', '/genkai-ses', 'legal-max')).length).toBeLessThan(2000);
  });

  it('クリアの文と、敗因がないときの自虐コメント', () => {
    const r = buildShareText({ companyName: '限界工業', ending: endings.clear, week: 52, salesText: '1億200万', achievement: achievementById.get('emperor') });
    expect(r.text).toContain('限界工業は、1期（52週）を完走しました（売上1億200万）。');
    expect(r.text).toContain(endings.clear.selfComment.web);
  });
});

describe('shareUrl / xIntentUrl', () => {
  it('結末ページは末尾スラッシュなし（R13）で UTM 付き', () => {
    expect(shareUrl('https://promptlab-games.com/', '/genkai-ses/', 'dev-zero')).toBe(
      'https://promptlab-games.com/genkai-ses/results/dev-zero?utm_source=x&utm_medium=share',
    );
  });
  it('X の投稿画面の URL', () => {
    expect(xIntentUrl('a b', 'https://e.com/?x=1')).toBe('https://x.com/intent/tweet?text=a%20b&url=https%3A%2F%2Fe.com%2F%3Fx%3D1');
  });
});

describe('createShareService', () => {
  it('ポップアップがブロックされたら同じタブで開く', () => {
    const win = { open: vi.fn(() => null), location: { href: '' } } as unknown as Window;
    createShareService(win).openXIntent('t', 'https://e.com');
    expect(win.location.href).toContain('https://x.com/intent/tweet');
  });
  it('開けたら opener を切る', () => {
    const child = { opener: {} };
    const win = { open: vi.fn(() => child), location: { href: '' } } as unknown as Window;
    createShareService(win).openXIntent('t', 'https://e.com');
    expect(child.opener).toBeNull();
    expect(win.location.href).toBe('');
  });
});
