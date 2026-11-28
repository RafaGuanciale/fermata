// Unidade 11 — Jazz e pop ao piano (lições 82 a 89). Projeto final: Maple Leaf Rag, tema A (Scott Joplin, 1899).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md. Músicas: docs/curso/MUSICAS.md.
// Até 27/11/2026 esta unidade era "Brasil ao piano" (baião, bossa, choro); o Rafael trocou por jazz e pop. As músicas protegidas
// (Imagine, Fly Me to the Moon, So What...) entram só pelo catálogo (src/course/pieces.ts); o código só tem domínio público.

import { chordLabel, choice, echo, keyName, mix, nearestVoicing, parseChord, playChord, spellInterval, spellScale, type ChoiceQuestion } from '../gens';
import { PC_NAMES, n, pcOf, pick, ptName, shuffle } from '../music';
import { melodyTask, rhythmTask, sci, swingBeat, swingTwoHands, twoHandTask } from '../tasks';
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
function modeByEar(opts: { tonics: Midi[]; pairs: [Mode, Mode][]; skill?: string }): ItemGen {
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

// ---------- balada pop (lição 82) ----------

/** I–V–vi–IV em Dó: a fundamental da esquerda e a tríade da direita (posição perto do Dó4). */
const POP_ROOTS: Record<string, Midi> = { C: n('C3'), G: n('G2'), Am: n('A2'), F: n('F2') };
const POP_RH: Record<string, string> = { C: 'E4+G4+C5', G: 'D4+G4+B4', Am: 'E4+A4+C5', F: 'F4+A4+C5' };
const POP_CHART = ['C', 'G', 'Am', 'F'];

/** Padrão 1 da balada: 1-5-8-5 em colcheias, duas vezes no compasso. */
const octBar = (c: string) => {
  const r = POP_ROOTS[c];
  return rep(`${sci(r)}:0.5 ${sci(r + 7)}:0.5 ${sci(r + 12)}:0.5 ${sci(r + 7)}:0.5`, 2).replace(/ \| /g, ' ');
};
/** Padrão 2: arpejo com a décima, 1-5-8-10-8-5-8-5. */
const arpBar = (c: string) => {
  const r = POP_ROOTS[c];
  const tenth = r + (c === 'Am' ? 15 : 16);
  return [r, r + 7, r + 12, tenth, r + 12, r + 7, r + 12, r + 7].map((m) => `${sci(m)}:0.5`).join(' ');
};
const blockBar = (c: string) => rep(`${POP_RH[c]}:1`, 4).replace(/ \| /g, ' ');

const POP_CAPTION = 'C | G | Am | F (I – V – vi – IV), duas vezes.';

// ---------- swing e comping (lições 85, 87 e 89) ----------

/** Ritmo no swing: as colcheias do contratempo caem no último terço do tempo. */
function swingRhythm(text: string, opts: { bpm: number; caption: string }): TimedTask {
  const base = rhythmTask(text, { bpm: opts.bpm, caption: opts.caption });
  return { ...base, events: base.events.map((e) => ({ ...e, beat: swingBeat(e.beat) })), swing: true };
}

/** Charleston na direita (no 1 e no "e" do 2) com um acorde; two-feel na esquerda (fundamental no 1, a 5ª do acorde embaixo no 3). */
const charleston = (c: string) => `${c}:1.5 ${c}:0.5 r:2`;
const twoFeel = (root: Midi) => `${sci(root)}:2 ${sci(root - 5)}:2`;

/** ii (1 compasso), V (1) e I (2) em swing, num tom sorteado: voicings sem fundamental no Charleston e o baixo em two-feel. */
function swingComp(rng: Rng, bpm: number, cycles = 1, keys = RL_KEYS.filter((x) => ['C', 'F', 'Bb', 'G'].includes(x.key))): TimedTask {
  const k = pick(rng, keys);
  const { upper } = rootlessChain(k.pc);
  // Fundamental entre Mi2 e Ré♯3, para a 5ª abaixo caber e a direita (de Fá3 para cima) ficar livre.
  const roots = (['ii', 'V', 'I'] as Role[]).map((x) => 40 + ((k.pc + ROOTLESS[x].deg - 40 + 120) % 12));
  const chord = (i: number) => upper[i].map(sci).join('+');
  const r = [charleston(chord(0)), charleston(chord(1)), charleston(chord(2)), charleston(chord(2))].join(' | ');
  const l = [twoFeel(roots[0]), twoFeel(roots[1]), twoFeel(roots[2]), twoFeel(roots[2])].join(' | ');
  const flats = k.fifths < 0 || k.key === 'C';
  const names = (['ii', 'V', 'I'] as Role[]).map((x) => chordLabel(symbolOf(k.pc, x, flats)));
  return swingTwoHands(rep(r, cycles), rep(l, cycles), {
    bpm,
    fifths: k.fifths,
    caption: `${keyName(k.key)} maior: ${names[0]} | ${names[1]} | ${names[2]} | ${names[2]}. Direita no Charleston (1 e o "e" do 2, em swing); esquerda: fundamental no 1, a 5ª do acorde embaixo no 3.`,
  });
}

/** Qualidade da cifra → voicing sem fundamental (m7 como o ii, 7 como o V, 7M como o I). */
const RL_BY_Q: Record<string, Role> = { m7: 'ii', '7': 'V', '7M': 'I' };

/** Comping em swing sobre uma cifra (um acorde por compasso): voicings sem fundamental conduzidos no Charleston, baixo em two-feel. */
function chartComping(chart: string[], opts: { bpm: number; fifths: number; caption: string }): TimedTask {
  const parsed = chart.map((c) => {
    const m = /^([A-G](?:#|b)?)(m7|7M|7)$/.exec(c)!;
    const root = parseChord(`${m[1]}7`).root;
    const role = RL_BY_Q[m[2]];
    return { root, pcs: ROOTLESS[role].offs.map((o) => (root + o) % 12), first: (root + ROOTLESS[role].offs[0]) % 12, offs: ROOTLESS[role].offs };
  });
  const f = parsed[0];
  const third = 53 + ((f.first - 53 + 120) % 12);
  let cur = f.offs.map((o) => third + o - f.offs[0]);
  const rs: string[] = [];
  const ls: string[] = [];
  parsed.forEach((p, i) => {
    if (i > 0) cur = nearestVoicing(cur, p.pcs);
    rs.push(charleston(cur.map(sci).join('+')));
    ls.push(twoFeel(40 + ((p.root - 40 + 120) % 12)));
  });
  return swingTwoHands(rs.join(' | '), ls.join(' | '), { bpm: opts.bpm, fifths: opts.fifths, caption: opts.caption });
}

/** O ciclo de quintas em Lá menor (o caminho de Fly Me to the Moon e de Autumn Leaves, com Dm7 no lugar do meio-diminuto). */
const CYCLE_CHART = ['Am7', 'Dm7', 'G7', 'C7M', 'F7M', 'Dm7', 'E7', 'Am7'];
const CYCLE_CAPTION = 'Am7 | Dm7 | G7 | C7M | F7M | Dm7 | E7 | Am7. Direita: voicings sem fundamental no Charleston. Esquerda: fundamental e a 5ª embaixo.';
const cycleTask = (bpm: number) => () => chartComping(CYCLE_CHART, { bpm, fifths: 0, caption: CYCLE_CAPTION });

/** Melodia de notas-guia (3ª ou 7ª de cada acorde, andando por grau) sobre shells no Charleston. */
const GUIDE_R = ['G4:4', 'F4:4', 'F4:4', 'E4:4', 'E4:4', 'F4:4', 'G#4:4', 'A4:4'];
const SHELLS = ['A2+G3', 'D3+F3', 'G2+F3', 'C3+E3', 'F2+E3', 'D3+F3', 'E2+D3', 'A2+G3'];
const guideTask = (bpm: number) => () =>
  swingTwoHands(GUIDE_R.join(' | '), SHELLS.map((s) => charleston(s)).join(' | '), {
    bpm,
    caption: 'Direita: Sol, Fá, Fá, Mi, Mi, Fá, Sol♯, Lá (a 7ª ou a 3ª de cada acorde). Esquerda: shells no Charleston: Lá–Sol, Ré–Fá, Sol–Fá, Dó–Mi, Fá–Mi, Ré–Fá, Mi–Ré, Lá–Sol.',
  });

// ---------- pop rearmonizado (lição 88) ----------

/** C | G/B | Am | Am7/G | F | C/E | Dm7 | G: o baixo desce por grau, a direita fica perto do Dó4. */
const DESC_L = ['C3:4', 'B2:4', 'A2:4', 'G2:4', 'F2:4', 'E2:4', 'D2:4', 'G2:4'];
const DESC_PLAIN = ['C4+E4+G4', 'B3+D4+G4', 'C4+E4+A4', 'C4+E4+A4', 'C4+F4+A4', 'C4+E4+G4', 'C4+F4+A4', 'B3+D4+G4'].map((c) => rep(`${c}:1`, 4).replace(/ \| /g, ' '));
/** A mesma linha com add9, 7M, sus e o m7(9) sem fundamental da lição 84. */
const DESC_COLOR = [
  'E4+G4+D5:2 E4+G4+D5:2', 'D4+G4+A4:2 D4+G4+A4:2', 'C4+E4+G4:2 C4+E4+G4:2', 'C4+E4+A4:2 C4+E4+A4:2',
  'C4+E4+A4:2 C4+E4+A4:2', 'D4+G4+C5:2 D4+G4+C5:2', 'C4+E4+F4+A4:2 C4+E4+F4+A4:2', 'C4+D4+F4:2 B3+D4+F4:2',
];
const descTask = (color: boolean, bpm: number) => () =>
  twoHandTask((color ? DESC_COLOR : DESC_PLAIN).join(' | '), DESC_L.join(' | '), {
    bpm,
    caption: color
      ? 'Cadd9 | Gadd9/B | Am7 | Am7/G | F7M | Cadd9/E | Dm7(9) | G7sus4 → G7. Esquerda: Dó, Si, Lá, Sol, Fá, Mi, Ré, Sol.'
      : 'C | G/B | Am | Am/G | F | C/E | Dm7 | G. Esquerda: Dó, Si, Lá, Sol, Fá, Mi, Ré, Sol (uma semibreve por compasso).',
  });

const BASS_MOTIFS = [
  [n('C3'), n('B2'), n('A2'), n('G2')], [n('C3'), n('B2'), n('Bb2'), n('A2')], [n('F2'), n('E2'), n('D2'), n('G2')],
  [n('A2'), n('G2'), n('F#2'), n('F2'), n('E2')], [n('G2'), n('A2'), n('B2'), n('C3')], [n('C3'), n('B2'), n('A2'), n('G2'), n('F2'), n('E2')],
  [n('D3'), n('C3'), n('B2'), n('A2'), n('G2')], [n('E2'), n('F2'), n('F#2'), n('G2')],
];
const bassEar = echo({ motifs: BASS_MOTIFS, bpm: 84, skill: 'linha-de-baixo-ouvido' });

// ---------- músicas ----------

// Maple Leaf Rag (Scott Joplin, 1899; domínio público), primeira parte (tema A) com a anacruse. Fonte: Mutopia Project,
// JoplinS/maple/maple.ly (Chris Sawer, a partir da reprodução da edição original de 1899, domínio público); alturas absolutas
// tiradas com o `ly rel2abs` do python-ly, sem rodar o LilyPond. Arranjo do Fermata: tom (Lá♭ maior), 2/4 e ritmo originais,
// com as semicolcheias e a síncope; a direita toca a nota de cima das oitavas e dos acordes; na esquerda, as oitavas do baixo
// viram a nota de baixo e os acordes ficam como na edição; a nota ligada pela barra vira nota + pausa (o motor não liga
// compassos), e o Mi♭ do compasso 2 (semínima ligada a semicolcheia, figura que o motor não escreve) vira semínima e pausa;
// a parte toca uma vez, com a segunda casa, e o último baixo (que leva ao tema B) vira pausa. Dó♭ e Fá♭ da edição estão
// escritos como Si e Mi (mesma tecla).
const MAPLE_A1 = 'r:0.25 Ab4:0.25 Eb5:0.25 Ab4:0.25 C5:0.25 Eb5:0.5 G4:0.25';
const MAPLE_R = [
  'r:2',
  MAPLE_A1, 'Eb5:0.25 G4:0.25 Bb4:0.25 Eb5:1 r:0.25',
  MAPLE_A1, 'Eb5:0.25 G4:0.25 Bb4:0.25 Eb5:0.75 r:0.25 Eb5:0.25',
  'r:0.25 Ab4:0.25 B4:0.25 E5:0.25 r:0.25 Eb5:0.25 r:0.25 Eb5:0.25', 'r:0.25 Ab4:0.25 B4:0.25 E5:0.25 r:0.25 Eb5:0.25 r:0.5',
  'r:0.25 Ab2:0.25 B2:0.25 Ab3:0.25 r:0.25 Ab3:0.25 B3:0.25 Ab4:0.25', 'r:0.25 Ab4:0.25 B4:0.25 Ab5:0.25 r:0.25 Ab5:0.25 B5:0.25 Ab6:0.25',
  'Ab6:0.5 Ab6:0.5 Ab6:0.5 Ab6:0.25 Ab6:0.25', 'r:0.25 Eb6:0.25 F6:0.25 C6:0.25 Eb6:0.25 F6:0.5 Ab5:0.25',
  'r:0.25 Bb5:0.25 B5:0.25 Ab5:0.25 Bb5:0.25 C6:0.5 Ab5:0.25', 'C6:0.25 Ab5:0.25 Bb5:0.5 Ab5:0.5 r:0.25 Ab5:0.25',
  'r:0.5 Ab5:0.5 Ab5:0.5 Ab5:0.25 Ab5:0.25', 'r:0.25 Eb5:0.25 F5:0.25 C5:0.25 Eb5:0.25 F5:0.5 Ab4:0.25',
  'r:0.25 Bb4:0.25 B4:0.25 Ab4:0.25 Bb4:0.25 C5:0.5 Ab4:0.25', 'C5:0.25 Ab4:0.25 Bb4:0.5 Ab4:0.5 r:0.5',
];
const AB = 'Eb3+Ab3+C4';
const EB7 = 'Eb3+G3+Db4';
const MAPLE_L = [
  'r:1.5 Eb2:0.5',
  `Ab2:0.5 ${AB}:0.5 ${AB}:0.5 A2:0.5`, `Bb2:0.5 ${EB7}:0.5 ${EB7}:0.5 Eb2:0.5`,
  `Ab2:0.5 ${AB}:0.5 ${AB}:0.5 A2:0.5`, `Bb2:0.5 ${EB7}:0.5 ${EB7}:0.5 Eb2:0.5`,
  'E2:1 Eb2:0.5 Eb2:0.5', 'E2:1 Eb2:0.5 r:0.5',
  'Ab1:0.5 r:0.5 Ab2:0.5 r:0.5', 'Ab3:0.5 r:0.5 Ab4:0.5 r:0.5',
  rep('D4+F4+Ab4+B4:0.5', 4).replace(/ \| /g, ' '), rep('Eb4+Ab4+C5:0.5', 4).replace(/ \| /g, ' '),
  'E4+Ab4+B4:0.5 E4+Ab4+B4:0.5 Eb4+Ab4+C5:0.5 Eb4+Ab4+C5:0.5', 'Eb4+Ab4+C5:0.5 Eb4+G4+Db5:0.5 Ab4+C5:0.5 r:0.5',
  rep('D3+F3+Ab3+B3:0.5', 4).replace(/ \| /g, ' '), rep(`${AB}:0.5`, 4).replace(/ \| /g, ' '),
  `E3+Ab3+B3:0.5 E3+Ab3+B3:0.5 ${AB}:0.5 ${AB}:0.5`, `${AB}:0.5 ${EB7}:0.5 Ab3+C4:0.5 r:0.5`,
];
/** Compassos `from` a `to` (contando a anacruse como compasso 0). */
const mapleBars = (from: number, to: number) => ({ r: MAPLE_R.slice(from, to + 1).join(' | '), l: MAPLE_L.slice(from, to + 1).join(' | ') });
const mapleTask = (from: number, to: number, bpm: number, caption?: string) => () => {
  const b = mapleBars(from, to);
  return twoHandTask(b.r, b.l, { bpm, beatsPerBar: 2, fifths: -4, caption });
};

const maple: SongSpec = {
  id: 'u11-maple',
  title: 'Maple Leaf Rag, tema A',
  composer: 'Scott Joplin',
  arrangement: 'arranjo do Fermata a partir da edição original de 1899 (Mutopia): tom, 2/4 e ritmo originais, com as semicolcheias e a síncope; a direita toca a nota de cima das oitavas; a esquerda faz o baixo numa nota só e os acordes da edição; a nota ligada pela barra (e o Mi♭ longo do compasso 2) vira nota e pausa; o tema A uma vez, com a segunda casa',
  bpm: 80,
  beatsPerBar: 2,
  fifths: -4,
  right: MAPLE_R.join(' | '),
  left: MAPLE_L.join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// ---------- geradores reaproveitados ----------

const compound = compoundInterval({ from: ['C4', 'D4', 'E4', 'F4', 'G3', 'A3', 'Bb3'], ivs: ['9m', '9M', '9A', '11J', '11A', '13m', '13M'] });
const TENSION_SYMBOLS = ['C7M(9)', 'F7M(9)', 'G7(13)', 'D7(13)', 'Dm7(9)', 'Am7(9)', 'G7(b9)', 'E7(b9)', 'A7(#9)', 'G7(#9)', 'F7M(#11)', 'C7M(#11)', 'A7(b13)', 'E7(b13)', 'Bb7(9)', 'C6(9)', 'Dm7(11)'];
const tensions = playChord({ symbols: TENSION_SYMBOLS, low: 48, high: 84, omitFifth: true, skill: 'tensoes' });
const rlChord = rootlessChord({ keys: RL_KEYS.map((x) => x.key), roles: ['ii', 'V', 'I'], forms: ['A', 'B'] });
const rlSeq = rootlessSeq({ keys: RL_KEYS.map((x) => x.key), lead: 2 });
const slashChords = playChord({ symbols: ['C', 'G/B', 'Am', 'Am7/G', 'F', 'C/E', 'Dm7', 'G', 'F/A', 'Em'], low: 36, high: 84, skill: 'baixo-invertido' });
const popChords = playChord({ symbols: ['Cadd9', 'Gsus4', 'G/B', 'Am7', 'F7M', 'C/E', 'Dm7', 'Fadd9', 'Am7/G', 'Dsus4', 'Em7', 'F/A'], low: 36, high: 84, skill: 'cifras-pop' });


// ---------- perguntas ----------

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

const POP_Q: ChoiceQuestion[] = [
  { q: 'Na balada pop ao piano, a esquerda costuma…', options: ['Fazer o baixo e o movimento (1-5-8, arpejo), enquanto a direita segura os acordes ou a melodia', 'Tocar a melodia', 'Ficar parada no tempo 1'], answer: 0, why: 'A esquerda faz o papel do baixo e da guitarra base; a direita, o dos acordes e da voz.' },
  { q: 'G/B é…', options: ['O acorde de Sol com o Si no baixo', 'Sol e Si tocados juntos, sem mais nada', 'Um acorde de Si'], answer: 0, why: 'A letra antes da barra é o acorde; a de depois, a nota do baixo. Aqui o baixo é a 3ª do Sol: a 1ª inversão.' },
  { q: 'Por que C – G/B – Am soa tão "liso"?', options: ['O baixo desce por grau: Dó, Si, Lá', 'Porque os três acordes são maiores', 'Porque não tem baixo'], answer: 0, why: 'A inversão põe o Si no baixo, entre o Dó e o Lá: a linha anda um passo por vez.' },
  { q: 'No arpejo 1-5-8-10 sobre Dó, a décima é…', options: ['Mi, a 3ª uma oitava acima', 'Ré', 'Si'], answer: 0, why: 'A 10ª é a 3ª + oitava: em Dó3, o Mi4. Ela diz se o acorde é maior ou menor.' },
  { q: 'Em Am, a décima do arpejo 1-5-8-10 é…', options: ['Dó (10ª menor, 15 semitons)', 'Dó♯ (10ª maior)', 'Mi'], answer: 0, why: 'Lá menor tem a 3ª menor (Dó); a 10ª é a mesma nota uma oitava acima.' },
  { q: 'I – V – vi – IV em Dó é…', options: ['C – G – Am – F', 'C – F – G – C', 'Am – F – C – G'], answer: 0, why: 'A progressão de centenas de canções pop (unidade 7). Am – F – C – G é a mesma, começando no vi.' },
];

const l82: Lesson = {
  n: 82,
  id: 'l82',
  title: 'Baladas pop: a mão esquerda',
  minutes: 60,
  objectives: [
    'Consigo tocar dois padrões de esquerda de balada (1-5-8 e arpejo com a décima) sobre I – V – vi – IV, a 80 BPM.',
    'Consigo tocar acordes com o baixo invertido (G/B, C/E, Am7/G) pela cifra.',
    'Consigo juntar os acordes da direita com o padrão da esquerda, 8 compassos no tempo.',
  ],
  music: [
    { piece: 'imagine', why: 'Imagine, do John Lennon: o piano bate os acordes em semínimas (C – C7M – F) e a esquerda segura o baixo. É o padrão mais simples da balada, e o mais famoso.' },
    { piece: 'hallelujah', why: 'Hallelujah, do Leonard Cohen, em 6/8: a esquerda quebra o acorde (C – Am) num movimento que não para, como o arpejo desta lição.' },
    { piece: 'someone-like-you', why: 'Someone Like You, da Adele: o piano repete um acorde quebrado em colcheias do começo ao fim, com o baixo descendo (Lá – Sol♯ – Fá♯ – Ré). É o arpejo com baixo invertido desta lição, numa música inteira.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A esquerda faz a banda',
      body: `Numa balada pop gravada com banda, o baixo toca a fundamental, a guitarra ou o teclado fazem o movimento e a voz canta. Ao piano solo, você divide isso entre as mãos:

- a **esquerda** é o baixo e o movimento: a fundamental no tempo 1 e um desenho que não deixa o som morrer;
- a **direita** segura os acordes (ou, mais tarde, a melodia).

As baladas mais conhecidas usam poucos desenhos de esquerda. Em **Imagine**, os acordes vêm em semínimas; em **Hallelujah** e **Someone Like You**, o acorde é quebrado em colcheias. Com dois desenhos e a progressão **I – V – vi – IV** (C – G – Am – F, da unidade 7) você já acompanha boa parte do pop.`,
    },
    {
      kind: 'text',
      title: 'Padrão 1: 1-5-8',
      body: `O primeiro desenho é o mais usado: **fundamental, 5ª e oitava**, e volta na 5ª, em colcheias. Em Dó: Dó3, Sol3, Dó4, Sol3, e de novo. A mão fica aberta, com o 5º dedo na fundamental, o 2º na 5ª e o polegar na oitava, e não sai do lugar no compasso.

Na troca de acorde, só o 5º dedo procura a nova fundamental; a mão vai junto, com o mesmo formato. Em C – G – Am – F: Dó3, Sol2, Lá2, Fá2.`,
    },
    {
      kind: 'example',
      title: 'Os dois padrões',
      steps: [
        { say: 'Padrão 1 em Dó: Dó, Sol, Dó, Sol, duas vezes no compasso.', play: { bpm: 80, steps: [n('C3'), n('G3'), n('C4'), n('G3'), n('C3'), n('G3'), n('C4'), n('G3')].map((m) => ({ midis: [m], beats: 0.5 })) }, keys: [n('C3'), n('G3'), n('C4')] },
        { say: 'Padrão 2 em Dó: Dó, Sol, Dó, **Mi** (a décima), e volta. A décima abre o som e diz que o acorde é maior.', play: { bpm: 80, steps: [n('C3'), n('G3'), n('C4'), n('E4'), n('C4'), n('G3'), n('C4'), n('G3')].map((m) => ({ midis: [m], beats: 0.5 })) }, keys: [n('C3'), n('G3'), n('C4'), n('E4')] },
        { say: 'Agora com a direita: os acordes em semínimas em C – G – Am – F, e a esquerda andando 1-5-8-5 (aqui uma nota por tempo, para ouvir a soma).', play: { bpm: 80, steps: POP_CHART.flatMap((c) => [0, 1, 2, 3].map((i) => ({ midis: [POP_ROOTS[c] + [0, 7, 12, 7][i], ...POP_RH[c].split('+').map((x) => n(x))], beats: 1 }))) } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l82-padrao1',
      exercise: quickTimed('Padrão 1 na esquerda', 'Só a esquerda: 1-5-8-5 em colcheias, em C | G | Am | F, de 60 até 80 BPM. Janela de ±50 ms.', () => melodyTask(POP_CHART.map(octBar).join(' | '), { bpm: 60, clef: 'bass', caption: 'Dó–Sol–Dó–Sol | Sol–Ré–Sol–Ré | Lá–Mi–Lá–Mi | Fá–Dó–Fá–Dó.' }), { window: 50, ladder: { from: 60, to: 80, step: 4 } }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'acentuar todas as colcheias',
      body: 'O padrão de esquerda é fundo, não melodia. Se cada colcheia sai com a mesma força, a balada vira estudo de técnica. Ponha peso na fundamental do tempo 1 e deixe as outras notas leves, quase sopradas: o ouvido tem que sentir o baixo e a direita na frente.',
    },
    {
      kind: 'text',
      title: 'Padrão 2: o arpejo com a décima',
      body: `O segundo desenho troca a volta na 5ª por uma subida até a **décima** (a 3ª uma oitava acima): **1-5-8-10**, e desce 8-5-8-5. Em Dó: Dó3, Sol3, Dó4, Mi4, Dó4, Sol3, Dó4, Sol3.

A décima é a nota que diz a qualidade: em Dó maior ela é Mi; em Lá menor, Dó (10ª menor, 15 semitons). A mão precisa abrir mais. Se não alcançar, não estique: solte a fundamental depois de tocá-la e deixe o pulso girar até a décima. O pedal (unidade 4) segura o baixo por você.`,
    },
    {
      kind: 'exercise',
      id: 'l82-padrao2',
      exercise: quickTimed('Arpejo com a décima', 'Só a esquerda, em C | G | Am | F, de 56 até 76 BPM. Janela de ±50 ms.', () => melodyTask(POP_CHART.map(arpBar).join(' | '), { bpm: 56, clef: 'bass', caption: 'Décimas: Mi (em C), Si (em G), Dó (em Am), Lá (em F).' }), { window: 50, ladder: { from: 56, to: 76, step: 4 } }),
    },
    {
      kind: 'text',
      title: 'O baixo invertido',
      body: `As baladas ao piano raramente deixam o baixo pular de fundamental em fundamental. Elas **invertem** um acorde para o baixo andar por grau. A cifra mostra isso com a barra: **G/B** é o Sol com o **Si no baixo**; **C/E**, o Dó com o Mi no baixo; **Am7/G**, o Lá menor com sétima e o Sol (a 7ª) no baixo.

Em C – **G/B** – Am, o baixo desce Dó, Si, Lá: a mesma progressão, agora com uma linha. Você já viu inversões na unidade 6; aqui elas trabalham para a esquerda. A direita toca o acorde normal, e a esquerda toca a nota depois da barra.`,
    },
    { kind: 'exercise', id: 'l82-inversoes', exercise: items('Acordes com o baixo invertido', 'Toque o acorde da cifra. Quando houver barra, a nota mais grave é a que vem depois dela.', slashChords, 8, 36, 84, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'Mãos juntas',
      body: `Junte os dois papéis: a direita toca as tríades em **semínimas**, perto do Dó4 (C: Mi, Sol, Dó; G: Ré, Sol, Si; Am: Mi, Lá, Dó; F: Fá, Lá, Dó), e a esquerda faz o **padrão 1**. Cada semínima da direita cai junto com uma colcheia da esquerda; a outra colcheia fica sozinha.

Estude a esquerda até ela ir sozinha. Depois junte devagar, contando "1 e 2 e 3 e 4 e". A meta é **80 BPM**, o andamento de muitas baladas.`,
    },
    {
      kind: 'exercise',
      id: 'l82-maos',
      exercise: quickTimed('Balada com as duas mãos', 'Acordes em semínimas na direita, padrão 1 na esquerda, 8 compassos, de 60 até 80 BPM. Janela de ±50 ms.', () => twoHandTask(rep(POP_CHART.map(blockBar).join(' | '), 2), rep(POP_CHART.map(octBar).join(' | '), 2), { bpm: 60, caption: `${POP_CAPTION} Esquerda no padrão 1 (1-5-8-5).` }), { window: 50, ladder: { from: 60, to: 80, step: 4 } }),
    },
    { kind: 'exercise', id: 'l82-quiz', exercise: quiz('Balada pop', 'Responda sem tocar.', POP_Q) },
  ],
  review: [slashChords, choice(POP_Q, 'pop')],
  checkpoint: [
    quickTimed('Balada no tempo', 'Acordes na direita e padrão 1 na esquerda, 8 compassos, a 80 BPM, sem dicas. Meta: 85% das notas em ±50 ms.', () => twoHandTask(rep(POP_CHART.map(blockBar).join(' | '), 2), rep(POP_CHART.map(octBar).join(' | '), 2), { bpm: 80 }), { window: 50 }),
    items('Baixo invertido', '8 cifras, sem dica. Meta: 7 de 8.', slashChords, 8, 36, 84, 0.85, 'off'),
  ],
  exit: [slashChords, choice(POP_Q, 'pop')],
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
  music: [
    { piece: 'fly-me', why: 'Fly Me to the Moon na versão do Sinatra com o Count Basie: os acordes do ciclo de quintas vêm cheios de 9ª e 13ª. Toque a cifra da sua partitura com as tensões desta lição.' },
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

Nem toda tensão serve em todo acorde. A regra prática: a tensão não pode ficar **meio tom acima** de uma nota do acorde (forma uma 9ª menor com ela e choca). O dominante é a exceção: nele, a ♭9 e a ♭13 são justamente o atrito que pede a resolução.

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
      body: `Numa jam ou num ensaio de banda, ninguém espera você montar o acorde nota por nota. O treino agora é de **velocidade**: a cifra aparece e a mão já vai.

Um método que acelera: leia a cifra em duas camadas. Primeiro a **tétrade** (C7M, G7, Dm7), que você já toca desde a unidade 8. Depois a **tensão**, que é uma nota só, quase sempre perto da fundamental (a 9ª é um tom acima dela; a 13ª, um tom acima da 5ª). Assim o acorde de 5 notas vira "tétrade + 1".

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
  music: [
    { piece: 'autumn-leaves', why: 'Autumn Leaves é uma fila de ii–V–I (Cm7 – F7 – B♭7M, depois o menor): com os voicings sem fundamental desta lição, a direita passa a música inteira quase sem sair do lugar enquanto a esquerda toca o baixo.' },
    { piece: 'fly-me', why: 'Fly Me to the Moon desce pelo ciclo de quintas (Am7 – Dm7 – G7 – C7M): é o encadeamento A → B → A da lição, compasso a compasso.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Tirar a fundamental',
      body: `Num grupo, o baixista já toca a fundamental. Se o pianista toca de novo, a nota sobra e o som embola. A solução dos pianistas de jazz e de bossa (Bill Evans e Wynton Kelly popularizaram) é o **voicing sem fundamental** (*rootless*): a direita (ou a esquerda, num grupo) toca **3ª, 7ª e duas tensões ou a 5ª**, quatro notas numa mão só.

Sozinho ao piano, você faz o papel dos dois: a **esquerda toca a fundamental** grave e a **direita, o voicing**. É o som "aberto" do piano de jazz.

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

const MODES_Q: ChoiceQuestion[] = [
  { q: 'A nota característica do lídio é…', options: ['A 4ª aumentada', 'A 7ª menor', 'A 2ª menor'], answer: 0, why: 'Lídio = maior com ♯4. Em Fá: Si natural.' },
  { q: 'A nota característica do dórico é…', options: ['A 6ª maior (num modo menor)', 'A 3ª maior', 'A 5ª diminuta'], answer: 0, why: 'Dórico = menor natural com a 6ª maior. Em Ré: Si natural.' },
  { q: 'Do mais claro para o mais escuro, a ordem é…', options: ['Lídio, jônio, mixolídio, dórico, eólio, frígio, lócrio', 'Jônio, dórico, frígio, lídio, mixolídio, eólio, lócrio', 'Eólio, dórico, jônio, lídio, frígio, mixolídio, lócrio'], answer: 0, why: 'Cada passo abaixa uma nota meio tom: ♯4 → 4, 7 → ♭7, 3 → ♭3, 6 → ♭6, 2 → ♭2, 5 → ♭5.' },
  { q: 'Ré dórico e Fá lídio usam…', options: ['As mesmas teclas brancas, com centros diferentes', 'Notas completamente diferentes', 'Só as pretas'], answer: 0, why: 'São rotações de Dó maior. O que muda o som é o centro: a tônica que o vamp e o final afirmam.' },
  { q: 'Para o dórico soar dórico, e não Dó maior, o mais importante é…', options: ['Afirmar o Ré: vamp em Dm, frase terminando no Ré, a 6ª (Si) em tempo forte', 'Tocar rápido', 'Usar o pedal'], answer: 0, why: 'O modo depende do centro. Sem um centro claro, as brancas soam como Dó maior.' },
  { q: 'Frígio sobre Mi é…', options: ['Mi, Fá, Sol, Lá, Si, Dó, Ré', 'Mi, Fá♯, Sol, Lá, Si, Dó, Ré', 'Mi, Fá♯, Sol♯, Lá, Si, Dó♯, Ré♯'], answer: 0, why: 'Menor natural com a 2ª menor: o Fá natural logo acima do Mi.' },
];

const modes6 = modeScale({ tonics: ['C4', 'D4', 'F4', 'G4', 'A4'], modes: ['jônio', 'lídio', 'mixolídio', 'dórico', 'eólio', 'frígio'] });
const modeEar = modeByEar({ tonics: [n('C4'), n('D4'), n('A3')], pairs: [['jônio', 'lídio'], ['jônio', 'mixolídio'], ['eólio', 'dórico'], ['eólio', 'frígio']] });

const DM7 = [n('D3'), n('F3'), n('A3'), n('C4')];
const G7V = [n('G2'), n('F3'), n('B3'), n('D4')];
const F7M = [n('F2'), n('E3'), n('A3'), n('C4')];
const G_F = [n('F2'), n('G3'), n('B3'), n('D4')];

const dorianImprov: Exercise = {
  kind: 'improv',
  title: 'Ré dórico sobre Dm7 – G7',
  how: 'O app alterna Dm7 e G7 (o G7 traz o Si, a 6ª maior de Ré). Improvise só nas brancas, com o Ré como casa: comece e termine nele e ponha o Si em tempo forte.',
  pcs: [0, 2, 4, 5, 7, 9, 11],
  bars: 8,
  bpm: 84,
  beatsPerBar: 4,
  backing: Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? DM7 : G7V)),
  low: 60,
  high: 84,
  pass: { inSet: 0.9, restsPer4: 1, endOn: [2] },
};

const lydianImprov: Exercise = {
  kind: 'improv',
  title: 'Fá lídio sobre F7M – G/F',
  how: 'O app alterna F7M e G/F (Sol maior com Fá no baixo: traz o Si, a 4ª aumentada de Fá). Improvise nas brancas com o Fá como casa e termine nele.',
  pcs: [0, 2, 4, 5, 7, 9, 11],
  bars: 8,
  bpm: 76,
  beatsPerBar: 4,
  backing: Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? F7M : G_F)),
  low: 60,
  high: 84,
  pass: { inSet: 0.9, restsPer4: 1, endOn: [5] },
};

const SWING_Q: ChoiceQuestion[] = [
  { q: 'Comping é…', options: ['Acompanhar com acordes curtos, deixando espaço para a melodia ou o solo', 'Tocar a melodia em oitavas', 'Improvisar a melodia'], answer: 0, why: 'Vem de "accompanying" e de "complementing": o acorde responde à melodia, não compete com ela.' },
  { q: 'O ritmo Charleston ataca…', options: ['No 1 e no "e" do 2', 'Nos quatro tempos', 'Só no 4'], answer: 0, why: 'Semínima pontuada e colcheia: o ritmo da dança dos anos 1920 que virou o comping mais básico do jazz.' },
  { q: 'No swing, o "e" do 2 cai…', options: ['No último terço do tempo 2', 'Exatamente no meio do tempo 2', 'No tempo 3'], answer: 0, why: 'As colcheias do swing são longa-curta, como tercina de semínima e colcheia (unidade 8).' },
  { q: 'O baixo em two-feel toca…', options: ['Duas notas por compasso: a fundamental no 1 e outra nota do acorde no 3', 'Quatro notas por compasso', 'Só no tempo 1'], answer: 0, why: 'É o baixo "a dois", em mínimas. O walking bass, com quatro notas por compasso, vem depois.' },
  { q: 'Na direita, o comping usa de preferência…', options: ['Os voicings sem fundamental da lição 84', 'A tríade com a fundamental embaixo', 'Oitavas'], answer: 0, why: 'A fundamental já está na esquerda; a direita fica com 3ª, 7ª e tensões, conduzidas.' },
  { q: 'O tema da Pantera Cor-de-Rosa é famoso pelas…', options: ['Aproximações cromáticas (meio tom abaixo da nota-alvo) num swing lento', 'Escalas de tons inteiros', 'Oitavas rápidas'], answer: 0, why: 'Henry Mancini escreveu a melodia com notas que chegam por meio tom, sobre um swing preguiçoso.' },
];

const l85: Lesson = {
  n: 85,
  id: 'l85',
  title: 'Comping de jazz em swing',
  minutes: 60,
  objectives: [
    'Consigo tocar o ritmo Charleston em swing na direita, no tempo.',
    'Consigo tocar o baixo em two-feel (fundamental e 5ª, em mínimas) na esquerda.',
    'Consigo acompanhar um ii–V–I em swing com as duas mãos, 8 compassos em ±50 ms, com voicings sem fundamental.',
  ],
  music: [
    { piece: 'pink-panther', why: 'The Pink Panther Theme, de Henry Mancini: um swing lento, com as notas chegando por meio tom. Toque a melodia na direita e, quando ela parar, responda com os acordes no Charleston desta lição.' },
    { piece: 'fly-me', why: 'Fly Me to the Moon na versão do Sinatra com a orquestra do Count Basie: o piano de Basie é o mestre do comping curto e com espaço. Acompanhe a cifra da sua partitura com os voicings da lição 84 e o ritmo desta.' },
    { piece: 'sweet-georgia', why: 'Sweet Georgia Brown (unidade 10) em swing: a cadeia D7 – G7 – C7 – F com o Charleston na direita e o two-feel na esquerda.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Swing e comping',
      body: `Na unidade 8 você aprendeu o **swing**: as colcheias escritas iguais se tocam **longa-curta**, como uma tercina de semínima e colcheia. Agora o swing vai para os acordes.

**Comping** é o jeito do pianista de jazz acompanhar: acordes **curtos**, em poucos lugares do compasso, deixando espaço para quem canta ou sola. O nome vem de *accompanying* (acompanhar) e lembra *complementing* (completar): o acorde responde à melodia, não briga com ela. Count Basie e Red Garland ficaram famosos tocando pouco e no lugar certo.

A harmonia da direita é a da lição 84: **voicings sem fundamental**. A esquerda faz o baixo.`,
    },
    {
      kind: 'text',
      title: 'O Charleston',
      body: `O desenho de comping mais básico tem o nome de uma dança dos anos 1920, o **Charleston**: **um ataque no 1 e outro no "e" do 2**, e o resto do compasso em silêncio.

No swing, o "e" do 2 não cai no meio do tempo: cai no **último terço** dele, logo antes do 3. Conte "**1** - e - **2** - (e) **3** - **4**", com o "e" atrasado, e toque os dois ataques curtos, soltando a mão.

O silêncio dos tempos 3 e 4 é parte do ritmo. É nele que a melodia respira.`,
    },
    {
      kind: 'example',
      title: 'Ouvir o Charleston',
      steps: [
        { say: 'Num acorde só (Dm7(9) sem fundamental: Fá, Lá, Dó, Mi), quatro compassos de Charleston, em swing: no 1 e logo antes do 3.', play: { bpm: 100, steps: [0, 1, 2, 3].flatMap(() => [{ midis: [n('F4'), n('A4'), n('C5'), n('E5')], beats: 5 / 3 }, { midis: [n('F4'), n('A4'), n('C5'), n('E5')], beats: 1 / 3 }, { midis: [], beats: 2 }]) }, keys: [n('F4'), n('A4'), n('C5'), n('E5')] },
        { say: 'Agora a esquerda em two-feel: Ré no 1, Lá (a 5ª, embaixo) no 3.', play: { bpm: 100, steps: [0, 1].flatMap(() => [{ midis: [n('D3')], beats: 2 }, { midis: [n('A2')], beats: 2 }]) }, keys: [n('D3'), n('A2')] },
        { say: 'Juntas: o baixo marca o 1 e o 3; a direita entra no 1 e responde no "e" do 2.', play: { bpm: 100, steps: [0, 1].flatMap(() => [{ midis: [n('D3'), n('F4'), n('A4'), n('C5'), n('E5')], beats: 5 / 3 }, { midis: [n('F4'), n('A4'), n('C5'), n('E5')], beats: 1 / 3 }, { midis: [n('A2')], beats: 2 }]) } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l85-charleston',
      exercise: quickTimed('O Charleston em qualquer tecla', 'Quatro compassos a 96 BPM, em qualquer tecla, em swing. Duas passadas boas.', () => swingRhythm(rep('x:1.5 x:0.5 r:2', 4), { bpm: 96, caption: 'Charleston: no 1 e no "e" do 2. No swing, o "e" cai no último terço do tempo, logo antes do 3.' }), { reps: 2, window: 60 }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'tocar o "e" reto',
      body: 'Quem vem da música clássica toca o "e" do 2 no meio do tempo, e o comping fica "quadrado". No swing ele chega **atrasado**, quase colado no 3. Cante "dum... ba-DAH" com o metrônomo e toque no "DAH". E solte o acorde logo: comping comprido vira parede.',
    },
    {
      kind: 'text',
      title: 'O baixo em two-feel',
      body: `Sem baixista, a esquerda faz o baixo. O jeito mais simples, e o que as bandas usam no primeiro chorus de muitos standards, é o **two-feel**: **duas notas por compasso**, em mínimas. A **fundamental no 1** e a **5ª do acorde, embaixo dela, no 3**. Em Dm7: Ré, Lá. Em G7: Sol, Ré. Em C7M: Dó, Sol.

A esquerda fica grave (entre o Si1 e o Ré♯3) para não esbarrar nos voicings da direita, que começam perto do Fá3. Mais tarde, quando o two-feel estiver automático, ele vira *walking bass*: quatro notas por compasso.`,
    },
    {
      kind: 'exercise',
      id: 'l85-esquerda',
      exercise: quickTimed('Two-feel na esquerda', 'Só a esquerda: Dm7 | G7 | C7M | C7M, de 80 até 104 BPM, janela de ±50 ms.', () => melodyTask('D3:2 A2:2 | G2:2 D2:2 | C3:2 G2:2 | C3:2 G2:2', { bpm: 80, clef: 'bass', caption: 'Fundamental no 1, a 5ª do acorde embaixo no 3: Ré–Lá, Sol–Ré, Dó–Sol.' }), { window: 50, ladder: { from: 80, to: 104, step: 8 } }),
    },
    {
      kind: 'text',
      title: 'Mãos juntas',
      body: `Junte devagar. As duas mãos atacam juntas só no **1**; o "e" do 2 é só da direita e o 3 é só da esquerda. Essa conversa é o balanço.

O exercício toca o **ii–V–I** num tom sorteado (Dó, Fá, Si♭ ou Sol): o ii por 1 compasso, o V por 1 e o I por 2. A direita usa os voicings sem fundamental conduzidos da lição 84, a esquerda faz o two-feel. A pauta mostra as duas mãos; a legenda diz a cifra.

Se a passada cair, toque cada mão sozinha com o metrônomo para achar qual está fugindo.`,
    },
    { kind: 'exercise', id: 'l85-maos', exercise: quickTimed('ii–V–I em swing', '8 compassos (o ii–V–I duas vezes), mãos juntas, de 80 até 104 BPM, janela de ±50 ms. Tom sorteado.', (rng) => swingComp(rng, 80, 2), { window: 50, ladder: { from: 80, to: 104, step: 8 } }) },
    { kind: 'exercise', id: 'l85-quiz', exercise: quiz('Swing e comping', 'Responda sem tocar.', SWING_Q) },
  ],
  review: [rlSeq, choice(SWING_Q, 'swing')],
  checkpoint: [
    quickTimed('Comping em swing, 8 compassos', 'ii–V–I duas vezes num tom sorteado, a 104 BPM, sem dicas. Meta: 85% das notas em ±50 ms.', (rng) => swingComp(rng, 104, 2), { window: 50 }),
  ],
  exit: [rlChord, choice(SWING_Q, 'swing')],
};

const l86: Lesson = {
  n: 86,
  id: 'l86',
  title: 'Modos como cores',
  minutes: 60,
  objectives: [
    'Consigo tocar jônio, lídio, mixolídio, dórico, eólio e frígio sobre a mesma tônica.',
    'Consigo dizer de ouvido qual de dois modos parecidos foi tocado.',
    'Consigo improvisar em Ré dórico e Fá lídio sobre um vamp, com 90% das notas no modo e terminando na tônica.',
  ],
  music: [
    { piece: 'so-what', why: 'So What, do Miles Davis (Kind of Blue, 1959): 16 compassos de Ré dórico, a ponte meio tom acima, em Mi♭ dórico, e a volta. É o vamp de Ré dórico desta lição, e o tema que pôs os modos no centro do jazz.' },
    { piece: 'eleanor-rigby', why: 'Eleanor Rigby, dos Beatles: Mi menor com a 6ª maior (o Dó♯) na melodia. É o dórico no pop, com a cor escura e ao mesmo tempo clara que a lição descreve.' },
    { piece: 'norwegian-wood', why: 'Norwegian Wood, dos Beatles: Mi maior com a 7ª menor (o Ré natural). É o mixolídio, o maior "sem pressa de resolver".' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Rotação ou cor?',
      body: `O jeito antigo de ensinar modos é por **rotação**: "Ré dórico são as brancas de Ré a Ré". É verdade, mas não ajuda a tocar: pensando assim, você toca Dó maior começando no Ré e o ouvido continua ouvindo Dó maior.

O jeito útil é por **cor**: fixe a tônica e compare com a escala maior ou menor que você já conhece. Cada modo é uma delas com **uma nota mudada**, a **nota característica**:

- **Lídio**: maior com a **4ª aumentada**. Dó lídio: Fá♯.
- **Jônio**: a escala maior.
- **Mixolídio**: maior com a **7ª menor**. Dó mixolídio: Si♭ (Norwegian Wood, em Mi, usa o Ré natural).
- **Dórico**: menor com a **6ª maior**. Dó dórico: Lá natural.
- **Eólio**: a menor natural.
- **Frígio**: menor com a **2ª menor**. Dó frígio: Ré♭.
- **Lócrio**: menor com 2ª menor e **5ª diminuta**. Instável, quase não serve de casa.

Nessa ordem eles vão do mais claro ao mais escuro: cada um abaixa uma nota do anterior.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 72,
      lit: [60, 62, 64, 66, 67, 69, 71, 72],
      labels: { 60: 'Dó', 62: 'Ré', 64: 'Mi', 66: 'Fá♯', 67: 'Sol', 69: 'Lá', 71: 'Si', 72: 'Dó' },
      caption: 'Dó lídio: Dó maior com o Fá♯. A 4ª aumentada deixa o som "flutuando", sem pressa de resolver.',
    },
    {
      kind: 'example',
      title: 'A mesma tônica, cores diferentes',
      steps: [
        { say: 'Dó **jônio** e Dó **lídio**: só o Fá muda. Escute o Fá♯ brilhar.', play: { bpm: 120, steps: [...MODE_STEPS['jônio'].map((x) => ({ midis: [60 + x], beats: 1 })), { midis: [], beats: 1 }, ...MODE_STEPS['lídio'].map((x) => ({ midis: [60 + x], beats: 1 }))] } },
        { say: 'Dó **eólio** e Dó **dórico**: só o Lá♭ vira Lá. O menor fica mais "claro".', play: { bpm: 120, steps: [...MODE_STEPS['eólio'].map((x) => ({ midis: [60 + x], beats: 1 })), { midis: [], beats: 1 }, ...MODE_STEPS['dórico'].map((x) => ({ midis: [60 + x], beats: 1 }))] } },
        { say: 'Dó **frígio**: o Ré♭ logo acima da tônica dá o sabor espanhol.', play: { bpm: 120, steps: MODE_STEPS['frígio'].map((x) => ({ midis: [60 + x], beats: 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l86-escalas', exercise: items('Seis modos, cinco tônicas', 'O app pede um modo numa tônica. Pense na escala maior ou menor e mude a nota característica.', modes6, 10, 48, 84, 0.85, 'fade') },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'tocar a escala certa e soar Dó maior',
      body: 'Ré dórico com as brancas só soa dórico se o **Ré for a casa**: um vamp em Dm, frases que começam e terminam no Ré, a 6ª (Si) num tempo forte. Se você passeia pelas brancas sem centro, o ouvido escolhe Dó maior sozinho.',
    },
    { kind: 'exercise', id: 'l86-ouvido', exercise: items('Qual modo?', 'O app toca a tônica e o modo subindo. Escolha entre os dois parecidos.', modeEar, 8, 48, 84, 0.75, 'off') },
    {
      kind: 'text',
      title: 'O vamp segura o centro',
      body: `Um **vamp** é um loop curto, de um ou dois acordes, que fica rodando enquanto alguém improvisa. Ele é o que faz o modo existir: os acordes dizem ao ouvido onde é a casa e trazem a nota característica.

- **Ré dórico**: Dm7 – G7. O Dm7 diz "a casa é Ré"; o G7 traz o **Si**, a 6ª maior de Ré.
- **Fá lídio**: F7M – G/F (Sol maior com Fá no baixo). O F7M diz "a casa é Fá"; o G/F traz o **Si**, a 4ª aumentada de Fá.

Os dois usam só teclas brancas, e é isso que mostra que o modo é o centro, não as notas. Nos improvisos, o app mede as notas no modo (meta: 90%) e a nota final. A outra meta da tabela, a **nota característica em tempo forte pelo menos 4 vezes em 16 compassos**, você confere ouvindo a gravação.`,
    },
    { kind: 'exercise', id: 'l86-dorico', exercise: dorianImprov },
    { kind: 'exercise', id: 'l86-lidio', exercise: lydianImprov },
    {
      kind: 'exercise',
      id: 'l86-cor',
      exercise: {
        kind: 'checklist',
        title: 'A cor apareceu?',
        how: 'Grave os dois improvisos (o botão de gravar do teclado) e ouça. Marque o que aconteceu.',
        items: ['No dórico, o Si caiu em tempo forte pelo menos 4 vezes.', 'No lídio, o Si caiu em tempo forte pelo menos 4 vezes.', 'As frases terminaram na tônica (Ré, depois Fá), e não no Dó.', 'Deixei respiros: pelo menos uma pausa a cada 4 compassos.'],
      },
    },
    { kind: 'exercise', id: 'l86-quiz', exercise: quiz('Modos', 'Responda sem tocar.', MODES_Q) },
  ],
  review: [modes6, modeEar, choice(MODES_Q, 'modos')],
  checkpoint: [
    items('Modos sobre tônicas', '8 modos, sem dica. Meta: 7 de 8.', modes6, 8, 48, 84, 0.85, 'off'),
    items('Modos de ouvido', '8 pares, sem dica. Meta: 7 de 8.', modeEar, 8, 48, 84, 0.85, 'off'),
    dorianImprov,
  ],
  exit: [modes6, choice(MODES_Q, 'modos')],
};

const FORM_Q: ChoiceQuestion[] = [
  { q: 'Na forma AABA de 32 compassos, o B (a ponte) tem…', options: ['8 compassos', '16 compassos', '4 compassos'], answer: 0, why: 'Quatro seções de 8: A, A, B, A.' },
  { q: 'A ponte costuma…', options: ['Sair do tom (outro centro, outra região da melodia) e preparar a volta do A', 'Repetir o A igual', 'Ser só bateria'], answer: 0, why: 'É o contraste. Em So What, a ponte sobe meio tom (de Ré dórico para Mi♭ dórico) e volta.' },
  { q: 'A forma ABAC é…', options: ['A, B, o A de novo e um final C diferente', 'Igual à AABA', 'Uma forma de fuga'], answer: 0, why: 'Muito comum em standards de 32 compassos: a segunda metade começa igual à primeira e termina diferente.' },
  { q: 'Um chorus, no jazz, é…', options: ['Uma volta inteira pela forma da música', 'O refrão cantado', 'Um coro de vozes'], answer: 0, why: 'Tema (um chorus), solos (cada um com um ou mais chorus) e o tema de novo no fim.' },
  { q: 'Notas-guia são…', options: ['A 3ª e a 7ª de cada acorde', 'A fundamental e a 5ª', 'As tensões'], answer: 0, why: 'Elas dizem a qualidade do acorde e andam por meio tom ou um tom de um acorde para o próximo (unidade 8).' },
  { q: 'No piano solo de um standard, a esquerda…', options: ['Toca shells ou o baixo enquanto a direita canta a melodia', 'Fica parada', 'Dobra a melodia uma oitava abaixo'], answer: 0, why: 'A esquerda faz o papel do baixo e do comping; a direita, o da voz.' },
];

const l87: Lesson = {
  n: 87,
  id: 'l87',
  title: 'Standard: melodia e comping',
  minutes: 60,
  objectives: [
    'Consigo explicar as formas AABA e ABAC e achar as seções num standard.',
    'Consigo tocar uma melodia de notas-guia na direita com shells no Charleston na esquerda, em swing.',
    'Consigo acompanhar uma cifra de 8 compassos em swing, com voicings sem fundamental e o groove em ±50 ms.',
  ],
  music: [
    { piece: 'fly-me', why: 'Fly Me to the Moon é o standard ideal para juntar melodia e comping: a melodia desce por grau enquanto a harmonia desce pelo ciclo de quintas. Toque a melodia na direita e os shells na esquerda, como nesta lição.' },
    { piece: 'autumn-leaves', why: 'Autumn Leaves, com a cifra que você já conhece da unidade 10: aqui ela vira comping em swing, com os voicings sem fundamental na direita e o two-feel na esquerda.' },
    { song: 'u10-santos-rearm', why: 'When the Saints, o standard de domínio público que já está no app com a partitura (unidade 10): toque a versão rearmonizada pensando no swing e nas notas-guia desta lição.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A forma do standard',
      body: `**Standard** é uma canção que virou repertório comum do jazz: músicas da Broadway, do cinema e do rádio dos anos 1920 a 1950, que todo músico sabe tocar numa jam. Quase todas têm **32 compassos**, em seções de 8:

- **AABA**: o A aparece, repete, vem a **ponte** (B) e o A volta. A ponte muda de região: outro centro, a melodia mais aguda ou mais grave, e no fim prepara a volta do A.
- **ABAC**: A, B, o A de novo e um **final novo** (C). A segunda metade começa igual à primeira.

Saber a forma é metade da leitura: se o terceiro A é igual ao primeiro, você só precisa ler de verdade metade da partitura. Na sua partitura de Fly Me to the Moon, procure onde a melodia do começo volta.

Uma volta inteira pela forma se chama **chorus**. Um arranjo de jazz típico é: o tema (um chorus), os solos e o tema de novo.`,
    },
    {
      kind: 'text',
      title: 'Melodia e comping no mesmo piano',
      body: `No piano solo, cada mão faz um papel: a **direita canta** a melodia e a **esquerda faz o comping**, com **shells** (fundamental e 3ª ou fundamental e 7ª, da unidade 8) no ritmo **Charleston** da lição 85.

Para treinar isso sem uma melodia protegida, use uma **melodia de notas-guia**: a 3ª ou a 7ª de cada acorde, escolhidas para andar o mínimo. No ciclo **Am7 – Dm7 – G7 – C7M – F7M – Dm7 – E7 – Am7** (o caminho harmônico de Fly Me to the Moon e de Autumn Leaves): Sol (7ª de Am7), Fá (3ª de Dm7), Fá (7ª de G7), Mi (3ª de C7M), Mi (7ª de F7M), Fá (3ª de Dm7), Sol♯ (3ª de E7) e Lá.

Toque essa linha sozinha, cantando. Ela soa como uma melodia de verdade, porque muitas melodias de standard são exatamente isso: notas-guia enfeitadas.`,
    },
    {
      kind: 'exercise',
      id: 'l87-guia',
      exercise: quickTimed('Notas-guia e shells', 'Melodia em semibreves na direita, shells no Charleston na esquerda, em swing, de 80 até 104 BPM. Janela de ±50 ms.', guideTask(80), { window: 50, ladder: { from: 80, to: 104, step: 8 } }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'a esquerda copiar o ritmo da direita',
      body: 'Quando a melodia anda, a esquerda tende a ir junto e o comping some. Segure a esquerda no desenho dela (1 e o "e" do 2) e deixe a melodia fazer o que quiser por cima. Se escorregar, toque só a esquerda com o metrônomo e cante a melodia.',
    },
    {
      kind: 'text',
      title: 'Acompanhar quem canta',
      body: `Agora o outro papel: alguém canta (ou sola) e você **acompanha** pela cifra. É o comping da lição 85 sobre o mesmo ciclo, um acorde por compasso: os **voicings sem fundamental conduzidos** na direita, no Charleston, e o **two-feel** na esquerda.

Cifra: **Am7 | Dm7 | G7 | C7M | F7M | Dm7 | E7 | Am7**. O E7 é o V7 de Lá menor: o Sol♯ dele puxa para o Lá.

Meta: groove em **±50 ms**. Grave e cante a linha de notas-guia por cima para conferir se o acompanhamento sustenta a canção.`,
    },
    { kind: 'exercise', id: 'l87-comping', exercise: quickTimed('Comping da cifra', '8 compassos em swing, de 80 até 104 BPM, janela de ±50 ms.', cycleTask(80), { window: 50, ladder: { from: 80, to: 104, step: 8 } }) },
    { kind: 'exercise', id: 'l87-quiz', exercise: quiz('Forma e standard', 'Responda sem tocar.', FORM_Q) },
  ],
  review: [choice(FORM_Q, 'forma'), rlSeq],
  checkpoint: [
    quickTimed('Notas-guia e shells', 'Os 8 compassos, mãos juntas, em swing, a 104 BPM, sem dicas. Meta: 90% das notas em ±50 ms.', guideTask(104), { window: 50, pass: { accuracy: 0.9 } }),
    quickTimed('Comping no tempo', 'A cifra em swing, a 104 BPM. Meta: 85% das notas em ±50 ms.', cycleTask(104), { window: 50 }),
  ],
  exit: [choice(FORM_Q, 'forma'), choice(SWING_Q, 'swing')],
};

const REARM_Q: ChoiceQuestion[] = [
  { q: 'Rearmonizar é…', options: ['Trocar ou enfeitar os acordes de uma música mantendo a melodia', 'Mudar a melodia', 'Tocar mais rápido'], answer: 0, why: 'A melodia continua; a harmonia ganha cor (tensões, inversões, empréstimos).' },
  { q: 'Cadd9 é…', options: ['Dó, Mi, Sol com o Ré (a 9ª), sem 7ª', 'Dó, Mi, Sol, Si♭, Ré', 'Dó, Ré, Sol, sem a 3ª'], answer: 0, why: 'add9 acrescenta a 9ª à tríade e mantém a 3ª. Sem a 3ª seria sus2.' },
  { q: 'Gsus4 resolve em G quando…', options: ['O Dó (a 4ª) desce para o Si (a 3ª)', 'O Sol sobe para o Lá', 'O Ré desce para o Dó'], answer: 0, why: 'A 4ª suspensa pede a 3ª: uma nota só anda (unidade 6).' },
  { q: 'Uma linha de baixo que desce por grau, como em C – G/B – Am – Am7/G – F, é feita com…', options: ['Inversões: o acorde fica, o baixo troca de nota', 'Acordes diferentes em cada nota', 'O pedal'], answer: 0, why: 'G/B e Am7/G mantêm os acordes e põem no baixo a nota que continua a descida.' },
  { q: 'Trocar F por F7M e Am por Am7 numa canção pop…', options: ['Deixa o som mais macio e "moderno" sem mudar a função', 'Muda o tom', 'Estraga a melodia sempre'], answer: 0, why: 'A 7ª acrescenta cor; o F7M continua sendo o IV e o Am7, o vi. Confira só se a melodia não bate meio tom acima de alguma nota.' },
  { q: 'Em A Whiter Shade of Pale, o que faz a música soar "barroca"?', options: ['O baixo descendo por grau sob os acordes, como numa obra de Bach', 'O compasso 6/8', 'A escala de tons inteiros'], answer: 0, why: 'O órgão desce Dó, Si, Lá, Sol, Fá, Mi... com os acordes por cima: baixo invertido em sequência.' },
];

const l88: Lesson = {
  n: 88,
  id: 'l88',
  title: 'Pop rearmonizado',
  minutes: 60,
  objectives: [
    'Consigo tocar uma progressão pop com o baixo descendo por inversões, 8 compassos no tempo.',
    'Consigo trocar tríades por add9, sus, 7M e m7(9) sem mudar a função dos acordes.',
    'Consigo repetir de ouvido uma linha de baixo de 4 a 6 notas.',
  ],
  music: [
    { piece: 'let-it-be', why: 'Let It Be nas versões de piano: o baixo desce por inversões (C – G/B – Am...) e os acordes ganham add9 e sus. É a mesma música da unidade 4, agora com a harmonia desta lição.' },
    { piece: 'whiter-shade', why: 'A Whiter Shade of Pale (unidade 6): a introdução do órgão é um baixo descendo por grau com os acordes por cima, a linha que esta lição ensina a fazer.' },
    { piece: 'hallelujah', why: 'Hallelujah, da lição 82: depois desta lição, toque a sua partitura trocando C por Cadd9 e Am por Am7, e ouça como o mesmo acompanhamento fica mais aberto.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Rearmonizar uma canção pop',
      body: `**Rearmonizar** é manter a melodia e mexer nos acordes. Na unidade 10 você rearmonizou com dominantes secundárias e empréstimos, o caminho do jazz. No pop, os pianistas preferem três ferramentas mais leves:

1. **Baixo invertido**: o acorde fica, o baixo troca de nota para descer (ou subir) por grau. C – **G/B** – Am – **Am7/G** – F.
2. **Cor na tríade**: **add9** (Cadd9 = Dó, Mi, Sol + Ré), **sus** (Gsus4 → G) e **7M** ou **m7** (F7M, Am7). A função não muda: o F7M continua sendo o IV.
3. **Voicing aberto**: a esquerda grave (só o baixo) e a direita com três ou quatro notas perto do Dó4, sem a fundamental se ela já está no baixo.

Primeiro a versão de livro; depois a versão com cor. A melodia que você cantar por cima é a mesma nas duas.`,
    },
    {
      kind: 'example',
      title: 'Da tríade à cor',
      steps: [
        { say: 'C, G/B, Am: o baixo desce Dó, Si, Lá; a direita quase não se mexe.', play: { bpm: 66, steps: [{ midis: [n('C3'), n('C4'), n('E4'), n('G4')], beats: 2 }, { midis: [n('B2'), n('B3'), n('D4'), n('G4')], beats: 2 }, { midis: [n('A2'), n('C4'), n('E4'), n('A4')], beats: 2 }] }, keys: [n('C3'), n('B2'), n('A2')] },
        { say: 'Agora com cor: Cadd9 (Mi, Sol, Ré), Gadd9/B (Ré, Sol, Lá), Am7 (Dó, Mi, Sol).', play: { bpm: 66, steps: [{ midis: [n('C3'), n('E4'), n('G4'), n('D5')], beats: 2 }, { midis: [n('B2'), n('D4'), n('G4'), n('A4')], beats: 2 }, { midis: [n('A2'), n('C4'), n('E4'), n('G4')], beats: 2 }] } },
        { say: 'G7sus4 → G7: o Dó desce para o Si. A suspensão atrasa a 3ª e faz a cadência respirar.', play: { bpm: 66, steps: [{ midis: [n('G2'), n('C4'), n('D4'), n('F4')], beats: 2 }, { midis: [n('G2'), n('B3'), n('D4'), n('F4')], beats: 2 }, { midis: [n('C3'), n('E4'), n('G4'), n('D5')], beats: 3 }] } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l88-descida',
      exercise: quickTimed('O baixo que desce', 'C | G/B | Am | Am/G | F | C/E | Dm7 | G: acordes em semínimas na direita, o baixo na esquerda, de 60 até 80 BPM.', descTask(false, 60), { window: 50, ladder: { from: 60, to: 80, step: 4 } }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'mexer a direita junto com o baixo',
      body: 'Com o baixo invertido, é a esquerda que anda. Se a direita pula para a posição fundamental de cada acorde, a linha some debaixo dos saltos. Deixe a direita perto do Dó4, mudando só as notas que precisam (de C para G/B, só o Dó e o Mi andam), e ouça o baixo descendo sozinho.',
    },
    { kind: 'exercise', id: 'l88-cifras', exercise: items('Cifras do pop', 'Toque o acorde da cifra. Com barra, a nota de baixo é a de depois da barra.', popChords, 10, 36, 84, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'A mesma linha, com cor',
      body: `Agora a versão rearmonizada da mesma progressão. O baixo é o mesmo (Dó, Si, Lá, Sol, Fá, Mi, Ré, Sol); a direita muda:

- **Cadd9**: Mi, Sol, Ré. **Gadd9/B**: Ré, Sol, Lá.
- **Am7** e **Am7/G**: Dó, Mi, Lá ou Dó, Mi, Sol. **F7M**: Dó, Mi, Lá sobre o Fá.
- **Cadd9/E**: Ré, Sol, Dó. **Dm7(9)**: Dó, Mi, Fá, Lá, a forma B da lição 84.
- **G7sus4 → G7**: Dó, Ré, Fá → Si, Ré, Fá.

Repare que a direita fica quase sempre com o Dó e o Mi presos: a cor vem do baixo andando por baixo deles. É o som de muito piano pop dos anos 1970 para cá.`,
    },
    { kind: 'exercise', id: 'l88-cor', exercise: quickTimed('O baixo que desce, com cor', 'A versão rearmonizada, em mínimas na direita, de 60 até 80 BPM. Janela de ±50 ms.', descTask(true, 60), { window: 50, ladder: { from: 60, to: 80, step: 4 } }) },
    {
      kind: 'text',
      title: 'Ouvir a linha de baixo',
      body: `Para rearmonizar de ouvido (ou tirar a harmonia de uma gravação), o primeiro passo é ouvir o **baixo**. Ele quase sempre anda por grau ou por cromatismo entre os acordes: Dó, Si, Lá, Sol; Fá, Mi, Ré, Sol; Dó, Si, Si♭, Lá.

No exercício, o app toca uma linha de 4 a 6 notas no grave e você repete. Pense na direção primeiro (desce ou sobe?) e depois no tamanho de cada passo (meio tom ou um tom).`,
    },
    { kind: 'exercise', id: 'l88-ouvido', exercise: items('Linha de baixo de ouvido', 'O app toca uma linha de 4 a 6 notas no grave. Repita. Comece pela nota que ele diz.', bassEar, 8, 36, 60, 0.75, 'off') },
    { kind: 'exercise', id: 'l88-quiz', exercise: quiz('Pop rearmonizado', 'Responda sem tocar.', REARM_Q) },
  ],
  review: [popChords, bassEar, choice(REARM_Q, 'rearmonizar')],
  checkpoint: [
    quickTimed('Pop rearmonizado no tempo', 'A versão com cor, 8 compassos, a 80 BPM, sem dicas. Meta: 85% das notas em ±50 ms.', descTask(true, 80), { window: 50 }),
    items('Cifras do pop', '10 cifras, sem dica. Meta: 9 de 10.', popChords, 10, 36, 84, 0.9, 'off'),
    items('Linha de baixo de ouvido', '6 linhas, sem dica. Meta: 5 de 6.', bassEar, 6, 36, 60, 0.8, 'off'),
  ],
  exit: [popChords, choice(REARM_Q, 'rearmonizar')],
};

const allU11 = mix([tensions, rlChord, rlSeq, modes6, compound, slashChords, popChords]);
const allEarU11 = mix([modeEar, bassEar, choice([...POP_Q, ...TENSION_Q, ...ROOTLESS_Q, ...SWING_Q, ...MODES_Q, ...FORM_Q, ...REARM_Q], 'jazz-pop')]);

const RAG_Q: ChoiceQuestion[] = [
  { q: 'O Maple Leaf Rag foi publicado em…', options: ['1899, nos Estados Unidos', '1959, em Nova York', '1920, em Paris'], answer: 0, why: 'Por John Stark, em Sedalia, no Missouri. Virou o rag mais famoso de Scott Joplin.' },
  { q: 'No ragtime, a esquerda…', options: ['Alterna baixo grave e acorde no meio do teclado, em colcheias', 'Toca a melodia', 'Faz arpejos de 2 oitavas'], answer: 0, why: 'É o "oom-pah" da marcha. Nos anos 1920 ele vira o stride, a base do piano de jazz solo.' },
  { q: 'A síncope do ragtime está…', options: ['Na direita, com notas que chegam antes do tempo contra a esquerda regular', 'Na esquerda, que atrasa', 'No pedal'], answer: 0, why: 'A esquerda marca o tempo como uma banda de marcha; a direita "rasga" (to rag) o ritmo por cima.' },
  { q: 'O tema A do Maple Leaf Rag está em…', options: ['Lá♭ maior', 'Dó maior', 'Ré♭ maior'], answer: 0, why: 'Quatro bemóis: Si♭, Mi♭, Lá♭ e Ré♭. O trio (a terceira parte) vai para Ré♭ maior.' },
];

const l89: Lesson = {
  n: 89,
  id: 'l89',
  title: 'Checkpoint da unidade e projeto: arranjo solo',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint misto da unidade 11, sem dicas.',
    'Consigo montar um arranjo solo curto (intro, melodia, turnaround e final) de um standard ou de uma pop.',
    'Consigo tocar o tema A do Maple Leaf Rag com as duas mãos, rumo a 80 BPM.',
  ],
  music: [
    { song: 'u11-maple', why: 'O Maple Leaf Rag de Scott Joplin (1899), o rag mais famoso: a esquerda salta do baixo para o acorde, a direita sincopa por cima. É o avô do piano de jazz solo, e o projeto final da unidade.' },
    { piece: 'fly-me', why: 'Para o arranjo solo: Fly Me to the Moon com intro no ii–V, a melodia na direita com shells na esquerda e um final com o I7M(9).' },
    { piece: 'let-it-be', why: 'Ou, se preferir uma pop: Let It Be com o baixo invertido e a cor da lição 88, no mesmo roteiro de arranjo.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que você já sabe',
      body: `Em sete lições você passou pelos dois lados do piano popular: a **balada pop** (padrões de esquerda, baixo invertido, add9 e sus) e o **jazz** (tensões, voicings sem fundamental, comping em swing, notas-guia, forma do standard).

No meio entraram os **modos como cores** sobre uma tônica fixa, de So What a Norwegian Wood.

O checkpoint mistura tudo: acordes com tensão, voicings, modos, cifras do pop, ouvido e o comping no tempo.`,
    },
    {
      kind: 'text',
      title: 'Arranjo solo: o roteiro',
      body: `Um arranjo de piano solo de uma canção curta segue quase sempre o mesmo roteiro:

1. **Intro** (2 a 4 compassos): um vamp no groove, por exemplo o ii–V do tom repetido (Dm7(9) – G7(13) em Dó), para o ouvinte entrar no balanço antes da melodia.
2. **A melodia**, uma vez, com a esquerda fazendo o acompanhamento: shells no Charleston num standard, o padrão 1-5-8 ou o arpejo numa balada.
3. **Um ii–V de volta** (o turnaround) no fim da seção, para repetir ou ir para o final.
4. **Final**: o I com tensão (C7M(9), C6(9)) segurado, ou o último ii–V repetido três vezes antes de parar.

Os voicings sem fundamental entram na intro e no turnaround, onde a direita está livre da melodia.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'arranjo que perde o groove na melodia',
      body: 'É comum a intro sair com balanço e, quando a melodia entra, a esquerda virar acordes parados. A esquerda faz o mesmo desenho do começo ao fim. Se a música ficar difícil, simplifique a melodia (notas longas), nunca o groove.',
    },
    {
      kind: 'text',
      title: 'O Maple Leaf Rag',
      body: `O projeto final é o **Maple Leaf Rag** (Scott Joplin, 1899), na edição original, no tom (**Lá♭ maior**, quatro bemóis), em 2/4 e no ritmo original. O app toca o **tema A** uma vez, com a anacruse.

O ragtime é o avô do piano de jazz. A **esquerda** é uma banda de marcha: baixo grave no tempo, acorde no meio do teclado no contratempo, os saltos da lição 72. A **direita** "rasga" o ritmo por cima, com semicolcheias que chegam antes do tempo (*to rag*, rasgar). Nos anos 1920, essa esquerda vira o **stride** de James P. Johnson e Fats Waller.

Três trechos pedem atenção:

- **compassos 1 a 4**: o desenho Lá♭ – Mi♭ – Lá♭ – Dó, com a síncope no Mi♭ do fim de cada grupo;
- **compassos 7 e 8**: a direita desce para o grave e sobe em arpejo (Lá♭, Si, Lá♭) por três oitavas, como no original;
- **compassos 9 a 12**: a direita no agudo e a esquerda em acordes no meio do teclado, começando pelo diminuto Ré, Fá, Lá♭, Si.

Treine cada um separado, devagar, antes de tocar tudo. A nota ligada pela barra (o motor não liga compassos) vira nota e pausa.`,
    },
    {
      kind: 'exercise',
      id: 'l89-maple-1',
      exercise: quickTimed('Maple Leaf Rag, compassos 1 a 4', 'Mãos juntas, de 48 até 64 BPM. Janela de ±50 ms.', mapleTask(1, 4, 48, 'Esquerda: Lá♭ (baixo), acorde Mi♭–Lá♭–Dó, acorde, Lá | Si♭, acorde Mi♭–Sol–Ré♭, acorde, Mi♭.'), { window: 50, ladder: { from: 48, to: 64, step: 4 } }),
    },
    {
      kind: 'exercise',
      id: 'l89-maple-7',
      exercise: quickTimed('Maple Leaf Rag, compassos 5 a 8', 'Mãos juntas, a 48 BPM. A direita desce para o grave no compasso 7. Duas passadas boas.', mapleTask(5, 8, 48, 'Esquerda: Mi (o Fá♭ da edição) e Mi♭ | Mi e Mi♭ | Lá♭ grave e Lá♭ | Lá♭ e Lá♭ agudo.'), { reps: 2, window: 50 }),
    },
    {
      kind: 'exercise',
      id: 'l89-maple-9',
      exercise: quickTimed('Maple Leaf Rag, compassos 9 a 16', 'Mãos juntas, de 44 até 60 BPM. Janela de ±50 ms.', mapleTask(9, 16, 44, 'Esquerda: acordes em colcheias. 9 e 13: Ré–Fá–Lá♭–Si. 10 e 14: Mi♭–Lá♭–Dó. 11 e 15: Mi–Lá♭–Si, depois Mi♭–Lá♭–Dó.'), { window: 50, ladder: { from: 44, to: 60, step: 4 } }),
    },
    { kind: 'song', songId: 'u11-maple', why: 'O projeto final: o tema A do Maple Leaf Rag. O alvo é 80 BPM; comece no modo Estudar e suba devagar.' },
    { kind: 'exercise', id: 'l89-quiz', exercise: quiz('Ragtime', 'Responda sem tocar.', RAG_Q) },
  ],
  review: [allU11, allEarU11],
  checkpoint: [
    items('Checkpoint da unidade', '20 perguntas misturadas das lições 82 a 88, sem dicas.', mix([allU11, allU11, allEarU11]), 20, 36, 88, 0.85, 'off'),
    quickTimed('Comping em swing', 'ii–V–I em swing, tom sorteado, a 104 BPM. Meta: 85% em ±50 ms.', (rng) => swingComp(rng, 104), { window: 50 }),
    quickTimed('Maple Leaf Rag no tempo', 'Anacruse e compassos 1 a 8, mãos juntas, a 64 BPM. Meta: 85% em ±50 ms.', mapleTask(0, 8, 64), { window: 50 }),
  ],
  project: {
    title: 'Arranjo solo',
    brief: `Monte um arranjo solo curto de um standard (Fly Me to the Moon ou Autumn Leaves) ou de uma pop (Let It Be ou Hallelujah), com a sua partitura importada, seguindo o roteiro da lição: intro no groove, a melodia uma vez, um turnaround e um final. Depois toque o Maple Leaf Rag, o projeto final da unidade.`,
    steps: [
      'Escolha a música e importe a partitura no Repertório (o cartão no começo da lição ajuda a achar).',
      'Escreva a intro: 4 compassos de vamp (o ii–V do tom com voicings sem fundamental no standard; o I – V/7 – vi – IV com o padrão 1-5-8 na pop).',
      'Toque a melodia na direita com o acompanhamento da esquerda: shells no Charleston (standard) ou padrão de balada (pop).',
      'Escreva um final: o I com tensão segurado, ou o último ii–V repetido três vezes.',
      'Grave o arranjo inteiro: intro, melodia, turnaround e final.',
      'Toque o Maple Leaf Rag no "Tocar a música", começando a 48 BPM e subindo até 80.',
    ],
    rubric: [
      'O groove da esquerda não para quando a melodia entra.',
      'A intro e o turnaround usam voicings sem fundamental conduzidos (a mão quase não pula) ou o baixo invertido.',
      'A melodia fica clara por cima do acompanhamento.',
      'O final soa como final: tônica com tensão, sem cortar seco.',
      'O Maple Leaf Rag passa a 80 BPM com 85% das notas.',
    ],
    exercise: quickTimed('Comping do ciclo', 'A cifra da lição 87 em swing, a 112 BPM, janela de ±50 ms.', cycleTask(112), { window: 50 }),
  },
  exit: [allU11, choice([...TENSION_Q, ...ROOTLESS_Q, ...MODES_Q, ...SWING_Q], 'jazz-pop')],
};

// ---------- unidade ----------

const unit: Unit = {
  n: 11,
  id: 'u11',
  title: 'Jazz e pop ao piano',
  goal: 'Acompanhar baladas pop e standards de jazz ao piano, com padrões de esquerda, tensões, voicings sem fundamental, comping em swing e os modos como cores.',
  technique: 'Comping no metrônomo: o padrão 1-5-8 da balada (60 rumo a 80 BPM) e o Charleston em swing com o two-feel na esquerda (80 rumo a 104 BPM), janela de ±50 ms. Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l82, l83, l84, l85, l86, l87, l88, l89],
  songs: [maple],
  final: {
    songId: 'u11-maple',
    brief: 'O tema A do Maple Leaf Rag (Scott Joplin, 1899), no tom e no ritmo originais: a esquerda salta do baixo para o acorde como uma banda de marcha, e a direita sincopa por cima. É o avô do piano de jazz solo. Comece a 48 BPM e suba até 80.',
  },
};

export default unit;
