/**
 * 効果音の確認用の画面（?debug=sound のときだけ出す）。実機で、どの再生方法なら音が出るかを切り分ける。
 * React を使わず、最小の DOM で作る（ゲーム本体の不具合と切り離すため）。
 */
type AudioWin = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  navigator: Navigator & { audioSession?: { type: string } };
};

function toneWav(freq: number, sec: number, vol: number): string {
  const rate = 22050;
  const n = Math.floor(rate * sec);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * 32767 * vol), true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function mountSoundDebug(win: AudioWin): void {
  const doc = win.document;
  const box = doc.createElement('div');
  box.setAttribute('style', 'position:fixed;inset:auto 8px 8px 8px;z-index:9999;background:#000;color:#fff;border:2px solid #f59e0b;border-radius:10px;padding:10px;font:13px/1.5 monospace');
  const log = doc.createElement('pre');
  log.setAttribute('style', 'white-space:pre-wrap;margin:8px 0 0;max-height:30vh;overflow:auto');
  const write = (m: string) => (log.textContent = `${new Date().toLocaleTimeString()} ${m}\n${log.textContent ?? ''}`);
  let ctx: AudioContext | null = null;
  const Ctor = win.AudioContext ?? win.webkitAudioContext;

  const btn = (label: string, fn: () => void) => {
    const b = doc.createElement('button');
    b.textContent = label;
    b.setAttribute('style', 'margin:4px;padding:10px 12px;border:1px solid #fff;border-radius:8px;background:#222;color:#fff;font:13px monospace');
    b.addEventListener('click', () => {
      try {
        fn();
      } catch (e) {
        write(`例外：${String(e)}`);
      }
    });
    return b;
  };

  const webAudio = (vol: number) => {
    if (!Ctor) return write('AudioContext がない');
    const c = ctx ?? new Ctor();
    ctx = c;
    write(`AudioContext state=${c.state} rate=${c.sampleRate}`);
    void c.resume().then(() => write(`resume 後 state=${c.state}`));
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = vol;
    o.frequency.value = 440;
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.6);
    write(`Web Audio で 440Hz を鳴らした（音量 ${vol}）`);
  };

  const element = (vol: number) => {
    const a = doc.createElement('audio');
    a.src = toneWav(440, 0.6, vol);
    a.play().then(
      () => write(`audio 要素で鳴らした（音量 ${vol}）`),
      (e: unknown) => write(`audio 要素の再生に失敗：${String(e)}`),
    );
  };

  const info = () =>
    write(
      [
        `UA=${win.navigator.userAgent}`,
        `AudioContext=${Ctor ? 'あり' : 'なし'} audioSession=${win.navigator.audioSession ? win.navigator.audioSession.type : 'なし'}`,
        `ctx=${ctx ? ctx.state : '未作成'}`,
      ].join('\n'),
    );

  const title = doc.createElement('div');
  title.textContent = '効果音の確認（?debug=sound）';
  title.setAttribute('style', 'font-weight:bold;color:#f59e0b');
  box.append(
    title,
    btn('1. Web Audio 小(0.05)', () => webAudio(0.05)),
    btn('2. Web Audio 大(0.3)', () => webAudio(0.3)),
    btn('3. audio要素 大(0.5)', () => element(0.5)),
    btn('4. session=playback', () => {
      if (win.navigator.audioSession) {
        win.navigator.audioSession.type = 'playback';
        write('audioSession.type = playback にした');
      } else write('audioSession がない');
    }),
    btn('状態を表示', info),
    log,
  );
  doc.body.appendChild(box);
  info();
}
