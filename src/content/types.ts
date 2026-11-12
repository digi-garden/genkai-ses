/**
 * コンテンツと core が共有する基本の型（要件 3.2、docs/design/05_data_design.md 4章・7章）
 * content は他の層に依存しないので、core が使う型もここで定義する。
 */

export const PARAMS = ['cash', 'client', 'dev', 'legal'] as const;
export type Param = (typeof PARAMS)[number];

/** 各パラメータの増減（選択肢・切り札）または現在値。どちらも4つすべてを持つ */
export type ChoiceEffect = Record<Param, number>;

export const STYLE_IDS = ['taiikukai', 'gray_broker', 'tech_first'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const ENDING_IDS = [
  'cash_zero',
  'cash_max',
  'client_zero',
  'client_max',
  'dev_zero',
  'dev_max',
  'legal_zero',
  'legal_max',
  'clear',
] as const;
export type EndingId = (typeof ENDING_IDS)[number];

export const SPEAKER_ICONS = [
  'icon_dev_junior',
  'icon_dev_senior',
  'icon_sales',
  'icon_client_pm',
  'icon_client_exec',
  'icon_subcontract',
  'icon_inspector',
  'icon_player',
  'icon_secretary',
] as const;
export type SpeakerIcon = (typeof SPEAKER_ICONS)[number];

export const FIXED_WEEKS = [13, 26, 39, 52] as const;

/** web 表記と、任意の store 表記（要件 3.3、7.4-2） */
export interface Text {
  web: string;
  store?: string;
}

/** パッシブ倍率（04 の 7.1） */
export interface Passive {
  param: Param;
  direction: 'gain' | 'loss';
  factor: number;
}

/** 連鎖の予約の入力（04 の 6.3）。選択肢と切り札の両方をこの形にそろえる */
export interface InjectionParam {
  cardId: string;
  delay: readonly [number, number];
  regretText: Text;
}

export interface StyleDef {
  id: StyleId;
  name: Text;
  description: Text;
  passives: readonly Passive[];
  trump: {
    name: Text;
    effects: ChoiceEffect;
    inject?: InjectionParam;
  };
}

/** 調整用の定数（05 の 4.3 balance.ts）。シミュレータから上書きできる */
export interface Balance {
  initialParam: number;
  /** 売上 = 生存週数 × salesPerWeek + cashGainedTotal × salesPerCash（万円） */
  salesPerWeek: number;
  salesPerCash: number;
  /** 連鎖の予約週の省略時の範囲 */
  defaultInjectDelay: readonly [number, number];
  /** 敗因：連鎖カードのターンから何ターン後まで（連鎖カードのターンを 0 として） */
  regretWindow: number;
  /** 極値の記録を始める週 */
  extremesFromWeek: number;
  /** 称号の閾値（04 の 8.3） */
  whiteCompanyMinLegal: number;
  bicycleMaxCash: number;
  emperorMinSales: number;
  earlyDeathMaxWeek: number;
}
