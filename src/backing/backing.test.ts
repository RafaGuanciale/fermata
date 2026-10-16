import { describe, expect, it } from 'vitest';
import { BACKING_STYLES, barNotes, scaleKeys, voicing } from './backing';

describe('acompanhamento', () => {
  it('cada estilo tem compassos e escala; o blues tem 12 compassos', () => {
    for (const s of BACKING_STYLES) {
      expect(s.bars.length).toBeGreaterThan(0);
      expect(s.scale.pcs.length).toBeGreaterThanOrEqual(5);
    }
    expect(BACKING_STYLES.find((s) => s.id === 'blues')!.bars).toHaveLength(12);
  });

  it('acorde fechado abaixo do Dó central e baixo grave no 1 e no 3', () => {
    const c = BACKING_STYLES[0].bars[0];
    expect(voicing(c)).toEqual([55, 60, 64]);
    for (const ch of BACKING_STYLES.flatMap((s) => s.bars)) for (const m of voicing(ch)) expect(m).toBeLessThanOrEqual(64);
    const notes = barNotes(c);
    expect(notes.filter((n) => n.beat === 0).map((n) => n.midi)).toEqual([36]);
    expect(notes.filter((n) => n.beat === 2).map((n) => n.midi)).toEqual([43]);
    expect(notes.filter((n) => n.beat === 1).map((n) => n.midi)).toEqual([55, 60, 64]);
  });

  it('escala do blues de Dó numa oitava', () => {
    expect(scaleKeys(BACKING_STYLES.find((s) => s.id === 'blues')!, 60, 72)).toEqual([60, 63, 65, 66, 67, 70, 72]);
  });
});
