// O plano do Treino de hoje: unidade, partes, revisão sorteada, técnica do dia e o que já foi feito.
// Usado pela página do Treino (lista) e pelo Treino em tela de foco.

import { useMemo, useState } from 'react';
import { db } from '../db/db';
import { saveRun, useRuns } from '../training/runs';
import { dayIndex, dayKey } from '../training/progress';
import { PLAN, UNITS } from '.';
import { afterReview, courseStep, currentUnitN, nextLesson, warmupItems, type Position } from './progress';
import { DAY_PARTS, dayRunId, partsDone, techniqueForDay, trackFor, type DayPart } from './track';
import { useCourseRows } from './useCourseRows';

const KIND: Record<DayPart, 'warmup' | 'review' | 'timed' | 'reading' | 'ear' | 'names'> = {
  aquecimento: 'warmup', notas: 'names', revisao: 'review', tecnica: 'timed', leitura: 'reading', ouvido: 'ear',
};

export function useDayPlan(chosenUnit: number | null = null) {
  const runs = useRuns();
  const rows = useCourseRows();
  const [round, setRound] = useState(0);
  const now = Date.now();
  const today = dayKey(now);

  const next = rows && runs ? nextLesson(UNITS, rows, runs) : null;
  const courseUnit = rows && runs ? currentUnitN(UNITS, rows, runs) : 1;
  const unitN = chosenUnit ?? courseUnit;
  const track = trackFor(unitN);

  // Revisão: lições antes da atual. Com as lições da unidade feitas (falta a música final) ou o curso no fim, todas contam.
  const reviewPos: Position | null = useMemo(() => {
    if (!rows || !runs) return null;
    if (next) return next;
    const step = courseStep(UNITS, rows, runs);
    const ui = step.kind === 'final' ? step.unitIndex : UNITS.length - 1;
    const unit = UNITS[ui];
    return unit ? { unit, unitIndex: ui, lesson: unit.lessons[unit.lessons.length - 1], lessonIndex: unit.lessons.length } : null;
  }, [rows, runs, next]);
  const review = useMemo(() => {
    if (!rows || !reviewPos) return [];
    return warmupItems(UNITS, rows, reviewPos, Math.random, Date.now());
    // Sorteia de novo só quando pedir outra rodada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows === undefined, reviewPos?.lesson.id, reviewPos?.lessonIndex, round]);

  // A técnica do dia é escolhida uma vez ao abrir (a lista não muda no meio do treino quando uma passada é salva).
  const techToday = useMemo(
    () => (runs ? techniqueForDay(track, runs, dayIndex(now)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runs === undefined, track],
  );

  const ready = !!runs && !!rows;
  const done = runs ? partsDone(runs, today) : new Set<DayPart>();
  const parts = DAY_PARTS.filter((p) => p !== 'revisao' || review.length > 0);
  const count = parts.filter((p) => done.has(p)).length;
  const title = PLAN.find((p) => p.n === unitN)?.title ?? '';

  const finishPart = (part: DayPart, accuracy?: number) => {
    void saveRun({ treinoId: dayRunId(part), kind: KIND[part], accuracy, level: unitN });
  };

  const finishReview = (results: { ok: boolean }[]) => {
    const bySource = new Map<string, { ok: boolean }[]>();
    review.forEach((w, i) => bySource.set(w.key, [...(bySource.get(w.key) ?? []), results[i] ?? { ok: false }]));
    void db.transaction('rw', db.lessons, async () => {
      for (const [k, rs] of bySource) {
        const r = await db.lessons.get(k);
        if (r) await db.lessons.put(afterReview(r, rs, Date.now()));
      }
    });
    finishPart('revisao', results.filter((r) => r.ok).length / Math.max(1, results.length));
  };

  return {
    ready, runs: runs ?? [], rows, today, next, courseUnit, unitN, title, track, review, round, nextRound: () => setRound((r) => r + 1),
    techToday, done, parts, count, finishPart, finishReview,
  };
}

export type DayPlan = ReturnType<typeof useDayPlan>;
