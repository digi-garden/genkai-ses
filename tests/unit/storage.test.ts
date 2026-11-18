import { describe, expect, it } from 'vitest';
import { contentHash } from '../../src/content/contentHash';
import { gameContent } from '../../src/content/game';
import { step } from '../../src/core';
import { addSeen, defaultSaveData, onRunEnded, onRunStarted } from '../../src/core/progress';
import { createSaveRepository, createSessionRepository, SAVE_KEY, SESSION_KEY } from '../../src/infra/storage';

class MemStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
const asStorage = (m: MemStorage) => m as unknown as Storage;
const ids = new Set(gameContent.cards.map((c) => c.id));
const now = () => '2026-11-16T00:00:00.000Z';

describe('SaveRepository', () => {
  it('何もなければ初期データ。保存したものを読み戻せる', () => {
    const st = new MemStorage();
    const repo = createSaveRepository(() => asStorage(st), ids);
    expect(repo.persistent).toBe(true);
    expect(repo.load()).toEqual(defaultSaveData());
    const d = { ...defaultSaveData(), play_count: 3, seen_card_ids: ['n_golf'] };
    repo.save(d);
    expect(createSaveRepository(() => asStorage(st), ids).load()).toEqual(d);
  });

  it('壊れたデータは退避して初期データにする', () => {
    const st = new MemStorage();
    st.setItem(SAVE_KEY, '{broken');
    expect(createSaveRepository(() => asStorage(st), ids).load()).toEqual(defaultSaveData());
    expect(st.getItem(`${SAVE_KEY}_broken`)).toBe('{broken');
  });

  it.each([
    ['項目が足りない', { schema_version: 1, play_count: 2 }],
    ['型が違う', { ...defaultSaveData(), play_count: '3' }],
    ['知らない結末', { ...defaultSaveData(), unlocked_endings: ['nope'] }],
    ['負のプレイ回数', { ...defaultSaveData(), play_count: -1 }],
  ])('形式が違うデータ（%s）は初期データにする', (_, d) => {
    const st = new MemStorage();
    st.setItem(SAVE_KEY, JSON.stringify(d));
    expect(createSaveRepository(() => asStorage(st), ids).load()).toEqual(defaultSaveData());
  });

  it('音量の項目がない古いデータは、音量「中」で補う（作り直さない）', () => {
    const st = new MemStorage();
    const old: Partial<ReturnType<typeof defaultSaveData>> = { ...defaultSaveData(), play_count: 4 };
    delete old.sound_volume;
    st.setItem(SAVE_KEY, JSON.stringify(old));
    const d = createSaveRepository(() => asStorage(st), ids).load();
    expect(d.play_count).toBe(4);
    expect(d.sound_volume).toBe('mid');
  });

  it('存在しないカードの既読は落とす', () => {
    const st = new MemStorage();
    st.setItem(SAVE_KEY, JSON.stringify({ ...defaultSaveData(), seen_card_ids: ['n_golf', 'n_deleted'] }));
    expect(createSaveRepository(() => asStorage(st), ids).load().seen_card_ids).toEqual(['n_golf']);
  });

  it('新しい版のデータは読み取り専用（上書きしない）', () => {
    const st = new MemStorage();
    const raw = JSON.stringify({ ...defaultSaveData(), schema_version: 2, play_count: 9 });
    st.setItem(SAVE_KEY, raw);
    const repo = createSaveRepository(() => asStorage(st), ids);
    expect(repo.load().play_count).toBe(9);
    repo.save(defaultSaveData());
    expect(st.getItem(SAVE_KEY)).toBe(raw);
  });

  it('ストレージが使えなければメモリで保持する（要件 7.2-4）', () => {
    const repo = createSaveRepository(() => {
      throw new Error('SecurityError');
    }, ids);
    expect(repo.persistent).toBe(false);
    repo.save({ ...defaultSaveData(), play_count: 1 });
    expect(repo.load().play_count).toBe(1);
  });
});

describe('SessionRepository', () => {
  const hash = contentHash(gameContent.cards);
  const started = () =>
    step(null, { type: 'start', styleId: 'taiikukai', companyName: 'x', isFirstPlay: false, seenCardIds: [], seed: 3, now: now() }, gameContent).state;

  it('保存した途中データを復元できる', () => {
    const st = new MemStorage();
    const repo = createSessionRepository(() => asStorage(st), hash, ids, now);
    const s = started();
    repo.save(s);
    expect(repo.load()).toEqual(s);
  });

  it('カードの構造が変わったら（content_hash が違えば）破棄する', () => {
    const st = new MemStorage();
    createSessionRepository(() => asStorage(st), hash, ids, now).save(started());
    expect(createSessionRepository(() => asStorage(st), 'other', ids, now).load()).toBeNull();
    expect(st.getItem(SESSION_KEY)).toBeNull();
  });

  it('存在しないカードを参照していたら破棄する', () => {
    const st = new MemStorage();
    const repo = createSessionRepository(() => asStorage(st), hash, ids, now);
    repo.save({ ...started(), currentCardId: 'n_deleted' });
    expect(repo.load()).toBeNull();
  });

  it('文言や効果値の変更では content_hash は変わらない', () => {
    const changed = gameContent.cards.map((c) => ({ ...c, message: c.message + '！', choice_left: { ...c.choice_left, effects: { ...c.choice_left.effects, cash: 99 } } }));
    expect(contentHash(changed)).toBe(hash);
    const removed = gameContent.cards.slice(1);
    expect(contentHash(removed)).not.toBe(hash);
  });
});

describe('progress', () => {
  it('開始・既読・終了で記録が更新される', () => {
    let s = onRunStarted(defaultSaveData(), '限界工業', 't1');
    expect([s.play_count, s.first_played_at, s.last_company_name]).toEqual([1, 't1', '限界工業']);
    s = onRunStarted(s, '限界工業', 't2');
    expect([s.play_count, s.first_played_at, s.last_played_at]).toEqual([2, 't1', 't2']);
    s = addSeen(addSeen(s, ['a', 'b']), ['b', 'c']);
    expect(s.seen_card_ids).toEqual(['a', 'b', 'c']);
    const r1 = onRunEnded(s, { ending: 'dev_zero', survivedWeeks: 8, sales: 900, achievements: ['speed_quit'] });
    expect(r1).toMatchObject({ newEnding: true, newRecord: { weeks: true, sales: true }, newAchievements: ['speed_quit'] });
    const r2 = onRunEnded(r1.save, { ending: 'dev_zero', survivedWeeks: 5, sales: 1000, achievements: ['speed_quit'] });
    expect(r2).toMatchObject({ newEnding: false, newRecord: { weeks: false, sales: true }, newAchievements: [] });
    expect(r2.save.high_score).toEqual({ max_weeks: 8, max_sales: 1000 });
    expect(r2.save.unlocked_endings).toEqual(['dev_zero']);
  });
});
