// Treino no tempo: onde cada nota deveria cair, como julgar o que foi tocado e a escada de BPM.
// Tudo puro e testado (timing.test.ts). Os números vêm da metodologia (doc "Metodologia de treino").

import type { Midi } from '../music/notes';

export interface TimedNote {
  /** null = pausa */
  midi: Midi | null;
  /** Duração em tempos (semínima = 1). */
  beats: number;
}

export type Grade = 'perfect' | 'good' | 'off' | 'miss';

export interface Windows {
  perfect: number;
  good: number;
  off: number;
}

/** Fases 1 a 3 são mais folgadas; depois o "bom" aperta. */
export function windowsFor(phase: number): Windows {
  return phase >= 4 ? { perfect: 40, good: 75, off: 150 } : { perfect: 40, good: 100, off: 150 };
}

export const GRADE_WEIGHT: Record<Grade, number> = { perfect: 1, good: 0.9, off: 0.5, miss: 0 };

/** Momento (ms desde o primeiro tempo) em que cada nota começa. Pausas entram como null. */
export function onsets(notes: TimedNote[], bpm: number): (number | null)[] {
  const beatMs = 60000 / bpm;
  let t = 0;
  return notes.map((n) => {
    const at = n.midi === null ? null : t * beatMs;
    t += n.beats;
    return at;
  });
}

export function totalBeats(notes: TimedNote[]): number {
  return notes.reduce((s, n) => s + n.beats, 0);
}

export interface PlayedEvent {
  midi: Midi;
  /** ms desde o primeiro tempo, já descontado o atraso do aparelho */
  t: number;
}

export interface NoteJudgement {
  grade: Grade;
  /** Diferença em ms: negativo = adiantado. null quando não tocou. */
  delta: number | null;
}

export interface TakeResult {
  notes: (NoteJudgement | null)[];
  /** Teclas tocadas que não correspondem a nenhuma nota. */
  extras: number;
  accuracy: number;
  /** Notas boas ou perfeitas, sobre as notas que contam. */
  goodShare: number;
  clean: boolean;
}

/** Uma nota esperada num momento (ms desde o primeiro tempo). Acordes = várias com o mesmo `t`. */
export interface ExpectedNote {
  midi: Midi | null;
  t: number | null;
}

/**
 * Julga uma passada. Cada nota esperada pega o evento da mesma tecla mais perto do seu tempo,
 * dentro de `reach` ms. Eventos sem par são extras.
 * `until`: até onde a passada já andou; notas cujo prazo não venceu ficam sem julgamento (null).
 */
export function judgeExpected(expected: ExpectedNote[], events: PlayedEvent[], w: Windows, reach: number, until = Infinity): TakeResult {
  const used = new Set<number>();
  const out: (NoteJudgement | null)[] = expected.map(() => null);

  expected.forEach(({ midi, t: at }, i) => {
    if (at === null || midi === null) return;
    let best = -1;
    let bestDist = Infinity;
    events.forEach((e, j) => {
      if (used.has(j) || e.midi !== midi) return;
      const d = Math.abs(e.t - at);
      if (d <= reach && d < bestDist) {
        best = j;
        bestDist = d;
      }
    });
    if (best >= 0) {
      used.add(best);
      const delta = events[best].t - at;
      const a = Math.abs(delta);
      out[i] = { grade: a <= w.perfect ? 'perfect' : a <= w.good ? 'good' : a <= w.off ? 'off' : 'miss', delta };
    } else if (at + reach < until) {
      out[i] = { grade: 'miss', delta: null };
    }
  });

  const judged = out.filter((j): j is NoteJudgement => j !== null);
  const counted = expected.filter((e) => e.t !== null && e.midi !== null).length;
  const sum = judged.reduce((s, j) => s + GRADE_WEIGHT[j.grade], 0);
  const goods = judged.filter((j) => j.grade === 'perfect' || j.grade === 'good').length;
  const extras = events.length - used.size;
  const accuracy = counted ? sum / counted : 0;
  const goodShare = counted ? goods / counted : 0;
  const allPlayed = judged.length === counted && judged.every((j) => j.delta !== null);
  const noneOutside = judged.every((j) => j.grade !== 'miss');
  return { notes: out, extras, accuracy, goodShare, clean: allPlayed && noneOutside && goodShare >= 0.9 };
}

/** Passada de uma melodia (uma nota por vez). */
export function judgeTake(notes: TimedNote[], bpm: number, events: PlayedEvent[], w: Windows, until = Infinity): TakeResult {
  const times = onsets(notes, bpm);
  const expected = notes.map((n, i) => ({ midi: n.midi, t: times[i] }));
  return judgeExpected(expected, events, w, Math.max(w.off, 60000 / bpm / 2), until);
}

// ---------- escada de BPM ----------

export interface Ladder {
  target: number;
  floor: number;
  step: number;
  bpm: number;
  cleanStreak: number;
  failStreak: number;
  drops: number;
  reps: number;
  /** Maior BPM com passada limpa nesta sessão. */
  best: number | null;
  /** Passadas limpas seguidas já no tempo-alvo. */
  atTarget: number;
}

export function ladderStep(target: number): number {
  return Math.max(4, Math.round(target * 0.05));
}

/** Começa em 60% do alvo, ou um degrau abaixo do melhor tempo limpo anterior. */
export function createLadder(target: number, lastClean: number | null = null): Ladder {
  const step = ladderStep(target);
  const floor = Math.max(40, Math.round(target * 0.6));
  const bpm = lastClean ? Math.min(target, Math.max(floor, lastClean - step)) : floor;
  return { target, floor, step, bpm, cleanStreak: 0, failStreak: 0, drops: 0, reps: 0, best: null, atTarget: 0 };
}

/** A cada 4 passadas, uma é um degrau mais devagar (variar o tempo ajuda a fixar). */
export function repBpm(l: Ladder): number {
  return l.reps % 4 === 3 && l.bpm > l.floor ? Math.max(l.floor, l.bpm - l.step) : l.bpm;
}

export function afterRep(l: Ladder, clean: boolean, playedBpm = l.bpm): Ladder {
  const reps = l.reps + 1;
  if (clean) {
    const best = Math.max(l.best ?? 0, playedBpm);
    // A passada mais lenta de variação não conta para subir.
    if (playedBpm < l.bpm) return { ...l, reps, best, failStreak: 0 };
    const cleanStreak = l.cleanStreak + 1;
    const atTarget = l.bpm >= l.target ? l.atTarget + 1 : 0;
    if (cleanStreak >= 3 && l.bpm < l.target) {
      return { ...l, reps, best, bpm: Math.min(l.target, l.bpm + l.step), cleanStreak: 0, failStreak: 0, drops: 0, atTarget: 0 };
    }
    return { ...l, reps, best, cleanStreak, failStreak: 0, drops: 0, atTarget };
  }
  const failStreak = l.failStreak + 1;
  if (failStreak >= 2) {
    return { ...l, reps, bpm: Math.max(l.floor, l.bpm - l.step), failStreak: 0, cleanStreak: 0, drops: l.drops + 1, atTarget: 0 };
  }
  return { ...l, reps, failStreak, cleanStreak: 0, atTarget: 0 };
}

/** Duas descidas seguidas: hora de isolar o trecho difícil. */
export function shouldIsolate(l: Ladder): boolean {
  return l.drops >= 2;
}

// ---------- atraso do aparelho ----------

/** Mediana das diferenças entre toque e tempo, ignorando toques a mais de 250 ms de qualquer tempo. */
export function latencyFromTaps(taps: number[], beats: number[]): number | null {
  const diffs: number[] = [];
  for (const t of taps) {
    let best = Infinity;
    for (const b of beats) if (Math.abs(t - b) < Math.abs(best)) best = t - b;
    if (Math.abs(best) <= 250) diffs.push(best);
  }
  if (diffs.length < 4) return null;
  diffs.sort((a, b) => a - b);
  const mid = Math.floor(diffs.length / 2);
  const median = diffs.length % 2 ? diffs[mid] : (diffs[mid - 1] + diffs[mid]) / 2;
  return Math.round(median);
}
