import type { EventCard } from '../../content/schema';
import type { Side } from '../../core';

export type TrumpState = 'ready' | 'confirm' | 'used';

interface Props {
  card: EventCard;
  disabled: boolean;
  trump: TrumpState;
  trumpName: string;
  showKeyHint: boolean;
  onDecide: (side: Side) => void;
  onHover: (side: Side | null) => void;
  onTrump: () => void;
}

/** 決断ボタン2つと切り札ボタン（02 の S04、03 の 5.4） */
export function DecisionBar({ card, disabled, trump, trumpName, showKeyHint, onDecide, onHover, onTrump }: Props) {
  const btn =
    'min-h-11 flex-1 rounded-[10px] border border-border-strong bg-card px-3 py-2 text-[14px] leading-snug sm:text-[15px] active:border-primary disabled:opacity-40 [overflow-wrap:anywhere]';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          className={`${btn} text-left`}
          disabled={disabled}
          onClick={() => onDecide('left')}
          onPointerEnter={() => onHover('left')}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover('left')}
          onBlur={() => onHover(null)}
        >
          ← {card.choice_left.text}
        </button>
        <button
          type="button"
          className={`${btn} text-right`}
          disabled={disabled}
          onClick={() => onDecide('right')}
          onPointerEnter={() => onHover('right')}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover('right')}
          onBlur={() => onHover(null)}
        >
          {card.choice_right.text} →
        </button>
      </div>
      <div className="relative">
        {trump === 'confirm' && (
          <p role="alert" className="absolute -top-2 left-1/2 w-max max-w-full -translate-x-1/2 -translate-y-full rounded-md bg-accent px-3 py-1.5 text-[12px] font-bold text-on-accent">
            この決断は取り返しがつきません。もう一度押すと実行
          </p>
        )}
        <button
          type="button"
          data-testid="trump-button"
          className={`min-h-12 w-full rounded-[10px] border-2 border-accent px-3 text-[15px] font-bold disabled:opacity-40 ${trump === 'confirm' ? 'trump-confirm bg-accent text-on-accent' : 'text-accent'}`}
          disabled={disabled || trump === 'used'}
          onClick={(e) => {
            e.stopPropagation();
            onTrump();
          }}
        >
          {trump === 'used' ? '社長の切り札（使用済み）' : trump === 'confirm' ? `${trumpName}を発動する` : '社長の切り札（残り1回）'}
        </button>
      </div>
      {showKeyHint && <p className="hidden text-center text-[12px] text-text-subtle md:block">← / → で選択、Space で切り札</p>}
    </div>
  );
}
