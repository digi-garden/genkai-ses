/**
 * 計測イベントの組み立て（docs/design/06_external_interface.md 2.2）。純粋関数で、送信は infra が行う。
 */
import type { EndingId } from '../content/types';
import type { SaveData } from './progress';
import type { GameEvent, RuntimeGameState } from './state';

export type AnalyticsParams = Record<string, string | number | boolean>;
export interface AnalyticsEvent {
  name: string;
  params: AnalyticsParams;
  /** ページが閉じられても届くように送る（drop_at_week） */
  beacon?: boolean;
}

/** EEA・英国・スイスと推定するタイムゾーン（06 の 2.1） */
const EEA_EXTRA = new Set(['Atlantic/Reykjavik', 'Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores', 'Atlantic/Faroe', 'Arctic/Longyearbyen']);
export function needsConsent(timeZone: string | undefined): boolean {
  if (!timeZone) return false;
  return timeZone.startsWith('Europe/') || EEA_EXTRA.has(timeZone);
}

/** 端末の日付（現地時刻）どうしの差（日数） */
export function daysBetween(fromIso: string | null, now: Date): number {
  if (!fromIso) return 0;
  const a = new Date(fromIso);
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((day(now) - day(a)) / 86_400_000));
}

export function commonParams(save: SaveData, now: Date): AnalyticsParams {
  return {
    play_count: save.play_count,
    days_since_first_play: daysBetween(save.first_played_at, now),
    store_safe: false,
  };
}

/** step が返したイベントから、送る計測イベントを作る */
export function toAnalyticsEvents(
  events: readonly GameEvent[],
  state: RuntimeGameState,
  ctx: { isRetry: boolean; now: Date },
): AnalyticsEvent[] {
  const out: AnalyticsEvent[] = [];
  for (const e of events) {
    switch (e.type) {
      case 'runStarted':
        out.push({ name: 'game_start', params: { style_id: e.styleId, is_retry: ctx.isRetry } });
        break;
      case 'milestoneReached':
        out.push({ name: 'funnel_milestone', params: { reached_week: e.week } });
        break;
      case 'trumpUsed':
        out.push({ name: 'skill_used', params: { week_number: e.week, style_id: state.styleId } });
        break;
      case 'gameOver':
        out.push({ name: 'game_over', params: { reason_id: e.ending, week_number: e.week, sales: e.sales, has_regret: e.regret !== undefined } });
        out.push({ name: 'game_over_reason', params: { reason_id: e.ending } });
        out.push(duration(state, e.ending, ctx.now));
        break;
      case 'gameClear':
        out.push({ name: 'game_clear', params: { style_id: state.styleId, sales: e.sales, achievement_id: e.achievements[0] ?? 'none' } });
        out.push(duration(state, 'clear', ctx.now));
        break;
      default:
        break;
    }
  }
  return out;
}

function duration(state: RuntimeGameState, ending: EndingId, now: Date): AnalyticsEvent {
  const sec = Math.max(0, Math.round((now.getTime() - new Date(state.runStartedAt).getTime()) / 1000));
  return { name: 'play_duration', params: { survival_week: ending === 'clear' ? 52 : state.currentWeek - 1, duration_sec: sec } };
}
