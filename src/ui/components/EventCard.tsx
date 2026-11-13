import { animate, m, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useRef } from 'react';
import type { EventCard as Card } from '../../content/schema';
import type { Side } from '../../core';
import { iconUrl } from '../assets';

const THRESHOLD = 80;
const VELOCITY = 500;

interface Props {
  card: Card;
  isChain: boolean;
  isTutorial: boolean;
  reducedMotion: boolean;
  disabled: boolean;
  /** ドラッグで傾けている側（予兆ドットの表示に使う） */
  onLean: (side: Side | null) => void;
  onDecide: (side: Side) => void;
}

/** イベントカード（03 の 5.1・5.2・6章）。左右にドラッグして選ぶ */
export function EventCard({ card, isChain, isTutorial, reducedMotion, disabled, onLean, onDecide }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const leftOpacity = useTransform(x, [-THRESHOLD, -30, 0], [1, 0, 0]);
  const rightOpacity = useTransform(x, [0, 30, THRESHOLD], [0, 0, 1]);
  const lean = useRef<Side | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setLean = (s: Side | null) => {
    if (lean.current !== s) {
      lean.current = s;
      onLean(s);
    }
  };

  const onDrag = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    setLean(dx < -30 ? 'left' : dx > 30 ? 'right' : null);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    setLean(null);
    if (dx <= -THRESHOLD || vx <= -VELOCITY) onDecide('left');
    else if (dx >= THRESHOLD || vx >= VELOCITY) onDecide('right');
    else void animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
  };

  return (
    <m.article
      data-testid="event-card"
      aria-labelledby="card-speaker"
      drag={disabled ? false : 'x'}
      dragSnapToOrigin={false}
      dragElastic={0.9}
      dragMomentum={false}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      style={{ x, rotate: reducedMotion ? 0 : rotate, touchAction: 'none' }}
      className={`relative mx-auto flex max-h-full w-full cursor-grab select-none flex-col rounded-2xl border bg-card p-5 active:cursor-grabbing ${isChain ? 'border-2 border-accent' : 'border-border'}`}
    >
      {isChain && (
        <span className="absolute -top-3 left-5 rounded-md bg-accent px-2 py-0.5 text-[13px] font-bold text-on-accent">【因果応報】</span>
      )}
      <m.div style={{ opacity: leftOpacity }} className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-[10px] bg-bg/90 px-3 py-2 text-left text-[15px] font-bold" aria-hidden>
        ← {card.choice_left.text}
      </m.div>
      <m.div style={{ opacity: rightOpacity }} className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-[10px] bg-bg/90 px-3 py-2 text-right text-[15px] font-bold" aria-hidden>
        {card.choice_right.text} →
      </m.div>

      <div className="flex items-center gap-3">
        <img src={iconUrl(card.speaker_icon)} alt="" width={64} height={64} draggable={false} className="pixelated h-16 w-16 shrink-0 rounded-md bg-surface" />
        <p id="card-speaker" className="truncate text-[13px] font-bold">{card.speaker_name}</p>
      </div>
      <div ref={scrollRef} className="card-body mt-3.5 min-h-0 overflow-y-auto">
        <p className="text-[17px] leading-[1.7] [overflow-wrap:anywhere] md:text-[18px]">{card.message}</p>
        {isTutorial && (
          <p className="mt-3 rounded-[10px] border border-dashed border-border-strong px-3 py-2 text-[12px] text-text-muted">
            カードを左右にスワイプ、または下のボタンで選びます。PC では ← / → キーでも選べます。
          </p>
        )}
      </div>
    </m.article>
  );
}
