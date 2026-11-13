/**
 * 本番のカード一式。
 * JSON の検証は CI とビルド前の validate:cards（zod）で行うので、ブラウザでは zod を使わず、
 * 書き省いた効果値を 0 で補うだけにする（zod をバンドルに入れないため。08 の 1.2 の容量予算）。
 */
import type { EventCard } from './schema';
import { PARAMS, type ChoiceEffect } from './types';
import tutorial from './cards/tutorial.json';
import fixed from './cards/fixed.json';
import chain from './cards/chain.json';
import normal from './cards/normal.json';
import style from './cards/style.json';

type RawChoice = Omit<EventCard['choice_left'], 'effects'> & { effects: Partial<ChoiceEffect> };
type RawCard = Omit<EventCard, 'choice_left' | 'choice_right'> & { choice_left: RawChoice; choice_right: RawChoice };

function fill(c: RawChoice): EventCard['choice_left'] {
  const effects = Object.fromEntries(PARAMS.map((p) => [p, c.effects[p] ?? 0])) as ChoiceEffect;
  return { ...c, effects };
}

export function normalizeCards(raw: readonly RawCard[]): EventCard[] {
  return raw.map((c) => ({ ...c, choice_left: fill(c.choice_left), choice_right: fill(c.choice_right) }));
}

export const cards: readonly EventCard[] = normalizeCards([...tutorial, ...fixed, ...chain, ...normal, ...style] as RawCard[]);
