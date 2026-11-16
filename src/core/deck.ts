/**
 * 山札・ドロー・連鎖の予約（docs/design/04_game_logic.md 6章、要件 3.1-6・3.2）
 */
import type { Content } from '../content';
import type { Choice } from '../content/schema';
import type { InjectionParam, StyleId } from '../content/types';
import { randomInt, shuffle, type RngState } from './rng';
import type { GameEvent, RuntimeGameState } from './state';

/** 山札の対象（通常カードのうち、共通カードと選んだスタイルのカード） */
export function deckPool(content: Content, styleId: StyleId): string[] {
  return content.cards
    .filter((c) => c.kind === 'normal' && (c.style_only === undefined || c.style_only === styleId))
    .map((c) => c.id);
}

/** 山札を作る（6.2）。初回は opening を先に、2回目以降は未読を先に */
export function buildDeck(
  content: Content,
  styleId: StyleId,
  isFirstPlay: boolean,
  seenCardIds: readonly string[],
  rng: RngState,
): [string[], RngState] {
  const pool = deckPool(content, styleId);
  let front: string[];
  let back: string[];
  if (isFirstPlay) {
    const opening = (id: string) => content.cardsById.get(id)?.opening === true;
    front = pool.filter(opening);
    back = pool.filter((id) => !opening(id));
  } else {
    const seen = new Set(seenCardIds);
    front = pool.filter((id) => !seen.has(id));
    back = pool.filter((id) => seen.has(id));
  }
  const [f, r1] = shuffle(front, rng);
  const [b, r2] = shuffle(back, r1);
  return [[...f, ...b], r2];
}

function isFixedWeek(content: Content, week: number): boolean {
  return (content.fixedByWeek.get(week)?.length ?? 0) > 0;
}

/**
 * 次のカードを決める（6.1）。state は呼び出し側で複製済みのものを渡す（この関数は state を書き換える）。
 */
export function showNextCard(state: RuntimeGameState, content: Content, events: GameEvent[]): void {
  const w = state.currentWeek;
  delete state.currentOrigin;
  let id: string | undefined;

  const tutorial = state.isFirstPlay && w <= 2 ? content.tutorialByWeek.get(w) : undefined;
  const fixed = content.fixedByWeek.get(w);
  const pendingIndex = state.pendingInjections.findIndex((p) => p.targetWeek === w);

  if (tutorial !== undefined) {
    id = tutorial; // 1. 導入カード
  } else if (fixed !== undefined && fixed.length > 0) {
    // 2. 季節固定（候補が複数あれば乱数で選ぶ。MVP は各週1枚）
    let i = 0;
    if (fixed.length > 1) [i, state.rngState] = randomInt(state.rngState, 0, fixed.length - 1);
    id = fixed[i];
  } else if (pendingIndex >= 0) {
    // 3. 連鎖カード
    const [p] = state.pendingInjections.splice(pendingIndex, 1);
    if (p) {
      id = p.cardId;
      state.shownChainCardIds.push(p.cardId);
      state.currentOrigin = { week: p.originWeek, regretText: p.regretText };
    }
  }

  if (id === undefined) {
    // 4. 通常の山札。空なら使用済みを再シャッフル（それも空なら、山札の対象全体）
    if (state.deck.length === 0) {
      const source = state.usedCardIds.length > 0 ? state.usedCardIds : deckPool(content, state.styleId);
      [state.deck, state.rngState] = shuffle(source, state.rngState);
      state.usedCardIds = [];
    }
    id = state.deck.shift();
  }
  if (id === undefined) throw new Error(`第${w}週に表示できるカードがありません`);

  state.currentCardId = id;
  const card = content.cardsById.get(id);
  if (!card) throw new Error(`カード ${id} が見つかりません`);
  events.push({ type: 'cardShown', cardId: id, week: w, kind: card.kind });
  if (w === 13 || w === 26 || w === 39 || w === 52) events.push({ type: 'milestoneReached', week: w });
}

/** 選択肢の連鎖を、予約の共通形にそろえる（6.3） */
export function injectionFromChoice(c: Choice, content: Content): InjectionParam | undefined {
  if (c.inject_card_id === undefined || c.regret_text === undefined) return undefined;
  return {
    cardId: c.inject_card_id,
    delay: c.inject_delay ?? content.balance.defaultInjectDelay,
    regretText:
      c.regret_text_store_safe === undefined
        ? { web: c.regret_text }
        : { web: c.regret_text, store: c.regret_text_store_safe },
  };
}

/**
 * 連鎖の予約（6.3）。同じ連鎖カードは1ランに1回まで。季節固定・導入・予約済みの週を避けて後ろへずらし、
 * Week 52 を超えたら破棄する。state は複製済みのものを渡す。
 */
export function scheduleInjection(
  state: RuntimeGameState,
  inj: InjectionParam,
  content: Content,
  events: GameEvent[],
): void {
  const id = inj.cardId;
  if (state.pendingInjections.some((p) => p.cardId === id) || state.shownChainCardIds.includes(id)) return;
  const [min, max] = inj.delay;
  let offset: number;
  [offset, state.rngState] = randomInt(state.rngState, min, max);
  let target = state.currentWeek + offset;
  while (
    isFixedWeek(content, target) ||
    (state.isFirstPlay && target <= 2) ||
    state.pendingInjections.some((p) => p.targetWeek === target)
  ) {
    target += 1;
  }
  if (target > 52) {
    events.push({ type: 'injectionDiscarded', cardId: id });
    return;
  }
  state.pendingInjections.push({ targetWeek: target, cardId: id, originWeek: state.currentWeek, regretText: inj.regretText });
  events.push({ type: 'injectionScheduled', cardId: id, targetWeek: target, originWeek: state.currentWeek });
}
