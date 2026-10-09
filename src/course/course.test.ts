import { describe, expect, it } from 'vitest';
import type { LessonProgress, TrainingRun } from '../db/db';
import { UNITS } from '.';
import { chordSequence, inversionChord, nearestVoicing, spellTriadChoice, triadSpelling } from './gens';
import { compoundRhythm, compoundTask } from './tasks';
import { optimalMove, voiceMove } from './judge';
import { buildMinorScale, chordQualityByEar, minorChord, minorDegreeSymbol, minorSteps, qualityByEar, qualityInterval, relativeKey, resolveMinor, spellInterval, spellIntervalChoice, spellScale } from './gens';
import { buildScale, degreeByEar, degreeSymbol, keyFromSignature, scaleDegreeNote, harmonize, intervalAbove, intervalByEar, parseChord, playChord, primaryChord, progressionByEar, readInterval, resolveCadence, tonicByEar, toneOrSemitone, transposeProgression, whiteAbove } from './gens';
import {
  articulationScore, calibrate, chordMatches, dynamicsScore, ioiSd, judgeTask, labelsVisible, levelOf, pedalScore, pressItem, scoreImprov, scoreItems, startItem, type CourseEvent,
} from './judge';
import { n, parseLine, ptName, seeded } from './music';
import { afterCheckpoint, canMaster, lessonKey, lessonState, nextLesson, rowsById, songPassed, unitComplete, warmupItems } from './progress';
import { checkSong, songXml } from './song';
import { melodyTask, rhythmTask, sightReadingTask, tiedMelodyTask, transposedTask } from './tasks';
import type { Exercise, Item, ItemGen, Unit } from './types';

const DAY = 86400000;

describe('escrita de melodias', () => {
  it('lê notas, pausas, acordes e compassos', () => {
    expect(n('C4')).toBe(60);
    expect(n('F#4')).toBe(66);
    expect(n('Bb3')).toBe(58);
    expect(ptName('F#4')).toBe('Fá♯');
    const p = parseLine('C4 E4:2 r | C3+E3+G3:4', 4);
    expect(p.map((x) => [x.midis, x.beat, x.bar])).toEqual([[[60], 0, 1], [[64], 1, 1], [[], 3, 1], [[48, 52, 55], 4, 2]]);
    expect(() => parseLine('C4 D4 | E4', 4)).toThrow(/Compasso 1/);
  });

  it('gera MusicXML com duas pautas', () => {
    const song = { id: 't', title: 'Teste & cia', composer: 'X', bpm: 80, beatsPerBar: 4, fifths: 0, right: 'C4 D4 E4 F4 | G4:4', left: 'C3+G3:4 | r:4', hands: 'duas' as const, pass: { accuracy: 0.85 } };
    const xml = songXml(song);
    expect(xml.match(/<measure /g)).toHaveLength(2);
    expect(xml).toContain('<chord/>');
    expect(xml).toContain('<staves>2</staves>');
    expect(xml).toContain('Teste &amp; cia');
    expect(xml).toContain('<rest measure="yes"/>');
    expect(() => checkSong({ ...song, left: 'C3:4' })).toThrow(/compassos/);
  });

  it('primeira vista: melodia nova na posição, termina na tônica', () => {
    for (let seed = 1; seed < 30; seed++) {
      const t = sightReadingTask(seeded(seed), { tonic: 67, bars: 4, bpm: 60, fifths: 1 });
      expect(t.events.every((e) => [67, 69, 71, 72, 74].includes(e.midi!))).toBe(true);
      expect(t.events[t.events.length - 1]).toMatchObject({ midi: 67, beat: 12, beats: 4 });
      expect(t.fifths).toBe(1);
    }
  });

  it('tarefas no tempo', () => {
    const t = melodyTask('C4 D4 E4:2', { bpm: 60 });
    expect(t.events.map((e) => [e.midi, e.beat])).toEqual([[60, 0], [62, 1], [64, 2]]);
    const r = rhythmTask('x x:2 r', { bpm: 60 });
    expect(r.events.map((e) => [e.midi, e.beat])).toEqual([[null, 0], [null, 1]]);
    expect(r.display.map((d) => d.midi)).toEqual([60, 60, null]);
    const tie = tiedMelodyTask('C4 E4:2~ | E4 D4 C4', { bpm: 60, beatsPerBar: 3 });
    expect(tie.display.map((d) => [d.midi, d.beats])).toEqual([[60, 1], [64, 2], [64, 1], [62, 1], [60, 1]]);
    expect(tie.events.map((e) => [e.midi, e.beat, e.beats])).toEqual([[60, 0, 1], [64, 1, 3], [62, 4, 1], [60, 5, 1]]);
    const tr = transposedTask('C4 D4 E4:2', 7, { bpm: 60 });
    expect(tr.display.map((d) => d.midi)).toEqual([60, 62, 64]);
    expect(tr.events.map((e) => e.midi)).toEqual([67, 69, 71]);
    expect(tr.transpose).toBe(7);
    expect(tr.low <= 67 && tr.high >= 71).toBe(true);
  });
});

describe('modo menor e intervalos com qualidade', () => {
  it('escalas menores soletradas', () => {
    expect(spellScale('A4', minorSteps('natural'))).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5']);
    expect(spellScale('A4', minorSteps('harmonica'))[6]).toBe('G#5');
    expect(spellScale('D4', minorSteps('harmonica'))).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C#5', 'D5']);
    const mel = spellScale('E4', minorSteps('melodica'));
    expect(mel).toHaveLength(15);
    expect(mel.slice(5, 7)).toEqual(['C#5', 'D#5']);
    expect(mel.slice(8, 10)).toEqual(['D5', 'C5']);
    const it = buildMinorScale({ keys: ['A'], forms: ['harmonica'] })(seeded(1));
    expect(it.steps.map((s) => (s.kind === 'exact' ? s.midis[0] : 0))).toEqual([69, 71, 72, 74, 76, 77, 80, 81]);
    expect(it.hint).toContain('Sol♯');
  });

  it('acordes e cadência em menor', () => {
    expect(minorDegreeSymbol('A', 'V7')).toBe('E7');
    expect(minorDegreeSymbol('D', 'iv')).toBe('Gm');
    expect(minorDegreeSymbol('E', 'V')).toBe('B');
    expect(minorDegreeSymbol('C', 'iv')).toBe('Fm');
    const c = minorChord({ keys: ['A'], degrees: ['V7'], low: 48, high: 72 })(seeded(2));
    expect(c.steps[0]).toEqual({ kind: 'chord', pcs: [4, 8, 11, 2], bass: undefined, optional: [11] });
    const r = resolveMinor({ keys: ['D'], before: [['iv', 'V7']] })(seeded(2));
    expect(r.steps[0]).toMatchObject({ kind: 'chord', pcs: [2, 5, 9] });
    expect(relativeKey({ majors: ['G'], ask: ['menor'] })(seeded(1)).steps[0]).toEqual({ kind: 'pc', pcs: [4] });
    expect(relativeKey({ majors: ['F'], ask: ['maior'] })(seeded(1)).steps[0]).toEqual({ kind: 'pc', pcs: [5] });
  });

  it('intervalos com qualidade e grafia', () => {
    expect(spellInterval('F#4', '6m')).toBe('D5');
    expect(spellInterval('C4', '4A')).toBe('F#4');
    expect(spellInterval('C4', '5d')).toBe('Gb4');
    expect(spellInterval('E4', '3m', -1)).toBe('C#4');
    expect(spellInterval('Bb3', '8J')).toBe('Bb4');
    const q = qualityInterval({ from: ['D4'], intervals: ['3m'] })(seeded(1));
    expect(q.steps).toEqual([{ kind: 'exact', midis: [62] }, { kind: 'exact', midis: [65] }]);
    for (let seed = 1; seed < 40; seed++) {
      const c = spellIntervalChoice({ from: ['C4', 'D4', 'E4', 'F#4', 'Bb3'], intervals: ['3m', '3M', '6m', '4A', '5d'] })(seeded(seed));
      expect(c.choices!.length).toBeGreaterThanOrEqual(2);
      expect(new Set(c.choices).size).toBe(c.choices!.length);
      expect(c.answer).toBeGreaterThanOrEqual(0);
    }
    const e = qualityByEar({ from: ['C4'], intervals: ['5J'], answerFrom: ['E4'] })(seeded(1));
    expect(e.steps).toEqual([{ kind: 'exact', midis: [64] }, { kind: 'exact', midis: [71] }]);
    const t = chordQualityByEar({ qualities: ['m'], roots: [57], answerRoots: [62, 64] })(seeded(3));
    const s0 = t.steps[0];
    expect(s0.kind === 'chord' && s0.bass !== undefined && s0.pcs.length === 3).toBe(true);
    expect(s0.kind === 'chord' && (s0.pcs[1] - s0.pcs[0] + 12) % 12).toBe(3);
  });

  it('tercinas: escrita, pauta e partitura', () => {
    const p = parseLine('C4:1/3 D4:1/3 E4:1/3 F4 G4:2', 4);
    expect(p[3].beat).toBe(1);
    const song = { id: 't', title: 't', composer: 'x', bpm: 60, beatsPerBar: 4, fifths: 0, right: 'C4:1/3 D4:1/3 E4:1/3 F4 G4:2', hands: 'direita' as const, pass: { accuracy: 0.85 } };
    const xml = songXml(song);
    expect(xml).toContain('<actual-notes>3</actual-notes>');
    expect(xml.match(/tuplet type="start"/g)).toHaveLength(1);
    expect(xml.match(/tuplet type="stop"/g)).toHaveLength(1);
    expect(xml).toContain('<divisions>12</divisions>');
  });
});

describe('tríades, inversões, condução e 6/8', () => {
  it('soletra tríades e inversões', () => {
    expect(triadSpelling('F#')).toEqual(['F#', 'A#', 'C#']);
    expect(triadSpelling('Bdim')).toEqual(['B', 'D', 'F']);
    expect(triadSpelling('Caug')).toEqual(['C', 'E', 'G#']);
    expect(triadSpelling('Ebm')).toEqual(['Eb', 'Gb', 'Bb']);
    const inv = inversionChord({ chords: ['Dm'], inversions: [1] })(seeded(1));
    expect(inv.symbol).toBe('Dm/F');
    expect(inv.steps[0]).toEqual({ kind: 'chord', pcs: [2, 5, 9], bass: 5 });
    for (let seed = 1; seed < 30; seed++) {
      const c = spellTriadChoice({ chords: ['F#', 'Bb', 'Ebm', 'Bdim', 'Caug', 'A', 'Dm'] })(seeded(seed));
      expect(c.choices!.length).toBeGreaterThanOrEqual(2);
      expect(new Set(c.choices).size).toBe(c.choices!.length);
      expect(c.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('condução de vozes: movimento real, ótimo e julgamento', () => {
    expect(voiceMove([60, 64, 67], [59, 62, 67])).toBe(3);
    expect(optimalMove([60, 64, 67], [7, 11, 2])).toBe(3); // C → G: Si–Ré–Sol
    expect(optimalMove([59, 62, 67], [9, 0, 4])).toBe(5); // G → Am
    expect(nearestVoicing([60, 64, 67], [9, 0, 4])).toEqual([60, 64, 69]);
    const item = chordSequence({ sequences: [{ symbols: ['C', 'G'] }], lead: 2 })(seeded(1));
    let p = pressItem(startItem(), item, 60, [60]);
    p = pressItem(p, item, 64, [60, 64]);
    p = pressItem(p, item, 67, [60, 64, 67]);
    expect(p.step).toBe(1);
    // G em posição fundamental lá em cima: anda demais.
    let far = pressItem(p, item, 67, [67]);
    far = pressItem(far, item, 71, [67, 71]);
    far = pressItem(far, item, 74, [67, 71, 74]);
    expect(far.misses).toBe(1);
    expect(far.why).toMatch(/andou/);
    // Si–Ré–Sol: caminho curto.
    let near = pressItem(p, item, 59, [59]);
    near = pressItem(near, item, 62, [59, 62]);
    near = pressItem(near, item, 67, [59, 62, 67]);
    expect(near.done).toBe(true);
    expect(near.misses).toBe(0);
  });

  it('6/8: tempo em semínima pontuada', () => {
    const t = compoundTask('C4:1 D4:0.5 E4:1.5 | F4:3', { bpm: 60 });
    expect(t.beatsPerBar).toBe(2);
    expect(t.compound).toBe(true);
    expect(t.events.map((e) => e.beat)).toEqual([0, 2 / 3, 1, 2]);
    const r = compoundRhythm(['x x:0.5 x:1.5'], 2, 50)(seeded(1));
    expect(r.events.every((e) => e.midi === null)).toBe(true);
    const xml = songXml({ id: 't', title: 't', composer: 'x', bpm: 90, beatsPerBar: 3, time: { beats: 6, beatType: 8 }, fifths: 0, right: 'C4:1 D4:0.5 E4:1.5', hands: 'direita', pass: { accuracy: 0.85 } });
    expect(xml).toContain('<beats>6</beats><beat-type>8</beat-type>');
    expect(xml).toContain('<beat-unit-dot/><per-minute>60</per-minute>');
  });
});

describe('julgamento', () => {
  const chordItem: Item = { prompt: '', steps: [{ kind: 'chord', pcs: [0, 4, 7], bass: 4 }], skill: 'acorde' };

  it('acorde precisa de todas as notas e do baixo pedido', () => {
    expect(chordMatches({ kind: 'chord', pcs: [0, 4, 7] }, [60, 64, 67])).toBe(true);
    expect(chordMatches({ kind: 'chord', pcs: [0, 4, 7] }, [60, 64, 67, 69])).toBe(false);
    let p = pressItem(startItem(), chordItem, 64, [64]);
    p = pressItem(p, chordItem, 67, [64, 67]);
    expect(p.done).toBe(false);
    p = pressItem(p, chordItem, 72, [64, 67, 72]);
    expect(p.done).toBe(true);
    const wrongBass = pressItem(startItem(), chordItem, 60, [60, 64, 67]);
    expect(wrongBass.misses).toBe(1);
  });

  it('itens: erro, todas as teclas, nota e escolha', () => {
    const all: Item = { prompt: '', steps: [{ kind: 'all', midis: [53, 65] }], skill: 'x' };
    let p = pressItem(startItem(), all, 65, [65]);
    expect(p.done).toBe(false);
    p = pressItem(p, all, 60, [60]);
    expect(p.misses).toBe(1);
    p = pressItem(p, all, 53, [53]);
    expect(p.done).toBe(true);
    const choiceItem: Item = { prompt: '', choices: ['a', 'b'], answer: 1, steps: [], skill: 'x' };
    expect(pressItem(startItem(), choiceItem, 60, [60])).toEqual(startItem());
    expect(scoreItems([{ misses: 0, ms: 1000 }, { misses: 1, ms: 3000 }, { misses: 0, ms: 2000, timedOut: true }])).toEqual({ accuracy: 1 / 3, avgMs: 1000 });
    expect(labelsVisible('fade', [true, true, true, true])).toBe(true);
    expect(labelsVisible('fade', [false, true, true, true, true, true])).toBe(false);
  });

  it('ritmo em qualquer tecla, legato e staccato', () => {
    const task = melodyTask('C4 D4 E4 F4', { bpm: 60 });
    const legato: CourseEvent[] = [60, 62, 64, 65].map((m, i) => ({ midi: m, t: i * 1000 + 10, off: i * 1000 + 1005 }));
    const staccato: CourseEvent[] = [60, 62, 64, 65].map((m, i) => ({ midi: m, t: i * 1000, off: i * 1000 + 300 }));
    expect(judgeTask(task, 60, legato, 100).accuracy).toBeGreaterThan(0.95);
    expect(articulationScore(task, 60, legato, 'legato')).toBe(1);
    expect(articulationScore(task, 60, staccato, 'legato')).toBe(0);
    expect(articulationScore(task, 60, staccato, 'staccato')).toBe(1);
    const rhythm = rhythmTask('x x x x', { bpm: 60 });
    const any = [70, 40, 55, 90].map((m, i) => ({ midi: m, t: i * 1000, off: null }));
    expect(judgeTask(rhythm, 60, any, 100).accuracy).toBe(1);
  });

  it('força: calibração, faixas e crescendo', () => {
    const cal = calibrate([20, 25, 30], [100, 110, 105])!;
    expect(cal).toEqual({ soft: 25, loud: 105 });
    expect(calibrate([60], [65])).toBeNull();
    expect([30, 65, 100].map((v) => levelOf(v, cal))).toEqual(['p', 'mf', 'f']);
    expect(dynamicsScore([30, 45, 60, 80, 100], 'crescendo', cal)).toBe(1);
    expect(dynamicsScore([60, 61, 60, 62], 'crescendo', cal)).toBe(0);
    expect(dynamicsScore([30, 30, 100], 'p', cal)).toBeCloseTo(2 / 3);
  });

  it('pedal direto: desce com o acorde, sobe antes do próximo, nunca preso na pausa', () => {
    const task = melodyTask('C3+E3+G3:2 r:2 | F3+A3+C4:2 G3+B3+D4:2', { bpm: 60 });
    const good = [{ down: true, t: 150 }, { down: false, t: 1500 }, { down: true, t: 4100 }, { down: false, t: 5900 }, { down: true, t: 6150 }, { down: false, t: 7900 }];
    expect(pedalScore(task, 60, good)).toEqual({ score: 1, muddy: 0, stuck: 0, missed: 0, early: 0 });
    const held = [{ down: true, t: 100 }, { down: false, t: 7900 }];
    const s = pedalScore(task, 60, held)!;
    expect(s.stuck).toBe(1);
    expect(s.muddy).toBe(1);
    expect(s.missed).toBe(2);
    expect(pedalScore(task, 60, [])).toBeNull();
    // Pedal legato: troca logo depois de cada acorde novo.
    const flow = melodyTask('C4+E4+G4:2 F4+A4+C5:2 | G4+B4+D5:2 C4+E4+G4:2', { bpm: 60 });
    const legato = [{ down: true, t: 120 }, { down: false, t: 2080 }, { down: true, t: 2200 }, { down: false, t: 4100 }, { down: true, t: 4220 }, { down: false, t: 6090 }, { down: true, t: 6200 }];
    expect(pedalScore(flow, 60, legato, 'legato')).toEqual({ score: 1, muddy: 0, stuck: 0, missed: 0, early: 0 });
    const early = [{ down: true, t: 120 }, { down: false, t: 1800 }, { down: true, t: 2050 }];
    expect(pedalScore(flow, 60, early, 'legato')!.early).toBe(1);
  });

  it('uniformidade (IOI-SD)', () => {
    const task = melodyTask('C4:0.5 D4:0.5 E4:0.5 F4:0.5 G4:0.5 A4:0.5 B4:0.5 C5:0.5', { bpm: 60 });
    const even: CourseEvent[] = [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => ({ midi: m, t: i * 500, off: null }));
    expect(ioiSd(task, 60, even)).toBeCloseTo(0);
    const uneven = even.map((e, i) => ({ ...e, t: e.t + (i % 2 ? 60 : 0) }));
    expect(ioiSd(task, 60, uneven)!).toBeGreaterThan(50);
  });

  it('improviso: notas no conjunto, pausas e nota final', () => {
    const ev: CourseEvent[] = [
      { midi: 66, t: 0, off: 900 },
      { midi: 68, t: 1000, off: 1900 },
      { midi: 60, t: 2000, off: 2900 },
      { midi: 66, t: 6000, off: 7000 },
    ];
    const s = scoreImprov(ev, [1, 3, 6, 8, 10], 60, 2, 4);
    expect(s.inSet).toBe(0.75);
    expect(s.rests).toBe(2);
    expect(s.lastPc).toBe(6);
  });
});

describe('geradores', () => {
  it('intervalo, cifra e grau', () => {
    const rng = seeded(3);
    const it = intervalAbove({ sizes: [3], from: [62] })(rng);
    expect(it.steps).toEqual([{ kind: 'exact', midis: [62] }, { kind: 'exact', midis: [65] }]);
    expect(intervalAbove({ sizes: [5], from: [71] })(rng).steps[1]).toEqual({ kind: 'exact', midis: [77] });
    expect(parseChord('F/A')).toEqual({ root: 5, pcs: [5, 9, 0], bass: 9 });
    expect(parseChord('Bb7M').pcs).toEqual([10, 2, 5, 9]);
    expect(parseChord('Dm7(b5)').pcs).toEqual([2, 5, 8, 0]);
    const chord = playChord({ symbols: ['G7'], low: 48, high: 72 })(rng);
    expect(chord.steps[0]).toEqual({ kind: 'chord', pcs: [7, 11, 2, 5], bass: undefined });
    const d = degreeByEar({ tonic: 60, degrees: [5] })(rng);
    expect(d.steps).toEqual([{ kind: 'pc', pcs: [7] }]);
  });

  it('graus, cadência, harmonização e ditado', () => {
    const rng = seeded(7);
    expect(degreeSymbol('G', 'V7')).toBe('D7');
    expect(degreeSymbol('F', 'IV')).toBe('Bb');
    expect(degreeSymbol('C', 'I')).toBe('C');
    const g7 = playChord({ symbols: ['G7'], low: 48, high: 72, omitFifth: true })(rng).steps[0];
    expect(g7).toEqual({ kind: 'chord', pcs: [7, 11, 2, 5], bass: undefined, optional: [2] });
    if (g7.kind !== 'chord') throw new Error();
    expect(chordMatches(g7, [47, 53, 55])).toBe(true); // Si, Fá, Sol: posição próxima
    expect(chordMatches(g7, [47, 53])).toBe(false);
    expect(chordMatches(g7, [43, 47, 50, 53])).toBe(true);
    const iv = primaryChord({ keys: ['F'], degrees: ['IV'], low: 48, high: 72 })(rng);
    expect(iv.prompt).toBe('Em Fá maior, toque o IV');
    expect(iv.steps[0]).toMatchObject({ kind: 'chord', pcs: [10, 2, 5] });
    const res = resolveCadence({ keys: ['G'], before: [['I', 'V7']] })(rng);
    expect(res.steps[0]).toMatchObject({ kind: 'chord', pcs: [7, 11, 2] });
    expect(res.listen?.steps).toHaveLength(2);
    const h = harmonize({ key: 'C', bars: [{ notes: [65, 69, 72], degree: 'IV' }] })(rng);
    expect(h.staff?.notes).toEqual([65, 69, 72]);
    expect(h.steps[0]).toMatchObject({ pcs: [5, 9, 0] });
    const bass = progressionByEar({ keys: ['C'], progressions: [['I', 'IV', 'V7', 'I']], answer: 'bass' })(rng);
    expect(bass.steps).toEqual([{ kind: 'pc', pcs: [0] }, { kind: 'pc', pcs: [5] }, { kind: 'pc', pcs: [7] }, { kind: 'pc', pcs: [0] }]);
    for (const step of bass.listen!.steps) expect(Math.min(...step.midis)).toBeLessThan(60);
    expect(tonicByEar({ keys: ['D'] })(rng).steps).toEqual([{ kind: 'pc', pcs: [2] }]);
    const sc = buildScale({ keys: ['Bb'], notes: 8 })(rng);
    expect(sc.steps.map((x) => (x.kind === 'exact' ? x.midis[0] : 0))).toEqual([70, 72, 74, 75, 77, 79, 81, 82]);
    expect(sc.hint).toBe('Si♭, Dó, Ré, Mi♭, Fá, Sol, Lá, Si♭');
    expect(buildScale({ keys: ['D'], notes: 4 })(rng).hint).toBe('Ré, Mi, Fá♯, Sol');
    expect(keyFromSignature({ fifths: [2] })(rng).steps).toEqual([{ kind: 'pc', pcs: [2] }]);
    expect(keyFromSignature({ fifths: [-2] })(rng).symbol).toBe('2 bemóis: Si♭, Mi♭');
    const deg = scaleDegreeNote({ keys: ['G'], degrees: [7] })(rng);
    expect(deg.prompt).toBe('Toque a sensível de Sol maior');
    expect(deg.steps).toEqual([{ kind: 'pc', pcs: [6] }]);
    const tp = transposeProgression({ from: 'C', to: ['G'], progressions: [['I', 'IV', 'V7', 'I']] })(rng);
    expect(tp.symbol).toBe('C – F – G7 – C');
    expect(tp.steps.map((x) => (x.kind === 'chord' ? x.pcs : []))).toEqual([[7, 11, 2], [0, 4, 7], [2, 6, 9, 0], [7, 11, 2]]);
  });

  it('intervalos ouvidos, lidos na pauta, tom e semitom', () => {
    const rng = seeded(5);
    expect(whiteAbove(60, 5)).toBe(67);
    expect(whiteAbove(71, 2)).toBe(72);
    expect(whiteAbove(64, 4)).toBe(69);
    expect(() => whiteAbove(61, 3)).toThrow();
    const ear = intervalByEar({ sizes: [5], from: [62], harmonic: true })(rng);
    expect(ear.steps).toEqual([{ kind: 'exact', midis: [62] }, { kind: 'exact', midis: [69] }]);
    expect(ear.listen?.steps[0].midis).toEqual([62, 69]);
    const read = readInterval({ sizes: [3], from: [55], clef: 'bass' })(rng);
    expect(read.staff).toEqual({ notes: [55, 59], clef: 'bass' });
    const up = toneOrSemitone({ from: [64], kinds: ['semitom'], dirs: ['acima'] })(rng);
    expect(up.steps[1]).toEqual({ kind: 'exact', midis: [65] });
    const down = toneOrSemitone({ from: [60], kinds: ['tom'], dirs: ['abaixo'] })(rng);
    expect(down.prompt).toBe('Toque um tom abaixo de Dó');
    expect(down.steps[1]).toEqual({ kind: 'exact', midis: [58] });
  });
});

// ---------- conteúdo: toda unidade escrita passa por aqui ----------

function checkItem(item: Item, where: string, range?: [number, number]) {
  if (item.choices) {
    expect(item.answer, where).toBeGreaterThanOrEqual(0);
    expect(item.answer!, where).toBeLessThan(item.choices.length);
    return;
  }
  expect(item.steps.length, where).toBeGreaterThan(0);
  for (const s of item.steps) {
    if ((s.kind === 'exact' || s.kind === 'all') && range) for (const m of s.midis) expect(m >= range[0] && m <= range[1], `${where}: tecla ${m} fora do teclado mostrado`).toBe(true);
  }
}

function checkExercise(ex: Exercise, where: string) {
  for (let seed = 1; seed <= 25; seed++) {
    const rng = seeded(seed);
    if (ex.kind === 'items') checkItem(ex.gen(rng), `${where} (semente ${seed})`, [ex.low, ex.high]);
    if (ex.kind === 'timed') {
      const t = ex.gen(rng);
      expect(t.events.length, where).toBeGreaterThan(0);
      expect(t.display.length, where).toBeGreaterThan(0);
      for (const e of t.events) if (e.midi !== null) expect(e.midi >= t.low && e.midi <= t.high, `${where}: nota ${e.midi} fora do teclado`).toBe(true);
    }
    if (ex.kind === 'dynamics') for (const a of ex.gen(rng)) expect(a.midi >= ex.low && a.midi <= ex.high, where).toBe(true);
  }
  if (ex.kind === 'quiz') for (const q of ex.questions) expect(q.answer < q.options.length, where).toBe(true);
}

describe.each(UNITS.map((u) => [u.n, u] as [number, Unit]))('unidade %i', (_n, unit) => {
  it('estrutura: ids únicos, números em sequência, projeto final existe', () => {
    const ids = unit.lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    unit.lessons.forEach((l, i) => {
      if (i > 0) expect(l.n).toBe(unit.lessons[i - 1].n + 1);
      expect(l.objectives.length).toBeGreaterThan(0);
      expect(l.checkpoint.length).toBeGreaterThan(0);
      const blockIds = l.blocks.flatMap((b) => (b.kind === 'exercise' ? [b.id] : []));
      expect(new Set(blockIds).size, l.id).toBe(blockIds.length);
      expect(l.blocks.some((b) => b.kind === 'text'), `${l.id} sem teoria`).toBe(true);
    });
    expect(unit.songs.some((s) => s.id === unit.final.songId)).toBe(true);
    for (const l of unit.lessons) for (const b of l.blocks) if (b.kind === 'song') expect(unit.songs.some((s) => s.id === b.songId), `${l.id}: música ${b.songId}`).toBe(true);
  });

  it('músicas: compassos fechados e MusicXML gerado', () => {
    for (const s of unit.songs) {
      expect(() => checkSong(s), s.id).not.toThrow();
      expect(songXml(s)).toContain('<score-partwise');
    }
  });

  it('exercícios e geradores produzem instâncias válidas', () => {
    for (const l of unit.lessons) {
      const where = `${unit.id}/${l.id}`;
      for (const b of l.blocks) if (b.kind === 'exercise') checkExercise(b.exercise, `${where}/${b.id}`);
      l.checkpoint.forEach((ex, i) => checkExercise(ex, `${where}/checkpoint ${i + 1}`));
      if (l.project?.exercise) checkExercise(l.project.exercise, `${where}/projeto`);
      const gens: ItemGen[] = [...l.review, ...l.exit];
      for (const g of gens) for (let seed = 1; seed <= 25; seed++) checkItem(g(seeded(seed)), `${where} revisão/saída`);
    }
  });
});

describe('progresso do curso', () => {
  const unit = UNITS[0];
  const k = (i: number) => lessonKey(unit, unit.lessons[i]);
  const passed = (i: number, at: number): LessonProgress => ({ id: k(i), status: 'learned', updatedAt: at + 1, passedAt: at + 1, checkpoint: 0.9 });

  it('lições abrem em ordem e o checkpoint conclui e dá o selo', () => {
    const rows = rowsById([passed(0, 0)]);
    expect(lessonState(unit, 0, rows, true)).toBe('concluida');
    expect(lessonState(unit, 1, rows, true)).toBe('nova');
    expect(lessonState(unit, 2, rows, true)).toBe('bloqueada');
    const failed = afterCheckpoint(undefined, k(1), 0.7, 1000);
    expect(failed.passedAt).toBeUndefined();
    expect(failed.checkpoint).toBe(0.7);
    const ok = afterCheckpoint(failed, k(1), 0.9, 2000);
    expect(ok.passedAt).toBe(2000);
    expect(canMaster(ok, 2000 + 3 * DAY)).toBe(false);
    expect(afterCheckpoint(ok, k(1), 0.95, 2000 + 3 * DAY).masteredAt).toBeUndefined();
    expect(afterCheckpoint(ok, k(1), 0.95, 2000 + 8 * DAY).masteredAt).toBe(2000 + 8 * DAY);
  });

  it('unidade fecha com todas as lições e a música final; próxima lição', () => {
    const all = rowsById(unit.lessons.map((_, i) => passed(i, i)));
    const songRun: TrainingRun = { treinoId: `curso-${unit.final.songId}`, kind: 'timed', at: 99, day: '2026-10-08', passed: true };
    expect(unitComplete(unit, all, [])).toBe(false);
    expect(unitComplete(unit, all, [songRun])).toBe(true);
    expect(nextLesson(UNITS, rowsById([passed(0, 0)]), [])?.lesson.id).toBe(unit.lessons[1].id);
  });

  it('música aprovada só inteira, nas mãos e no BPM pedidos', () => {
    const song = unit.songs.find((s) => s.id === unit.final.songId)!;
    const take = { bpm: song.bpm, accuracy: 0.9, hand: song.hands, from: 1, to: 16, bars: 16 };
    expect(songPassed(song, take)).toBe(true);
    expect(songPassed(song, { ...take, bpm: song.bpm - 10 })).toBe(false);
    expect(songPassed(song, { ...take, to: 8 })).toBe(false);
    expect(songPassed(song, { ...take, accuracy: 0.8 })).toBe(false);
  });

  it('aquecimento usa só lições anteriores já concluídas', () => {
    const rows = rowsById([passed(0, 0), passed(1, 0)]);
    const pos = { unit, unitIndex: 0, lesson: unit.lessons[2], lessonIndex: 2 };
    const items = warmupItems(UNITS, rows, pos, seeded(1), 10 * DAY);
    expect(items).toHaveLength(6);
    expect(items.every((x) => x.key === k(0) || x.key === k(1))).toBe(true);
    expect(warmupItems(UNITS, rowsById([]), pos, seeded(1), 0)).toEqual([]);
  });
});
