// Junta, do banco local, os números de cada trilha de maestria. Atualiza sozinho.

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { UNITS } from '../course';
import { isPassed, unitComplete } from '../course/progress';
import { ALL_TRACKS, DAY_PARTS, bestTechBpm, partsDone } from '../course/track';
import { useCourseRows } from '../course/useCourseRows';
import { minutesByDay } from '../progress/stats';
import { useRuns } from '../training/runs';
import { allTracks, longestStreak, musicianLevel, type MasteryInput, type MusicianLevel, type TrackStatus } from './mastery';

export function useMastery(): { tracks: TrackStatus[]; musician: MusicianLevel; input: MasteryInput } | null {
  const runs = useRuns();
  const rows = useCourseRows();
  const data = useLiveQuery(async () => {
    const [practice, sessions, pieces] = await Promise.all([db.practice.toArray(), db.sessions.toArray(), db.pieces.toArray()]);
    return { practice, sessions, pieces };
  }, []);

  return useMemo(() => {
    if (!runs || !rows || !data) return null;
    const byDay = minutesByDay(data.practice, data.sessions);
    const minutesTotal = [...byDay.values()].reduce((a, b) => a + b, 0);
    const lessonsPassed = [...rows.values()].filter((r) => isPassed(r)).length;
    const allUnitsComplete = UNITS.length > 0 && UNITS.every((u) => unitComplete(u, rows, runs));
    const courseSongs = new Set(runs.filter((r) => r.treinoId.startsWith('curso-') && r.passed).map((r) => r.treinoId));
    const pieces = data.pieces.filter((p) => p.status === 'learned' || p.status === 'repertoire').length;
    const techIds = new Set<string>();
    for (const t of ALL_TRACKS) for (const item of t.technique) {
      const best = bestTechBpm(item, runs);
      if (best !== null && best >= item.target) techIds.add(item.id);
    }
    const readingLevels = new Set(runs.filter((r) => r.treinoId.startsWith('notas-n') && r.passed).map((r) => r.level ?? 0)).size;
    const arcadeBest = new Map<string, number>();
    for (const r of runs) if (r.treinoId.startsWith('arcade-')) arcadeBest.set(r.treinoId, Math.max(arcadeBest.get(r.treinoId) ?? 0, r.stars ?? 0));
    const arcadeStars = [...arcadeBest.values()].reduce((a, b) => a + b, 0);
    const days = new Set(runs.map((r) => r.day));
    // Dia completo: todas as partes do Treino (a revisão só conta quando havia o que revisar, então aceita uma a menos).
    const fullDays = [...days].filter((d) => partsDone(runs, d).size >= DAY_PARTS.length - 1).length;
    const input: MasteryInput = {
      minutesTotal, bestStreak: longestStreak(byDay), lessonsPassed, allUnitsComplete, songsLearned: courseSongs.size + pieces,
      techAtTarget: techIds.size, readingLevels, arcadeStars, fullDays,
    };
    const tracks = allTracks(input);
    return { tracks, musician: musicianLevel(tracks), input };
  }, [runs, rows, data]);
}
