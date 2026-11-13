import { useState, type KeyboardEvent } from 'react';
import type { Content } from '../../content';
import { STYLE_IDS, type ChoiceEffect, type Passive, type StyleId } from '../../content/types';
import { Button } from '../components/Button';

const PARAM_NAME = { cash: '資金', client: '顧客満足', dev: '現場メンタル', legal: 'コンプラ' } as const;

function passiveText(p: Passive): string {
  if (p.param === 'cash') return p.factor > 1 ? 'お金が入りやすい' : 'お金が入りにくい';
  const n = PARAM_NAME[p.param];
  if (p.direction === 'loss') return p.factor < 1 ? `${n}が減りにくい` : `${n}の傷が深い`;
  return p.factor > 1 ? `${n}が上がりやすい` : `${n}が上がりにくい`;
}

function trumpText(e: ChoiceEffect): string {
  return (Object.keys(PARAM_NAME) as (keyof ChoiceEffect)[])
    .filter((k) => e[k] !== 0)
    .map((k) => `${PARAM_NAME[k]}が${Math.abs(e[k]) >= 30 ? '大きく' : ''}${e[k] > 0 ? '上がる' : '下がる'}`)
    .join('、');
}

/** S03 経営スタイル選択 */
export function StyleScreen({ content, initial, onBack, onStart }: { content: Content; initial: StyleId; onBack: () => void; onStart: (s: StyleId) => void }) {
  const [sel, setSel] = useState<StyleId>(initial);

  const onKey = (e: KeyboardEvent) => {
    const i = STYLE_IDS.indexOf(sel);
    if (e.key === 'ArrowDown') setSel(STYLE_IDS[(i + 1) % STYLE_IDS.length] ?? sel);
    else if (e.key === 'ArrowUp') setSel(STYLE_IDS[(i + STYLE_IDS.length - 1) % STYLE_IDS.length] ?? sel);
    else if (e.key === 'Enter') onStart(sel);
    else return;
    e.preventDefault();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-5 px-4 py-8">
      <h1 className="text-[20px] font-bold">経営スタイルを選んでください</h1>
      <div role="radiogroup" aria-label="経営スタイル" className="flex flex-col gap-3" onKeyDown={onKey}>
        {STYLE_IDS.map((id) => {
          const s = content.styles[id];
          const on = id === sel;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setSel(id)}
              className={`rounded-2xl border-2 bg-card p-4 text-left ${on ? 'border-primary' : 'border-border'}`}
            >
              <p className="text-[17px] font-bold">{s.name.web}</p>
              <p className="mt-1 text-[15px] text-text-muted">{s.description.web}</p>
              <p className="mt-2 text-[13px]">特性：{s.passives.map(passiveText).join('／')}</p>
              <p className="mt-1 text-[13px] text-accent">
                切り札「{s.trump.name.web}」：{trumpText(s.trump.effects)}
                {s.trump.inject ? '（後で代償あり）' : ''}
              </p>
            </button>
          );
        })}
      </div>
      <Button onClick={() => onStart(sel)}>この会社で始める</Button>
      <Button variant="link" onClick={onBack}>
        戻る
      </Button>
    </main>
  );
}
