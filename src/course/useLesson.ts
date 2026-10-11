// Estado de uma lição (progresso, aquecimento, checkpoint), compartilhado pela página da lição e pelo modo foco.

import { useCallback, useMemo, useState } from 'react';
import { db, type LessonProgress } from '../db/db';
import { useRuns } from '../training/runs';
import { UNITS } from '.';
import { afterCheckpoint, afterReview, canMaster, findLesson, lessonKey, lessonState, markDone, unitUnlocked, warmupItems } from './progress';
import { useCourseRows } from './useCourseRows';

export function useLesson(n: string, lessonId: string) {
  const rows = useCourseRows();
  const runs = useRuns();
  const pos = findLesson(UNITS, Number(n), lessonId);
  const [warmKey, setWarmKey] = useState(0);
  const [checkpointMsg, setCheckpointMsg] = useState<string | null>(null);

  const key = pos ? lessonKey(pos.unit, pos.lesson) : '';
  const row = rows?.get(key);

  const save = useCallback(async (update: (r: LessonProgress | undefined) => LessonProgress) => {
    const current = await db.lessons.get(key);
    await db.lessons.put(update(current));
  }, [key]);

  const done = useCallback((blockId: string) => void save((r) => markDone(r, key, blockId, Date.now())), [save, key]);

  const warmup = useMemo(() => {
    if (!pos || !rows) return [];
    return warmupItems(UNITS, rows, pos, Math.random, Date.now());
    // Sorteia de novo só quando pedir outra rodada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lesson.id, rows === undefined, warmKey]);

  if (!pos) return { status: 'missing' as const };
  if (!rows || !runs) return { status: 'loading' as const };

  const { unit, lesson, lessonIndex } = pos;
  const unlocked = unitUnlocked(UNITS, pos.unitIndex, rows, runs);
  const state = lessonState(unit, lessonIndex, rows, unlocked);
  const locked = state === 'bloqueada';
  const isDone = (id: string) => !!row?.done?.includes(id);
  const nextLesson = unit.lessons[lessonIndex + 1];
  const mastering = canMaster(row, Date.now());

  const finishWarmup = (results: { ok: boolean }[]) => {
    // Conta acerto e erro na lição de origem de cada item (revisão espaçada).
    const bySource = new Map<string, { ok: boolean }[]>();
    warmup.forEach((w, i) => bySource.set(w.key, [...(bySource.get(w.key) ?? []), results[i] ?? { ok: false }]));
    void db.transaction('rw', db.lessons, async () => {
      for (const [k, rs] of bySource) {
        const r = await db.lessons.get(k);
        if (r) await db.lessons.put(afterReview(r, rs, Date.now()));
      }
    });
    done('aquecimento');
  };

  /** Devolve true quando esta passada concluiu a lição pela primeira vez. */
  const finishCheckpoint = (score: number, passed: boolean): boolean => {
    const before = row;
    void save((r) => afterCheckpoint(r, key, score, Date.now()));
    const first = passed && !before?.passedAt;
    if (first) setCheckpointMsg('Lição concluída. Ela volta no aquecimento das próximas lições para não esquecer.');
    else if (passed && mastering) setCheckpointMsg('Selo de domínio: você passou de novo depois de uma semana.');
    else if (passed) setCheckpointMsg('Passou de novo. O selo de domínio libera 7 dias depois da conclusão.');
    else setCheckpointMsg(null);
    return first;
  };

  return {
    status: 'ready' as const,
    pos, unit, lesson, lessonIndex, key, row, rows, runs, unlocked, state, locked, isDone, nextLesson, mastering,
    save, done, warmup, warmKey, rerollWarmup: () => setWarmKey((k) => k + 1), finishWarmup, finishCheckpoint, checkpointMsg,
  };
}
