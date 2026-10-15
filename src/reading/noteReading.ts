// Leitura de notas na pauta: onde cada nota fica (linha, espaço, suplementar), as notas de referência para achar
// as outras contando, os níveis (linhas, espaços, suplementares, duas claves) e o sorteio que insiste nas notas fracas.
// Tudo puro e testado (noteReading.test.ts). A tela só desenha.

import { noteInfo, staffStep, type Clef, type Midi } from '../music/notes';

export interface ReadItem {
  clef: Clef;
  midi: Midi;
}

export const itemKey = (it: ReadItem) => `${it.clef}:${it.midi}`;

const ORD_F = (n: number) => `${n}ª`;
const ORD_M = (n: number) => `${n}º`;

/** Onde a nota fica na pauta, em palavras: "2ª linha", "3º espaço", "1ª linha suplementar abaixo". */
export function positionLabel(midi: Midi, clef: Clef): string {
  const s = staffStep(midi, clef);
  if (s >= 0 && s <= 8) return s % 2 === 0 ? `${ORD_F(s / 2 + 1)} linha` : `${ORD_M((s - 1) / 2 + 1)} espaço`;
  if (s === -1) return 'espaço logo abaixo da pauta';
  if (s === 9) return 'espaço logo acima da pauta';
  if (s < 0) return s % 2 === 0 ? `${ORD_F(-s / 2)} linha suplementar abaixo` : `abaixo da ${ORD_F((-s - 1) / 2)} linha suplementar`;
  const k = s - 8;
  return k % 2 === 0 ? `${ORD_F(k / 2)} linha suplementar acima` : `acima da ${ORD_F((k - 1) / 2)} linha suplementar`;
}

/** É linha (true) ou espaço (false)? Linhas suplementares contam como linha. */
export const isLine = (midi: Midi, clef: Clef) => staffStep(midi, clef) % 2 === 0;

export interface Landmark {
  midi: Midi;
  name: string;
  /** Por que é fácil de lembrar. */
  why: string;
}

/** Notas de referência: decore estas e ache as outras contando linha → espaço → linha. */
export const LANDMARKS: Record<Clef, Landmark[]> = {
  treble: [
    { midi: 60, name: 'Dó central', why: 'na linha suplementar logo abaixo da pauta' },
    { midi: 67, name: 'Sol', why: 'na 2ª linha, onde a clave de sol se enrola' },
    { midi: 72, name: 'Dó', why: 'no 3º espaço, o do meio' },
    { midi: 79, name: 'Sol agudo', why: 'no espaço logo acima da pauta' },
    { midi: 84, name: 'Dó agudo', why: 'na 2ª linha suplementar acima' },
  ],
  bass: [
    { midi: 36, name: 'Dó grave', why: 'na 2ª linha suplementar abaixo' },
    { midi: 41, name: 'Fá grave', why: 'no espaço logo abaixo da pauta' },
    { midi: 48, name: 'Dó', why: 'no 2º espaço' },
    { midi: 53, name: 'Fá', why: 'na 4ª linha, entre os dois pontos da clave de fá' },
    { midi: 60, name: 'Dó central', why: 'na linha suplementar logo acima da pauta' },
  ],
};

/** A referência mais perto (em posições da pauta); no empate, a de cima da lista (as mais usadas vêm primeiro no meio). */
export function nearestLandmark(midi: Midi, clef: Clef): Landmark {
  const s = staffStep(midi, clef);
  let best = LANDMARKS[clef][0];
  let dist = Infinity;
  for (const l of LANDMARKS[clef]) {
    const d = Math.abs(staffStep(l.midi, clef) - s);
    // Preferência pelas referências centrais (Sol e Fá da clave) quando empata.
    const bias = l.midi === 67 || l.midi === 53 ? -0.1 : 0;
    if (d + bias < dist) {
      dist = d + bias;
      best = l;
    }
  }
  return best;
}

/** Nome sem oitava ("Mi"). */
export const plainName = (midi: Midi) => noteInfo(midi).name;

/** Teclas brancas de `from` até `to` (inclusive), andando de uma em uma. */
function whiteWalk(from: Midi, to: Midi): Midi[] {
  const out: Midi[] = [];
  const dir = to >= from ? 1 : -1;
  for (let m = from; dir > 0 ? m <= to : m >= to; m += dir) if (!noteInfo(m).isBlack) out.push(m);
  return out;
}

/** A posição com a preposição certa: "na 2ª linha", "no 3º espaço", "abaixo da 1ª linha suplementar". */
export function wherePhrase(midi: Midi, clef: Clef): string {
  const pos = positionLabel(midi, clef);
  if (pos.startsWith('abaixo') || pos.startsWith('acima')) return pos;
  return pos.includes('linha') && !pos.startsWith('espaço') ? `na ${pos}` : `no ${pos}`;
}

/** Como achar a nota contando a partir da referência mais perto. */
export function hintFor(midi: Midi, clef: Clef): string {
  const l = nearestLandmark(midi, clef);
  const steps = staffStep(midi, clef) - staffStep(l.midi, clef);
  if (steps === 0) return `${plainName(midi)} é uma referência: fica ${l.why}.`;
  const walk = whiteWalk(l.midi, midi).map(plainName);
  const n = Math.abs(steps);
  return `Referência: ${l.name}, ${l.why}. ${steps > 0 ? 'Suba' : 'Desça'} ${n} ${n === 1 ? 'posição' : 'posições'}, alternando linha e espaço: ${walk.join(', ')}. ${plainName(midi)} fica ${wherePhrase(midi, clef)}.`;
}

// ---------- níveis ----------

const naturals = (low: Midi, high: Midi): Midi[] => whiteWalk(low, high);

const T_LINES = [64, 67, 71, 74, 77];
const T_SPACES = [65, 69, 72, 76];
const T_STAFF = naturals(64, 77);
const T_LEDGER = [...naturals(57, 63), ...T_STAFF, ...naturals(79, 84)];
const B_LINES = [43, 47, 50, 53, 57];
const B_SPACES = [45, 48, 52, 55];
const B_STAFF = naturals(43, 57);
const B_LEDGER = [...naturals(36, 42), ...B_STAFF, ...naturals(59, 64)];

const on = (clef: Clef, midis: Midi[]): ReadItem[] => midis.map((midi) => ({ clef, midi }));

export interface ReadLevel {
  n: number;
  title: string;
  /** Uma frase: o que este nível treina. */
  focus: string;
  items: ReadItem[];
}

export const LEVELS: ReadLevel[] = [
  { n: 1, title: 'Clave de sol: as linhas', focus: 'As cinco linhas, de baixo para cima: Mi, Sol, Si, Ré, Fá.', items: on('treble', T_LINES) },
  { n: 2, title: 'Clave de sol: os espaços', focus: 'Os quatro espaços, de baixo para cima: Fá, Lá, Dó, Mi.', items: on('treble', T_SPACES) },
  { n: 3, title: 'Clave de sol: linhas e espaços', focus: 'As nove posições da pauta misturadas.', items: on('treble', T_STAFF) },
  { n: 4, title: 'Clave de sol: linhas suplementares', focus: 'Do Lá abaixo do Dó central ao Dó duas linhas acima da pauta.', items: on('treble', T_LEDGER) },
  { n: 5, title: 'Clave de fá: as linhas', focus: 'As cinco linhas, de baixo para cima: Sol, Si, Ré, Fá, Lá.', items: on('bass', B_LINES) },
  { n: 6, title: 'Clave de fá: os espaços', focus: 'Os quatro espaços, de baixo para cima: Lá, Dó, Mi, Sol.', items: on('bass', B_SPACES) },
  { n: 7, title: 'Clave de fá: linhas e espaços', focus: 'As nove posições da pauta misturadas.', items: on('bass', B_STAFF) },
  { n: 8, title: 'Clave de fá: linhas suplementares', focus: 'Do Dó duas linhas abaixo ao Mi acima do Dó central.', items: on('bass', B_LEDGER) },
  { n: 9, title: 'As duas claves', focus: 'Sol e fá misturadas, só dentro da pauta: olhe a clave antes da nota.', items: [...on('treble', T_STAFF), ...on('bass', B_STAFF)] },
  { n: 10, title: 'As duas claves com suplementares', focus: 'Tudo junto, de Dó1 a Dó5 na pauta dupla.', items: [...on('treble', T_LEDGER), ...on('bass', B_LEDGER)] },
];

export const levelOf = (n: number) => LEVELS.find((l) => l.n === n) ?? LEVELS[0];

// ---------- estatística por nota e sorteio ----------

export interface NoteStat {
  /** Respostas vistas. */
  seen: number;
  /** Acerto de primeira, média que esquece devagar (0 a 1). */
  acc: number;
  /** Tempo até acertar, média que esquece devagar (ms). */
  ms: number | null;
  lastAt: number;
}

export function updateStat(prev: NoteStat | undefined, firstTry: boolean, ms: number, now: number): NoteStat {
  const s = prev ?? { seen: 0, acc: 0, ms: null, lastAt: 0 };
  const k = s.seen === 0 ? 1 : 0.3;
  return {
    seen: s.seen + 1,
    acc: s.acc * (1 - k) + (firstTry ? 1 : 0) * k,
    ms: s.ms === null ? ms : s.ms * 0.7 + ms * 0.3,
    lastAt: now,
  };
}

export type Mastery = 'nova' | 'fraca' | 'aprendendo' | 'forte';

/** Forte: 3 vistas ou mais, 85% de primeira e até 2 segundos. Fraca: menos de 60% ou mais de 3,5 segundos. */
export function masteryOf(s: NoteStat | undefined): Mastery {
  if (!s || s.seen === 0) return 'nova';
  if (s.acc < 0.6 || (s.ms ?? 0) > 3500) return 'fraca';
  if (s.seen >= 3 && s.acc >= 0.85 && (s.ms ?? Infinity) <= 2000) return 'forte';
  return 'aprendendo';
}

/** Peso no sorteio: nota nova e nota fraca aparecem mais; nota forte aparece menos, mas não some. */
export function weightOf(s: NoteStat | undefined): number {
  const m = masteryOf(s);
  if (m === 'nova') return 3;
  const slow = s!.ms === null ? 0 : Math.min(3, Math.max(0, (s!.ms - 1500) / 1000));
  return 0.6 + 4 * (1 - s!.acc) + slow;
}

/** Sorteia `count` itens com peso, sem repetir o mesmo em seguida. */
export function drawRound(items: ReadItem[], stats: Map<string, NoteStat>, count: number, rng: () => number): ReadItem[] {
  const out: ReadItem[] = [];
  for (let i = 0; i < count; i++) {
    const prev = out[out.length - 1];
    const pool = items.length > 1 && prev ? items.filter((it) => itemKey(it) !== itemKey(prev)) : items;
    const weights = pool.map((it) => weightOf(stats.get(itemKey(it))));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let k = 0;
    while (k < pool.length - 1 && r >= weights[k]) r -= weights[k++];
    out.push(pool[k]);
  }
  return out;
}

// ---------- resposta e rodada ----------

export type AnswerMode = 'nome' | 'tecla';

/** No modo nome vale qualquer oitava (ou o botão do nome); no modo tecla, só a tecla exata. */
export function answerMatches(item: ReadItem, played: Midi, mode: AnswerMode): boolean {
  return mode === 'tecla' ? played === item.midi : ((played % 12) + 12) % 12 === item.midi % 12;
}

export interface RoundResult {
  firstTry: number;
  total: number;
  avgMs: number | null;
}

/** Passa de nível com 90% de primeira e média de até 2,5 segundos. */
export const LEVEL_PASS = { share: 0.9, avgMs: 2500 };

export function roundPassed(r: RoundResult): boolean {
  return r.total > 0 && r.firstTry / r.total >= LEVEL_PASS.share && r.avgMs !== null && r.avgMs <= LEVEL_PASS.avgMs;
}

/** Nível sugerido: o primeiro ainda não passado (ou o último). */
export function suggestedLevel(passed: Set<number>): number {
  return LEVELS.find((l) => !passed.has(l.n))?.n ?? LEVELS[LEVELS.length - 1].n;
}
