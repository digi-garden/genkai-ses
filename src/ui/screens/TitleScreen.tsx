import { BookOpen, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../components/Button';

interface Props {
  resumeWeek?: number | undefined;
  persistent: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStart: () => void;
  onResume: () => void;
  onZukan: () => void;
  onHowTo: () => void;
  onTerms: () => void;
}

const CONTACT = 'https://promptlab-games.com/contact';

/** S01 タイトル（効果音の ON / OFF は、効果音を入れる手順で追加する） */
export function TitleScreen({ resumeWeek, persistent, soundEnabled, onToggleSound, onStart, onResume, onZukan, onHowTo, onTerms }: Props) {
  const link = 'min-h-11 px-2 text-[13px] text-text-muted underline underline-offset-4';
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col items-center px-4 py-10 text-center">
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        aria-label={soundEnabled ? '効果音：オン（押すとオフ）' : '効果音：オフ（押すとオン）'}
        className={`absolute top-3 right-3 flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold ${soundEnabled ? 'border-primary text-primary' : 'border-border-strong text-text-muted'}`}
      >
        {soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        効果音 {soundEnabled ? 'オン' : 'オフ'}
      </button>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div>
          <p className="mb-3 text-[12px] text-text-subtle">PromptLab Games</p>
          <h1 className="text-[28px] leading-[1.3] font-bold">限界SES社長</h1>
          <p className="mt-1 text-[15px] text-text-muted">〜人月ピラミッドの頂点へ〜</p>
        </div>
        <p className="text-[15px]">今期も、誰もバックれませんように。</p>
        <div className="flex w-full max-w-[320px] flex-col gap-3">
          {resumeWeek !== undefined && (
            <Button onClick={onResume} data-testid="resume">
              続きから再開（第{resumeWeek}週から）
            </Button>
          )}
          <Button variant={resumeWeek !== undefined ? 'secondary' : 'primary'} onClick={onStart}>
            {resumeWeek !== undefined ? '新しく経営を始める' : '経営を始める'}
          </Button>
          <Button variant="secondary" onClick={onZukan} className="flex items-center justify-center gap-2">
            <BookOpen className="h-4 w-4" aria-hidden />
            図鑑
          </Button>
        </div>
        {!persistent && (
          <p role="status" className="max-w-[360px] rounded-md border border-accent px-3 py-2 text-[12px] text-accent">
            このブラウザでは記録を保存できません（プライベートモードなど）。ページを閉じると、図鑑と記録は消えます。
          </p>
        )}
      </div>
      <footer className="mt-8 flex flex-col items-center gap-2">
        <p className="jp-balance max-w-[360px] text-[12px] leading-relaxed text-text-subtle">
          このゲームはフィクションです。登場する人物・団体・会社名は架空のもので、実在のものとは関係ありません。
        </p>
        <nav aria-label="このゲームについて" className="flex flex-wrap justify-center">
          <button type="button" className={link} onClick={onHowTo}>遊び方</button>
          <button type="button" className={link} onClick={onTerms}>規約・プライバシー・免責</button>
          <a className={`${link} flex items-center`} href={CONTACT} target="_blank" rel="noopener">お問い合わせ</a>
        </nav>
      </footer>
    </main>
  );
}
