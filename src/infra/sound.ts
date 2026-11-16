/**
 * 効果音（要件 7.1-2）。音声ファイルは使わず、Web Audio API の発振器で合成する。
 * 使えない環境（古いブラウザなど）では何もしない。
 */
import type { SoundId, SoundPort } from '../core/ports';

type Note = { f: number; t: number; d: number; type?: OscillatorType; gain?: number; slideTo?: number };

/** 音の設計：短く、うるさくない音量。t は開始の遅れ（秒）、d は長さ（秒） */
const SOUNDS: Record<SoundId, Note[]> = {
  // めくり音：短い高めのクリック
  flip: [{ f: 880, t: 0, d: 0.05, type: 'triangle', gain: 0.06, slideTo: 660 }],
  // 因果応報：低い2音の警告
  chain: [
    { f: 220, t: 0, d: 0.16, type: 'square', gain: 0.05 },
    { f: 185, t: 0.18, d: 0.24, type: 'square', gain: 0.05 },
  ],
  // 切り札：上昇する音
  trump: [{ f: 330, t: 0, d: 0.35, type: 'sawtooth', gain: 0.05, slideTo: 990 }],
  // 倒産：下降する音
  death: [
    { f: 392, t: 0, d: 0.18, type: 'square', gain: 0.06 },
    { f: 330, t: 0.2, d: 0.18, type: 'square', gain: 0.06 },
    { f: 262, t: 0.4, d: 0.5, type: 'square', gain: 0.06, slideTo: 130 },
  ],
  // クリア：短いファンファーレ
  clear: [
    { f: 523, t: 0, d: 0.12, type: 'square', gain: 0.05 },
    { f: 659, t: 0.13, d: 0.12, type: 'square', gain: 0.05 },
    { f: 784, t: 0.26, d: 0.12, type: 'square', gain: 0.05 },
    { f: 1047, t: 0.39, d: 0.45, type: 'square', gain: 0.05 },
  ],
};

type AudioWindow = { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };

/** 鳴らすかどうか（効果音の ON / OFF）は呼び出し側（ui）が決める */
export function createSound(win: Window): SoundPort {
  let ctx: AudioContext | null = null;
  const w = win as unknown as AudioWindow;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;

  const ensure = (): AudioContext | null => {
    if (!Ctor) return null;
    try {
      const c = ctx ?? new Ctor();
      ctx = c;
      if (c.state === 'suspended') void c.resume();
      return c;
    } catch {
      return null;
    }
  };

  return {
    unlock() {
      ensure();
    },
    play(id) {
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      for (const n of SOUNDS[id]) {
        try {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = n.type ?? 'square';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, now + n.t + n.d);
          const v = n.gain ?? 0.05;
          g.gain.setValueAtTime(0.0001, now + n.t);
          g.gain.exponentialRampToValueAtTime(v, now + n.t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
          osc.connect(g).connect(c.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d + 0.02);
        } catch {
          return;
        }
      }
    },
  };
}
