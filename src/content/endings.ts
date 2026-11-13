/**
 * 結末（docs/design/05_data_design.md 4.2、要件 3.1-1・3.4・3.6-2）
 * 文言は「社長の経営判断の結果」として書く（辞めた人や客を責めない）。
 */
import type { EndingId, Param, Text } from './types';

export interface EndingDef {
  id: EndingId;
  param?: Param;
  direction?: 'zero' | 'max';
  title: Text;
  subtitle: Text;
  /** 敗因がないとき、シェア文の3行目に入れる自虐コメント */
  selfComment: Text;
  slug: string;
}

export const endings: Record<EndingId, EndingDef> = {
  cash_zero: {
    id: 'cash_zero', param: 'cash', direction: 'zero', slug: 'cash-zero',
    title: { web: '黒字倒産エンド' },
    subtitle: { web: '帳簿は黒字、口座は空っぽ。入金の前に給料日が来た。' },
    selfComment: { web: '売上はあった。お金がなかった。' },
  },
  cash_max: {
    id: 'cash_max', param: 'cash', direction: 'max', slug: 'cash-max',
    title: { web: '敵対的買収エンド' },
    subtitle: { web: '貯め込んだ現金に目を付けられ、役員会で社長の席が消えた。' },
    selfComment: { web: 'お金を貯めすぎて会社ごと持っていかれました。' },
  },
  client_zero: {
    id: 'client_zero', param: 'client', direction: 'zero', slug: 'client-zero',
    title: { web: '契約解除エンド' },
    subtitle: { web: '元請けから分厚い書類が届いた。読むまでもなく、全部終わりだった。' },
    selfComment: { web: '客先を怒らせ続けた結果、客先がなくなりました。' },
  },
  client_max: {
    id: 'client_max', param: 'client', direction: 'max', slug: 'client-max',
    title: { web: '際限なき奴隷エンド' },
    subtitle: { web: '気に入られすぎて、断る権利ごと差し出してしまった。' },
    selfComment: { web: '「何でもやります」と言い続けた結果です。' },
  },
  dev_zero: {
    id: 'dev_zero', param: 'dev', direction: 'zero', slug: 'dev-zero',
    title: { web: '全員蒸発エンド' },
    subtitle: { web: '月曜の朝、誰も来なかった。そこまで追い込んだのは社長だった。' },
    selfComment: { web: '全員辞めました。悪いのは全部、社長です。' },
  },
  dev_max: {
    id: 'dev_max', param: 'dev', direction: 'max', slug: 'dev-max',
    title: { web: '技術オタク化エンド' },
    subtitle: { web: '現場は最高に楽しそうだった。納期と売上のことは、誰も覚えていなかった。' },
    selfComment: { web: '現場を甘やかしすぎて、納期が消えました。' },
  },
  legal_zero: {
    id: 'legal_zero', param: 'legal', direction: 'zero', slug: 'legal-zero',
    title: { web: '労務監査局突入エンド' },
    subtitle: { web: '段ボールが次々と運び出されていく。グレーは、いつか黒になる。' },
    selfComment: { web: 'グレーな運用を続けた結果、監査の立ち入りが来ました。' },
  },
  legal_max: {
    id: 'legal_max', param: 'legal', direction: 'max', slug: 'legal-max',
    title: { web: '官僚主義崩壊エンド' },
    subtitle: { web: '書類は完璧だった。仕事は1件も残っていなかった。' },
    selfComment: { web: 'ハンコを押している間に、客がいなくなりました。' },
  },
  clear: {
    id: 'clear', slug: 'clear',
    title: { web: '1期完走' },
    subtitle: { web: 'ボロボロだが、生き延びた。来期のことは、来期の自分に任せる。' },
    selfComment: { web: 'なんとか1年、生き延びました。' },
  },
};
