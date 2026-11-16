import { describe, expect, it } from 'vitest';
import { addClamped, applyPassives, hintOf, signedRound } from '../../../src/core/effects';

const zero = { cash: 0, client: 0, dev: 0, legal: 0 };

describe('signedRound（E15）', () => {
  it.each([
    [-2.5, -3],
    [2.5, 3],
    [-2.4, -2],
    [0.5, 1],
    [-0.4, 0],
  ])('%d → %d', (x, y) => expect(signedRound(x)).toBe(y));
  it('-0 を返さない', () => expect(Object.is(signedRound(-0.2), 0)).toBe(true));
});

describe('applyPassives', () => {
  it('倍率は名前の方向にだけ掛かる', () => {
    const p = [{ param: 'dev' as const, direction: 'loss' as const, factor: 0.8 }];
    expect(applyPassives({ ...zero, dev: -10 }, p).dev).toBe(-8);
    expect(applyPassives({ ...zero, dev: 10 }, p).dev).toBe(10);
  });
  it('同じパラメータの倍率は逐次乗算し、丸めは最後に1回', () => {
    const p = [
      { param: 'cash' as const, direction: 'gain' as const, factor: 1.25 },
      { param: 'cash' as const, direction: 'gain' as const, factor: 1.2 },
    ];
    expect(applyPassives({ ...zero, cash: 3 }, p).cash).toBe(5); // 3 × 1.25 × 1.2 = 4.5 → 5
  });
  it('負の値の倍率は符号付き四捨五入（-2.5 → -3）', () => {
    const p = [{ param: 'legal' as const, direction: 'loss' as const, factor: 1.25 }];
    expect(applyPassives({ ...zero, legal: -2 }, p).legal).toBe(-3);
  });
  it('元の効果を書き換えない', () => {
    const e = { ...zero, dev: -10 };
    applyPassives(e, [{ param: 'dev', direction: 'loss', factor: 0.5 }]);
    expect(e.dev).toBe(-10);
  });
});

describe('addClamped / hintOf', () => {
  it('0〜100 にクランプする', () => {
    expect(addClamped({ cash: 95, client: 5, dev: 50, legal: 50 }, { cash: 20, client: -20, dev: 0, legal: 0 })).toEqual({
      cash: 100,
      client: 0,
      dev: 50,
      legal: 50,
    });
  });
  it('予兆ドットは 0 / 1〜9 / 10 以上', () => {
    expect([hintOf(0), hintOf(-1), hintOf(9), hintOf(-10), hintOf(40)]).toEqual(['none', 'small', 'small', 'large', 'large']);
  });
});
