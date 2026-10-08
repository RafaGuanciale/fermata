// Estudar uma peça a partir do MusicXML: a sequência de "passos" (o que soa junto em cada momento),
// o modo espera, a repetição de compassos e o julgamento no tempo. Puro e testado (practice.test.ts).
// Quem lê o arquivo e desenha a partitura é o OpenSheetMusicDisplay (ScorePracticePage).

import type { Midi } from '../music/notes';
import type { ExpectedNote } from '../training/timing';

export type Hand = 'direita' | 'esquerda' | 'duas';

export interface StepNote {
  midi: Midi;
  /** 0 = pauta de cima (mão direita), 1 = pauta de baixo (mão esquerda) */
  staff: number;
  /** Continuação de ligadura: já está soando, não se toca de novo. */
  tied: boolean;
  /** Duração em tempos de semínima (para a cascata e o acompanhamento). */
  beats?: number;
}

export interface ScoreStep {
  /** Compasso, começando em 1 */
  measure: number;
  /** Em tempos de semínima desde o início */
  beat: number;
  notes: StepNote[];
}

export function handOfStaff(staff: number, staffCount: number): Hand {
  if (staffCount < 2) return 'direita';
  return staff === 0 ? 'direita' : 'esquerda';
}

/** Teclas que precisam ser apertadas neste passo, para a mão escolhida. */
export function expectedFor(step: ScoreStep, hand: Hand, staffCount: number): Midi[] {
  const out = new Set<Midi>();
  for (const n of step.notes) {
    if (n.tied) continue;
    if (hand !== 'duas' && handOfStaff(n.staff, staffCount) !== hand) continue;
    out.add(n.midi);
  }
  return [...out].sort((a, b) => a - b);
}

export interface Range {
  from: number;
  to: number;
}

export function measureCount(steps: ScoreStep[]): number {
  return steps.reduce((m, s) => Math.max(m, s.measure), 0);
}

/** Índices dos passos dentro do trecho, que pedem alguma tecla. */
export function playableSteps(steps: ScoreStep[], hand: Hand, staffCount: number, range: Range): number[] {
  const out: number[] = [];
  steps.forEach((s, i) => {
    if (s.measure >= range.from && s.measure <= range.to && expectedFor(s, hand, staffCount).length) out.push(i);
  });
  return out;
}

// ---------- modo espera ----------

export interface WaitState {
  /** Posição dentro de `order` (lista de índices de passos) */
  pos: number;
  order: number[];
  pressed: Midi[];
  wrong: Midi | null;
  /** Passos em que houve erro antes de acertar */
  missedSteps: number[];
  laps: number;
}

export function createWait(order: number[]): WaitState {
  return { pos: 0, order, pressed: [], wrong: null, missedSteps: [], laps: 0 };
}

/**
 * Uma tecla apertada. Acorde: precisa de todas as notas (em qualquer ordem) antes de andar.
 * No fim do trecho volta ao começo (repetição) e conta uma volta.
 */
export function waitPress(s: WaitState, midi: Midi, expected: Midi[]): WaitState {
  if (!s.order.length) return s;
  if (!expected.includes(midi)) {
    const step = s.order[s.pos];
    return { ...s, wrong: midi, missedSteps: s.missedSteps.includes(step) ? s.missedSteps : [...s.missedSteps, step] };
  }
  const pressed = s.pressed.includes(midi) ? s.pressed : [...s.pressed, midi];
  if (!expected.every((m) => pressed.includes(m))) return { ...s, pressed, wrong: null };
  const next = s.pos + 1;
  if (next >= s.order.length) return { ...s, pos: 0, pressed: [], wrong: null, laps: s.laps + 1 };
  return { ...s, pos: next, pressed: [], wrong: null };
}

// ---------- no tempo ----------

export interface TimedPlan {
  expected: (ExpectedNote & { step: number; measure: number })[];
  /** Momento (ms) de cada passo do trecho, na ordem */
  stepTimes: { step: number; t: number }[];
  lengthMs: number;
  /** Tempos de semínima do trecho */
  beats: number;
}

/** Converte o trecho em notas esperadas com tempo, a partir do BPM (semínima). */
export function timedPlan(steps: ScoreStep[], hand: Hand, staffCount: number, range: Range, bpm: number): TimedPlan {
  const beatMs = 60000 / bpm;
  const inRange = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.measure >= range.from && s.measure <= range.to);
  if (!inRange.length) return { expected: [], stepTimes: [], lengthMs: 0, beats: 0 };
  const start = inRange[0].s.beat;
  const expected: TimedPlan['expected'] = [];
  const stepTimes: TimedPlan['stepTimes'] = [];
  for (const { s, i } of inRange) {
    const t = (s.beat - start) * beatMs;
    stepTimes.push({ step: i, t });
    for (const midi of expectedFor(s, hand, staffCount)) expected.push({ midi, t, step: i, measure: s.measure });
  }
  // O trecho termina no começo do primeiro passo depois dele (ou um tempo depois do último).
  const after = steps.find((s) => s.measure > range.to);
  const endBeat = after ? after.beat : inRange[inRange.length - 1].s.beat + 1;
  const beats = endBeat - start;
  return { expected, stepTimes, lengthMs: beats * beatMs, beats };
}

/** Acerto por compasso, para sugerir o que repetir. */
export function measureAccuracy(plan: TimedPlan, grades: (string | null | undefined)[]): { measure: number; accuracy: number }[] {
  const by = new Map<number, { sum: number; n: number }>();
  plan.expected.forEach((e, i) => {
    const g = grades[i];
    const w = g === 'perfect' || g === 'good' ? 1 : g === 'off' ? 0.5 : 0;
    const cur = by.get(e.measure) ?? { sum: 0, n: 0 };
    by.set(e.measure, { sum: cur.sum + w, n: cur.n + 1 });
  });
  return [...by.entries()].map(([measure, v]) => ({ measure, accuracy: v.n ? v.sum / v.n : 1 })).sort((a, b) => a.measure - b.measure);
}

/** Os compassos mais fracos, juntos num trecho contínuo para repetir. */
export function weakestRange(acc: { measure: number; accuracy: number }[], threshold = 0.85): Range | null {
  const weak = acc.filter((a) => a.accuracy < threshold).map((a) => a.measure);
  if (!weak.length) return null;
  return { from: Math.min(...weak), to: Math.max(...weak) };
}

// ---------- cascata e acompanhamento ----------

export interface PlayNote {
  midi: Midi;
  /** ms desde o primeiro tempo do trecho */
  t: number;
  dur: number;
  hand: Hand;
  step: number;
}

/** Todas as notas do trecho com momento e duração, das duas mãos. Ligaduras somam na nota que começa. */
export function playNotes(steps: ScoreStep[], staffCount: number, range: Range, bpm: number): PlayNote[] {
  const beatMs = 60000 / bpm;
  const first = steps.find((s) => s.measure >= range.from && s.measure <= range.to);
  if (!first) return [];
  const out: PlayNote[] = [];
  steps.forEach((s, i) => {
    if (s.measure < range.from || s.measure > range.to) return;
    for (const n of s.notes) {
      if (n.tied) continue;
      out.push({ midi: n.midi, t: (s.beat - first.beat) * beatMs, dur: (n.beats ?? 1) * beatMs, hand: handOfStaff(n.staff, staffCount), step: i });
    }
  });
  return out;
}
