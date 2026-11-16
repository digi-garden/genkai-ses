import { LazyMotion } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/theme.css';
import { contentHash } from '../content/contentHash';
import { gameContent } from '../content/game';
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
const ports: AppPorts = {
  random: { newSeed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0 },
  clock: { now },
  saves: createSaveRepository(() => window.localStorage, cardIds),
  // 途中データはタブを閉じても残す（R20。2026-11-16 オーナー判断で sessionStorage から変更）
  sessions: createSessionRepository(() => window.localStorage, contentHash(gameContent.cards), cardIds, now),
};

createRoot(root).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      <App content={gameContent} ports={ports} />
    </LazyMotion>
  </StrictMode>,
);
