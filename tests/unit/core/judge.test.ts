import { describe, expect, it } from 'vitest';
import { balance } from '../../../src/content/balance';
import { judgeAchievements, judgeEnding, computeSales } from '../../../src/core/judge';
import type { RuntimeGameState } from '../../../src/core';

const p = (o: Partial<Record<'cash' | 'client' | 'dev' | 'legal', number>>) => ({ cash: 50, client: 50, dev: 50, legal: 50, ...o });

const base = {
  currentWeek: 52,
  cashGainedTotal: 0,
  minLegalSinceQ2: 100,
  maxCashSinceQ2: 0,
  usedTrumpCard: false,
} as unknown as RuntimeGameState;
const st = (o: Partial<RuntimeGameState>) => ({ ...base, ...o }) as RuntimeGameState;

describe('judgeEnding', () => {
  it('崩壊なしなら null', () => expect(judgeEnding(p({ cash: 1, legal: 99 }))).toBeNull());
  it.each([
    [p({ cash: 0 }), 'cash_zero'],
    [p({ cash: 100, legal: 0 }), 'cash_max'],
    [p({ legal: 0, dev: 0 }), 'legal_zero'],
    [p({ dev: 100, client: 0 }), 'dev_max'],
    [p({ client: 100 }), 'client_max'],
  ] as const)('%o → %s', (params, ending) => expect(judgeEnding(params)).toBe(ending));
});

describe('売上', () => {
  it('生存週 × salesPerWeek + cashGainedTotal × salesPerCash', () => {
    const b = { ...balance, salesPerWeek: 100, salesPerCash: 50 };
    expect(computeSales(st({ currentWeek: 24, cashGainedTotal: 10 }), 'dev_zero', b)).toBe(23 * 100 + 500);
    expect(computeSales(st({ cashGainedTotal: 96 }), 'clear', b)).toBe(10000);
  });
});

describe('称号の境界値', () => {
  const ach = (o: Partial<RuntimeGameState>, ending: Parameters<typeof judgeAchievements>[1], sales = 5200) =>
    judgeAchievements(st(o), ending, sales, balance);

  it('ホワイト企業の鑑：閾値ちょうどは取れて、1 下は取れない', () => {
    const t = balance.whiteCompanyMinLegal;
    expect(ach({ minLegalSinceQ2: t, maxCashSinceQ2: 60 }, 'clear')).toContain('white_company');
    expect(ach({ minLegalSinceQ2: t - 1, maxCashSinceQ2: 60 }, 'clear')).not.toContain('white_company');
  });
  it('自転車操業マスター：40 は取れて 41 は取れない', () => {
    expect(ach({ minLegalSinceQ2: 0, maxCashSinceQ2: 40 }, 'clear')).toContain('bicycle');
    expect(ach({ minLegalSinceQ2: 0, maxCashSinceQ2: 41 }, 'clear')).not.toContain('bicycle');
  });
  it('人月搾取の帝王：売上 10000 以上', () => {
    expect(ach({ minLegalSinceQ2: 0, maxCashSinceQ2: 60 }, 'clear', 10000)).toEqual(['emperor']);
    expect(ach({ minLegalSinceQ2: 0, maxCashSinceQ2: 60 }, 'clear', 9999)).toEqual([]);
  });
  it('不死鳥社長：切り札を使ってクリア', () => {
    expect(ach({ minLegalSinceQ2: 0, maxCashSinceQ2: 60, usedTrumpCard: true }, 'clear')).toEqual(['phoenix']);
  });
  it('監査局の常連・スピード退職：死亡週 9 は取れて 10 は取れない', () => {
    expect(ach({ currentWeek: 9 }, 'legal_zero')).toEqual(['audit_regular']);
    expect(ach({ currentWeek: 10 }, 'legal_zero')).toEqual([]);
    expect(ach({ currentWeek: 9 }, 'dev_zero')).toEqual(['speed_quit']);
    expect(ach({ currentWeek: 10 }, 'dev_zero')).toEqual([]);
  });
  it('複数取ったときは優先度の高い順', () => {
    expect(ach({ minLegalSinceQ2: 70, maxCashSinceQ2: 30, usedTrumpCard: true }, 'clear', 12000)).toEqual([
      'white_company',
      'bicycle',
      'emperor',
      'phoenix',
    ]);
  });
});
