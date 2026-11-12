/**
 * 集計結果の表示と合格判定（docs/design/07_test_design.md 3.3・3.4）
 */
import { ENDING_IDS, STYLE_IDS, type EndingId, type StyleId } from '../../src/content/types';
import type { BotId } from './bots';
import type { GroupStats } from './run';

const LOWER: readonly EndingId[] = ['cash_zero', 'client_zero', 'dev_zero', 'legal_zero'];
const UPPER: readonly EndingId[] = ['cash_max', 'client_max', 'dev_max', 'legal_max'];
const STYLE_SHORT: Record<StyleId, string> = { taiikukai: 'tk', gray_broker: 'gb', tech_first: 'tf' };

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  value: string;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const i = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[i] ?? NaN;
}
const pct = (n: number, d: number) => (d === 0 ? 0 : (100 * n) / d);
const f1 = (x: number) => `${x.toFixed(1)}%`;

function merge(groups: GroupStats[]): GroupStats | undefined {
  const [first, ...rest] = groups;
  if (!first) return undefined;
  const m: GroupStats = structuredClone(first);
  for (const g of rest) {
    m.runs += g.runs;
    m.survived.push(...g.survived);
    m.clears += g.clears;
    m.regrets += g.regrets;
    for (const e of ENDING_IDS) m.endings[e] += g.endings[e];
    for (const k of Object.keys(m.achievements) as (keyof GroupStats['achievements'])[]) m.achievements[k] += g.achievements[k];
  }
  return m;
}

export function summarize(groups: GroupStats[]): { text: string; checks: Check[]; json: unknown } {
  const lines: string[] = [];
  const by = (bot: BotId, style?: StyleId) => groups.filter((g) => g.bot === bot && (style === undefined || g.style === style));
  const bots = [...new Set(groups.map((g) => g.bot))];

  lines.push('=== 生存週数（中央値 / 平均 / p10 / p90） ===');
  for (const bot of bots) {
    const parts = STYLE_IDS.flatMap((st) => {
      const g = by(bot, st)[0];
      if (!g) return [];
      const s = [...g.survived].sort((a, b) => a - b);
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      return [`${STYLE_SHORT[st]}: ${quantile(s, 0.5)} / ${mean.toFixed(1)} / ${quantile(s, 0.1)} / ${quantile(s, 0.9)}`];
    });
    lines.push(`${bot.padEnd(15)} ${parts.join('   ')}`);
  }

  // 死因の比率は、random と greedy の死亡（クリアを除く）に占める割合
  const deathPool = merge([...by('random'), ...by('greedy')]);
  const deaths = deathPool ? deathPool.runs - deathPool.clears : 0;
  lines.push('=== 死因の比率（random + greedy の死亡のうち） ===');
  if (deathPool) {
    lines.push(
      [...LOWER, ...UPPER].map((e) => `${e} ${f1(pct(deathPool.endings[e], deaths))}`).join('  ') +
        `  （上限死の合計 ${f1(pct(UPPER.reduce((a, e) => a + deathPool.endings[e], 0), deaths))}）`,
    );
  }

  lines.push('=== クリア率 ===');
  for (const bot of bots) {
    lines.push(`${bot.padEnd(15)} ` + STYLE_IDS.map((st) => {
      const g = by(bot, st)[0];
      return g ? `${STYLE_SHORT[st]} ${f1(pct(g.clears, g.runs))}` : '';
    }).join('  '));
  }

  lines.push('=== 称号の取得率（クリア系はクリアしたランのうち、早期死亡系は全ランのうち） ===');
  for (const bot of bots) {
    const m = merge(by(bot));
    if (!m) continue;
    const a = m.achievements;
    lines.push(
      `${bot.padEnd(15)} white ${f1(pct(a.white_company, m.clears))}  bicycle ${f1(pct(a.bicycle, m.clears))}  emperor ${f1(pct(a.emperor, m.clears))}  phoenix ${f1(pct(a.phoenix, m.clears))}  audit ${f1(pct(a.audit_regular, m.runs))}  speed ${f1(pct(a.speed_quit, m.runs))}  敗因表示 ${f1(pct(m.regrets, m.runs - m.clears))}`,
    );
  }

  // 合格判定
  const checks: Check[] = [];
  const random = merge(by('random'));
  if (random) {
    const s = [...random.survived].sort((a, b) => a - b);
    const med = quantile(s, 0.5);
    checks.push({ id: 'A1', label: 'random の生存週の中央値が 8〜15', ok: med >= 8 && med <= 15, value: String(med) });
  }
  const greedyRates = STYLE_IDS.flatMap((st) => {
    const g = by('greedy', st)[0];
    return g ? [{ st, rate: pct(g.clears, g.runs) }] : [];
  });
  for (const { st, rate } of greedyRates) {
    checks.push({ id: 'A2', label: `greedy のクリア率が 15〜35%（${st}）`, ok: rate >= 15 && rate <= 35, value: f1(rate) });
  }
  if (deathPool && deaths > 0) {
    for (const e of LOWER) {
      const r = pct(deathPool.endings[e], deaths);
      checks.push({ id: 'A3', label: `下限死 ${e} が 5〜25%`, ok: r >= 5 && r <= 25, value: f1(r) });
    }
    for (const e of UPPER) {
      const r = pct(deathPool.endings[e], deaths);
      checks.push({ id: 'A4', label: `上限死 ${e} が 1〜15%`, ok: r >= 1 && r <= 15, value: f1(r) });
    }
    const total = pct(UPPER.reduce((a, e) => a + deathPool.endings[e], 0), deaths);
    checks.push({ id: 'A4', label: '上限死の合計が 10〜30%', ok: total >= 10 && total <= 30, value: f1(total) });
  }
  if (greedyRates.length > 1) {
    const rates = greedyRates.map((x) => x.rate);
    const diff = Math.max(...rates) - Math.min(...rates);
    checks.push({ id: 'A5', label: 'スタイル別のクリア率の差が 10pt 以内', ok: diff <= 10, value: `${diff.toFixed(1)}pt` });
  }
  const a6: [BotId, keyof GroupStats['achievements'], string][] = [
    ['greedy:white', 'white_company', 'ホワイト企業の鑑'],
    ['greedy:bicycle', 'bicycle', '自転車操業マスター'],
    ['gambler', 'emperor', '人月搾取の帝王'],
    ['greedy', 'phoenix', '不死鳥社長'],
  ];
  for (const [bot, ach, name] of a6) {
    const m = merge(by(bot));
    if (!m) continue;
    const r = pct(m.achievements[ach], m.clears);
    checks.push({ id: 'A6', label: `${name}が ${bot} のクリアの 1% 以上`, ok: r >= 1, value: f1(r) });
  }
  if (random) {
    for (const [ach, name] of [['speed_quit', 'スピード退職'], ['audit_regular', '監査局の常連']] as const) {
      const r = pct(random.achievements[ach], random.runs);
      checks.push({ id: 'A7', label: `${name}が random の全ランの 0.5% 以上`, ok: r >= 0.5, value: f1(r) });
    }
  }

  lines.push('=== 合格判定 ===');
  for (const c of checks) lines.push(`[${c.ok ? 'OK' : 'NG'}] ${c.id} ${c.label.padEnd(36)} ${c.value}`);

  return {
    text: lines.join('\n'),
    checks,
    json: {
      groups: groups.map((g) => ({
        ...g,
        survived: undefined,
        histogram: Array.from({ length: 53 }, (_, w) => g.survived.filter((x) => x === w).length),
      })),
      checks,
    },
  };
}
