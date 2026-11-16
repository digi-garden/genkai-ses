/**
 * カード全体の検証（docs/design/05_data_design.md 3.4、要件 7.5-2）
 * validate-cards（CLI）とシミュレータの両方から使う。
 */
import { CardSchema, type EventCard } from '../../src/content/schema';
import { normalizeForMatch } from '../../src/core/companyName';
import { NG_COMPANY_NAMES } from '../../src/content/ng_company_names';
import { NG_EXPRESSION_TERMS } from '../../src/content/ng_terms';
import { FIXED_WEEKS, PARAMS, STYLE_IDS, type StyleDef, type StyleId } from '../../src/content/types';

export type Severity = 'error' | 'warning' | 'info';
export interface Finding {
  code: string;
  severity: Severity;
  message: string;
  cardId?: string;
}

export interface CardFile {
  /** ファイル名（normal.json など）。ファイルの種類と kind の一致を確かめる */
  name: string;
  expectedKind: EventCard['kind'];
  data: unknown;
}

export interface ValidationResult {
  cards: EventCard[];
  findings: Finding[];
  chars: string;
}

export { normalizeForMatch };

function textsOf(c: EventCard): string[] {
  const out = [c.speaker_name, c.message, c.message_store_safe];
  for (const ch of [c.choice_left, c.choice_right]) out.push(ch.text, ch.text_store_safe, ch.regret_text, ch.regret_text_store_safe);
  return out.filter((t): t is string => t !== undefined);
}

/** 英字の名称は、単語の一部に紛れて誤検出しないよう、前後が英字でないときだけ一致とみなす */
function containsName(haystack: string, name: string): boolean {
  const n = normalizeForMatch(name);
  if (!/^[a-z0-9]+$/.test(n)) return haystack.includes(n);
  return new RegExp(`(^|[^a-z])${n}($|[^a-z])`).test(haystack);
}

export function validateCards(
  files: readonly CardFile[],
  styles: Readonly<Record<StyleId, StyleDef>>,
  opts: { phase: 1 | 2; extraTexts?: readonly string[] } = { phase: 1 },
): ValidationResult {
  const findings: Finding[] = [];
  const cards: EventCard[] = [];
  const add = (f: Finding) => findings.push(f);

  // V1：スキーマ
  for (const file of files) {
    if (!Array.isArray(file.data)) {
      add({ code: 'V1', severity: 'error', message: `${file.name} がカードの配列ではない` });
      continue;
    }
    file.data.forEach((raw, i) => {
      const r = CardSchema.safeParse(raw);
      const label = (raw as { id?: unknown })?.id;
      const cardId = typeof label === 'string' ? label : `${file.name}[${i}]`;
      if (!r.success) {
        for (const issue of r.error.issues) {
          add({ code: 'V1', severity: 'error', cardId, message: `${issue.path.join('.') || '(card)'}: ${issue.message}` });
        }
        return;
      }
      if (r.data.kind !== file.expectedKind) {
        add({ code: 'V1', severity: 'error', cardId, message: `${file.name} に kind: ${r.data.kind} のカードがある（${file.expectedKind} のはず）` });
      }
      if (file.name === 'style.json' && r.data.style_only === undefined) {
        add({ code: 'V1', severity: 'error', cardId, message: 'style.json のカードには style_only が必要' });
      }
      cards.push(r.data);
    });
  }

  // V2：ID の重複
  const ids = new Map<string, number>();
  for (const c of cards) ids.set(c.id, (ids.get(c.id) ?? 0) + 1);
  for (const [id, n] of ids) if (n > 1) add({ code: 'V2', severity: 'error', cardId: id, message: `ID が ${n} 回使われている` });

  const byId = new Map(cards.map((c) => [c.id, c]));
  const referenced = new Set<string>();

  for (const c of cards) {
    for (const [side, ch] of [['left', c.choice_left], ['right', c.choice_right]] as const) {
      // V3：連鎖の参照先
      if (ch.inject_card_id !== undefined) {
        referenced.add(ch.inject_card_id);
        const target = byId.get(ch.inject_card_id);
        if (!target) add({ code: 'V3', severity: 'error', cardId: c.id, message: `${side}: inject_card_id ${ch.inject_card_id} が存在しない` });
        else if (target.kind !== 'chain') add({ code: 'V3', severity: 'error', cardId: c.id, message: `${side}: ${ch.inject_card_id} は chain ではない` });
      }
      // V10：効果値が大きすぎる
      for (const p of PARAMS) {
        if (Math.abs(ch.effects[p]) > 40) add({ code: 'V10', severity: 'warning', cardId: c.id, message: `${side}.${p} = ${ch.effects[p]}（絶対値が40を超える）` });
      }
    }
    // V11：両方の選択肢が同じ効果
    if (PARAMS.every((p) => c.choice_left.effects[p] === c.choice_right.effects[p])) {
      add({ code: 'V11', severity: 'warning', cardId: c.id, message: '左右の効果がまったく同じ' });
    }
  }
  // V4 / V4b はスキーマ（.refine）で検査済み

  // V5：季節固定
  for (const w of FIXED_WEEKS) {
    if (!cards.some((c) => c.kind === 'fixed' && c.fixed_week === w)) add({ code: 'V5', severity: 'error', message: `Week ${w} の季節固定カードがない` });
  }
  // V6：導入カード
  for (const w of [1, 2] as const) {
    const n = cards.filter((c) => c.kind === 'tutorial' && c.tutorial_week === w).length;
    if (n !== 1) add({ code: 'V6', severity: 'error', message: `Week ${w} の導入カードが ${n} 枚（1枚のはず）` });
  }
  // V7：参照されない連鎖カード（切り札からの参照も数える）
  for (const s of Object.values(styles)) {
    if (s.trump.inject) {
      referenced.add(s.trump.inject.cardId);
      const target = byId.get(s.trump.inject.cardId);
      if (!target || target.kind !== 'chain') {
        add({ code: 'V3', severity: 'error', message: `${s.id} の切り札の連鎖 ${s.trump.inject.cardId} が chain のカードとして存在しない` });
      }
    }
  }
  for (const c of cards) {
    if (c.kind === 'chain' && !referenced.has(c.id)) add({ code: 'V7', severity: 'warning', cardId: c.id, message: 'どこからも参照されていない連鎖カード' });
  }
  // V8：序盤カード
  const openings = cards.filter((c) => c.kind === 'normal' && c.opening === true).length;
  if (openings < 8) add({ code: 'V8', severity: 'warning', message: `opening のカードが ${openings} 枚（8枚以上が必要）` });
  // V9：スタイル別カード（Phase 2 から）
  if (opts.phase >= 2) {
    for (const s of STYLE_IDS) {
      const n = cards.filter((c) => c.style_only === s).length;
      if (n !== 5) add({ code: 'V9', severity: 'warning', message: `${s} の style_only カードが ${n} 枚（5枚のはず）` });
    }
  }

  // V12：NG 社名 / V12b：露骨な違法用語（要件 3.6-8）
  for (const c of cards) {
    const text = normalizeForMatch(textsOf(c).join('\n'));
    for (const name of NG_COMPANY_NAMES) {
      if (containsName(text, name)) add({ code: 'V12', severity: 'error', cardId: c.id, message: `実在の名称「${name}」を含む` });
    }
    const raw = textsOf(c).join('\n').normalize('NFKC');
    for (const term of NG_EXPRESSION_TERMS) {
      if (raw.includes(term)) add({ code: 'V12b', severity: 'error', cardId: c.id, message: `使わない語「${term}」を含む（3.6-8）` });
    }
  }

  // V13：使われている文字の一覧（フォントのサブセット化に使う）
  const all = [...cards.flatMap(textsOf), ...(opts.extraTexts ?? [])].join('');
  const chars = [...new Set(all)].filter((ch) => ch.trim() !== '').sort().join('');
  add({ code: 'V13', severity: 'info', message: `使われている文字：${[...chars].length} 種類` });

  return { cards, findings, chars };
}
