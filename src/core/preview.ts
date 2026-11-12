/**
 * 予兆ドットの計算（docs/design/04_game_logic.md 7.4。ui 層から呼ぶ）
 */
import type { Content } from '../content';
import type { Param } from '../content/types';
import { hintsOf, type Hint } from './effects';
import type { RuntimeGameState, Side } from './state';
import { appliedEffects } from './turn';

export function previewChoice(state: RuntimeGameState, side: Side, content: Content): Record<Param, Hint> {
  return hintsOf(appliedEffects(state, side, content));
}

export function previewTrump(state: RuntimeGameState, content: Content): Record<Param, Hint> {
  return hintsOf(content.styles[state.styleId].trump.effects);
}
