/**
 * step 関数（docs/design/04_game_logic.md 3〜5章・7.3・8.4）
 * 状態の変化はここだけで起こす。引数は書き換えず、新しい状態とイベントを返す。
 */
import type { Content } from '../content';
import type { ChoiceEffect, EndingId } from '../content/types';
import { buildDeck, injectionFromChoice, scheduleInjection, showNextCard } from './deck';
import { addClamped, applyPassives } from './effects';
import { computeSales, judgeAchievements, judgeEnding, judgeRegret } from './judge';
import { seedRandom } from './rng';
import { cloneState, type Action, type GameEvent, type RuntimeGameState, type Side } from './state';

export interface StepResult {
  state: RuntimeGameState;
  events: GameEvent[];
}

export function step(state: RuntimeGameState | null, action: Action, content: Content): StepResult {
  if (action.type === 'start') return start(action, content);
  if (state === null) throw new Error('ランが始まっていません（最初に start を渡す）');
  if (state.ending !== undefined) return { state, events: [] }; // E14：終了後は何もしない
  return action.type === 'choose' ? choose(state, action.side, content) : applyTrump(state, content);
}

function start(action: Extract<Action, { type: 'start' }>, content: Content): StepResult {
  const b = content.balance;
  const [deck, rngState] = buildDeck(content, action.styleId, action.isFirstPlay, action.seenCardIds, seedRandom(action.seed));
  const state: RuntimeGameState = {
    styleId: action.styleId,
    companyName: action.companyName,
    isFirstPlay: action.isFirstPlay,
    runStartedAt: action.now,
    currentWeek: 1,
    currentCardId: '',
    parameters: { cash: b.initialParam, client: b.initialParam, dev: b.initialParam, legal: b.initialParam },
    cashGainedTotal: 0,
    minLegalSinceQ2: 100,
    maxCashSinceQ2: 0,
    usedTrumpCard: false,
    deck,
    usedCardIds: [],
    pendingInjections: [],
    shownChainCardIds: [],
    rngState,
  };
  const events: GameEvent[] = [{ type: 'runStarted', styleId: action.styleId, isFirstPlay: action.isFirstPlay }];
  showNextCard(state, content, events);
  return { state, events };
}

/** パラメータへの適用と、売上用の累計・極値の記録（処理順 5〜6） */
function applyToState(s: RuntimeGameState, applied: ChoiceEffect, content: Content): void {
  s.parameters = addClamped(s.parameters, applied);
  s.cashGainedTotal += Math.max(applied.cash, 0);
  if (s.currentWeek >= content.balance.extremesFromWeek) {
    s.minLegalSinceQ2 = Math.min(s.minLegalSinceQ2, s.parameters.legal);
    s.maxCashSinceQ2 = Math.max(s.maxCashSinceQ2, s.parameters.cash);
  }
}

function currentCard(s: RuntimeGameState, content: Content) {
  const card = content.cardsById.get(s.currentCardId);
  if (!card) throw new Error(`カード ${s.currentCardId} が見つかりません`);
  return card;
}

/** 選択肢を選んだときに適用される効果（倍率と丸めの後）。予兆ドットとシミュレータでも使う */
export function appliedEffects(state: RuntimeGameState, side: Side, content: Content): ChoiceEffect {
  const card = currentCard(state, content);
  const choice = side === 'left' ? card.choice_left : card.choice_right;
  return applyPassives(choice.effects, content.styles[state.styleId].passives);
}

function choose(prev: RuntimeGameState, side: Side, content: Content): StepResult {
  const s = cloneState(prev);
  const events: GameEvent[] = [];
  const card = currentCard(s, content);
  const choice = side === 'left' ? card.choice_left : card.choice_right;
  const applied = applyPassives(choice.effects, content.styles[s.styleId].passives);

  applyToState(s, applied, content);
  events.push({ type: 'turnResolved', week: s.currentWeek, side, applied });

  if (card.kind === 'chain' && s.currentOrigin) {
    s.lastChainResolved = {
      resolvedWeek: s.currentWeek,
      originWeek: s.currentOrigin.week,
      regretText: s.currentOrigin.regretText,
      effects: applied,
    };
  }

  const inj = injectionFromChoice(choice, content);
  if (inj) scheduleInjection(s, inj, content, events);

  if (card.kind === 'normal') s.usedCardIds.push(card.id);

  const ending = judgeEnding(s.parameters);
  if (ending) return finish(s, ending, content, events);

  if (s.currentWeek >= 52) return finish(s, 'clear', content, events);
  s.currentWeek += 1;
  showNextCard(s, content, events);
  return { state: s, events };
}

function applyTrump(prev: RuntimeGameState, content: Content): StepResult {
  if (prev.usedTrumpCard) return { state: prev, events: [] };
  const s = cloneState(prev);
  const events: GameEvent[] = [];
  const trump = content.styles[s.styleId].trump;
  const applied = { ...trump.effects }; // 倍率は掛けない
  applyToState(s, applied, content);
  s.usedTrumpCard = true;
  events.push({ type: 'trumpUsed', week: s.currentWeek, applied });
  if (trump.inject) scheduleInjection(s, trump.inject, content, events);
  const ending = judgeEnding(s.parameters);
  if (ending) return finish(s, ending, content, events);
  return { state: s, events }; // 週は進めない。同じカードのまま
}

function finish(s: RuntimeGameState, ending: EndingId, content: Content, events: GameEvent[]): StepResult {
  const b = content.balance;
  s.ending = ending;
  const sales = computeSales(s, ending, b);
  const achievements = judgeAchievements(s, ending, sales, b);
  if (ending === 'clear') {
    events.push({ type: 'gameClear', sales, achievements });
  } else {
    s.endingDirection = ending.endsWith('_zero') ? 'zero' : 'max';
    const regret = judgeRegret(s, ending, b);
    if (regret) s.regret = regret;
    events.push({
      type: 'gameOver',
      ending,
      week: s.currentWeek,
      sales,
      ...(regret ? { regret } : {}),
      achievements,
    });
  }
  return { state: s, events };
}
