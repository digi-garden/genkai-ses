/**
 * ヘッドレスシミュレータ（npm run simulate）。docs/design/07_test_design.md 3章、要件 7.5
 *
 *   npm run simulate -- [--runs 10000] [--seed 1] [--bot random,greedy,...] [--style all|taiikukai,...]
 *                       [--quick] [--json out.json] [--balance override.json] [--cards 20]
 *
 * 合格基準が1つでも NG なら終了コード 1（CI では警告として扱い、マージは止めない）。
 * カードの検証でエラーがあれば、シミュレーションせずに終了コード 2。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildContent } from '../../src/content';
import { balance as defaultBalance } from '../../src/content/balance';
import { styles } from '../../src/content/styles';
import { STYLE_IDS, type Balance, type StyleId } from '../../src/content/types';
import { loadCardFiles } from '../lib/load-cards';
import { validateCards } from '../lib/validate-cards';
import { BOT_IDS, type BotId } from './bots';
import { summarize } from './report';
import { simulate } from './run';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const quick = process.argv.includes('--quick');
const runs = Number(arg('runs') ?? (quick ? 1000 : 10000));
const seed = Number(arg('seed') ?? 1);
const bots = (arg('bot')?.split(',') ?? BOT_IDS) as BotId[];
const styleArg = arg('style');
const styleIds = (!styleArg || styleArg === 'all' ? STYLE_IDS : styleArg.split(',')) as StyleId[];
const balanceOverride = arg('balance') ? (JSON.parse(readFileSync(arg('balance') as string, 'utf8')) as Partial<Balance>) : {};
const topCards = Number(arg('cards') ?? 15);

const { cards, findings } = validateCards(loadCardFiles(), styles, { phase: 1 });
const errors = findings.filter((f) => f.severity === 'error');
if (errors.length > 0) {
  for (const e of errors) console.error(`ERROR ${e.code} ${e.cardId ?? ''} ${e.message}`);
  console.error('カードの検証でエラーがあるため、シミュレーションしません（npm run validate:cards）');
  process.exit(2);
}

const content = buildContent(cards, styles, { ...defaultBalance, ...balanceOverride });
const t0 = performance.now();
const result = simulate(content, { bots, styles: styleIds, runs, seed });
const { text, checks, json } = summarize(result.groups);

console.log(text);

const cardRows = Object.entries(result.cards)
  .map(([id, c]) => ({ id, ...c, rate: c.shown ? c.deaths / c.shown : 0 }))
  .sort((a, b) => b.rate - a.rate)
  .slice(0, topCards);
console.log(`=== 倒産率が高いカード（上位 ${topCards}。そのカードのターンで倒産した割合） ===`);
for (const r of cardRows) console.log(`${r.id.padEnd(32)} ${(100 * r.rate).toFixed(1).padStart(5)}%  （表示 ${r.shown}）`);

const runsTotal = result.groups.reduce((a, g) => a + g.runs, 0);
console.log(`\n${runsTotal.toLocaleString()} ラン、${((performance.now() - t0) / 1000).toFixed(1)} 秒`);

const out = arg('json');
if (out) writeFileSync(out, JSON.stringify({ runs, seed, bots, styles: styleIds, balance: content.balance, ...(json as object), cards: result.cards }, null, 2));

const ng = checks.filter((c) => !c.ok);
if (ng.length > 0 && process.env.GITHUB_ACTIONS) for (const c of ng) console.log(`::warning::シミュレータ ${c.id} ${c.label}: ${c.value}`);
process.exitCode = ng.length > 0 ? 1 : 0;
