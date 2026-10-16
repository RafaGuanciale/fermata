import { describe, expect, it } from 'vitest';
import { isSilentBar, pulseReport, pulseText } from './pulse';

describe('metrônomo que some', () => {
  it('2 compassos com clique, 2 sem', () => {
    const bars = Array.from({ length: 8 }, (_, bar) => isSilentBar(bar * 4, 4, 2));
    expect(bars).toEqual([false, false, true, true, false, false, true, true]);
    expect(isSilentBar(13, 4, 0)).toBe(false);
  });

  it('mede adiantado ou atrasado com e sem clique, ignorando notas entre os tempos', () => {
    const beats = Array.from({ length: 16 }, (_, i) => ({ t: i * 500, silent: Math.floor(i / 4) % 2 === 1 }));
    // Com clique: no tempo. Sem clique: 40 ms adiantado. E colcheias no meio, que não contam.
    const notes = [0, 505, 995, 1500, 1960, 2460, 2960, 3460, 250, 2250];
    const r = pulseReport(notes, beats, 500);
    expect(r.click).toEqual({ mean: 0, count: 4 });
    expect(r.silent).toEqual({ mean: -40, count: 4 });
    expect(pulseText(r.silent!)).toBe('40 ms adiantado');
    expect(pulseText(r.click!)).toBe('no tempo');
  });
});
