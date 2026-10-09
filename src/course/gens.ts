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

/** "2 sustenidos", "1 bemol". */
export function keySigLabel(fifths: number): string {
  const k = Math.abs(fifths);
  if (!k) return 'sem acidentes';
  return `${k} ${fifths > 0 ? (k > 1 ? 'sustenidos' : 'sustenido') : k > 1 ? 'bemóis' : 'bemol'}`;
}

/** Nota escrita na pauta: toque a tecla exata. */
export function readNote(opts: { notes: Midi[]; clef: Clef; fifths?: number; skill?: string }): ItemGen {
  return (rng) => {
    const midi = pick(rng, opts.notes);
    return {
      prompt: 'Toque a nota da pauta',
      detail: opts.fifths ? `Atenção à armadura: ${keySigLabel(opts.fifths)}.` : undefined,
      staff: { notes: [midi], clef: opts.clef, fifths: opts.fifths },
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
    const steps = size - 1;
    const target = whiteAbove(from, size);
    return {
      prompt: `Toque uma ${size}ª acima de ${nameOf(from)}`,
      detail: `${INTERVAL_NAMES[steps]}: conte ${size} teclas brancas, incluindo as duas pontas. Comece apertando ${nameOf(from)}.`,
      hintKeys: [from, target],
      steps: [{ kind: 'exact', midis: [from] }, { kind: 'exact', midis: [target] }],
      skill: 'intervalo',
    };
  };
}

/** Nota branca a um intervalo diatônico acima (`size` = 2 para segunda … 8 para oitava). `from` precisa ser branca. */
export function whiteAbove(from: Midi, size: number): Midi {
  const idx = WHITE_STEPS.indexOf(pcOf(from));
  if (idx < 0) throw new Error(`Nota de partida precisa ser branca: ${from}`);
  const j = idx + size - 1;
  return from - WHITE_STEPS[idx] + 12 * Math.floor(j / 7) + WHITE_STEPS[j % 7];
}

/** O app toca um intervalo (melódico ou harmônico) a partir de uma nota dita; você toca as duas notas, em ordem. */
export function intervalByEar(opts: { sizes: number[]; from: Midi[]; harmonic?: boolean; skill?: string }): ItemGen {
  return (rng) => {
    const from = pick(rng, opts.from);
    const size = pick(rng, opts.sizes);
    const target = whiteAbove(from, size);
    const listen: Listen = opts.harmonic
      ? { bpm: 72, steps: [{ midis: [from, target], beats: 2 }] }
      : { bpm: 72, steps: [{ midis: [from], beats: 1 }, { midis: [target], beats: 2 }] };
    return {
      prompt: 'Ouça o intervalo e toque as duas notas',
      detail: `Começa em ${nameOf(from)} e sobe. Pode ser ${opts.sizes.map((x) => `${x}ª`).join(', ')}.`,
      listen,
      hintKeys: [from, target],
      hint: `${size}ª: ${nameOf(from)} → ${nameOf(target)}`,
      steps: [{ kind: 'exact', midis: [from] }, { kind: 'exact', midis: [target] }],
      skill: opts.skill ?? 'intervalo-ouvido',
    };
  };
}

/** Intervalo escrito na pauta (duas notas lado a lado): toque as duas, da esquerda para a direita. */
export function readInterval(opts: { sizes: number[]; from: Midi[]; clef: Clef; skill?: string }): ItemGen {
  return (rng) => {
    const from = pick(rng, opts.from);
    const size = pick(rng, opts.sizes);
    const target = whiteAbove(from, size);
    return {
      prompt: 'Toque o intervalo da pauta',
      detail: 'As duas notas, da esquerda para a direita.',
      staff: { notes: [from, target], clef: opts.clef },
      hintKeys: [from, target],
      hint: `${size}ª: ${nameOf(from)} → ${nameOf(target)}`,
      steps: [{ kind: 'exact', midis: [from] }, { kind: 'exact', midis: [target] }],
      skill: opts.skill ?? 'ler-intervalo',
    };
  };
}

/** "Toque um semitom acima de Mi": primeiro a nota dada, depois a resposta (tecla vizinha ou duas teclas adiante). */
export function toneOrSemitone(opts: { from: Midi[]; kinds: ('tom' | 'semitom')[]; dirs: ('acima' | 'abaixo')[]; skill?: string }): ItemGen {
  return (rng) => {
    const from = pick(rng, opts.from);
    const kind = pick(rng, opts.kinds);
    const dir = pick(rng, opts.dirs);
    const target = from + (kind === 'tom' ? 2 : 1) * (dir === 'acima' ? 1 : -1);
    return {
      prompt: `Toque um ${kind} ${dir} de ${nameOf(from)}`,
      detail: `Primeiro ${nameOf(from)}, depois a resposta.`,
      hintKeys: [from, target],
      hint: kind === 'semitom' ? `Semitom: a tecla vizinha, preta ou branca. ${nameOf(target)}.` : `Tom: pule uma tecla, preta ou branca. ${nameOf(target)}.`,
      steps: [{ kind: 'exact', midis: [from] }, { kind: 'exact', midis: [target] }],
      skill: opts.skill ?? 'tom-semitom',
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
export function playChord(opts: { symbols: string[]; low: Midi; high: Midi; requireBass?: boolean; omitFifth?: boolean; skill?: string }): ItemGen {
  return (rng) => {
    const symbol = pick(rng, opts.symbols);
    const c = parseChord(symbol);
    const accept: Accept = { kind: 'chord', pcs: c.pcs, bass: opts.requireBass || c.bass !== undefined ? (c.bass ?? c.root) : undefined };
    if (opts.omitFifth && c.pcs.length >= 4) accept.optional = [c.pcs[2]];
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

// ---------- graus na tonalidade (I, IV, V, V7) ----------

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set([5, 10, 3, 8, 1]);
const KEY_PT: Record<string, string> = { C: 'Dó', G: 'Sol', F: 'Fá', D: 'Ré', A: 'Lá', Bb: 'Si♭', E: 'Mi', Eb: 'Mi♭' };
export type Degree = 'I' | 'IV' | 'V' | 'V7';
const DEGREE_ROOT: Record<Degree, number> = { I: 0, IV: 5, V: 7, V7: 7 };

/** Nome da tonalidade em português: "G" → "Sol". */
export const keyName = (key: string) => KEY_PT[key] ?? key;

/** Cifra do grau numa tonalidade maior: ("G", "V7") → "D7"; ("F", "IV") → "Bb". */
export function degreeSymbol(key: string, degree: Degree): string {
  const k = rootPc(key);
  const names = FLAT_KEYS.has(k) ? FLAT_NAMES : SHARP_NAMES;
  return names[(k + DEGREE_ROOT[degree]) % 12] + (degree === 'V7' ? '7' : '');
}

/** Acorde em posição fechada com a fundamental no baixo, uma oitava abaixo de `center` (para o app tocar). */
function voiced(symbol: string, center: Midi): Midi[] {
  const c = parseChord(symbol);
  const bass = center - 12 - ((pcOf(center) - c.root + 12) % 12);
  const upper = c.pcs.map((p) => center - 5 + ((p - pcOf(center - 5) + 12) % 12)).sort((a, b) => a - b);
  return [bass, ...upper];
}

/** Aceite de um acorde por cifra, com a 5ª opcional nas tétrades (posição próxima: Si–Fá–Sol no G7). */
function chordAccept(symbol: string, bass?: boolean): Accept {
  const c = parseChord(symbol);
  return { kind: 'chord', pcs: c.pcs, bass: bass ? c.root : undefined, optional: c.pcs.length >= 4 ? [c.pcs[2]] : undefined };
}

/** "Em Sol maior, toque o V7": acordes primários pelo grau. */
export function primaryChord(opts: { keys: string[]; degrees: Degree[]; low: Midi; high: Midi; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const degree = pick(rng, opts.degrees);
    const symbol = degreeSymbol(key, degree);
    const c = parseChord(symbol);
    return {
      prompt: `Em ${keyName(key)} maior, toque o ${degree}`,
      detail: 'Qualquer posição. No V7, a 5ª pode ficar de fora.',
      hintKeys: voiced(symbol, Math.round((opts.low + opts.high) / 2)).slice(1),
      hint: `${chordLabel(symbol)}: ${c.pcs.map((p) => PC_NAMES[p]).join(', ')}`,
      steps: [chordAccept(symbol)],
      skill: opts.skill ?? 'grau-acorde',
    };
  };
}

/** O app toca o começo de uma cadência; você toca o acorde que resolve (o I). */
export function resolveCadence(opts: { keys: string[]; before: Degree[][]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const prog = pick(rng, opts.before);
    const tonic = degreeSymbol(key, 'I');
    return {
      prompt: 'Complete a cadência: toque o acorde que resolve',
      detail: `Tom de ${keyName(key)} maior. Ouça ${prog.join(' – ')} e responda com o acorde de repouso.`,
      listen: { bpm: 80, steps: prog.map((d) => ({ midis: voiced(degreeSymbol(key, d), 64), beats: 2 })) },
      hintKeys: voiced(tonic, 60).slice(1),
      hint: `O I de ${keyName(key)}: ${chordLabel(tonic)}`,
      steps: [chordAccept(tonic)],
      skill: opts.skill ?? 'cadencia',
    };
  };
}

/** Harmonize: a pauta mostra um trecho de melodia; você toca o acorde (I, IV ou V7) que cabe embaixo. */
export function harmonize(opts: { key: string; bars: { notes: Midi[]; degree: Degree }[]; skill?: string }): ItemGen {
  return (rng) => {
    const bar = pick(rng, opts.bars);
    const symbol = degreeSymbol(opts.key, bar.degree);
    return {
      prompt: 'Que acorde cabe embaixo deste trecho? Toque-o',
      detail: `Tom de ${keyName(opts.key)} maior: I (${chordLabel(degreeSymbol(opts.key, 'I'))}), IV (${chordLabel(degreeSymbol(opts.key, 'IV'))}) ou V7 (${chordLabel(degreeSymbol(opts.key, 'V7'))}). Procure o acorde que contém as notas mais longas e as do tempo forte.`,
      staff: { notes: bar.notes, clef: 'treble' },
      listen: { bpm: 80, steps: bar.notes.map((m) => ({ midis: [m], beats: 1 })) },
      hintKeys: voiced(symbol, 54).slice(1),
      hint: `${bar.degree}: ${chordLabel(symbol)}`,
      steps: [chordAccept(symbol)],
      skill: opts.skill ?? 'harmonizar',
    };
  };
}

/** Ditado de progressão: o app toca 3 ou 4 acordes; você toca o baixo (a fundamental) de cada um, ou os acordes, em ordem. */
export function progressionByEar(opts: { keys: string[]; progressions: Degree[][]; answer: 'bass' | 'chords'; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const prog = pick(rng, opts.progressions);
    const symbols = prog.map((d) => degreeSymbol(key, d));
    return {
      prompt: opts.answer === 'bass' ? 'Ouça e toque o baixo de cada acorde, em ordem' : 'Ouça e toque os acordes, em ordem',
      detail: `Tom de ${keyName(key)} maior, ${prog.length} acordes. O primeiro é o I.`,
      listen: { bpm: 72, steps: symbols.map((x) => ({ midis: voiced(x, 64), beats: 2 })) },
      hint: prog.join(' – ') + ': ' + symbols.map(chordLabel).join(' – '),
      steps: opts.answer === 'bass' ? symbols.map((x) => ({ kind: 'pc', pcs: [parseChord(x).root] }) as Accept) : symbols.map((x) => chordAccept(x)),
      skill: opts.skill ?? (opts.answer === 'bass' ? 'ditado-baixo' : 'ditado-progressao'),
    };
  };
}

/** Transponha a progressão: a cifra vem num tom; você toca os mesmos graus em outro tom, em ordem. */
export function transposeProgression(opts: { from: string; to: string[]; progressions: Degree[][]; skill?: string }): ItemGen {
  return (rng) => {
    const to = pick(rng, opts.to);
    const prog = pick(rng, opts.progressions);
    const target = prog.map((d) => degreeSymbol(to, d));
    return {
      prompt: `Transponha para ${keyName(to)} maior`,
      symbol: prog.map((d) => chordLabel(degreeSymbol(opts.from, d))).join(' – '),
      detail: `A cifra está em ${keyName(opts.from)}. Pense nos graus (${prog.join(' – ')}) e toque os acordes de ${keyName(to)}, em ordem.`,
      hint: target.map(chordLabel).join(' – '),
      steps: target.map((x) => chordAccept(x)),
      skill: opts.skill ?? 'transpor-progressao',
    };
  };
}

// ---------- escalas e armaduras ----------

const PT_FLAT = ['Dó', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Sol♭', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si'];
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];

/** Nome em português de uma classe de altura, com bemol nas tonalidades de bemóis. */
export function ptInKey(pc: Pc, key: string): string {
  return (FLAT_KEYS.has(rootPc(key)) ? PT_FLAT : PC_NAMES)[((pc % 12) + 12) % 12];
}

/** Construa a escala maior (8 notas, subindo) ou o tetracorde maior (4 notas) a partir de uma tônica, na oitava 4. */
export function buildScale(opts: { keys: string[]; notes: 4 | 8; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const tonic = 60 + rootPc(key);
    const midis = MAJOR.slice(0, opts.notes).map((x) => tonic + x);
    const names = midis.map((m) => ptInKey(pcOf(m), key));
    return {
      prompt: opts.notes === 8 ? `Toque a escala de ${keyName(key)} maior, subindo` : `Toque o tetracorde maior a partir de ${names[0]}`,
      detail: opts.notes === 8 ? `Comece no ${names[0]}4. Tom, tom, semitom, tom, tom, tom, semitom.` : `Comece no ${names[0]}4. Tom, tom, semitom.`,
      hintKeys: midis,
      hint: names.join(', '),
      steps: midis.map((m) => ({ kind: 'exact', midis: [m] }) as Accept),
      skill: opts.skill ?? (opts.notes === 8 ? 'construir-escala' : 'tetracorde'),
    };
  };
}

const SIG_KEY: Record<number, string> = { 0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', [-1]: 'F', [-2]: 'Bb', [-3]: 'Eb' };
const SHARP_ORDER = ['Fá♯', 'Dó♯', 'Sol♯', 'Ré♯', 'Lá♯'];
const FLAT_ORDER = ['Si♭', 'Mi♭', 'Lá♭', 'Ré♭', 'Sol♭'];

/** "Que tonalidade maior tem 2 sustenidos (Fá♯, Dó♯)? Toque a tônica." */
export function keyFromSignature(opts: { fifths: number[]; skill?: string }): ItemGen {
  return (rng) => {
    const f = pick(rng, opts.fifths);
    const key = SIG_KEY[f];
    const list = f > 0 ? SHARP_ORDER.slice(0, f) : FLAT_ORDER.slice(0, -f);
    return {
      prompt: 'Que tonalidade maior tem esta armadura? Toque a tônica',
      symbol: f === 0 ? 'sem acidentes' : `${keySigLabel(f)}: ${list.join(', ')}`,
      detail: 'Qualquer oitava.',
      hint: f > 0 ? `O último sustenido (${list[list.length - 1]}) é a sensível: a tônica fica meio tom acima. ${keyName(key)}.` : f < 0 ? `Com bemóis, a tônica é o penúltimo bemol (com 1 bemol, é Fá). ${keyName(key)}.` : 'Sem acidentes: Dó maior.',
      steps: [{ kind: 'pc', pcs: [rootPc(key)] }],
      skill: opts.skill ?? 'armadura',
    };
  };
}

const DEGREE_PT = ['tônica', 'supertônica', 'mediante', 'subdominante', 'dominante', 'superdominante', 'sensível'];

/** "Toque a mediante de Sol maior": nome do grau → nota, em qualquer oitava. */
export function scaleDegreeNote(opts: { keys: string[]; degrees: number[]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const d = pick(rng, opts.degrees);
    const pc = (rootPc(key) + MAJOR[d - 1]) % 12;
    return {
      prompt: `Toque a ${DEGREE_PT[d - 1]} de ${keyName(key)} maior`,
      detail: 'Qualquer oitava.',
      hint: `Grau ${d} de ${keyName(key)}: ${ptInKey(pc, key)}.`,
      steps: [{ kind: 'pc', pcs: [pc] }],
      skill: opts.skill ?? 'nome-do-grau',
    };
  };
}

/** Achar a tônica: o app toca I–IV–V7 numa tonalidade sorteada (sem resolver); você toca a casa. */
export function tonicByEar(opts: { keys: string[]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const pre: Degree[] = ['I', 'IV', 'V7'];
    return {
      prompt: 'Qual é a casa? Toque a tônica',
      detail: 'Qualquer oitava. Cante a nota em que a progressão quer parar.',
      listen: { bpm: 80, steps: pre.map((d) => ({ midis: voiced(degreeSymbol(key, d), 64), beats: 2 })) },
      hint: `Tom de ${keyName(key)}: a casa é ${keyName(key)}.`,
      steps: [{ kind: 'pc', pcs: [rootPc(key)] }],
      skill: opts.skill ?? 'tonica',
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
