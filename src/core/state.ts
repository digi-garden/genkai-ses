/**
 * ラン（1回のプレイ）の状態とイベント（要件 3.2、docs/design/04_game_logic.md 3章・10章）
 */
import type { CardKind } from '../content/schema';
import type { ChoiceEffect, EndingId, StyleId, Text } from '../content/types';
import type { RngState } from './rng';

export interface PendingInjection {
  targetWeek: number;
  cardId: string;
  originWeek: number;
  regretText: Text;
}

export interface Regret {
  week: number;
  regretText: Text;
}

export interface RuntimeGameState {
  styleId: StyleId;
  companyName: string;
  currentWeek: number;
  currentCardId: string;
  parameters: ChoiceEffect;
  cashGainedTotal: number;
  minLegalSinceQ2: number;
  maxCashSinceQ2: number;
  usedTrumpCard: boolean;
  deck: string[];
  usedCardIds: string[];
  pendingInjections: PendingInjection[];
  shownChainCardIds: string[];
  isFirstPlay: boolean;
  currentOrigin?: Regret;
  lastChainResolved?: { resolvedWeek: number; originWeek: number; regretText: Text; effects: ChoiceEffect };
  regret?: Regret;
  endingDirection?: 'zero' | 'max';
  runStartedAt: string;
  rngState: RngState;
  ending?: EndingId;
}

export type Side = 'left' | 'right';

export type Action =
  | {
      type: 'start';
      styleId: StyleId;
      companyName: string;
      isFirstPlay: boolean;
      seenCardIds: readonly string[];
      seed: number;
      now: string;
    }
  | { type: 'choose'; side: Side }
  | { type: 'useTrump' };

export type AchievementId = 'white_company' | 'bicycle' | 'emperor' | 'phoenix' | 'audit_regular' | 'speed_quit';

export type GameEvent =
  | { type: 'runStarted'; styleId: StyleId; isFirstPlay: boolean }
  | { type: 'cardShown'; cardId: string; week: number; kind: CardKind }
  | { type: 'milestoneReached'; week: number }
  | { type: 'turnResolved'; week: number; side: Side; applied: ChoiceEffect }
  | { type: 'injectionScheduled'; cardId: string; targetWeek: number; originWeek: number }
  | { type: 'injectionDiscarded'; cardId: string }
  | { type: 'trumpUsed'; week: number; applied: ChoiceEffect }
  | {
      type: 'gameOver';
      ending: Exclude<EndingId, 'clear'>;
      week: number;
      sales: number;
      regret?: Regret;
      achievements: AchievementId[];
    }
  | { type: 'gameClear'; sales: number; achievements: AchievementId[] };

export const MILESTONE_WEEKS: readonly number[] = [13, 26, 39, 52];

/** 状態のコピー（配列とオブジェクトを複製する。core の関数は引数を書き換えない） */
export function cloneState(s: RuntimeGameState): RuntimeGameState {
  return {
    ...s,
    parameters: { ...s.parameters },
    deck: s.deck.slice(),
    usedCardIds: s.usedCardIds.slice(),
    pendingInjections: s.pendingInjections.slice(),
    shownChainCardIds: s.shownChainCardIds.slice(),
  };
}
