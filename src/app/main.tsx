import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/theme.css';
import { normalizeEntryPath } from './entryPath';
import { TitleScreen } from '../ui/screens/TitleScreen';

const replaced = normalizeEntryPath(location.pathname, import.meta.env.BASE_URL);
if (replaced !== null) history.replaceState(null, '', replaced + location.search);

const root = document.getElementById('root');
if (!root) throw new Error('#root がありません');

createRoot(root).render(
  <StrictMode>
    <TitleScreen />
  </StrictMode>,
);
