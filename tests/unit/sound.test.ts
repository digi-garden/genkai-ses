import { describe, expect, it } from 'vitest';
import { gameContent } from '../../src/content/game';
import { step } from '../../src/core';
import { soundsFor } from '../../src/core/sounds';
import { createSound } from '../../src/infra/sound';

describe('soundsFor', () => {
  it('開始でめくり音、切り札で切り札の音', () => {
    const r = step(null, { type: 'start', styleId: 'taiikukai', companyName: 'x', isFirstPlay: false, seenCardIds: [], seed: 1, now: '2026-11-16T00:00:00.000Z' }, gameContent);
    expect(soundsFor(r.events)).toEqual(['flip']);
    expect(soundsFor(step(r.state, { type: 'useTrump' }, gameContent).events)[0]).toBe('trump');
  });
  it('連鎖カードは警告音、倒産・クリア', () => {
    expect(soundsFor([{ type: 'cardShown', cardId: 'c', week: 5, kind: 'chain' }])).toEqual(['chain']);
    expect(soundsFor([{ type: 'gameOver', ending: 'dev_zero', week: 3, sales: 0, achievements: [] }])).toEqual(['death']);
    expect(soundsFor([{ type: 'gameClear', sales: 0, achievements: [] }])).toEqual(['clear']);
  });
});

describe('createSound', () => {
  it('Web Audio がない環境では何もしない（例外を出さない）', () => {
    const s = createSound({} as Window);
    expect(() => {
      s.unlock();
      s.play('death');
    }).not.toThrow();
  });
});

describe('iOS / iPadOS の消音モード対策', () => {
  it('unlock で Audio Session を playback（音楽扱い）にする', () => {
    const audioSession = { type: 'auto' };
    const win = { navigator: { audioSession }, document: {} } as unknown as Window;
    createSound(win).unlock();
    expect(audioSession.type).toBe('playback');
  });
  it('Audio Session がない環境では、無音の audio を再生する', () => {
    let played = false;
    const el = { setAttribute: () => {}, src: '', play: () => ((played = true), Promise.resolve()) };
    const win = { navigator: {}, document: { createElement: () => el } } as unknown as Window;
    createSound(win).unlock();
    expect(played).toBe(true);
    expect(el.src).toMatch(/^blob:/);
  });
});
