/**
 * ゲームのイベントから鳴らす効果音を決める（要件 7.1-2、04 の 3章の表）
 */
import type { SoundId } from './ports';
import type { GameEvent } from './state';

export function soundsFor(events: readonly GameEvent[]): SoundId[] {
  const out: SoundId[] = [];
  for (const e of events) {
    if (e.type === 'cardShown') out.push(e.kind === 'chain' ? 'chain' : 'flip');
    else if (e.type === 'trumpUsed') out.push('trump');
    else if (e.type === 'gameOver') out.push('death');
    else if (e.type === 'gameClear') out.push('clear');
  }
  return out;
}
