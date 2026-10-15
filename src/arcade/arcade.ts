// Arcade: as notas caem até a linha e você toca quando elas chegam. Sem reprovação: só pontos, combo e estrelas.
// Puro e testado (arcade.test.ts); a tela desenha e cuida do relógio.

import { parseLine } from '../course/music';
import type { Midi } from '../music/notes';
import { fingerNotes, type Finger } from '../music/fingering';
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
  { id: 'facil', label: 'Fácil', hint: 'A melodia mais devagar, sem enfeites e com folga para errar.' },
  { id: 'medio', label: 'Médio', hint: 'A melodia inteira.' },
  { id: 'dificil', label: 'Difícil', hint: 'Melodia e baixo, com as duas mãos, e menos folga.' },
];

/** Uma fase do arcade: música do app ou MIDI importado. O gráfico vem no andamento original, em ms. */
export interface ArcadeTune {
  id: string;
  title: string;
  /** Compositor, banda ou intérprete. */
  artist: string;
  /** Andamento do clique; null quando o MIDI muda de andamento (aí o relógio é o do aparelho, sem clique). */
  bpm: number | null;
  beatsPerBar: number;
  /** Se o difícil tem uma segunda mão (senão, é a melodia com menos folga). */
  hasBass: boolean;
  chart: (d: Difficulty) => ChartNote[];
  /** O fácil toca mais devagar que o original (1 = mesmo andamento). */
  easySpeed: number;
  /** Andamento do clique no fácil, quando ele vem de outro arranjo (senão, o mesmo `bpm`). */
  easyBpm?: number | null;
  /** Dificuldades que fazem sentido nesta música (o fácil some quando simplificar a descaracteriza). */
  available: Difficulty[];
}

// ---------- fácil: a melodia reconhecível ----------
// Como nos jogos de ritmo, o fácil preserva o ritmo real e os tempos fortes: primeiro tira os enfeites e
// diminui o andamento; só tira notas se ainda ficar denso demais, e nunca mais de 30% delas. Se precisar
// tirar mais que isso, a música fica sem fácil (melhor não ter do que ter irreconhecível).

export const EASY = {
  /** Notas por segundo na parte mais cheia, depois de desacelerar. */
  target: 2.2,
  /** Teto depois de desacelerar; acima disso, tira notas. */
  max: 3.0,
  /** Mais devagar que isto a música perde o balanço. */
  floor: 0.5,
  windowMs: 3000,
  maxDrop: 0.3,
  /** Notas mais curtas que isto (ms), coladas na próxima, são enfeites (apojaturas, trinados). */
  grace: 70,
};

/** Notas por segundo na janela mais cheia. */
export function peakDensity(ns: { t: number }[], windowMs = EASY.windowMs): number {
  let best = 0;
  let a = 0;
  for (let b = 0; b < ns.length; b++) {
    while (ns[b].t - ns[a].t >= windowMs) a++;
    best = Math.max(best, b - a + 1);
  }
  return best / (windowMs / 1000);
}

export interface EasyPlan {
  notes: ChartNote[];
  speed: number;
  /** Fração de notas tiradas (fora os enfeites). */
  dropped: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function makeEasy(melody: ChartNote[]): EasyPlan | null {
  if (!melody.length) return null;
  const ns = melody.filter((n, i) => !(n.dur < EASY.grace && melody[i + 1] && melody[i + 1].t - n.t < EASY.grace * 1.5));
  const peak = peakDensity(ns);
  const speed = peak > 0 ? Math.max(EASY.floor, Math.min(1, EASY.target / peak)) : 1;
  // Limite de notas por janela, no andamento original.
  const limit = Math.floor((EASY.max / speed) * (EASY.windowMs / 1000));
  if (peak * (EASY.windowMs / 1000) <= limit) return { notes: ns, speed, dropped: 0 };

  // Importância de cada nota: longa, ponta do desenho (mais aguda ou mais grave que as vizinhas) e começo de frase.
  const ioi = median(ns.slice(1).map((n, i) => n.t - ns[i].t));
  const mdur = median(ns.map((n) => n.dur)) || 1;
  const imp = ns.map((n, i) => {
    const prev = ns[i - 1];
    const next = ns[i + 1];
    let v = Math.min(3, n.dur / mdur);
    if (prev && next && ((n.midi > prev.midi && n.midi > next.midi) || (n.midi < prev.midi && n.midi < next.midi))) v += 1;
    if (!prev || n.t - (prev.t + prev.dur) > ioi * 1.5) v += 5;
    if (!next) v += 5;
    return v;
  });
  const keep = ns.map(() => true);
  let removed = 0;
  for (let guard = 0; guard < ns.length; guard++) {
    // Janela mais cheia entre as notas que ficaram.
    const idx = ns.map((_, i) => i).filter((i) => keep[i]);
    let worst: [number, number] | null = null;
    let a = 0;
    for (let b = 0; b < idx.length; b++) {
      while (ns[idx[b]].t - ns[idx[a]].t >= EASY.windowMs) a++;
      if (b - a + 1 > limit && (!worst || b - a > worst[1] - worst[0])) worst = [a, b];
    }
    if (!worst) break;
    let pick = -1;
    for (let k = worst[0]; k <= worst[1]; k++) if (pick < 0 || imp[idx[k]] < imp[idx[pick]]) pick = k;
    keep[idx[pick]] = false;
    removed++;
  }
  const dropped = removed / ns.length;
  if (dropped > EASY.maxDrop) return null;
  return { notes: ns.filter((_, i) => keep[i]), speed, dropped };
}

// ---------- palcos: a dificuldade de cada música ----------

/** Dificuldade de uma música a partir do médio (melodia) e do difícil (com o baixo), no andamento original. */
export function difficultyScore(medium: ChartNote[], hard: ChartNote[]): number {
  if (medium.length < 2) return 0;
  const secs = Math.max(1, (medium[medium.length - 1].t - medium[0].t) / 1000);
  const avg = medium.length / secs;
  const peak = peakDensity(medium);
  const span = Math.max(...medium.map((n) => n.midi)) - Math.min(...medium.map((n) => n.midi));
  const leaps = medium.slice(1).reduce((s, n, i) => s + Math.abs(n.midi - medium[i].midi), 0) / (medium.length - 1);
  const bass = Math.max(0, hard.length - medium.length) / secs;
  return avg + peak * 0.6 + span * 0.05 + leaps * 0.25 + bass * 0.5;
}

export type StageId = 'descoberta' | 'alternativo' | 'principal';

/** Os palcos, como num festival: do menor (para começar) ao principal (as mais difíceis). */
export const STAGES: { id: StageId; name: string; lead: string; upTo: number }[] = [
  { id: 'descoberta', name: 'Palco Descoberta', lead: 'Melodias calmas, para soltar os dedos.', upTo: 4.5 },
  { id: 'alternativo', name: 'Palco Alternativo', lead: 'Os temas que todo mundo reconhece, com mais movimento.', upTo: 6.6 },
  { id: 'principal', name: 'Palco Principal', lead: 'As atrações mais pesadas: rápidas, com saltos e as duas mãos.', upTo: Infinity },
];

export const stageOf = (score: number): StageId => STAGES.find((s) => score <= s.upTo)!.id;

/** Intensidade de 1 a 5 (as barrinhas do cartão). */
export const intensityOf = (score: number) => Math.max(1, Math.min(5, Math.round((score - 1.5) / 1.3)));

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
  const melody = toChart(beatNotes(song.melody, song.beatsPerBar), 'r');
  if (d === 'facil') return makeEasy(melody)?.notes ?? melody;
  if (d === 'medio') return melody;
  return mergeHands(melody, toChart(beatNotes(song.bass, song.beatsPerBar), 'l'));
}

/** Monta a fase a partir dos três gráficos: decide o andamento do fácil e se ele existe. */
export function tuneFrom(base: Omit<ArcadeTune, 'chart' | 'easySpeed' | 'available'>, medium: ChartNote[], hard: ChartNote[], easy?: { notes: ChartNote[]; speed: number } | null): ArcadeTune {
  const plan = easy === undefined ? makeEasy(medium) : easy;
  const available: Difficulty[] = plan ? ['facil', 'medio', 'dificil'] : ['medio', 'dificil'];
  const charts: Record<Difficulty, ChartNote[]> = { facil: plan?.notes ?? medium, medio: medium, dificil: hard };
  return { ...base, easySpeed: plan?.speed ?? 1, available, chart: (d) => charts[d] };
}

export function songTune(song: ArcadeSong): ArcadeTune {
  return tuneFrom(
    { id: song.id, title: song.title, artist: song.artist, bpm: song.bpm, beatsPerBar: song.beatsPerBar, hasBass: true },
    songChart(song, 'medio'),
    songChart(song, 'dificil'),
  );
}

/** O gráfico com o andamento multiplicado por `speed` (0,75 = mais devagar). */
/** Dedo sugerido para cada nota do mapa (as duas mãos separadas), na mesma ordem. */
export function chartFingers(chart: ChartNote[]): (Finger | null)[] {
  const out: (Finger | null)[] = chart.map(() => null);
  for (const hand of ['r', 'l'] as const) {
    const idx = chart.flatMap((n, i) => (n.hand === hand ? [i] : []));
    if (!idx.length) continue;
    const f = fingerNotes(idx.map((i) => chart[i]), hand);
    idx.forEach((i, k) => (out[i] = f[k]));
  }
  return out;
}

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
