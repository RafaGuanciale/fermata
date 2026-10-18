// Registro de cada passada, nota a nota: o que você trocou por o quê, se entrou cedo ou tarde, em que compasso,
// qual dedo o dedilhado sugere para aquela nota e se a passada foi acelerando. Guarda só os erros e alguns totais,
// para ocupar pouco mesmo com centenas de passadas por semana. Puro e testado (takeLog.test.ts).
//
// O MIDI diz qual tecla foi tocada, não com qual dedo: "dedo" aqui é sempre o do dedilhado sugerido para a nota.

import type { Midi } from '../music/notes';
import type { NoteJudgement } from '../training/timing';

export interface LogExpected {
  midi: Midi | null;
  /** ms desde o primeiro tempo */
  t: number | null;
  measure?: number;
  /** dedo sugerido (1–5) e a mão */
  finger?: number | null;
  hand?: 'r' | 'l';
}

export interface LogPlayed {
  midi: Midi;
  t: number;
}

/** "hesitou": só no modo Estudar, demorou bem mais que o normal para achar a nota (delta = ms). */
export type Outcome = 'ok' | 'cedo' | 'tarde' | 'trocou' | 'faltou' | 'hesitou';
export const OUTCOMES: Outcome[] = ['ok', 'cedo', 'tarde', 'trocou', 'faltou', 'hesitou'];

export interface NoteError {
  measure: number;
  midi: Midi;
  finger: number;
  hand: 'r' | 'l';
  outcome: Exclude<Outcome, 'ok'>;
  /** ms (negativo = adiantado); 0 quando não tocou */
  delta: number;
  /** tecla tocada no lugar (só em "trocou") */
  played: Midi;
}

export interface TakeAnalysis {
  /** notas que contam */
  total: number;
  errors: NoteError[];
  /** notas esperadas por dedo: [direita 1..5, esquerda 1..5] */
  fingerTotals: number[];
  /** teclas tocadas sem nota correspondente (além das trocas) */
  extras: number;
  /** ms em média (negativo = adiantado), nas notas tocadas */
  meanDelta: number | null;
  /**
   * Quanto você foi adiantando ao longo da passada: diferença em ms entre o fim e o começo (reta pelos atrasos).
   * Negativo = acelerou (foi chegando antes do tempo); positivo = foi atrasando.
   */
  drift: number | null;
}

/** "Tocou fora do tempo" vira cedo ou tarde a partir desta distância (ms). */
const LATE_MS = 90;

const fingerIndex = (finger: number | null | undefined, hand: 'r' | 'l' | undefined) => (finger ? (hand === 'l' ? 5 : 0) + finger - 1 : -1);

/** Reta pelos pontos (x, y): inclinação. */
function slope(points: [number, number][]): number | null {
  if (points.length < 4) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of points) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  return den ? num / den : null;
}

/**
 * Junta o julgamento da passada (uma nota esperada → acerto e diferença de tempo) com o que foi tocado,
 * classificando cada erro. Uma nota que faltou com outra tecla tocada perto do tempo dela vira "trocou".
 */
export function analyzeTake(expected: LogExpected[], played: LogPlayed[], judged: (NoteJudgement | null)[], reachMs: number): TakeAnalysis {
  const errors: NoteError[] = [];
  const fingerTotals = Array<number>(10).fill(0);
  let total = 0;
  const matchedTimes: [number, number][] = [];
  // Teclas tocadas que não casaram com nenhuma nota esperada (candidatas a "trocou").
  const usedPlayed = new Set<number>();
  expected.forEach((e, i) => {
    const j = judged[i];
    if (e.midi === null || e.t === null || !j || j.delta === null) return;
    // a tecla certa mais perto do tempo dela foi a usada no julgamento
    let best = -1;
    let dist = Infinity;
    played.forEach((p, k) => {
      if (usedPlayed.has(k) || p.midi !== e.midi) return;
      const d = Math.abs(p.t - (e.t! + j.delta!));
      if (d < dist) {
        dist = d;
        best = k;
      }
    });
    if (best >= 0) usedPlayed.add(best);
  });

  expected.forEach((e, i) => {
    if (e.midi === null || e.t === null) return;
    const j = judged[i];
    if (!j) return;
    total++;
    const fi = fingerIndex(e.finger, e.hand);
    if (fi >= 0) fingerTotals[fi]++;
    const base = { measure: e.measure ?? 0, midi: e.midi, finger: e.finger ?? 0, hand: e.hand ?? 'r' };
    if (j.delta !== null) {
      matchedTimes.push([e.t, j.delta]);
      if (j.grade === 'perfect' || j.grade === 'good') return;
      if (Math.abs(j.delta) < LATE_MS && j.grade !== 'miss') return;
      errors.push({ ...base, outcome: j.delta < 0 ? 'cedo' : 'tarde', delta: Math.round(j.delta), played: 0 });
      return;
    }
    // Faltou: alguma tecla errada perto do tempo dela?
    let wrong = -1;
    let dist = reachMs;
    played.forEach((p, k) => {
      if (usedPlayed.has(k)) return;
      const d = Math.abs(p.t - e.t!);
      if (d <= dist) {
        dist = d;
        wrong = k;
      }
    });
    if (wrong >= 0) {
      usedPlayed.add(wrong);
      errors.push({ ...base, outcome: 'trocou', delta: Math.round(played[wrong].t - e.t), played: played[wrong].midi });
    } else errors.push({ ...base, outcome: 'faltou', delta: 0, played: 0 });
  });

  const deltas = matchedTimes.map((p) => p[1]);
  const s = slope(matchedTimes);
  const span = matchedTimes.length ? matchedTimes[matchedTimes.length - 1][0] - matchedTimes[0][0] : 0;
  return {
    total,
    errors,
    fingerTotals,
    extras: played.length - usedPlayed.size,
    meanDelta: deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null,
    drift: s === null ? null : Math.round(s * span),
  };
}

// ---------- modo Estudar (a partitura espera) ----------

export interface StudyStep {
  measure: number;
  /** notas que o ponto pede, com o dedo sugerido */
  expected: { midi: Midi; finger?: number | null; hand?: 'r' | 'l' }[];
  /** quanto levou para completar o ponto (ms); null no primeiro da volta */
  ms: number | null;
  /** teclas erradas tocadas antes de acertar */
  wrong: Midi[];
}

/** Demorou "bem mais que o normal": 2,5 vezes a mediana da volta e pelo menos 1,5 s. */
const HESITATE_MIN = 1500;

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};

/**
 * Uma volta no modo Estudar vira o mesmo registro das passadas: cada tecla errada é uma troca (contra a nota
 * esperada mais perto dela) e cada ponto em que você demorou demais é "hesitou". Acerto = pontos sem erro.
 */
export function analyzeStudyLap(steps: StudyStep[]): TakeAnalysis & { accuracy: number; stepMs: number | null } {
  const errors: NoteError[] = [];
  const fingerTotals = Array<number>(10).fill(0);
  let total = 0;
  const times = steps.map((s) => s.ms).filter((m): m is number => m !== null);
  const typical = median(times);
  const slow = typical === null ? Infinity : Math.max(HESITATE_MIN, typical * 2.5);
  let clean = 0;
  for (const st of steps) {
    if (!st.expected.length) continue;
    total += st.expected.length;
    for (const e of st.expected) {
      const fi = fingerIndex(e.finger, e.hand);
      if (fi >= 0) fingerTotals[fi]++;
    }
    if (!st.wrong.length) clean++;
    for (const w of st.wrong) {
      const near = st.expected.reduce((a, b) => (Math.abs(b.midi - w) < Math.abs(a.midi - w) ? b : a));
      errors.push({ measure: st.measure, midi: near.midi, finger: near.finger ?? 0, hand: near.hand ?? 'r', outcome: 'trocou', delta: 0, played: w });
    }
    if (st.ms !== null && st.ms >= slow) {
      const e = st.expected[0];
      errors.push({ measure: st.measure, midi: e.midi, finger: e.finger ?? 0, hand: e.hand ?? 'r', outcome: 'hesitou', delta: Math.round(st.ms), played: 0 });
    }
  }
  const counted = steps.filter((s) => s.expected.length).length;
  return { total, errors, fingerTotals, extras: 0, meanDelta: null, drift: null, accuracy: counted ? clean / counted : 0, stepMs: typical };
}

// ---------- guardar compacto ----------

const OUT_CODE: Record<NoteError['outcome'], number> = { cedo: 1, tarde: 2, trocou: 3, faltou: 4, hesitou: 5 };
const CODE_OUT: Record<number, NoteError['outcome']> = { 1: 'cedo', 2: 'tarde', 3: 'trocou', 4: 'faltou', 5: 'hesitou' };

/** Erros lado a lado: compasso, tecla, dedo (mão esquerda = 5 + dedo), tipo, ms, tecla tocada. */
export function packErrors(errors: NoteError[]): number[] {
  return errors.flatMap((e) => [e.measure, e.midi, e.hand === 'l' ? e.finger + 5 : e.finger, OUT_CODE[e.outcome], e.delta, e.played]);
}

export function unpackErrors(a: number[]): NoteError[] {
  const out: NoteError[] = [];
  for (let i = 0; i + 5 < a.length; i += 6) {
    const f = a[i + 2];
    out.push({ measure: a[i], midi: a[i + 1], finger: f > 5 ? f - 5 : f, hand: f > 5 ? 'l' : 'r', outcome: CODE_OUT[a[i + 3]] ?? 'faltou', delta: a[i + 4], played: a[i + 5] });
  }
  return out;
}
