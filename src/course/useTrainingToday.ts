// Resumo do treino de hoje para a página Hoje (sem carregar a página do Treino).

import { useRuns } from '../training/runs';
import { dayKey } from '../training/progress';
import { UNITS } from '.';
import { courseStep, currentUnitN, isPassed, lessonKey, nextLesson } from './progress';
import { DAY_PARTS, partsDone } from './track';
import { useCourseRows } from './useCourseRows';

/** Resumo do dia para a página Hoje. */
export function useTrainingToday() {
  const runs = useRuns();
  const rows = useCourseRows();
  if (!runs || !rows) return null;
  const next = nextLesson(UNITS, rows, runs);
  const unit = currentUnitN(UNITS, rows, runs);
  const step = courseStep(UNITS, rows, runs);
  const finalSong = step.kind === 'final' ? step.unit.songs.find((s) => s.id === step.unit.final.songId) ?? null : null;
  const done = partsDone(runs, dayKey(Date.now()));
  const hasReview = UNITS.some((u) => u.lessons.some((l) => isPassed(rows.get(lessonKey(u, l)))));
  const total = DAY_PARTS.length - (hasReview ? 0 : 1);
  return { next, unit, finalSong, done: [...done].filter((p) => p !== 'revisao' || hasReview).length, total };
}
