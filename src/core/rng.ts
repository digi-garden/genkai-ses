/**
 * シード付き乱数（docs/design/04_game_logic.md 9章）
 * mulberry32。状態は 32 ビットの整数で、RuntimeGameState.rngState に保存する。
 * どの関数も「結果と新しい状態」の組を返し、状態を外に持たない。
 */

export type RngState = number;

export function seedRandom(seed: number): RngState {
  return seed >>> 0;
}

/** [0, 2^32) の整数と、新しい状態 */
export function nextUint32(s: RngState): [number, RngState] {
  const next = (s + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [(t ^ (t >>> 14)) >>> 0, next];
}

/** [0, 1) の小数 */
export function nextFloat(s: RngState): [number, RngState] {
  const [u, next] = nextUint32(s);
  return [u / 4294967296, next];
}

/** min 以上 max 以下の整数（両端を含む） */
export function randomInt(s: RngState, min: number, max: number): [number, RngState] {
  const [f, next] = nextFloat(s);
  return [min + Math.floor(f * (max - min + 1)), next];
}

/** Fisher–Yates 法。元の配列は変えない */
export function shuffle<T>(items: readonly T[], s: RngState): [T[], RngState] {
  const out = items.slice();
  let state = s;
  for (let i = out.length - 1; i > 0; i--) {
    let j: number;
    [j, state] = randomInt(state, 0, i);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return [out, state];
}
