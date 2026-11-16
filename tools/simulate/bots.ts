/**
 * シミュレータの Bot（docs/design/07_test_design.md 3.2、要件 7.5-3）
 * Bot は予兆ドットではなく効果の正確な値を使う（人間より上手い＝上級者の上限）。
 */
import type { Content } from '../../src/content';
import { PARAMS, type ChoiceEffect, type Param } from '../../src/content/types';
import { appliedEffects, judgeEnding, type RuntimeGameState, type Side } from '../../src/core';
import { addClamped } from '../../src/core/effects';
import { nextFloat, type RngState } from '../../src/core/rng';

export type BotId = 'random' | 'greedy' | 'gambler' | 'greedy:white' | 'greedy:bicycle';
export const BOT_IDS: readonly BotId[] = ['random', 'greedy', 'gambler', 'greedy:white', 'greedy:bicycle'];

export interface Decision {
  useTrump: boolean;
  side: Side;
}

type Target = Record<Param, number>;
const TARGETS: Record<Exclude<BotId, 'random' | 'gambler'>, Target> & { gambler: Target } = {
  greedy: { cash: 50, client: 50, dev: 50, legal: 50 },
  gambler: { cash: 50, client: 50, dev: 50, legal: 50 },
  'greedy:white': { cash: 50, client: 50, dev: 50, legal: 80 },
  'greedy:bicycle': { cash: 25, client: 50, dev: 50, legal: 50 },
};

/** 目標からの距離の最大値（小さいほど安全）。死ぬ値は最大の距離にする */
function distance(p: ChoiceEffect, t: Target): number {
  if (judgeEnding(p)) return 1000;
  return Math.max(...PARAMS.map((k) => Math.abs(p[k] - t[k])));
}

export function isFirstPlayFor(bot: BotId): boolean {
  return bot === 'random';
}

export function decide(bot: BotId, s: RuntimeGameState, content: Content, rng: RngState): [Decision, RngState] {
  let r = rng;
  let f: number;
  if (bot === 'random') {
    let useTrump = false;
    if (!s.usedTrumpCard) {
      [f, r] = nextFloat(r);
      useTrump = f < 0.03;
    }
    [f, r] = nextFloat(r);
    return [{ useTrump, side: f < 0.5 ? 'left' : 'right' }, r];
  }

  const target = TARGETS[bot];
  const now = distance(s.parameters, target);

  // 切り札：危険域に入っていて、使うと目標に近づき、即死しないなら使う
  let useTrump = false;
  let base = s.parameters;
  if (!s.usedTrumpCard && PARAMS.some((k) => s.parameters[k] <= 15 || s.parameters[k] >= 85)) {
    const after = addClamped(s.parameters, content.styles[s.styleId].trump.effects);
    if (!judgeEnding(after) && distance(after, target) < now) {
      useTrump = true;
      base = after;
    }
  }

  const left = addClamped(base, appliedEffects(s, 'left', content));
  const right = addClamped(base, appliedEffects(s, 'right', content));
  const dl = distance(left, target);
  const dr = distance(right, target);

  if (bot === 'gambler') {
    const cl = judgeEnding(left) ? -1 : left.cash;
    const cr = judgeEnding(right) ? -1 : right.cash;
    if (cl !== cr) return [{ useTrump, side: cl > cr ? 'left' : 'right' }, r];
  }
  if (dl !== dr) return [{ useTrump, side: dl < dr ? 'left' : 'right' }, r];
  [f, r] = nextFloat(r);
  return [{ useTrump, side: f < 0.5 ? 'left' : 'right' }, r];
}
