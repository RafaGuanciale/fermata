import { describe, expect, it } from 'vitest';
import { timedFingers } from './fingers';

describe('dedos na pauta dos exercícios', () => {
  it('um dedo por figura, nada em pausa nem na continuação da ligadura', () => {
    const display = [
      { midi: 60, beats: 1 }, { midi: 62, beats: 1 }, { midi: null, beats: 1 }, { midi: 64, beats: 1, tie: true }, { midi: 64, beats: 1 }, { midi: 65, beats: 1 }, { midi: 67, beats: 2 },
    ];
    expect(timedFingers({ display, clef: 'treble', bpm: 80 })).toEqual([[1], [2], null, [3], null, [4], [5]]);
  });

  it('clave de Fá é a mão esquerda; acordes do grave para o agudo; transposição conta', () => {
    const left = timedFingers({ display: [48, 50, 52, 53, 55].map((m) => ({ midi: m, beats: 1 })), clef: 'bass', bpm: 80 });
    expect(left).toEqual([[5], [4], [3], [2], [1]]);
    const chord = timedFingers({ display: [{ midi: 67, beats: 2, chord: [67, 60, 64] }], clef: 'treble', bpm: 80 });
    expect(chord).toEqual([[1, 3, 5]]);
    // Fá maior escrito em Dó e tocado uma 4ª acima: o polegar não cai no Si♭.
    const scale = [60, 62, 64, 65, 67, 69, 71, 72].map((m) => ({ midi: m, beats: 1 }));
    expect(timedFingers({ display: scale, clef: 'treble', bpm: 80, transpose: 5 }).map((f) => f![0]).join('')).toBe('12341234');
  });
});
