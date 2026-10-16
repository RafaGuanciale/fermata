// Acompanhamento para tocar junto: o app faz o baixo e os acordes de uma progressão em loop, e diz qual escala
// cabe para improvisar por cima. Puro e testado (backing.test.ts).

import type { Midi } from '../music/notes';

export interface BackingChord {
  symbol: string;
  /** fundamental (classe de altura 0–11) */
  root: number;
  /** intervalos acima da fundamental */
  ivs: number[];
}

const C = (symbol: string, root: number, ivs: number[]): BackingChord => ({ symbol, root, ivs });
const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];
const DOM7 = [0, 4, 7, 10];
const MIN7 = [0, 3, 7, 10];
const MAJ7 = [0, 4, 7, 11];

export interface BackingStyle {
  id: string;
  label: string;
  bars: BackingChord[];
  /** escala para improvisar: nome e notas (classes de altura) */
  scale: { name: string; pcs: number[]; /** nomes como se escreve nessa escala (Mi♭, não Ré♯) */ names: string };
}

export const BACKING_STYLES: BackingStyle[] = [
  {
    id: 'pop',
    label: 'Pop',
    bars: [C('C', 0, MAJ), C('G', 7, MAJ), C('Am', 9, MIN), C('F', 5, MAJ)],
    scale: { name: 'pentatônica de Dó', pcs: [0, 2, 4, 7, 9], names: 'Dó Ré Mi Sol Lá' },
  },
  {
    id: 'balada',
    label: 'Balada',
    bars: [C('Am', 9, MIN), C('F', 5, MAJ), C('C', 0, MAJ), C('G', 7, MAJ)],
    scale: { name: 'pentatônica de Lá menor', pcs: [9, 0, 2, 4, 7], names: 'Lá Dó Ré Mi Sol' },
  },
  {
    id: 'blues',
    label: 'Blues',
    bars: [C('C7', 0, DOM7), C('C7', 0, DOM7), C('C7', 0, DOM7), C('C7', 0, DOM7), C('F7', 5, DOM7), C('F7', 5, DOM7), C('C7', 0, DOM7), C('C7', 0, DOM7), C('G7', 7, DOM7), C('F7', 5, DOM7), C('C7', 0, DOM7), C('G7', 7, DOM7)],
    scale: { name: 'escala blues de Dó', pcs: [0, 3, 5, 6, 7, 10], names: 'Dó Mi♭ Fá Fá♯ Sol Si♭' },
  },
  {
    id: 'jazz',
    label: 'ii–V–I',
    bars: [C('Dm7', 2, MIN7), C('G7', 7, DOM7), C('Cmaj7', 0, MAJ7), C('Cmaj7', 0, MAJ7)],
    scale: { name: 'escala de Dó maior', pcs: [0, 2, 4, 5, 7, 9, 11], names: 'Dó Ré Mi Fá Sol Lá Si' },
  },
];

export interface BackingNote {
  midi: Midi;
  /** em tempos desde o começo do compasso */
  beat: number;
  /** em tempos */
  beats: number;
  velocity: number;
}

/** Baixo grave (Dó2 a Si2) e acorde em posição fechada a partir de Fá3 (abaixo da mão direita). */
function bassOf(root: number): Midi {
  return 36 + root;
}

export function voicing(ch: BackingChord): Midi[] {
  const base = 53; // Fá3
  const rootMidi = base + ((ch.root - (base % 12) + 12) % 12);
  return ch.ivs.map((iv) => rootMidi + iv).map((m) => (m > 64 ? m - 12 : m)).sort((a, b) => a - b);
}

/** Um compasso de 4 tempos: baixo no 1 e no 3 (fundamental e quinta), acorde curto no 2 e no 4. */
export function barNotes(ch: BackingChord, beats = 4): BackingNote[] {
  const out: BackingNote[] = [];
  const bass = bassOf(ch.root);
  out.push({ midi: bass, beat: 0, beats: 1.8, velocity: 0.62 });
  if (beats >= 4) out.push({ midi: bass + 7, beat: 2, beats: 1.8, velocity: 0.52 });
  const chord = voicing(ch);
  for (let b = 1; b < beats; b += 2) for (const m of chord) out.push({ midi: m, beat: b, beats: 0.7, velocity: 0.42 });
  return out;
}

/** Notas da escala para improvisar dentro de um trecho do teclado. */
export function scaleKeys(style: BackingStyle, low: Midi, high: Midi): Midi[] {
  const out: Midi[] = [];
  for (let m = low; m <= high; m++) if (style.scale.pcs.includes(((m % 12) + 12) % 12)) out.push(m);
  return out;
}
