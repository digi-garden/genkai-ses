import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CardFile } from './validate-cards';

export const CARD_DIR = 'src/content/cards';

export const CARD_FILES: readonly { name: string; expectedKind: CardFile['expectedKind'] }[] = [
  { name: 'tutorial.json', expectedKind: 'tutorial' },
  { name: 'fixed.json', expectedKind: 'fixed' },
  { name: 'chain.json', expectedKind: 'chain' },
  { name: 'normal.json', expectedKind: 'normal' },
  { name: 'style.json', expectedKind: 'normal' },
];

export function loadCardFiles(dir = CARD_DIR): CardFile[] {
  return CARD_FILES.map((f) => ({ ...f, data: JSON.parse(readFileSync(join(dir, f.name), 'utf8')) as unknown }));
}
