// Geradores de itens prontos para as lições: achar nota, achar todas, ler na pauta, intervalo,
// acorde por cifra, grau na tonalidade, eco (o app toca, você repete). Puro e testado (course.test.ts).
// Unidades novas devem preferir estes geradores; um gerador novo entra aqui, com teste.

import type { Clef, Midi } from '../music/notes';
import { PC_NAMES, keysOf, n, nameOf, pcOf, pick, ptName, shuffle } from './music';
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
  '7(b9)': [0, 4, 7, 10, 1],
  // Tensões (Unidade 11): a 9ª, a 11ª e a 13ª entram como classes (2, 5, 9 semitons acima da fundamental).
  '7M(9)': [0, 4, 7, 11, 2],
  '7M(#11)': [0, 4, 7, 11, 6],
  '6(9)': [0, 4, 7, 9, 2],
  'm7(9)': [0, 3, 7, 10, 2],
  'm7(11)': [0, 3, 7, 10, 5],
  '7(9)': [0, 4, 7, 10, 2],
  '7(13)': [0, 4, 7, 10, 9],
  '7(#9)': [0, 4, 7, 10, 3],
  '7(b13)': [0, 4, 7, 10, 8],
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
export const chordLabel = (symbol: string) => symbol.replace(/#/g, '♯').replace(/([A-G])b/g, '$1♭').replace(/\(b/g, '(♭');

/** Notas de uma tríade com a grafia certa ("Mi♭, Sol♭, Si♭"), ou null se a cifra não é uma tríade simples. */
function spelledHint(symbol: string): string | null {
  try {
    return chordSpelling(symbol.split('/')[0]).map((x) => ptName(`${x}4`)).join(', ');
  } catch {
    return null;
  }
}

/** "Toque o acorde de Fá maior" a partir de cifras. Com `bass`, a inversão é exigida. */
export function playChord(opts: { symbols: string[]; low: Midi; high: Midi; requireBass?: boolean; omitFifth?: boolean; skill?: string }): ItemGen {
  return (rng) => {
    const symbol = pick(rng, opts.symbols);
    const c = parseChord(symbol);
    const accept: Accept = { kind: 'chord', pcs: c.pcs, bass: opts.requireBass || c.bass !== undefined ? (c.bass ?? c.root) : undefined };
    if (opts.omitFifth && c.pcs.length >= 4 && (c.pcs[2] - c.root + 12) % 12 === 7) accept.optional = [c.pcs[2]];
    // Dica: posição fechada a partir da fundamental mais perto do meio do trecho.
    const mid = Math.round((opts.low + opts.high) / 2) - 6;
    const base = mid + ((c.root - pcOf(mid) + 12) % 12);
    let hintKeys = c.pcs.map((p) => base + ((p - c.root + 12) % 12));
    const bassPc = accept.kind === 'chord' ? accept.bass : undefined;
    if (bassPc !== undefined && bassPc !== c.root) {
      // Inversão ou baixo de fora: a dica acende o baixo pedido embaixo de tudo.
      const inChord = hintKeys.find((m) => pcOf(m) === bassPc);
      if (inChord !== undefined) hintKeys = hintKeys.map((m) => (m < inChord ? m + 12 : m));
      else hintKeys = [Math.min(...hintKeys) - 1 - ((pcOf(Math.min(...hintKeys) - 1) - bassPc + 12) % 12), ...hintKeys];
      hintKeys.sort((a, b) => a - b);
    }
    const notes = spelledHint(symbol) ?? c.pcs.map((p) => PC_NAMES[p]).join(', ');
    return {
      prompt: 'Toque o acorde',
      symbol: chordLabel(symbol),
      hintKeys,
      hint: bassPc !== undefined && bassPc !== c.root ? `${notes}, com ${PC_NAMES[bassPc]} no baixo` : notes,
      steps: [accept],
      skill: opts.skill ?? 'acorde',
    };
  };
}

// ---------- graus na tonalidade (I, IV, V, V7) ----------

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set([5, 10, 3, 8, 1]);
const KEY_PT: Record<string, string> = { C: 'Dó', G: 'Sol', F: 'Fá', D: 'Ré', A: 'Lá', Bb: 'Si♭', E: 'Mi', Eb: 'Mi♭', Ab: 'Lá♭', Db: 'Ré♭', Gb: 'Sol♭', B: 'Si', 'F#': 'Fá♯' };
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

/** Aceite de um acorde por cifra, com a 5ª justa opcional nas tétrades (posição próxima: Si–Fá–Sol no G7). A 5ª diminuta do ø e do °7 é obrigatória: sem ela, Bø vira Bm7. */
function chordAccept(symbol: string, bass?: boolean): Accept {
  const c = parseChord(symbol);
  const perfectFifth = (c.pcs[2] - c.root + 12) % 12 === 7;
  return { kind: 'chord', pcs: c.pcs, bass: bass ? c.root : undefined, optional: c.pcs.length >= 4 && perfectFifth ? [c.pcs[2]] : undefined };
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
      hint: `${chordLabel(symbol)}: ${c.pcs.map((p) => ptInKey(p, key)).join(', ')}`,
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
      detail: `Tom de ${keyName(key)} maior, ${prog.length} acordes. ${prog[0] === 'I' ? 'O primeiro é o I.' : 'O primeiro pode não ser o I.'}`,
      listen: { bpm: 72, steps: ledVoicings(symbols).map((v) => ({ midis: v, beats: 2 })) },
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

/** Cadência i–iv–V–i em menor (a do V tem a sensível), para "sentir a casa" menor. */
export function minorCadence(tonic: Midi, bpm = 96): Listen {
  return {
    bpm,
    steps: [
      { midis: [tonic - 12, tonic, tonic + 3, tonic + 7], beats: 1 },
      { midis: [tonic - 7, tonic, tonic + 5, tonic + 8], beats: 1 },
      { midis: [tonic - 5, tonic - 1, tonic + 2, tonic + 7], beats: 1 },
      { midis: [tonic - 12, tonic, tonic + 3, tonic + 7], beats: 2 },
    ],
  };
}

const DEGREE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const DEGREE_NAMES = ['1 (a casa)', '2', '3', '4', '5', '6', '7'];
/** Graus em menor: a escala natural, e o 8 é o 7 elevado (a sensível, que aparece no V). */
const MINOR_DEGREE_STEPS = [0, 2, 3, 5, 7, 8, 10, 11];
const MINOR_DEGREE_NAMES = ['1 (a casa)', '2', '3 menor', '4', '5', '6 menor', '7 natural', '7 elevado (sensível)'];

/** O app toca a cadência e uma nota; você responde tocando o grau (qualquer oitava). Em menor, o grau 8 é a sensível. */
export function degreeByEar(opts: { tonic: Midi; degrees: number[]; mode?: 'maior' | 'menor'; skill?: string }): ItemGen {
  const minor = opts.mode === 'menor';
  const stepsOf = minor ? MINOR_DEGREE_STEPS : DEGREE_STEPS;
  const namesOf = minor ? MINOR_DEGREE_NAMES : DEGREE_NAMES;
  return (rng) => {
    const d = pick(rng, opts.degrees);
    const target = opts.tonic + stepsOf[d - 1];
    const c = minor ? minorCadence(opts.tonic) : cadence(opts.tonic);
    return {
      prompt: 'Que nota foi essa? Toque ela',
      detail: `Primeiro a cadência mostra a casa (${nameOf(opts.tonic)}${minor ? ' menor' : ''}), depois vem a nota. Pode ser ${opts.degrees.map((x) => namesOf[x - 1]).join(', ')}.`,
      listen: { bpm: c.bpm, steps: [...c.steps, { midis: [], beats: 1 }, { midis: [target], beats: 2 }] },
      hintKeys: [target],
      hint: `Grau ${namesOf[d - 1]}: ${nameOf(target)}`,
      steps: [{ kind: 'pc', pcs: [pcOf(target)] }],
      skill: opts.skill ?? (minor ? 'grau-menor' : 'grau'),
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
    // Embaralha as opções: a resposta não pode ficar sempre no mesmo lugar.
    const order = shuffle(rng, c.options.map((_, i) => i));
    return { prompt: c.q, choices: order.map((i) => c.options[i]), answer: order.indexOf(c.answer), hint: c.why, steps: [], skill };
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

// ---------- modo menor (Unidade 5) ----------

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACC = (k: number) => (k > 0 ? '#'.repeat(k) : 'b'.repeat(-k));

/** Grafia de uma tecla com a letra pedida: (63, 'D', 4) → "D#4"; (63, 'E', 4) → "Eb4". */
function spellWith(midi: Midi, letter: string, octave: number): string | null {
  const k = midi - ((octave + 1) * 12 + LETTER_PC[letter]);
  return Math.abs(k) <= 2 ? `${letter}${ACC(k)}${octave}` : null;
}

/** Grau (0 a 6) de cada distância em semitons, nas escalas maior e menores (Lá → Fá e Fá♯ são ambos o 6º grau). */
const DEG_OF: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6 };

/** Escala soletrada (uma letra por grau) a partir de uma tônica escrita ("A4", "F#4"); passos de 0 a 12 semitons, em qualquer ordem. */
export function spellScale(tonic: string, steps: number[]): string[] {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(tonic);
  if (!m) throw new Error(`Tônica inválida: ${tonic}`);
  const li = LETTERS.indexOf(m[1]);
  const t = n(tonic);
  return steps.map((x) => {
    const idx = li + (x === 12 ? 7 : DEG_OF[x]);
    return spellWith(t + x, LETTERS[idx % 7], Number(m[3]) + Math.floor(idx / 7)) ?? nameOf(t + x);
  });
}

export type MinorForm = 'natural' | 'harmonica' | 'melodica';
const MINOR_FORMS: Record<MinorForm, number[]> = {
  natural: [0, 2, 3, 5, 7, 8, 10, 12],
  harmonica: [0, 2, 3, 5, 7, 8, 11, 12],
  melodica: [0, 2, 3, 5, 7, 9, 11, 12],
};
const FORM_PT: Record<MinorForm, string> = { natural: 'natural', harmonica: 'harmônica', melodica: 'melódica' };
const FORM_STEPS: Record<MinorForm, string> = {
  natural: 'T S T T S T T',
  harmonica: 'T S T T S 1½ S (o 7º grau sobe meio tom)',
  melodica: 'Subindo T S T T T T S (6º e 7º sobem); descendo, a natural',
};

/** Passos (semitons a partir da tônica) da escala menor. A melódica sobe e desce (15 notas): sobe alterada, desce natural. */
export function minorSteps(form: MinorForm): number[] {
  if (form !== 'melodica') return MINOR_FORMS[form];
  return [...MINOR_FORMS.melodica, ...[...MINOR_FORMS.natural].reverse().slice(1)];
}

/** Tônicas das tonalidades menores usadas no curso, com a grafia. */
const MINOR_TONIC: Record<string, string> = { A: 'A4', E: 'E4', D: 'D4', B: 'B3', G: 'G4', C: 'C4', 'F#': 'F#4' };
const MINOR_FLAT = new Set(['D', 'G', 'C', 'F']);

/** Nome da tonalidade menor: "A" → "Lá menor". */
export const minorKeyName = (key: string) => `${KEY_PT[key] ?? (key === 'F#' ? 'Fá♯' : key)} menor`;

/** Construa a escala menor (natural, harmônica ou melódica) a partir da tônica, na oitava pedida pela tabela. */
export function buildMinorScale(opts: { keys: string[]; forms: MinorForm[]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const form = pick(rng, opts.forms);
    const tonic = MINOR_TONIC[key];
    const steps = minorSteps(form);
    const t = n(tonic);
    const spelled = spellScale(tonic, steps);
    const names = spelled.map((x) => ptName(x));
    return {
      prompt: `Toque ${minorKeyName(key)} ${FORM_PT[form]}${form === 'melodica' ? ', subindo e descendo' : ', subindo'}`,
      detail: `Comece no ${names[0]}${tonic.slice(-1)}. ${FORM_STEPS[form]}.`,
      hintKeys: [...new Set(steps.map((x) => t + x))],
      hint: names.join(', '),
      steps: steps.map((x) => ({ kind: 'exact', midis: [t + x] }) as Accept),
      skill: opts.skill ?? `escala-menor-${form}`,
    };
  };
}

export type MinorDegree = 'i' | 'iv' | 'V' | 'V7';

/** Cifra do grau numa tonalidade menor (com o V maior da harmônica): ("A", "V7") → "E7"; ("D", "iv") → "Gm". */
export function minorDegreeSymbol(key: string, degree: MinorDegree): string {
  const k = rootPc(key);
  const names = MINOR_FLAT.has(key) ? FLAT_NAMES : SHARP_NAMES;
  const off = degree === 'i' ? 0 : degree === 'iv' ? 5 : 7;
  const suffix = degree === 'i' || degree === 'iv' ? 'm' : degree === 'V7' ? '7' : '';
  return names[(k + off) % 12] + suffix;
}

/** "Em Lá menor, toque o iv": acordes de uma tonalidade menor pelo grau. */
export function minorChord(opts: { keys: string[]; degrees: MinorDegree[]; low: Midi; high: Midi; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const degree = pick(rng, opts.degrees);
    const symbol = minorDegreeSymbol(key, degree);
    const c = parseChord(symbol);
    return {
      prompt: `Em ${minorKeyName(key)}, toque o ${degree}`,
      detail: degree.startsWith('V') ? 'O V é maior: use a sensível (o 7º grau elevado). No V7, a 5ª pode ficar de fora.' : 'Qualquer posição.',
      hintKeys: voiced(symbol, Math.round((opts.low + opts.high) / 2)).slice(1),
      hint: `${chordLabel(symbol)}: ${c.pcs.map((p) => PC_NAMES[p]).join(', ')}`,
      steps: [chordAccept(symbol)],
      skill: opts.skill ?? 'grau-menor-acorde',
    };
  };
}

/** O app toca o começo de uma cadência em menor; você toca o i (o acorde de repouso). */
export function resolveMinor(opts: { keys: string[]; before: MinorDegree[][]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const prog = pick(rng, opts.before);
    const tonic = minorDegreeSymbol(key, 'i');
    return {
      prompt: 'Complete a cadência: toque o acorde que resolve',
      detail: `${minorKeyName(key)}. Ouça ${prog.join(' – ')} e responda com o i.`,
      listen: { bpm: 80, steps: prog.map((d) => ({ midis: voiced(minorDegreeSymbol(key, d), 64), beats: 2 })) },
      hintKeys: voiced(tonic, 60).slice(1),
      hint: `O i de ${minorKeyName(key)}: ${chordLabel(tonic)}`,
      steps: [chordAccept(tonic)],
      skill: opts.skill ?? 'cadencia-menor',
    };
  };
}

const REL_PT: Record<string, string> = { C: 'Dó', G: 'Sol', D: 'Ré', F: 'Fá', Bb: 'Si♭', A: 'Lá', E: 'Mi', Eb: 'Mi♭' };
const RELATIVE: Record<string, string> = { C: 'A', G: 'E', D: 'B', F: 'D', Bb: 'G', A: 'F#', E: 'C#', Eb: 'C' };
const REL_MINOR_PT: Record<string, string> = { A: 'Lá', E: 'Mi', B: 'Si', D: 'Ré', G: 'Sol', 'F#': 'Fá♯', 'C#': 'Dó♯', C: 'Dó' };

/** "Qual é a relativa menor de Sol maior? Toque a tônica" (ou o caminho inverso). */
export function relativeKey(opts: { majors: string[]; ask: ('menor' | 'maior')[]; skill?: string }): ItemGen {
  return (rng) => {
    const major = pick(rng, opts.majors);
    const minor = RELATIVE[major];
    const ask = pick(rng, opts.ask);
    const toMinor = ask === 'menor';
    return {
      prompt: toMinor ? `Qual é a relativa menor de ${REL_PT[major]} maior? Toque a tônica` : `Qual é a relativa maior de ${REL_MINOR_PT[minor]} menor? Toque a tônica`,
      detail: 'Qualquer oitava. A relativa tem a mesma armadura.',
      hint: toMinor ? `Desça uma 3ª menor (3 semitons) a partir de ${REL_PT[major]}: ${REL_MINOR_PT[minor]} menor.` : `Suba uma 3ª menor (3 semitons) a partir de ${REL_MINOR_PT[minor]}: ${REL_PT[major]} maior.`,
      steps: [{ kind: 'pc', pcs: [rootPc(toMinor ? minor : major)] }],
      skill: opts.skill ?? 'relativa',
    };
  };
}

// ---------- intervalos com qualidade ----------

/** Semitons de cada intervalo: número + qualidade (m menor, M maior, J justo, A aumentado, d diminuto). */
export const IV_SEMIS: Record<string, number> = {
  '2m': 1, '2M': 2, '2A': 3, '3d': 2, '3m': 3, '3M': 4, '4d': 4, '4J': 5, '4A': 6, '5d': 6, '5J': 7, '5A': 8,
  '6m': 8, '6M': 9, '7d': 9, '7m': 10, '7M': 11, '8J': 12, '9m': 13,
};
const Q_PT: Record<string, string> = { m: 'menor', M: 'maior', J: 'justa', A: 'aumentada', d: 'diminuta' };

/** "6m" → "6ª menor"; "8J" → "8ª justa". */
export const ivLabel = (iv: string) => `${iv[0]}ª ${Q_PT[iv.slice(1)]}`;

/** A nota a um intervalo de outra, com a grafia certa: ("F#4", "6m", 1) → "D5"; ("C4", "4A", 1) → "F#4". */
export function spellInterval(from: string, iv: string, dir: 1 | -1 = 1): string {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(from);
  if (!m || IV_SEMIS[iv] === undefined) throw new Error(`Intervalo inválido: ${from} ${iv}`);
  const idx = LETTERS.indexOf(m[1]) + dir * (Number(iv[0]) - 1);
  const oct = Number(m[3]) + Math.floor(idx / 7);
  const letter = LETTERS[((idx % 7) + 7) % 7];
  const out = spellWith(n(from) + dir * IV_SEMIS[iv], letter, oct);
  if (!out) throw new Error(`Grafia impossível: ${iv} de ${from}`);
  return out;
}

/** "Toque uma 6ª menor acima de Fá♯": primeiro a nota dada, depois a resposta. */
export function qualityInterval(opts: { from: string[]; intervals: string[]; dir?: 'acima' | 'abaixo'; skill?: string }): ItemGen {
  return (rng) => {
    const from = pick(rng, opts.from);
    const iv = pick(rng, opts.intervals);
    const d = opts.dir === 'abaixo' ? -1 : 1;
    const target = spellInterval(from, iv, d);
    return {
      prompt: `Toque uma ${ivLabel(iv)} ${d > 0 ? 'acima' : 'abaixo'} de ${ptName(from)}`,
      detail: `Primeiro ${ptName(from)}${from.slice(-1)}, depois a resposta.`,
      hintKeys: [n(from), n(target)],
      hint: `${ptName(target)}: ${iv[0]} letras contando as duas pontas, ${IV_SEMIS[iv]} semitons.`,
      steps: [{ kind: 'exact', midis: [n(from)] }, { kind: 'exact', midis: [n(target)] }],
      skill: opts.skill ?? 'intervalo-qualidade',
    };
  };
}

/** Soletrar: "Qual é a 3ª menor acima de Ré?" com a grafia certa, a enarmônica (letra errada) e uma de qualidade errada. */
export function spellIntervalChoice(opts: { from: string[]; intervals: string[]; dir?: 'acima' | 'abaixo'; skill?: string }): ItemGen {
  // Só grafias ensinadas: nada de dobrado sustenido/bemol, nem Mi♯, Si♯, Fá♭ ou Dó♭, na resposta ou nas opções.
  const plain = (x: string | null | undefined): x is string => typeof x === 'string' && !/##|bb|E#|B#|Fb|Cb/.test(x);
  return (rng) => {
    let from = pick(rng, opts.from);
    let iv = pick(rng, opts.intervals);
    const d = opts.dir === 'abaixo' ? -1 : 1;
    for (let guard = 0; guard < 50 && !plain(spellInterval(from, iv, d)); guard++) {
      from = pick(rng, opts.from);
      iv = pick(rng, opts.intervals);
    }
    const right = spellInterval(from, iv, d);
    const tm = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(right)!;
    const li = LETTERS.indexOf(tm[1]);
    // A enarmônica (mesma tecla, letra vizinha) só entra com um acidente no máximo; senão, as duas erradas mudam a qualidade.
    const enh = [1, -1]
      .map((k) => {
        const j = li + k;
        return spellWith(n(right), LETTERS[((j % 7) + 7) % 7], Number(tm[3]) + Math.floor(j / 7));
      })
      .find(plain);
    const dk = rng() < 0.5 ? 1 : -1;
    const off = (d: number) => {
      const x = spellWith(n(right) + d, tm[1], Number(tm[3]));
      return plain(x) ? x : null;
    };
    // Letra vizinha numa tecla vizinha: intervalo errado (uma 4ª no lugar da 3ª, por exemplo).
    const wrongLetter = [1, -1].flatMap((k) => {
      const j = li + k;
      return [k, 0, -k].map((dm) => spellWith(n(right) + dm, LETTERS[((j % 7) + 7) % 7], Number(tm[3]) + Math.floor(j / 7)));
    });
    const wrong = [...new Set([off(dk), enh, off(-dk), ...wrongLetter].filter(plain).filter((x) => x !== right))].slice(0, 2);
    const opts3 = shuffle(rng, [right, ...wrong]);
    const names = opts3.map((x) => ptName(x));
    return {
      prompt: `Qual é a ${ivLabel(iv)} ${d > 0 ? 'acima' : 'abaixo'} de ${ptName(from)}?`,
      choices: names,
      answer: opts3.indexOf(right),
      hint: `${ptName(right)}: ${iv[0]} letras (${ptName(from)} … ${ptName(right)}) e ${IV_SEMIS[iv]} semitons.`,
      steps: [],
      skill: opts.skill ?? 'soletrar-intervalo',
    };
  };
}

/** O app toca um intervalo; você toca o mesmo intervalo, a partir da nota dita ou de outra raiz (mais difícil). */
export function qualityByEar(opts: { from: string[]; intervals: string[]; harmonic?: boolean; answerFrom?: string[]; skill?: string }): ItemGen {
  return (rng) => {
    const from = n(pick(rng, opts.from));
    const iv = pick(rng, opts.intervals);
    const semis = IV_SEMIS[iv];
    const start = opts.answerFrom ? n(pick(rng, opts.answerFrom)) : from;
    const listen: Listen = opts.harmonic
      ? { bpm: 72, steps: [{ midis: [from, from + semis], beats: 2 }] }
      : { bpm: 72, steps: [{ midis: [from], beats: 1 }, { midis: [from + semis], beats: 2 }] };
    return {
      prompt: opts.answerFrom ? `Ouça o intervalo e toque o mesmo intervalo a partir de ${nameOf(start)}` : 'Ouça o intervalo e toque as duas notas',
      detail: `${opts.answerFrom ? `O app toca a partir de ${nameOf(from)}; você responde a partir de ${nameOf(start)}.` : `Começa em ${nameOf(from)} e sobe.`} Pode ser ${opts.intervals.map(ivLabel).join(', ')}.`,
      listen,
      hintKeys: [start, start + semis],
      hint: `${ivLabel(iv)}: ${semis} semitons.`,
      steps: [{ kind: 'exact', midis: [start] }, { kind: 'exact', midis: [start + semis] }],
      skill: opts.skill ?? 'intervalo-ouvido-qualidade',
    };
  };
}

/** "a, b ou c". */
const orList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ou ${xs[xs.length - 1]}`);

const TRIAD_PT: Record<string, string> = {
  '': 'maior', m: 'menor', dim: 'diminuta', aug: 'aumentada',
  '7M': 'maior com 7ª maior (7M)', '7': 'dominante (7)', m7: 'menor com 7ª (m7)', ø: 'meio-diminuta (ø)', '°7': 'diminuta (°7)',
};

/** O app toca uma tríade; você toca uma tríade da mesma qualidade sobre outra fundamental (no estado fundamental). */
export function chordQualityByEar(opts: { qualities: string[]; roots: Midi[]; answerRoots: Midi[]; skill?: string }): ItemGen {
  return (rng) => {
    const q = pick(rng, opts.qualities);
    const root = pick(rng, opts.roots);
    let ans = pick(rng, opts.answerRoots);
    if (opts.answerRoots.length > 1) while (pcOf(ans) === pcOf(root)) ans = pick(rng, opts.answerRoots);
    const ivs = QUALITIES[q];
    const triad = ivs.map((x) => root + x);
    return {
      prompt: `Ouça o acorde e toque um da mesma qualidade com fundamental em ${PC_NAMES[pcOf(ans)]}`,
      detail: `Pode ser ${orList(opts.qualities.map((x) => TRIAD_PT[x]))}. A fundamental embaixo.`,
      listen: { bpm: 72, steps: [{ midis: triad, beats: 2 }, ...triad.map((m) => ({ midis: [m], beats: 0.5 })), { midis: triad, beats: 2 }] },
      hintKeys: ivs.map((x) => ans + x),
      hint: `${ivs.length > 3 ? 'Tétrade' : 'Tríade'} ${TRIAD_PT[q]}: ${spelledHint(SHARP_NAMES[pcOf(ans)] + q) ?? ivs.map((x) => PC_NAMES[pcOf(ans + x)]).join(', ')}.`,
      steps: [{ kind: 'chord', pcs: ivs.map((x) => pcOf(ans + x)), bass: pcOf(ans) }],
      skill: opts.skill ?? 'qualidade-ouvido',
    };
  };
}

// ---------- tríades soletradas, inversões e condução (Unidade 6) ----------

const TRIAD_IVS: Record<string, [string, string]> = { '': ['3M', '5J'], m: ['3m', '5J'], dim: ['3m', '5d'], '°': ['3m', '5d'], aug: ['3M', '5A'], '+': ['3M', '5A'] };
const CHORD_PT: Record<string, string> = { '': 'maior', m: 'menor', dim: 'diminuto', '°': 'diminuto', aug: 'aumentado', '+': 'aumentado' };

/** Tríade soletrada: "F#m" → ["F#", "A", "C#"]; "Bdim" → ["B", "D", "F"]. */
export function triadSpelling(symbol: string): string[] {
  const m = /^([A-G](?:#|b)?)(m|dim|°|aug|\+)?$/.exec(symbol);
  if (!m) throw new Error(`Tríade inválida: ${symbol}`);
  const [third, fifth] = TRIAD_IVS[m[2] ?? ''];
  const root = `${m[1]}4`;
  return [root, spellInterval(root, third), spellInterval(root, fifth)].map((x) => x.replace(/-?\d+$/, ''));
}

const CHORD_IVS: Record<string, string[]> = {
  '': ['3M', '5J'], m: ['3m', '5J'], dim: ['3m', '5d'], '°': ['3m', '5d'], aug: ['3M', '5A'], '+': ['3M', '5A'],
  sus2: ['2M', '5J'], sus4: ['4J', '5J'],
  '7': ['3M', '5J', '7m'], '7M': ['3M', '5J', '7M'], maj7: ['3M', '5J', '7M'], m7: ['3m', '5J', '7m'],
  'm7(b5)': ['3m', '5d', '7m'], ø: ['3m', '5d', '7m'], '°7': ['3m', '5d', '7d'], dim7: ['3m', '5d', '7d'],
  '7(b9)': ['3M', '5J', '7m', '9m'],
  // Tensões soletradas pelo intervalo simples equivalente (9ª = 2ª, 11ª = 4ª, 13ª = 6ª): a letra é a mesma.
  '7M(9)': ['3M', '5J', '7M', '2M'], '7M(#11)': ['3M', '5J', '7M', '4A'], '6(9)': ['3M', '5J', '6M', '2M'],
  'm7(9)': ['3m', '5J', '7m', '2M'], 'm7(11)': ['3m', '5J', '7m', '4J'],
  '7(9)': ['3M', '5J', '7m', '2M'], '7(13)': ['3M', '5J', '7m', '6M'], '7(#9)': ['3M', '5J', '7m', '2A'], '7(b13)': ['3M', '5J', '7m', '6m'],
};

/** Acorde soletrado (tríades, sus e tétrades): "Bb7M" → ["Bb", "D", "F", "A"]; "C#ø" → ["C#", "E", "G", "B"]. */
export function chordSpelling(symbol: string): string[] {
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(symbol);
  const ivs = m ? CHORD_IVS[m[2]] : undefined;
  if (!m || !ivs) throw new Error(`Acorde sem grafia: ${symbol}`);
  const root = `${m[1]}4`;
  return [root, ...ivs.map((iv) => spellInterval(root, iv))].map((x) => x.replace(/-?\d+$/, ''));
}

/** "F#m" → "Fá♯ menor". */
export function triadName(symbol: string): string {
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(symbol)!;
  return `${ptName(m[1] + '4')} ${CHORD_PT[m[2]] ?? m[2]}`;
}

/** Soletre: "Quais são as notas de F♯m?" A grafia certa, a de outra qualidade e uma com a letra trocada. */
export function spellTriadChoice(opts: { chords: string[]; skill?: string }): ItemGen {
  return (rng) => {
    const symbol = pick(rng, opts.chords);
    const m = /^([A-G](?:#|b)?)(.*)$/.exec(symbol)!;
    const q = m[2];
    const right = triadSpelling(symbol);
    const otherQ = q === '' ? 'm' : q === 'm' ? '' : q === 'dim' ? 'm' : '';
    const other = [...triadSpelling(m[1] + otherQ)];
    // Terceira opção: a mesma tecla escrita com a letra vizinha (Fá♯–Si♭–Dó♯ no lugar de Fá♯–Lá♯–Dó♯), primeiro na 3ª,
    // depois na 5ª; se nada disso der uma grafia ensinada, a 5ª meio tom acima (outra qualidade).
    const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const taught = (x: string) => !/##|bb|E#|B#|Fb|Cb/.test(x);
    const respell = (note: string): string | null => {
      const pc = pcOf(n(`${note}4`));
      const li = letters.indexOf(note[0]);
      for (const k of [1, -1]) {
        const L = letters[(li + k + 7) % 7];
        const d = ((pc - LETTER_PC[L] + 18) % 12) - 6;
        const x = L + (d > 0 ? '#' : d < 0 ? 'b' : '');
        if (Math.abs(d) <= 1 && taught(x)) return x;
      }
      return null;
    };
    // A outra qualidade com grafia ensinada (Lá♭ menor viraria Lá♭–Dó♭–Mi♭: aqui sai Lá♭–Si–Mi♭).
    for (let k = 0; k < other.length; k++) if (!taught(other[k])) other[k] = respell(other[k]) ?? other[k];
    const r3 = respell(right[1]);
    const r5 = respell(right[2]);
    const r1 = respell(right[0]);
    const shifted = [1, -1].map((d) => spellWith(n(`${right[2]}4`) + d, right[2][0], 4)).filter((x): x is string => x !== null && taught(x)).map((x) => [right[0], right[1], x.replace(/-?\d+$/, '')]);
    const candidates = [r3 && [right[0], r3, right[2]], r5 && [right[0], right[1], r5], r1 && [r1, right[1], right[2]], ...shifted].filter((x): x is string[] => !!x);
    const wrong = candidates.find((x) => x.join() !== other.join() && x.join() !== right.join()) ?? null;
    const fmt = (xs: string[]) => xs.map((x) => ptName(`${x}4`)).join(', ');
    const options = [fmt(right), fmt(other), ...(wrong ? [fmt(wrong)] : [])].filter((x, i, a) => a.indexOf(x) === i);
    const shuffled = shuffle(rng, options);
    return {
      prompt: `Quais são as notas de ${chordLabel(symbol)}?`,
      detail: triadName(symbol),
      choices: shuffled,
      answer: shuffled.indexOf(fmt(right)),
      hint: `${fmt(right)}: uma letra sim, outra não (${right.map((x) => ptName(`${x[0]}4`)).join('–')}), e as terças dão a qualidade.`,
      steps: [],
      skill: opts.skill ?? 'soletrar-triade',
    };
  };
}

const INV_PT = ['posição fundamental', '1ª inversão', '2ª inversão'];

/** "Toque Ré menor na 1ª inversão": a cifra com barra (Dm/F) aparece junto; o baixo é exigido. */
export function inversionChord(opts: { chords: string[]; inversions: (0 | 1 | 2)[]; showSlash?: boolean; skill?: string }): ItemGen {
  return (rng) => {
    const symbol = pick(rng, opts.chords);
    const inv = pick(rng, opts.inversions);
    const sp = triadSpelling(symbol);
    const c = parseChord(symbol);
    const slash = inv === 0 ? symbol : `${symbol}/${sp[inv]}`;
    const order = [...sp.slice(inv), ...sp.slice(0, inv)];
    return {
      prompt: `Toque ${triadName(symbol)} na ${INV_PT[inv]}`,
      symbol: opts.showSlash === false ? undefined : chordLabel(slash),
      detail: inv === 0 ? 'Fundamental no baixo.' : `${inv === 1 ? 'A 3ª' : 'A 5ª'} no baixo.`,
      hint: `De baixo para cima: ${order.map((x) => ptName(`${x}4`)).join(', ')}.`,
      steps: [{ kind: 'chord', pcs: c.pcs, bass: c.pcs[inv] }],
      skill: opts.skill ?? 'inversao',
    };
  };
}

/** Voicing mais perto de `from` com estas classes (uma nota por classe). */
export function nearestVoicing(from: Midi[], pcs: Pc[]): Midi[] {
  const voices = [...from].sort((a, b) => a - b);
  let best: Midi[] = [];
  let bestCost = Infinity;
  const go = (rest: Pc[], i: number, acc: number, used: Midi[]) => {
    if (acc >= bestCost) return;
    if (i === voices.length) {
      if (new Set(used).size === used.length) {
        bestCost = acc;
        best = [...used].sort((a, b) => a - b);
      }
      return;
    }
    rest.forEach((pc, k) => {
      const v = voices[i];
      const up = v + ((pc - pcOf(v) + 12) % 12);
      for (const t of [up, up - 12]) go([...rest.slice(0, k), ...rest.slice(k + 1)], i + 1, acc + Math.abs(t - v), [...used, t]);
    });
  };
  go(pcs, 0, 0, []);
  return best;
}

/**
 * Para o app tocar uma progressão como um pianista: baixo na fundamental e três vozes em cima, conduzidas
 * pelo caminho mais curto a partir do primeiro acorde com a fundamental na voz de cima. Nas tétrades sai a 5ª,
 * então a 7ª desce e a sensível sobe sozinhas.
 */
export function ledVoicings(symbols: string[]): Midi[][] {
  const upperPcs = (x: string) => {
    const c = parseChord(x);
    return c.pcs.length >= 4 ? c.pcs.filter((_, i) => i !== 2) : c.pcs;
  };
  const first = parseChord(symbols[0]);
  const top = 67 + ((first.root - pcOf(67) + 12) % 12);
  let cur = [top, ...upperPcs(symbols[0]).filter((p) => p !== first.root).map((p) => top - ((first.root - p + 12) % 12))].sort((a, b) => a - b);
  return symbols.map((x, i) => {
    if (i > 0) cur = nearestVoicing(cur, upperPcs(x));
    const c = parseChord(x);
    const bassPc = c.bass ?? c.root;
    return [43 + ((bassPc - pcOf(43) + 12) % 12), ...cur];
  });
}

/** Progressão em sequência (cifras dadas): com `lead`, cada troca precisa andar no máximo o caminho mais curto + `lead` semitons. */
export function chordSequence(opts: { sequences: { name?: string; symbols: string[] }[]; lead?: number; center?: Midi; voicing?: 'full' | 'guide'; /** Exige a fundamental no baixo (quatro vozes: baixo na esquerda, três na direita). */ bass?: boolean; skill?: string }): ItemGen {
  if (opts.voicing === 'guide') return guideSequence(opts);
  return (rng) => {
    const seq = pick(rng, opts.sequences);
    const first = parseChord(seq.symbols[0]);
    const center = opts.center ?? 60;
    const root = center - 5 + ((first.root - pcOf(center - 5) + 12) % 12);
    let cur = first.pcs.map((p) => root + ((p - first.root + 12) % 12)).sort((a, b) => a - b);
    const chain = [cur];
    for (const s of seq.symbols.slice(1)) {
      cur = nearestVoicing(cur, parseChord(s).pcs);
      chain.push(cur);
    }
    return {
      prompt: opts.lead !== undefined ? 'Toque a progressão conduzindo as vozes' : 'Toque os acordes, em ordem',
      symbol: seq.symbols.map(chordLabel).join(' – '),
      detail: [seq.name, opts.lead !== undefined ? (opts.bass ? 'O baixo (a fundamental) na mão esquerda e três notas na direita, uma de cada. Notas comuns ficam; as outras andam o mínimo.' : 'Três notas por acorde. Notas comuns ficam; as outras andam o mínimo.') : 'Qualquer posição; o baixo é exigido nas cifras com barra.'].filter(Boolean).join(' '),
      hintKeys: chain[0],
      hint: chain
        .map((v, i) => {
          const b = parseChord(seq.symbols[i]).bass;
          return `${chordLabel(seq.symbols[i])} (${b !== undefined ? `${PC_NAMES[b]} no baixo; ` : ''}${v.map((m) => PC_NAMES[pcOf(m)]).join('–')})`;
        })
        .join(' → '),
      steps: seq.symbols.map((s) => {
        const c = parseChord(s);
        const a: Accept = { kind: 'chord', pcs: c.pcs, bass: c.bass ?? (opts.bass ? c.root : undefined) };
        if (opts.lead !== undefined) a.lead = opts.lead;
        return a;
      }),
      skill: opts.skill ?? (opts.lead !== undefined ? 'conducao' : 'sequencia-acordes'),
    };
  };
}

// ---------- campo harmônico e funções (Unidade 7) ----------

export type Roman = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii°' | 'V7' | 'I7M' | 'ii7' | 'iii7' | 'IV7M' | 'vi7' | 'viiø';
const DIATONIC: Record<Roman, [number, string]> = {
  I: [0, ''], ii: [2, 'm'], iii: [4, 'm'], IV: [5, ''], V: [7, ''], vi: [9, 'm'], 'vii°': [11, '°'], V7: [7, '7'],
  I7M: [0, '7M'], ii7: [2, 'm7'], iii7: [4, 'm7'], IV7M: [5, '7M'], vi7: [9, 'm7'], viiø: [11, 'm7(b5)'],
};
export const FIELD: Roman[] = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
export const FIELD7: Roman[] = ['I7M', 'ii7', 'iii7', 'IV7M', 'V7', 'vi7', 'viiø'];
export const FUNCTION_OF: Record<Roman, 'T' | 'S' | 'D'> = {
  I: 'T', iii: 'T', vi: 'T', IV: 'S', ii: 'S', V: 'D', V7: 'D', 'vii°': 'D', I7M: 'T', iii7: 'T', vi7: 'T', IV7M: 'S', ii7: 'S', viiø: 'D',
};

/** Cifra de um grau do campo harmônico maior: ("D", "vii°") → "C#°"; ("Bb", "iii") → "Dm". */
export function diatonicSymbol(key: string, roman: Roman): string {
  const k = rootPc(key);
  const names = FLAT_KEYS.has(k) ? FLAT_NAMES : SHARP_NAMES;
  const [off, q] = DIATONIC[roman];
  return names[(k + off) % 12] + q;
}

/** "Em Ré maior, toque o iii": qualquer grau do campo harmônico. */
export function diatonicChord(opts: { keys: string[]; romans: Roman[]; low: Midi; high: Midi; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const roman = pick(rng, opts.romans);
    const symbol = diatonicSymbol(key, roman);
    return {
      prompt: `Em ${keyName(key)} maior, toque o ${roman}`,
      detail: 'Qualquer posição.',
      hintKeys: voiced(symbol, Math.round((opts.low + opts.high) / 2)).slice(1),
      hint: `${chordLabel(symbol)}: ${spelledHint(symbol) ?? parseChord(symbol).pcs.map((p) => PC_NAMES[p]).join(', ')}`,
      steps: [chordAccept(symbol)],
      skill: opts.skill ?? 'campo-harmonico',
    };
  };
}

/** "Toque o campo harmônico de Sol maior, subindo": os 7 acordes e o I de novo, em ordem. */
export function fieldSequence(opts: { keys: string[]; dirs: ('subindo' | 'descendo')[]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const dir = pick(rng, opts.dirs);
    const romans: Roman[] = dir === 'subindo' ? [...FIELD, 'I'] : ['I', ...[...FIELD].reverse()];
    const symbols = romans.map((r) => diatonicSymbol(key, r));
    return {
      prompt: `Toque o campo harmônico de ${keyName(key)} maior, ${dir}`,
      detail: 'Uma tríade por grau, em ordem. Pode subir a mão em bloco (posição fundamental) ou conduzir.',
      symbol: symbols.map(chordLabel).join(' '),
      hint: romans.join(' '),
      steps: symbols.map((x) => chordAccept(x)),
      skill: opts.skill ?? 'campo-sequencia',
    };
  };
}

/** Ditado com o campo inteiro: o app toca 3 ou 4 acordes; você toca o baixo de cada um ou os acordes. */
export function diatonicByEar(opts: { keys: string[]; progressions: Roman[][]; answer: 'bass' | 'chords'; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const prog = pick(rng, opts.progressions);
    const symbols = prog.map((d) => diatonicSymbol(key, d));
    return {
      prompt: opts.answer === 'bass' ? 'Ouça e toque o baixo de cada acorde, em ordem' : 'Ouça e toque os acordes, em ordem',
      detail: `Tom de ${keyName(key)} maior, ${prog.length} acordes. ${prog[0] === 'I' ? 'O primeiro é o I.' : 'O primeiro pode não ser o I.'}`,
      listen: { bpm: 72, steps: ledVoicings(symbols).map((v) => ({ midis: v, beats: 2 })) },
      hint: `${prog.join(' – ')}: ${symbols.map(chordLabel).join(' – ')}`,
      steps: opts.answer === 'bass' ? symbols.map((x) => ({ kind: 'pc', pcs: [parseChord(x).root] }) as Accept) : symbols.map((x) => chordAccept(x)),
      skill: opts.skill ?? (opts.answer === 'bass' ? 'ditado-baixo' : 'ditado-progressao'),
    };
  };
}

/** Transponha pelos graus: a cifra vem num tom, você toca os mesmos graus em outro. */
export function transposeDiatonic(opts: { from: string; to: string[]; progressions: Roman[][]; skill?: string }): ItemGen {
  return (rng) => {
    const to = pick(rng, opts.to);
    const prog = pick(rng, opts.progressions);
    const target = prog.map((d) => diatonicSymbol(to, d));
    return {
      prompt: `Transponha para ${keyName(to)} maior`,
      symbol: prog.map((d) => chordLabel(diatonicSymbol(opts.from, d))).join(' – '),
      detail: `A cifra está em ${keyName(opts.from)}. Analise em graus e toque os mesmos graus em ${keyName(to)}.`,
      hint: `${prog.join(' – ')}: ${target.map(chordLabel).join(' – ')}`,
      steps: target.map((x) => chordAccept(x)),
      skill: opts.skill ?? 'transpor-graus',
    };
  };
}

export type CadenceKind = 'perfeita' | 'plagal' | 'meia' | 'deceptiva';
const CADENCE_PT: Record<CadenceKind, string> = { perfeita: 'perfeita (V–I)', plagal: 'plagal (IV–I)', meia: 'meia cadência (termina no V)', deceptiva: 'deceptiva (V–vi)' };
const CADENCE_LEAD: Record<CadenceKind, Roman[]> = { perfeita: ['I', 'IV', 'V7', 'I'], plagal: ['I', 'vi', 'IV', 'I'], meia: ['I', 'vi', 'ii', 'V'], deceptiva: ['I', 'IV', 'V7', 'vi'] };
const CADENCE_ASK: Record<CadenceKind, Roman[]> = { perfeita: ['V7', 'I'], plagal: ['IV', 'I'], meia: ['IV', 'V'], deceptiva: ['V7', 'vi'] };

/** O app toca uma frase de 4 acordes; você diz que cadência fecha a frase. */
export function cadenceChoice(opts: { keys: string[]; kinds: CadenceKind[]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const kind = pick(rng, opts.kinds);
    const symbols = CADENCE_LEAD[kind].map((r) => diatonicSymbol(key, r));
    return {
      prompt: 'Que cadência fecha a frase?',
      detail: `Tom de ${keyName(key)} maior. Preste atenção nos dois últimos acordes.`,
      listen: { bpm: 72, steps: ledVoicings(symbols).map((v, i) => ({ midis: v, beats: i === symbols.length - 1 ? 3 : 2 })) },
      choices: opts.kinds.map((k) => CADENCE_PT[k]),
      answer: opts.kinds.indexOf(kind),
      hint: `${CADENCE_LEAD[kind].join(' – ')}: ${CADENCE_PT[kind]}.`,
      steps: [],
      skill: opts.skill ?? 'cadencia-ouvido',
    };
  };
}

/** "Toque uma cadência plagal em Sol maior": os dois acordes da cadência, em ordem. */
export function playCadence(opts: { keys: string[]; kinds: CadenceKind[]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const kind = pick(rng, opts.kinds);
    const romans = CADENCE_ASK[kind];
    const symbols = romans.map((r) => diatonicSymbol(key, r));
    return {
      prompt: `Toque uma cadência ${kind === 'meia' ? 'meia (semicadência)' : kind} em ${keyName(key)} maior`,
      detail: kind === 'perfeita' ? 'Os dois acordes, em ordem, com a fundamental no baixo (é o que faz a perfeita).' : 'Os dois acordes, em ordem, qualquer posição.',
      hint: `${romans.join(' – ')}: ${symbols.map(chordLabel).join(' – ')}`,
      steps: symbols.map((x) => chordAccept(x, kind === 'perfeita')),
      skill: opts.skill ?? 'cadencia-tocar',
    };
  };
}

/** Harmonize com funções: a pauta mostra um compasso de melodia; qualquer acorde do campo que tenha a nota do tempo forte serve. */
export function harmonizeAny(opts: { key: string; bars: { notes: Midi[]; cadence?: Roman }[]; skill?: string }): ItemGen {
  return (rng) => {
    const bar = pick(rng, opts.bars);
    const strong = pcOf(bar.notes[0]);
    const romans: Roman[] = bar.cadence ? [bar.cadence] : (['I', 'ii', 'iii', 'IV', 'V', 'vi'] as Roman[]).filter((r) => parseChord(diatonicSymbol(opts.key, r)).pcs.includes(strong));
    const symbols = romans.map((r) => diatonicSymbol(opts.key, r));
    return {
      prompt: bar.cadence ? 'Fim de frase: toque o acorde da cadência' : 'Que acorde cabe embaixo deste compasso? Toque um',
      detail: bar.cadence ? `Tom de ${keyName(opts.key)} maior. ${bar.cadence === 'I' ? 'A frase termina em casa: cadência perfeita.' : bar.cadence === 'V' ? 'A frase para na dominante: meia cadência.' : 'Fim de frase.'}` : `Tom de ${keyName(opts.key)} maior. Qualquer acorde do campo que contenha a 1ª nota (o tempo forte) serve.`,
      staff: { notes: bar.notes, clef: 'treble' },
      listen: { bpm: 80, steps: bar.notes.map((m) => ({ midis: [m], beats: 1 })) },
      hint: `Servem: ${romans.map((r, i) => `${r} (${chordLabel(symbols[i])})`).join(', ')}.`,
      steps: [{ kind: 'anyChord', options: symbols.map((x) => ({ pcs: parseChord(x).pcs })) }],
      skill: opts.skill ?? 'harmonizar-funcoes',
    };
  };
}

/** O app toca I – ? – V – I; o acorde do meio é o IV ou o ii (ou I ou vi)? Ouvir a substituição de mesma função. */
export function substituteChoice(opts: { keys: string[]; pairs: [Roman, Roman][]; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const pair = pick(rng, opts.pairs);
    const which = rng() < 0.5 ? 0 : 1;
    const mid = pair[which];
    const prog: Roman[] = ['I', mid, 'V7', 'I'];
    return {
      prompt: `O segundo acorde é o ${pair[0]} ou o ${pair[1]}?`,
      detail: `Tom de ${keyName(key)} maior: I – ? – V7 – I.`,
      listen: { bpm: 72, steps: prog.map((r) => ({ midis: voiced(diatonicSymbol(key, r), 64), beats: 2 })) },
      choices: [`${pair[0]} (${chordLabel(diatonicSymbol(key, pair[0]))})`, `${pair[1]} (${chordLabel(diatonicSymbol(key, pair[1]))})`],
      answer: which,
      hint: `Era o ${mid}: ${pair[0] === 'IV' || pair[1] === 'IV' ? 'o ii é menor e mais suave; o IV é maior e mais aberto' : 'o vi é menor e mais escuro; o I soa como casa'}.`,
      steps: [],
      skill: opts.skill ?? 'funcao-ouvido',
    };
  };
}

/** Complete a frase: a pauta mostra a melodia sem a última nota; qualquer nota de `accept` termina bem (várias respostas). */
export function completePhrase(opts: { phrases: { notes: Midi[]; accept: Pc[]; why: string; say?: string }[]; skill?: string }): ItemGen {
  return (rng) => {
    const ph = pick(rng, opts.phrases);
    return {
      prompt: 'Complete a frase: toque a última nota',
      detail: `${ph.say ? `${ph.say} ` : ''}Qualquer oitava. Mais de uma resposta serve.`,
      staff: { notes: ph.notes, clef: 'treble' },
      listen: { bpm: 84, steps: ph.notes.map((m) => ({ midis: [m], beats: 1 })) },
      hint: ph.why,
      steps: [{ kind: 'pc', pcs: ph.accept }],
      skill: opts.skill ?? 'completar-frase',
    };
  };
}

/** Só as notas-guia (3ª e 7ª) de cada tétrade, duas notas, conduzidas: ii7–V7–I7M com uma nota andando meio tom por vez. */
function guideSequence(opts: { sequences: { name?: string; symbols: string[] }[]; lead?: number; skill?: string }): ItemGen {
  return (rng) => {
    const seq = pick(rng, opts.sequences);
    const guides = seq.symbols.map((s) => {
      const c = parseChord(s);
      return [c.pcs[1], c.pcs[3] ?? c.pcs[2]];
    });
    const names = seq.symbols.map((s) => chordSpelling(s));
    return {
      prompt: 'Toque só as notas-guia (3ª e 7ª), conduzidas',
      symbol: seq.symbols.map(chordLabel).join(' – '),
      detail: `${seq.name ? `${seq.name} ` : ''}Duas notas por acorde. Em geral uma fica e a outra desce meio tom ou um tom; do dominante para um acorde menor, as duas descem.`,
      hint: seq.symbols.map((s, i) => `${chordLabel(s)}: ${ptName(`${names[i][1]}4`)} e ${ptName(`${names[i][names[i].length - 1]}4`)}`).join(' → '),
      steps: guides.map((pcs) => ({ kind: 'chord', pcs, lead: opts.lead ?? 1 }) as Accept),
      skill: opts.skill ?? 'notas-guia',
    };
  };
}

/** Eco transposto: o app toca um motivo em Dó; você toca o mesmo desenho a partir de outra nota (outro tom). */
export function echoTransposed(opts: { motifs: Midi[][]; shifts: number[]; bpm?: number; skill?: string }): ItemGen {
  return (rng) => {
    const motif = pick(rng, opts.motifs);
    const k = pick(rng, opts.shifts);
    const target = motif.map((m) => m + k);
    return {
      prompt: `Ouça e toque o mesmo desenho começando em ${nameOf(target[0])}`,
      detail: `O app toca a partir de ${nameOf(motif[0])}; você transpõe ${Math.abs(k)} semitons ${k > 0 ? 'acima' : 'abaixo'}.`,
      listen: { bpm: opts.bpm ?? 92, steps: motif.map((m, i) => ({ midis: [m], beats: i === motif.length - 1 ? 2 : 1 })) },
      hintKeys: target,
      hint: target.map((m) => nameOf(m)).join(', '),
      steps: target.map((m) => ({ kind: 'exact', midis: [m] }) as Accept),
      skill: opts.skill ?? 'transpor-ouvido',
    };
  };
}

/** Shell de mão esquerda: fundamental, 3ª e 7ª (sem a 5ª), com a fundamental no baixo. `form` 1-3-7 ou 1-7-3 é só a dica. */
export function shellChord(opts: { symbols: string[]; skill?: string }): ItemGen {
  return (rng) => {
    const symbol = pick(rng, opts.symbols);
    const c = parseChord(symbol);
    const sp = chordSpelling(symbol);
    const third = c.pcs[1];
    const seventh = c.pcs[3];
    return {
      prompt: 'Toque o shell (fundamental, 3ª e 7ª)',
      symbol: chordLabel(symbol),
      detail: 'Sem a 5ª. Fundamental embaixo; por cima, 3ª e 7ª em qualquer ordem (1-3-7 ou 1-7-3).',
      hint: `${ptName(`${sp[0]}4`)} embaixo, ${ptName(`${sp[1]}4`)} e ${ptName(`${sp[3]}4`)} em cima.`,
      steps: [{ kind: 'chord', pcs: [c.root, third, seventh], bass: c.root }],
      skill: opts.skill ?? 'shell',
    };
  };
}

export type StrangeKind = 'passagem' | 'bordadura' | 'apojatura' | 'retardo' | 'antecipação' | 'escapada';

/** Notas estranhas: a pauta mostra uma melodia sobre um acorde; você toca só as notas fora do acorde, ou diz o tipo. */
export function nonChordTones(opts: {
  examples: { chord: string; notes: Midi[]; strange: Midi[]; kind: StrangeKind; /** Acorde antes, com a nota da melodia (o retardo vem preso dele). */ prev?: { chord: string; note: Midi }; /** Acorde depois, com a nota da melodia (a antecipação chega nele antes da hora). */ next?: { chord: string; note: Midi } }[];
  ask: 'play' | 'name';
  skill?: string;
}): ItemGen {
  const kinds: StrangeKind[] = ['passagem', 'bordadura', 'apojatura', 'retardo', 'antecipação', 'escapada'];
  return (rng) => {
    const ex = pick(rng, opts.examples);
    const chordOf = (x: string) => voiced(x, 60).slice(0, 1).concat(voiced(x, 48).slice(1));
    const chord = chordOf(ex.chord);
    const listen: Listen = {
      bpm: 72,
      steps: [
        ...(ex.prev ? [{ midis: [...chordOf(ex.prev.chord), ex.prev.note], beats: 2 }] : []),
        ...ex.notes.map((m, i) => ({ midis: i === 0 ? [...chord, m] : [m], beats: 1 })),
        ...(ex.next ? [{ midis: [...chordOf(ex.next.chord), ex.next.note], beats: 2 }] : []),
      ],
    };
    const context = [
      ex.prev ? `Antes vem ${chordLabel(ex.prev.chord)}, com ${nameOf(ex.prev.note)} na melodia.` : '',
      ex.next ? `Depois vem ${chordLabel(ex.next.chord)}, com ${nameOf(ex.next.note)} na melodia.` : '',
    ].filter(Boolean).join(' ');
    const base = { staff: { notes: ex.notes, clef: 'treble' as const }, listen, symbol: chordLabel(ex.chord), skill: opts.skill ?? 'notas-estranhas' };
    if (opts.ask === 'play') {
      return {
        ...base,
        prompt: 'Toque só as notas estranhas ao acorde, em ordem',
        detail: `O acorde é ${chordLabel(ex.chord)} (${spelledHint(ex.chord) ?? ''}). Quais notas da melodia ficam fora dele?`,
        hintKeys: ex.strange,
        hint: `${ex.strange.map((m) => nameOf(m)).join(', ')}: ${ex.kind}.`,
        steps: ex.strange.map((m) => ({ kind: 'exact', midis: [m] }) as Accept),
      };
    }
    const options = shuffle(rng, kinds).slice(0, 3);
    if (!options.includes(ex.kind)) options[Math.floor(rng() * 3)] = ex.kind;
    return {
      ...base,
      prompt: 'Que tipo de nota estranha aparece aqui?',
      detail: `Acorde ${chordLabel(ex.chord)}.${context ? ` ${context}` : ''}`,
      choices: options,
      answer: options.indexOf(ex.kind),
      hint: `${ex.strange.map((m) => nameOf(m)).join(', ')}: ${ex.kind}.`,
      steps: [],
    };
  };
}

// ---------- harmonia cromática (Unidade 10) ----------

/** Acordes de fora do campo, pelo papel na tonalidade maior: dominantes secundárias, subV, empréstimo do homônimo menor e diminutos. */
export type ChromRoman =
  | 'V7/ii' | 'V7/iii' | 'V7/IV' | 'V7/V' | 'V7/vi'
  | 'subV7' | 'subV7/V' | 'subV7/ii'
  | 'iv' | 'ivm7' | 'bIII' | 'bVI' | 'bVII' | 'bVI7M' | 'bVII7'
  | 'i' | 'im7' | 'iiø' | 'V7(b9)'
  | 'vii°7' | '#i°7' | '#ii°7' | '#iv°7';

/** Distância da tônica, qualidade e grafia da fundamental ('key' = a da tonalidade; empréstimo e subV em bemol; diminuto de passagem em sustenido). */
const CHROM: Record<ChromRoman, [number, string, 'key' | 'flat' | 'sharp']> = {
  'V7/ii': [9, '7', 'key'], 'V7/iii': [11, '7', 'key'], 'V7/IV': [0, '7', 'key'], 'V7/V': [2, '7', 'key'], 'V7/vi': [4, '7', 'key'],
  subV7: [1, '7', 'flat'], 'subV7/V': [8, '7', 'flat'], 'subV7/ii': [3, '7', 'flat'],
  iv: [5, 'm', 'key'], ivm7: [5, 'm7', 'key'], bIII: [3, '', 'flat'], bVI: [8, '', 'flat'], bVII: [10, '', 'flat'], bVI7M: [8, '7M', 'flat'], bVII7: [10, '7', 'flat'],
  i: [0, 'm', 'key'], im7: [0, 'm7', 'key'], 'iiø': [2, 'm7(b5)', 'key'], 'V7(b9)': [7, '7(b9)', 'key'],
  'vii°7': [11, '°7', 'key'], '#i°7': [1, '°7', 'sharp'], '#ii°7': [3, '°7', 'sharp'], '#iv°7': [6, '°7', 'sharp'],
};

/** "bVI" → "♭VI"; "#iv°7" → "♯iv°7". */
export const romanLabel = (r: string) => r.replace(/^b/, '♭').replace(/^#/, '♯').replace('(b9)', '(♭9)');

/** Cifra de um grau, do campo ou cromático: ("C", "V7/ii") → "A7"; ("C", "subV7") → "Db7"; ("G", "bVI") → "Eb"; ("F", "#i°7") → "F#°7". */
export function chromaticSymbol(key: string, roman: Roman | ChromRoman): string {
  if (roman in DIATONIC) return diatonicSymbol(key, roman as Roman);
  const k = rootPc(key);
  const [off, q, how] = CHROM[roman as ChromRoman];
  const names = how === 'flat' ? FLAT_NAMES : how === 'sharp' ? SHARP_NAMES : FLAT_KEYS.has(k) ? FLAT_NAMES : SHARP_NAMES;
  return names[(k + off) % 12] + q;
}

/** Graus pensados no tom menor (o ii–V–i): o prompt diz "Lá menor". */
const MINOR_ROMANS = new Set<string>(['i', 'im7', 'iiø', 'V7(b9)']);

function chromaticDetail(key: string, roman: Roman | ChromRoman): string {
  if (roman in DIATONIC) return 'Qualquer posição.';
  if (roman.startsWith('V7/')) {
    const target = roman.split('/')[1] as Roman;
    return `O V7 de ${target} (${chordLabel(diatonicSymbol(key, target))}): fundamental uma 5ª justa acima da do alvo, acorde maior com 7ª menor.`;
  }
  if (roman.startsWith('subV7')) {
    const target = (roman.split('/')[1] ?? 'I') as Roman;
    return `O dominante substituto do ${target} (${chordLabel(diatonicSymbol(key, target))}): fundamental meio tom acima da do alvo, acorde com 7ª.`;
  }
  if (roman.includes('°7')) return 'Diminuto com 7ª: três terças menores empilhadas.';
  if (roman === 'V7(b9)') return `O V7 de ${keyName(key)} menor com a 9ª menor (o 6º grau da escala menor). A 5ª pode ficar de fora.`;
  if (MINOR_ROMANS.has(roman)) return `Grau do tom de ${keyName(key)} menor.`;
  return `Emprestado de ${keyName(key)} menor (o homônimo).`;
}

/** "Em Fá maior, toque o V7/vi": acordes cromáticos (ou do campo) pelo papel na tonalidade. */
export function chromaticChord(opts: { keys: string[]; romans: (Roman | ChromRoman)[]; low: Midi; high: Midi; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const roman = pick(rng, opts.romans);
    const symbol = chromaticSymbol(key, roman);
    const minor = MINOR_ROMANS.has(roman);
    return {
      prompt: `Em ${keyName(key)} ${minor ? 'menor' : 'maior'}, toque o ${romanLabel(roman)}`,
      detail: chromaticDetail(key, roman),
      hintKeys: voiced(symbol, Math.round((opts.low + opts.high) / 2)).slice(1),
      hint: `${chordLabel(symbol)}: ${spelledHint(symbol) ?? parseChord(symbol).pcs.map((p) => PC_NAMES[p]).join(', ')}`,
      steps: [chordAccept(symbol)],
      skill: opts.skill ?? 'acorde-cromatico',
    };
  };
}

/** Ditado com acordes cromáticos: o app toca a progressão; você toca o baixo de cada acorde ou os acordes, em ordem. */
export function chromaticByEar(opts: { keys: string[]; progressions: (Roman | ChromRoman)[][]; answer: 'bass' | 'chords'; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const prog = pick(rng, opts.progressions);
    const symbols = prog.map((d) => chromaticSymbol(key, d));
    return {
      prompt: opts.answer === 'bass' ? 'Ouça e toque o baixo de cada acorde, em ordem' : 'Ouça e toque os acordes, em ordem',
      detail: `Tom de ${keyName(key)} maior, ${prog.length} acordes. O primeiro é o ${romanLabel(prog[0])} (${chordLabel(symbols[0])}).`,
      listen: { bpm: 72, steps: ledVoicings(symbols).map((v, i) => ({ midis: v, beats: i === symbols.length - 1 ? 3 : 2 })) },
      hint: `${prog.map(romanLabel).join(' – ')}: ${symbols.map(chordLabel).join(' – ')}`,
      steps: opts.answer === 'bass' ? symbols.map((x) => ({ kind: 'pc', pcs: [parseChord(x).bass ?? parseChord(x).root] }) as Accept) : symbols.map((x) => chordAccept(x)),
      skill: opts.skill ?? (opts.answer === 'bass' ? 'ditado-baixo-cromatico' : 'ditado-cromatico'),
    };
  };
}

/** O app toca uma de duas (ou três) progressões parecidas; você diz qual foi (V7 ou subV7, IV ou iv, maior ou menor). */
export function progressionChoice(opts: { keys: string[]; options: { label: string; romans: (Roman | ChromRoman)[] }[]; ask: string; skill?: string }): ItemGen {
  return (rng) => {
    const key = pick(rng, opts.keys);
    const which = Math.floor(rng() * opts.options.length);
    const opt = opts.options[which];
    const symbols = opt.romans.map((r) => chromaticSymbol(key, r));
    const order = shuffle(rng, opts.options.map((_, i) => i));
    return {
      prompt: opts.ask,
      detail: `Tom de ${keyName(key)}.`,
      listen: { bpm: 72, steps: ledVoicings(symbols).map((v, i) => ({ midis: v, beats: i === symbols.length - 1 ? 3 : 2 })) },
      choices: order.map((i) => opts.options[i].label),
      answer: order.indexOf(which),
      hint: `Foi ${opt.label}: ${symbols.map(chordLabel).join(' – ')}.`,
      steps: [],
      skill: opts.skill ?? 'progressao-ouvido',
    };
  };
}

/** Harmonize com acordes cromáticos: a pauta mostra um compasso com nota alterada; qualquer acorde de `accept` serve. */
export function harmonizeChromatic(opts: { key: string; fifths?: number; bars: { notes: Midi[]; accept: (Roman | ChromRoman)[]; say?: string }[]; skill?: string }): ItemGen {
  return (rng) => {
    const bar = pick(rng, opts.bars);
    const symbols = bar.accept.map((r) => chromaticSymbol(opts.key, r));
    return {
      prompt: 'Que acorde cabe embaixo deste compasso? Toque-o',
      detail: `Tom de ${keyName(opts.key)} maior. ${bar.say ?? 'A nota alterada é a pista: procure o acorde que a contém.'}`,
      staff: { notes: bar.notes, clef: 'treble', fifths: opts.fifths },
      listen: { bpm: 80, steps: bar.notes.map((m) => ({ midis: [m], beats: 1 })) },
      hint: `Serve: ${bar.accept.map((r, i) => `${romanLabel(r)} (${chordLabel(symbols[i])})`).join(', ')}.`,
      steps: [{ kind: 'anyChord', options: symbols.map((x) => ({ pcs: parseChord(x).pcs })) }],
      skill: opts.skill ?? 'harmonizar-cromatico',
    };
  };
}
