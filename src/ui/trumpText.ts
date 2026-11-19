import type { ChoiceEffect } from '../content/types';

const PARAMS = ['cash', 'client', 'dev', 'legal'] as const;
const LONG = { cash: '資金', client: '顧客満足', dev: '現場メンタル', legal: 'コンプラ' } as const;
const SHORT = { cash: '資金', client: '顧客', dev: '現場', legal: 'コンプラ' } as const;
/** これ以上なら「大きく」（↑↑／↓↓） */
const BIG = 30;

/** 経営スタイル選択の説明文：「現場メンタルが大きく上がる、コンプラが下がる」 */
export function trumpText(e: ChoiceEffect): string {
  return PARAMS.filter((k) => e[k] !== 0)
    .map((k) => `${LONG[k]}が${Math.abs(e[k]) >= BIG ? '大きく' : ''}${e[k] > 0 ? '上がる' : '下がる'}`)
    .join('、');
}

/** 切り札の確認（R22）：「現場 ↑↑ ／ コンプラ ↓」。数値は出さない */
export function trumpArrows(e: ChoiceEffect): string {
  return PARAMS.filter((k) => e[k] !== 0)
    .map((k) => `${SHORT[k]} ${(e[k] > 0 ? '↑' : '↓').repeat(Math.abs(e[k]) >= BIG ? 2 : 1)}`)
    .join(' ／ ');
}
