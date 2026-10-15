import { describe, expect, it } from 'vitest';
import { fingerEvents, fingerNotes, type Hand } from './fingering';

/** Linha de notas soltas, uma a cada meio segundo, legato. */
const line = (ms: number[], hand: Hand = 'r', step = 500) => fingerNotes(ms.map((m, i) => ({ midi: m, t: i * step, dur: step - 50 })), hand).join('');
const chords = (cs: number[][], hand: Hand) => fingerEvents(cs.map((m, i) => ({ midis: m, t: i * 1000, end: i * 1000 + 900 })), hand);

describe('dedilhado automático', () => {
  it('posição de cinco dedos: um dedo por tecla', () => {
    expect(line([60, 62, 64, 65, 67])).toBe('12345');
    expect(line([48, 50, 52, 53, 55], 'l')).toBe('54321');
  });

  it('escalas com a passagem do polegar no lugar certo', () => {
    expect(line([60, 62, 64, 65, 67, 69, 71, 72])).toBe('12312345');
    expect(line([72, 71, 69, 67, 65, 64, 62, 60])).toBe('54321321');
    expect(line([48, 50, 52, 53, 55, 57, 59, 60], 'l')).toBe('54321321');
    expect(line([60, 59, 57, 55, 53, 52, 50, 48], 'l')).toBe('12312345');
    expect(line([67, 69, 71, 72, 74, 76, 78, 79])).toBe('12312345');
    // Fá maior: o polegar não cai no Si♭.
    expect(line([65, 67, 69, 70, 72, 74, 76, 77])).toBe('12341234');
    // Si♭ maior começa no 2.
    expect(line([70, 72, 74, 75, 77, 79, 81, 82])).toBe('21231234');
    // Duas oitavas.
    expect(line([60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84])).toBe('123123412312345');
  });

  it('bate com o que o curso escreve: arpejo de sétima 1-2-3-4-5 subindo, 4-3-2-1 descendo', () => {
    expect(line([55, 59, 62, 65, 67, 65, 62, 59, 55])).toBe('123454321');
    expect(line([60, 64, 67, 70, 72, 70, 67, 64, 60])).toBe('123454321');
  });

  it('melodias conhecidas', () => {
    // Ode à alegria, na posição de Dó.
    expect(line([64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62])).toBe('334554321123322');
    // Baixo de Alberti na esquerda.
    expect(line([48, 55, 52, 55, 48, 55, 52, 55], 'l', 250)[0]).toBe('5');
  });

  it('nota repetida fica no mesmo dedo', () => {
    const f = line([60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60]);
    for (const i of [0, 2, 4, 7, 9, 11]) expect(f[i], `nota ${i}`).toBe(f[i + 1]);
  });

  it('acordes: formas de livro', () => {
    expect(chords([[60, 64, 67], [60, 65, 69], [60, 64, 67], [59, 62, 67], [60, 64, 67]], 'r')).toEqual([[1, 3, 5], [1, 3, 5], [1, 3, 5], [1, 2, 5], [1, 3, 5]]);
    expect(chords([[48, 52, 55], [48, 53, 57], [47, 50, 55], [48, 52, 55]], 'l')).toEqual([[5, 3, 1], [5, 2, 1], [5, 3, 1], [5, 3, 1]]);
    expect(chords([[48, 55], [53, 60], [55, 62]], 'l')).toEqual([[5, 1], [5, 1], [5, 1]]);
  });

  it('devolve na ordem recebida, junta notas simultâneas e limita a cinco dedos', () => {
    expect(chords([[67, 60, 64]], 'r')).toEqual([[5, 1, 3]]);
    const f = fingerNotes([{ midi: 64, t: 0, dur: 900 }, { midi: 60, t: 10, dur: 900 }, { midi: 67, t: 5, dur: 900 }, { midi: 62, t: 1000, dur: 400 }], 'r');
    expect(f.slice(0, 3)).toEqual([3, 1, 5]);
    const big = chords([[48, 52, 55, 60, 64, 67]], 'r')[0];
    expect(big.filter((x) => x === null)).toHaveLength(1);
    expect(new Set(big.filter((x) => x !== null)).size).toBe(5);
  });

  it('depois de uma pausa longa a mão recomeça em posição', () => {
    const notes = [60, 62, 64, 65, 67].map((m, i) => ({ midi: m, t: i * 400, dur: 350 }));
    const again = [72, 74, 76, 77, 79].map((m, i) => ({ midi: m, t: 5000 + i * 400, dur: 350 }));
    expect(fingerNotes([...notes, ...again], 'r').join('')).toBe('1234512345');
  });

  it('aguenta uma música inteira rápido', () => {
    const long = Array.from({ length: 3000 }, (_, i) => ({ midi: 60 + ((i * 7) % 12), t: i * 150, dur: 140 }));
    const t0 = performance.now();
    const f = fingerNotes(long, 'r');
    expect(f.every((x) => x !== null)).toBe(true);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});
