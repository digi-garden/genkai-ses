import { describe, expect, it } from 'vitest';
import { nextFloat, randomInt, seedRandom, shuffle } from '../../../src/core/rng';

describe('rng', () => {
  it('同じシードなら同じ列になる', () => {
    let a = seedRandom(42);
    let b = seedRandom(42);
    for (let i = 0; i < 100; i++) {
      let x: number, y: number;
      [x, a] = nextFloat(a);
      [y, b] = nextFloat(b);
      expect(x).toBe(y);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('randomInt は両端を含み、範囲外を返さない', () => {
    let s = seedRandom(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      let v: number;
      [v, s] = randomInt(s, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it('shuffle は元の配列を変えず、同じ要素を返す', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const [out] = shuffle(src, seedRandom(1));
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort()).toEqual(src);
    expect(out).not.toEqual(src);
  });
});
