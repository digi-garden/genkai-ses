import { LazyMotion } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/theme.css';
import { contentHash } from '../content/contentHash';
import { gameContent } from '../content/game';
import { needsConsent } from '../core/analytics';
import { createAnalytics, createConsentRepository, ensureCfBeacon } from '../infra/analytics';
import { createSaveRepository, createSessionRepository } from '../infra/storage';
import { App, type AppPorts } from '../ui/App';
import { normalizeEntryPath } from './entryPath';

const replaced = normalizeEntryPath(location.pathname, import.meta.env.BASE_URL);
if (replaced !== null) history.replaceState(null, '', replaced + location.search);

const root = document.getElementById('root');
if (!root) throw new Error('#root がありません');

const loadMotionFeatures = () => import('./motionFeatures').then((m) => m.default);

const now = () => new Date().toISOString();
const cardIds = new Set(gameContent.cards.map((c) => c.id));
const consent = createConsentRepository(() => window.localStorage, needsConsent(Intl.DateTimeFormat().resolvedOptions().timeZone));
const analytics = createAnalytics({ measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || undefined, doc: document, win: window });
if (!consent.required || consent.get() === 'granted') analytics.enable();
ensureCfBeacon(import.meta.env.VITE_CF_BEACON_TOKEN || undefined, document);

// 想定外のエラー（08 の 4章）
window.addEventListener('error', () => analytics.send('app_error', { error_type: 'uncaught' }));
window.addEventListener('unhandledrejection', () => analytics.send('app_error', { error_type: 'unhandled_rejection' }));

const ports: AppPorts = {
  random: { newSeed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0 },
  clock: { now },
  saves: createSaveRepository(() => window.localStorage, cardIds),
  // 途中データはタブを閉じても残す（R20。2026-11-16 オーナー判断で sessionStorage から変更）
  sessions: createSessionRepository(() => window.localStorage, contentHash(gameContent.cards), cardIds, now),
  analytics,
  consent,
  enableAnalytics: () => analytics.enable(),
};

createRoot(root).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      <App content={gameContent} ports={ports} />
    </LazyMotion>
  </StrictMode>,
);
