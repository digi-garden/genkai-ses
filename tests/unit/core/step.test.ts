import { describe, expect, it } from 'vitest';
import { step, type GameEvent, type RuntimeGameState } from '../../../src/core';
import { card, makeContent, plainStyle, startAction, withState } from '../fixtures';

const plain = { taiikukai: plainStyle };

function advanceTo(state: RuntimeGameState, week: number, content: ReturnType<typeof makeContent>) {
  let s = state;
  while (s.currentWeek < week) {
    if (s.ending) throw new Error(`Week ${s.currentWeek} で終了した（${s.ending}）`);
    s = step(s, { type: 'choose', side: 'left' }, content).state;
  }
  return s;
}

const types = (events: GameEvent[]) => events.map((e) => e.type);

describe('start', () => {
  it('初期値・イベント・Week 1 のカード', () => {
    const content = makeContent({ styles: plain });
    const { state, events } = step(null, startAction(), content);
    expect(state.currentWeek).toBe(1);
    expect(state.parameters).toEqual({ cash: 50, client: 50, dev: 50, legal: 50 });
    expect(state.minLegalSinceQ2).toBe(100);
    expect(state.maxCashSinceQ2).toBe(0);
    expect(types(events)).toEqual(['runStarted', 'cardShown']);
    expect(state.deck).toHaveLength(49); // 50枚から1枚引いた
  });

  it('同じシードなら同じ山札、違うシードなら違う山札', () => {
    const content = makeContent({ styles: plain });
    const a = step(null, startAction({ seed: 5 }), content).state;
    const b = step(null, startAction({ seed: 5 }), content).state;
    const c = step(null, startAction({ seed: 6 }), content).state;
    expect(a.deck).toEqual(b.deck);
    expect(a.deck).not.toEqual(c.deck);
  });
});

describe('choose（1ターンの処理）', () => {
  it('引数の状態を書き換えない', () => {
    const content = makeContent({ styles: plain, extra: [card('n_x', 'normal', { cash: -10 })] });
    const s0 = withState(step(null, startAction(), content).state, { currentCardId: 'n_x' });
    const snapshot = JSON.stringify(s0);
    step(s0, { type: 'choose', side: 'left' }, content);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });

  it('cashGainedTotal はクランプ前の増加分を足す', () => {
    const content = makeContent({ styles: plain, extra: [card('n_x', 'normal', { cash: 30 })] });
    const s0 = withState(step(null, startAction(), content).state, {
      currentCardId: 'n_x',
      parameters: { cash: 90, client: 50, dev: 50, legal: 50 },
    });
    // 90 + 30 = 120 → 100 で倒産するが、累計は 30
    const { state } = step(s0, { type: 'choose', side: 'left' }, content);
    expect(state.cashGainedTotal).toBe(30);
    expect(state.ending).toBe('cash_max');
  });

  it('極値は Week 14 以降のターンだけ記録する', () => {
    const content = makeContent({ styles: plain, extra: [card('n_x', 'normal', { legal: -20, cash: 10 })] });
    const base = step(null, startAction(), content).state;
    const w13 = step(withState(base, { currentWeek: 12, currentCardId: 'n_x' }), { type: 'choose', side: 'left' }, content).state;
    expect(w13.minLegalSinceQ2).toBe(100);
    expect(w13.maxCashSinceQ2).toBe(0);
    const w14 = step(withState(base, { currentWeek: 14, currentCardId: 'n_x' }), { type: 'choose', side: 'left' }, content).state;
    expect(w14.minLegalSinceQ2).toBe(30);
    expect(w14.maxCashSinceQ2).toBe(60);
  });

  it('パッシブ倍率が掛かる（体育会系：dev 減少 ×0.8）', () => {
    const content = makeContent({ extra: [card('n_x', 'normal', { dev: -10 })] });
    const s0 = withState(step(null, startAction(), content).state, { currentCardId: 'n_x' });
    const { events } = step(s0, { type: 'choose', side: 'left' }, content);
    const turn = events.find((e) => e.type === 'turnResolved');
    expect(turn?.type === 'turnResolved' && turn.applied.dev).toBe(-8);
  });

  it('Week 13 / 26 / 39 / 52 で milestoneReached を出し、季節固定カードを表示する', () => {
    const content = makeContent({ styles: plain });
    let s = step(null, startAction(), content).state;
    s = advanceTo(s, 12, content);
    const { state, events } = step(s, { type: 'choose', side: 'left' }, content);
    expect(state.currentCardId).toBe('f_w13');
    expect(events).toContainEqual({ type: 'milestoneReached', week: 13 });
  });

  it('Week 52 を生き延びたらクリア（生存週 52）', () => {
    const content = makeContent({ styles: plain });
    let s = step(null, startAction(), content).state;
    s = advanceTo(s, 52, content);
    const { state, events } = step(s, { type: 'choose', side: 'left' }, content);
    expect(state.ending).toBe('clear');
    expect(state.currentWeek).toBe(52);
    expect(events.at(-1)).toEqual({ type: 'gameClear', sales: 5200, achievements: [] }); // コンプラ 50（65 未満）・資金 50（40 超）なので称号なし
  });
});

describe('境界条件（docs/design/04_game_logic.md 11章）', () => {
  it('E1：Week 52 のカードで崩壊したらクリアではなく倒産（死亡週 52）', () => {
    const content = makeContent({ styles: plain, fixedEffectsByWeek: { 52: { dev: -60 } } });
    let s = step(null, startAction(), content).state;
    s = advanceTo(s, 52, content);
    const { state, events } = step(s, { type: 'choose', side: 'left' }, content);
    expect(state.ending).toBe('dev_zero');
    expect(events.at(-1)).toMatchObject({ type: 'gameOver', ending: 'dev_zero', week: 52 });
  });

  it('E2：同時崩壊は cash → legal → dev → client の順', () => {
    const content = makeContent({
      styles: plain,
      extra: [card('n_a', 'normal', { cash: -60, legal: -60 }), card('n_b', 'normal', { dev: 60, client: -60 })],
    });
    const base = step(null, startAction(), content).state;
    expect(step(withState(base, { currentCardId: 'n_a' }), { type: 'choose', side: 'left' }, content).state.ending).toBe('cash_zero');
    expect(step(withState(base, { currentCardId: 'n_b' }), { type: 'choose', side: 'left' }, content).state.ending).toBe('dev_max');
  });

  it('E3：切り札で 100 に達したらその週で倒産（週は進まない）', () => {
    const content = makeContent(); // 体育会系の切り札：dev +40
    const s0 = withState(step(null, startAction(), content).state, {
      currentWeek: 7,
      parameters: { cash: 50, client: 50, dev: 60, legal: 50 },
    });
    const { state, events } = step(s0, { type: 'useTrump' }, content);
    expect(state.ending).toBe('dev_max');
    expect(state.currentWeek).toBe(7);
    expect(events.at(-1)).toMatchObject({ type: 'gameOver', week: 7 });
  });

  it('E4：切り札の後、同じ週のカードを選べる。切り札は再使用できない', () => {
    const content = makeContent({ extra: [card('n_x', 'normal', { cash: 10 })] });
    const s0 = withState(step(null, startAction(), content).state, { currentCardId: 'n_x' });
    const t = step(s0, { type: 'useTrump' }, content).state;
    expect(t.parameters).toEqual({ cash: 50, client: 50, dev: 90, legal: 30 }); // 倍率は掛けない
    expect(t.currentCardId).toBe('n_x');
    const again = step(t, { type: 'useTrump' }, content);
    expect(again.events).toEqual([]);
    expect(again.state).toBe(t);
    const c = step(t, { type: 'choose', side: 'left' }, content).state;
    expect(c.parameters.cash).toBe(60);
    expect(c.currentWeek).toBe(2);
  });

  const injecting = (delay: [number, number]) =>
    card('n_inj', 'normal', {}, {}, {
      choice_left: { text: '左', effects: {}, inject_card_id: 'c_x', inject_delay: delay, regret_text: 'やらかした' },
    });

  it('E5：予約週が季節固定の週ならずらし、予約済みの週も避ける', () => {
    const content = makeContent({
      styles: plain,
      extra: [injecting([3, 3]), card('c_x', 'chain'), card('c_y', 'chain')],
    });
    const base = withState(step(null, startAction(), content).state, {
      currentWeek: 10,
      currentCardId: 'n_inj',
      pendingInjections: [{ targetWeek: 14, cardId: 'c_y', originWeek: 9, regretText: { web: 'y' } }],
    });
    const { state, events } = step(base, { type: 'choose', side: 'left' }, content);
    expect(state.pendingInjections.find((p) => p.cardId === 'c_x')?.targetWeek).toBe(15);
    expect(events).toContainEqual({ type: 'injectionScheduled', cardId: 'c_x', targetWeek: 15, originWeek: 10 });
  });

  it('E6：Week 52 を超える予約は破棄する', () => {
    const content = makeContent({ styles: plain, extra: [injecting([3, 6]), card('c_x', 'chain')] });
    const base = withState(step(null, startAction(), content).state, { currentWeek: 50, currentCardId: 'n_inj' });
    const { state, events } = step(base, { type: 'choose', side: 'left' }, content);
    expect(state.pendingInjections).toEqual([]);
    expect(events).toContainEqual({ type: 'injectionDiscarded', cardId: 'c_x' });
  });

  it('同じ連鎖カードは1ランに1回まで（予約中・表示済み）', () => {
    const content = makeContent({ styles: plain, extra: [injecting([2, 2]), card('c_x', 'chain')] });
    const base = withState(step(null, startAction(), content).state, { currentWeek: 5, currentCardId: 'n_inj' });
    const shown = withState(base, { shownChainCardIds: ['c_x'] });
    expect(step(shown, { type: 'choose', side: 'left' }, content).state.pendingInjections).toEqual([]);
    const pending = withState(base, { pendingInjections: [{ targetWeek: 9, cardId: 'c_x', originWeek: 3, regretText: { web: 'x' } }] });
    expect(step(pending, { type: 'choose', side: 'left' }, content).state.pendingInjections).toHaveLength(1);
  });

  it('予約した週に連鎖カードが出て、元の選択が currentOrigin に入る', () => {
    const content = makeContent({ styles: plain, extra: [injecting([2, 2]), card('c_x', 'chain')] });
    let s = withState(step(null, startAction(), content).state, { currentWeek: 5, currentCardId: 'n_inj' });
    s = step(s, { type: 'choose', side: 'left' }, content).state;
    s = step(s, { type: 'choose', side: 'left' }, content).state;
    expect(s.currentWeek).toBe(7);
    expect(s.currentCardId).toBe('c_x');
    expect(s.currentOrigin).toEqual({ week: 5, regretText: { web: 'やらかした' } });
    expect(s.shownChainCardIds).toEqual(['c_x']);
  });

  it('E7：連鎖カードの選択肢がさらに別の連鎖を予約できる。敗因は直近の連鎖カードだけが対象', () => {
    const content = makeContent({
      styles: plain,
      extra: [
        card('c_x', 'chain', { dev: -10 }, {}, {
          choice_left: { text: '左', effects: { dev: -10 }, inject_card_id: 'c_y', inject_delay: [1, 1], regret_text: '二度目' },
        }),
        card('c_y', 'chain', { dev: -60 }),
      ],
    });
    let s = withState(step(null, startAction(), content).state, {
      currentWeek: 5,
      currentCardId: 'c_x',
      currentOrigin: { week: 3, regretText: { web: '一度目' } },
    });
    const r1 = step(s, { type: 'choose', side: 'left' }, content);
    expect(r1.events).toContainEqual({ type: 'injectionScheduled', cardId: 'c_y', targetWeek: 6, originWeek: 5 });
    s = r1.state;
    expect(s.currentCardId).toBe('c_y');
    const end = step(s, { type: 'choose', side: 'left' }, content).state;
    expect(end.ending).toBe('dev_zero');
    expect(end.regret).toEqual({ week: 5, regretText: { web: '二度目' } });
  });

  const chainThenDeath = (killer: { cash?: number; dev?: number }, turnsAfter: number) => {
    const content = makeContent({
      styles: plain,
      extra: [card('c_x', 'chain', { dev: -10 }), card('n_kill', 'normal', killer)],
    });
    let s = withState(step(null, startAction(), content).state, {
      currentWeek: 5,
      currentCardId: 'c_x',
      currentOrigin: { week: 2, regretText: { web: '盛った' } },
      parameters: { cash: 50, client: 50, dev: 50, legal: 50 },
    });
    s = step(s, { type: 'choose', side: 'left' }, content).state; // 連鎖カードで dev -10
    for (let i = 1; i < turnsAfter; i++) s = step(withState(s, { currentCardId: 'n_0' }), { type: 'choose', side: 'left' }, content).state;
    return step(withState(s, { currentCardId: 'n_kill' }), { type: 'choose', side: 'left' }, content).state;
  };

  it('敗因あり：連鎖カードで dev を下げ、2ターン後に dev で倒産', () => {
    const end = chainThenDeath({ dev: -60 }, 2);
    expect(end.ending).toBe('dev_zero');
    expect(end.regret).toEqual({ week: 2, regretText: { web: '盛った' } });
  });

  it('E8：連鎖カードで dev を下げ、2ターン後に cash で倒産 → 敗因なし', () => {
    const end = chainThenDeath({ cash: -60 }, 2);
    expect(end.ending).toBe('cash_zero');
    expect(end.regret).toBeUndefined();
  });

  it('E9：連鎖カードで dev を下げ、3ターン後に dev で倒産 → 敗因なし', () => {
    const end = chainThenDeath({ dev: -60 }, 3);
    expect(end.ending).toBe('dev_zero');
    expect(end.regret).toBeUndefined();
  });

  it('E10：初回プレイは Week 1〜2 が導入カード、Week 3 から opening のカード', () => {
    const content = makeContent({ styles: plain, openings: 8 });
    let s = step(null, startAction({ isFirstPlay: true }), content).state;
    expect(s.currentCardId).toBe('t_1');
    s = step(s, { type: 'choose', side: 'left' }, content).state;
    expect(s.currentCardId).toBe('t_2');
    const opening = new Set(Array.from({ length: 8 }, (_, i) => `n_${i}`));
    for (let w = 3; w <= 10; w++) {
      s = step(s, { type: 'choose', side: 'left' }, content).state;
      expect(opening.has(s.currentCardId), `Week ${w}: ${s.currentCardId}`).toBe(true);
    }
    s = step(s, { type: 'choose', side: 'left' }, content).state;
    expect(opening.has(s.currentCardId)).toBe(false);
  });

  it('E11：2回目以降は未読カードが先（opening は無視）', () => {
    const content = makeContent({ styles: plain, openings: 8 });
    const unseen = ['n_10', 'n_20', 'n_30', 'n_40', 'n_49'];
    const seen = Array.from({ length: 50 }, (_, i) => `n_${i}`).filter((id) => !unseen.includes(id));
    const s = step(null, startAction({ seenCardIds: seen }), content).state;
    expect([s.currentCardId, ...s.deck.slice(0, 4)].sort()).toEqual([...unseen].sort());
  });

  it('E12：山札が空になったら使用済みを再シャッフルして続ける', () => {
    const content = makeContent({ styles: plain, normals: 5 });
    let s = step(null, startAction(), content).state;
    s = advanceTo(s, 12, content); // 11ターンで5枚の山札を2周以上する
    expect(s.currentWeek).toBe(12);
    expect(s.currentCardId).toMatch(/^n_/);
  });

  it('山札も使用済みも空なら、山札の対象全体を引き直す（防御的な処理）', () => {
    const content = makeContent({ styles: plain, normals: 3 });
    const s = withState(step(null, startAction(), content).state, { deck: [], usedCardIds: [], currentCardId: 'f_w13', currentWeek: 13 });
    const next = step(s, { type: 'choose', side: 'left' }, content).state;
    expect(next.currentCardId).toMatch(/^n_/);
  });

  it('E13：途中データ（JSON）から再開しても、中断しなかった場合と同じ結果になる', () => {
    const content = makeContent({ extra: [injecting([2, 5]), card('c_x', 'chain', { dev: -3 })] });
    const play = (s: RuntimeGameState, n: number) => {
      const log: string[] = [];
      for (let i = 0; i < n && !s.ending; i++) {
        s = step(s, { type: 'choose', side: i % 3 === 0 ? 'left' : 'right' }, content).state;
        log.push(`${s.currentWeek}:${s.currentCardId}`);
      }
      return { s, log };
    };
    const s0 = step(null, startAction({ seed: 99 }), content).state;
    const first = play(s0, 10).s;
    const direct = play(first, 30);
    const resumed = play(JSON.parse(JSON.stringify(first)) as RuntimeGameState, 30);
    expect(resumed.log).toEqual(direct.log);
    expect(resumed.s).toEqual(direct.s);
  });

  it('E14：終了後の choose / useTrump は何も変えず、イベントも出さない', () => {
    const content = makeContent({ styles: plain, extra: [card('n_x', 'normal', { cash: -60 })] });
    const ended = step(withState(step(null, startAction(), content).state, { currentCardId: 'n_x' }), { type: 'choose', side: 'left' }, content).state;
    expect(ended.ending).toBe('cash_zero');
    for (const a of [{ type: 'choose', side: 'left' } as const, { type: 'useTrump' } as const]) {
      const r = step(ended, a, content);
      expect(r.state).toBe(ended);
      expect(r.events).toEqual([]);
    }
  });

  it('E16：季節固定カードの週に切り札を使って生存したら、同じカードのまま。選ぶと Week 14 へ', () => {
    const content = makeContent();
    let s = step(null, startAction(), content).state;
    s = advanceTo(s, 13, content);
    expect(s.currentCardId).toBe('f_w13');
    s = step(s, { type: 'useTrump' }, content).state;
    expect([s.currentWeek, s.currentCardId, s.ending]).toEqual([13, 'f_w13', undefined]);
    s = step(s, { type: 'choose', side: 'right' }, content).state;
    expect(s.currentWeek).toBe(14);
  });

  it('E17：グレー派遣ブローカーの切り札は、監査の連鎖を 3〜8 週後に予約する', () => {
    const content = makeContent();
    for (let seed = 1; seed <= 30; seed++) {
      const s0 = withState(step(null, startAction({ styleId: 'gray_broker', seed }), content).state, { currentWeek: 20 });
      const { state, events } = step(s0, { type: 'useTrump' }, content);
      expect(state.parameters.cash).toBe(100); // 50 + 50（倍率なし）
      expect(state.ending).toBe('cash_max');
      expect(events.some((e) => e.type === 'injectionScheduled')).toBe(true);
    }
    // 生存するケースで中身を確かめる
    const s1 = withState(step(null, startAction({ styleId: 'gray_broker' }), content).state, {
      currentWeek: 20,
      parameters: { cash: 30, client: 50, dev: 50, legal: 60 },
    });
    const { state } = step(s1, { type: 'useTrump' }, content);
    const p = state.pendingInjections[0];
    expect(p?.cardId).toBe('c_audit_visit');
    expect(p?.targetWeek).toBeGreaterThanOrEqual(23);
    expect(p?.targetWeek).toBeLessThanOrEqual(28 + 1); // Week 26 を避けて1週ずれることがある
    expect(p?.targetWeek).not.toBe(26);
    expect(p?.regretText).toEqual({ web: '多重商流ブーストに手を出した' });
  });

  it('初回プレイでは Week 1〜2 に連鎖を予約しない（導入カードの週を避ける）', () => {
    const content = makeContent({ styles: plain, extra: [injecting([1, 1]), card('c_x', 'chain')] });
    const s0 = withState(step(null, startAction({ isFirstPlay: true }), content).state, { currentCardId: 'n_inj' });
    const { state } = step(s0, { type: 'choose', side: 'left' }, content);
    expect(state.pendingInjections[0]?.targetWeek).toBe(3);
  });
});
