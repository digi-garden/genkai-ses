import { useCallback, useEffect, useRef, useState } from 'react';
import type { Content } from '../content';
import type { StyleId } from '../content/types';
import { step, survivedWeeks, type Action, type GameEvent, type RuntimeGameState } from '../core';
import { DEFAULT_COMPANY_NAME } from '../core/companyName';
import type { Clock, Random, SaveRepository, SessionRepository } from '../core/ports';
import { addSeen, onRunEnded, onRunStarted, type SaveData } from '../core/progress';
import { HowToModal } from './screens/HowToModal';
import { NameScreen } from './screens/NameScreen';
import { PlayScreen } from './screens/PlayScreen';
import { ResultScreen, type ResultNews } from './screens/ResultScreen';
import { StyleScreen } from './screens/StyleScreen';
import { TermsModal } from './screens/TermsModal';
import { TitleScreen } from './screens/TitleScreen';
import { ZukanModal } from './screens/ZukanModal';

type Screen = 'title' | 'name' | 'style' | 'play' | 'result';
type ModalId = 'zukan' | 'howto' | 'terms' | null;
type EndEvent = Extract<GameEvent, { type: 'gameOver' | 'gameClear' }>;

export interface AppPorts {
  random: Random;
  clock: Clock;
  saves: SaveRepository;
  sessions: SessionRepository;
}

/**
 * 画面の切り替え、ランの状態、記録の保存（02 の 2章、05 の 5・6章）
 */
export function App({ content, ports }: { content: Content; ports: AppPorts }) {
  const { random, clock, saves, sessions } = ports;
  const [save, setSave] = useState<SaveData>(() => saves.load());
  const saveRef = useRef(save);
  const [resumable, setResumable] = useState<RuntimeGameState | null>(() => sessions.load());
  const [screen, setScreen] = useState<Screen>('title');
  const [modal, setModal] = useState<ModalId>(null);
  const [companyName, setCompanyName] = useState(save.last_company_name);
  const [styleId, setStyleId] = useState<StyleId>('taiikukai');
  const [run, setRun] = useState<RuntimeGameState | null>(null);
  const runRef = useRef<RuntimeGameState | null>(null);
  const [lastEnd, setLastEnd] = useState<EndEvent | undefined>();
  const [news, setNews] = useState<ResultNews | undefined>();

  const updateSave = useCallback(
    (next: SaveData, persist: boolean) => {
      saveRef.current = next;
      setSave(next);
      if (persist) saves.save(next);
    },
    [saves],
  );

  // ページが隠れたら、メモリ上の既読カードなどをまとめて保存する（05 の 5.2）
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') saves.save(saveRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [saves]);

  const dispatch = useCallback(
    (action: Action) => {
      const { state, events } = step(runRef.current, action, content);
      if (state === runRef.current) return;
      runRef.current = state;
      setRun(state);

      let s = saveRef.current;
      let persist = false;
      for (const e of events) {
        if (e.type === 'runStarted') {
          s = onRunStarted(s, state.companyName, clock.now());
          persist = true;
        } else if (e.type === 'cardShown') {
          s = addSeen(s, [e.cardId]);
        } else if (e.type === 'gameOver' || e.type === 'gameClear') {
          const ending = state.ending ?? 'clear';
          const r = onRunEnded(s, { ending, survivedWeeks: survivedWeeks(state, ending), sales: e.sales, achievements: e.achievements });
          setNews({ newRecord: r.newRecord, newEnding: r.newEnding, newAchievements: r.newAchievements });
          s = r.save;
          persist = true;
          setLastEnd(e);
        }
      }
      if (s !== saveRef.current || persist) updateSave(s, persist);

      if (state.ending === undefined) sessions.save(state);
      else sessions.clear();
    },
    [clock, content, sessions, updateSave],
  );

  const start = (style: StyleId) => {
    setStyleId(style);
    setLastEnd(undefined);
    setNews(undefined);
    setResumable(null);
    sessions.clear();
    runRef.current = null;
    dispatch({
      type: 'start',
      styleId: style,
      companyName: companyName || DEFAULT_COMPANY_NAME,
      isFirstPlay: saveRef.current.play_count === 0,
      seenCardIds: saveRef.current.seen_card_ids,
      seed: random.newSeed(),
      now: clock.now(),
    });
    setScreen('play');
  };

  const resume = () => {
    if (!resumable) return;
    runRef.current = resumable;
    setRun(resumable);
    setStyleId(resumable.styleId);
    setCompanyName(resumable.companyName);
    setLastEnd(undefined);
    setNews(undefined);
    setResumable(null);
    setScreen('play');
  };

  const toTitle = () => {
    setResumable(sessions.load());
    setScreen('title');
  };

  const onFinished = useCallback(() => setScreen('result'), []);

  const modalEl =
    modal === 'zukan' ? (
      <ZukanModal save={save} onClose={() => setModal(null)} />
    ) : modal === 'howto' ? (
      <HowToModal onClose={() => setModal(null)} />
    ) : modal === 'terms' ? (
      <TermsModal onClose={() => setModal(null)} />
    ) : null;

  let body: React.ReactNode = null;
  switch (screen) {
    case 'title':
      body = (
        <TitleScreen
          resumeWeek={resumable?.currentWeek}
          persistent={saves.persistent}
          onStart={() => setScreen('name')}
          onResume={resume}
          onZukan={() => setModal('zukan')}
          onHowTo={() => setModal('howto')}
          onTerms={() => setModal('terms')}
        />
      );
      break;
    case 'name':
      body = (
        <NameScreen
          initial={companyName}
          onNext={(n) => {
            setCompanyName(n);
            setScreen('style');
          }}
        />
      );
      break;
    case 'style':
      body = <StyleScreen content={content} initial={styleId} onBack={() => setScreen('name')} onStart={start} />;
      break;
    case 'play':
      body = run ? <PlayScreen state={run} content={content} dispatch={dispatch} onFinished={onFinished} /> : null;
      break;
    case 'result':
      body = run ? (
        <ResultScreen state={run} last={lastEnd} news={news} content={content} onRetry={() => setScreen('name')} onTitle={toTitle} onZukan={() => setModal('zukan')} />
      ) : null;
      break;
  }
  return (
    <>
      {body}
      {modalEl}
    </>
  );
}
