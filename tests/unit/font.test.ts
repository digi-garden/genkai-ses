import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * フォントのサブセットに、ゲームで使う文字がすべて入っているか（09 の検証2）。
 * 失敗したら `python tools/subset-font.py` を実行して、フォントを作り直す。
 */
describe('フォントのサブセット', () => {
  it('src/ で使う文字が、サブセットに入っている（元のフォントにない文字を除く）', () => {
    const covered = new Set(readFileSync('src/assets/fonts/charset.txt', 'utf8'));
    const fallback = new Set(readFileSync('src/assets/fonts/charset-fallback.txt', 'utf8'));
    const used = new Set<string>();
    for (const p of globSync('src/**/*.{ts,tsx,json}')) for (const ch of readFileSync(p, 'utf8')) used.add(ch);
    const missing = [...used].filter((c) => !/\s/.test(c) && c >= ' ' && !covered.has(c) && !fallback.has(c));
    expect(missing.join(''), 'python tools/subset-font.py を実行してフォントを作り直す').toBe('');
  });
});
