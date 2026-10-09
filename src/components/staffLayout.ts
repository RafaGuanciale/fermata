// Quantas notas da pauta cabem na tela, e a partir de qual; grafia das notas na armadura. Separado para testar.

import { noteInfo, staffStep, type Clef, type Midi } from '../music/notes';

export const FIRST_X = 116;
export const GAP = 64;
export const END_PAD = 44;

/** Quantas notas cabem e em que escala, para uma largura disponível. Exportado para teste. */
export function staffLayout(width: number, total: number, lead = 0) {
  const scale = Math.min(1, Math.max(0.62, width / 560));
  const natural = width / scale;
  const fit = Math.floor((natural - FIRST_X - lead - END_PAD) / GAP) + 1;
  const visible = Math.max(3, Math.min(total, fit));
  return { scale, visible };
}

export function windowStart(current: number, visible: number, total: number): number {
  // A nota ativa fica perto do começo, deixando ver as próximas.
  const lead = Math.min(1, visible - 1);
  return Math.max(0, Math.min(current - lead, total - visible));
}

const LETTERS_PT = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'];
// Ordem dos acidentes da armadura: letras (0 = Dó … 6 = Si) e posição na clave de Sol (na de Fá, 2 passos abaixo).
const SHARP_LETTERS = [3, 0, 4, 1, 5, 2, 6];
export const SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];
const FLAT_LETTERS = [6, 2, 5, 1, 4, 0, 3];
export const FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];

/** Grafia de uma tecla na armadura: posição na pauta, acidente a desenhar ('' se a armadura já diz) e nome. */
export function spellOnStaff(midi: Midi, clef: Clef, fifths = 0): { step: number; accidental: '' | '♯' | '♭' | '♮'; name: string } {
  const info = noteInfo(midi);
  // Com bemóis na armadura, a preta vira bemol se esse bemol está na armadura ou é o próximo da ordem (Mi♭ em Fá maior).
  // Fora disso é sustenido: a sensível das menores (Dó♯ em Ré menor, Fá♯ em Sol menor).
  const flat = info.isBlack && fifths < 0 && FLAT_LETTERS.indexOf((info.letter + 1) % 7) < -fifths + 1;
  const letter = flat ? (info.letter + 1) % 7 : info.letter;
  const step = flat ? staffStep(midi + 1, clef) : staffStep(midi, clef);
  const inKey = fifths > 0 ? SHARP_LETTERS.slice(0, fifths) : FLAT_LETTERS.slice(0, -fifths);
  let accidental: '' | '♯' | '♭' | '♮' = '';
  if (info.isBlack) accidental = inKey.includes(letter) ? '' : flat ? '♭' : '♯';
  else if (inKey.includes(letter)) accidental = '♮';
  const name = LETTERS_PT[letter] + (info.isBlack ? (flat ? '♭' : '♯') : '');
  return { step, accidental, name };
}
