import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Content } from '../../content';
import { achievementById } from '../../content/achievements';
import { endings } from '../../content/endings';
import { PARAMS } from '../../content/types';
import { computeSales, type GameEvent, type RuntimeGameState } from '../../core';
import { endingUrl } from '../assets';
import { Button } from '../components/Button';
import { formatSales } from '../format';

const LABEL = { cash: '資金', client: '顧客満足', dev: '現場メンタル', legal: 'コンプラ' } as const;

/** S05 リザルト（Phase 1-B の手順1：報告書と次の行動。シェアと画像化は手順5） */
export function ResultScreen({
  state,
  last,
  content,
  onRetry,
  onTitle,
}: {
  state: RuntimeGameState;
  last: Extract<GameEvent, { type: 'gameOver' | 'gameClear' }> | undefined;
  content: Content;
  onRetry: () => void;
  onTitle: () => void;
}) {
  const ending = state.ending ?? 'clear';
  const def = endings[ending];
  const clear = ending === 'clear';
  const weeks = clear ? 52 : state.currentWeek;
  const sales = last?.sales ?? computeSales(state, ending, content.balance);
  const ach = last?.achievements ?? [];
  const top = ach[0] ? achievementById.get(ach[0]) : undefined;
  const regret = state.regret;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-5 px-4 py-6">
      <section className="rounded-2xl border border-border bg-surface p-4" aria-labelledby="report-title" data-testid="report">
        <p id="report-title" className="text-center text-[13px] font-bold tracking-widest text-text-muted">
          {clear ? '決算通知書' : '倒産報告書'}
        </p>
        <img src={endingUrl(ending)} alt={def.subtitle.web} className="pixelated mt-3 aspect-video w-full rounded-md" />
        <h1 className="mt-3 text-center text-[24px] font-bold">{def.title.web}</h1>
        <p className="mt-1 text-center text-[13px] text-text-muted">{def.subtitle.web}</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
          <dt className="text-text-muted">会社名</dt>
          <dd className="[overflow-wrap:anywhere]">{state.companyName}</dd>
          <dt className="text-text-muted">{clear ? '生存' : '倒産'}</dt>
          <dd>{clear ? '52週（1期完走）' : `第${weeks}週`}</dd>
          <dt className="text-text-muted">経営スタイル</dt>
          <dd>{content.styles[state.styleId].name.web}</dd>
          <dt className="text-text-muted">最終売上</dt>
          <dd>{formatSales(sales)}円</dd>
          {top && (
            <>
              <dt className="text-text-muted">獲得称号</dt>
              <dd>
                ［{top.name.web}］{ach.length > 1 ? `ほか${ach.length - 1}件` : ''}
              </dd>
            </>
          )}
        </dl>
        {regret && (
          <p className="mt-3 rounded-md border border-accent px-3 py-2 text-[13px] text-accent">
            敗因：第{regret.week}週「{regret.regretText.web}」
          </p>
        )}
        <p className="mt-3 text-[12px] text-text-subtle">※会社名は架空です。</p>
      </section>

      {!clear && def.param && (
        <section aria-label="倒産の原因" className="grid grid-cols-4 gap-2 text-center text-[12px]">
          {PARAMS.map((p) => {
            const hit = p === def.param;
            return (
              <div key={p} className={`rounded-md border p-2 ${hit ? 'border-danger text-danger-text' : 'border-border text-text-subtle'}`}>
                <p className="font-bold">{LABEL[p]}</p>
                {hit ? (
                  <p className="mt-1 flex items-center justify-center gap-0.5 text-[15px] font-bold">
                    {def.direction === 'zero' ? <ArrowDown className="h-4 w-4" aria-hidden /> : <ArrowUp className="h-4 w-4" aria-hidden />}
                    {def.direction === 'zero' ? '0' : '100'}
                    <span className="sr-only">{def.direction === 'zero' ? 'に落ちた' : 'を振り切った'}</span>
                  </p>
                ) : (
                  <p className="mt-1">―</p>
                )}
              </div>
            );
          })}
        </section>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onRetry}>もう1期挑む</Button>
        <Button variant="link" onClick={onTitle}>
          タイトルへ
        </Button>
      </div>
    </main>
  );
}
