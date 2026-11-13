import { Button } from '../components/Button';

interface Props {
  resumeWeek?: number | undefined;
  onStart: () => void;
  onResume: () => void;
}

/** S01 タイトル（Phase 1-B の手順1では、図鑑・モーダル・効果音はまだ置かない） */
export function TitleScreen({ resumeWeek, onStart, onResume }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div>
        <p className="mb-3 text-[12px] text-text-subtle">PromptLab Games</p>
        <h1 className="text-[28px] leading-[1.3] font-bold">限界SES社長</h1>
        <p className="mt-1 text-[15px] text-text-muted">〜人月ピラミッドの頂点へ〜</p>
      </div>
      <p className="text-[15px]">今期も、誰もバックれませんように。</p>
      <div className="flex w-full max-w-[320px] flex-col gap-3">
        <Button onClick={onStart}>経営を始める</Button>
        {resumeWeek !== undefined && (
          <Button variant="secondary" onClick={onResume}>
            続きから再開（第{resumeWeek}週から）
          </Button>
        )}
      </div>
      <p className="max-w-[360px] text-[12px] leading-relaxed text-text-subtle">
        このゲームはフィクションです。登場する人物・団体・会社名は架空のもので、実在のものとは関係ありません。
      </p>
    </main>
  );
}
