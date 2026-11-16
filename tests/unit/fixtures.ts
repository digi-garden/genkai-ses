/**
 * テスト用のカードとコンテンツ。本物のカードとは独立させ、境界条件を作りやすい値にする。
 */
import { buildContent, type Content } from '../../src/content';
import { balance as defaultBalance } from '../../src/content/balance';
import { CardSchema, type EventCardInput } from '../../src/content/schema';
import { styles as defaultStyles } from '../../src/content/styles';
import type { Balance, ChoiceEffect, StyleDef, StyleId } from '../../src/content/types';
import type { RuntimeGameState } from '../../src/core';

type Eff = Partial<ChoiceEffect>;

export function card(
  id: string,
  kind: EventCardInput['kind'],
  left: Eff = {},
  right: Eff = {},
  extra: Partial<EventCardInput> = {},
): EventCardInput {
  return {
    id,
    kind,
    speaker_name: 'テスト',
    speaker_icon: 'icon_sales',
    message: id,
    choice_left: { text: '左', effects: left },
    choice_right: { text: '右', effects: right },
    ...extra,
  };
}

/** 通常カード n 枚（効果なし）＋季節固定4枚＋導入2枚＋任意の追加カード */
export function makeContent(
  opts: {
    normals?: number;
    extra?: EventCardInput[];
    fixedEffects?: Eff;
    /** 特定の週の季節固定カードの効果（fixedEffects より優先） */
    fixedEffectsByWeek?: Partial<Record<13 | 26 | 39 | 52, Eff>>;
    styles?: Partial<Record<StyleId, StyleDef>>;
    balance?: Partial<Balance>;
    openings?: number;
  } = {},
): Content {
  const n = opts.normals ?? 50;
  const cards: EventCardInput[] = [];
  for (let i = 0; i < n; i++) {
    cards.push(card(`n_${i}`, 'normal', {}, {}, i < (opts.openings ?? 0) ? { opening: true } : {}));
  }
  for (const w of [13, 26, 39, 52] as const) {
    const e = opts.fixedEffectsByWeek?.[w] ?? opts.fixedEffects ?? {};
    cards.push(card(`f_w${w}`, 'fixed', e, e, { fixed_week: w }));
  }
  cards.push(card('t_1', 'tutorial', {}, {}, { tutorial_week: 1 }));
  cards.push(card('t_2', 'tutorial', {}, {}, { tutorial_week: 2 }));
  cards.push(card('c_audit_visit', 'chain', { legal: -5 }, { legal: -5 }));
  cards.push(...(opts.extra ?? []));
  const parsed = cards.map((c) => CardSchema.parse(c));
  return buildContent(parsed, { ...defaultStyles, ...opts.styles }, { ...defaultBalance, ...opts.balance });
}

/** 効果のないスタイル（倍率と切り札の影響を消したいテスト用） */
export const plainStyle: StyleDef = {
  id: 'taiikukai',
  name: { web: 'plain' },
  description: { web: 'plain' },
  passives: [],
  trump: { name: { web: 'trump' }, effects: { cash: 0, client: 0, dev: 0, legal: 0 } },
};

export function startAction(over: Partial<{ styleId: StyleId; isFirstPlay: boolean; seenCardIds: string[]; seed: number }> = {}) {
  return {
    type: 'start' as const,
    styleId: over.styleId ?? ('taiikukai' as StyleId),
    companyName: 'テスト株式会社',
    isFirstPlay: over.isFirstPlay ?? false,
    seenCardIds: over.seenCardIds ?? [],
    seed: over.seed ?? 1,
    now: '2026-11-12T00:00:00.000Z',
  };
}

/** 状態の一部を書き換えたコピー（テストで状況を作るため） */
export function withState(s: RuntimeGameState, over: Partial<RuntimeGameState>): RuntimeGameState {
  return { ...s, ...over };
}
