import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * モーダル（02 の M01〜M03）。<dialog> の showModal でフォーカスの閉じ込めと Esc を任せる。
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // 背景のクリックで閉じる
      }}
      className="m-auto max-h-[85dvh] w-[min(560px,calc(100vw-24px))] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="modal-title" className="text-[17px] font-bold">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="max-h-[calc(85dvh-64px)] overflow-y-auto px-4 py-4">{children}</div>
    </dialog>
  );
}
