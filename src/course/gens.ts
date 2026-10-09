// Geradores de itens prontos para as lições: achar nota, achar todas, ler na pauta, intervalo,
// acorde por cifra, grau na tonalidade, eco (o app toca, você repete). Puro e testado (course.test.ts).
// Unidades novas devem preferir estes geradores; um gerador novo entra aqui, com teste.

import type { Clef, Midi } from '../music/notes';
import { PC_NAMES, keysOf, nameOf, pcOf, pick } from './music';
import type { Accept, Item, ItemGen, Listen, Pc, Rng } from './types';

/** "Toque um Fá" em qualquer oitava. */
export function findNote(opts: { pcs: Pc[]; low: Midi; high: Midi; skill?: string }): ItemGen {
  return (rng) => {
    const pc = pick(rng, opts.pcs);
    return {
      prompt: `Toque um ${PC_NAMES[pc]}`,
      detail: 'Qualquer oitava.',
      hintKeys: keysOf([pc], opts.low, opts.high),
      hint: hintFor(pc),
      steps: [{ kind: 'pc', pcs: [pc] }],
      skill: opts.skill ?? 'achar-nota',
    };
  };
}

/** "Toque todos os Fá" dentro do tempo. */
export function findAll(opts: { pcs: Pc[]; low: Midi; high: Midi; seconds: number; skill?: string }): ItemGen {
  return (rng) => {
    const pc = pick(rng, opts.pcs);
    const keys = keysOf([pc], opts.low, opts.high);
    return {
      prompt: `Toque todos os ${PC_NAMES[pc]} do teclado`,
      detail: `${keys.length} teclas, em até ${opts.seconds} s.`,
      hintKeys: keys,
      hint: hintFor(pc),
      steps: [{ kind: 'all', midis: keys }],
      timeLimitMs: opts.seconds * 1000,
      skill: opts.skill ?? 'achar-todas',
    };
  };
}

/** Uma tecla exata, mostrada pelo nome com oitava ("Dó central", "Sol4"). */
export function findExact(opts: { keys: { midi: Midi; label: string }[]; skill?: string }): ItemGen {
  return (rng) => {
    const k = pick(rng, opts.keys);
    return { prompt: `Toque ${k.label}`, hintKeys: [k.midi], steps: [{ kind: 'exact', midis: [k.midi] }], skill: opts.skill ?? 'achar-tecla' };
  };
}

/** Nota escrita na pauta: toque a tecla exata. */
export function readNote(opts: { notes: Midi[]; clef: Clef; skill?: string }): ItemGen {
  return (rng) => {
    const midi = pick(rng, opts.notes);
    return {
      prompt: 'Toque a nota da pauta',
      staff: { notes: [midi], clef: opts.clef },
      hintKeys: [midi],
      hint: nameOf(midi),
      steps: [{ kind: 'exact', midis: [midi] }],
      skill: opts.skill ?? `ler-${opts.clef}`,
    };
  };
}

const INTERVAL_NAMES: Record<number, string> = { 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sétima', 7: 'oitava' };
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];

/** Intervalo diatônico (contando teclas brancas) acima de uma nota branca: "Toque uma 3ª acima de Ré". */
export function intervalAbove(opts: { sizes: number[]; from: Midi[]; skill?: string }): ItemGen {
  return (rng) => {
    const from = pick(rng, opts.from);
    const size = pick(rng, opts.sizes); // 2 = segunda … 8 = oitava
    const idx = WHITE_STEPS.indexOf(pcOf(from));
    const steps = size - 1;
    const octave = Math.floor((idx + steps) / 7);
    const target = from - WHITE_STEPS[idx] + 12 * octave + WHITE_STEPS[(idx + steps) % 7];
    return {
      prompt: `Toque uma ${size}ª acima de ${nameOf(from)}`,
      detail: `${INTERVAL_NAMES[steps]}: conte ${size} teclas brancas, incluindo as duas pontas. Comece apertando ${nameOf(from)}.`,
      hintKeys: [from, target],
      steps: [{ kind: 'exact', midis: [from] }, { kind: 'exact', midis: [target] }],
      skill: 'intervalo',
    };
  };
}

// ---------- cifras ----------

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  '°': [0, 3, 6],
  aug: [0, 4, 8],
  '+': [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 2, 4, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  '7M': [0, 4, 7, 11],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  'm7(b5)': [0, 3, 6, 10],
  ø: [0, 3, 6, 10],
  '°7': [0, 3, 6, 9],
  dim7: [0, 3, 6, 9],
};
const ROOT_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function rootPc(s: string): number {
  const m = /^([A-G])(#|b)?$/.exec(s);
  if (!m) throw new Error(`Fundamental inválida: ${s}`);
  return (ROOT_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

/** "C", "Am", "G7", "F/A", "Bb7M", "Dm7(b5)" → classes, fundamental e baixo. */
export function parseChord(symbol: string): { root: Pc; pcs: Pc[]; bass?: Pc } {
  const [main, bass] = symbol.split('/');
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(main);
  if (!m) throw new Error(`Cifra inválida: ${symbol}`);
  const root = rootPc(m[1]);
  const q = QUALITIES[m[2]];
  if (!q) throw new Error(`Qualidade desconhecida: ${symbol}`);
  return { root, pcs: q.map((i) => (root + i) % 12), bass: bass ? rootPc(bass) : undefined };
}

/** Grafia da cifra para a tela: "Bb7M" → "B♭7M". */
export const chordLabel = (symbol: string) => symbol.replace(/#/g, '♯').replace(/b(?=\d|$|\/|m|7|\()/g, '♭');

/** "Toque o acorde de Fá maior" a partir de cifras. Com `bass`, a inversão é exigida. */
export function playChord(opts: { symbols: string[]; low: Midi; high: Midi; requireBass?: boolean; skill?: string }): ItemGen {
  return (rng) => {
    const symbol = pick(rng, opts.symbols);
    const c = parseChord(symbol);
    const accept: Accept = { kind: 'chord', pcs: c.pcs, bass: opts.requireBass || c.bass !== undefined ? (c.bass ?? c.root) : undefined };
    // Dica: posição fechada a partir da fundamental mais perto do meio do trecho.
    const mid = Math.round((opts.low + opts.high) / 2) - 6;
    const base = mid + ((c.root - pcOf(mid) + 12) % 12);
    const hintKeys = c.pcs.map((p) => base + ((p - c.root + 12) % 12));
    return {
      prompt: 'Toque o acorde',
      symbol: chordLabel(symbol),
      hintKeys,
      hint: c.pcs.map((p) => PC_NAMES[p]).join(', '),
      steps: [accept],
      skill: opts.skill ?? 'acorde',
    };
  };
}

// ---------- ouvido ----------

/** Cadência I–IV–V–I em posição fechada, para "sentir a casa" antes de uma pergunta de ouvido. */
export function cadence(tonic: Midi, bpm = 96): Listen {
  const triad = (root: Midi, third: number) => [root, root + third, root + 7];
  return {
    bpm,
    steps: [
      { midis: [tonic - 12, ...triad(tonic, 4)], beats: 1 },
      { midis: [tonic - 7, tonic, tonic + 5, tonic + 9], beats: 1 },
      { midis: [tonic - 5, tonic - 1, tonic + 2, tonic + 7], beats: 1 },
      { midis: [tonic - 12, ...triad(tonic, 4)], beats: 2 },
    ],
  };
}

const DEGREE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const DEGREE_NAMES = ['1 (a casa)', '2', '3', '4', '5', '6', '7'];

/** O app toca a cadência e uma nota; você responde tocando o grau (qualquer oitava). */
export function degreeByEar(opts: { tonic: Midi; degrees: number[]; skill?: string }): ItemGen {
  return (rng) => {
    const d = pick(rng, opts.degrees);
    const target = opts.tonic + DEGREE_STEPS[d - 1];
    const c = cadence(opts.tonic);
    return {
      prompt: 'Que nota foi essa? Toque ela',
      detail: `Primeiro a cadência mostra a casa (${nameOf(opts.tonic)}), depois vem a nota. Pode ser ${opts.degrees.map((x) => DEGREE_NAMES[x - 1]).join(', ')}.`,
      listen: { bpm: c.bpm, steps: [...c.steps, { midis: [], beats: 1 }, { midis: [target], beats: 2 }] },
      hintKeys: [target],
      hint: `Grau ${d}: ${nameOf(target)}`,
      steps: [{ kind: 'pc', pcs: [pcOf(target)] }],
      skill: opts.skill ?? 'grau',
    };
  };
}

/** Eco: o app toca um motivo curto e você repete nas mesmas teclas. */
export function echo(opts: { motifs: Midi[][]; bpm?: number; transposeTo?: Midi[]; skill?: string }): ItemGen {
  return (rng: Rng): Item => {
    const motif = pick(rng, opts.motifs);
    return {
      prompt: 'Ouça e repita',
      detail: `${motif.length} notas. Comece em ${nameOf(motif[0])}.`,
      listen: { bpm: opts.bpm ?? 90, steps: motif.map((m) => ({ midis: [m], beats: 1 })) },
      hintKeys: motif,
      steps: motif.map((m) => ({ kind: 'exact', midis: [m] }) as Accept),
      skill: opts.skill ?? 'eco',
    };
  };
}

/** Grafia simples para a dica de onde fica cada nota branca. */
function hintFor(pc: Pc): string {
  switch (pc) {
    case 0: return 'Dó fica logo à esquerda do grupo de 2 pretas.';
    case 2: return 'Ré fica no meio do grupo de 2 pretas.';
    case 4: return 'Mi fica logo à direita do grupo de 2 pretas.';
    case 5: return 'Fá fica logo à esquerda do grupo de 3 pretas.';
    case 7: return 'Sol fica entre a 1ª e a 2ª preta do grupo de 3.';
    case 9: return 'Lá fica entre a 2ª e a 3ª preta do grupo de 3.';
    case 11: return 'Si fica logo à direita do grupo de 3 pretas.';
    default: return 'É uma tecla preta.';
  }
}

// ---------- perguntas de escolha e misturas ----------

export interface ChoiceQuestion {
  q: string;
  options: string[];
  answer: number;
  /** Explicação curta, mostrada como dica depois do erro. */
  why?: string;
}

/** Sorteia uma pergunta de escolha de uma lista. */
export function choice(questions: ChoiceQuestion[], skill = 'conceito'): ItemGen {
  return (rng) => {
    const c = pick(rng, questions);
    return { prompt: c.q, choices: c.options, answer: c.answer, hint: c.why, steps: [], skill };
  };
}

/** Sorteia um gerador de uma lista a cada item (checkpoint misto, aquecimento). */
export function mix(gens: ItemGen[]): ItemGen {
  return (rng) => pick(rng, gens)(rng);
}

const FINGER_NAMES = ['', 'polegar (1)', 'indicador (2)', 'médio (3)', 'anelar (4)', 'mínimo (5)'];

/** Posição de Dó: "Na mão direita, toque com o dedo 3" → Mi4. Mão esquerda com o 5 no Dó3. */
export function fingerNote(opts: { hands: ('direita' | 'esquerda')[] }): ItemGen {
  const right = [60, 62, 64, 65, 67];
  const left = [55, 53, 52, 50, 48]; // dedo 1 = Sol3 … dedo 5 = Dó3
  return (rng) => {
    const hand = pick(rng, opts.hands);
    const f = 1 + Math.floor(rng() * 5);
    const midi = hand === 'direita' ? right[f - 1] : left[f - 1];
    return {
      prompt: `Posição de Dó, mão ${hand}: toque a nota do ${FINGER_NAMES[f]}`,
      hintKeys: [midi],
      hint: nameOf(midi),
      steps: [{ kind: 'exact', midis: [midi] }],
      skill: 'posicao-do',
    };
  };
}

/** O app toca duas notas: subiu ou desceu? */
export function direction(opts: { low: Midi; high: Midi }): ItemGen {
  return (rng) => {
    const a = opts.low + Math.floor(rng() * (opts.high - opts.low));
    let b = a;
    while (b === a) b = opts.low + Math.floor(rng() * (opts.high - opts.low));
    return {
      prompt: 'A segunda nota subiu ou desceu?',
      listen: { bpm: 80, steps: [{ midis: [a], beats: 1 }, { midis: [b], beats: 2 }] },
      choices: ['Subiu (mais aguda)', 'Desceu (mais grave)'],
      answer: b > a ? 0 : 1,
      hint: `Foi de ${nameOf(a)} para ${nameOf(b)}.`,
      steps: [],
      skill: 'direcao',
    };
  };
}

/** O app toca duas notas brancas: vizinhas (grau conjunto) ou com tecla pulada (salto)? */
export function stepOrLeap(opts: { from: Midi[] }): ItemGen {
  return (rng) => {
    const a = pick(rng, opts.from);
    const idx = WHITE_STEPS.indexOf(pcOf(a));
    const size = pick(rng, [1, 1, 2, 3, 4]) * (rng() < 0.5 ? 1 : -1);
    const j = idx + size;
    const b = a - WHITE_STEPS[idx] + 12 * Math.floor(j / 7) + WHITE_STEPS[((j % 7) + 7) % 7];
    const step = Math.abs(size) === 1;
    return {
      prompt: 'Grau conjunto ou salto?',
      detail: 'Grau conjunto = a nota vizinha. Salto = pulou pelo menos uma tecla branca.',
      listen: { bpm: 80, steps: [{ midis: [a], beats: 1 }, { midis: [b], beats: 2 }] },
      choices: ['Grau conjunto', 'Salto'],
      answer: step ? 0 : 1,
      hint: `${nameOf(a)} → ${nameOf(b)}`,
      steps: [],
      skill: 'grau-conjunto',
    };
  };
}
