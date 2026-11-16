/**
 * core に渡すコンテンツ一式（docs/design/04_game_logic.md 3章）
 * テストとシミュレータでは、差し替えたカードや balance で作れる。
 */
import type { EventCard } from './schema';
import type { Balance, StyleDef, StyleId } from './types';

export interface Content {
  cards: readonly EventCard[];
  cardsById: ReadonlyMap<string, EventCard>;
  styles: Readonly<Record<StyleId, StyleDef>>;
  balance: Balance;
  /** 季節固定カードの ID（週ごと。MVP は各週1枚） */
  fixedByWeek: ReadonlyMap<number, readonly string[]>;
  /** 導入カードの ID（週ごと） */
  tutorialByWeek: ReadonlyMap<number, string>;
}

export function buildContent(
  cards: readonly EventCard[],
  styles: Readonly<Record<StyleId, StyleDef>>,
  balance: Balance,
): Content {
  const cardsById = new Map(cards.map((c) => [c.id, c] as const));
  const fixedByWeek = new Map<number, string[]>();
  const tutorialByWeek = new Map<number, string>();
  for (const c of cards) {
    if (c.kind === 'fixed' && c.fixed_week !== undefined) {
      const list = fixedByWeek.get(c.fixed_week) ?? [];
      list.push(c.id);
      fixedByWeek.set(c.fixed_week, list);
    }
    if (c.kind === 'tutorial' && c.tutorial_week !== undefined) tutorialByWeek.set(c.tutorial_week, c.id);
  }
  return { cards, cardsById, styles, balance, fixedByWeek, tutorialByWeek };
}

export type { EventCard, Choice, CardKind, EventCardInput } from './schema';
export * from './types';
