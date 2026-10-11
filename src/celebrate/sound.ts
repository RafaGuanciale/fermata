// Recompensa em som de piano: um arpejo curto quando passa num exercício, uma cadência quando conclui a lição.
// Pode ser desligada (fica guardado neste aparelho).

import { playNotes } from '../audio/synth';
import { audioContext } from '../training/clickTrack';

const KEY = 'fermata-reward-sound';

export function rewardSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setRewardSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // sem armazenamento: vale só nesta visita
  }
}

type Reward = 'pass' | 'great' | 'lesson';

/** Notas de cada recompensa, em (tempo em segundos, notas MIDI, duração). */
const SHAPES: Record<Reward, [number, number[], number][]> = {
  // Arpejo de Dó maior subindo, leve.
  pass: [[0, [72], 0.5], [0.09, [76], 0.5], [0.18, [79], 0.9]],
  // Três estrelas: arpejo até o Dó de cima, com o acorde soando no fim.
  great: [[0, [72], 0.5], [0.08, [76], 0.5], [0.16, [79], 0.5], [0.24, [84], 1.2], [0.24, [60, 64, 67], 1.2]],
  // Lição concluída: IV – V – I, o "amém" seguido do ponto final.
  lesson: [[0, [53, 65, 69, 72], 0.5], [0.42, [55, 67, 71, 74], 0.5], [0.84, [48, 64, 67, 72, 76], 1.8]],
};

export function playReward(kind: Reward) {
  if (!rewardSoundOn()) return;
  const ctx = audioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.05;
  playNotes(
    SHAPES[kind].flatMap(([at, midis, dur]) => midis.map((midi) => ({ midi, at: t0 + at, dur, velocity: kind === 'lesson' ? 0.55 : 0.45 }))),
    0.5,
  );
}
