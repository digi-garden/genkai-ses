import { useCallback, useRef, useState } from 'react';
import type { Content } from '../content';
import { DEFAULT_COMPANY_NAME } from '../core/companyName';
import type { StyleId } from '../content/types';
import { step, type Action, type GameEvent, type RuntimeGameState } from '../core';
import { NameScreen } from './screens/NameScreen';
import { PlayScreen } from './screens/PlayScreen';
import { ResultScreen } from './screens/ResultScreen';
import { StyleScreen } from './screens/StyleScreen';
import { TitleScreen } from './screens/TitleScreen';

type Screen = 'title' | 'name' | 'style' | 'play' | 'result';
type EndEvent = Extract<GameEvent, { type: 'gameOver' | 'gameClear' }>;

export interface AppPorts {
  newSeed: () => number;
  now: () => string;
}

/**
 * 画面の切り替えとランの状態（Phase 1-B の手順1）。
 * 保存（SaveData・途中データ）は手順3、計測は手順4で、ポートとして足す。
 */
export function App({ content, ports }: { content: Content; ports: AppPorts }) {
  const [screen, setScreen] = useState<Screen>('title');
  const [companyName, setCompanyName] = useState('');
  const [styleId, setStyleId] = useState<StyleId>('taiikukai');
  const [run, setRun] = useState<RuntimeGameState | null>(null);
  const [lastEnd, setLastEnd] = useState<EndEvent | undefined>();
  const [playCount, setPlayCount] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);

  const runRef = useRef<RuntimeGameState | null>(null);

  const dispatch = useCallback(
    (action: Action) => {
      const { state, events } = step(runRef.current, action, content);
      if (state === runRef.current) return;
      runRef.current = state;
      setRun(state);
      const shown = events.flatMap((e) => (e.type === 'cardShown' ? [e.cardId] : []));
      if (shown.length) setSeen((s) => [...new Set([...s, ...shown])]);
      const end = events.find((e): e is EndEvent => e.type === 'gameOver' || e.type === 'gameClear');
      if (end) setLastEnd(end);
    },
    [content],
  );

  const start = (style: StyleId) => {
    setStyleId(style);
    setLastEnd(undefined);
    runRef.current = null;
    dispatch({
      type: 'start',
      styleId: style,
      companyName: companyName || DEFAULT_COMPANY_NAME,
      isFirstPlay: playCount === 0,
      seenCardIds: seen,
      seed: ports.newSeed(),
      now: ports.now(),
    });
    setPlayCount((n) => n + 1);
    setScreen('play');
  };

  const onFinished = useCallback(() => setScreen('result'), []);

  switch (screen) {
    case 'title':
      return <TitleScreen onStart={() => setScreen('name')} onResume={() => setScreen('play')} />;
    case 'name':
      return (
        <NameScreen
          initial={companyName}
          onNext={(n) => {
            setCompanyName(n);
            setScreen('style');
          }}
        />
      );
    case 'style':
      return <StyleScreen content={content} initial={styleId} onBack={() => setScreen('name')} onStart={start} />;
    case 'play':
      return run ? <PlayScreen state={run} content={content} dispatch={dispatch} onFinished={onFinished} /> : null;
    case 'result':
      return run ? (
        <ResultScreen state={run} last={lastEnd} content={content} onRetry={() => setScreen('name')} onTitle={() => setScreen('title')} />
      ) : null;
  }
}
