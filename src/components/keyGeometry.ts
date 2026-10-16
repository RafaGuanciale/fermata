// Posição e largura (em %) de cada tecla, na mesma geometria do FullKeyboard: cascata, rolo e marcas.

import { whiteKeysBetween, type Midi } from '../music/notes';

/** Teclas da cascata: posição e largura em %, na mesma geometria do teclado. */
export function keyGeometry(low: Midi, high: Midi) {
  const whites = whiteKeysBetween(low, high);
  const W = whites.length;
  const map = new Map<Midi, { left: number; width: number; black: boolean }>();
  whites.forEach((m, i) => {
    map.set(m, { left: (i / W) * 100, width: (1 / W) * 100, black: false });
    if (m + 1 <= high && !whites.includes(m + 1)) map.set(m + 1, { left: ((i + 1 - 0.31) / W) * 100, width: (0.62 / W) * 100, black: true });
  });
  return map;
}
