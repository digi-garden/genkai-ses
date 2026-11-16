import { describe, expect, it } from 'vitest';
import { previewChoice, previewTrump, step } from '../../../src/core';
import { card, makeContent, startAction, withState } from '../fixtures';

describe('予兆ドット', () => {
  it('倍率を掛けた後の値で判定する', () => {
    // 体育会系：dev 減少 ×0.8 → -12 は -10（large）、-11 は -9（small）
    const content = makeContent({ extra: [card('n_x', 'normal', { dev: -12, cash: 5 }, { dev: -11 })] });
    const s = withState(step(null, startAction(), content).state, { currentCardId: 'n_x' });
    expect(previewChoice(s, 'left', content)).toEqual({ cash: 'small', client: 'none', dev: 'large', legal: 'none' });
    expect(previewChoice(s, 'right', content).dev).toBe('small');
  });
  it('切り札は固定値で判定する', () => {
    const content = makeContent();
    const s = step(null, startAction({ styleId: 'tech_first' }), content).state;
    expect(previewTrump(s, content)).toEqual({ cash: 'large', client: 'large', dev: 'large', legal: 'none' });
  });
});
