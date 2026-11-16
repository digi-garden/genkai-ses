/**
 * シェア文の組み立て（docs/design/06_external_interface.md 3.1・3.2、要件 3.4-3）
 */
import type { AchievementDef } from '../content/achievements';
import type { EndingDef } from '../content/endings';
import type { Regret } from './state';

/** X の上限（URL を含む） */
export const X_LIMIT = 280;
/** X は URL を長さに関係なく23文字として数える。本文と URL の間の空白1文字も数える */
const URL_WEIGHT = 23 + 1;

/**
 * X の数え方（twitter-text v3）：次の範囲の文字は1、それ以外（日本語など）は2。
 * 0x0000–0x10FF、0x2000–0x200D、0x2010–0x201F、0x2032–0x2037
 */
export function weightedLength(text: string): number {
  let n = 0;
  for (const ch of text.normalize('NFC')) {
    const c = ch.codePointAt(0) ?? 0;
    const light =
      c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037);
    n += light ? 1 : 2;
  }
  return n;
}

const cut = (s: string, n: number) => ([...s].length > n ? `${[...s].slice(0, n).join('')}…` : s);

export interface ShareInput {
  companyName: string;
  ending: EndingDef;
  /** 倒産した週（クリアなら 52） */
  week: number;
  /** 表示用の売上（例：4,800万、1億2,300万） */
  salesText: string;
  achievement?: AchievementDef | undefined;
  regret?: Regret | undefined;
}

/** 5段階の調整（3.2）。収まるまで上から順に適用する */
export function buildShareText(input: ShareInput): { text: string; step: number } {
  const clear = input.ending.id === 'clear';
  for (let step = 0; step <= 5; step++) {
    const company = step >= 3 ? cut(input.companyName, 8) : input.companyName;
    const line2 = clear
      ? `${company}は、1期（52週）を完走しました（売上${input.salesText}）。`
      : `${company}は、第${input.week}週に「${input.ending.title.web}」で倒産しました（売上${input.salesText}）。`;
    const reason = input.regret
      ? `敗因：第${input.regret.week}週「${input.regret.regretText.web}」`
      : input.ending.selfComment.web;
    const line4 = step >= 4 ? cut(reason, 15) : reason;
    const line3 = step >= 5 || !input.achievement ? null : `獲得称号：［${input.achievement.name.web}］`;
    const line6 = step >= 2 ? null : step === 1 ? '52週生き残れる人いる？' : '誰かこのブラック業界で1年間（52週）生き残ってみてくれ。';

    const lines = ['【限界SES社長】', line2, ...(line3 ? [line3] : []), line4, ...(line6 ? ['', line6] : ['']), '※会社名は架空です', '#限界SES社長 #SESあるある'];
    const text = lines.join('\n');
    if (weightedLength(text) + URL_WEIGHT <= X_LIMIT || step === 5) return { text, step };
  }
  throw new Error('unreachable');
}

/** 結末ページの URL（R13：末尾スラッシュなし）。UTM でシェアからの流入を数える */
export function shareUrl(origin: string, base: string, slug: string): string {
  return `${origin.replace(/\/$/, '')}${base.replace(/\/$/, '')}/results/${slug}?utm_source=x&utm_medium=share`;
}

export function xIntentUrl(text: string, url: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
