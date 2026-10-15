import { describe, expect, it } from 'vitest';
import { TRACKS, allTracks, levelUps, longestStreak, musicianLevel, trackStatus, type MasteryInput } from './mastery';

const zero: MasteryInput = { minutesTotal: 0, bestStreak: 0, lessonsPassed: 0, allUnitsComplete: false, songsLearned: 0, techAtTarget: 0, readingLevels: 0, arcadeStars: 0, fullDays: 0 };

describe('maestria', () => {
  it('cada trilha tem 7 níveis crescentes', () => {
    for (const t of TRACKS) {
      expect(t.tiers, t.id).toHaveLength(7);
      for (let i = 1; i < 7; i++) expect(t.tiers[i], t.id).toBeGreaterThan(t.tiers[i - 1]);
    }
  });

  it('nível e progresso até o próximo', () => {
    const horas = TRACKS.find((t) => t.id === 'horas')!;
    expect(trackStatus(horas, zero)).toMatchObject({ level: 0, next: 60, progress: 0 });
    const s = trackStatus(horas, { ...zero, minutesTotal: 180 });
    expect(s.level).toBe(1);
    expect(s.next).toBe(300);
    expect(s.progress).toBeCloseTo(0.5);
    expect(trackStatus(horas, { ...zero, minutesTotal: 99999 })).toMatchObject({ level: 7, next: null, progress: 1 });
    const curso = TRACKS.find((t) => t.id === 'curso')!;
    expect(trackStatus(curso, { ...zero, lessonsPassed: 100 }).level).toBe(6);
    expect(trackStatus(curso, { ...zero, lessonsPassed: 100, allUnitsComplete: true }).level).toBe(7);
  });

  it('nível de músico, título e subidas', () => {
    const start = musicianLevel(allTracks(zero));
    expect(start).toMatchObject({ level: 0, max: 56, title: 'Primeiras notas', nextTitle: 'Aprendiz', toNext: 4, titleProgress: 0 });
    const some = allTracks({ ...zero, minutesTotal: 700, bestStreak: 8, lessonsPassed: 9 });
    expect(musicianLevel(some).level).toBe(3 + 2 + 2);
    expect(musicianLevel(some).title).toBe('Aprendiz');
    expect(levelUps({ horas: 2 }, some).map((t) => t.def.id)).toEqual(['horas', 'constancia', 'curso']);
  });

  it('maior sequência de dias', () => {
    const m = new Map([['2026-10-01', 10], ['2026-10-02', 5], ['2026-10-03', 20], ['2026-10-05', 3], ['2026-10-06', 0]]);
    expect(longestStreak(m)).toBe(3);
  });
});
