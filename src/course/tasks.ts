// Montadores de tarefas no tempo para as lições: melodia, ritmo em qualquer tecla, duas mãos.

import type { Clef, Midi } from '../music/notes';
import { parseLine, pick } from './music';
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
export function melodyTask(text: string, opts: { bpm: number; beatsPerBar?: number; clef?: Clef; caption?: string; low?: Midi; high?: Midi }): TimedTask {
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
export function twoHandTask(right: string, left: string, opts: { bpm: number; beatsPerBar?: number; caption?: string; low?: Midi; high?: Midi }): TimedTask {
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
  };
}
