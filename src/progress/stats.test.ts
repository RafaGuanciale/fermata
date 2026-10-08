import { describe, expect, it } from 'vitest';
import type { Attempt, PracticeDay, TrainingRun } from '../db/db';
import { bestByTreino, heatLevel, heatmap, milestones, minutesByDay, streak, weakNotes, weeklyTotals } from './stats';

const at = (iso: string) => new Date(iso + 'T12:00').getTime();
const pd = (day: string, minutes: number, device = 'a'): PracticeDay => ({ id: `${day}:${device}`, day, minutes, device });

describe('progresso', () => {
  const now = at('2026-10-08'); // quinta-feira
  const byDay = minutesByDay([pd('2026-10-06', 10), pd('2026-10-07', 20), pd('2026-10-07', 5, 'b'), pd('2026-10-08', 15)], []);

  it('soma aparelhos e conta dias seguidos', () => {
    expect(byDay.get('2026-10-07')).toBe(25);
    expect(streak(byDay, now)).toBe(3);
    expect(streak(byDay, at('2026-10-09'))).toBe(3);
    expect(streak(byDay, at('2026-10-11'))).toBe(0);
  });

  it('totais por semana e calendário', () => {
    const w = weeklyTotals(byDay, now, 2);
    expect(w[1]).toMatchObject({ minutes: 50, days: 3 });
    expect(w[0].minutes).toBe(0);
    const h = heatmap(byDay, now, 1);
    expect(h[0].map((c) => c.minutes)).toEqual([0, 10, 25, 15, 0, 0, 0]);
    expect(h[0][4].future).toBe(true);
    expect([0, 5, 15, 30, 60].map(heatLevel)).toEqual([0, 1, 2, 3, 4]);
  });

  it('notas que mais erra', () => {
    const atts: Attempt[] = [];
    for (let i = 0; i < 6; i++) atts.push({ sessionId: 1, at: 0, expected: 65, played: i < 3 ? 67 : 65, correct: i >= 3, ms: null });
    for (let i = 0; i < 6; i++) atts.push({ sessionId: 1, at: 0, expected: 60, played: 60, correct: true, ms: 500 });
    expect(weakNotes(atts)).toEqual([{ midi: 65, missRate: 0.5, asked: 6 }]);
  });

  it('melhor BPM limpo e marcos', () => {
    const runs: TrainingRun[] = [
      { treinoId: 'f1-escada-md', kind: 'timed', at: 1, day: '2026-10-06', bpm: 48, clean: true, accuracy: 1 },
      { treinoId: 'f1-escada-md', kind: 'timed', at: 2, day: '2026-10-07', bpm: 56, clean: false, accuracy: 0.8 },
      { treinoId: 'peca-x', kind: 'timed', at: 3, day: '2026-10-07', bpm: 80, accuracy: 0.9, weakFrom: 3, weakTo: 4 },
    ];
    const best = bestByTreino(runs);
    expect(best.get('f1-escada-md')).toMatchObject({ bestClean: 48, count: 2 });
    expect(best.get('peca-x')?.lastWeak).toEqual([3, 4]);
    const m = milestones(runs, byDay, []);
    expect(m[0].at).toBe(1);
    expect(m[1].at).toBe(3);
    expect(m.find((x) => x.title.startsWith('7 dias'))?.at).toBeNull();
    const long = minutesByDay([pd('2026-09-01', 400), pd('2026-09-02', 300)], []);
    expect(milestones([], long, []).find((x) => x.title.startsWith('10 horas'))?.at).toBe(at('2026-09-02'));
  });
});
