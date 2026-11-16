/** 画像素材の URL（Vite がハッシュ付きのファイル名にする） */
import type { EndingId, SpeakerIcon } from '../content/types';

const icons = import.meta.glob<string>('../assets/img/icon_*.webp', { eager: true, import: 'default' });
const endingImgs = import.meta.glob<string>('../assets/img/end_*.webp', { eager: true, import: 'default' });

const byName = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([p, url]) => [p.split('/').pop()?.replace('.webp', '') ?? p, url]));

const iconMap = byName(icons);
const endingMap = byName(endingImgs);

export function iconUrl(id: SpeakerIcon): string {
  return iconMap[id] ?? '';
}
export function endingUrl(id: EndingId): string {
  return endingMap[`end_${id}`] ?? '';
}
export const ALL_ICON_URLS = Object.values(iconMap);
export const ALL_ENDING_URLS = Object.values(endingMap);
