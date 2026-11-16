import { describe, expect, it } from 'vitest';
import { styles } from '../../src/content/styles';
import { normalizeForMatch, validateCards, type CardFile } from '../../tools/lib/validate-cards';
import { card } from './fixtures';

function files(over: Partial<Record<string, unknown[]>> = {}): CardFile[] {
  const normals = Array.from({ length: 8 }, (_, i) => card(`n_${i}`, 'normal', { cash: 1 }, { cash: -1 }, { opening: true }));
  return [
    { name: 'tutorial.json', expectedKind: 'tutorial', data: over.tutorial ?? [card('t_1', 'tutorial', { cash: 1 }, {}, { tutorial_week: 1 }), card('t_2', 'tutorial', { cash: 1 }, {}, { tutorial_week: 2 })] },
    { name: 'fixed.json', expectedKind: 'fixed', data: over.fixed ?? [13, 26, 39, 52].map((w) => card(`f_w${w}`, 'fixed', { dev: 1 }, {}, { fixed_week: w })) },
    { name: 'chain.json', expectedKind: 'chain', data: over.chain ?? [card('c_audit_visit', 'chain', { legal: -5 }, { client: -5 })] },
    { name: 'normal.json', expectedKind: 'normal', data: over.normal ?? normals },
    { name: 'style.json', expectedKind: 'normal', data: over.style ?? [] },
  ];
}

const codes = (fs: CardFile[]) => validateCards(fs, styles).findings.filter((f) => f.severity !== 'info').map((f) => f.code);

describe('validateCards', () => {
  it('正しいデータならエラーも警告もない', () => {
    expect(codes(files())).toEqual([]);
  });

  it('V1：効果のキーの書き間違いと、文字数の超過', () => {
    const bad = [card('n_x', 'normal', {}, {}, { choice_left: { text: 'あ'.repeat(21), effects: { lgal: -5 } as never } })];
    expect(codes(files({ normal: bad }))).toContain('V1');
  });

  it('V1：ファイルの種類と kind が違う', () => {
    expect(codes(files({ chain: [card('c_audit_visit', 'normal', { cash: 1 })] }))).toContain('V1');
  });

  it('V2：ID の重複', () => {
    const n = [card('n_dup', 'normal', { cash: 1 }), card('n_dup', 'normal', { cash: 2 })];
    expect(codes(files({ normal: n }))).toContain('V2');
  });

  it('V3：連鎖の参照先がない、または chain ではない', () => {
    const inj = (target: string) =>
      card('n_x', 'normal', {}, {}, {
        choice_left: { text: '盛る', effects: { cash: 5 }, inject_card_id: target, regret_text: '盛った' },
      });
    expect(codes(files({ normal: [inj('c_nothing')] }))).toContain('V3');
    expect(codes(files({ normal: [inj('t_1')] }))).toContain('V3');
  });

  it('V4：unethical な選択肢に連鎖がない', () => {
    const n = [card('n_x', 'normal', {}, {}, { choice_left: { text: '盛る', effects: { cash: 5 }, unethical: true } })];
    expect(codes(files({ normal: n }))).toContain('V1');
  });

  it('V5・V6：季節固定と導入カードの不足', () => {
    expect(codes(files({ fixed: [] }))).toContain('V5');
    expect(codes(files({ tutorial: [] }))).toContain('V6');
  });

  it('V7・V8・V10・V11：警告', () => {
    const c = codes(
      files({
        chain: [card('c_audit_visit', 'chain', { legal: -5 }), card('c_orphan', 'chain', { legal: -5 })],
        normal: [card('n_big', 'normal', { cash: 41 }), card('n_same', 'normal', { cash: 1 }, { cash: 1 })],
      }),
    );
    expect(c).toEqual(expect.arrayContaining(['V7', 'V8', 'V10', 'V11']));
  });

  it('V12：実在の名称（表記ゆれも検出し、英字は単語の一部では誤検出しない）', () => {
    const msg = (m: string) => [card('n_x', 'normal', { cash: 1 }, {}, { message: m })];
    expect(codes(files({ normal: msg('ＮＴＴデータの案件です') }))).toContain('V12');
    expect(codes(files({ normal: msg('ibm の案件') }))).toContain('V12');
    expect(codes(files({ normal: msg('Metaverse の案件') }))).not.toContain('V12');
  });

  it('V12b：露骨な違法用語（3.6-8）', () => {
    const n = [card('n_x', 'normal', { cash: 1 }, {}, { message: 'それって偽装請負では？' })];
    expect(codes(files({ normal: n }))).toContain('V12b');
  });

  it('V13：使われている文字の一覧', () => {
    const r = validateCards(files(), styles, { phase: 1, extraTexts: ['限界'] });
    expect(r.chars).toContain('限');
    expect(r.chars).toContain('左');
  });
});

describe('normalizeForMatch', () => {
  it('全角半角・大文字小文字・空白をそろえる', () => {
    expect(normalizeForMatch('Ｎ Ｔ Ｔ ・データ')).toBe('nttデータ');
  });
});
