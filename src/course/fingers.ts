// Dedilhado sugerido na pauta dos exercícios com tempo: a clave diz a mão (Fá = esquerda). Puro e testado (course.test.ts).

import { fingerNotes, type Finger, type FingerNote } from '../music/fingering';
import type { TimedTask } from './types';

/**
 * Dedos de cada figura da pauta, na ordem de `display`: um por cabeça, do grave para o agudo.
 * null nas pausas e na figura que só continua uma ligadura (não se toca de novo).
 */
export function timedFingers(task: Pick<TimedTask, 'display' | 'clef' | 'bpm' | 'transpose'>): ((Finger | null)[] | null)[] {
  const beatMs = 60000 / task.bpm;
  const shift = task.transpose ?? 0;
  const notes: FingerNote[] = [];
  const owner: [number, number][] = [];
  let beat = 0;
  task.display.forEach((d, i) => {
    const start = beat;
    beat += d.beats;
    if (d.midi === null || (i > 0 && task.display[i - 1].tie)) return;
    let beats = d.beats;
    for (let j = i; task.display[j]?.tie && task.display[j + 1]; j++) beats += task.display[j + 1].beats;
    const heads = d.chord && d.chord.length > 1 ? [...d.chord].sort((a, b) => a - b) : [d.midi];
    heads.forEach((m, k) => {
      notes.push({ midi: m + shift, t: start * beatMs, dur: beats * beatMs });
      owner.push([i, k]);
    });
  });
  const fingers = fingerNotes(notes, task.clef === 'bass' ? 'l' : 'r');
  const out: ((Finger | null)[] | null)[] = task.display.map(() => null);
  owner.forEach(([i, k], n) => {
    const row = (out[i] ??= []);
    row[k] = fingers[n];
  });
  return out;
}

/**
 * Notas esperadas de uma passada com compasso, dedo sugerido e mão (para o registro da passada).
 * A mão vem do evento (tarefas de duas mãos) ou da clave.
 */
export function timedExpected(task: Pick<TimedTask, 'events' | 'clef' | 'beatsPerBar'>, bpm: number): { midi: number | null; t: number; measure: number; finger: Finger | null; hand: 'r' | 'l' }[] {
  const beatMs = 60000 / bpm;
  const handOf = (e: TimedTask['events'][number]) => e.hand ?? (task.clef === 'bass' ? 'l' : 'r');
  const finger = new Map<number, Finger | null>();
  for (const hand of ['r', 'l'] as const) {
    const idx = task.events.flatMap((e, i) => (e.midi !== null && handOf(e) === hand ? [i] : []));
    const f = fingerNotes(idx.map((i) => ({ midi: task.events[i].midi!, t: task.events[i].beat * beatMs, dur: task.events[i].beats * beatMs })), hand);
    idx.forEach((i, k) => finger.set(i, f[k]));
  }
  return task.events.map((e, i) => ({ midi: e.midi, t: e.beat * beatMs, measure: Math.floor(e.beat / task.beatsPerBar + 1e-6) + 1, finger: finger.get(i) ?? null, hand: handOf(e) }));
}
