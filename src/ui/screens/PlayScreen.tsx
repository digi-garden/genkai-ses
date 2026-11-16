import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Content } from '../../content';
import { previewChoice, previewTrump, type Action, type RuntimeGameState, type Side } from '../../core';
import { DecisionBar, type TrumpState } from '../components/DecisionBar';
import { EventCard } from '../components/EventCard';
import { Gauges } from '../components/Gauges';

interface Props {
  state: RuntimeGameState;
  content: Content;
  dispatch: (a: Action) => void;
  /** 倒産・クリアの演出が終わったら呼ぶ */
  onFinished: () => void;
}

const DEATH_MS = 600;

/** S04 プレイ（02 の S04、03 の 5〜6章） */
export function PlayScreen({ state, content, dispatch, onFinished }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [lean, setLean] = useState<Side | null>(null);
  const [hover, setHover] = useState<Side | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [exitDir, setExitDir] = useState<Side>('left');
  const [dying, setDying] = useState(false);
  const trumpRef = useRef<HTMLDivElement>(null);

  const card = content.cardsById.get(state.currentCardId);
  const ended = state.ending !== undefined;
  const trump: TrumpState = state.usedTrumpCard ? 'used' : confirming ? 'confirm' : 'ready';

  // 倒産・クリアの演出
  useEffect(() => {
    if (!ended) return;
    const dead = state.ending !== 'clear';
    const t1 = window.setTimeout(() => setDying(dead), 0);
    const t2 = window.setTimeout(onFinished, dead ? DEATH_MS : 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ended, state.ending, onFinished]);

  const decide = useCallback(
    (side: Side) => {
      if (ended) return;
      setConfirming(false);
      setLean(null);
      setHover(null);
      setExitDir(side);
      dispatch({ type: 'choose', side });
    },
    [dispatch, ended],
  );

  const pressTrump = useCallback(() => {
    if (ended || state.usedTrumpCard) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    dispatch({ type: 'useTrump' });
  }, [confirming, dispatch, ended, state.usedTrumpCard]);

  // キー操作（S04 でだけ有効。02 の 4章）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        decide('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        decide('right');
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        pressTrump();
      } else if (e.key === 'Escape') {
        setConfirming(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, pressTrump]);

  // 切り札の確認中に、ボタン以外をタップしたら取り消す
  useEffect(() => {
    if (!confirming) return;
    const onDown = (e: PointerEvent) => {
      if (trumpRef.current && e.target instanceof Node && trumpRef.current.contains(e.target)) return;
      setConfirming(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [confirming]);

  if (!card) return null;

  const side = lean ?? hover;
  const hints = confirming ? previewTrump(state, content) : side && !ended ? previewChoice(state, side, content) : undefined;
  const cardKey = `${state.currentWeek}-${state.currentCardId}`;

  return (
    <main className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden px-4" aria-label="プレイ画面">
      <header className="shrink-0 border-b border-border pt-3 pb-2">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] font-bold">限界SES社長</span>
          <span className="text-[13px] font-bold text-primary" data-testid="week">
            Week {state.currentWeek}/52
          </span>
        </div>
        <Gauges params={state.parameters} hints={hints} />
      </header>

      <section className="relative flex min-h-0 flex-1 items-center justify-center py-4" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false} custom={exitDir}>
          <m.div
            key={cardKey}
            className="flex max-h-full w-full"
            custom={exitDir}
            variants={{
              enter: reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
              exit: (dir: Side) =>
                reduced
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { opacity: 0, x: dir === 'left' ? -420 : 420, rotate: dir === 'left' ? -18 : 18, transition: { duration: 0.25, ease: 'easeIn' } },
            }}
            initial="enter"
            animate="show"
            exit="exit"
          >
            <EventCard
              card={card}
              isChain={card.kind === 'chain'}
              isTutorial={card.kind === 'tutorial'}
              reducedMotion={reduced}
              disabled={ended}
              onLean={(s) => {
                setLean(s);
                if (s) setConfirming(false);
              }}
              onDecide={decide}
            />
          </m.div>
        </AnimatePresence>
      </section>

      <footer className="shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]" ref={trumpRef}>
        <DecisionBar
          card={card}
          disabled={ended}
          trump={trump}
          trumpName={content.styles[state.styleId].trump.name.web}
          showKeyHint
          onDecide={decide}
          onHover={setHover}
          onTrump={pressTrump}
        />
      </footer>

      {dying && (
        <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
          <div className="death-dim absolute inset-0 bg-black" />
          <div className="death-line absolute top-1/2 left-0 h-1 w-full bg-danger" />
        </div>
      )}
    </main>
  );
}
