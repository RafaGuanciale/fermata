import { describe, expect, it } from 'vitest';
import { grandColumns, spread } from './grandStaff';
import { sightReadingTwoHands, twoHandTask } from './tasks';
import { lineTask } from './track';
import { seeded } from './music';

describe('pauta dupla', () => {
  it('sem esquerda, uma coluna por figura', () => {
    const c = grandColumns([{ midi: 60, beats: 1 }, { midi: 62, beats: 2 }]);
    expect(c.starts).toEqual([0, 1]);
    expect(c.upper).toEqual([0, 1]);
    expect(c.lower).toEqual([undefined, undefined]);
  });

  it('junta as mãos pelo tempo: semínimas em cima, semibreve embaixo', () => {
    const t = twoHandTask('E4 D4 C4 D4 | E4:4', 'C3:4 | G2:4', { bpm: 60 });
    const c = grandColumns(t.display, t.lower);
    expect(c.starts).toEqual([0, 1, 2, 3, 4]);
    expect(c.upper).toEqual([0, 1, 2, 3, 4]);
    expect(c.lower).toEqual([0, undefined, undefined, undefined, 1]);
    expect(spread(c.lower, t.lower!).map((d) => d?.midi)).toEqual([48, undefined, undefined, undefined, 43]);
  });

  it('coluna nova quando só a esquerda toca', () => {
    const c = grandColumns([{ midi: 60, beats: 2 }], [{ midi: 48, beats: 1 }, { midi: 43, beats: 1 }]);
    expect(c.starts).toEqual([0, 1]);
    expect(c.upper).toEqual([0, undefined]);
    expect(c.lower).toEqual([0, 1]);
  });

  it('mãos juntas sempre mostram a esquerda', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const t = sightReadingTwoHands(seeded(seed), { tonic: 60, bars: 4, bpm: 60 });
      const left = t.events.filter((e) => e.hand === 'l');
      const shown = t.lower!.filter((d) => d.midi !== null).flatMap((d) => d.chord ?? [d.midi!]);
      expect(shown.sort()).toEqual(left.map((e) => e.midi!).sort());
    }
    // A esquerda fica na pauta de fá: entre Mi2 e Sol3 (no máximo uma linha suplementar embaixo).
    for (const tonic of [60, 62, 65, 67, 70]) {
      for (const level of [1, 2] as const) {
        const t = sightReadingTwoHands(seeded(tonic), { tonic, bars: 4, bpm: 60, level });
        for (const e of t.events.filter((x) => x.hand === 'l')) expect(e.midi! >= 40 && e.midi! <= 55, `tônica ${tonic}: esquerda em ${e.midi}`).toBe(true);
      }
    }
    expect(lineTask([60, 62], 1, { bpm: 60, hands: 'duas' }).lower!.map((d) => d.midi)).toEqual([48, 50]);
    expect(lineTask([60, 62], 1, { bpm: 60, hands: 'direita' }).lower).toBeUndefined();
  });
});
