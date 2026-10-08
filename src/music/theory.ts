// Acordes e escalas como fórmulas de intervalos. Nenhum acorde é desenhado à mão:
// tudo sai da fundamental + semitons.

import { noteInfo, type Midi } from './notes';

export type TriadQuality = 'major' | 'minor';

export const TRIAD_INTERVALS: Record<TriadQuality, [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
};

export const QUALITY_PT: Record<TriadQuality, string> = { major: 'maior', minor: 'menor' };

const LETTERS = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

/** Nome de uma nota escrita sobre uma letra (para soletrar acordes e escalas certo: Lá♭, não Sol♯). */
export function spell(letterIndex: number, pitchClass: number): string {
  const l = ((letterIndex % 7) + 7) % 7;
  const diff = (((pitchClass - NATURAL_PC[l]) % 12) + 12) % 12;
  const acc = diff === 1 ? '♯' : diff === 11 ? '♭' : diff === 2 ? '𝄪' : diff === 10 ? '𝄫' : '';
  return LETTERS[l] + acc;
}

export interface Triad {
  rootLetter: number;
  quality: TriadQuality;
  /** 0 = fundamental, 1 = 1ª inversão, 2 = 2ª inversão */
  inversion: 0 | 1 | 2;
}

export interface VoicedTriad {
  name: string;
  /** Notas em ordem da mais grave para a mais aguda */
  midis: Midi[];
  /** Nome de cada nota, na mesma ordem */
  noteNames: string[];
  /** Grau de cada nota ("1", "3", "♭3", "5"), na mesma ordem */
  degrees: string[];
}

/** Monta a tríade a partir do Dó central, já na inversão pedida. */
export function voiceTriad({ rootLetter, quality, inversion }: Triad, base: Midi = 60): VoicedTriad {
  const rootPc = NATURAL_PC[rootLetter];
  const iv = TRIAD_INTERVALS[quality];
  const names = [spell(rootLetter, rootPc), spell(rootLetter + 2, rootPc + iv[1]), spell(rootLetter + 4, rootPc + iv[2])];
  const degrees = ['1', quality === 'minor' ? '♭3' : '3', '5'];
  const root = base + rootPc;
  let notes = iv.map((i, k) => ({ midi: root + i, k }));
  for (let r = 0; r < inversion; r++) {
    const [first, ...rest] = notes;
    notes = [...rest, { midi: first.midi + 12, k: first.k }];
  }
  return {
    name: `${names[0]} ${QUALITY_PT[quality]}`,
    midis: notes.map((n) => n.midi),
    noteNames: notes.map((n) => names[n.k]),
    degrees: notes.map((n) => degrees[n.k]),
  };
}

/**
 * Reconhece uma tríade maior ou menor nas notas seguradas, em qualquer oitava e inversão.
 * Notas repetidas em oitavas diferentes contam uma vez. Mais de 3 classes de altura = não é tríade.
 */
export function detectTriad(held: Iterable<Midi>): { name: string; rootPc: number; quality: TriadQuality; bass: Midi } | null {
  const list = [...held].sort((a, b) => a - b);
  if (list.length < 3) return null;
  const pcs = [...new Set(list.map((m) => ((m % 12) + 12) % 12))];
  if (pcs.length !== 3) return null;
  for (const rootPc of pcs) {
    const rel = pcs.map((pc) => (pc - rootPc + 12) % 12).sort((a, b) => a - b);
    for (const quality of ['major', 'minor'] as TriadQuality[]) {
      const iv = TRIAD_INTERVALS[quality];
      if (rel[0] === iv[0] && rel[1] === iv[1] && rel[2] === iv[2]) {
        const rootName = noteInfo(60 + rootPc).name;
        return { name: `${rootName} ${QUALITY_PT[quality]}`, rootPc, quality, bass: list[0] };
      }
    }
  }
  return null;
}

/** Escala maior: tom, tom, semitom, tom, tom, tom, semitom. */
export const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];

export function majorScale(rootLetter: number, base: Midi = 60): { midis: Midi[]; names: string[] } {
  const rootPc = NATURAL_PC[rootLetter];
  const midis: Midi[] = [base + rootPc];
  const names: string[] = [spell(rootLetter, rootPc)];
  for (let i = 0; i < 7; i++) {
    const next = midis[i] + MAJOR_STEPS[i];
    midis.push(next);
    names.push(spell(rootLetter + i + 1, next % 12));
  }
  return { midis, names };
}

export { LETTERS as NOTE_LETTERS };
