import { animate, m, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { EventCard as Card } from '../../content/schema';
import type { Side } from '../../core';
import { iconUrl } from '../assets';

const THRESHOLD = 80;
/** 素早く払ったとみなす速さ（px/秒）と、そのときに必要な最小の移動量。軽すぎる・誤操作の指摘（2026-11-14）で 500 → 900、最小移動量 40px を追加 */
const VELOCITY = 900;
const FLICK_MIN = 40;

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
  // 本文がはみ出していて、まだ下まで読んでいないときだけ、下端をぼかす（02 の 6.2）
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setFade(el.scrollHeight - el.clientHeight - el.scrollTop > 1);
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [card.id]);

  // iPhone で縦の動きにスクロール（と引っぱって再読み込み）を取られ、左右に払えなくなる問題の対策（2026-11-18）。
  // カードの上での指の動きは、本文がはみ出していて縦に動かしたときだけスクロールに使い、それ以外は止める。
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    let start: { x: number; y: number } | null = null;
    let allowScroll: boolean | null = null;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = t ? { x: t.clientX, y: t.clientY } : null;
      allowScroll = null;
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (allowScroll === null && start && t) {
        const dx = Math.abs(t.clientX - start.x);
        const dy = Math.abs(t.clientY - start.y);
        if (dx + dy < 6) {
          e.preventDefault();
          return;
        }
        const body = scrollRef.current;
        const inBody = !!body && e.target instanceof Node && body.contains(e.target);
        const overflowing = !!body && body.scrollHeight - body.clientHeight > 1;
        allowScroll = inBody && overflowing && dy > dx;
      }
      if (!allowScroll) e.preventDefault();
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
    };
  }, []);

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
    if (dx <= -THRESHOLD || (vx <= -VELOCITY && dx <= -FLICK_MIN)) onDecide('left');
    else if (dx >= THRESHOLD || (vx >= VELOCITY && dx >= FLICK_MIN)) onDecide('right');
    else void animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
  };

  return (
    <m.article
      ref={articleRef}
      data-testid="event-card"
      aria-labelledby="card-speaker"
      drag={disabled ? false : 'x'}
      dragSnapToOrigin={false}
      dragElastic={0.6}
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
      <div ref={scrollRef} data-allow-scroll className={`mt-3.5 min-h-0 overflow-y-auto overscroll-contain ${fade ? 'card-body-fade' : ''}`}>
        <p className="jp-pretty text-[17px] leading-[1.7] [overflow-wrap:anywhere] md:text-[18px]">{card.message}</p>
        {isTutorial && (
          <p className="mt-3 rounded-[10px] border border-dashed border-border-strong px-3 py-2 text-[12px] text-text-muted">
            カードを左右にスワイプ、または下のボタンで選びます。PC では ← / → キーでも選べます。
          </p>
        )}
      </div>
    </m.article>
  );
}
