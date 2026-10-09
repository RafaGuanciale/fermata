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
