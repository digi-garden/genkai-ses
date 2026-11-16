import { LazyMotion } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/theme.css';
import { gameContent } from '../content/game';
import { App } from '../ui/App';
import { normalizeEntryPath } from './entryPath';

const replaced = normalizeEntryPath(location.pathname, import.meta.env.BASE_URL);
if (replaced !== null) history.replaceState(null, '', replaced + location.search);

const root = document.getElementById('root');
if (!root) throw new Error('#root がありません');

const loadMotionFeatures = () => import('./motionFeatures').then((m) => m.default);

const ports = {
  newSeed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0,
  now: () => new Date().toISOString(),
};

createRoot(root).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      <App content={gameContent} ports={ports} />
    </LazyMotion>
  </StrictMode>,
);
