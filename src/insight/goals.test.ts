import { describe, expect, it } from 'vitest';
import type { AppEvent, TrainingRun } from '../db/db';
import type { Pass } from '../stats/model';
import { goalId, goalStates, type Goal } from './goals';

const T0 = new Date(2026, 9, 19, 20, 0).getTime();
const pass = (over: Partial<Pass>): Pass => ({ id: String(Math.random()), at: T0, day: '2026-10-19', sourceId: 'peca-ode', title: 'Ode to Joy', kind: 'musica', mode: 'junto', bpm: 60, from: 1, to: 16, accuracy: 0.9, clean: false, errors: [], meanDelta: null, drift: null, ...over });

describe('metas da semana', () => {
  const goals: Goal[] = [
    { id: goalId('2026-10-12', 0), action: { titulo: 'Compasso 10', como: 'x', minutos: 10, alvo: 'peca-ode', compassos: { de: 9, ate: 10 }, criterio: { bpm: 60, acerto: 0.85 } } },
    { id: goalId('2026-10-12', 1), action: { titulo: 'Leitura', como: 'x', minutos: 5, alvo: 'leitura' } },
    { id: goalId('2026-10-12', 2), action: { titulo: 'Livre', como: 'x', minutos: 5, alvo: 'livre' } },
  ];

  it('música: 3 passadas seguidas num trecho que contém o da meta, no andamento e acerto; marca sozinha', () => {
    const passes = [pass({ at: T0, accuracy: 0.9 }), pass({ at: T0 + 1, accuracy: 0.7 }), pass({ at: T0 + 2 }), pass({ at: T0 + 3 }), pass({ at: T0 + 4 })];
    const [g] = goalStates(goals, { since: T0 - 1, passes, runs: [], events: [] });
    expect(g).toMatchObject({ done: true, auto: true });
    const [h] = goalStates(goals, { since: T0 - 1, passes: passes.slice(0, 3), runs: [], events: [] });
    expect(h.done).toBe(false);
    expect(h.progress).toBe('1 de 3 passadas seguidas acima de 85 % a 60 BPM ou mais');
    // trecho que não contém os compassos 9 e 10, ou mais devagar: não vale
    const [k] = goalStates(goals, { since: T0 - 1, passes: [1, 2, 3].map((i) => pass({ at: T0 + i, to: 8 })), runs: [], events: [] });
    expect(k.done).toBe(false);
  });

  it('leitura e tocar livre pelo que foi feito depois da análise; a marca à mão vale', () => {
    const runs: TrainingRun[] = [1, 2].map((i) => ({ id: i, treinoId: 'leitura-1', kind: 'names', at: T0 + i, day: '' }));
    const events: AppEvent[] = [
      { id: 'v', at: T0, day: '', type: 'view', area: 'livre', active: 6 * 60_000 },
      { id: 'g', at: T0 + 5, day: '', type: 'goal', sourceId: goalId('2026-10-12', 0), accuracy: 1 },
    ];
    const s = goalStates(goals, { since: T0 - 1, passes: [], runs, events });
    expect(s.map((x) => x.done)).toEqual([true, true, true]);
    expect(s[0].auto).toBe(false);
  });
});
