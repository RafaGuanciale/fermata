// Guarda cada passada analisada (tabela takes, sincroniza com a conta).

import { db, type TakeLog } from '../db/db';
import { dayKey } from '../training/progress';
import { analyzeStudyLap, analyzeTake, packErrors, type LogExpected, type LogPlayed, type StudyStep } from './takeLog';
import type { NoteJudgement } from '../training/timing';

export interface TakeInput {
  kind: TakeLog['kind'];
  sourceId: string;
  title: string;
  bpm: number;
  target?: number;
  hand?: string;
  from?: number;
  to?: number;
  accuracy: number;
  expected: LogExpected[];
  played: LogPlayed[];
  judged: (NoteJudgement | null)[];
  reachMs: number;
}

export async function logTake(input: TakeInput): Promise<void> {
  try {
    const a = analyzeTake(input.expected, input.played, input.judged, input.reachMs);
    if (!a.total) return;
    const at = Date.now();
    const n = (await db.takes.where('sourceId').equals(input.sourceId).count()) + 1;
    await db.takes.put({
      id: `take-${crypto.randomUUID().slice(0, 12)}`,
      at,
      day: dayKey(at),
      kind: input.kind,
      sourceId: input.sourceId,
      title: input.title,
      n,
      bpm: input.bpm,
      target: input.target,
      hand: input.hand,
      from: input.from,
      to: input.to,
      accuracy: Math.round(input.accuracy * 1000) / 1000,
      total: a.total,
      errors: packErrors(a.errors),
      fingers: a.fingerTotals,
      extras: a.extras,
      meanDelta: a.meanDelta,
      drift: a.drift,
    });
  } catch (err) {
    console.error('[Fermata] Não foi possível registrar a passada', err);
  }
}

/** Uma volta (ou parte dela, se você saiu antes) no modo Estudar. */
export async function logStudyLap(input: { sourceId: string; title: string; hand?: string; from?: number; to?: number; steps: StudyStep[]; complete: boolean }): Promise<void> {
  try {
    const a = analyzeStudyLap(input.steps);
    if (!a.total) return;
    const at = Date.now();
    const n = (await db.takes.where('sourceId').equals(input.sourceId).count()) + 1;
    await db.takes.put({
      id: `take-${crypto.randomUUID().slice(0, 12)}`,
      at,
      day: dayKey(at),
      kind: 'musica',
      mode: 'estudo',
      complete: input.complete,
      sourceId: input.sourceId,
      title: input.title,
      n,
      bpm: 0,
      hand: input.hand,
      from: input.from,
      to: input.to,
      accuracy: Math.round(a.accuracy * 1000) / 1000,
      total: a.total,
      errors: packErrors(a.errors),
      fingers: a.fingerTotals,
      extras: 0,
      meanDelta: null,
      drift: null,
      stepMs: a.stepMs,
    });
  } catch (err) {
    console.error('[Fermata] Não foi possível registrar a volta no modo Estudar', err);
  }
}
