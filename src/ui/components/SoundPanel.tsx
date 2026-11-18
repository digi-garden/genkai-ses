import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SOUND_VOLUMES, type SoundVolume } from '../../core/progress';

const LABEL: Record<SoundVolume, string> = { low: '小', mid: '中', high: '大' };

/**
 * 効果音の設定（タイトル右上）。ボタンで小さなパネルを開き、オン／オフと音量（小・中・大）を選ぶ。
 */
export function SoundPanel({
  enabled,
  volume,
  onChange,
}: {
  enabled: boolean;
  volume: SoundVolume;
  /** 変更したら呼ぶ。呼び出し側で保存し、試し音を鳴らす */
  onChange: (enabled: boolean, volume: SoundVolume) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  const seg = (on: boolean) => `min-h-11 flex-1 rounded-md text-[14px] font-bold ${on ? 'bg-primary text-on-primary' : 'text-text-muted'}`;

  return (
    <div ref={ref} className="absolute top-3 right-3 z-10 text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="sound-panel"
        aria-label={`効果音：${enabled ? `オン（音量 ${LABEL[volume]}）` : 'オフ'}。設定を開く`}
        className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold ${enabled ? 'border-primary text-primary' : 'border-border-strong text-text-muted'}`}
      >
        {enabled ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        効果音 {enabled ? `オン・${LABEL[volume]}` : 'オフ'}
      </button>
      {open && (
        <div id="sound-panel" role="group" aria-label="効果音の設定" className="absolute right-0 mt-2 w-64 rounded-[14px] border border-border bg-surface p-3 shadow-lg">
          <p className="mb-1.5 text-[12px] text-text-muted">効果音</p>
          <div className="flex gap-1 rounded-[10px] bg-bg p-1">
            <button type="button" aria-pressed={enabled} className={seg(enabled)} onClick={() => onChange(true, volume)}>
              オン
            </button>
            <button type="button" aria-pressed={!enabled} className={seg(!enabled)} onClick={() => onChange(false, volume)}>
              オフ
            </button>
          </div>
          <p className="mt-3 mb-1.5 text-[12px] text-text-muted">音量（選ぶと試し音が鳴ります）</p>
          <div className="flex gap-1 rounded-[10px] bg-bg p-1">
            {SOUND_VOLUMES.map((v) => (
              <button key={v} type="button" aria-pressed={enabled && volume === v} className={seg(enabled && volume === v)} onClick={() => onChange(true, v)}>
                {LABEL[v]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
