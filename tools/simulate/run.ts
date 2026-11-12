/**
 * ランの実行と集計（docs/design/07_test_design.md 3章）
 */
import type { Content } from '../../src/content';
import { ENDING_IDS, STYLE_IDS, type EndingId, type StyleId } from '../../src/content/types';
import { step, type AchievementId, type Action, type RuntimeGameState } from '../../src/core';
import { seedRandom } from '../../src/core/rng';
import { decide, isFirstPlayFor, type BotId } from './bots';

export interface RunResult {
  ending: EndingId;
  /** 死亡週（クリアは 52） */
  week: number;
  survived: number;
  sales: number;
  achievements: AchievementId[];
  usedTrump: boolean;
  regret: boolean;
  /** 表示したカードと、死んだときのカード */
  shown: string[];
  deathCard?: string;
}

export function runOnce(content: Content, bot: BotId, styleId: StyleId, seed: number): RunResult {
  const first = isFirstPlayFor(bot);
  const allNormal = content.cards.filter((c) => c.kind === 'normal').map((c) => c.id);
  const shown: string[] = [];
  let botRng = seedRandom(seed ^ 0x9e3779b9);

  const apply = (s: RuntimeGameState | null, action: Action): { s: RuntimeGameState; end?: RunResult } => {
    const { state, events } = step(s, action, content);
    for (const e of events) {
      if (e.type === 'cardShown') shown.push(e.cardId);
      if (e.type === 'gameOver' || e.type === 'gameClear') {
        const ending = state.ending ?? 'clear';
        return {
          s: state,
          end: {
            ending,
            week: state.currentWeek,
            survived: ending === 'clear' ? 52 : state.currentWeek - 1,
            sales: e.sales,
            achievements: e.achievements,
            usedTrump: state.usedTrumpCard,
            regret: e.type === 'gameOver' && e.regret !== undefined,
            shown,
            ...(ending === 'clear' ? {} : { deathCard: state.currentCardId }),
          },
        };
      }
    }
    return { s: state };
  };

  let cur = apply(null, {
    type: 'start',
    styleId,
    companyName: 'シミュレータ株式会社',
    isFirstPlay: first,
    seenCardIds: first ? [] : allNormal,
    seed,
    now: '2026-01-01T00:00:00.000Z',
  });
  for (let guard = 0; guard < 200; guard++) {
    const [d, r] = decide(bot, cur.s, content, botRng);
    botRng = r;
    if (d.useTrump) {
      cur = apply(cur.s, { type: 'useTrump' });
      if (cur.end) return cur.end;
    }
    cur = apply(cur.s, { type: 'choose', side: d.side });
    if (cur.end) return cur.end;
  }
  throw new Error('ランが終わらない');
}

export interface GroupStats {
  bot: BotId;
  style: StyleId;
  runs: number;
  survived: number[];
  endings: Record<EndingId, number>;
  achievements: Record<AchievementId, number>;
  clears: number;
  regrets: number;
}

export function emptyGroup(bot: BotId, style: StyleId): GroupStats {
  return {
    bot,
    style,
    runs: 0,
    survived: [],
    endings: Object.fromEntries(ENDING_IDS.map((e) => [e, 0])) as Record<EndingId, number>,
    achievements: { white_company: 0, bicycle: 0, emperor: 0, phoenix: 0, audit_regular: 0, speed_quit: 0 },
    clears: 0,
    regrets: 0,
  };
}

export interface CardStats {
  shown: number;
  deaths: number;
}

export function simulate(
  content: Content,
  opts: { bots: readonly BotId[]; styles?: readonly StyleId[]; runs: number; seed: number },
): { groups: GroupStats[]; cards: Record<string, CardStats> } {
  const groups: GroupStats[] = [];
  const cards: Record<string, CardStats> = {};
  for (const bot of opts.bots) {
    for (const style of opts.styles ?? STYLE_IDS) {
      const g = emptyGroup(bot, style);
      for (let i = 0; i < opts.runs; i++) {
        const r = runOnce(content, bot, style, (opts.seed * 1000003 + i) >>> 0);
        g.runs++;
        g.survived.push(r.survived);
        g.endings[r.ending]++;
        if (r.ending === 'clear') g.clears++;
        if (r.regret) g.regrets++;
        for (const a of r.achievements) g.achievements[a]++;
        for (const id of r.shown) (cards[id] ??= { shown: 0, deaths: 0 }).shown++;
        if (r.ending !== 'clear' && r.deathCard) (cards[r.deathCard] ??= { shown: 0, deaths: 0 }).deaths++;
      }
      groups.push(g);
    }
  }
  return { groups, cards };
}
