import { describe, expect, it } from 'vitest';
import type { TrainingRun } from '../db/db';
import { earSummary, readingSummary, songsProgress, trend } from './skills';

const DAY = 86_400_000;
const now = new Date('2026-10-18T12:00').getTime();
const run = (daysAgo: number, p: Partial<TrainingRun>): TrainingRun => ({ treinoId: 'x', kind: 'timed', at: now - daysAgo * DAY, day: '', ...p });

describe('evolução por habilidade', () => {
  it('leitura junta todos os exercícios e compara com as 4 semanas anteriores', () => {
    const runs = [
      run(2, { kind: 'names', avgMs: 1500, firstTry: 0.9 }),
      run(10, { kind: 'locate', avgMs: 1700, firstTry: 0.8 }),
      run(40, { kind: 'names', avgMs: 2200, firstTry: 0.7 }),
      run(3, { kind: 'timed', avgMs: 999 }),
    ];
    const r = readingSummary(runs, now);
    expect(r.now).toEqual({ ms: 1600, firstTry: 0.85, rounds: 2 });
    expect(r.before).toEqual({ ms: 2200, firstTry: 0.7, rounds: 1 });
    expect(trend(r.now!.ms, r.before!.ms, true)).toBe('melhor');
  });

  it('ouvido: maior frase; músicas do curso e do repertório com acerto e passadas da semana', () => {
    expect(earSummary([run(1, { treinoId: 'eco', kind: 'ear', level: 5 }), run(30, { treinoId: 'eco', kind: 'ear', level: 4 })], now)).toEqual({ now: 5, before: 4 });
    const songs = songsProgress(
      [
        run(1, { treinoId: 'curso-u05-fur-elise', accuracy: 0.9, bpm: 60, clean: true }),
        run(2, { treinoId: 'curso-u05-fur-elise', accuracy: 0.8, bpm: 66 }),
        run(35, { treinoId: 'curso-u05-fur-elise', accuracy: 0.6, bpm: 50 }),
        run(5, { treinoId: 'peca-abc', accuracy: 0.7 }),
        run(1, { treinoId: 'tec-x', accuracy: 1 }),
      ],
      now,
    );
    expect(songs.map((s) => s.id)).toEqual(['curso-u05-fur-elise', 'peca-abc']);
    expect(songs[0]).toMatchObject({ bestClean: 60, bestAccuracy: 0.9, week: 2 });
    expect(songs[0].accuracy.now).toBeCloseTo(0.85);
    expect(songs[0].accuracy.before).toBeCloseTo(0.6);
  });
});

describe('notas fracas na leitura', async () => {
  const { weakReading } = await import('./skills');
  it('junta a leitura de notas e as sessões, só recentes e vistas 3 vezes', () => {
    const w = weakReading(
      [
        { midi: 65, seen: 6, acc: 0.5, lastAt: now - DAY },
        { midi: 67, seen: 2, acc: 0.1, lastAt: now - DAY },
        { midi: 69, seen: 8, acc: 0.95, lastAt: now - DAY },
        { midi: 71, seen: 8, acc: 0.3, lastAt: now - 60 * DAY },
      ],
      [{ midi: 64, missRate: 0.3 }],
      now,
    );
    expect(w.map((x) => x.midi)).toEqual([65, 64]);
  });
});
