/**
 * カードの「構造」のハッシュ（docs/design/05_data_design.md 6章）
 * 途中データを再開してよいかの判定に使う。文言と効果値は含めないので、誤字の修正や数値の調整では途中データが消えない。
 */
import type { EventCard } from './schema';

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function contentHash(cards: readonly EventCard[]): string {
  const rows = [...cards]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((c) =>
      [c.id, c.kind, c.style_only ?? '', c.fixed_week ?? '', c.tutorial_week ?? '', c.opening ? 1 : 0, c.choice_left.inject_card_id ?? '', c.choice_right.inject_card_id ?? ''].join(','),
    );
  return fnv1a(rows.join('\n'));
}
