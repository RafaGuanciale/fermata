import { describe, expect, it } from 'vitest';
import type { TrainingRun } from '../db/db';
import { dueSpots, weakSpots } from './weakSpots';

const DAY = 86_400_000;
const t0 = new Date('2026-10-01T12:00').getTime();
const run = (dayN: number, p: Partial<TrainingRun>): TrainingRun => ({ treinoId: 'peca-a', kind: 'timed', at: t0 + dayN * DAY, day: '', ...p });

describe('trechos difíceis que voltam', () => {
  it('erro num trecho: volta amanhã; passadas boas espaçam; errar de novo recomeça', () => {
    const runs = [run(0, { accuracy: 0.7, weakFrom: 5, weakTo: 6, from: 1, to: 16 })];
    let s = weakSpots(runs);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ from: 5, to: 6, level: 0, dueAt: t0 + DAY });
    expect(dueSpots(runs, t0 + DAY / 2)).toHaveLength(0);
    expect(dueSpots(runs, t0 + DAY)).toHaveLength(1);
    // Revisou bem no dia seguinte: próxima em 3 dias.
    runs.push(run(1, { accuracy: 0.9, from: 5, to: 8 }));
    s = weakSpots(runs);
    expect(s[0]).toMatchObject({ level: 1, dueAt: t0 + DAY + 3 * DAY });
    // Errou nele de novo: volta para amanhã.
    runs.push(run(4, { accuracy: 0.8, weakFrom: 6, weakTo: 6, from: 1, to: 16 }));
    s = weakSpots(runs);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ from: 6, to: 6, level: 0, dueAt: t0 + 5 * DAY });
  });

  it('quatro revisões boas e o trecho sai da fila; outra música não mexe', () => {
    const runs = [run(0, { accuracy: 0.6, weakFrom: 3, weakTo: 4, from: 1, to: 8 })];
    for (const d of [1, 4, 11, 25]) runs.push(run(d, { accuracy: 0.95, from: 1, to: 8 }));
    runs.push(run(26, { treinoId: 'peca-b', accuracy: 0.95, from: 1, to: 8 }));
    expect(weakSpots(runs)).toHaveLength(0);
  });

  it('passada que não cobre o trecho inteiro não conta como revisão', () => {
    const runs = [run(0, { accuracy: 0.6, weakFrom: 3, weakTo: 6, from: 1, to: 8 }), run(1, { accuracy: 0.95, from: 5, to: 8 })];
    expect(weakSpots(runs)[0].level).toBe(0);
  });
});
