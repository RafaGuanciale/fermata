// Notas como números MIDI (Dó central = 60). Toda a teoria do app parte daqui.

export type Midi = number;

const LETTERS_PT = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'] as const;
const LETTERS_SCI = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

// Para cada classe de altura (0–11): índice da letra e se leva sustenido.
// Teclas pretas são escritas como sustenido da nota abaixo (Dó♯, não Ré♭) por padrão.
const PITCH_CLASS: ReadonlyArray<{ letter: number; sharp: boolean }> = [
  { letter: 0, sharp: false }, { letter: 0, sharp: true },
  { letter: 1, sharp: false }, { letter: 1, sharp: true },
  { letter: 2, sharp: false },
  { letter: 3, sharp: false }, { letter: 3, sharp: true },
  { letter: 4, sharp: false }, { letter: 4, sharp: true },
  { letter: 5, sharp: false }, { letter: 5, sharp: true },
  { letter: 6, sharp: false },
];

export interface NoteInfo {
  midi: Midi;
  /** Nome em português, sem oitava: "Fá♯" */
  name: string;
  /** Notação científica: "F♯4" */
  sci: string;
  octave: number;
  /** 0 = Dó … 6 = Si */
  letter: number;
  sharp: boolean;
  isBlack: boolean;
}

export function noteInfo(midi: Midi): NoteInfo {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const { letter, sharp } = PITCH_CLASS[pc];
  const acc = sharp ? '♯' : '';
  return {
    midi,
    name: LETTERS_PT[letter] + acc,
    sci: LETTERS_SCI[letter] + acc + octave,
    octave,
    letter,
    sharp,
    isBlack: sharp,
  };
}

/** "Fá (F4)" — forma usada no feedback do treino. */
export function noteLabel(midi: Midi): string {
  const n = noteInfo(midi);
  return `${n.name} (${n.sci})`;
}

/**
 * Posição na pauta em clave de sol, em passos diatônicos.
 * 0 = linha inferior (Mi4), 1 = primeiro espaço (Fá4), 8 = linha superior (Fá5).
 * Dó4 fica em -2 (linha suplementar abaixo).
 */
export function trebleStep(midi: Midi): number {
  const n = noteInfo(midi);
  return (n.octave - 4) * 7 + n.letter - 2;
}

/**
 * Posição na pauta em clave de fá. 0 = linha inferior (Sol2), 8 = linha superior (Lá3).
 * Dó3 fica no segundo espaço (3); Dó4 na linha suplementar acima (10).
 */
export function bassStep(midi: Midi): number {
  const n = noteInfo(midi);
  return (n.octave - 2) * 7 + n.letter - 4;
}

export type Clef = 'treble' | 'bass';

export function staffStep(midi: Midi, clef: Clef): number {
  return clef === 'bass' ? bassStep(midi) : trebleStep(midi);
}

/** Linhas suplementares necessárias para uma nota (passos pares fora da pauta). */
export function ledgerSteps(step: number): number[] {
  const out: number[] = [];
  for (let s = -2; s >= step; s -= 2) out.push(s);
  for (let s = 10; s <= step; s += 2) out.push(s);
  return out;
}

export function isWhite(midi: Midi): boolean {
  return !noteInfo(midi).isBlack;
}

/** Teclas brancas entre duas notas, inclusive. */
export function whiteKeysBetween(low: Midi, high: Midi): Midi[] {
  const out: Midi[] = [];
  for (let m = low; m <= high; m++) if (isWhite(m)) out.push(m);
  return out;
}
