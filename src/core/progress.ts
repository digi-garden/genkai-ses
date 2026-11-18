/**
 * プレイの記録（SaveData）の更新（docs/design/05_data_design.md 5章）。純粋関数で、保存は infra が行う。
 */
import type { AchievementId } from '../content/achievements';
import type { EndingId } from '../content/types';

export const SAVE_SCHEMA_VERSION = 1;

/** 効果音の音量（2026-11-18 追加）。小・中・大の3段階 */
export type SoundVolume = 'low' | 'mid' | 'high';
export const SOUND_VOLUMES: readonly SoundVolume[] = ['low', 'mid', 'high'];

export interface SaveData {
  schema_version: 1;
  first_played_at: string | null;
  last_played_at: string | null;
  play_count: number;
  sound_enabled: boolean;
  /** 2026-11-18 追加。古いデータにはないので、読み込み時に 'mid' で補う（schema_version は上げない） */
  sound_volume: SoundVolume;
  last_company_name: string;
  seen_card_ids: string[];
  heartbeat_sent: boolean;
  unlocked_endings: EndingId[];
  unlocked_achievements: AchievementId[];
  high_score: { max_weeks: number; max_sales: number };
}

export function defaultSaveData(): SaveData {
  return {
    schema_version: 1,
    first_played_at: null,
    last_played_at: null,
    play_count: 0,
    sound_enabled: false,
    sound_volume: 'mid',
    last_company_name: '',
    seen_card_ids: [],
    heartbeat_sent: false,
    unlocked_endings: [],
    unlocked_achievements: [],
    high_score: { max_weeks: 0, max_sales: 0 },
  };
}

export function onRunStarted(s: SaveData, companyName: string, now: string): SaveData {
  return {
    ...s,
    play_count: s.play_count + 1,
    first_played_at: s.first_played_at ?? now,
    last_played_at: now,
    last_company_name: companyName,
  };
}

export function addSeen(s: SaveData, ids: readonly string[]): SaveData {
  const fresh = ids.filter((id) => !s.seen_card_ids.includes(id));
  return fresh.length ? { ...s, seen_card_ids: [...s.seen_card_ids, ...fresh] } : s;
}

const uniq = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

export function onRunEnded(
  s: SaveData,
  r: { ending: EndingId; survivedWeeks: number; sales: number; achievements: readonly AchievementId[] },
): { save: SaveData; newRecord: { weeks: boolean; sales: boolean }; newEnding: boolean; newAchievements: AchievementId[] } {
  const newAchievements = r.achievements.filter((a) => !s.unlocked_achievements.includes(a));
  const newRecord = { weeks: r.survivedWeeks > s.high_score.max_weeks, sales: r.sales > s.high_score.max_sales };
  return {
    save: {
      ...s,
      unlocked_endings: uniq([...s.unlocked_endings, r.ending]),
      unlocked_achievements: uniq([...s.unlocked_achievements, ...r.achievements]),
      high_score: {
        max_weeks: Math.max(s.high_score.max_weeks, r.survivedWeeks),
        max_sales: Math.max(s.high_score.max_sales, r.sales),
      },
    },
    newRecord,
    newEnding: !s.unlocked_endings.includes(r.ending),
    newAchievements,
  };
}
