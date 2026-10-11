// Consulta: tudo o que o curso ensina, para olhar a qualquer hora. Acordes, escalas, campo harmônico,
// intervalos, ritmo, círculo de quintas e termos. Puro e testado (reference.test.ts); a tela é ReferencePage.

import type { Midi } from '../music/notes';
import { spellInterval, spellScale } from '../course/gens';
import { n, pcOf, ptName } from '../course/music';

// ---------- fundamentais ----------

/** As 12 fundamentais com a grafia mais usada (bemol nas tonalidades de bemóis). */
export const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export type Root = (typeof ROOTS)[number];

/** "F#" → "Fá♯", "Bb" → "Si♭". */
export const rootPt = (r: string) => ptName(`${r}4`);
/** Cifra com símbolos: "Bb7M" → "B♭7M". */
export const pretty = (s: string) => s.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭').replace(/\(b5\)/, '(♭5)');

const rootMidi = (r: string) => n(`${r}4`) < 60 ? n(`${r}4`) + 12 : n(`${r}4`);

// ---------- acordes ----------

export interface ChordType {
  /** Sufixo da cifra brasileira: "", "m", "7", "7M", "m7(b5)"… */
  suffix: string;
  name: string;
  /** Intervalos a partir da fundamental (notação do curso: "3M", "5J", "7m"…). */
  ivs: string[];
  /** Para que serve, em uma frase. */
  use: string;
}

export const CHORD_TYPES: ChordType[] = [
  { suffix: '', name: 'Maior', ivs: ['3M', '5J'], use: 'O acorde estável e "alegre". Fórmula: 4 + 3 semitons.' },
  { suffix: 'm', name: 'Menor', ivs: ['3m', '5J'], use: 'Estável e mais escuro. Só a 3ª muda: 3 + 4 semitons.' },
  { suffix: 'dim', name: 'Diminuto', ivs: ['3m', '5d'], use: 'Tenso, pede resolução. É o vii° do campo maior.' },
  { suffix: 'aug', name: 'Aumentado', ivs: ['3M', '5A'], use: 'Suspenso e misterioso: duas terças maiores.' },
  { suffix: 'sus2', name: 'Suspenso com 2ª', ivs: ['2M', '5J'], use: 'Sem a 3ª: aberto, "som de cinema". Costuma resolver no maior.' },
  { suffix: 'sus4', name: 'Suspenso com 4ª', ivs: ['4J', '5J'], use: 'A 4ª pede para descer para a 3ª.' },
  { suffix: 'add9', name: 'Maior com 9ª', ivs: ['3M', '5J', '9M'], use: 'Maior com cor, sem perder a 3ª.' },
  { suffix: '6', name: 'Maior com 6ª', ivs: ['3M', '5J', '6M'], use: 'Maior suave, muito usado na bossa e no jazz.' },
  { suffix: 'm6', name: 'Menor com 6ª', ivs: ['3m', '5J', '6M'], use: 'Menor com cor de tango e bossa.' },
  { suffix: '7', name: 'Dominante (com 7ª)', ivs: ['3M', '5J', '7m'], use: 'O V7: tem o trítono (3ª e 7ª) e puxa para a tônica.' },
  { suffix: '7M', name: 'Maior com 7ª maior', ivs: ['3M', '5J', '7M'], use: 'Tônica sofisticada (I7M e IV7M).' },
  { suffix: 'm7', name: 'Menor com 7ª', ivs: ['3m', '5J', '7m'], use: 'ii7, iii7 e vi7 do campo maior.' },
  { suffix: 'm7(b5)', name: 'Meio-diminuto', ivs: ['3m', '5d', '7m'], use: 'O viiø do campo maior e o iiø do menor. Também escrito ø.' },
  { suffix: '°7', name: 'Diminuto com 7ª', ivs: ['3m', '5d', '7d'], use: 'Simétrico (terças menores empilhadas): passagem e função de dominante.' },
];

const DEGREE_LABEL: Record<string, string> = {
  '2M': '2', '3m': '♭3', '3M': '3', '4J': '4', '5d': '♭5', '5J': '5', '5A': '♯5', '6M': '6', '7d': '𝄫7', '7m': '♭7', '7M': '7', '9M': '9',
};

const SEMIS: Record<string, number> = { '2M': 2, '3m': 3, '3M': 4, '4J': 5, '5d': 6, '5J': 7, '5A': 8, '6M': 9, '7d': 9, '7m': 10, '7M': 11, '9M': 14 };

export interface ChordInfo {
  symbol: string;
  name: string;
  /** Notas soletradas em ordem de baixo para cima. */
  spelled: string[];
  /** Teclas para mostrar e tocar (posição fechada, a partir da oitava 4). */
  midis: Midi[];
  /** Rótulo de cada nota (1, 3, 5, ♭7…), na mesma ordem. */
  degrees: string[];
  /** Fórmula em semitons entre notas vizinhas. */
  steps: number[];
  inversion: number;
  type: ChordType;
}

/** Acorde de uma fundamental e um tipo, na inversão pedida (0 = fundamental no baixo). */
export function chordInfo(root: string, suffix: string, inversion = 0): ChordInfo {
  const type = CHORD_TYPES.find((t) => t.suffix === suffix) ?? CHORD_TYPES[0];
  const r = `${root}4`;
  const spelledAll = [root, ...type.ivs.map((iv) => spellInterval(r, iv === '9M' ? '2M' : iv).replace(/-?\d+$/, ''))];
  const base = rootMidi(root);
  const midisAll = [base, ...type.ivs.map((iv) => base + SEMIS[iv])];
  const degreesAll = ['1', ...type.ivs.map((iv) => DEGREE_LABEL[iv])];
  const inv = Math.max(0, Math.min(inversion, midisAll.length - 1));
  // Inversão: as notas de baixo sobem uma oitava (a 9ª fica em cima).
  const order = [...Array(midisAll.length).keys()].sort((a, b) => midisAll[a] - midisAll[b]);
  const rotated = [...order.slice(inv), ...order.slice(0, inv)];
  const midis: Midi[] = [];
  for (const i of rotated) {
    let m = midisAll[i];
    while (midis.length && m <= midis[midis.length - 1]) m += 12;
    midis.push(m);
  }
  // Mantém o acorde perto do meio do teclado.
  while (midis[0] > 67) for (let i = 0; i < midis.length; i++) midis[i] -= 12;
  const spelled = rotated.map((i) => spelledAll[i]);
  const bass = spelled[0];
  const symbol = `${root}${suffix}${inv > 0 ? `/${bass}` : ''}`;
  return {
    symbol,
    name: `${rootPt(root)} ${type.name.toLowerCase()}${inv > 0 ? `, ${inv}ª inversão (baixo em ${ptName(`${bass}4`)})` : ''}`,
    spelled,
    midis,
    degrees: rotated.map((i) => degreesAll[i]),
    steps: midis.slice(1).map((m, i) => m - midis[i]),
    inversion: inv,
    type,
  };
}

/** Lê uma cifra digitada: "F#m7", "Bb7M", "C/E", "Dm7(b5)", "Gø", "A°7". */
export function parseSymbol(text: string): { root: string; suffix: string; inversion: number } | null {
  const t = text.trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/maj7/i, '7M').replace(/ø/, 'm7(b5)').replace(/^([a-g])/, (c) => c.toUpperCase());
  const m = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(t);
  if (!m) return null;
  const root = m[1];
  const suffix = m[2] === 'dim7' ? '°7' : m[2] === '°' ? 'dim' : m[2] === '+' ? 'aug' : m[2];
  if (!CHORD_TYPES.some((c) => c.suffix === suffix)) return null;
  let inversion = 0;
  if (m[3]) {
    const bassPc = pcOf(n(`${m[3]}4`));
    const info = chordInfo(root, suffix);
    const idx = [...info.midis].sort((a, b) => a - b).findIndex((x) => pcOf(x) === bassPc);
    if (idx < 0) return null;
    inversion = idx;
  }
  return { root, suffix, inversion };
}

/** Reconhece o acorde tocado (pelas classes de altura e pelo baixo). Null se não for nenhum dos tipos. */
export function identifyChord(midis: Midi[]): ChordInfo | null {
  if (midis.length < 3) return null;
  const pcs = new Set(midis.map(pcOf));
  const bassPc = pcOf(Math.min(...midis));
  // Tipos de 3 notas antes dos de 4, para "C E G" não virar outra coisa.
  const types = [...CHORD_TYPES].sort((a, b) => a.ivs.length - b.ivs.length);
  for (const t of types) {
    for (const r of ROOTS) {
      const rp = pcOf(n(`${r}4`));
      const want = new Set([rp, ...t.ivs.map((iv) => (rp + SEMIS[iv]) % 12)]);
      if (want.size !== pcs.size || ![...want].every((p) => pcs.has(p))) continue;
      const info = chordInfo(r, t.suffix);
      const inv = [...info.midis].sort((a, b) => a - b).findIndex((x) => pcOf(x) === bassPc);
      return chordInfo(r, t.suffix, Math.max(0, inv));
    }
  }
  return null;
}

// ---------- escalas ----------

export interface ScaleType {
  id: string;
  name: string;
  steps: number[];
  use: string;
}

export const SCALE_TYPES: ScaleType[] = [
  { id: 'maior', name: 'Maior', steps: [0, 2, 4, 5, 7, 9, 11], use: 'Tom, tom, semitom, tom, tom, tom, semitom. A base de quase tudo.' },
  { id: 'menor', name: 'Menor natural', steps: [0, 2, 3, 5, 7, 8, 10], use: 'A relativa menor: mesmas notas da maior, começando no 6º grau.' },
  { id: 'harmonica', name: 'Menor harmônica', steps: [0, 2, 3, 5, 7, 8, 11], use: 'A menor com a sensível (7º grau elevado): dá o V maior.' },
  { id: 'melodica', name: 'Menor melódica', steps: [0, 2, 3, 5, 7, 9, 11], use: 'Sobe com 6º e 7º elevados. Na forma clássica desce natural.' },
  { id: 'pentaMaior', name: 'Pentatônica maior', steps: [0, 2, 4, 7, 9], use: 'Cinco notas, sem semitons: improviso seguro.' },
  { id: 'pentaMenor', name: 'Pentatônica menor', steps: [0, 3, 5, 7, 10], use: 'A base do blues e do rock.' },
  { id: 'blues', name: 'Blues', steps: [0, 3, 5, 6, 7, 10], use: 'Pentatônica menor com a "blue note" (♭5).' },
  { id: 'dorico', name: 'Dórico', steps: [0, 2, 3, 5, 7, 9, 10], use: 'Menor com a 6ª maior: jazz, funk, "So What".' },
  { id: 'frigio', name: 'Frígio', steps: [0, 1, 3, 5, 7, 8, 10], use: 'Menor com a 2ª menor: som espanhol.' },
  { id: 'lidio', name: 'Lídio', steps: [0, 2, 4, 6, 7, 9, 11], use: 'Maior com a 4ª aumentada: brilho de trilha de cinema.' },
  { id: 'mixolidio', name: 'Mixolídio', steps: [0, 2, 4, 5, 7, 9, 10], use: 'Maior com a 7ª menor: baião, rock, blues.' },
  { id: 'locrio', name: 'Lócrio', steps: [0, 1, 3, 5, 6, 8, 10], use: 'Sobre o meio-diminuto. Raro como tonalidade.' },
  { id: 'cromatica', name: 'Cromática', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], use: 'Todas as 12 teclas: sobe com sustenidos, desce com bemóis.' },
];

/** Dedilhado da escala maior, uma oitava subindo (8 notas): mão direita e mão esquerda. */
export const MAJOR_FINGERING: Record<Root, { right: string; left: string }> = {
  C: { right: '1 2 3 1 2 3 4 5', left: '5 4 3 2 1 3 2 1' },
  G: { right: '1 2 3 1 2 3 4 5', left: '5 4 3 2 1 3 2 1' },
  D: { right: '1 2 3 1 2 3 4 5', left: '5 4 3 2 1 3 2 1' },
  A: { right: '1 2 3 1 2 3 4 5', left: '5 4 3 2 1 3 2 1' },
  E: { right: '1 2 3 1 2 3 4 5', left: '5 4 3 2 1 3 2 1' },
  B: { right: '1 2 3 1 2 3 4 5', left: '4 3 2 1 4 3 2 1' },
  'F#': { right: '2 3 4 1 2 3 1 2', left: '4 3 2 1 3 2 1 4' },
  Db: { right: '2 3 1 2 3 4 1 2', left: '3 2 1 4 3 2 1 3' },
  Ab: { right: '3 4 1 2 3 1 2 3', left: '3 2 1 4 3 2 1 3' },
  Eb: { right: '3 1 2 3 4 1 2 3', left: '3 2 1 4 3 2 1 3' },
  Bb: { right: '2 1 2 3 1 2 3 4', left: '3 2 1 4 3 2 1 3' },
  F: { right: '1 2 3 4 1 2 3 4', left: '5 4 3 2 1 3 2 1' },
};

export interface ScaleInfo {
  name: string;
  spelled: string[];
  midis: Midi[];
  /** Distância entre notas vizinhas: "T", "S", "T+S" (1 tom e meio)… */
  pattern: string[];
  type: ScaleType;
}

const STEP_LABEL: Record<number, string> = { 1: 'S', 2: 'T', 3: 'T+S', 4: '2T' };

export function scaleInfo(root: string, id: string): ScaleInfo {
  const type = SCALE_TYPES.find((s) => s.id === id) ?? SCALE_TYPES[0];
  const base = rootMidi(root);
  const midis = [...type.steps.map((s) => base + s), base + 12];
  const spelled = type.id === 'cromatica'
    ? midis.map((m) => ptName(nameFor(m)))
    : spellScale(`${root}4`, [...type.steps, 12]).map((x) => ptName(x));
  return {
    name: `${rootPt(root)} ${type.name.toLowerCase()}`,
    spelled,
    midis,
    pattern: midis.slice(1).map((m, i) => STEP_LABEL[m - midis[i]] ?? `${m - midis[i]}`),
    type,
  };
}

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nameFor = (m: Midi) => `${SHARP[pcOf(m)]}4`;

// ---------- armaduras e círculo de quintas ----------

/** Círculo de quintas no sentido horário: maior, relativa menor e armadura (sustenidos +, bemóis −). */
export const CIRCLE: { major: Root; minor: string; fifths: number }[] = [
  { major: 'C', minor: 'A', fifths: 0 },
  { major: 'G', minor: 'E', fifths: 1 },
  { major: 'D', minor: 'B', fifths: 2 },
  { major: 'A', minor: 'F#', fifths: 3 },
  { major: 'E', minor: 'C#', fifths: 4 },
  { major: 'B', minor: 'G#', fifths: 5 },
  { major: 'F#', minor: 'D#', fifths: 6 },
  { major: 'Db', minor: 'Bb', fifths: -5 },
  { major: 'Ab', minor: 'F', fifths: -4 },
  { major: 'Eb', minor: 'C', fifths: -3 },
  { major: 'Bb', minor: 'G', fifths: -2 },
  { major: 'F', minor: 'D', fifths: -1 },
];

const SHARPS_ORDER = ['Fá', 'Dó', 'Sol', 'Ré', 'Lá', 'Mi', 'Si'];

/** "2 sustenidos: Fá♯ e Dó♯". */
export function signatureText(fifths: number): string {
  if (fifths === 0) return 'Sem sustenidos nem bemóis';
  const k = Math.abs(fifths);
  const list = (fifths > 0 ? SHARPS_ORDER : [...SHARPS_ORDER].reverse()).slice(0, k).map((x) => x + (fifths > 0 ? '♯' : '♭'));
  const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}` : list[0];
  return `${k} ${fifths > 0 ? (k > 1 ? 'sustenidos' : 'sustenido') : k > 1 ? 'bemóis' : 'bemol'}: ${joined}`;
}

// ---------- campo harmônico ----------

export interface FieldChord {
  roman: string;
  symbol: string;
  /** Fundamental com a grafia da tonalidade ("G#" em Mi maior). */
  root: string;
  suffix: string;
  fn: 'Tônica' | 'Subdominante' | 'Dominante';
}

const MAJOR_FIELD: [string, number, string, string, FieldChord['fn']][] = [
  ['I', 0, '', '7M', 'Tônica'],
  ['ii', 2, 'm', 'm7', 'Subdominante'],
  ['iii', 4, 'm', 'm7', 'Tônica'],
  ['IV', 5, '', '7M', 'Subdominante'],
  ['V', 7, '', '7', 'Dominante'],
  ['vi', 9, 'm', 'm7', 'Tônica'],
  ['vii°', 11, 'dim', 'm7(b5)', 'Dominante'],
];

// Menor: campo natural com o V e o vii° da harmônica (o que se usa na prática).
const MINOR_FIELD: [string, number, string, string, FieldChord['fn']][] = [
  ['i', 0, 'm', 'm7', 'Tônica'],
  ['ii°', 2, 'dim', 'm7(b5)', 'Subdominante'],
  ['III', 3, '', '7M', 'Tônica'],
  ['iv', 5, 'm', 'm7', 'Subdominante'],
  ['V', 7, '', '7', 'Dominante'],
  ['VI', 8, '', '7M', 'Subdominante'],
  ['vii°', 11, 'dim', '°7', 'Dominante'],
];

/** Os 7 acordes do campo (tríades ou tétrades), com a grafia da tonalidade. */
export function harmonicField(root: string, mode: 'maior' | 'menor', sevenths: boolean): FieldChord[] {
  const table = mode === 'maior' ? MAJOR_FIELD : MINOR_FIELD;
  const steps = table.map((t) => t[1]);
  const letters = spellScale(`${root}4`, steps).map((x) => x.replace(/-?\d+$/, ''));
  return table.map(([roman, , tri, sev, fn], i) => {
    const spelledRoot = letters[i];
    const suffix = sevenths ? sev : tri;
    const romanOut = sevenths ? roman.replace('°', '') + (sev === '7M' ? '7M' : sev === '7' ? '7' : sev === 'm7' ? '7' : sev === 'm7(b5)' ? 'ø' : '°7') : roman;
    return { roman: romanOut, symbol: `${spelledRoot}${suffix}`, root: spelledRoot, suffix, fn };
  });
}

/** Progressões que valem decorar, em graus. */
export const PROGRESSIONS: { name: string; degrees: number[]; mode: 'maior' | 'menor'; where: string }[] = [
  { name: 'I – V – vi – IV', degrees: [0, 4, 5, 3], mode: 'maior', where: 'A mais comum do pop.' },
  { name: 'I – vi – IV – V', degrees: [0, 5, 3, 4], mode: 'maior', where: 'Anos 50, baladas.' },
  { name: 'ii – V – I', degrees: [1, 4, 0], mode: 'maior', where: 'O coração do jazz e da bossa.' },
  { name: 'IV – V – iii – vi (Royal Road)', degrees: [3, 4, 2, 5], mode: 'maior', where: 'Trilhas de anime e J-pop.' },
  { name: 'I – IV – V – I', degrees: [0, 3, 4, 0], mode: 'maior', where: 'Cadência básica, música folclórica.' },
  { name: 'i – iv – V – i', degrees: [0, 3, 4, 0], mode: 'menor', where: 'Cadência menor clássica.' },
  { name: 'i – VI – III – VII', degrees: [0, 5, 2, 6], mode: 'menor', where: 'Pop e rock em menor.' },
];

// ---------- intervalos ----------

export const INTERVALS: { semis: number; code: string; name: string; feel: string }[] = [
  { semis: 1, code: '2m', name: '2ª menor (semitom)', feel: 'Tensão máxima entre vizinhas. Tema de "Tubarão".' },
  { semis: 2, code: '2M', name: '2ª maior (tom)', feel: 'O passo de uma escala.' },
  { semis: 3, code: '3m', name: '3ª menor', feel: 'A cor do acorde menor.' },
  { semis: 4, code: '3M', name: '3ª maior', feel: 'A cor do acorde maior.' },
  { semis: 5, code: '4J', name: '4ª justa', feel: 'Aberta, de abertura de hino.' },
  { semis: 6, code: '4A', name: '4ª aumentada ou 5ª diminuta (trítono)', feel: 'Instável: está dentro de todo acorde dominante.' },
  { semis: 7, code: '5J', name: '5ª justa', feel: 'Estável e vazia, a base do "power chord".' },
  { semis: 8, code: '6m', name: '6ª menor', feel: 'Doce e melancólica.' },
  { semis: 9, code: '6M', name: '6ª maior', feel: 'Brilhante.' },
  { semis: 10, code: '7m', name: '7ª menor', feel: 'A 7ª do acorde dominante e do m7.' },
  { semis: 11, code: '7M', name: '7ª maior', feel: 'Quase a oitava: a 7ª do acorde 7M.' },
  { semis: 12, code: '8J', name: 'Oitava', feel: 'A mesma nota, mais aguda.' },
];

/** Nome do intervalo entre duas teclas (pela distância em semitons, até 2 oitavas). */
export function intervalName(a: Midi, b: Midi): string {
  const d = Math.abs(b - a);
  if (d === 0) return 'Uníssono';
  const base = INTERVALS.find((i) => i.semis === ((d - 1) % 12) + 1)!;
  return d > 12 ? `${base.name} + oitava` : base.name;
}

// ---------- ritmo ----------

export const FIGURES: { name: string; beats: number; rest: string }[] = [
  { name: 'Semibreve', beats: 4, rest: 'pendurada na 4ª linha' },
  { name: 'Mínima', beats: 2, rest: 'sentada na 3ª linha' },
  { name: 'Semínima', beats: 1, rest: 'parece um raio' },
  { name: 'Colcheia', beats: 0.5, rest: 'parece um 7 com bolinha' },
  { name: 'Semicolcheia', beats: 0.25, rest: 'um 7 com duas bolinhas' },
];

export const METERS: { sig: string; text: string }[] = [
  { sig: '2/4', text: '2 tempos de semínima. Marcha, samba, baião (forte–fraco).' },
  { sig: '3/4', text: '3 tempos de semínima. Valsa (forte–fraco–fraco).' },
  { sig: '4/4', text: '4 tempos de semínima. O mais comum: forte–fraco–meio-forte–fraco.' },
  { sig: '6/8', text: 'Composto: 2 tempos de semínima pontuada, cada um dividido em 3 colcheias. Conte em 2, não em 6.' },
];

// ---------- termos ----------

export interface Term {
  term: string;
  meaning: string;
  group: 'Dinâmica' | 'Articulação' | 'Andamento' | 'Forma e repetição' | 'Pedal e outros';
}

export const TERMS: Term[] = [
  { term: 'pp (pianissimo)', meaning: 'Muito leve.', group: 'Dinâmica' },
  { term: 'p (piano)', meaning: 'Leve.', group: 'Dinâmica' },
  { term: 'mp (mezzo piano)', meaning: 'Meio leve.', group: 'Dinâmica' },
  { term: 'mf (mezzo forte)', meaning: 'Meio forte, médio.', group: 'Dinâmica' },
  { term: 'f (forte)', meaning: 'Forte.', group: 'Dinâmica' },
  { term: 'ff (fortissimo)', meaning: 'Muito forte.', group: 'Dinâmica' },
  { term: 'Crescendo (cresc., <)', meaning: 'Aumentando o volume aos poucos.', group: 'Dinâmica' },
  { term: 'Diminuendo (dim., decresc., >)', meaning: 'Diminuindo o volume aos poucos.', group: 'Dinâmica' },
  { term: 'sfz (sforzando)', meaning: 'Acento forte e súbito numa nota.', group: 'Dinâmica' },
  { term: 'Legato', meaning: 'Ligado: a nota solta quando a próxima desce, sem silêncio entre elas. Na partitura, uma curva sobre as notas.', group: 'Articulação' },
  { term: 'Staccato', meaning: 'Destacado: nota curta, metade do valor ou menos. Ponto sobre ou sob a nota.', group: 'Articulação' },
  { term: 'Tenuto', meaning: 'Traço sobre a nota: segure o valor inteiro, com um leve peso.', group: 'Articulação' },
  { term: 'Acento (>)', meaning: 'Essa nota mais forte que as vizinhas.', group: 'Articulação' },
  { term: 'Ligadura de prolongamento', meaning: 'Curva entre duas notas iguais: toque a primeira e segure pela soma dos valores, sem tocar de novo.', group: 'Articulação' },
  { term: 'Fermata', meaning: 'O símbolo de olho sobre a nota: segure além do valor, à vontade. Também é o nome deste app.', group: 'Articulação' },
  { term: 'Largo', meaning: 'Muito lento, cerca de 40 a 60 BPM.', group: 'Andamento' },
  { term: 'Adagio', meaning: 'Lento, cerca de 66 a 76 BPM.', group: 'Andamento' },
  { term: 'Andante', meaning: 'Andando, cerca de 76 a 108 BPM.', group: 'Andamento' },
  { term: 'Moderato', meaning: 'Moderado, cerca de 108 a 120 BPM.', group: 'Andamento' },
  { term: 'Allegro', meaning: 'Rápido e alegre, cerca de 120 a 156 BPM.', group: 'Andamento' },
  { term: 'Presto', meaning: 'Muito rápido, acima de 168 BPM.', group: 'Andamento' },
  { term: 'Ritardando (rit.) / Rallentando (rall.)', meaning: 'Diminuindo o andamento aos poucos.', group: 'Andamento' },
  { term: 'Accelerando (accel.)', meaning: 'Acelerando aos poucos.', group: 'Andamento' },
  { term: 'A tempo', meaning: 'Volte ao andamento de antes.', group: 'Andamento' },
  { term: 'Rubato', meaning: 'Tempo flexível: estica aqui, recupera ali, para expressar.', group: 'Andamento' },
  { term: 'Ritornelo (barra com dois pontos)', meaning: 'Repita o trecho entre as barras.', group: 'Forma e repetição' },
  { term: 'Casa 1 e casa 2', meaning: 'Na primeira vez toque a casa 1; ao repetir, pule para a casa 2.', group: 'Forma e repetição' },
  { term: 'D.C. (Da Capo)', meaning: 'Volte ao começo.', group: 'Forma e repetição' },
  { term: 'D.S. (Dal Segno)', meaning: 'Volte ao sinal 𝄋.', group: 'Forma e repetição' },
  { term: 'Fine', meaning: 'Fim (depois de um D.C. ou D.S.).', group: 'Forma e repetição' },
  { term: 'Coda (𝄌)', meaning: 'Trecho final: pule para lá quando indicado.', group: 'Forma e repetição' },
  { term: 'Anacruse', meaning: 'Notas antes do primeiro tempo forte (a música começa "no meio" do compasso).', group: 'Forma e repetição' },
  { term: 'Ped. e *', meaning: 'Desça o pedal de sustentação em "Ped." e solte em "*" (ou na linha com quebra).', group: 'Pedal e outros' },
  { term: 'Pedal legato (sincopado)', meaning: 'Troque o pedal logo depois de tocar o acorde novo: o som fica ligado sem misturar harmonias.', group: 'Pedal e outros' },
  { term: 'Una corda', meaning: 'Pedal da esquerda: som mais suave e abafado.', group: 'Pedal e outros' },
  { term: '8va', meaning: 'Toque uma oitava acima do escrito (8vb: abaixo).', group: 'Pedal e outros' },
  { term: 'Cifra', meaning: 'Letras para os acordes: C = Dó, D = Ré, E = Mi, F = Fá, G = Sol, A = Lá, B = Si; "m" é menor, "7" é sétima, "/" indica o baixo.', group: 'Pedal e outros' },
];

// ---------- notas e claves ----------

export const CLEF_TIPS = {
  treble: {
    title: 'Clave de sol (mão direita)',
    lines: 'Linhas, de baixo para cima: Mi, Sol, Si, Ré, Fá.',
    spaces: 'Espaços: Fá, Lá, Dó, Mi.',
    anchor: 'A clave enrola na 2ª linha: ali é o Sol4. O Dó central fica numa linha suplementar abaixo da pauta.',
  },
  bass: {
    title: 'Clave de fá (mão esquerda)',
    lines: 'Linhas, de baixo para cima: Sol, Si, Ré, Fá, Lá.',
    spaces: 'Espaços: Lá, Dó, Mi, Sol.',
    anchor: 'Os dois pontos da clave abraçam a 4ª linha: ali é o Fá3. O Dó central fica numa linha suplementar acima da pauta.',
  },
} as const;
