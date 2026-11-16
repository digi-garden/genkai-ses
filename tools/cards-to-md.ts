/**
 * カードを人が読む一覧（Markdown）にする（npm run cards:md -- <出力先>）
 * 表現の確認（要件 3.6-7、フェーズ計画 1A-5）に使う。
 */
import { writeFileSync } from 'node:fs';
import type { Choice, EventCard } from '../src/content/schema';
import { styles } from '../src/content/styles';
import { endings } from '../src/content/endings';
import { achievements } from '../src/content/achievements';
import { PARAMS } from '../src/content/types';
import { loadCardFiles } from './lib/load-cards';
import { validateCards } from './lib/validate-cards';

const out = process.argv[2] ?? 'docs/cards/card_list.md';
const { cards } = validateCards(loadCardFiles(), styles, { phase: 1 });
const byId = new Map(cards.map((c) => [c.id, c]));
const LABEL = { cash: '資金', client: '顧客', dev: '現場', legal: 'コンプラ' } as const;

function eff(c: Choice): string {
  const parts = PARAMS.filter((p) => c.effects[p] !== 0).map((p) => `${LABEL[p]}${c.effects[p] > 0 ? '+' : ''}${c.effects[p]}`);
  return parts.length ? parts.join(' ') : '変化なし';
}
function choiceLine(side: string, c: Choice): string {
  let s = `- **${side}：${c.text}** — ${eff(c)}`;
  if (c.unethical) s += ' ／ ⚠ 不正（代償あり）';
  if (c.inject_card_id) {
    const d = c.inject_delay ?? [2, 6];
    s += ` ／ → 連鎖 \`${c.inject_card_id}\`（${d[0]}〜${d[1]}週後）、敗因「${c.regret_text ?? ''}」`;
  }
  return s;
}
function block(c: EventCard, n: number): string {
  const tags = [
    c.opening ? '序盤' : '',
    c.fixed_week ? `Week ${c.fixed_week}` : '',
    c.tutorial_week ? `Week ${c.tutorial_week}・初回のみ` : '',
  ].filter(Boolean);
  const refs = cards.filter((x) => x.choice_left.inject_card_id === c.id || x.choice_right.inject_card_id === c.id).map((x) => `\`${x.id}\``);
  const trumpRefs = Object.values(styles).filter((s) => s.trump.inject?.cardId === c.id).map((s) => `切り札「${s.trump.name.web}」`);
  const from = c.kind === 'chain' ? `\n\n元になる選択：${[...refs, ...trumpRefs].join('、')}` : '';
  return [
    `### ${n}. \`${c.id}\`${tags.length ? `（${tags.join('・')}）` : ''}`,
    '',
    `**${c.speaker_name}**：${c.message}${from}`,
    '',
    choiceLine('左', c.choice_left),
    choiceLine('右', c.choice_right),
    '',
  ].join('\n');
}

const sections: [string, EventCard['kind'], (c: EventCard) => boolean][] = [
  ['導入カード（初回プレイの Week 1〜2）', 'tutorial', () => true],
  ['季節固定カード', 'fixed', () => true],
  ['通常カード：序盤（初回プレイで先に出る）', 'normal', (c) => c.opening === true],
  ['通常カード：その他', 'normal', (c) => c.opening !== true],
  ['連鎖カード（不正な選択の代償として後で出る）', 'chain', () => true],
];

let n = 0;
const body = sections
  .map(([title, kind, f]) => {
    const list = cards.filter((c) => c.kind === kind && f(c));
    return [`## ${title}（${list.length}枚）`, '', ...list.map((c) => block(c, ++n))].join('\n');
  })
  .join('\n');

const endingRows = Object.values(endings)
  .map((e) => `| \`${e.id}\` | ${e.title.web} | ${e.subtitle.web} | ${e.selfComment.web} |`)
  .join('\n');
const achievementRows = achievements.map((a) => `| ${a.name.web} | ${a.description.web} |`).join('\n');
const extra = `
## 結末の文言（${Object.keys(endings).length}種）

> \`src/content/endings.ts\`。一言はリザルトでタイトルの下に出る。自虐コメントは、敗因がないときにシェア文の3行目に入る。一枚絵の場面は \`docs/assets/asset_prompts_v2.md\` ④と合わせる。

| ID | タイトル | 一言（リザルト） | 自虐コメント（シェア文） |
|---|---|---|---|
${endingRows}

## 称号（${achievements.length}種）

> \`src/content/achievements.ts\`。条件の数値は \`src/content/balance.ts\` から入る。

| 名前 | 条件（図鑑の説明） |
|---|---|
${achievementRows}
`;

const md = `# カード一覧（自動生成）

> \`npm run cards:md\` で \`src/content/cards/*.json\` から作る。直接編集しない（JSON を直す）。
> 数値はゲージ（0〜100、初期値 50）への増減。スタイルのパッシブ倍率を掛ける前の値。どちらかが 0 か 100 に達すると倒産。
> 計 ${cards.length} 枚。話者：${[...new Set(cards.map((c) => c.speaker_name))].join('、')}

${body}
${extra}`;
writeFileSync(out, md);
console.log(`${out} に ${cards.length} 枚を書き出した（参照の確認：${byId.size} 件）`);
