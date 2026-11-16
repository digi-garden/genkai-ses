import { Button } from './Button';

/** 同意バナー（06 の 2.1。EEA・英国・スイスと推定される環境だけ） */
export function ConsentBanner({ onChoose }: { onChoose: (granted: boolean) => void }) {
  return (
    <div role="region" aria-label="アクセス解析の同意" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3">
        <p className="jp-pretty text-[13px] leading-relaxed">
          ゲームの改善のため、Google アナリティクスでプレイの状況（到達した週や結末など）を集計します。個人を特定する情報は送りません。
          <br />
          We use Google Analytics to measure gameplay. Do you allow it?
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onChoose(false)}>
            拒否する / Decline
          </Button>
          <Button className="flex-1" onClick={() => onChoose(true)}>
            同意する / Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
