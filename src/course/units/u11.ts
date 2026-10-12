// Unidade 11 — Brasil ao piano e voicings modernos (lições 82 a 89). Projeto final: Tanguinho (original, no estilo de Nazareth).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.
// Músicas protegidas (Asa Branca, bossa nova, Villa-Lobos) ficam só citadas no texto; o repertório tocado é original.

import { chordLabel, choice, keyName, nearestVoicing, playChord, spellInterval, spellScale, type ChoiceQuestion } from '../gens';
import { PC_NAMES, n, pcOf, pick, ptName, shuffle } from '../music';
import { melodyTask, rhythmTask, sci, twoHandTask } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Accept, Exercise, ItemGen, Lesson, Rng, SongSpec, TimedTask, Unit } from '../types';

// ---------- escrita ----------

const quickTimed = (title: string, how: string, gen: (rng: Rng) => TimedTask, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

const items = (title: string, how: string, gen: ItemGen, count: number, low: Midi, high: Midi, accuracy = 0.85, labels: 'on' | 'fade' | 'off' = 'fade', avgMs?: number): Exercise => ({
  kind: 'items', title, how, gen, count, low, high, labels, pass: avgMs ? { accuracy, avgMs } : { accuracy },
});

/** Repete um compasso (ou um grupo de compassos) `times` vezes. */
const rep = (bar: string, times: number) => Array.from({ length: times }, () => bar).join(' | ');

// ---------- modos ----------

export type Mode = 'jônio' | 'dórico' | 'frígio' | 'lídio' | 'mixolídio' | 'eólio' | 'nordestina';
const MODE_STEPS: Record<Mode, number[]> = {
  jônio: [0, 2, 4, 5, 7, 9, 11, 12],
  dórico: [0, 2, 3, 5, 7, 9, 10, 12],
  frígio: [0, 1, 3, 5, 7, 8, 10, 12],
  lídio: [0, 2, 4, 6, 7, 9, 11, 12],
  mixolídio: [0, 2, 4, 5, 7, 9, 10, 12],
  eólio: [0, 2, 3, 5, 7, 8, 10, 12],
  nordestina: [0, 2, 4, 6, 7, 9, 10, 12],
};
const MODE_COLOR: Record<Mode, string> = {
  jônio: 'a escala maior.',
  dórico: 'menor com a 6ª maior (a nota característica).',
  frígio: 'menor com a 2ª menor (a nota característica).',
  lídio: 'maior com a 4ª aumentada (a nota característica).',
  mixolídio: 'maior com a 7ª menor (a nota característica).',
  eólio: 'a menor natural.',
  nordestina: 'maior com a 4ª aumentada e a 7ª menor (lídio e mixolídio juntos).',
};
const modeName = (m: Mode) => (m === 'nordestina' ? 'escala nordestina' : m);
/** Pcs do modo sobre uma tônica. */
export const modePcs = (tonicPc: number, m: Mode) => MODE_STEPS[m].slice(0, 7).map((x) => (tonicPc + x) % 12);

/** "Toque Ré dórico, subindo uma oitava": a tônica escrita ("D4") e o modo. */
function modeScale(opts: { tonics: string[]; modes: Mode[]; skill?: string }): ItemGen {
  return (rng) => {
    const tonic = pick(rng, opts.tonics);
    const mode = pick(rng, opts.modes);
    const t = n(tonic);
    const steps = MODE_STEPS[mode];
    const names = spellScale(tonic, steps).map((x) => ptName(x));
    return {
      prompt: `Toque ${names[0]} ${modeName(mode)}, subindo uma oitava`,
      detail: `Comece no ${names[0]}${tonic.slice(-1)}. ${modeName(mode)[0].toUpperCase()}${modeName(mode).slice(1)}: ${MODE_COLOR[mode]}`,
      hintKeys: steps.map((x) => t + x),
      hint: names.join(', '),
      steps: steps.map((x) => ({ kind: 'exact', midis: [t + x] }) as Accept),
      skill: `modo-${mode}`,
    };
  };
}

/** O app toca a tônica e o modo subindo; você diz qual dos dois foi. */
export function modeByEar(opts: { tonics: Midi[]; pairs: [Mode, Mode][]; skill?: string }): ItemGen {
  return (rng) => {
    const t = pick(rng, opts.tonics);
    const pair = pick(rng, opts.pairs);
    const which = rng() < 0.5 ? 0 : 1;
    const mode = pair[which];
    const order = shuffle(rng, [0, 1]);
    const scale = MODE_STEPS[mode].map((x) => t + x);
    return {
      prompt: `Ouça: ${modeName(pair[0])} ou ${modeName(pair[1])}?`,
      detail: `Tônica ${PC_NAMES[pcOf(t)]}. Escute a nota que muda: ela é a cor do modo.`,
      listen: { bpm: 110, steps: [{ midis: [t - 12, t - 5], beats: 2 }, ...scale.map((m, i) => ({ midis: [m], beats: i === scale.length - 1 ? 2 : 1 })), { midis: [t - 12, t - 5, t], beats: 3 }] },
      choices: order.map((i) => modeName(pair[i])),
      answer: order.indexOf(which),
      hint: `Foi ${modeName(mode)}: ${MODE_COLOR[mode]}`,
      steps: [],
      skill: opts.skill ?? 'modo-ouvido',
    };
  };
}

// ---------- intervalos compostos e tensões ----------

type Compound = '9m' | '9M' | '9A' | '11J' | '11A' | '13m' | '13M';
const COMPOUND: Record<Compound, [number, string, string]> = {
  '9m': [13, '2m', '9ª menor'], '9M': [14, '2M', '9ª maior'], '9A': [15, '2A', '9ª aumentada'],
  '11J': [17, '4J', '11ª justa'], '11A': [18, '4A', '11ª aumentada'], '13m': [20, '6m', '13ª menor'], '13M': [21, '6M', '13ª maior'],
};

/** "Toque uma 9ª maior acima de Ré3": primeiro a nota dada, depois a resposta, uma oitava acima do intervalo simples. */
function compoundInterval(opts: { from: string[]; ivs: Compound[]; skill?: string }): ItemGen {
  return (rng) => {
    const from = pick(rng, opts.from);
    const iv = pick(rng, opts.ivs);
    const [semis, simple, label] = COMPOUND[iv];
    const simpleNote = spellInterval(from, simple);
    const target = n(from) + semis;
    return {
      prompt: `Toque uma ${label} acima de ${ptName(from)}${from.slice(-1)}`,
      detail: 'Primeiro a nota dada, depois a resposta. A 9ª é a 2ª uma oitava acima; a 11ª, a 4ª; a 13ª, a 6ª.',
      hintKeys: [n(from), target],
      hint: `${ptName(simpleNote)}: a ${simple[0]}ª ${simple[1] === 'm' ? 'menor' : simple[1] === 'M' ? 'maior' : simple[1] === 'J' ? 'justa' : 'aumentada'} uma oitava acima (${semis} semitons).`,
      steps: [{ kind: 'exact', midis: [n(from)] }, { kind: 'exact', midis: [target] }],
      skill: opts.skill ?? 'intervalo-composto',
    };
  };
}

// ---------- voicings sem fundamental ----------

type Role = 'ii' | 'V' | 'I';
/** Notas do voicing sem fundamental, em semitons acima da fundamental: ii e I com 3, 5, 7, 9; V com 3, 7, 9, 13. */
const ROOTLESS: Record<Role, { offs: number[]; q: string; deg: number }> = {
  ii: { offs: [3, 7, 10, 14], q: 'm7(9)', deg: 2 },
  V: { offs: [4, 10, 14, 21], q: '7(13)', deg: 7 },
  I: { offs: [4, 7, 11, 14], q: '7M(9)', deg: 0 },
};
const FLAT_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Tons do ii–V–I sem fundamental (com a armadura para a pauta). */
const RL_KEYS: { key: string; pc: number; fifths: number }[] = [
  { key: 'C', pc: 0, fifths: 0 }, { key: 'F', pc: 5, fifths: -1 }, { key: 'Bb', pc: 10, fifths: -2 },
  { key: 'Eb', pc: 3, fifths: -3 }, { key: 'G', pc: 7, fifths: 1 }, { key: 'D', pc: 2, fifths: 2 },
];

const FLAT_PT = ['Dó', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Sol♭', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si'];
/** Nome da tecla com bemol nos tons com bemóis (e em Dó), com sustenido nos outros. */
const ptIn = (m: Midi, flats: boolean) => (flats ? FLAT_PT : PC_NAMES)[pcOf(m)];

function rootOf(keyPc: number, role: Role, flats: boolean): string {
  return (flats ? FLAT_ROOTS : SHARP_ROOTS)[(keyPc + ROOTLESS[role].deg) % 12];
}
const symbolOf = (keyPc: number, role: Role, flats: boolean) => rootOf(keyPc, role, flats) + ROOTLESS[role].q;
const pcsOf = (keyPc: number, role: Role) => ROOTLESS[role].offs.map((o) => (keyPc + ROOTLESS[role].deg + o) % 12);

/**
 * O ii–V–I com voicings sem fundamental, conduzido a partir da forma A do ii (3ª embaixo, entre Fá3 e Mi4).
 * Devolve a direita (quatro notas) e o baixo de cada acorde (fundamental entre Dó2 e Si2).
 */
function rootlessChain(keyPc: number): { upper: Midi[][]; bass: Midi[] } {
  const third = 53 + ((keyPc + 5 - 53 + 120) % 12);
  const ii = [third, third + 4, third + 7, third + 11];
  const v = nearestVoicing(ii, pcsOf(keyPc, 'V'));
  const i = nearestVoicing(v, pcsOf(keyPc, 'I'));
  const bass = (['ii', 'V', 'I'] as Role[]).map((r) => 36 + ((keyPc + ROOTLESS[r].deg - 36 + 120) % 12));
  return { upper: [ii, v, i], bass };
}

/** "Toque o Dm7(9) sem fundamental, forma A": quatro notas, a 3ª (A) ou a 7ª (B) embaixo. */
function rootlessChord(opts: { keys: string[]; roles: Role[]; forms: ('A' | 'B')[]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const k = RL_KEYS.find((x) => x.key === key)!;
    const role = pick(rng, opts.roles);
    const form = pick(rng, opts.forms);
    const flats = k.fifths < 0 || k.key === 'C';
    const symbol = symbolOf(k.pc, role, flats);
    const pcs = pcsOf(k.pc, role);
    // Forma A: a 3ª embaixo; forma B: a 7ª embaixo.
    const bottom = form === 'A' ? pcs[0] : role === 'V' ? pcs[1] : pcs[2];
    const sorted = [...pcs].sort((a, b) => ((a - bottom + 12) % 12) - ((b - bottom + 12) % 12));
    const base = 52 + ((bottom - 52 + 120) % 12);
    const keys = sorted.map((p) => base + ((p - bottom + 12) % 12));
    const names = keys.map((m) => ptIn(m, flats));
    return {
      prompt: `Toque o ${chordLabel(symbol)} sem fundamental, forma ${form}`,
      detail: `${role === 'V' ? 'Notas: 3ª, 7ª, 9ª e 13ª.' : 'Notas: 3ª, 5ª, 7ª e 9ª.'} Forma ${form}: a ${form === 'A' ? '3ª' : '7ª'} embaixo. Só a direita.`,
      hintKeys: keys,
      hint: names.join(', '),
      steps: [{ kind: 'chord', pcs, bass: bottom }],
      skill: opts.skill ?? 'rootless',
    };
  };
}

/** ii–V–I sem fundamental: baixo na esquerda, quatro notas na direita, cada troca no máximo o caminho mais curto + `lead`. */
function rootlessSeq(opts: { keys: string[]; lead: number; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const k = RL_KEYS.find((x) => x.key === key)!;
    const flats = k.fifths < 0 || k.key === 'C';
    const roles: Role[] = ['ii', 'V', 'I'];
    const chain = rootlessChain(k.pc);
    return {
      prompt: 'Toque o ii–V–I sem fundamental, conduzindo',
      symbol: roles.map((r) => chordLabel(symbolOf(k.pc, r, flats))).join(' – '),
      detail: `${keyName(k.key)} maior. Esquerda: a fundamental. Direita: quatro notas, uma de cada, andando o mínimo (forma A → B → A).`,
      hintKeys: [chain.bass[0], ...chain.upper[0]],
      hint: roles.map((r, i) => `${chordLabel(symbolOf(k.pc, r, flats))} (${ptIn(chain.bass[i], flats)} no baixo; ${chain.upper[i].map((m) => ptIn(m, flats)).join('–')})`).join(' → '),
      steps: roles.map((r) => ({ kind: 'chord', pcs: pcsOf(k.pc, r), bass: (k.pc + ROOTLESS[r].deg) % 12, lead: opts.lead }) as Accept),
      skill: opts.skill ?? 'rootless-ii-v-i',
    };
  };
}

const chordText = (ms: Midi[], beats: number) => `${ms.map(sci).join('+')}:${beats}`;

/** ii–V–I no tempo: fundamental na esquerda, voicing sem fundamental na direita; duas vezes. */
function rootlessHands(rng: Rng, bpm: number, keys = RL_KEYS): TimedTask {
  const k = pick(rng, keys);
  const { upper, bass } = rootlessChain(k.pc);
  const flats = k.fifths < 0 || k.key === 'C';
  const r = `${chordText(upper[0], 2)} ${chordText(upper[1], 2)} | ${chordText(upper[2], 4)}`;
  const l = `${sci(bass[0])}:2 ${sci(bass[1])}:2 | ${sci(bass[2])}:4`;
  const names = (['ii', 'V', 'I'] as Role[]).map((x) => chordLabel(symbolOf(k.pc, x, flats)));
  return twoHandTask(`${r} | ${r}`, `${l} | ${l}`, { bpm, fifths: k.fifths, caption: `${keyName(k.key)} maior: ${names.join(' – ')}. Esquerda: ${bass.map((m) => ptIn(m, flats)).join(', ')}.` });
}

// ---------- grooves ----------

/** Baião na esquerda (3 + 3 + 2 semicolcheias): fundamental, 5ª acima, fundamental. */
const baiaoBar = (root: string) => {
  const r = n(root);
  return `${root}:0.75 ${sci(r + 7)}:0.75 ${root}:0.5`;
};

/** Bossa: direita em dois compassos (1, "e" do 2, 4 | 2, "e" do 3); esquerda com a fundamental e a 5ª abaixo, longa-curta. */
function bossaBars(upper: Midi[], root: Midi): { r: string; l: string } {
  const c = upper.map(sci).join('+');
  const f = sci(root - 5);
  const b = sci(root);
  return {
    r: `${c}:1.5 ${c}:1.5 ${c}:1 | r:1 ${c}:1.5 ${c}:1.5`,
    l: `${b}:1.5 ${b}:0.5 ${f}:1.5 ${f}:0.5 | ${b}:1.5 ${b}:0.5 ${f}:1.5 ${f}:0.5`,
  };
}

/** ii (2 compassos), V (2) e I (4) em bossa, num tom sorteado: 8 compassos, `cycles` vezes. */
export function bossaTask(rng: Rng, bpm: number, cycles = 1, keys = RL_KEYS.filter((x) => ['C', 'F', 'Bb', 'G'].includes(x.key))): TimedTask {
  const k = pick(rng, keys);
  const { upper } = rootlessChain(k.pc);
  // Fundamental entre Mi2 e Ré♯3, para a 5ª abaixo caber e a direita (de Fá3 para cima) ficar livre.
  const roots = (['ii', 'V', 'I'] as Role[]).map((x) => 40 + ((k.pc + ROOTLESS[x].deg - 40 + 120) % 12));
  const parts = [bossaBars(upper[0], roots[0]), bossaBars(upper[1], roots[1]), bossaBars(upper[2], roots[2]), bossaBars(upper[2], roots[2])];
  const flats = k.fifths < 0 || k.key === 'C';
  const names = (['ii', 'V', 'I'] as Role[]).map((x) => chordLabel(symbolOf(k.pc, x, flats)));
  const r = Array.from({ length: cycles }, () => parts.map((p) => p.r).join(' | ')).join(' | ');
  const l = Array.from({ length: cycles }, () => parts.map((p) => p.l).join(' | ')).join(' | ');
  return twoHandTask(r, l, {
    bpm,
    fifths: k.fifths,
    caption: `${keyName(k.key)} maior: ${names[0]} (2 compassos), ${names[1]} (2), ${names[2]} (4). Esquerda: fundamental longa-curta, depois a 5ª abaixo longa-curta.`,
  });
}

// ---------- músicas ----------

// Baião em Dó: melodia original do Fermata, com a 7ª menor (Si♭) do som nordestino. 2/4.
const BAIAO_CHORDS = ['C3', 'C3', 'Bb2', 'C3', 'C3', 'C3', 'G2', 'C3', 'F2', 'F2', 'C3', 'C3', 'F2', 'Bb2', 'C3', 'C3'];
const BAIAO_R = [
  'C5:0.75 Bb4:0.75 G4:0.5', 'A4:0.5 G4:0.5 E4:1', 'F4:0.75 G4:0.75 Bb4:0.5', 'G4:2',
  'C5:0.75 Bb4:0.75 G4:0.5', 'A4:0.5 Bb4:0.5 C5:1', 'D5:0.75 B4:0.75 F4:0.5', 'E4:1 r:1',
  'A4:0.75 C5:0.75 A4:0.5', 'Bb4:0.5 A4:0.5 F4:1', 'G4:0.75 Bb4:0.75 G4:0.5', 'E4:1 r:1',
  'A4:0.75 C5:0.75 D5:0.5', 'D5:0.5 C5:0.5 Bb4:1', 'Bb4:0.75 G4:0.75 E4:0.5', 'C4:1 r:1',
];
const BAIAO_L = BAIAO_CHORDS.map((c, i) => (i === BAIAO_CHORDS.length - 1 ? 'C3:1 r:1' : baiaoBar(c)));

const baiao: SongSpec = {
  id: 'u11-baiao',
  title: 'Baião em Dó',
  composer: 'Fermata (melodia original)',
  arrangement: 'melodia original na direita, com Si♭ (a 7ª menor nordestina); esquerda no baião 3 + 3 + 2: fundamental, 5ª acima e fundamental',
  bpm: 80,
  beatsPerBar: 2,
  fifths: 0,
  right: BAIAO_R.join(' | '),
  left: BAIAO_L.join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Bossa em Fá: melodia original do Fermata. Esquerda em shells (1-7-3 ou 1-3-7) no ritmo longa-curta da bossa.
const SH: Record<string, string> = {
  F7M: 'F2+E3+A3', Gm7: 'G2+F3+Bb3', C7: 'C3+E3+Bb3', Am7: 'A2+G3+C4', D7: 'D3+F#3+C4', Bb7M: 'Bb2+A3+D4', Bbm6: 'Bb2+Db3+G3',
};
const shell2 = (c: string) => `${SH[c]}:1.5 ${SH[c]}:1 ${SH[c]}:1.5`;
const shellSplit = (a: string, b: string) => `${SH[a]}:1.5 ${SH[a]}:0.5 ${SH[b]}:2`;
const BOSSA_R = [
  'C5:1.5 A4:0.5 G4:1 A4:1', 'E5:1.5 D5:0.5 C5:2', 'Bb4:1.5 A4:0.5 G4:1 F4:1', 'E4:1 G4:1 Bb4:1.5 A4:0.5',
  'r:1 C5:1 E5:1 D5:1', 'C5:1.5 A4:0.5 F#4:2', 'G4:1 Bb4:1 E4:1 G4:1', 'F4:3 r:1',
  'D5:1.5 C5:0.5 A4:2', 'Db5:1.5 C5:0.5 Bb4:2', 'C5:1.5 B4:0.5 A4:1 G4:1', 'F#4:1 A4:1 C5:1.5 Bb4:0.5',
  'r:1 A4:1 Bb4:1 D5:1', 'C5:1.5 Bb4:0.5 G4:2', 'A4:1 G4:1 E4:1 G4:1', 'F4:2 r:2',
];
const BOSSA_L = [
  shell2('F7M'), shell2('F7M'), shell2('Gm7'), shell2('C7'), shell2('Am7'), shell2('D7'), shellSplit('Gm7', 'C7'), shell2('F7M'),
  shell2('Bb7M'), shell2('Bbm6'), shell2('Am7'), shell2('D7'), shell2('Gm7'), shell2('C7'), shellSplit('Gm7', 'C7'), `${SH.F7M}:4`,
];

const bossa: SongSpec = {
  id: 'u11-bossa',
  title: 'Bossa em Fá',
  composer: 'Fermata (melodia original)',
  arrangement: 'melodia original com antecipações na direita; esquerda em shells no ritmo da bossa (1 e o "e" do 2). Forma A (8 compassos) e B (8), com o B♭m6 emprestado no compasso 10',
  bpm: 72,
  beatsPerBar: 4,
  fifths: -1,
  right: BOSSA_R.join(' | '),
  left: BOSSA_L.join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Tanguinho: tango brasileiro original do Fermata, no estilo de Ernesto Nazareth. 2/4, esquerda em habanera (3 + 1 + 2 + 2).
const TANGO_BAR: Record<string, string> = {
  C: 'C3:0.75 E3+G3:0.25 G2:0.5 E3+G3:0.5',
  G7: 'G2:0.75 B2+F3:0.25 D2:0.5 B2+F3:0.5',
  A7: 'A2:0.75 C#3+G3:0.25 E2:0.5 C#3+G3:0.5',
  Dm: 'D3:0.75 F3+A3:0.25 A2:0.5 F3+A3:0.5',
};
const TANGO_CHORDS = ['C', 'G7', 'G7', 'C', 'C', 'A7', 'Dm', 'Dm', 'Dm', 'G7', 'C', 'A7', 'Dm', 'G7', 'C', 'C'];
const TANGO_R = [
  'E5:0.25 D5:0.25 C5:0.25 E5:0.25 G5:0.5 E5:0.5', 'F5:0.75 D5:0.25 B4:0.5 G4:0.5', 'F4:0.25 G4:0.25 B4:0.25 D5:0.25 F5:0.5 E5:0.5', 'E5:0.75 C5:0.25 G4:1',
  'E5:0.25 D5:0.25 C5:0.25 E5:0.25 G5:0.5 C6:0.5', 'Bb5:0.75 A5:0.25 G5:0.5 E5:0.5', 'F5:0.75 E5:0.25 D5:1', 'A4:0.25 C#5:0.25 D5:0.25 F5:0.25 A5:1',
  'A5:0.75 F5:0.25 D5:0.5 F5:0.5', 'G5:0.75 F5:0.25 D5:0.5 B4:0.5', 'C5:0.25 D5:0.25 E5:0.25 G5:0.25 C6:0.5 G5:0.5', 'A5:0.75 G5:0.25 E5:0.5 C#5:0.5',
  'D5:0.75 F5:0.25 A5:0.5 F5:0.5', 'B4:0.75 D5:0.25 F5:0.5 D5:0.5', 'E5:0.25 D5:0.25 C5:0.25 B4:0.25 C5:0.5 G4:0.5', 'C5:1 r:1',
];
const TANGO_L = TANGO_CHORDS.map((c, i) => (i === TANGO_CHORDS.length - 1 ? 'C3:1 r:1' : TANGO_BAR[c]));

const tanguinho: SongSpec = {
  id: 'u11-tanguinho',
  title: 'Tanguinho',
  composer: 'Fermata (original, no estilo de Ernesto Nazareth)',
  arrangement: 'tango brasileiro original: melodia em semicolcheias na direita; esquerda em habanera (baixo, acorde, baixo, acorde) com as secundárias A7 e G7',
  bpm: 60,
  beatsPerBar: 2,
  fifths: 0,
  right: TANGO_R.join(' | '),
  left: TANGO_L.join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// ---------- geradores reaproveitados ----------

const mixoScale = modeScale({ tonics: ['C4', 'G4', 'D4', 'F4', 'A4'], modes: ['mixolídio', 'nordestina'] });
const compound = compoundInterval({ from: ['C4', 'D4', 'E4', 'F4', 'G3', 'A3', 'Bb3'], ivs: ['9m', '9M', '9A', '11J', '11A', '13m', '13M'] });
const TENSION_SYMBOLS = ['C7M(9)', 'F7M(9)', 'G7(13)', 'D7(13)', 'Dm7(9)', 'Am7(9)', 'G7(b9)', 'E7(b9)', 'A7(#9)', 'G7(#9)', 'F7M(#11)', 'C7M(#11)', 'A7(b13)', 'E7(b13)', 'Bb7(9)', 'C6(9)', 'Dm7(11)'];
const tensions = playChord({ symbols: TENSION_SYMBOLS, low: 48, high: 84, omitFifth: true, skill: 'tensoes' });
const rlChord = rootlessChord({ keys: RL_KEYS.map((x) => x.key), roles: ['ii', 'V', 'I'], forms: ['A', 'B'] });
const rlSeq = rootlessSeq({ keys: RL_KEYS.map((x) => x.key), lead: 2 });

// ---------- perguntas ----------

const BAIAO_Q: ChoiceQuestion[] = [
  { q: 'O desenho do baião em 2/4, em semicolcheias, é…', options: ['3 + 3 + 2', '2 + 2 + 2 + 2', '4 + 4'], answer: 0, why: 'Oito semicolcheias divididas em 3 + 3 + 2: ataques no 1, na última semicolcheia do 1 e no "e" do 2.' },
  { q: 'O som nordestino, sobre um acorde maior, vem principalmente de…', options: ['A 7ª menor (em Dó, o Si♭)', 'A 3ª menor', 'A 6ª menor'], answer: 0, why: 'Maior com 7ª menor é o mixolídio. A escala nordestina ainda sobe a 4ª (Fá♯).' },
  { q: 'Dó mixolídio tem as mesmas notas de…', options: ['Fá maior', 'Sol maior', 'Dó maior'], answer: 0, why: 'Dó, Ré, Mi, Fá, Sol, Lá, Si♭: a escala de Fá maior começando no 5º grau.' },
  { q: 'A escala nordestina em Dó é…', options: ['Dó, Ré, Mi, Fá♯, Sol, Lá, Si♭', 'Dó, Ré, Mi♭, Fá, Sol, Lá♭, Si♭', 'Dó, Ré, Mi, Fá, Sol, Lá, Si'], answer: 0, why: 'Maior com 4ª aumentada (lídio) e 7ª menor (mixolídio).' },
  { q: 'Quem levou o baião para o país inteiro, nos anos 1940?', options: ['Luiz Gonzaga, com Humberto Teixeira', 'Tom Jobim', 'Ernesto Nazareth'], answer: 0, why: 'Luiz Gonzaga, com a sanfona, a zabumba e o triângulo.' },
  { q: 'Em Dó, o acorde de Si♭ é o…', options: ['♭VII, emprestado do mixolídio', 'V7', 'vii°'], answer: 0, why: 'No campo de Dó maior o 7º grau é Si diminuto; o Si♭ maior vem do modo com 7ª menor.' },
];

const TENSION_Q: ChoiceQuestion[] = [
  { q: 'A 9ª é…', options: ['A 2ª uma oitava acima', 'A 7ª uma oitava acima', 'A 3ª uma oitava acima'], answer: 0, why: '9 = 2 + 7: a mesma letra da 2ª, na oitava de cima.' },
  { q: 'Em G7(13), a 13ª é…', options: ['Mi', 'Fá', 'Dó'], answer: 0, why: 'A 6ª de Sol é Mi; uma oitava acima, a 13ª.' },
  { q: 'Por que a 11ª justa quase nunca entra num acorde maior?', options: ['Ela fica meio tom acima da 3ª e choca', 'Porque é igual à fundamental', 'Porque o piano não alcança'], answer: 0, why: 'Em C7M, o Fá fica meio tom acima do Mi (9ª menor entre eles). No acorde maior usa-se a ♯11 (Fá♯).' },
  { q: 'No Dm7, a 11ª (Sol)…', options: ['Soa bem: a 3ª é Fá, um tom abaixo', 'Choca sempre', 'Vira a fundamental'], answer: 0, why: 'No acorde menor a 11ª fica um tom acima da 3ª menor; é tensão disponível.' },
  { q: 'As tensões alteradas (♭9, ♯9, ♭13) aparecem mais em qual acorde?', options: ['No dominante (V7)', 'No I7M', 'No m7(♭5)'], answer: 0, why: 'O V7 já é tensão; as alterações aumentam a vontade de resolver.' },
  { q: 'Num acorde com tensões, qual nota sai primeiro quando a mão não alcança?', options: ['A 5ª', 'A 3ª', 'A 7ª'], answer: 0, why: '3ª e 7ª dizem a qualidade; a 5ª (justa) quase não muda a cor.' },
  { q: 'C7M(9) tem as notas…', options: ['Dó, Mi, Sol, Si, Ré', 'Dó, Mi, Sol, Si♭, Ré', 'Dó, Mi♭, Sol, Si, Ré'], answer: 0, why: 'C7M (Dó, Mi, Sol, Si) mais a 9ª maior (Ré).' },
];

const ROOTLESS_Q: ChoiceQuestion[] = [
  { q: 'No voicing sem fundamental, quem toca a fundamental?', options: ['A esquerda (ou o baixista)', 'Ninguém: ela some', 'O polegar da direita'], answer: 0, why: 'A fundamental continua no baixo; a direita fica livre para 3ª, 7ª e tensões.' },
  { q: 'A forma A do Dm7(9) é…', options: ['Fá, Lá, Dó, Mi (3ª embaixo)', 'Dó, Mi, Fá, Lá (7ª embaixo)', 'Ré, Fá, Lá, Dó'], answer: 0, why: 'Forma A: 3ª, 5ª, 7ª e 9ª, de baixo para cima.' },
  { q: 'Do Dm7(9) forma A para o G7(13), quantas notas mudam?', options: ['Uma: Dó desce para Si', 'Todas', 'Duas'], answer: 0, why: 'Fá, Lá, Dó, Mi → Fá, Lá, Si, Mi. Só a 7ª do ii desce meio tom e vira a 3ª do V.' },
  { q: 'O G7(13) sem fundamental leva…', options: ['3ª, 7ª, 9ª e 13ª', '1ª, 3ª, 5ª e 7ª', '3ª, 5ª, 7ª e 9ª'], answer: 0, why: 'Si, Fá, Lá e Mi. A 5ª (Ré) sai para dar lugar à 13ª.' },
  { q: 'Se o ii–V–I começa na forma A, o V fica na…', options: ['Forma B (7ª embaixo)', 'Forma A', 'Posição fundamental'], answer: 0, why: 'A troca natural alterna: A → B → A, com a mão quase parada.' },
];

// ---------- lições ----------

const l82: Lesson = {
  n: 82,
  id: 'l82',
  title: 'Baião',
  minutes: 60,
  objectives: [
    'Consigo tocar o baião na esquerda (3 + 3 + 2) a 80 BPM, com as notas em ±50 ms.',
    'Consigo tocar as escalas mixolídia e nordestina em cinco tons.',
    'Consigo tocar o Baião em Dó com as duas mãos, 16 compassos, a 80 BPM.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O baião',
      body: `O **baião** é o ritmo do sertão nordestino que Luiz Gonzaga e Humberto Teixeira levaram para o Brasil inteiro nos anos 1940. A formação clássica tem três instrumentos: **sanfona** (melodia e acordes), **zabumba** (o bumbo grave, com baqueta) e **triângulo** (o pulso agudo).

"Asa Branca" (1947) é o baião mais famoso, mas é música protegida: aqui você toca uma melodia original, escrita para treinar o mesmo groove.

Ao piano, a **esquerda faz o papel da zabumba**. Ela repete um desenho de um compasso, um **ostinato**, enquanto a direita canta a melodia. Quando o ostinato fica automático, a melodia pode fazer o que quiser por cima.`,
    },
    {
      kind: 'text',
      title: 'A figura: 3 + 3 + 2',
      body: `O baião é escrito em **2/4**: dois tempos de semínima por compasso. Divida o compasso em 8 semicolcheias e conte "**1** e a e **2** e a e". A zabumba toca nas posições 1, 4 e 7, isto é, em grupos de **3 + 3 + 2** semicolcheias:

- ataque no **1** (dura 3 semicolcheias: uma colcheia pontuada);
- ataque na **última semicolcheia do tempo 1** (dura 3 semicolcheias);
- ataque no **"e" do tempo 2** (dura 2 semicolcheias: uma colcheia).

Na partitura tradicional o segundo ataque aparece como semicolcheia ligada a uma colcheia. O app escreve a mesma coisa como duas colcheias pontuadas e uma colcheia: soa igual.

Na esquerda, o desenho mais usado é **fundamental – 5ª acima – fundamental**. Em Dó: Dó3, Sol3, Dó3.`,
    },
    {
      kind: 'example',
      title: 'Ouvir o 3 + 3 + 2',
      steps: [
        { say: 'Primeiro, colcheias retas, para comparar: tudo no tempo e no "e".', play: { bpm: 80, steps: [n('C3'), n('G3'), n('C3'), n('G3'), n('C3'), n('G3'), n('C3'), n('G3')].map((m) => ({ midis: [m], beats: 0.5 })) } },
        { say: 'Agora o **baião**: Dó (longo), Sol (longo), Dó (curto). Repare como o Sol chega "antes" do tempo 2.', play: { bpm: 80, steps: [0, 1].flatMap(() => [{ midis: [n('C3')], beats: 0.75 }, { midis: [n('G3')], beats: 0.75 }, { midis: [n('C3')], beats: 0.5 }]) }, keys: [n('C3'), n('G3')] },
        { say: 'O mesmo desenho em Si♭ e em Sol: a mão só muda de casa.', play: { bpm: 80, steps: [{ midis: [n('Bb2')], beats: 0.75 }, { midis: [n('F3')], beats: 0.75 }, { midis: [n('Bb2')], beats: 0.5 }, { midis: [n('G2')], beats: 0.75 }, { midis: [n('D3')], beats: 0.75 }, { midis: [n('G2')], beats: 0.5 }, { midis: [n('C3')], beats: 2 }] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'endireitar o ritmo',
      body: 'O erro mais comum é tocar o segundo ataque no "e" do tempo 1, como colcheia reta. Aí o baião vira marcha. O segundo ataque vem **uma semicolcheia depois** do "e": quase em cima do tempo 2, mas antes dele. Conte as semicolcheias em voz alta até o corpo aprender.',
    },
    {
      kind: 'exercise',
      id: 'l82-ritmo',
      exercise: quickTimed('O 3 + 3 + 2 em qualquer tecla', 'Quatro compassos a 70 BPM, em qualquer tecla. Faça 2 passadas boas.', () => rhythmTask(rep('x:0.75 x:0.75 x:0.5', 4), { bpm: 70, beatsPerBar: 2, caption: 'Baião: colcheia pontuada, colcheia pontuada, colcheia. Conte "1 e a e 2 e a e".' }), { reps: 2, window: 60 }),
    },
    {
      kind: 'exercise',
      id: 'l82-esquerda',
      exercise: quickTimed('Zabumba na esquerda', 'A esquerda sozinha: Dó, Dó, Si♭, Dó, um compasso cada, de 64 até 80 BPM. Janela de ±50 ms.', () => melodyTask([baiaoBar('C3'), baiaoBar('C3'), baiaoBar('Bb2'), baiaoBar('C3')].join(' | '), { bpm: 64, beatsPerBar: 2, clef: 'bass', caption: 'Fundamental, 5ª acima, fundamental: Dó–Sol–Dó e Si♭–Fá–Si♭.' }), { window: 50, ladder: { from: 64, to: 80, step: 4 } }),
    },
    {
      kind: 'text',
      title: 'O som nordestino: a 7ª menor',
      body: `A melodia de baião tem um tempero que você reconhece de longe: sobre um acorde **maior**, ela usa a **7ª menor**. Em Dó, em vez de Si, aparece **Si♭**.

Essa escala (maior com 7ª menor) é o modo **mixolídio**: Dó, Ré, Mi, Fá, Sol, Lá, Si♭. São as notas de Fá maior começando no Dó. Por isso o acorde de **Si♭** (o ♭VII) aparece tanto em baião: ele sai do próprio modo.

Muitas melodias nordestinas vão além e sobem também a 4ª: Dó, Ré, Mi, **Fá♯**, Sol, Lá, **Si♭**. É a chamada **escala nordestina** (ou lídio-mixolídio): a 4ª aumentada do lídio com a 7ª menor do mixolídio. Na lição 86 você vai ver os modos como cores; aqui basta saber que a 7ª menor é a cor principal.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 72,
      lit: [60, 62, 64, 65, 67, 69, 70, 72],
      labels: { 60: 'Dó', 62: 'Ré', 64: 'Mi', 65: 'Fá', 67: 'Sol', 69: 'Lá', 70: 'Si♭', 72: 'Dó' },
      caption: 'Dó mixolídio: a escala de Dó maior com o Si♭. Na escala nordestina, o Fá vira Fá♯.',
    },
    { kind: 'exercise', id: 'l82-escalas', exercise: items('Mixolídio e nordestina', 'O app pede uma das duas escalas, em cinco tônicas. Suba uma oitava.', mixoScale, 8, 48, 84, 0.85, 'fade') },
    {
      kind: 'exercise',
      id: 'l82-improviso',
      exercise: {
        kind: 'improv',
        title: 'Improviso em Dó mixolídio',
        how: 'O app toca C7 em loop. Improvise com Dó mixolídio (as brancas com Si♭ no lugar de Si), deixe respiros e termine no Dó. Use o Si♭ de propósito: é a cor.',
        pcs: [0, 2, 4, 5, 7, 9, 10],
        bars: 8,
        bpm: 80,
        beatsPerBar: 4,
        backing: Array.from({ length: 8 }, () => [n('C3'), n('G3'), n('Bb3'), n('E4')]),
        low: 60,
        high: 84,
        pass: { inSet: 0.9, restsPer4: 1, endOn: [0] },
      },
    },
    {
      kind: 'text',
      title: 'Mãos juntas',
      body: `No Baião em Dó a esquerda nunca muda de desenho: só muda de casa (Dó, Si♭, Sol, Fá). A direita tem duas figuras: a mesma colcheia pontuada da zabumba (a melodia "conversa" com o baixo) e colcheias retas.

Estude assim: primeiro a esquerda sozinha até não pensar nela; depois a direita sozinha, contando; por fim, juntas e devagar. Os ataques que caem juntos nas duas mãos (o 1 e o "a" do 1, nos compassos com colcheia pontuada) são as âncoras: se eles saírem juntos, o resto encaixa.

O critério da tabela é tocar os **16 compassos com cada nota em ±50 ms**, a 80 BPM.`,
    },
    {
      kind: 'exercise',
      id: 'l82-maos',
      exercise: quickTimed('Primeira frase, mãos juntas', 'Compassos 1 a 4, a 72 BPM, janela de ±50 ms. Duas passadas boas.', () => twoHandTask(BAIAO_R.slice(0, 4).join(' | '), BAIAO_L.slice(0, 4).join(' | '), { bpm: 72, beatsPerBar: 2, caption: 'Esquerda: Dó | Dó | Si♭ | Dó, no baião.' }), { reps: 2, window: 50 }),
    },
    { kind: 'song', songId: 'u11-baiao', why: 'A música da lição: 16 compassos de baião com a 7ª menor nordestina.' },
  ],
  review: [mixoScale, choice(BAIAO_Q, 'baiao')],
  checkpoint: [
    quickTimed('Baião em Dó inteiro', 'Os 16 compassos, mãos juntas, a 80 BPM. Meta: 85% das notas em ±50 ms.', () => twoHandTask(BAIAO_R.join(' | '), BAIAO_L.join(' | '), { bpm: 80, beatsPerBar: 2 }), { window: 50 }),
    items('Escalas do sertão', '8 escalas, sem dica. Meta: 7 de 8.', mixoScale, 8, 48, 84, 0.85, 'off'),
  ],
  exit: [mixoScale, choice(BAIAO_Q, 'baiao')],
};

const l83: Lesson = {
  n: 83,
  id: 'l83',
  title: 'Tensões',
  minutes: 60,
  objectives: [
    'Consigo tocar 9ª, 11ª e 13ª (com qualidade) acima de qualquer nota.',
    'Consigo montar acordes com tensão pela cifra, como C7M(9) e G7(13).',
    'Consigo ler uma chuva de cifras com tensões com 85% de acerto e menos de 6 s por acorde.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Intervalos compostos',
      body: `Até aqui os intervalos cabiam numa oitava. Passando dela, o intervalo ganha o nome **composto**: some 7 ao número do intervalo simples.

- **9ª** = 2ª + oitava. Dó → Ré da oitava de cima. 9ª maior = 14 semitons; 9ª menor = 13.
- **11ª** = 4ª + oitava. Dó → Fá de cima. 11ª justa = 17 semitons; aumentada = 18.
- **13ª** = 6ª + oitava. Dó → Lá de cima. 13ª maior = 21 semitons; menor = 20.

A qualidade é a mesma do intervalo simples: se Dó–Ré♭ é 2ª menor, Dó–Ré♭ de cima é 9ª menor. Para achar no teclado, pense na 2ª, na 4ª ou na 6ª e suba uma oitava.`,
    },
    {
      kind: 'example',
      title: 'Da 2ª à 9ª',
      steps: [
        { say: 'Dó4 e Ré4: uma **2ª maior**. Junto, as notas raspam.', play: { bpm: 70, steps: [{ midis: [n('C4'), n('D4')], beats: 2 }] }, keys: [n('C4'), n('D4')] },
        { say: 'Dó4 e Ré5: a mesma letra uma oitava acima, uma **9ª maior**. A distância abre o som.', play: { bpm: 70, steps: [{ midis: [n('C4'), n('D5')], beats: 2 }] }, keys: [n('C4'), n('D5')] },
        { say: 'Dó4 e Lá5: uma **13ª maior** (a 6ª maior uma oitava acima).', play: { bpm: 70, steps: [{ midis: [n('C4'), n('A5')], beats: 2 }] }, keys: [n('C4'), n('A5')] },
      ],
    },
    { kind: 'exercise', id: 'l83-compostos', exercise: items('9ª, 11ª e 13ª', 'Toque a nota dada e depois o intervalo composto acima dela.', compound, 10, 45, 88, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'Tensões: cor por cima da tétrade',
      body: `Uma **tensão** é uma nota além da 7ª, empilhando terças: 9ª, 11ª e 13ª. Ela não muda a função do acorde (o G7(13) continua sendo dominante), só a cor. É o som do jazz, da bossa e da MPB.

Nem toda tensão serve em todo acorde. A regra prática: a tensão não pode ficar **meio tom acima** de uma nota do acorde (forma uma 9ª menor com ela e choca).

- **7M** (C7M): 9 (Ré), ♯11 (Fá♯) e 13 (Lá). A 11 justa (Fá) choca com o Mi.
- **m7** (Dm7): 9 (Mi) e 11 (Sol). A 11 fica um tom acima da 3ª menor e soa bem.
- **7** (G7): 9 (Lá) e 13 (Mi) naturais, e as **alteradas** ♭9 (Lá♭), ♯9 (Lá♯), ♯11 (Dó♯) e ♭13 (Mi♭).

A cifra brasileira põe a tensão entre parênteses: **C7M(9)**, **G7(13)**, **A7(♭13)**, **Dm7(11)**. O **6(9)** é a tríade maior com 6ª e 9ª, sem 7ª: C6(9) = Dó, Mi, Sol, Lá, Ré.`,
    },
    {
      kind: 'example',
      title: 'Tensões na mão',
      steps: [
        { say: '**C7M(9)**: o baixo Dó na esquerda; na direita Mi, Sol, Si, Ré. A 9ª fica em cima.', play: { bpm: 60, steps: [{ midis: [n('C3'), n('E4'), n('G4'), n('B4'), n('D5')], beats: 3 }] }, keys: [n('C3'), n('E4'), n('G4'), n('B4'), n('D5')] },
        { say: '**G7(13)**: baixo Sol; na direita Fá, Si, Mi. Sem a 5ª: a 13ª (Mi) toma o lugar.', play: { bpm: 60, steps: [{ midis: [n('G2'), n('F4'), n('B4'), n('E5')], beats: 3 }] }, keys: [n('G2'), n('F4'), n('B4'), n('E5')] },
        { say: '**G7(♭9)** resolvendo em C7M(9): o Lá♭ desce para o Sol. A alteração empurra para a resolução.', play: { bpm: 60, steps: [{ midis: [n('G2'), n('F4'), n('Ab4'), n('B4')], beats: 2 }, { midis: [n('C3'), n('E4'), n('G4'), n('B4'), n('D5')], beats: 3 }] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'contar a 9ª a partir da nota errada',
      body: 'A tensão se conta a partir da **fundamental**, não da nota mais grave da mão. Em Am7(9), a 9ª é Si (de Lá), não Fá♯ (de Mi). Ache a fundamental, ache a 2ª dela, e só então decida a oitava.',
    },
    { kind: 'exercise', id: 'l83-acordes', exercise: items('Acordes com tensão', 'Toque o acorde da cifra, com a tensão. A 5ª pode ficar de fora; qualquer posição.', tensions, 12, 48, 84, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'Chuva de cifras',
      body: `Na roda de bossa ou de choro, ninguém espera você montar o acorde nota por nota. O treino agora é de **velocidade**: a cifra aparece e a mão já vai.

Um método que acelera: leia a cifra em duas camadas. Primeiro a **tétrade** (C7M, G7, Dm7), que você já toca desde a unidade 8. Depois a **tensão**, que é uma nota só, quase sempre perto da fundamental (a 9ª é um tom acima dela; a 13ª, um tom abaixo da 7ª menor). Assim o acorde de 5 notas vira "tétrade + 1".

Meta da tabela: **85% de acerto**, com média abaixo de **6 s** por acorde. Na unidade 12 a meta aperta.`,
    },
    { kind: 'exercise', id: 'l83-chuva', exercise: items('Chuva de cifras com tensões', '15 cifras seguidas, sem nomes nas teclas. Média abaixo de 6 s.', tensions, 15, 48, 84, 0.85, 'off', 6000) },
    { kind: 'exercise', id: 'l83-quiz', exercise: quiz('Tensões', 'Responda sem tocar.', TENSION_Q) },
  ],
  review: [compound, tensions, choice(TENSION_Q, 'tensoes')],
  checkpoint: [
    items('Chuva de cifras', '15 cifras com tensão, sem dica. Meta: 85% e média abaixo de 6 s.', tensions, 15, 48, 84, 0.85, 'off', 6000),
    items('Intervalos compostos', '10 intervalos, sem dica. Meta: 9 de 10.', compound, 10, 45, 88, 0.9, 'off'),
  ],
  exit: [tensions, choice(TENSION_Q, 'tensoes')],
};

const l84: Lesson = {
  n: 84,
  id: 'l84',
  title: 'Voicings sem fundamental',
  minutes: 60,
  objectives: [
    'Consigo tocar as formas A e B dos voicings sem fundamental de ii, V e I.',
    'Consigo encadear o ii–V–I sem fundamental em seis tons, andando no máximo o caminho mais curto + 2 semitons.',
    'Consigo tocar o ii–V–I com a fundamental na esquerda e o voicing na direita, no tempo.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Tirar a fundamental',
      body: `Num grupo, o baixista já toca a fundamental. Se o pianista toca de novo, a nota sobra e o som embola. A solução dos pianistas de jazz e de bossa (Bill Evans e Wynton Kelly popularizaram) é o **voicing sem fundamental** (*rootless*): a direita (ou a esquerda, num grupo) toca **3ª, 7ª e duas tensões ou a 5ª**, quatro notas numa mão só.

Sozinho ao piano, você faz o papel dos dois: a **esquerda toca a fundamental** grave e a **direita, o voicing**. É o som "aberto" de piano de bossa.

Os voicings do ii–V–I maior:

- **ii, Dm7(9)**: 3ª, 5ª, 7ª, 9ª → Fá, Lá, Dó, Mi.
- **V, G7(13)**: 3ª, 7ª, 9ª, 13ª → Si, Fá, Lá, Mi (a 5ª sai; entra a 13ª).
- **I, C7M(9)**: 3ª, 5ª, 7ª, 9ª → Mi, Sol, Si, Ré.`,
    },
    {
      kind: 'text',
      title: 'Formas A e B',
      body: `As mesmas quatro notas podem ser empilhadas de dois jeitos:

- **Forma A**: a **3ª embaixo**. Dm7(9) A = Fá, Lá, Dó, Mi.
- **Forma B**: a **7ª embaixo**. Dm7(9) B = Dó, Mi, Fá, Lá.

No V7(13), a forma A é 3ª, 13ª, 7ª, 9ª (Si, Mi, Fá, Lá) e a forma B é 7ª, 9ª, 3ª, 13ª (Fá, Lá, Si, Mi).

O truque: no ii–V–I as formas **se alternam**. Começando o ii na forma A, o V cai sozinho na B e o I volta para a A. A mão quase não sai do lugar, e as vozes andam por meio tom ou um tom.`,
    },
    {
      kind: 'example',
      title: 'ii–V–I em Dó, A → B → A',
      steps: [
        { say: '**Dm7(9)**, forma A: Ré no baixo; Fá, Lá, Dó, Mi na direita.', play: { bpm: 66, steps: [{ midis: [n('D3'), n('F4'), n('A4'), n('C5'), n('E5')], beats: 3 }] }, keys: [n('F4'), n('A4'), n('C5'), n('E5')] },
        { say: '**G7(13)**, forma B: só o Dó desce para Si. Fá, Lá, Si, Mi.', play: { bpm: 66, steps: [{ midis: [n('G2'), n('F4'), n('A4'), n('B4'), n('E5')], beats: 3 }] }, keys: [n('F4'), n('A4'), n('B4'), n('E5')] },
        { say: '**C7M(9)**, forma A de novo, mais grave: Mi, Sol, Si, Ré. Fá → Mi, Lá → Sol, Mi → Ré; o Si fica.', play: { bpm: 66, steps: [{ midis: [n('C3'), n('E4'), n('G4'), n('B4'), n('D5')], beats: 4 }] }, keys: [n('E4'), n('G4'), n('B4'), n('D5')] },
        { say: 'Os três seguidos, no tempo.', play: { bpm: 72, steps: [{ midis: [n('D3'), n('F4'), n('A4'), n('C5'), n('E5')], beats: 2 }, { midis: [n('G2'), n('F4'), n('A4'), n('B4'), n('E5')], beats: 2 }, { midis: [n('C3'), n('E4'), n('G4'), n('B4'), n('D5')], beats: 4 }] } },
      ],
    },
    { kind: 'exercise', id: 'l84-formas', exercise: items('Formas A e B', 'O app pede um acorde e uma forma, em seis tons. Só a direita, quatro notas; a nota de baixo diz a forma.', rlChord, 12, 48, 84, 0.85, 'fade') },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'voicing grave demais',
      body: 'Abaixo do Ré3, notas a um tom ou meio tom de distância viram ruído (é o "limite grave" dos intervalos). Mantenha a nota de baixo do voicing entre o Ré3 e o Sol4. Se o tom levar o voicing para baixo disso, suba a mão inteira uma oitava.',
    },
    {
      kind: 'text',
      title: 'Conduzir nos tons',
      body: `Agora o ii–V–I inteiro, com a fundamental na esquerda. O app confere a condução: em cada troca, a direita pode andar no máximo o **caminho mais curto + 2 semitons** (somando o movimento das quatro vozes). Quem pula para a posição "de livro" estoura a conta.

Os seis tons: **Dó, Fá, Si♭, Mi♭, Sol e Ré**. Em todos, o primeiro acorde começa na forma A, com a 3ª do ii (o 4º grau do tom) entre Fá3 e Mi4.

Dica de leitura: a 3ª do ii é o **4º grau** do tom e a 7ª do ii é a **tônica**. Em Mi♭ maior: Fm7(9) começa no Lá♭ (forma A): Lá♭, Dó, Mi♭, Sol.`,
    },
    { kind: 'exercise', id: 'l84-conducao', exercise: items('ii–V–I sem fundamental', 'Seis tons sorteados. Baixo na esquerda, quatro notas na direita, andando o mínimo.', rlSeq, 8, 36, 84, 0.85, 'fade') },
    { kind: 'exercise', id: 'l84-tempo', exercise: quickTimed('ii–V–I no tempo', 'Fundamental e voicing juntos, 2 tempos no ii e no V, 4 no I, duas vezes. De 60 até 72 BPM.', (rng) => rootlessHands(rng, 60), { ladder: { from: 60, to: 72, step: 4 } }) },
    { kind: 'exercise', id: 'l84-quiz', exercise: quiz('Voicings sem fundamental', 'Responda sem tocar.', ROOTLESS_Q) },
  ],
  review: [rlChord, rlSeq, choice(ROOTLESS_Q, 'rootless')],
  checkpoint: [
    items('ii–V–I sem fundamental', '8 progressões em tons sorteados, sem dica. Meta: 7 de 8, com a condução no limite.', rlSeq, 8, 36, 84, 0.85, 'off'),
    items('Formas A e B', '10 acordes, sem dica. Meta: 9 de 10.', rlChord, 10, 48, 84, 0.9, 'off'),
  ],
  exit: [rlChord, choice(ROOTLESS_Q, 'rootless')],
};

// ---------- unidade ----------

const unit: Unit = {
  n: 11,
  id: 'u11',
  title: 'Brasil ao piano',
  goal: 'Tocar baião, bossa e choro ao piano, com tensões e voicings sem fundamental, e usar os modos como cores.',
  technique: 'Grooves no metrônomo: baião (3 + 3 + 2) e bossa (longa-curta) na esquerda, de 64 rumo a 80 BPM, janela de ±50 ms. Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l82, l83, l84],
  songs: [baiao, bossa, tanguinho],
  final: {
    songId: 'u11-tanguinho',
    brief: 'Um tango brasileiro original no estilo de Ernesto Nazareth: semicolcheias na direita e, na esquerda, a habanera (baixo, acorde, baixo, acorde) que é o motor do choro e do maxixe. As secundárias A7 e G7 da unidade 10 dão o tempero. Comece a 44 BPM e suba até 60.',
  },
};

export default unit;
