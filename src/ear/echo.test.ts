import { describe, expect, it } from 'vitest';
import { seeded } from '../course/music';
import { ECHO_POOLS, judgeEcho, makePhrase, nextLength } from './echo';

describe('ouvir e tocar de volta', () => {
  it('frase do tamanho pedido, dentro das notas escolhidas, andando quase sempre por grau', () => {
    const pool: readonly number[] = ECHO_POOLS.escala.notes;
    let steps = 0;
    let total = 0;
    for (let s = 1; s <= 50; s++) {
      const p = makePhrase(seeded(s), 6, pool);
      expect(p).toHaveLength(6);
      for (const m of p) expect(pool).toContain(m);
      expect(pool.indexOf(p[0])).toBeLessThan(3);
      for (let k = 1; k < p.length; k++) {
        total++;
        if (Math.abs(pool.indexOf(p[k]) - pool.indexOf(p[k - 1])) <= 1) steps++;
        if (k >= 2) expect(p[k] === p[k - 1] && p[k] === p[k - 2]).toBe(false);
      }
    }
    expect(steps / total).toBeGreaterThan(0.5);
  });

  it('confere nota a nota e diz onde errou', () => {
    expect(judgeEcho([60, 62, 64], [60])).toEqual({ state: 'going', next: 1 });
    expect(judgeEcho([60, 62, 64], [60, 62, 64])).toEqual({ state: 'done' });
    expect(judgeEcho([60, 62, 64], [60, 64])).toEqual({ state: 'wrong', at: 1, expected: 62 });
  });

  it('cresce ao acertar e diminui ao errar, entre 2 e 10 notas', () => {
    expect(nextLength(3, true)).toBe(4);
    expect(nextLength(2, false)).toBe(2);
    expect(nextLength(10, true)).toBe(10);
  });
});
