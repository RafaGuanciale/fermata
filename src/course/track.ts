// O Treino diário, ligado ao curso: para cada unidade, um aquecimento físico, a técnica da unidade
// (escada de andamento que continua de onde você parou), leitura à primeira vista e ouvido.
// A revisão espaçada das lições entra junto (progress.ts → warmupItems). Puro e testado (track.test.ts).
// As metas técnicas seguem a tabela do PLANO (docs/curso/PLANO.md), com referência no RCM.

import type { TrainingRun } from '../db/db';
import type { Clef, Midi } from '../music/notes';
import { chordQualityByEar, degreeByEar, diatonicByEar, intervalByEar, progressionByEar, qualityByEar } from './gens';
import { pick } from './music';
import { sightReadingTask, sightReadingTwoHands } from './tasks';
import type { Exercise, ItemGen, Rng, TimedTask } from './types';

type Hands = 'direita' | 'esquerda' | 'duas' | 'contrario';

export interface TechItem {
  /** Estável: vira o id do registro de treino ("tec-<id>"). */
  id: string;
  title: string;
  how: string;
  gen: (rng: Rng) => TimedTask;
  /** Escada: começa em `from`, sobe `step` a cada passada boa, até `target`. */
  from: number;
  target: number;
  step: number;
  /** Uniformidade exigida (IOI-SD em ms), para escalas e arpejos. */
  evenness?: number;
  articulation?: 'legato' | 'staccato';
}

export interface DailyTrack {
  unit: number;
  /** Meta técnica da unidade, uma frase. */
  goal: string;
  warmup: Exercise[];
  technique: TechItem[];
  reading: Exercise;
  ear: Exercise;
}

// ---------- linhas técnicas ----------

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
const CHROMATIC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Sobe `octaves` oitavas pela escala e desce de volta à tônica. */
export function scaleUpDown(tonic: Midi, steps: number[], octaves: number): Midi[] {
  const up: Midi[] = [];
  for (let o = 0; o < octaves; o++) for (const s of steps) up.push(tonic + 12 * o + s);
  up.push(tonic + 12 * octaves);
  return [...up, ...up.slice(0, -1).reverse()];
}

/** Pentacorde (5 primeiras notas da escala) subindo e descendo. */
export function pentachord(tonic: Midi, steps: number[] = MAJOR): Midi[] {
  const five = steps.slice(0, 5).map((s) => tonic + s);
  return [...five, ...five.slice(0, -1).reverse()];
}

/** Arpejo da tríade (ou tétrade) em `octaves` oitavas, subindo e descendo. */
export function arpeggio(tonic: Midi, chord: number[], octaves: number): Midi[] {
  const up: Midi[] = [];
  for (let o = 0; o < octaves; o++) for (const s of chord) up.push(tonic + 12 * o + s);
  up.push(tonic + 12 * octaves);
  return [...up, ...up.slice(0, -1).reverse()];
}

/** Baixo de Alberti (1-5-3-5) sobre uma lista de acordes em posição fechada, em colcheias. */
export function alberti(chords: Midi[][]): Midi[] {
  return chords.flatMap(([a, b, c]) => [a, c, b, c, a, c, b, c]);
}

function roundRange(midis: Midi[]): [Midi, Midi] {
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const low = lo - (lo % 12);
  let high = hi + ((12 - (hi % 12)) % 12);
  if (high - low < 12) high = low + 12;
  return [Math.max(21, low), Math.min(108, high)];
}

/**
 * Uma linha técnica no tempo. A última nota completa o compasso.
 * `hands`: direita (como escrita), esquerda (uma oitava abaixo, clave de fá), duas (esquerda uma oitava abaixo, em paralelo)
 * ou contrário (as mãos saem da mesma nota em direções opostas).
 */
export function lineTask(midis: Midi[], dur: number, opts: { bpm: number; hands: Hands; fifths?: number; beatsPerBar?: number; caption?: string }): TimedTask {
  const bpb = opts.beatsPerBar ?? 4;
  const right = opts.hands === 'esquerda' ? midis.map((m) => m - 12) : midis;
  const durs = midis.map(() => dur);
  const total = dur * midis.length;
  const fill = Math.ceil((total - 1e-9) / bpb) * bpb - (total - dur);
  durs[durs.length - 1] = Math.max(dur, fill);
  let beat = 0;
  const starts = durs.map((d) => {
    const b = beat;
    beat += d;
    return b;
  });
  const events = right.map((m, i) => ({ midi: m, beat: starts[i], beats: durs[i] }));
  if (opts.hands === 'duas') events.push(...midis.map((m, i) => ({ midi: m - 12, beat: starts[i], beats: durs[i] })));
  if (opts.hands === 'contrario') events.push(...midis.map((m, i) => ({ midi: 2 * midis[0] - m - 12, beat: starts[i], beats: durs[i] })));
  events.sort((a, b) => a.beat - b.beat);
  const clef: Clef = opts.hands === 'esquerda' ? 'bass' : 'treble';
  const [low, high] = roundRange(events.map((e) => e.midi));
  return {
    display: right.map((m, i) => ({ midi: m, beats: durs[i] })),
    clef,
    events,
    beatsPerBar: bpb,
    bpm: opts.bpm,
    low,
    high,
    fifths: opts.fifths,
    caption: opts.caption,
  };
}

// ---------- tonalidades usadas no trilho ----------

interface Key {
  name: string;
  tonic: Midi;
  fifths: number;
}

const C: Key = { name: 'Dó maior', tonic: 60, fifths: 0 };
const G: Key = { name: 'Sol maior', tonic: 55, fifths: 1 };
const F: Key = { name: 'Fá maior', tonic: 53, fifths: -1 };
const D: Key = { name: 'Ré maior', tonic: 62, fifths: 2 };
const BB: Key = { name: 'Si♭ maior', tonic: 58, fifths: -2 };
const A_MIN: Key = { name: 'Lá menor', tonic: 57, fifths: 0 };
const E_MIN: Key = { name: 'Mi menor', tonic: 52, fifths: 1 };
const D_MIN: Key = { name: 'Ré menor', tonic: 50, fifths: -1 };

const HAND_LABEL: Record<Hands, string> = { direita: 'mão direita', esquerda: 'mão esquerda', duas: 'mãos juntas', contrario: 'mãos juntas em movimento contrário' };
const DUR_LABEL: Record<string, string> = { '1': 'semínimas', '0.5': 'colcheias', '0.25': 'semicolcheias' };

/** Item de escala em uma tonalidade sorteada a cada passada. */
function scaleItem(id: string, keys: Key[], opts: { octaves: number; dur: number; hands: Hands; from: number; target: number; minor?: boolean; evenness?: number }): TechItem {
  const names = keys.map((k) => k.name).join(', ');
  return {
    id,
    title: `Escala${opts.minor ? ' menor harmônica' : ''}, ${opts.octaves} oitava${opts.octaves > 1 ? 's' : ''}, ${HAND_LABEL[opts.hands]}`,
    how: `${DUR_LABEL[String(opts.dur)] ?? 'tercinas'}, tonalidade sorteada entre ${names}. Mão direita com o polegar passando por baixo; o app mede o tempo e a uniformidade.`,
    gen: (rng) => {
      const k = pick(rng, keys);
      // Mãos juntas: a direita uma oitava acima para as mãos não se cruzarem.
      const tonic = opts.hands === 'duas' || opts.hands === 'contrario' ? k.tonic + 12 : k.tonic;
      const steps = opts.minor || k.name.includes('menor') ? HARMONIC_MINOR : MAJOR;
      return lineTask(scaleUpDown(tonic, steps, opts.octaves), opts.dur, { bpm: opts.from, hands: opts.hands, fifths: k.fifths, caption: k.name });
    },
    from: opts.from,
    target: opts.target,
    step: 4,
    evenness: opts.evenness,
  };
}

function pentaItem(id: string, keys: Key[], hands: Hands, dur: number, from: number, target: number, articulation?: 'legato' | 'staccato'): TechItem {
  return {
    id,
    title: `Pentacorde, ${HAND_LABEL[hands]}${articulation ? `, ${articulation}` : ''}`,
    how: `Cinco notas subindo e descendo em ${DUR_LABEL[String(dur)]}, em ${keys.map((k) => k.name).join(', ')}. Mão parada, um dedo por tecla.`,
    gen: (rng) => {
      const k = pick(rng, keys);
      const minor = k.name.includes('menor');
      const tonic = hands === 'esquerda' ? k.tonic : k.tonic < 60 ? k.tonic + 12 : k.tonic;
      return lineTask(pentachord(tonic, minor ? HARMONIC_MINOR : MAJOR), dur, { bpm: from, hands, fifths: k.fifths, caption: k.name });
    },
    from,
    target,
    step: 4,
    articulation,
  };
}

function arpItem(id: string, keys: Key[], hands: Hands, from: number, target: number, chord?: { name: string; steps: number[] }): TechItem {
  return {
    id,
    title: `Arpejo${chord ? ` de ${chord.name}` : ''}, 2 oitavas, ${HAND_LABEL[hands]}`,
    how: 'Tercinas: três notas por tempo. Deixe o braço levar a mão de uma posição à outra, sem esticar os dedos.',
    gen: (rng) => {
      const k = pick(rng, keys);
      const steps = chord?.steps ?? (k.name.includes('menor') ? [0, 3, 7] : [0, 4, 7]);
      return lineTask(arpeggio(k.tonic, steps, 2), 1 / 3, { bpm: from, hands, fifths: k.fifths, caption: `${k.name}${chord ? `, ${chord.name}` : ''}` });
    },
    from,
    target,
    step: 4,
    evenness: 35,
  };
}

const chromaticItem = (from: number, target: number): TechItem => ({
  id: 'cromatica-md',
  title: 'Escala cromática, 1 oitava, mão direita',
  how: 'Todas as teclas, brancas e pretas, em colcheias. Dedilhado: 3 nas pretas, 1 nas brancas (2 em Mi–Fá e Si–Dó).',
  gen: () => lineTask(scaleUpDown(60, CHROMATIC, 1), 0.5, { bpm: from, hands: 'direita' }),
  from,
  target,
  step: 4,
  evenness: 35,
});

const albertiItem = (from: number, target: number): TechItem => ({
  id: 'alberti-me',
  title: 'Baixo de Alberti, mão esquerda',
  how: 'Dó, Fá, Sol e Dó em Alberti (1-5-3-5), colcheias. Leve e igual: é acompanhamento.',
  gen: () => {
    const t = lineTask(alberti([[48, 52, 55], [48, 53, 57], [47, 50, 55], [48, 52, 55]]), 0.5, { bpm: from, hands: 'direita' });
    return { ...t, clef: 'bass' };
  },
  from,
  target,
  step: 4,
  evenness: 35,
});

const touchesItem: TechItem = {
  id: 'toques-md',
  title: 'Toques iguais, mão direita',
  how: 'Cada nota da posição de Dó quatro vezes, com o mesmo volume e o mesmo espaço entre elas.',
  gen: () => lineTask([60, 60, 60, 60, 62, 62, 62, 62, 64, 64, 64, 64, 65, 65, 65, 65, 67, 67, 67, 67, 60], 1, { bpm: 60, hands: 'direita' }),
  from: 60,
  target: 100,
  step: 4,
};

// ---------- aquecimento, leitura e ouvido ----------

const warm = (title: string, gen: (rng: Rng) => TimedTask): Exercise => ({
  kind: 'timed', title, how: 'Devagar e solto. É para acordar as mãos, não para medir velocidade.', gen, reps: 1, window: 120, pass: { accuracy: 0.7 },
});

const readingEx = (gen: (rng: Rng) => TimedTask, how: string): Exercise => ({
  kind: 'timed', title: 'Leitura à primeira vista', how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 },
});

const earEx = (gen: ItemGen, how: string): Exercise => ({
  kind: 'items', title: 'Ouvido', how, gen, count: 6, low: 36, high: 84, labels: 'off', pass: { accuracy: 0.8 },
});

const readKeys = (keys: Key[]) => (rng: Rng) => pick(rng, keys);

// ---------- o trilho de cada unidade ----------

const TRACKS: DailyTrack[] = [
  {
    unit: 1,
    goal: 'Pentacordes da posição de Dó em semínimas, legato, de 60 rumo a 100 BPM.',
    warmup: [warm('Pentacorde, mão direita', () => lineTask(pentachord(60), 1, { bpm: 60, hands: 'direita' })), warm('Pentacorde, mão esquerda', () => lineTask(pentachord(48), 1, { bpm: 60, hands: 'direita' }))],
    technique: [pentaItem('penta-do-md', [C], 'direita', 1, 60, 100, 'legato'), pentaItem('penta-do-me', [{ ...C, tonic: 48 }], 'esquerda', 1, 60, 100, 'legato'), touchesItem],
    reading: readingEx((rng) => sightReadingTask(rng, { tonic: 60, bars: 4, bpm: 60 }), '4 compassos novos na posição de Dó, clave de sol. Não pare: errou, siga no tempo.'),
    ear: earEx(degreeByEar({ tonic: 60, degrees: [1, 3, 5] }), 'Depois da cadência, toque a nota: 1, 3 ou 5.'),
  },
  {
    unit: 2,
    goal: 'Pentacordes em Dó, Sol, Ré e Lá menor, mãos separadas, rumo a 100 BPM.',
    warmup: [warm('Pentacorde em Sol', () => lineTask(pentachord(67), 1, { bpm: 60, hands: 'direita', fifths: 1 })), warm('Pentacorde, mãos juntas', () => lineTask(pentachord(60), 1, { bpm: 56, hands: 'duas' }))],
    technique: [pentaItem('penta-tons-md', [C, { ...G, tonic: 67 }, D, { ...A_MIN, tonic: 69 }], 'direita', 1, 60, 100), pentaItem('penta-tons-me', [{ ...C, tonic: 48 }, G, { ...D, tonic: 50 }, A_MIN], 'esquerda', 1, 60, 100)],
    reading: readingEx((rng) => (rng() < 0.5 ? sightReadingTask(rng, { tonic: 60, bars: 4, bpm: 60 }) : sightReadingTask(rng, { tonic: 48, bars: 4, bpm: 60, clef: 'bass' })), '4 compassos novos, ora na clave de sol, ora na de fá.'),
    ear: earEx(intervalByEar({ sizes: [2, 3, 4, 5], from: [60, 62, 64, 65, 67] }), 'O app toca um intervalo; toque as duas notas.'),
  },
  {
    unit: 3,
    goal: 'Pentacordes em colcheias a 60 BPM e tríades quebradas em tercinas a 50 BPM.',
    warmup: [warm('Pentacorde em colcheias', () => lineTask(pentachord(60), 0.5, { bpm: 52, hands: 'direita' })), warm('Pentacorde, mãos juntas', () => lineTask(pentachord(60), 1, { bpm: 60, hands: 'duas' }))],
    technique: [pentaItem('penta-colcheias', [C, { ...G, tonic: 67 }, { ...F, tonic: 65 }], 'direita', 0.5, 44, 60), arpItem('triade-quebrada', [C, { ...F, tonic: 65 }, { ...G, tonic: 67 }], 'direita', 40, 50)],
    reading: readingEx((rng) => sightReadingTwoHands(rng, { tonic: 60, bars: 4, bpm: 60 }), '4 compassos com as duas mãos: melodia na direita, tônica ou dominante na esquerda.'),
    ear: earEx(progressionByEar({ keys: ['C'], progressions: [['I', 'IV', 'V7', 'I'], ['I', 'V7', 'I', 'I'], ['I', 'IV', 'I', 'V7']], answer: 'bass' }), 'O app toca 4 acordes; toque o baixo de cada um.'),
  },
  {
    unit: 4,
    goal: 'Escalas maiores de 1 oitava, mãos separadas, em colcheias a 60 BPM; Dó em movimento contrário.',
    warmup: [warm('Escala de Dó, mão direita', () => lineTask(scaleUpDown(60, MAJOR, 1), 1, { bpm: 60, hands: 'direita' })), warm('Escala de Dó, mão esquerda', () => lineTask(scaleUpDown(60, MAJOR, 1), 1, { bpm: 60, hands: 'esquerda' }))],
    technique: [
      scaleItem('escala-1-md', [C, { ...G, tonic: 67 }, { ...F, tonic: 65 }, D, { ...BB, tonic: 70 }], { octaves: 1, dur: 0.5, hands: 'direita', from: 44, target: 60, evenness: 40 }),
      scaleItem('escala-1-me', [{ ...C, tonic: 60 }, { ...G, tonic: 55 }, { ...F, tonic: 53 }, { ...D, tonic: 62 }, BB], { octaves: 1, dur: 0.5, hands: 'esquerda', from: 44, target: 60, evenness: 40 }),
      scaleItem('escala-contraria', [C], { octaves: 1, dur: 0.5, hands: 'contrario', from: 44, target: 60, evenness: 40 }),
    ],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 4, bpm: 60, fifths: k.fifths });
    }, '4 compassos com as duas mãos, com armadura até 2 sustenidos ou 2 bemóis.'),
    ear: earEx(degreeByEar({ tonic: 60, degrees: [1, 2, 3, 4, 5, 6] }), 'Depois da cadência, toque o grau que ouviu (1 a 6).'),
  },
  {
    unit: 5,
    goal: 'Escalas menores harmônicas, 2 oitavas, mãos separadas, rumo a 69 BPM em colcheias.',
    warmup: [warm('Lá menor harmônica, 1 oitava', () => lineTask(scaleUpDown(57, HARMONIC_MINOR, 1), 1, { bpm: 60, hands: 'direita' })), warm('Escala de Sol, mãos juntas', () => lineTask(scaleUpDown(67, MAJOR, 1), 1, { bpm: 56, hands: 'duas', fifths: 1 }))],
    technique: [
      scaleItem('menor-2-md', [{ ...A_MIN, tonic: 57 }, { ...E_MIN, tonic: 52 }, { ...D_MIN, tonic: 62 }], { octaves: 2, dur: 0.5, hands: 'direita', minor: true, from: 50, target: 69, evenness: 40 }),
      scaleItem('menor-2-me', [A_MIN, E_MIN, D_MIN], { octaves: 2, dur: 0.5, hands: 'esquerda', minor: true, from: 50, target: 69, evenness: 40 }),
    ],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 60, fifths: k.fifths });
    }, '8 compassos com as duas mãos. Leia 30 segundos antes de tocar.'),
    ear: earEx(qualityByEar({ from: ['C4', 'D4', 'F4', 'G4'], intervals: ['3m', '3M', '4J', '5J', '6m', '6M'] }), 'O app toca um intervalo; toque o mesmo intervalo.'),
  },
  {
    unit: 6,
    goal: 'Escalas de 2 oitavas mãos separadas a 80 BPM em colcheias e a escala cromática.',
    warmup: [warm('Arpejo de Dó, 1 oitava', () => lineTask(arpeggio(60, [0, 4, 7], 1), 1, { bpm: 60, hands: 'direita' })), warm('Escala de Dó, mãos juntas', () => lineTask(scaleUpDown(72, MAJOR, 1), 1, { bpm: 60, hands: 'duas' }))],
    technique: [
      scaleItem('escala-2-md', [C, { ...G, tonic: 55 }, { ...F, tonic: 53 }, D, BB], { octaves: 2, dur: 0.5, hands: 'direita', from: 56, target: 80, evenness: 35 }),
      scaleItem('escala-2-me', [{ ...C, tonic: 48 }, { ...G, tonic: 43 }, { ...F, tonic: 41 }, { ...D, tonic: 50 }, { ...BB, tonic: 46 }].map((k) => ({ ...k, tonic: k.tonic + 12 })), { octaves: 2, dur: 0.5, hands: 'esquerda', from: 56, target: 80, evenness: 35 }),
      chromaticItem(50, 69),
    ],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 66, fifths: k.fifths });
    }, '8 compassos com as duas mãos a 66 BPM.'),
    ear: earEx(chordQualityByEar({ qualities: ['', 'm', 'dim', 'aug'], roots: [57, 60, 62, 64, 65, 67], answerRoots: [60, 62, 64, 65, 67, 69] }), 'O app toca uma tríade; toque uma da mesma qualidade sobre outra nota.'),
  },
  {
    unit: 7,
    goal: 'Escalas de 2 oitavas com as mãos juntas, rumo a 80 BPM em colcheias.',
    warmup: [warm('Escala de Dó, mãos juntas', () => lineTask(scaleUpDown(72, MAJOR, 1), 0.5, { bpm: 56, hands: 'duas' })), warm('Cromática, mão direita', () => lineTask(scaleUpDown(60, CHROMATIC, 1), 0.5, { bpm: 50, hands: 'direita' }))],
    technique: [scaleItem('escala-2-mj', [C, G, F, A_MIN].map((k) => ({ ...k, tonic: k.tonic < 60 ? k.tonic : k.tonic - 12 })), { octaves: 2, dur: 0.5, hands: 'duas', minor: false, from: 56, target: 80, evenness: 35 })],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 72, fifths: k.fifths });
    }, '8 compassos com as duas mãos a 72 BPM.'),
    ear: earEx(diatonicByEar({ keys: ['C', 'G', 'F'], progressions: [['I', 'vi', 'IV', 'V'], ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['IV', 'V', 'iii', 'vi']], answer: 'bass' }), 'O app toca 4 acordes do campo; toque o baixo de cada um.'),
  },
  {
    unit: 8,
    goal: 'Arpejos de 2 oitavas, mãos separadas, rumo a 72 BPM em tercinas.',
    warmup: [warm('Escala de Sol, mãos juntas', () => lineTask(scaleUpDown(67, MAJOR, 1), 0.5, { bpm: 60, hands: 'duas', fifths: 1 })), warm('Arpejo de Dó, 1 oitava', () => lineTask(arpeggio(60, [0, 4, 7], 1), 1, { bpm: 66, hands: 'direita' }))],
    technique: [arpItem('arpejo-md', [C, { ...G, tonic: 55 }, { ...F, tonic: 53 }, A_MIN], 'direita', 50, 72), arpItem('arpejo-me', [C, G, F, A_MIN], 'esquerda', 50, 72), scaleItem('escala-2-mj-b', [C, G, F, A_MIN].map((k) => ({ ...k, tonic: k.tonic < 60 ? k.tonic : k.tonic - 12 })), { octaves: 2, dur: 0.5, hands: 'duas', from: 64, target: 84, evenness: 35 })],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 72, fifths: k.fifths });
    }, '8 compassos com as duas mãos a 72 BPM.'),
    ear: earEx(chordQualityByEar({ qualities: ['7M', '7', 'm7', 'ø', '°7'], roots: [57, 60, 62, 64, 65, 67], answerRoots: [60, 62, 64, 65, 67, 69] }), 'O app toca uma tétrade; toque uma da mesma qualidade sobre outra nota.'),
  },
  {
    unit: 9,
    goal: 'Escalas de 2 oitavas mãos juntas a 92–104 BPM e baixo de Alberti.',
    warmup: [warm('Arpejo de Dó, 2 oitavas', () => lineTask(arpeggio(60, [0, 4, 7], 2), 1 / 3, { bpm: 50, hands: 'direita' })), warm('Escala de Ré, mãos juntas', () => lineTask(scaleUpDown(62, MAJOR, 1), 0.5, { bpm: 66, hands: 'duas', fifths: 2 }))],
    technique: [scaleItem('escala-2-mj-c', [C, G, D, F, BB].map((k) => ({ ...k, tonic: k.tonic < 60 ? k.tonic : k.tonic - 12 })), { octaves: 2, dur: 0.5, hands: 'duas', from: 72, target: 104, evenness: 30 }), albertiItem(60, 100)],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 80, fifths: k.fifths });
    }, '8 compassos com as duas mãos a 80 BPM.'),
    ear: earEx(diatonicByEar({ keys: ['C', 'G', 'D', 'F'], progressions: [['I', 'ii', 'V', 'I'], ['I', 'IV', 'ii', 'V'], ['vi', 'ii', 'V', 'I'], ['I', 'iii', 'IV', 'V']], answer: 'bass' }), 'O app toca 4 acordes; toque o baixo de cada um.'),
  },
  {
    unit: 10,
    goal: 'Arpejos de tônica, V7 e diminuta, mãos separadas, rumo a 92 BPM.',
    warmup: [warm('Escala de Dó, 2 oitavas, mãos juntas', () => lineTask(scaleUpDown(48, MAJOR, 2), 0.5, { bpm: 72, hands: 'duas' })), warm('Alberti', () => ({ ...lineTask(alberti([[48, 52, 55], [47, 50, 55]]), 0.5, { bpm: 72, hands: 'direita' }), clef: 'bass' as Clef }))],
    technique: [arpItem('arpejo-v7', [{ ...G, tonic: 55 }, { ...C, tonic: 48 }, { ...F, tonic: 53 }], 'direita', 60, 92, { name: 'dominante com sétima', steps: [0, 4, 7, 10] }), arpItem('arpejo-dim7', [{ ...C, tonic: 59 }, { ...C, tonic: 61 }, { ...C, tonic: 62 }], 'direita', 60, 92, { name: 'diminuta com sétima', steps: [0, 3, 6, 9] }), arpItem('arpejo-mj', [C, G, F], 'duas', 50, 72)],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 84, fifths: k.fifths });
    }, '8 compassos com as duas mãos a 84 BPM.'),
    ear: earEx(chordQualityByEar({ qualities: ['7M', '7', 'm7', 'ø', '°7'], roots: [55, 57, 60, 62, 64], answerRoots: [60, 62, 65, 67, 69] }), 'O app toca uma tétrade; toque uma da mesma qualidade sobre outra nota.'),
  },
  {
    unit: 11,
    goal: 'Escalas de 2 oitavas mãos juntas em semicolcheias, rumo a 60 BPM.',
    warmup: [warm('Arpejo de V7 em Dó', () => lineTask(arpeggio(55, [0, 4, 7, 10], 1), 0.5, { bpm: 66, hands: 'direita' })), warm('Escala de Sol, mãos juntas', () => lineTask(scaleUpDown(55, MAJOR, 2), 0.5, { bpm: 80, hands: 'duas', fifths: 1 }))],
    technique: [scaleItem('escala-semicolcheias', [C, G, D, F, BB].map((k) => ({ ...k, tonic: k.tonic < 60 ? k.tonic : k.tonic - 12 })), { octaves: 2, dur: 0.25, hands: 'duas', from: 44, target: 60, evenness: 25 }), arpItem('arpejo-mj-b', [C, G, F, A_MIN], 'duas', 56, 80)],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 88, fifths: k.fifths });
    }, '8 compassos com as duas mãos a 88 BPM.'),
    ear: earEx(diatonicByEar({ keys: ['C', 'F', 'G', 'Bb'], progressions: [['ii7', 'V7', 'I7M', 'I7M'], ['I7M', 'vi7', 'ii7', 'V7'], ['iii7', 'vi7', 'ii7', 'V7']], answer: 'bass' }), 'O app toca 4 tétrades; toque o baixo de cada uma.'),
  },
  {
    unit: 12,
    goal: 'Escalas em semicolcheias mãos juntas rumo a 76 BPM e arpejos com as duas mãos.',
    warmup: [warm('Escala de Ré, 2 oitavas, mãos juntas', () => lineTask(scaleUpDown(50, MAJOR, 2), 0.5, { bpm: 88, hands: 'duas', fifths: 2 })), warm('Arpejo diminuto', () => lineTask(arpeggio(59, [0, 3, 6, 9], 1), 0.5, { bpm: 72, hands: 'direita' }))],
    technique: [scaleItem('escala-semicolcheias-b', [C, G, D, F, BB, A_MIN].map((k) => ({ ...k, tonic: k.tonic < 60 ? k.tonic : k.tonic - 12 })), { octaves: 2, dur: 0.25, hands: 'duas', from: 56, target: 76, evenness: 22 }), arpItem('arpejo-mj-c', [C, G, D, F, A_MIN], 'duas', 64, 88)],
    reading: readingEx((rng) => {
      const k = readKeys([C, G, F, D, BB])(rng);
      return sightReadingTwoHands(rng, { tonic: k.tonic < 60 ? k.tonic + 12 : k.tonic, bars: 8, bpm: 92, fifths: k.fifths });
    }, '8 compassos com as duas mãos a 92 BPM.'),
    ear: earEx(diatonicByEar({ keys: ['C', 'F', 'G', 'Bb', 'D'], progressions: [['ii7', 'V7', 'I7M', 'vi7'], ['I7M', 'IV7M', 'iii7', 'vi7'], ['ii7', 'V7', 'iii7', 'vi7']], answer: 'bass' }), 'O app toca 4 tétrades; toque o baixo de cada uma.'),
  },
];

export function trackFor(unit: number): DailyTrack {
  return TRACKS[Math.min(TRACKS.length, Math.max(1, unit)) - 1];
}

export const ALL_TRACKS = TRACKS;

// ---------- escada de andamento que continua de um dia para o outro ----------

export const techRunId = (item: TechItem) => `tec-${item.id}`;

/** Maior BPM com passada boa neste item (ou null). */
export function bestTechBpm(item: TechItem, runs: TrainingRun[]): number | null {
  const ok = runs.filter((r) => r.treinoId === techRunId(item) && r.clean && r.bpm);
  return ok.length ? Math.max(...ok.map((r) => r.bpm!)) : null;
}

/** Onde a escada começa hoje: um degrau abaixo do melhor (para aquecer), nunca abaixo do início nem acima do alvo. */
export function techStartBpm(item: TechItem, runs: TrainingRun[]): number {
  const best = bestTechBpm(item, runs);
  if (best === null) return item.from;
  return Math.min(item.target, Math.max(item.from, best - item.step));
}

export type TechStatus = 'novo' | 'subindo' | 'no alvo';

export function techStatus(item: TechItem, runs: TrainingRun[]): TechStatus {
  const best = bestTechBpm(item, runs);
  if (best === null) return runs.some((r) => r.treinoId === techRunId(item)) ? 'subindo' : 'novo';
  return best >= item.target ? 'no alvo' : 'subindo';
}

/**
 * Técnica do dia: até dois itens, priorizando os que ainda não chegaram no alvo, alternando por dia.
 * Itens no alvo voltam de vez em quando (a cada 3 dias) para não enferrujar.
 */
export function techniqueForDay(track: DailyTrack, runs: TrainingRun[], dayIndex: number): TechItem[] {
  const climbing = track.technique.filter((t) => techStatus(t, runs) !== 'no alvo');
  const done = track.technique.filter((t) => techStatus(t, runs) === 'no alvo');
  const out: TechItem[] = [];
  if (climbing.length) {
    out.push(climbing[dayIndex % climbing.length]);
    if (climbing.length > 1) out.push(climbing[(dayIndex + 1) % climbing.length]);
  }
  if (out.length < 2 && done.length && dayIndex % 3 === 0) out.push(done[dayIndex % done.length]);
  if (!out.length && done.length) out.push(done[dayIndex % done.length]);
  return out.slice(0, 2);
}

// ---------- o dia de treino ----------

export const DAY_PARTS = ['aquecimento', 'revisao', 'tecnica', 'leitura', 'ouvido'] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const DAY_PART_LABEL: Record<DayPart, string> = {
  aquecimento: 'Aquecimento',
  revisao: 'Revisão do curso',
  tecnica: 'Técnica',
  leitura: 'Leitura à primeira vista',
  ouvido: 'Ouvido',
};

export const dayRunId = (part: DayPart) => `dia-${part}`;

/** Partes do treino feitas no dia. A técnica conta quando houve passada boa em algum item. */
export function partsDone(runs: TrainingRun[], day: string): Set<DayPart> {
  const done = new Set<DayPart>();
  for (const r of runs) {
    if (r.day !== day) continue;
    for (const p of DAY_PARTS) if (r.treinoId === dayRunId(p)) done.add(p);
    if (r.treinoId.startsWith('tec-') && r.clean) done.add('tecnica');
  }
  return done;
}

/** Unidade do trilho: a da próxima lição do curso; com o curso escrito todo concluído, a última. */
export function trainingUnit(next: { unit: { n: number } } | null, lastUnit: number, anyPassed: boolean): number {
  if (next) return next.unit.n;
  return anyPassed ? lastUnit : 1;
}
