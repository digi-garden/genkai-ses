import { describe, expect, it } from 'vitest';
import { styles } from '../../src/content/styles';
import { trumpArrows, trumpText } from '../../src/ui/trumpText';

describe('切り札の中身の見せ方（R22）', () => {
  it('向きと大きさだけを出す。30 以上は2本', () => {
    expect(trumpArrows(styles.taiikukai.trump.effects)).toBe('現場 ↑↑ ／ コンプラ ↓');
    expect(trumpArrows(styles.gray_broker.trump.effects)).toBe('資金 ↑↑ ／ コンプラ ↓');
    expect(trumpArrows(styles.tech_first.trump.effects)).toBe('資金 ↓ ／ 顧客 ↑ ／ 現場 ↑↑');
  });
  it('経営スタイル選択の文', () => {
    expect(trumpText(styles.taiikukai.trump.effects)).toBe('現場メンタルが大きく上がる、コンプラが下がる');
  });
});
