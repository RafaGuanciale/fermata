// Regras do curso: o que está liberado, o que conta como concluído e dominado,
// o projeto final de cada unidade e o aquecimento de revisão. Puro e testado (course.test.ts).

import type { LessonProgress, TrainingRun } from '../db/db';
import type { Hand } from '../score/practice';
import { shuffle } from './music';
import type { Item, Lesson, Rng, SongSpec, Unit } from './types';

const DAY = 24 * 60 * 60 * 1000;

/** Portão de domínio de toda lição: 85% sem dicas. */
export const MASTERY = 0.85;
/** O selo "Dominada" pede passar de novo o checkpoint depois de 7 dias. */
export const MASTERY_GAP_DAYS = 7;

export const lessonKey = (unit: Unit, lesson: Lesson) => `curso/${unit.id}/${lesson.id}`;

export type LessonState = 'bloqueada' | 'nova' | 'andamento' | 'concluida' | 'dominada';

export const LESSON_STATE_LABEL: Record<LessonState, string> = {
  bloqueada: 'Bloqueada',
  nova: 'Nova',
  andamento: 'Em andamento',
  concluida: 'Concluída',
  dominada: 'Dominada',
};

type Rows = Map<string, LessonProgress>;

export function rowsById(rows: LessonProgress[]): Rows {
  return new Map(rows.map((r) => [r.id, r]));
}

export const isPassed = (row: LessonProgress | undefined) => !!row?.passedAt;

/** Música do curso aprovada: música inteira, mãos certas, BPM alvo e acerto mínimo. */
export function songPassed(song: SongSpec, take: { bpm: number; accuracy: number; hand: Hand; from: number; to: number; bars: number }): boolean {
  const handsOk = song.hands === 'duas' ? take.hand === 'duas' : take.hand === song.hands || take.hand === 'duas';
  return handsOk && take.from === 1 && take.to >= take.bars && take.bpm >= song.bpm && take.accuracy >= song.pass.accuracy;
}

export function finalPassedAt(unit: Unit, runs: TrainingRun[]): number | null {
  const ok = runs.filter((r) => r.treinoId === `curso-${unit.final.songId}` && r.passed).map((r) => r.at);
  return ok.length ? Math.min(...ok) : null;
}

export function unitComplete(unit: Unit, rows: Rows, runs: TrainingRun[]): boolean {
  return unit.lessons.every((l) => isPassed(rows.get(lessonKey(unit, l)))) && finalPassedAt(unit, runs) !== null;
}

/** Unidade 1 sempre aberta; as outras abrem quando a anterior fecha (lições + projeto final). */
export function unitUnlocked(units: Unit[], index: number, rows: Rows, runs: TrainingRun[]): boolean {
  return index === 0 || unitComplete(units[index - 1], rows, runs);
}

/** Estado de uma lição dentro da unidade (que precisa estar liberada). */
export function lessonState(unit: Unit, index: number, rows: Rows, unlocked: boolean): LessonState {
  const lesson = unit.lessons[index];
  const row = rows.get(lessonKey(unit, lesson));
  if (row?.masteredAt) return 'dominada';
  if (row?.passedAt) return 'concluida';
  const prevOk = index === 0 || isPassed(rows.get(lessonKey(unit, unit.lessons[index - 1])));
  if (!unlocked || !prevOk) return 'bloqueada';
  return row?.done?.length || row?.checkpoint !== undefined ? 'andamento' : 'nova';
}

/** Depois de concluída, o checkpoint pode ser refeito para o selo de domínio a partir de 7 dias. */
export function canMaster(row: LessonProgress | undefined, now: number): boolean {
  return !!row?.passedAt && !row.masteredAt && now - row.passedAt >= MASTERY_GAP_DAYS * DAY;
}

/** Grava o resultado de um checkpoint: conclui (≥85%) ou dá o selo de domínio (≥85% depois de 7 dias). */
export function afterCheckpoint(row: LessonProgress | undefined, id: string, score: number, now: number): LessonProgress {
  const base: LessonProgress = row ?? { id, status: 'learning', updatedAt: now };
  const best = Math.max(base.checkpoint ?? 0, score);
  const next: LessonProgress = { ...base, checkpoint: best, updatedAt: now };
  if (score >= MASTERY) {
    if (!base.passedAt) {
      next.passedAt = now;
      next.status = 'learned';
    } else if (canMaster(base, now)) {
      next.masteredAt = now;
    }
  }
  return next;
}

export function markDone(row: LessonProgress | undefined, id: string, blockId: string, now: number): LessonProgress {
  const base: LessonProgress = row ?? { id, status: 'learning', updatedAt: now };
  const done = base.done ?? [];
  return done.includes(blockId) ? base : { ...base, done: [...done, blockId], updatedAt: now };
}

export interface Position {
  unit: Unit;
  unitIndex: number;
  lesson: Lesson;
  lessonIndex: number;
}

export function findLesson(units: Unit[], unitN: number, lessonId: string): Position | null {
  const unitIndex = units.findIndex((u) => u.n === unitN);
  if (unitIndex < 0) return null;
  const lessonIndex = units[unitIndex].lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex < 0) return null;
  return { unit: units[unitIndex], unitIndex, lesson: units[unitIndex].lessons[lessonIndex], lessonIndex };
}

/** A próxima lição a fazer: a primeira liberada e não concluída. Null quando o curso escrito acabou. */
export function nextLesson(units: Unit[], rows: Rows, runs: TrainingRun[]): Position | null {
  for (let ui = 0; ui < units.length; ui++) {
    if (!unitUnlocked(units, ui, rows, runs)) return null;
    const unit = units[ui];
    const li = unit.lessons.findIndex((l) => !isPassed(rows.get(lessonKey(unit, l))));
    if (li >= 0) return { unit, unitIndex: ui, lesson: unit.lessons[li], lessonIndex: li };
  }
  return null;
}

/**
 * Aquecimento de revisão: itens de lições anteriores já concluídas, misturados.
 * Lições com mais erros na revisão e mais tempo desde a conclusão pesam mais.
 * Nunca usa a lição do dia.
 */
export function warmupItems(units: Unit[], rows: Rows, current: Position, rng: Rng, now: number, count = 6): { item: Item; key: string }[] {
  const pool: { key: string; lesson: Lesson; weight: number }[] = [];
  for (let ui = 0; ui <= current.unitIndex; ui++) {
    const unit = units[ui];
    unit.lessons.forEach((l, li) => {
      if (ui === current.unitIndex && li >= current.lessonIndex) return;
      const row = rows.get(lessonKey(unit, l));
      if (!row?.passedAt || !l.review.length) return;
      const days = (now - row.passedAt) / DAY;
      const missRate = row.reviewSeen ? (row.reviewMiss ?? 0) / row.reviewSeen : 0;
      pool.push({ key: lessonKey(unit, l), lesson: l, weight: 1 + Math.min(days, 30) / 7 + 3 * missRate });
    });
  }
  if (!pool.length) return [];
  const total = pool.reduce((s, p) => s + p.weight, 0);
  const out: { item: Item; key: string }[] = [];
  for (let i = 0; i < count; i++) {
    let x = rng() * total;
    const p = pool.find((q) => (x -= q.weight) <= 0) ?? pool[pool.length - 1];
    const gen = p.lesson.review[Math.floor(rng() * p.lesson.review.length) % p.lesson.review.length];
    out.push({ item: gen(rng), key: p.key });
  }
  return shuffle(rng, out);
}

/** Conta acertos e erros da revisão em cada lição de origem. */
export function afterReview(row: LessonProgress, results: { ok: boolean }[], now: number): LessonProgress {
  return {
    ...row,
    reviewSeen: (row.reviewSeen ?? 0) + results.length,
    reviewMiss: (row.reviewMiss ?? 0) + results.filter((r) => !r.ok).length,
    updatedAt: now,
  };
}

export interface CourseSummary {
  lessonsTotal: number;
  lessonsPassed: number;
  lessonsMastered: number;
  unitsComplete: number;
}

export function courseSummary(units: Unit[], rows: Rows, runs: TrainingRun[]): CourseSummary {
  let lessonsTotal = 0;
  let lessonsPassed = 0;
  let lessonsMastered = 0;
  for (const u of units) {
    for (const l of u.lessons) {
      lessonsTotal++;
      const row = rows.get(lessonKey(u, l));
      if (row?.passedAt) lessonsPassed++;
      if (row?.masteredAt) lessonsMastered++;
    }
  }
  return { lessonsTotal, lessonsPassed, lessonsMastered, unitsComplete: units.filter((u) => unitComplete(u, rows, runs)).length };
}
