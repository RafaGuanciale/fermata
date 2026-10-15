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
}

/** Notas da música no tempo, com o andamento multiplicado por `speed` (0,75 = mais devagar). */
export function buildChart(song: ArcadeSong, speed = 1): ChartNote[] {
  const beatMs = 60000 / (song.bpm * speed);
  const bars = song.melody.includes('|') ? song.beatsPerBar : undefined;
  return parseLine(song.melody, bars)
    .filter((n) => n.midis.length)
    .map((n) => ({ midi: n.midis[0], t: n.beat * beatMs, dur: n.beats * beatMs }));
}

export function chartRange(chart: ChartNote[]): [Midi, Midi] {
  const lo = Math.min(...chart.map((n) => n.midi));
  const hi = Math.max(...chart.map((n) => n.midi));
  const low = lo - (((lo % 12) + 12) % 12);
  let high = hi + ((12 - (hi % 12)) % 12);
  if (high - low < 12) high = low + 12;
  return [low, high];
}

export type ArcadeGrade = 'perfeito' | 'bom' | 'ok' | 'perdeu';

/** Janelas largas de propósito: é brincadeira. */
export const WINDOWS = { perfeito: 70, bom: 140, ok: 220 };
export const POINTS: Record<ArcadeGrade, number> = { perfeito: 100, bom: 70, ok: 40, perdeu: 0 };

export function gradeOf(deltaMs: number): ArcadeGrade {
  const a = Math.abs(deltaMs);
  return a <= WINDOWS.perfeito ? 'perfeito' : a <= WINDOWS.bom ? 'bom' : a <= WINDOWS.ok ? 'ok' : 'perdeu';
}

/** Multiplicador pelo combo: ×1, ×2 a partir de 10 seguidas, ×3 a partir de 25, ×4 a partir de 50. */
export function multiplier(combo: number): number {
  return combo >= 50 ? 4 : combo >= 25 ? 3 : combo >= 10 ? 2 : 1;
}

export interface ArcadeState {
  /** Resultado de cada nota (null = ainda não passou). */
  results: (ArcadeGrade | null)[];
  score: number;
  combo: number;
  maxCombo: number;
}

export const startState = (chart: ChartNote[]): ArcadeState => ({ results: chart.map(() => null), score: 0, combo: 0, maxCombo: 0 });

/**
 * Tecla tocada no instante `t`: acerta a nota ainda livre da mesma tecla mais perto dentro da janela.
 * Tecla sem nota por perto não tira pontos, só quebra o combo (nada de castigo).
 */
export function hit(chart: ChartNote[], s: ArcadeState, midi: Midi, t: number): { state: ArcadeState; index: number | null; grade: ArcadeGrade | null } {
  let best = -1;
  let dist = Infinity;
  chart.forEach((n, i) => {
    if (s.results[i] !== null || n.midi !== midi) return;
    const d = Math.abs(t - n.t);
    if (d <= WINDOWS.ok && d < dist) {
      best = i;
      dist = d;
    }
  });
  if (best < 0) return { state: { ...s, combo: 0 }, index: null, grade: null };
  const grade = gradeOf(t - chart[best].t);
  const combo = s.combo + 1;
  const results = s.results.slice();
  results[best] = grade;
  return {
    state: { results, score: s.score + POINTS[grade] * multiplier(combo), combo, maxCombo: Math.max(s.maxCombo, combo) },
    index: best,
    grade,
  };
}

/** Notas que passaram da janela sem ser tocadas viram "perdeu" (e quebram o combo). */
export function expire(chart: ChartNote[], s: ArcadeState, t: number): ArcadeState {
  let changed = false;
  const results = s.results.slice();
  chart.forEach((n, i) => {
    if (results[i] === null && t - n.t > WINDOWS.ok) {
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
  stars: 0 | 1 | 2 | 3;
  title: string;
}

export function summarize(s: ArcadeState): ArcadeSummary {
  const total = s.results.length || 1;
  const hits = s.results.filter((r) => r && r !== 'perdeu').length / total;
  const perfect = s.results.filter((r) => r === 'perfeito').length / total;
  const stars = hits >= 0.95 && perfect >= 0.6 ? 3 : hits >= 0.85 ? 2 : hits >= 0.6 ? 1 : 0;
  const title = stars === 3 ? 'Show completo' : stars === 2 ? 'Mandou bem' : stars === 1 ? 'Boa' : 'Bora de novo';
  return { score: s.score, maxCombo: s.maxCombo, hits, perfect, stars, title };
}

/** Rótulo do efeito de combo (aparece ao cruzar cada marca). */
export function comboMilestone(prev: number, next: number): string | null {
  for (const m of [100, 50, 25, 10]) if (prev < m && next >= m) return `${m} seguidas`;
  return null;
}
