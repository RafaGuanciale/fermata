import { describe, expect, it } from 'vitest';
import { parseMidi, tickToMs } from '../arcade/midi';
import { captureNotes, compareTakes, midiFileName, packNotes, packPedal, recordingStats, soundingNotes, timingStats, toMidiFile, unpackNotes, unpackPedal, type RecNote } from './take';

describe('gravação', () => {
  it('junta aperta e solta em notas, com força, e fecha o que ficou abaixado', () => {
    const notes = captureNotes(
      [
        { type: 'on', midi: 60, at: 1000, velocity: 90 },
        { type: 'on', midi: 64, at: 1000 },
        { type: 'off', midi: 60, at: 1500 },
        { type: 'on', midi: 67, at: 1600, velocity: 40 },
        { type: 'off', midi: 64, at: 1700 },
        { type: 'on', midi: 60, at: 500 }, // antes de começar: fica de fora
      ],
      1000,
      2000,
    );
    expect(notes).toEqual([
      { midi: 60, t: 0, dur: 500, vel: 90 },
      { midi: 64, t: 0, dur: 700, vel: null },
      { midi: 67, t: 600, dur: 400, vel: 40 },
    ]);
  });

  it('guarda compacto e lê de volta igual', () => {
    const notes: RecNote[] = [{ midi: 60, t: 0, dur: 500, vel: 90 }, { midi: 62, t: 510, dur: 240, vel: null }];
    expect(unpackNotes(packNotes(notes))).toEqual(notes);
    expect(unpackPedal(packPedal([{ t: 100, down: true }, { t: 900, down: false }]))).toEqual([{ t: 100, down: true }, { t: 900, down: false }]);
  });

  it('com pedal, a nota soa até o pedal subir', () => {
    const notes: RecNote[] = [{ midi: 60, t: 0, dur: 300, vel: 80 }, { midi: 64, t: 1200, dur: 200, vel: 80 }];
    const s = soundingNotes(notes, [{ t: 100, down: true }, { t: 1000, down: false }]);
    expect(s[0].dur).toBe(1000);
    expect(s[1].dur).toBe(200);
  });

  it('números da gravação e do tempo', () => {
    const notes: RecNote[] = [{ midi: 60, t: 0, dur: 500, vel: 50 }, { midi: 72, t: 500, dur: 500, vel: 100 }, { midi: 64, t: 1000, dur: 1000, vel: null }];
    expect(recordingStats(notes, 3000)).toEqual({ durationMs: 3000, notes: 3, perMinute: 60, velocity: { min: 50, max: 100, mean: 75 }, range: [60, 72] });
    expect(timingStats([-20, 0, 20, null])).toEqual({ mean: 0, spread: 16 });
    expect(timingStats([10, null])).toBeNull();
  });

  it('compara: mais precisão e mais regularidade é melhor', () => {
    const notes: RecNote[] = [{ midi: 60, t: 0, dur: 500, vel: 60 }];
    const rows = compareTakes(
      { createdAt: 1, durationMs: 30000, notes, bpm: 60, accuracy: 0.8, timing: { mean: 40, spread: 60 } },
      { createdAt: 2, durationMs: 25000, notes, bpm: 72, accuracy: 0.92, timing: { mean: -8, spread: 30 } },
    );
    const by = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(by['Precisão'].verdict).toBe('melhor');
    expect(by['Andamento'].verdict).toBe('melhor');
    expect(by['Em média'].b).toBe('no tempo');
    expect(by['Em média'].a).toBe('40 ms atrasado');
    expect(by['Regularidade (variação)'].verdict).toBe('melhor');
    expect(by['Dinâmica (faixa de força)'].verdict).toBe('igual');
    expect(by['Duração'].a).toBe('30 s');
  });

  it('exporta um .mid que o próprio app lê de volta', () => {
    const notes: RecNote[] = [{ midi: 60, t: 0, dur: 500, vel: 90 }, { midi: 64, t: 0, dur: 500, vel: null }, { midi: 67, t: 1000, dur: 250, vel: 30 }];
    const file = parseMidi(toMidiFile(notes, [{ t: 0, down: true }, { t: 900, down: false }], 'Teste'));
    expect(file.parts[0].name).toBe('Teste');
    const got = file.parts[0].notes.map((n) => ({ midi: n.midi, t: Math.round(tickToMs(n.tick, file)), dur: Math.round(tickToMs(n.tick + n.durTicks, file) - tickToMs(n.tick, file)), vel: n.vel })).sort((a, b) => a.t - b.t || a.midi - b.midi);
    expect(got).toEqual([
      { midi: 60, t: 0, dur: 500, vel: 90 },
      { midi: 64, t: 0, dur: 500, vel: 80 },
      { midi: 67, t: 1000, dur: 250, vel: 30 },
    ]);
    expect(midiFileName('Für Elise, tema A', new Date(2026, 9, 16).getTime())).toBe('fur-elise-tema-a-2026-10-16.mid');
  });
});
