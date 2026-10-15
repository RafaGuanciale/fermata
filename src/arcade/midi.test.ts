import { describe, expect, it } from 'vitest';
import { MidiError, guessNames, guessParts, midiTune, parseMidi, steadyBpm, tickToMs, voice } from './midi';

// Monta um .mid pequeno à mão: formato 1, cabeçalho de andamento + faixas de notas.
const vlq = (n: number): number[] => {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
};
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const text = (s: string) => [...s].map((c) => c.charCodeAt(0));
const track = (events: number[]) => [...text('MTrk'), ...u32(events.length + 4), ...events, 0, 0xff, 0x2f, 0];
/** Notas [midi, início em semínimas, duração em semínimas], num canal, com nome. */
function notesTrack(name: string, ch: number, notes: [number, number, number][], ppq: number, runningStatus = false): number[] {
  const evs: { tick: number; bytes: number[] }[] = [];
  for (const [m, at, dur] of notes) {
    evs.push({ tick: at * ppq, bytes: [0x90 | ch, m, 100] });
    evs.push({ tick: (at + dur) * ppq, bytes: [0x90 | ch, m, 0] });
  }
  evs.sort((a, b) => a.tick - b.tick || a.bytes[2] - b.bytes[2]);
  const out = [0, 0xff, 0x03, name.length, ...text(name), 0, 0xc0 | ch, ch === 1 ? 33 : 0];
  let last = 0;
  let status = -1;
  for (const e of evs) {
    out.push(...vlq(e.tick - last));
    last = e.tick;
    if (runningStatus && e.bytes[0] === status) out.push(...e.bytes.slice(1));
    else out.push(...e.bytes);
    status = e.bytes[0];
  }
  return track(out);
}
function smf(ppq: number, tracks: number[][], tempos: [number, number][] = [[0, 500000]]): Uint8Array {
  const meta: number[] = [];
  let last = 0;
  for (const [tick, us] of tempos) {
    meta.push(...vlq(tick - last), 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255);
    last = tick;
  }
  meta.push(0, 0xff, 0x58, 4, 3, 2, 24, 8);
  const all = [track(meta), ...tracks];
  return new Uint8Array([...text('MThd'), ...u32(6), 0, 1, 0, all.length, (ppq >> 8) & 255, ppq & 255, ...all.flat()]);
}

const PPQ = 96;
const melody: [number, number, number][] = [[72, 1, 1], [74, 2, 0.5], [76, 2.5, 0.5], [77, 3, 2], [76, 5, 1], [74, 6, 1], [72, 7, 2], [79, 9, 1], [77, 10, 1]];
const chords: [number, number, number][] = melody.flatMap(([m, at, d]) => [[m, at, d], [m - 4, at, d], [m - 7, at, d]] as [number, number, number][]);
const bass: [number, number, number][] = [[24, 1, 4], [31, 5, 4], [24, 9, 2]];

describe('importar MIDI', () => {
  it('lê faixas, canais, nomes, andamento e compasso', () => {
    const f = parseMidi(smf(PPQ, [notesTrack('Lead Vocal', 0, melody, PPQ, true), notesTrack('Bass', 1, bass, PPQ), notesTrack('Drums', 9, [[36, 1, 0.5]], PPQ)]));
    expect(f.ppq).toBe(PPQ);
    expect(f.parts.map((p) => p.name)).toEqual(['Lead Vocal', 'Bass']);
    expect(f.parts[0].notes).toHaveLength(melody.length);
    expect(f.parts[1].program).toBe(33);
    expect(f.beatsPerBar).toBe(3);
    expect(steadyBpm(f)).toBe(120);
    expect(tickToMs(PPQ * 2, f)).toBeCloseTo(1000);
    expect(guessParts(f)).toEqual({ melody: 0, bass: 1 });
  });

  it('segue mudança de andamento', () => {
    const f = parseMidi(smf(PPQ, [notesTrack('x', 0, melody, PPQ)], [[0, 500000], [PPQ * 2, 1000000]]));
    expect(tickToMs(PPQ * 3, f)).toBeCloseTo(1000 + 1000);
    expect(steadyBpm(f)).toBeNull();
  });

  it('melodia é a voz de cima; o fácil é a melodia mais lenta; o difícil tem as duas mãos', () => {
    const f = parseMidi(smf(PPQ, [notesTrack('Piano', 0, chords, PPQ), notesTrack('Bass', 1, bass, PPQ)]));
    expect(voice(f.parts[0].notes, 'top', PPQ).map((n) => n.midi)).toEqual(melody.map((m) => m[0]));
    const tune = midiTune(f, { melody: 0, bass: 1 }, { id: 'x', title: 'Teste' });
    const easy = tune.chart('facil');
    const med = tune.chart('medio');
    const hard = tune.chart('dificil');
    expect(med.map((n) => n.midi)).toEqual(melody.map((m) => m[0]));
    // Melodia calma: o fácil não tira nenhuma nota.
    expect(easy.length).toBe(med.length);
    expect(tune.easySpeed).toBeLessThanOrEqual(1);
    expect(tune.available).toContain('facil');
    expect(hard.filter((n) => n.hand === 'l').length).toBe(3);
    // O baixo sobe por oitavas para caber no teclado e ficar perto da melodia.
    expect(Math.min(...hard.map((n) => n.midi))).toBeGreaterThanOrEqual(36);
    // Começa no primeiro tempo com nota (a semínima 1), não no zero do arquivo.
    expect(med[0].t).toBe(0);
    expect(med[1].t).toBeCloseTo(500);
    expect(tune.bpm).toBe(120);
    expect(tune.hasBass).toBe(true);
  });

  it('sem faixa de baixo, o difícil usa a voz grave dos acordes', () => {
    const f = parseMidi(smf(PPQ, [notesTrack('Piano', 0, chords, PPQ)]));
    const tune = midiTune(f, { melody: 0, bass: null }, { id: 'x', title: 'Teste' });
    expect(tune.hasBass).toBe(true);
    expect(tune.chart('dificil').length).toBeGreaterThan(tune.chart('medio').length);
  });

  it('recusa o que não é MIDI', () => {
    expect(() => parseMidi(new TextEncoder().encode('isto não é um midi'))).toThrow(MidiError);
    expect(() => parseMidi(smf(PPQ, [notesTrack('Drums', 9, [[36, 1, 1]], PPQ)]))).toThrow(/notas/);
  });
});

describe('versões completas do app (domínio público)', () => {
  it('cada uma abre nas três dificuldades; o fácil é mais lento e reconhecível', async () => {
    const { ARCADE_CHARTS } = await import('./songs');
    const { chartTune } = await import('./midi');
    const { chartFingers } = await import('./arcade');
    for (const c of ARCADE_CHARTS) {
      const [full, easy] = await Promise.all([c.load(), c.loadEasy?.()]);
      const t = chartTune(c, full, easy);
      const [f, m, d] = (['facil', 'medio', 'dificil'] as const).map((x) => t.chart(x));
      expect(f.length, c.id).toBeGreaterThan(10);
      expect(f.length, c.id).toBeLessThanOrEqual(m.length);
      expect(t.easySpeed, c.id).toBeLessThanOrEqual(1);
      expect(t.easySpeed, c.id).toBeGreaterThanOrEqual(0.5);
      expect(d.length, c.id).toBeGreaterThan(m.length);
      for (const ch of [f, m, d]) for (let i = 1; i < ch.length; i++) expect(ch[i].t, c.id).toBeGreaterThanOrEqual(ch[i - 1].t);
      expect(Math.min(...d.map((n) => n.midi)), c.id).toBeGreaterThanOrEqual(36);
      for (const ch of [f, m, d]) expect(chartFingers(ch).every((x) => x !== null), c.id).toBe(true);
    }
  });
});

describe('nome e artista do arquivo', () => {
  it('separa "Música - Artista" e limpa o nome', () => {
    expect(guessNames('Iris - Goo Goo Dolls.mid', null)).toEqual({ title: 'Iris', artist: 'Goo Goo Dolls' });
    expect(guessNames('The_Final_Countdown_-_Europe.mid', null)).toEqual({ title: 'The Final Countdown', artist: 'Europe' });
    expect(guessNames('03fae352-iris-goo-goo-dolls.mid', null)).toEqual({ title: 'Iris Goo Goo Dolls', artist: '' });
    expect(guessNames('track.mid', 'Interstellar')).toEqual({ title: 'Interstellar', artist: '' });
  });
});
