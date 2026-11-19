import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Content } from '../../content';
import { achievementById } from '../../content/achievements';
import { endings } from '../../content/endings';
import { PARAMS } from '../../content/types';
import { computeSales, type GameEvent, type RuntimeGameState } from '../../core';
import { endingUrl } from '../assets';
import { Button } from '../components/Button';
import { formatSales } from '../format';

export interface ResultNews {
  newRecord: { weeks: boolean; sales: boolean };
  newEnding: boolean;
  newAchievements: readonly string[];
}

const NewBadge = () => <span className="ml-2 rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-bold text-on-accent">NEW</span>;

const LABEL = { cash: '資金', client: '顧客', dev: '現場', legal: 'コンプラ' } as const;

/** S05 リザルト（Phase 1-B の手順1：報告書と次の行動。シェアと画像化は手順5） */
export function ResultScreen({
  state,
  last,
  news,
  content,
  onRetry,
  onTitle,
  onZukan,
  onShareX,
}: {
  state: RuntimeGameState;
  last: Extract<GameEvent, { type: 'gameOver' | 'gameClear' }> | undefined;
  news?: ResultNews | undefined;
  content: Content;
  onRetry: () => void;
  onTitle: () => void;
  onZukan: () => void;
  onShareX: () => void;
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
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-3 px-4 py-3">
      <section className="rounded-2xl border border-border bg-surface px-4 py-3" aria-labelledby="report-title" data-testid="report">
        <p id="report-title" className="text-center text-[13px] font-bold tracking-widest text-text-muted">
          {clear ? '決算通知書' : '倒産報告書'}
        </p>
        <img src={endingUrl(ending)} alt={def.subtitle.web} className="pixelated mx-auto mt-2 aspect-video max-h-[22svh] w-auto max-w-full rounded-md" />
        <h1 className="jp-balance mt-2 text-center text-[22px] font-bold">
          {def.title.web}
          {news?.newEnding && <NewBadge />}
        </h1>
        <p className="jp-balance mt-0.5 text-center text-[13px] text-text-muted">{def.subtitle.web}</p>
        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[14px]">
          <dt className="text-text-muted">会社名</dt>
          <dd className="[overflow-wrap:anywhere]">{state.companyName}</dd>
          <dt className="text-text-muted">{clear ? '生存' : '倒産'}</dt>
          <dd>
            {clear ? '52週（1期完走）' : `第${weeks}週`}
            {news?.newRecord.weeks && <span className="ml-2 text-[12px] font-bold text-accent">最長記録</span>}
          </dd>
          <dt className="text-text-muted">経営スタイル</dt>
          <dd>{content.styles[state.styleId].name.web}</dd>
          <dt className="text-text-muted">最終売上</dt>
          <dd>
            {formatSales(sales)}円
            {news?.newRecord.sales && <span className="ml-2 text-[12px] font-bold text-accent">最高記録</span>}
          </dd>
          {top && (
            <>
              <dt className="text-text-muted">獲得称号</dt>
              <dd>
                ［{top.name.web}］{ach.length > 1 ? `ほか${ach.length - 1}件` : ''}
                {news?.newAchievements.includes(top.id) && <NewBadge />}
              </dd>
            </>
          )}
        </dl>
        {regret && (
          <p className="jp-pretty mt-2 rounded-md border border-accent px-3 py-1.5 text-[13px] text-accent">
            敗因：第{regret.week}週「{regret.regretText.web}」
          </p>
        )}
        <p className="mt-1.5 text-[11px] text-text-subtle">※会社名は架空です。</p>
      </section>

      {/* 1画面に収めるため、横棒で表示（2026-11-18、リザルトでスクロールが要るという指摘） */}
      <section aria-label="最終的な会社の状態" className="grid grid-cols-4 gap-2 text-[12px]" data-testid="final-gauges">
        {PARAMS.map((p) => {
          const v = state.parameters[p];
          const hit = !clear && p === def.param;
          return (
            <div key={p} className={`rounded-md border px-2 py-1.5 ${hit ? 'border-danger text-danger-text' : 'border-border text-text-muted'}`}>
              <p className="flex items-center justify-between font-bold">
                {LABEL[p]}
                {hit && (
                  <span className="flex items-center">
                    {def.direction === 'zero' ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />}
                    {def.direction === 'zero' ? '0' : '100'}
                    <span className="sr-only">{def.direction === 'zero' ? 'に落ちた' : 'を振り切った'}</span>
                  </span>
                )}
              </p>
              <div
                role="meter"
                aria-label={LABEL[p]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={v}
                className="relative mt-1 h-2 overflow-hidden rounded-full border border-border-strong bg-bg"
              >
                <div className={`absolute inset-y-0 left-0 ${hit ? 'bg-danger' : 'bg-primary/60'}`} style={{ width: `${v}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onShareX}
            className="flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-black px-3 text-[15px] font-bold text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Xでポスト
          </button>
          <Button onClick={onRetry}>もう1期挑む</Button>
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="link" onClick={onZukan}>
            図鑑
          </Button>
          <Button variant="link" onClick={onTitle}>
            タイトルへ
          </Button>
        </div>
      </div>
    </main>
  );
}
