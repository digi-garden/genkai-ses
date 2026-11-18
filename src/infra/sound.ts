/**
 * 効果音（要件 7.1-2）。音声ファイルは使わず、Web Audio API の発振器で合成する。
 * 使えない環境（古いブラウザなど）では何もしない。
 */
import type { SoundId, SoundPort } from '../core/ports';

type Note = { f: number; t: number; d: number; type?: OscillatorType; gain?: number; slideTo?: number };

/** 音の設計：短く、うるさくない音量。t は開始の遅れ（秒）、d は長さ（秒） */
/**
 * 全体の音量（2026-11-18：実機確認で「全体的に少しうるさい」との指摘で 1.0 → 0.6）。
 * 毎ターン鳴るめくり音は、さらに半分にする（FLIP_SCALE）。
 */
const MASTER = 0.6;
const FLIP_SCALE = 0.5;

const SOUNDS: Record<SoundId, Note[]> = {
  // めくり音：短い高めのクリック（2026-11-17：iPad mini で聞こえなかったため、音量と長さを上げた）
  flip: [{ f: 880, t: 0, d: 0.09, type: 'triangle', gain: 0.35, slideTo: 620 }],
  // 因果応報：低い2音の警告
  chain: [
    { f: 220, t: 0, d: 0.16, type: 'square', gain: 0.18 },
    { f: 185, t: 0.18, d: 0.26, type: 'square', gain: 0.18 },
  ],
  // 切り札：上昇する音
  trump: [{ f: 330, t: 0, d: 0.4, type: 'sawtooth', gain: 0.16, slideTo: 990 }],
  // 倒産：下降する音
  death: [
    { f: 392, t: 0, d: 0.18, type: 'square', gain: 0.2 },
    { f: 330, t: 0.2, d: 0.18, type: 'square', gain: 0.2 },
    { f: 262, t: 0.4, d: 0.55, type: 'square', gain: 0.2, slideTo: 130 },
  ],
  // クリア：短いファンファーレ
  clear: [
    { f: 523, t: 0, d: 0.12, type: 'square', gain: 0.18 },
    { f: 659, t: 0.13, d: 0.12, type: 'square', gain: 0.18 },
    { f: 784, t: 0.26, d: 0.12, type: 'square', gain: 0.18 },
    { f: 1047, t: 0.39, d: 0.5, type: 'square', gain: 0.18 },
  ],
};

type AudioWindow = {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  navigator: Navigator & { audioSession?: { type: string } };
  document: Document;
};

/**
 * 無音の WAV（0.05秒）。iOS の古い Safari で、HTML の audio を1回再生して、
 * 音声の扱いを「通知音（消音モードで鳴らない）」から「音楽（鳴る）」に切り替えるために使う。
 */
function silentWavUrl(): string {
  const rate = 8000;
  const samples = 400;
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/** 鳴らすかどうか（効果音の ON / OFF）は呼び出し側（ui）が決める */
export function createSound(win: Window): SoundPort {
  let ctx: AudioContext | null = null;
  const w = win as unknown as AudioWindow;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;

  let sessionSet = false;
  /**
   * iOS / iPadOS では Web Audio は既定で「通知音」扱いになり、消音モードで鳴らない（動画やアプリの音は鳴る）。
   * Audio Session API（Safari 16.4 以降）で「音楽」扱いにする。ない場合は無音の audio を1回再生する。
   * どちらもユーザー操作の中で呼ぶ必要がある。
   */
  const setPlaybackSession = () => {
    if (sessionSet) return;
    sessionSet = true;
    try {
      if (w.navigator.audioSession) {
        w.navigator.audioSession.type = 'playback';
        return;
      }
      const a = w.document.createElement('audio');
      a.setAttribute('playsinline', '');
      a.src = silentWavUrl();
      void a.play().catch(() => undefined);
    } catch {
      /* 何もしない */
    }
  };

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
      setPlaybackSession();
      const c = ensure();
      // iOS の古い Safari は、ユーザー操作の中で一度音を出さないと鳴らせる状態にならない。無音を1つ流す
      if (c) {
        try {
          const b = c.createBuffer(1, 1, 22050);
          const src = c.createBufferSource();
          src.buffer = b;
          src.connect(c.destination);
          src.start(0);
        } catch {
          /* 何もしない */
        }
      }
    },
    play(id, volume = 1) {
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
          const v = (n.gain ?? 0.05) * MASTER * volume * (id === 'flip' ? FLIP_SCALE : 1);
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
