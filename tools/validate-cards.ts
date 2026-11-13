/**
 * カード JSON の検証（npm run validate:cards）。docs/design/05_data_design.md 3.4
 * エラーが1つでもあれば終了コード 1。警告は表示だけ。
 *   --chars <path>  使われている文字の一覧を書き出す（V13）
 */
import { writeFileSync } from 'node:fs';
import { styles } from '../src/content/styles';
import { loadCardFiles } from './lib/load-cards';
import { validateCards } from './lib/validate-cards';

const args = process.argv.slice(2);
const charsPath = args.includes('--chars') ? args[args.indexOf('--chars') + 1] : undefined;

const { cards, findings, chars } = validateCards(loadCardFiles(), styles, { phase: 1 });

const order = { error: 0, warning: 1, info: 2 } as const;
for (const f of [...findings].sort((a, b) => order[a.severity] - order[b.severity])) {
  const where = f.cardId ? ` [${f.cardId}]` : '';
  const line = `${f.severity.toUpperCase().padEnd(7)} ${f.code}${where} ${f.message}`;
  if (f.severity === 'error') console.error(process.env.GITHUB_ACTIONS ? `::error::${line}` : line);
  else if (f.severity === 'warning') console.warn(process.env.GITHUB_ACTIONS ? `::warning::${line}` : line);
  else console.log(line);
}

const count = (k: string) => cards.filter((c) => c.kind === k).length;
console.log(
  `カード ${cards.length} 枚（通常 ${count('normal')}、連鎖 ${count('chain')}、季節固定 ${count('fixed')}、導入 ${count('tutorial')}）`,
);
if (charsPath) writeFileSync(charsPath, chars);

const errors = findings.filter((f) => f.severity === 'error').length;
const warnings = findings.filter((f) => f.severity === 'warning').length;
console.log(`エラー ${errors} 件、警告 ${warnings} 件`);
process.exitCode = errors > 0 ? 1 : 0;
