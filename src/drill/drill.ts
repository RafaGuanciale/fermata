// Estado do treino como função pura: (estado, ação) → novo estado.
// A tela só desenha o estado; a fonte da nota (MIDI, clique ou teclado do computador) não importa aqui.

import type { Midi } from '../music/notes';

export interface NoteResult {
  expected: Midi;
  /** Notas erradas tocadas antes de acertar. */
  wrong: Midi[];
  /** Tempo do momento em que a nota ficou ativa até o acerto. */
  ms: number;
}

export type Feedback =
  | { kind: 'ready'; expected: Midi }
  | { kind: 'hit'; played: Midi; ms: number }
  | { kind: 'miss'; played: Midi; expected: Midi }
  | { kind: 'done' };

export interface DrillState {
  notes: Midi[];
  index: number;
  results: NoteResult[];
  /** Erros na nota atual, ainda não confirmada. */
  pendingWrong: Midi[];
  noteStartedAt: number;
  startedAt: number;
  feedback: Feedback;
  /** Última tecla tocada e se acertou, para acender no teclado. */
  lastPress: { midi: Midi; correct: boolean } | null;
}

export type DrillAction =
  | { type: 'press'; midi: Midi; at: number }
  | { type: 'restart'; notes: Midi[]; at: number };

export function createDrill(notes: Midi[], at: number): DrillState {
  return {
    notes,
    index: 0,
    results: [],
    pendingWrong: [],
    noteStartedAt: at,
    startedAt: at,
    feedback: { kind: 'ready', expected: notes[0] },
    lastPress: null,
  };
}

export function isFinished(s: DrillState): boolean {
  return s.index >= s.notes.length;
}

export function drillReducer(s: DrillState, a: DrillAction): DrillState {
  if (a.type === 'restart') return createDrill(a.notes, a.at);
  if (isFinished(s)) return s;

  const expected = s.notes[s.index];
  if (a.midi !== expected) {
    return {
      ...s,
      pendingWrong: [...s.pendingWrong, a.midi],
      feedback: { kind: 'miss', played: a.midi, expected },
      lastPress: { midi: a.midi, correct: false },
    };
  }

  const ms = Math.max(0, a.at - s.noteStartedAt);
  const results = [...s.results, { expected, wrong: s.pendingWrong, ms }];
  const index = s.index + 1;
  return {
    ...s,
    index,
    results,
    pendingWrong: [],
    noteStartedAt: a.at,
    feedback: index >= s.notes.length ? { kind: 'done' } : { kind: 'hit', played: a.midi, ms },
    lastPress: { midi: a.midi, correct: true },
  };
}

export interface DrillSummary {
  done: number;
  total: number;
  firstTry: number;
  misses: number;
  avgMs: number | null;
}

export function summarize(s: DrillState): DrillSummary {
  const firstTry = s.results.filter((r) => r.wrong.length === 0).length;
  const misses = s.results.reduce((n, r) => n + r.wrong.length, 0) + s.pendingWrong.length;
  const avgMs = s.results.length ? s.results.reduce((n, r) => n + r.ms, 0) / s.results.length : null;
  return { done: s.results.length, total: s.notes.length, firstTry, misses, avgMs };
}
