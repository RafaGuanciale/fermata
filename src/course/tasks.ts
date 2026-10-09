// Montadores de tarefas no tempo para as lições: melodia, ritmo em qualquer tecla, duas mãos.

import type { Clef, Midi } from '../music/notes';
import { parseLine, pick } from './music';

const SCI = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** 66 → "F#4" (a grafia vale só para o texto; a pauta escolhe sustenido ou bemol pela armadura). */
export const sci = (m: Midi) => `${SCI[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
import type { Rng, TimedTask } from './types';

function rangeOf(midis: Midi[], fallback: [Midi, Midi]): [Midi, Midi] {
  if (!midis.length) return fallback;
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const low = lo - (lo % 12);
  let high = hi + ((12 - (hi % 12)) % 12);
  if (high - low < 12) high = low + 12;
  if (high === hi) high = Math.min(108, high + 0);
  return [low, high];
}

/** Melodia de uma voz em texto ("C4 D4 E4:2 | …"): a pauta e o que tocar são a mesma linha. */
export function melodyTask(text: string, opts: { bpm: number; beatsPerBar?: number; clef?: Clef; caption?: string; low?: Midi; high?: Midi; fifths?: number }): TimedTask {
  const bpb = opts.beatsPerBar ?? 4;
  const notes = parseLine(text, text.includes('|') ? bpb : undefined);
  const midis = notes.flatMap((x) => x.midis);
  const [low, high] = rangeOf(midis, [60, 72]);
  return {
    display: notes.map((x) => ({ midi: x.midis[0] ?? null, beats: x.beats })),
    clef: opts.clef ?? (midis.length && Math.max(...midis) < 60 ? 'bass' : 'treble'),
    events: notes.flatMap((x) => x.midis.map((m) => ({ midi: m, beat: x.beat, beats: x.beats }))),
    beatsPerBar: bpb,
    bpm: opts.bpm,
    low: opts.low ?? low,
    high: opts.high ?? high,
    caption: opts.caption,
    fifths: opts.fifths,
  };
}

/** Ritmo em qualquer tecla: figuras desenhadas no Dó4, vale a tecla que for. */
export function rhythmTask(text: string, opts: { bpm: number; beatsPerBar?: number; caption?: string }): TimedTask {
  const bpb = opts.beatsPerBar ?? 4;
  const notes = parseLine(text.replace(/\bx\b/g, 'C4'), bpb);
  return {
    display: notes.map((x) => ({ midi: x.midis.length ? 60 : null, beats: x.beats })),
    clef: 'treble',
    events: notes.filter((x) => x.midis.length).map((x) => ({ midi: null, beat: x.beat, beats: x.beats })),
    beatsPerBar: bpb,
    bpm: opts.bpm,
    low: 55,
    high: 72,
    caption: opts.caption ?? 'Ritmo: toque qualquer tecla no tempo de cada figura e segure pela duração dela.',
  };
}

/** Ritmo sorteado: junta `bars` compassos da lista (cada um escrito com "x" para nota e "r" para pausa). */
export function randomRhythm(pool: string[], bars: number, bpm: number, caption?: string) {
  return (rng: Rng): TimedTask => rhythmTask(Array.from({ length: bars }, () => pick(rng, pool)).join(' | '), { bpm, caption });
}

/** Duas mãos: a pauta mostra a mão direita; os eventos incluem as duas. */
export function twoHandTask(right: string, left: string, opts: { bpm: number; beatsPerBar?: number; caption?: string; low?: Midi; high?: Midi; fifths?: number }): TimedTask {
  const bpb = opts.beatsPerBar ?? 4;
  const r = parseLine(right, bpb);
  const l = parseLine(left, bpb);
  const midis = [...r, ...l].flatMap((x) => x.midis);
  const [low, high] = rangeOf(midis, [48, 72]);
  return {
    display: r.map((x) => ({ midi: x.midis[0] ?? null, beats: x.beats })),
    clef: 'treble',
    events: [...r, ...l].flatMap((x) => x.midis.map((m) => ({ midi: m, beat: x.beat, beats: x.beats }))).sort((a, b) => a.beat - b.beat),
    beatsPerBar: bpb,
    bpm: opts.bpm,
    low: opts.low ?? low,
    high: opts.high ?? high,
    caption: opts.caption,
    fifths: opts.fifths,
  };
}

/**
 * Melodia com ligaduras de prolongamento: "~" no fim de uma nota liga ela à próxima (a mesma tecla).
 * A pauta mostra as duas figuras; o que se toca é uma nota só, com a duração somada.
 */
export function tiedMelodyTask(text: string, opts: { bpm: number; beatsPerBar?: number; clef?: Clef; caption?: string; fifths?: number }): TimedTask {
  const bpb = opts.beatsPerBar ?? 4;
  const tied = text.split('|').flatMap((b) => b.trim().split(/\s+/)).filter(Boolean).map((t) => t.endsWith('~'));
  const base = melodyTask(text.replace(/~/g, ''), { ...opts, beatsPerBar: bpb });
  const events: TimedTask['events'] = [];
  base.events.forEach((e, i) => {
    const prev = events[events.length - 1];
    if (i > 0 && tied[i - 1] && prev && prev.midi === e.midi) prev.beats += e.beats;
    else events.push({ ...e });
  });
  return { ...base, events };
}

/** Transposição: a pauta mostra a melodia escrita em `text`; o que conta é tocá-la `semitones` acima (ou abaixo). */
export function transposedTask(text: string, semitones: number, opts: { bpm: number; beatsPerBar?: number; clef?: Clef; caption?: string; fifths?: number }): TimedTask {
  const base = melodyTask(text, opts);
  const events = base.events.map((e) => ({ ...e, midi: e.midi === null ? null : e.midi + semitones }));
  const [low, high] = rangeOf(events.flatMap((e) => (e.midi === null ? [] : [e.midi])), [base.low, base.high]);
  return { ...base, events, low, high, transpose: semitones };
}

const READ_RHYTHMS = [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [2, 2], [1, 2, 1]];

/**
 * Leitura à primeira vista: melodia nova a cada vez, na posição de cinco dedos a partir de `tonic` (pentacorde maior),
 * andando por grau conjunto e saltos de 3ª, terminando na tônica com uma semibreve.
 */
export function sightReadingTask(rng: Rng, opts: { tonic: Midi; bars: number; bpm: number; fifths?: number; clef?: Clef; caption?: string }): TimedTask {
  const pos = [0, 2, 4, 5, 7].map((x) => opts.tonic + x);
  let i = pick(rng, [0, 2, 4]);
  const bars: string[] = [];
  for (let b = 0; b < opts.bars - 1; b++) {
    const notes: string[] = [];
    for (const beats of pick(rng, READ_RHYTHMS)) {
      notes.push(beats === 1 ? sci(pos[i]) : `${sci(pos[i])}:${beats}`);
      const moves = [-2, -1, -1, 1, 1, 2].filter((d) => i + d >= 0 && i + d < pos.length);
      i += pick(rng, moves);
    }
    bars.push(notes.join(' '));
  }
  bars.push(`${sci(pos[0])}:4`);
  return melodyTask(bars.join(' | '), { bpm: opts.bpm, fifths: opts.fifths, clef: opts.clef, caption: opts.caption ?? 'Primeira vista: olhe o trecho por alguns segundos e toque sem parar.' });
}

/**
 * Compasso composto (6/8): o texto vem em semínimas como na partitura (colcheia = 0.5, semínima pontuada = 1.5, compasso = 3),
 * e a tarefa conta em semínimas pontuadas: 2 tempos por compasso, `bpm` = semínimas pontuadas por minuto.
 */
export function compoundTask(text: string, opts: { bpm: number; clef?: Clef; caption?: string; fifths?: number; low?: Midi; high?: Midi }): TimedTask {
  const base = melodyTask(text, { ...opts, beatsPerBar: 3 });
  const k = 2 / 3;
  return {
    ...base,
    display: base.display.map((d) => ({ ...d, beats: d.beats * k })),
    events: base.events.map((e) => ({ ...e, beat: e.beat * k, beats: e.beats * k })),
    beatsPerBar: 2,
    compound: true,
  };
}

/** Ritmo em 6/8 sorteado (texto em semínimas, "x" nota e "r" pausa). */
export function compoundRhythm(pool: string[], bars: number, bpm: number, caption?: string) {
  return (rng: Rng): TimedTask => {
    const t = compoundTask(Array.from({ length: bars }, () => pick(rng, pool)).join(' | ').replace(/\bx\b/g, 'C4'), { bpm, caption: caption ?? 'Ritmo em 6/8: toque qualquer tecla no tempo de cada figura. Conte em 2: cada tempo é uma semínima pontuada.' });
    return { ...t, events: t.events.map((e) => ({ ...e, midi: null })), low: 55, high: 72 };
  };
}

/** Posição com swing: o contratempo (meio do tempo) vai para o último terço (2:1). */
export function swingBeat(beat: number): number {
  const frac = beat - Math.floor(beat);
  return Math.abs(frac - 0.5) < 1e-6 ? Math.floor(beat) + 2 / 3 : beat;
}

/** Melodia com colcheias swingadas: escrita reta, tocada longa-curta (2:1, como tercina de semínima + colcheia). */
export function swingTask(text: string, opts: { bpm: number; beatsPerBar?: number; clef?: Clef; caption?: string; fifths?: number }): TimedTask {
  const base = melodyTask(text, opts);
  const events = base.events.map((e) => {
    const at = swingBeat(e.beat);
    const frac = e.beat - Math.floor(e.beat);
    const beats = Math.abs(e.beats - 0.5) < 1e-6 ? (frac === 0 ? 2 / 3 : 1 / 3) : e.beats;
    return { ...e, beat: at, beats };
  });
  return { ...base, events, swing: true, caption: opts.caption ?? 'Swing: as colcheias estão escritas iguais, mas se tocam longa-curta, como "tá-a-ta".' };
}

/** Swing em duas mãos (pauta mostra a direita). */
export function swingTwoHands(right: string, left: string, opts: { bpm: number; beatsPerBar?: number; caption?: string; fifths?: number }): TimedTask {
  const base = twoHandTask(right, left, opts);
  return { ...base, events: base.events.map((e) => ({ ...e, beat: swingBeat(e.beat) })), swing: true };
}
