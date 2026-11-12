import { describe, expect, it } from 'vitest';
import { gameContent } from '../../src/content/game';
import { styles } from '../../src/content/styles';
import { loadCardFiles } from '../../tools/lib/load-cards';
import { validateCards } from '../../tools/lib/validate-cards';
import { runOnce } from '../../tools/simulate/run';
import { BOT_IDS } from '../../tools/simulate/bots';
import { STYLE_IDS } from '../../src/content/types';

describe('本番のカード', () => {
  it('検証でエラーがない（MVP は62枚）', () => {
    const r = validateCards(loadCardFiles(), styles, { phase: 1 });
    expect(r.findings.filter((f) => f.severity === 'error')).toEqual([]);
    expect(r.cards).toHaveLength(62);
  });

  it('すべての Bot・スタイルで、ランが最後まで進む（スモークテスト）', () => {
    for (const bot of BOT_IDS) {
      for (const style of STYLE_IDS) {
        for (let seed = 1; seed <= 20; seed++) {
          const r = runOnce(gameContent, bot, style, seed);
          expect(r.week).toBeGreaterThanOrEqual(1);
          expect(r.week).toBeLessThanOrEqual(52);
        }
      }
    }
  });
});
