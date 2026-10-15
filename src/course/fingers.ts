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
