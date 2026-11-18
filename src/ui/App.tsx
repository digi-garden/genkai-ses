import { useCallback, useEffect, useRef, useState } from 'react';
import type { Content } from '../content';
import type { StyleId } from '../content/types';
import { step, survivedWeeks, type Action, type GameEvent, type RuntimeGameState } from '../core';
import { DEFAULT_COMPANY_NAME } from '../core/companyName';
import type { AnalyticsPort, Clock, ConsentRepository, Random, SaveRepository, SessionRepository, ShareService, SoundPort } from '../core/ports';
import { soundsFor } from '../core/sounds';
import { buildShareText, shareUrl } from '../core/share';
import { achievementById } from '../content/achievements';
import { endings } from '../content/endings';
import { formatSales } from './format';
import { commonParams, toAnalyticsEvents } from '../core/analytics';
import { ConsentBanner } from './components/ConsentBanner';
import { useVisibleTimer } from './hooks/useVisibleTimer';
import { addSeen, onRunEnded, onRunStarted, type SaveData } from '../core/progress';
import { HowToModal } from './screens/HowToModal';
import { NameScreen } from './screens/NameScreen';
import { PlayScreen } from './screens/PlayScreen';
import { ResultScreen, type ResultNews } from './screens/ResultScreen';
import { StyleScreen } from './screens/StyleScreen';
import { TermsModal } from './screens/TermsModal';
import { TitleScreen } from './screens/TitleScreen';
import { ZukanModal } from './screens/ZukanModal';

/** 音量の倍率（中＝今までの音量） */
const VOLUME = { low: 0.4, mid: 1, high: 1.7 } as const;

type Screen = 'title' | 'name' | 'style' | 'play' | 'result';
type ModalId = 'zukan' | 'howto' | 'terms' | null;
type EndEvent = Extract<GameEvent, { type: 'gameOver' | 'gameClear' }>;

export interface AppPorts {
  random: Random;
  clock: Clock;
  saves: SaveRepository;
  sessions: SessionRepository;
  analytics: AnalyticsPort;
  consent: ConsentRepository;
  /** 同意が得られたときに計測を読み込む */
  enableAnalytics: () => void;
  share: ShareService;
  sound: SoundPort;
  /** 結末ページの URL の組み立てに使う（VITE_SITE_ORIGIN、VITE_PUBLIC_BASE） */
  site: { origin: string; base: string };
}

/**
 * 画面の切り替え、ランの状態、記録の保存（02 の 2章、05 の 5・6章）
 */
export function App({ content, ports }: { content: Content; ports: AppPorts }) {
  const { random, clock, saves, sessions, analytics, consent, enableAnalytics, share, site, sound } = ports;
  const [showConsent, setShowConsent] = useState(() => consent.required && consent.get() === null);
  const runsInPage = useRef(0);
  const droppedRun = useRef<string | null>(null);
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

  // 効果音が ON なら、ページを開いた後の最初の操作で、音を鳴らせる状態にする（iOS・iPadOS の自動再生の制限）
  useEffect(() => {
    if (!save.sound_enabled) return;
    const onGesture = () => {
      sound.unlock();
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    };
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
    return () => {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    };
  }, [save.sound_enabled, sound]);

  // ページが隠れたら、メモリ上の既読カードなどをまとめて保存する（05 の 5.2）
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') saves.save(saveRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [saves]);

  const track = useCallback(
    (name: string, params: Record<string, string | number | boolean>, opts?: { beacon?: boolean }) => {
      analytics.send(name, { ...commonParams(saveRef.current, new Date(clock.now())), ...params }, opts);
    },
    [analytics, clock],
  );

  const dispatch = useCallback(
    (action: Action) => {
      const { state, events } = step(runRef.current, action, content);
      if (state === runRef.current) return;
      runRef.current = state;
      setRun(state);
      const isRetry = events.some((e) => e.type === 'runStarted') ? runsInPage.current++ > 0 : runsInPage.current > 1;

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
      if (saveRef.current.sound_enabled) for (const id of soundsFor(events)) sound.play(id, VOLUME[saveRef.current.sound_volume]);
      // 計測は記録の更新の後に送る（play_count などの共通パラメータを最新にするため）
      for (const a of toAnalyticsEvents(events, state, { isRetry, now: new Date(clock.now()) })) track(a.name, a.params, a.beacon ? { beacon: true } : undefined);

      if (state.ending === undefined) sessions.save(state);
      else sessions.clear();
    },
    [clock, content, sessions, sound, updateSave, track],
  );

  // heartbeat_10s：ラン開始から、表示中の時間の累計が10秒に達したら1回だけ（ユーザーにつき1回）
  useVisibleTimer(screen === 'play' && !save.heartbeat_sent, 10_000, () => {
    track('heartbeat_10s', {});
    updateSave({ ...saveRef.current, heartbeat_sent: true }, true);
  });

  // drop_at_week：プレイ中にページが隠れたとき。同じランで1回まで（ページが閉じられても届くよう beacon で送る）
  useEffect(() => {
    if (screen !== 'play') return;
    const onHide = () => {
      const r = runRef.current;
      if (document.visibilityState !== 'hidden' || !r || r.ending !== undefined) return;
      if (droppedRun.current === r.runStartedAt) return;
      droppedRun.current = r.runStartedAt;
      track('drop_at_week', { week_number: r.currentWeek }, { beacon: true });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [screen, track]);

  const chooseConsent = (granted: boolean) => {
    consent.set(granted ? 'granted' : 'denied');
    setShowConsent(false);
    if (granted) enableAnalytics();
  };

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
      <TermsModal
        onClose={() => setModal(null)}
        consent={consent.required ? consent.get() : undefined}
        onConsent={(granted) => chooseConsent(granted)}
      />
    ) : null;

  let body: React.ReactNode = null;
  switch (screen) {
    case 'title':
      body = (
        <TitleScreen
          resumeWeek={resumable?.currentWeek}
          persistent={saves.persistent}
          soundEnabled={save.sound_enabled}
          soundVolume={save.sound_volume}
          onSoundChange={(enabled, volume) => {
            updateSave({ ...saveRef.current, sound_enabled: enabled, sound_volume: volume }, true);
            if (enabled) {
              sound.unlock(); // ユーザー操作の中で鳴らせる状態にする（自動再生の制限）
              sound.play('trump', VOLUME[volume]); // 試し音（めくり音は小さいので、聞き取りやすい切り札の音にする）
            }
          }}
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
        <ResultScreen
          state={run}
          last={lastEnd}
          news={news}
          content={content}
          onRetry={() => {
            track('retry_click', { total_plays_in_session: runsInPage.current });
            setScreen('name');
          }}
          onTitle={toTitle}
          onZukan={() => setModal('zukan')}
          onShareX={() => {
            const ending = run.ending ?? 'clear';
            const def = endings[ending];
            const top = lastEnd?.achievements[0];
            const { text } = buildShareText({
              companyName: run.companyName,
              ending: def,
              week: ending === 'clear' ? 52 : run.currentWeek,
              salesText: formatSales(lastEnd?.sales ?? 0),
              achievement: top ? achievementById.get(top) : undefined,
              regret: run.regret,
            });
            track('share_intent_success', { share_type: 'XIntent' });
            share.openXIntent(text, shareUrl(site.origin, site.base, def.slug));
          }}
        />
      ) : null;
      break;
  }
  return (
    <>
      {body}
      {modalEl}
      {showConsent && screen !== 'play' && <ConsentBanner onChoose={chooseConsent} />}
    </>
  );
}
