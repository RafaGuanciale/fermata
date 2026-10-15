// Arcade: as notas caem até a linha e você toca quando elas chegam. Sem reprovação: só pontos, combo e estrelas.
// Puro e testado (arcade.test.ts); a tela desenha e cuida do relógio.

import { parseLine } from '../course/music';
import type { Midi } from '../music/notes';
import type { ArcadeSong } from './songs';

export interface ChartNote {
  midi: Midi;
  /** ms desde o começo da música. */
  t: number;
  dur: number;
  /** Mão: a melodia é a direita; o baixo do modo difícil, a esquerda. */
  hand: 'r' | 'l';
}

export type Difficulty = 'facil' | 'medio' | 'dificil';

export const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'facil', label: 'Fácil', hint: 'Só as notas que caem no tempo, com folga para errar.' },
  { id: 'medio', label: 'Médio', hint: 'A melodia inteira.' },
  { id: 'dificil', label: 'Difícil', hint: 'Melodia e baixo, com as duas mãos, e menos folga.' },
];

/** Uma fase do arcade: música do app ou MIDI importado. O gráfico vem no andamento original, em ms. */
export interface ArcadeTune {
  id: string;
  title: string;
  origin: string;
  /** Andamento do clique; null quando o MIDI muda de andamento (aí o relógio é o do aparelho, sem clique). */
  bpm: number | null;
  beatsPerBar: number;
  /** Se o difícil tem uma segunda mão (senão, é a melodia com menos folga). */
  hasBass: boolean;
  chart: (d: Difficulty) => ChartNote[];
}

interface BeatNote { midi: Midi; beat: number; beats: number }

function beatNotes(line: string, beatsPerBar: number): BeatNote[] {
  const bars = line.includes('|') ? beatsPerBar : undefined;
  return parseLine(line, bars).filter((n) => n.midis.length).map((n) => ({ midi: n.midis[0], beat: n.beat, beats: n.beats }));
}

/**
 * Fácil: fica no máximo uma nota por tempo. Entram as notas que caem no tempo ou que duram um tempo inteiro;
 * se duas ficam perto demais, fica a mais longa.
 */
export function easyPick<T extends { beat: number; beats: number }>(notes: T[], minGap = 0.75): T[] {
  const out: T[] = [];
  for (const n of notes) {
    const onBeat = Math.abs(n.beat - Math.round(n.beat)) < 1e-6;
    if (!onBeat && n.beats < 1 - 1e-6) continue;
    const prev = out[out.length - 1];
    if (prev && n.beat - prev.beat < minGap - 1e-6) {
      if (n.beats > prev.beats) out[out.length - 1] = n;
      continue;
    }
    out.push(n);
  }
  return out;
}

/** Junta as mãos em ordem de tempo e tira a nota repetida (mesma tecla no mesmo instante). */
export function mergeHands(a: ChartNote[], b: ChartNote[]): ChartNote[] {
  const all = [...a, ...b].sort((x, y) => x.t - y.t || y.midi - x.midi);
  const seen = new Set<string>();
  return all.filter((n) => {
    const k = `${n.midi}@${Math.round(n.t)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Gráfico de uma música do app na dificuldade pedida, no andamento original. */
export function songChart(song: ArcadeSong, d: Difficulty = 'medio'): ChartNote[] {
  const beatMs = 60000 / song.bpm;
  const toChart = (ns: BeatNote[], hand: 'r' | 'l'): ChartNote[] => ns.map((n) => ({ midi: n.midi, t: n.beat * beatMs, dur: n.beats * beatMs, hand }));
  const melody = beatNotes(song.melody, song.beatsPerBar);
  if (d === 'facil') return toChart(easyPick(melody), 'r');
  if (d === 'medio') return toChart(melody, 'r');
  return mergeHands(toChart(melody, 'r'), toChart(beatNotes(song.bass, song.beatsPerBar), 'l'));
}

export function songTune(song: ArcadeSong): ArcadeTune {
  return { id: song.id, title: song.title, origin: song.origin, bpm: song.bpm, beatsPerBar: song.beatsPerBar, hasBass: true, chart: (d) => songChart(song, d) };
}

/** O gráfico com o andamento multiplicado por `speed` (0,75 = mais devagar). */
export function scaleChart(chart: ChartNote[], speed: number): ChartNote[] {
  return speed === 1 ? chart : chart.map((n) => ({ ...n, t: n.t / speed, dur: n.dur / speed }));
}

/** Atalho usado nos testes: a música do app, médio, no andamento pedido. */
export function buildChart(song: ArcadeSong, speed = 1, d: Difficulty = 'medio'): ChartNote[] {
  return scaleChart(songChart(song, d), speed);
}

export function chartRange(chart: ChartNote[]): [Midi, Midi] {
  if (!chart.length) return [60, 72];
  const lo = Math.min(...chart.map((n) => n.midi));
  const hi = Math.max(...chart.map((n) => n.midi));
  const low = lo - (((lo % 12) + 12) % 12);
  let high = hi + ((12 - (hi % 12)) % 12);
  if (high - low < 12) high = low + 12;
  return [low, high];
}

export type ArcadeGrade = 'perfeito' | 'bom' | 'ok' | 'perdeu';

export interface Windows { perfeito: number; bom: number; ok: number }

/** Janelas largas de propósito: é brincadeira. O fácil dá mais folga; o difícil, menos. */
export const WINDOWS: Windows = { perfeito: 70, bom: 140, ok: 220 };
export const WINDOWS_BY: Record<Difficulty, Windows> = {
  facil: { perfeito: 90, bom: 170, ok: 260 },
  medio: WINDOWS,
  dificil: { perfeito: 55, bom: 110, ok: 180 },
};
export const POINTS: Record<ArcadeGrade, number> = { perfeito: 100, bom: 70, ok: 40, perdeu: 0 };

export function gradeOf(deltaMs: number, w: Windows = WINDOWS): ArcadeGrade {
  const a = Math.abs(deltaMs);
  return a <= w.perfeito ? 'perfeito' : a <= w.bom ? 'bom' : a <= w.ok ? 'ok' : 'perdeu';
}

/** Multiplicador pelo combo, como no Guitar Hero: sobe um a cada 10 seguidas, até ×4. */
export function multiplier(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 10));
}

/** Quanto falta para o próximo multiplicador (0 a 1); no ×4 fica cheio. */
export function multiplierFill(combo: number): number {
  return combo >= 30 ? 1 : (combo % 10) / 10;
}

/** Nota longa: a partir desta duração (ms, no andamento jogado) ela pede para segurar. */
export const HOLD_MIN_MS = 450;
/** Pontos por segundo segurando (vezes o multiplicador). */
export const HOLD_RATE = 120;
/** Soltar até este tanto antes do fim ainda conta como segurar até o fim. */
export const HOLD_GRACE = 160;

export const isHold = (n: ChartNote) => n.dur >= HOLD_MIN_MS;

export type HoldState = 'segurando' | 'inteira' | 'soltou';

export interface ArcadeState {
  /** Resultado de cada nota (null = ainda não passou). */
  results: (ArcadeGrade | null)[];
  /** Notas longas acertadas: segurando agora, seguradas até o fim, ou soltas antes. */
  holds: (HoldState | null)[];
  /** Até onde os pontos de segurar já foram contados (ms), para as que estão sendo seguradas. */
  holdFrom: (number | null)[];
  score: number;
  combo: number;
  maxCombo: number;
}

export const startState = (chart: ChartNote[]): ArcadeState => ({ results: chart.map(() => null), holds: chart.map(() => null), holdFrom: chart.map(() => null), score: 0, combo: 0, maxCombo: 0 });

/**
 * Tecla tocada no instante `t`: acerta a nota ainda livre da mesma tecla mais perto dentro da janela.
 * Tecla sem nota por perto não tira pontos, só quebra o combo (nada de castigo).
 */
export function hit(chart: ChartNote[], s: ArcadeState, midi: Midi, t: number, w: Windows = WINDOWS): { state: ArcadeState; index: number | null; grade: ArcadeGrade | null } {
  let best = -1;
  let dist = Infinity;
  chart.forEach((n, i) => {
    if (s.results[i] !== null || n.midi !== midi) return;
    const d = Math.abs(t - n.t);
    if (d <= w.ok && d < dist) {
      best = i;
      dist = d;
    }
  });
  if (best < 0) return { state: { ...s, combo: 0 }, index: null, grade: null };
  const grade = gradeOf(t - chart[best].t, w);
  const combo = s.combo + 1;
  const results = s.results.slice();
  results[best] = grade;
  let { holds, holdFrom } = s;
  if (isHold(chart[best])) {
    holds = holds.slice();
    holdFrom = holdFrom.slice();
    holds[best] = 'segurando';
    holdFrom[best] = Math.max(t, chart[best].t);
  }
  return {
    state: { ...s, results, holds, holdFrom, score: s.score + POINTS[grade] * multiplier(combo), combo, maxCombo: Math.max(s.maxCombo, combo) },
    index: best,
    grade,
  };
}

/** Pontos de segurar até `t`; a nota que chegou ao fim vira "inteira". */
export function sustain(chart: ChartNote[], s: ArcadeState, t: number): ArcadeState {
  if (!s.holds.includes('segurando')) return s;
  const out: ArcadeState = { ...s, holds: s.holds.slice(), holdFrom: s.holdFrom.slice() };
  for (let i = 0; i < chart.length; i++) {
    if (out.holds[i] !== 'segurando') continue;
    const end = chart[i].t + chart[i].dur;
    const from = out.holdFrom[i] ?? chart[i].t;
    const upto = Math.min(t, end);
    if (upto > from) out.score += ((upto - from) / 1000) * HOLD_RATE * multiplier(out.combo);
    out.holdFrom[i] = Math.max(from, upto);
    if (t >= end) {
      out.holds[i] = 'inteira';
      out.holdFrom[i] = null;
    }
  }
  return out;
}

/** Soltou a tecla: conta os pontos até agora e fecha as notas longas dela (antes do fim = "soltou"). */
export function release(chart: ChartNote[], s: ArcadeState, midi: Midi, t: number): ArcadeState {
  const idx = s.holds.map((h, i) => (h === 'segurando' && chart[i].midi === midi ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return s;
  const out = sustain(chart, s, t);
  const next: ArcadeState = { ...out, holds: out.holds.slice(), holdFrom: out.holdFrom.slice() };
  for (const i of idx) {
    if (next.holds[i] !== 'segurando') continue;
    next.holds[i] = t >= chart[i].t + chart[i].dur - HOLD_GRACE ? 'inteira' : 'soltou';
    next.holdFrom[i] = null;
  }
  return next;
}

/** Notas que passaram da janela sem ser tocadas viram "perdeu" (e quebram o combo). */
export function expire(chart: ChartNote[], s: ArcadeState, t: number, w: Windows = WINDOWS): ArcadeState {
  let changed = false;
  const results = s.results.slice();
  chart.forEach((n, i) => {
    if (results[i] === null && t - n.t > w.ok) {
      results[i] = 'perdeu';
      changed = true;
    }
  });
  return changed ? { ...s, results, combo: 0 } : s;
}

/** Modo "sem pressa": a música para na primeira nota que chegou à linha e ainda não foi tocada. */
export function waitingAt(chart: ChartNote[], s: ArcadeState, t: number): number | null {
  for (let i = 0; i < chart.length; i++) {
    if (s.results[i] !== null) continue;
    return chart[i].t <= t ? chart[i].t : null;
  }
  return null;
}

export interface ArcadeSummary {
  score: number;
  maxCombo: number;
  /** Fração das notas acertadas (perfeito, bom ou ok). */
  hits: number;
  perfect: number;
  /** Das notas longas acertadas, quantas foram seguradas até o fim (null se não tinha nenhuma). */
  held: number | null;
  stars: 0 | 1 | 2 | 3;
  title: string;
}

export function summarize(s: ArcadeState): ArcadeSummary {
  const total = s.results.length || 1;
  const hits = s.results.filter((r) => r && r !== 'perdeu').length / total;
  const perfect = s.results.filter((r) => r === 'perfeito').length / total;
  const stars = hits >= 0.95 && perfect >= 0.6 ? 3 : hits >= 0.85 ? 2 : hits >= 0.6 ? 1 : 0;
  const title = stars === 3 ? 'Show completo' : stars === 2 ? 'Mandou bem' : stars === 1 ? 'Boa' : 'Bora de novo';
  const holds = s.holds.filter((h) => h !== null);
  const held = holds.length ? holds.filter((h) => h !== 'soltou').length / holds.length : null;
  return { score: Math.round(s.score), maxCombo: s.maxCombo, hits, perfect, held, stars, title };
}

/** Rótulo do efeito de combo (aparece ao cruzar cada marca). */
export function comboMilestone(prev: number, next: number): string | null {
  for (const m of [200, 100, 50]) if (prev < m && next >= m) return `${m} seguidas`;
  for (const m of [30, 20, 10]) if (prev < m && next >= m) return `Multiplicador ×${m / 10 + 1}`;
  return null;
}
