import { describe, expect, it } from 'vitest';
import { judgeExpected, windowsFor } from '../training/timing';
import { analyzeTake, packErrors, unpackErrors, type LogExpected } from './takeLog';

const exp = (ms: number[], midi = [60, 62, 64, 65, 67, 65, 64, 62]): LogExpected[] =>
  ms.map((t, i) => ({ midi: midi[i % midi.length], t, measure: 1 + Math.floor(i / 4), finger: (i % 5) + 1, hand: 'r' as const }));

describe('registro da passada', () => {
  it('classifica: trocou (com a tecla tocada), faltou, cedo e tarde; conta por dedo', () => {
    const e = exp([0, 500, 1000, 1500, 2000, 2500]);
    const played = [
      { midi: 60, t: 5 }, // ok
      { midi: 63, t: 510 }, // trocou Ré por Ré♯
      { midi: 64, t: 800 }, // cedo (-200)
      // Fá faltou
      { midi: 67, t: 2230 }, // tarde (+230)
      { midi: 65, t: 2500 }, // ok
    ];
    const r = judgeExpected(e, played, windowsFor(1), 250);
    const a = analyzeTake(e, played, r.notes, 250);
    expect(a.total).toBe(6);
    expect(a.errors.map((x) => [x.measure, x.midi, x.outcome, x.played])).toEqual([
      [1, 62, 'trocou', 63],
      [1, 64, 'cedo', 0],
      [1, 65, 'faltou', 0],
      [2, 67, 'tarde', 0],
    ]);
    expect(a.errors.find((x) => x.outcome === 'trocou')!.finger).toBe(2);
    expect(a.fingerTotals.slice(0, 5)).toEqual([2, 1, 1, 1, 1]);
    expect(a.extras).toBe(0);
  });

  it('acelerando: cada nota chega um pouco antes que a anterior', () => {
    const times = Array.from({ length: 16 }, (_, i) => i * 400);
    const e = exp(times);
    const played = e.map((x, i) => ({ midi: x.midi!, t: x.t! - i * 8 }));
    const r = judgeExpected(e, played, windowsFor(1), 200);
    const a = analyzeTake(e, played, r.notes, 200);
    expect(a.drift).toBeLessThan(-100);
    expect(a.meanDelta).toBe(-60);
  });

  it('guarda compacto e lê igual', () => {
    const errs = [
      { measure: 6, midi: 76, finger: 5, hand: 'r' as const, outcome: 'trocou' as const, delta: -20, played: 75 },
      { measure: 2, midi: 48, finger: 5, hand: 'l' as const, outcome: 'faltou' as const, delta: 0, played: 0 },
    ];
    expect(unpackErrors(packErrors(errs))).toEqual(errs);
  });
});
