/**
 * 判定：死因・敗因・売上・称号（docs/design/04_game_logic.md 8章）
 */
import type { Balance, ChoiceEffect, EndingId, Param } from '../content/types';
import type { AchievementId, Regret, RuntimeGameState } from './state';

/** 死因の優先順位（要件 3.1-2）。同じパラメータでは下限を上限より優先する */
const DEATH_ORDER: readonly Param[] = ['cash', 'legal', 'dev', 'client'];

export function judgeEnding(p: ChoiceEffect): Exclude<EndingId, 'clear'> | null {
  for (const k of DEATH_ORDER) {
    if (p[k] <= 0) return `${k}_zero`;
    if (p[k] >= 100) return `${k}_max`;
  }
  return null;
}

/** 敗因（8.2）：直近の連鎖カードのターンから regretWindow ターン以内に、その連鎖が動かした向きで死んだ */
export function judgeRegret(state: RuntimeGameState, ending: EndingId, balance: Balance): Regret | undefined {
  const r = state.lastChainResolved;
  if (!r || ending === 'clear') return undefined;
  if (state.currentWeek - r.resolvedWeek > balance.regretWindow) return undefined;
  const [param, dir] = ending.split('_') as [Param, 'zero' | 'max'];
  const moved = dir === 'zero' ? r.effects[param] < 0 : r.effects[param] > 0;
  return moved ? { week: r.originWeek, regretText: r.regretText } : undefined;
}

export function survivedWeeks(state: RuntimeGameState, ending: EndingId): number {
  return ending === 'clear' ? 52 : state.currentWeek - 1;
}

export function computeSales(state: RuntimeGameState, ending: EndingId, balance: Balance): number {
  return survivedWeeks(state, ending) * balance.salesPerWeek + state.cashGainedTotal * balance.salesPerCash;
}

/** 称号（8.3）。優先度の高い順に返す */
export function judgeAchievements(
  state: RuntimeGameState,
  ending: EndingId,
  sales: number,
  balance: Balance,
): AchievementId[] {
  const out: AchievementId[] = [];
  const clear = ending === 'clear';
  if (clear && state.minLegalSinceQ2 >= balance.whiteCompanyMinLegal) out.push('white_company');
  if (clear && state.maxCashSinceQ2 <= balance.bicycleMaxCash) out.push('bicycle');
  if (clear && sales >= balance.emperorMinSales) out.push('emperor');
  if (clear && state.usedTrumpCard) out.push('phoenix');
  if (ending === 'legal_zero' && state.currentWeek <= balance.earlyDeathMaxWeek) out.push('audit_regular');
  if (ending === 'dev_zero' && state.currentWeek <= balance.earlyDeathMaxWeek) out.push('speed_quit');
  return out;
}
