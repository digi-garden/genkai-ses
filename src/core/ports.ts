/**
 * ポートの型（docs/design/01_architecture.md 4.1）。実装は infra、組み立ては app。
 */
import type { SaveData } from './progress';
import type { RuntimeGameState } from './state';

export interface SaveRepository {
  load(): SaveData;
  save(data: SaveData): void;
  /** LocalStorage に書けない環境（メモリだけで保持）なら false（要件 7.2-4） */
  readonly persistent: boolean;
}

export interface SessionRepository {
  /** 途中データ。検証と content_hash の照合に通ったものだけを返す */
  load(): RuntimeGameState | null;
  save(state: RuntimeGameState): void;
  clear(): void;
}

export interface Random {
  newSeed(): number;
}

export interface Clock {
  now(): string;
}

export interface AnalyticsPort {
  send(name: string, params: Record<string, string | number | boolean>, opts?: { beacon?: boolean }): void;
}

export type ConsentChoice = 'granted' | 'denied';

export interface ConsentRepository {
  /** 同意が必要な地域か（タイムゾーンで推定） */
  readonly required: boolean;
  get(): ConsentChoice | null;
  set(choice: ConsentChoice): void;
}
