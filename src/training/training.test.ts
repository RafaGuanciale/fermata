import { describe, expect, it } from 'vitest';
import { afterRep, createLadder, judgeTake, latencyFromTaps, onsets, repBpm, shouldIsolate, windowsFor } from './timing';
import { parseLine } from '../course/music';
import type { TimedNote } from './timing';

const w = windowsFor(1);

/** Melodia em texto (uma nota por vez) para os testes. */
const melody = (text: string): TimedNote[] => parseLine(text).map((p) => ({ midi: p.midis[0] ?? null, beats: p.beats }));

describe('julgamento no tempo', () => {
  const notes = melody('C4 D4 E4:2');

  it('calcula onde cada nota cai', () => {
    expect(onsets(notes, 60)).toEqual([0, 1000, 2000]);
    expect(onsets(melody('C4 r D4'), 120)).toEqual([0, null, 1000]);
  });

  it('dá nota por proximidade do tempo', () => {
    const r = judgeTake(notes, 60, [
      { midi: 60, t: 10 },
      { midi: 62, t: 1080 },
      { midi: 64, t: 1870 },
    ], w);
    expect(r.notes.map((n) => n?.grade)).toEqual(['perfect', 'good', 'off']);
    expect(r.clean).toBe(false);
    expect(r.accuracy).toBeCloseTo((1 + 0.9 + 0.5) / 3);
  });

  it('passada limpa: tudo tocado, 90% bom, nada fora de 150 ms', () => {
    const r = judgeTake(notes, 60, [
      { midi: 60, t: -20 },
      { midi: 62, t: 1030 },
      { midi: 64, t: 2090 },
    ], w);
    expect(r.clean).toBe(true);
    expect(r.extras).toBe(0);
  });

  it('nota errada vira extra e a esperada vira erro quando o prazo vence', () => {
    const r = judgeTake(notes, 60, [{ midi: 61, t: 0 }], w, 1400);
    expect(r.extras).toBe(1);
    expect(r.notes[0]).toEqual({ grade: 'miss', delta: null });
    expect(r.notes[1]).toBeNull();
  });
});

describe('escada de BPM', () => {
  it('começa em 60% e sobe 5% depois de 3 limpas', () => {
    let l = createLadder(80);
    expect(l.bpm).toBe(48);
    l = afterRep(afterRep(afterRep(l, true), true), true);
    expect(l.bpm).toBe(52);
  });

  it('desce depois de 2 falhas e pede para isolar depois de 2 descidas', () => {
    let l = createLadder(80, 72);
    expect(l.bpm).toBe(68);
    l = afterRep(afterRep(l, false), false);
    expect(l.bpm).toBe(64);
    l = afterRep(afterRep(l, false), false);
    expect(shouldIsolate(l)).toBe(true);
  });

  it('a cada 4 passadas, uma mais devagar que não conta para subir', () => {
    let l = createLadder(60, 60);
    expect(l.bpm).toBe(56);
    l = afterRep(afterRep(afterRep(l, true), true), true);
    expect(l.bpm).toBe(60);
    expect(repBpm(l)).toBe(56);
    l = afterRep(l, true, 56);
    expect(l.atTarget).toBe(0);
    l = afterRep(afterRep(afterRep(l, true), true), true);
    expect(l.atTarget).toBe(3);
  });

  it('mede o atraso do aparelho pela mediana', () => {
    expect(latencyFromTaps([105, 1110, 2090, 3100, 4600], [0, 1000, 2000, 3000, 4000])).toBe(103);
    expect(latencyFromTaps([10, 20], [0, 1000])).toBeNull();
  });
});


describe('relatório do atraso', () => {
  it('aceita atraso normal e recusa antecipação ou toques espalhados', async () => {
    const { latencyReport } = await import('./timing');
    const beats = Array.from({ length: 12 }, (_, i) => i * 750);
    expect(latencyReport(beats.map((b) => b + 35), beats)).toMatchObject({ ms: 35, usable: true });
    expect(latencyReport(beats.map((b) => b - 157), beats)).toMatchObject({ ms: -157, usable: false, reason: 'early' });
    const messy = beats.map((b, i) => b + (i % 2 ? 140 : -60));
    expect(latencyReport(messy, beats)?.reason).toBe('spread');
  });
});
