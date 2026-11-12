/**
 * 本番のカード一式。JSON はビルド前に validate:cards で検証済みだが、型を確定させるため読み込み時にも parse する。
 */
import { CardFileSchema, type EventCard } from './schema';
import tutorial from './cards/tutorial.json';
import fixed from './cards/fixed.json';
import chain from './cards/chain.json';
import normal from './cards/normal.json';
import style from './cards/style.json';

export const cards: readonly EventCard[] = CardFileSchema.parse([...tutorial, ...fixed, ...chain, ...normal, ...style]);
