import { describe, expect, it } from 'vitest';
import { createWait, expectedFor, measureAccuracy, playableSteps, timedPlan, waitPress, weakestRange, type ScoreStep } from './practice';

// Dois compassos 4/4: mão direita E E F G | G(2) com ligadura; mão esquerda C+G no tempo 1 de cada compasso.
const steps: ScoreStep[] = [
  { measure: 1, beat: 0, notes: [{ midi: 64, staff: 0, tied: false }, { midi: 48, staff: 1, tied: false }, { midi: 55, staff: 1, tied: false }] },
  { measure: 1, beat: 1, notes: [{ midi: 64, staff: 0, tied: false }] },
  { measure: 1, beat: 2, notes: [{ midi: 65, staff: 0, tied: false }] },
  { measure: 1, beat: 3, notes: [{ midi: 67, staff: 0, tied: false }] },
  { measure: 2, beat: 4, notes: [{ midi: 67, staff: 0, tied: true }, { midi: 48, staff: 1, tied: false }] },
  { measure: 2, beat: 6, notes: [{ midi: 72, staff: 0, tied: false }] },
];

describe('passos da peça', () => {
  it('separa as mãos e ignora ligadura', () => {
    expect(expectedFor(steps[0], 'duas', 2)).toEqual([48, 55, 64]);
    expect(expectedFor(steps[0], 'esquerda', 2)).toEqual([48, 55]);
    expect(expectedFor(steps[4], 'direita', 2)).toEqual([]);
    expect(playableSteps(steps, 'direita', 2, { from: 1, to: 2 })).toEqual([0, 1, 2, 3, 5]);
    expect(playableSteps(steps, 'esquerda', 2, { from: 2, to: 2 })).toEqual([4]);
  });

  it('modo espera: acorde precisa de todas as notas e o trecho repete', () => {
    let s = createWait([0, 1]);
    s = waitPress(s, 48, [48, 55, 64]);
    expect(s.pos).toBe(0);
    s = waitPress(s, 60, [48, 55, 64]);
    expect(s.wrong).toBe(60);
    expect(s.missedSteps).toEqual([0]);
    s = waitPress(waitPress(s, 64, [48, 55, 64]), 55, [48, 55, 64]);
    expect(s.pos).toBe(1);
    s = waitPress(s, 64, [64]);
    expect(s.pos).toBe(0);
    expect(s.laps).toBe(1);
  });

  it('no tempo: notas com momento, compassos fracos', () => {
    const plan = timedPlan(steps, 'duas', 2, { from: 1, to: 1 }, 60);
    expect(plan.expected.map((e) => e.t)).toEqual([0, 0, 0, 1000, 2000, 3000]);
    expect(plan.lengthMs).toBe(4000);
    const p2 = timedPlan(steps, 'direita', 2, { from: 2, to: 2 }, 120);
    expect(p2.expected).toEqual([{ midi: 72, t: 1000, step: 5, measure: 2 }]);
    const acc = measureAccuracy(timedPlan(steps, 'direita', 2, { from: 1, to: 2 }, 60), ['perfect', 'good', 'miss', 'miss', 'perfect']);
    expect(acc).toEqual([{ measure: 1, accuracy: 0.5 }, { measure: 2, accuracy: 1 }]);
    expect(weakestRange(acc)).toEqual({ from: 1, to: 1 });
  });
});
