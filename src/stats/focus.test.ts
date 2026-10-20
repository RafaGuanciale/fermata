import { describe, expect, it } from 'vitest';
import type { Pass } from './model';
import { isStudied, studiedSplit } from './focus';

const T0 = new Date(2026, 9, 15, 20, 0).getTime();
const pass = (sourceId: string, at: number, day: string): Pass => ({
  id: `${sourceId}-${at}`, at, day, sourceId, title: sourceId, kind: 'musica', mode: 'junto', bpm: 60, accuracy: 0.5, clean: false, errors: null, meanDelta: null, drift: null,
});

describe('o que conta como estudo', () => {
  const statusOf = (id: string) => (id === 'peca-ode' ? 'learning' : id === 'peca-sorriso' ? 'wish' : null);

  it('música em Aprendendo conta; em Quero aprender, umas passadas de teste não contam', () => {
    const passes = [
      pass('peca-ode', T0, '2026-10-15'),
      ...Array.from({ length: 50 }, (_, i) => pass('peca-sorriso', T0 + i * 15_000, '2026-10-15')),
    ];
    expect(isStudied('peca-ode', passes, statusOf)).toBe(true);
    expect(isStudied('peca-sorriso', passes, statusOf)).toBe(false);
    const { explored } = studiedSplit(passes, statusOf);
    expect(explored.get('peca-sorriso')).toMatchObject({ passes: 50, days: 1 });
  });

  it('prática de verdade (3 dias, 30 min) faz contar mesmo sem a marca', () => {
    const passes = ['2026-10-13', '2026-10-14', '2026-10-15'].flatMap((day, d) =>
      Array.from({ length: 30 }, (_, i) => pass('peca-sorriso', T0 + d * 86_400_000 + i * 25_000, day)),
    );
    expect(isStudied('peca-sorriso', passes, statusOf)).toBe(true);
  });

  it('exercícios e músicas do curso contam sempre', () => {
    expect(isStudied('ex:Escala', [], statusOf)).toBe(true);
    expect(isStudied('curso-u01-ode-8', [], statusOf)).toBe(true);
  });
});
