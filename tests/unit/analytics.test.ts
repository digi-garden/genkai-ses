import { describe, expect, it, vi } from 'vitest';
import { gameContent } from '../../src/content/game';
import { step } from '../../src/core';
import { commonParams, daysBetween, needsConsent, toAnalyticsEvents } from '../../src/core/analytics';
import { defaultSaveData } from '../../src/core/progress';
import { createAnalytics, ensureCfBeacon } from '../../src/infra/analytics';

describe('needsConsent（06 の 2.1）', () => {
  it.each([
    ['Europe/Berlin', true],
    ['Europe/London', true],
    ['Atlantic/Reykjavik', true],
    ['Asia/Tokyo', false],
    ['America/New_York', false],
    [undefined, false],
  ])('%s → %s', (tz, v) => expect(needsConsent(tz)).toBe(v));
});

describe('daysBetween / commonParams', () => {
  it('端末の日付どうしの差', () => {
    expect(daysBetween(null, new Date(2026, 10, 16))).toBe(0);
    expect(daysBetween(new Date(2026, 10, 14, 23, 59).toISOString(), new Date(2026, 10, 16, 0, 1))).toBe(2);
  });
  it('共通パラメータ', () => {
    expect(commonParams({ ...defaultSaveData(), play_count: 3 }, new Date())).toEqual({ play_count: 3, days_since_first_play: 0, store_safe: false });
  });
});

describe('toAnalyticsEvents（06 の 2.2）', () => {
  const start = () => step(null, { type: 'start', styleId: 'gray_broker', companyName: 'x', isFirstPlay: false, seenCardIds: [], seed: 1, now: '2026-11-16T00:00:00.000Z' }, gameContent);

  it('runStarted → game_start', () => {
    const { state, events } = start();
    expect(toAnalyticsEvents(events, state, { isRetry: true, now: new Date() })).toEqual([
      { name: 'game_start', params: { style_id: 'gray_broker', is_retry: true } },
    ]);
  });

  it('倒産 → game_over、game_over_reason、play_duration', () => {
    let { state } = start();
    let events;
    for (;;) {
      ({ state, events } = step(state, { type: 'choose', side: 'left' }, gameContent));
      if (state.ending) break;
    }
    const names = toAnalyticsEvents(events, state, { isRetry: false, now: new Date('2026-11-16T00:05:00.000Z') });
    if (state.ending === 'clear') {
      expect(names.map((n) => n.name)).toEqual(['game_clear', 'play_duration']);
    } else {
      expect(names.map((n) => n.name)).toEqual(['game_over', 'game_over_reason', 'play_duration']);
      expect(names[0]?.params).toMatchObject({ reason_id: state.ending, week_number: state.currentWeek });
    }
    expect(names.at(-1)?.params.duration_sec).toBe(300);
  });

  it('trumpUsed → skill_used', () => {
    const { state } = start();
    const r = step(state, { type: 'useTrump' }, gameContent);
    expect(toAnalyticsEvents(r.events, r.state, { isRetry: false, now: new Date() })[0]).toEqual({
      name: 'skill_used',
      params: { week_number: 1, style_id: 'gray_broker' },
    });
  });
});

function fakeDom() {
  const appended: { src: string; attrs: Record<string, string> }[] = [];
  const doc = {
    head: { appendChild: (el: { src: string; attrs: Record<string, string> }) => appended.push(el) },
    createElement: () => {
      const attrs: Record<string, string> = {};
      return { src: '', async: false, defer: false, attrs, setAttribute: (k: string, v: string) => (attrs[k] = v) };
    },
    querySelector: () => null,
  } as unknown as Document;
  return { doc, appended };
}

describe('createAnalytics', () => {
  it('測定 ID がなければコンソールに出すだけ', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { doc, appended } = fakeDom();
    const a = createAnalytics({ measurementId: undefined, doc, win: {} as Window });
    a.enable();
    a.send('game_start', { style_id: 'x' });
    expect(appended).toEqual([]);
    expect(spy).toHaveBeenCalledWith('[analytics]', 'game_start', { style_id: 'x' });
    spy.mockRestore();
  });

  it('enable するまでは読み込まず、送らない。enable 後は gtag に積む', () => {
    const { doc, appended } = fakeDom();
    const win = {} as Window;
    const a = createAnalytics({ measurementId: 'G-TEST', doc, win });
    a.send('before', {});
    expect(win.dataLayer).toBeUndefined();
    a.enable();
    a.enable(); // 2回呼んでも1回だけ読み込む
    expect(appended).toHaveLength(1);
    expect(appended[0]?.src).toContain('gtag/js?id=G-TEST');
    a.send('drop_at_week', { week_number: 5 }, { beacon: true });
    const last = Array.from(win.dataLayer?.at(-1) as ArrayLike<unknown>);
    expect(last).toEqual(['event', 'drop_at_week', { week_number: 5, transport_type: 'beacon' }]);
  });
});

describe('ensureCfBeacon', () => {
  it('トークンがなければ何もしない。あればビーコンを入れる', () => {
    const { doc, appended } = fakeDom();
    ensureCfBeacon(undefined, doc);
    expect(appended).toHaveLength(0);
    ensureCfBeacon('tok', doc);
    expect(appended[0]?.attrs['data-cf-beacon']).toBe('{"token":"tok"}');
  });
  it('自動挿入のビーコンがすでにあれば入れない（二重計測の防止）', () => {
    const { doc, appended } = fakeDom();
    (doc as unknown as { querySelector: () => object }).querySelector = () => ({});
    ensureCfBeacon('tok', doc);
    expect(appended).toHaveLength(0);
  });
});
