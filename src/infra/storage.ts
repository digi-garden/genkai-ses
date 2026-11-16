/**
 * LocalStorage / sessionStorage の読み書き（docs/design/05_data_design.md 5・6章、要件 7.2-4）
 * 読み書きの例外（Safari のプライベートモード、容量超過、ブロック）はここで握りつぶし、
 * そのセッションの間はメモリで保持する。
 */
import { ENDING_IDS } from '../content/types';
import { defaultSaveData, SAVE_SCHEMA_VERSION, type SaveData } from '../core/progress';
import type { SaveRepository, SessionRepository } from '../core/ports';
import type { RuntimeGameState } from '../core/state';

export const SAVE_KEY = 'genkai_ses_savedata_v1';
export const SESSION_KEY = 'genkai_ses_session_v1';

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function memoryKV(): KV {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** 書けるかどうかを実際に試し、ダメならメモリに切り替える */
export function openStorage(get: () => Storage): { kv: KV; persistent: boolean } {
  try {
    const s = get();
    const probe = '__genkai_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return { kv: s, persistent: true };
  } catch {
    return { kv: memoryKV(), persistent: false };
  }
}

const ACHIEVEMENT_IDS = ['white_company', 'bicycle', 'emperor', 'phoenix', 'audit_regular', 'speed_quit'] as const;

/**
 * SaveData の形の検証（05 の 5.3）。zod を使わない手書きの検証（初期の JS を小さく保つため。08 の 1.2）。
 * 単体テストで、壊れたデータを弾くことを確かめている。
 */
function isSaveData(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const r = d as Record<string, unknown>;
  const str = (v: unknown) => typeof v === 'string';
  const strOrNull = (v: unknown) => v === null || str(v);
  const strArr = (v: unknown, allowed?: readonly string[]) =>
    Array.isArray(v) && v.every((x) => str(x) && (!allowed || allowed.includes(x as string)));
  const hs = r.high_score as Record<string, unknown> | null | undefined;
  return (
    r.schema_version === 1 &&
    strOrNull(r.first_played_at) &&
    strOrNull(r.last_played_at) &&
    Number.isInteger(r.play_count) &&
    (r.play_count as number) >= 0 &&
    typeof r.sound_enabled === 'boolean' &&
    str(r.last_company_name) &&
    strArr(r.seen_card_ids) &&
    typeof r.heartbeat_sent === 'boolean' &&
    strArr(r.unlocked_endings, ENDING_IDS) &&
    strArr(r.unlocked_achievements, ACHIEVEMENT_IDS) &&
    typeof hs === 'object' &&
    hs !== null &&
    typeof hs.max_weeks === 'number' &&
    typeof hs.max_sales === 'number'
  );
}

/** 古い版から新しい版への移行（v1 だけなので、今は空） */
const migrations: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {};

export function createSaveRepository(
  get: () => Storage,
  knownCardIds: ReadonlySet<string>,
): SaveRepository {
  const { kv, persistent } = openStorage(get);
  let readOnly = false;

  const safeSet = (k: string, v: string) => {
    try {
      kv.setItem(k, v);
    } catch {
      /* 容量超過など。記録は失われるが、プレイは続けられるようにする */
    }
  };

  return {
    persistent,
    load() {
      let raw: string | null;
      try {
        raw = kv.getItem(SAVE_KEY);
      } catch {
        return defaultSaveData();
      }
      if (raw === null) return defaultSaveData();
      try {
        let data = JSON.parse(raw) as Record<string, unknown>;
        const v = typeof data.schema_version === 'number' ? data.schema_version : 0;
        if (v > SAVE_SCHEMA_VERSION) {
          // 新しい版のデータ（古いページがキャッシュから開かれたなど）。上書きしない
          readOnly = true;
        }
        for (let ver = v; ver < SAVE_SCHEMA_VERSION; ver++) {
          const m = migrations[ver];
          if (!m) throw new Error(`v${ver} からの移行がない`);
          data = m(data);
        }
        const candidate = readOnly ? { ...data, schema_version: 1 } : data;
        if (!isSaveData(candidate)) throw new Error('形式が違う');
        const d = candidate;
        return { ...d, seen_card_ids: d.seen_card_ids.filter((id) => knownCardIds.has(id)) };
      } catch {
        // 壊れたデータは1世代だけ退避して、初期データで作り直す
        safeSet(`${SAVE_KEY}_broken`, raw);
        return defaultSaveData();
      }
    },
    save(data) {
      if (readOnly) return;
      safeSet(SAVE_KEY, JSON.stringify(data));
    },
  };
}

interface Snapshot {
  schema_version: 1;
  state: RuntimeGameState;
  saved_at: string;
  content_hash: string;
}

/**
 * 途中データ。復元の検証は、形の最低限の確認と、content_hash の一致、参照するカードの存在で行う
 * （state の全項目を zod で書くと、型の二重管理になるため）。
 */
export function createSessionRepository(
  get: () => Storage,
  hash: string,
  knownCardIds: ReadonlySet<string>,
  now: () => string,
): SessionRepository {
  const { kv } = openStorage(get);
  const valid = (s: unknown): s is RuntimeGameState => {
    if (typeof s !== 'object' || s === null) return false;
    const r = s as Partial<RuntimeGameState>;
    return (
      typeof r.currentWeek === 'number' &&
      r.currentWeek >= 1 &&
      r.currentWeek <= 52 &&
      typeof r.currentCardId === 'string' &&
      knownCardIds.has(r.currentCardId) &&
      Array.isArray(r.deck) &&
      r.deck.every((id) => knownCardIds.has(id)) &&
      Array.isArray(r.pendingInjections) &&
      r.pendingInjections.every((p) => knownCardIds.has(p.cardId)) &&
      typeof r.rngState === 'number' &&
      typeof r.parameters === 'object' &&
      r.ending === undefined
    );
  };
  return {
    load() {
      try {
        const raw = kv.getItem(SESSION_KEY);
        if (!raw) return null;
        const snap = JSON.parse(raw) as Partial<Snapshot>;
        if (snap.schema_version !== 1 || snap.content_hash !== hash || !valid(snap.state)) {
          kv.removeItem(SESSION_KEY);
          return null;
        }
        return snap.state;
      } catch {
        return null;
      }
    },
    save(state) {
      const snap: Snapshot = { schema_version: 1, state, saved_at: now(), content_hash: hash };
      try {
        kv.setItem(SESSION_KEY, JSON.stringify(snap));
      } catch {
        /* 途中データは失われてもよい */
      }
    },
    clear() {
      try {
        kv.removeItem(SESSION_KEY);
      } catch {
        /* 何もしない */
      }
    },
  };
}
