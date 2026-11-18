/**
 * 効果値の計算（docs/design/04_game_logic.md 7章、要件 3.1-6）
 */
import { PARAMS, type ChoiceEffect, type Param, type Passive } from '../content/types';

/** 符号付き四捨五入（0.5 は 0 から遠い方へ）。Math.round(-2.5) = -2 の非対称を避ける */
export function signedRound(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x)) + 0; // + 0 で -0 を 0 にする
}

/**
 * パッシブ倍率を掛けて丸める。倍率は名前の方向（gain は増えるとき、loss は減るとき）だけに掛け、
 * 同じパラメータの倍率は定義順に逐次乗算し、丸めは最後に1回だけ行う。
 */
export function applyPassives(e: ChoiceEffect, passives: readonly Passive[]): ChoiceEffect {
  const out = { ...e };
  for (const p of PARAMS) {
    let v = e[p];
    for (const ps of passives) {
      if (ps.param !== p) continue;
      if ((ps.direction === 'gain' && e[p] > 0) || (ps.direction === 'loss' && e[p] < 0)) v *= ps.factor;
    }
    out[p] = signedRound(v);
  }
  return out;
}

export function clamp(v: number): number {
  return Math.min(100, Math.max(0, v));
}

/** パラメータに効果を足し、0〜100 にクランプする */
export function addClamped(params: ChoiceEffect, applied: ChoiceEffect): ChoiceEffect {
  return {
    cash: clamp(params.cash + applied.cash),
    client: clamp(params.client + applied.client),
    dev: clamp(params.dev + applied.dev),
    legal: clamp(params.legal + applied.legal),
  };
}

/**
 * 切り札で実際に動く量（R21、2026-11-18）。増やす向きは safeMax、減らす向きは safeMin で止める（切り札では倒産しない）。
 * もともと範囲の外にあるゲージは、その向きには動かさない（悪化も改善もしない）。逆向き（範囲へ戻す向き）はそのまま。
 */
export function trumpApplied(params: ChoiceEffect, effects: ChoiceEffect, safeMin: number, safeMax: number): ChoiceEffect {
  const one = (p: number, e: number) => (e > 0 ? Math.max(0, Math.min(e, safeMax - p)) : e < 0 ? Math.min(0, Math.max(e, safeMin - p)) : 0);
  return {
    cash: one(params.cash, effects.cash),
    client: one(params.client, effects.client),
    dev: one(params.dev, effects.dev),
    legal: one(params.legal, effects.legal),
  };
}

export type Hint = 'none' | 'small' | 'large';

/** 予兆ドット（要件 7.1-1）：|v| が 0 なら none、1〜9 は small、10 以上は large。向きは返さない */
export function hintOf(v: number): Hint {
  const a = Math.abs(v);
  if (a === 0) return 'none';
  return a < 10 ? 'small' : 'large';
}

export function hintsOf(e: ChoiceEffect): Record<Param, Hint> {
  return { cash: hintOf(e.cash), client: hintOf(e.client), dev: hintOf(e.dev), legal: hintOf(e.legal) };
}
