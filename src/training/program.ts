// O programa de treino: fases, treinos, provas, aquecimento por nível e leitura à primeira vista.
// Segue a metodologia aprovada (doc "Fermata — Metodologia de treino"). Só dados; regras em progress.ts.

import type { Clef, Midi } from '../music/notes';
import type { TimedNote } from './timing';

// Notas por nome, para as melodias ficarem legíveis.
const N: Record<string, Midi> = {
  C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59,
  C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72,
};

/** "C4 D4 E4:2 r:1" → notas com duração. Sem duração = semínima. "r" = pausa. */
export function melody(text: string): TimedNote[] {
  return text
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [name, dur] = tok.split(':');
      const beats = dur ? Number(dur) : 1;
      if (name === 'r') return { midi: null, beats };
      const midi = N[name];
      if (midi === undefined) throw new Error(`Nota desconhecida: ${name}`);
      return { midi, beats };
    });
}

export interface TimedSpec {
  clef: Clef;
  hand: 'direita' | 'esquerda' | 'duas';
  notes: TimedNote[];
  beatsPerBar: number;
  target: number;
  /** Teclas usadas, para o teclado da tela mostrar só o trecho. */
  low: Midi;
  high: Midi;
}

export type TreinoKind = 'timed' | 'locate' | 'names';

export interface Treino {
  id: string;
  title: string;
  /** Uma linha: o que fazer. */
  how: string;
  kind: TreinoKind;
  timed?: TimedSpec;
  /** Origem no curso, para você achar o PDF. */
  source?: string;
}

export interface ExamStep {
  title: string;
  kind: 'locate' | 'timed';
  treinoId?: string;
  /** Passadas seguidas exigidas (timed). */
  reps?: number;
  /** Acerto mínimo de cada passada (timed) */
  minAccuracy?: number;
  requireClean?: boolean;
}

export interface Phase {
  n: number;
  title: string;
  goal: string;
  treinos: Treino[];
  exam: ExamStep[];
  /** Fase com conteúdo pronto no app */
  ready: boolean;
}

const scaleRight: TimedSpec = {
  clef: 'treble', hand: 'direita', beatsPerBar: 4, target: 60, low: 60, high: 72,
  notes: melody('C4 D4 E4 F4 G4 F4 E4 D4 C4:4'),
};

const scaleLeft: TimedSpec = {
  clef: 'bass', hand: 'esquerda', beatsPerBar: 4, target: 60, low: 48, high: 60,
  notes: melody('C3 D3 E3 F3 G3 F3 E3 D3 C3:4'),
};

const repeatedTouches: TimedSpec = {
  clef: 'treble', hand: 'direita', beatsPerBar: 4, target: 60, low: 60, high: 72,
  notes: melody('C4 C4 C4 C4 D4 D4 D4 D4 E4 E4 E4 E4 F4 F4 F4 F4 G4 G4 G4 G4 C4 D4 D4 E4 E4 F4 F4 G4 C4:4'),
};

const odeRight: TimedSpec = {
  clef: 'treble', hand: 'direita', beatsPerBar: 4, target: 60, low: 60, high: 72,
  notes: melody('E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2'),
};

const odeLeft: TimedSpec = {
  clef: 'bass', hand: 'esquerda', beatsPerBar: 4, target: 60, low: 48, high: 60,
  notes: melody('E3 E3 F3 G3 G3 F3 E3 D3 C3 C3 D3 E3 E3:1.5 D3:0.5 D3:2'),
};

export const PHASES: Phase[] = [
  {
    n: 1,
    title: 'Posição de Dó e clave de sol',
    goal: 'Achar qualquer nota de Dó a Sol na pauta e no teclado, com cada mão.',
    ready: true,
    treinos: [
      { id: 'f1-mapa', title: 'Mapa do teclado', how: 'O app pede uma nota; toque ela em qualquer oitava.', kind: 'names', source: 'Ler Partitura, módulo 1' },
      { id: 'f1-leitura', title: 'Leitura de Dó a Sol', how: 'Notas soltas na clave de sol, uma de cada vez.', kind: 'locate', source: 'Ler Partitura, módulos 2 e 5' },
      { id: 'f1-escada-md', title: 'Escada com a mão direita', how: 'Dó-Ré-Mi-Fá-Sol e volta, dedos 1 a 5, no metrônomo.', kind: 'timed', timed: scaleRight, source: 'Unilaterais, exercício 1' },
      { id: 'f1-escada-me', title: 'Escada com a mão esquerda', how: 'A mesma escada uma oitava abaixo, dedos 5 a 1.', kind: 'timed', timed: scaleLeft, source: 'Unilaterais, exercício 2' },
      { id: 'f1-toques', title: 'Toques iguais e blocos de duas notas', how: 'Cada nota 4 vezes com o mesmo volume, depois em pares.', kind: 'timed', timed: repeatedTouches, source: 'Velocidade e Precisão, 1 e 4' },
      { id: 'f1-ode-md', title: 'Ode à Alegria, mão direita', how: 'Os quatro primeiros compassos, no ritmo certo.', kind: 'timed', timed: odeRight, source: 'Destrave suas Mãos, iniciante' },
    ],
    exam: [
      { title: 'Leitura de Dó a Sol, sem nomes', kind: 'locate' },
      { title: 'Escada com a mão direita a 60 BPM, 3 vezes limpa', kind: 'timed', treinoId: 'f1-escada-md', reps: 3, requireClean: true },
      { title: 'Escada com a mão esquerda a 60 BPM, 3 vezes limpa', kind: 'timed', treinoId: 'f1-escada-me', reps: 3, requireClean: true },
      { title: 'Ode à Alegria, mão direita, a 60 BPM', kind: 'timed', treinoId: 'f1-ode-md', reps: 1, minAccuracy: 0.85 },
    ],
  },
  {
    n: 2,
    title: 'Clave de fá e mãos independentes',
    goal: 'Ler as duas claves e cada mão fazer o seu trabalho sozinha.',
    ready: false,
    treinos: [
      { id: 'f2-ancoras', title: 'Notas-âncora', how: 'Dó central, Sol da clave de sol e Fá da clave de fá.', kind: 'locate' },
      { id: 'f2-leitura-fa', title: 'Leitura na clave de fá', how: 'Posição de Dó da mão esquerda.', kind: 'locate' },
      { id: 'f2-alternancias', title: 'Alternâncias e ritmo firme', how: '1-3 e 2-4 na direita, 5-3 e 4-2 na esquerda.', kind: 'timed' },
      { id: 'f2-posicao', title: 'Mudança de posição e saltos', how: 'Sair de Dó-Ré-Mi e cair certo em Sol-Lá-Si.', kind: 'timed' },
      { id: 'f2-ode-me', title: 'Ode à Alegria, mão esquerda', how: 'Uma oitava abaixo, na clave de fá.', kind: 'timed', timed: odeLeft },
    ],
    exam: [],
  },
  {
    n: 3,
    title: 'Mãos juntas e ritmo',
    goal: 'Tocar com as duas mãos sem perder o pulso.',
    ready: false,
    treinos: [
      { id: 'f3-ritmo', title: 'Leitura de ritmo', how: 'Semínima, mínima, semibreve e pausas numa tecla só.', kind: 'timed' },
      { id: 'f3-compassos', title: 'Compassos 2/4, 3/4 e 4/4', how: 'Sentir o primeiro tempo.', kind: 'timed' },
      { id: 'f3-fixa', title: 'Esquerda fixa, direita em melodia', how: 'Dó longo na esquerda, melodia na direita.', kind: 'timed' },
      { id: 'f3-sincronia', title: 'Sincronização progressiva', how: 'As duas mãos juntas, depois em notas diferentes.', kind: 'timed' },
      { id: 'f3-ode-duas', title: 'Ode à Alegria com as duas mãos', how: 'Melodia na direita, Dó e Sol na esquerda.', kind: 'timed' },
    ],
    exam: [],
  },
  {
    n: 4,
    title: 'Acordes e acompanhamento',
    goal: 'Formar os acordes principais sem olhar e trocar no tempo.',
    ready: false,
    treinos: [
      { id: 'f4-triades', title: 'Tríades duas de cada vez', how: 'Dó e Sol, depois Lám e Fá, depois Ré e Mim.', kind: 'timed' },
      { id: 'f4-drill', title: 'Mini drill do curso', how: 'O acorde 8 vezes, depois alternando com o vizinho.', kind: 'timed' },
      { id: 'f4-reconhecer', title: 'Reconhecer a cifra', how: 'O app mostra a cifra e espera o acorde certo.', kind: 'timed' },
      { id: 'f4-sequencias', title: 'Sequências', how: 'Dó-Sol-Lám-Fá e Sol-Ré-Mim-Dó primeiro.', kind: 'timed' },
      { id: 'f4-base', title: 'Base na esquerda, melodia na direita', how: 'O padrão do nível intermediário.', kind: 'timed' },
    ],
    exam: [],
  },
  {
    n: 5,
    title: 'Fluência, escalas e velocidade',
    goal: 'Escalas e passagens com dedilhado certo, acelerando sem perder o controle.',
    ready: false,
    treinos: [
      { id: 'f5-polegar', title: 'Passagem do polegar e escala de Dó', how: 'Uma oitava, cada mão.', kind: 'timed' },
      { id: 'f5-blocos', title: 'Escada em blocos de 3 e saltos curtos', how: 'Velocidade 8 e 9.', kind: 'timed' },
      { id: 'f5-aceleracao', title: 'Aceleração progressiva', how: '3 vezes devagar, 3 no médio, 3 mais rápido.', kind: 'timed' },
      { id: 'f5-acidentes', title: 'Acidentes e intervalos', how: 'Sustenidos, bemóis e saltos de 3ª, 5ª e 8ª.', kind: 'timed' },
      { id: 'f5-dinamica', title: 'Dinâmica', how: 'O mesmo trecho em piano e em forte.', kind: 'timed' },
    ],
    exam: [],
  },
];

export function findTreino(id: string): { phase: Phase; treino: Treino } | null {
  for (const phase of PHASES) {
    const treino = phase.treinos.find((t) => t.id === id);
    if (treino) return { phase, treino };
  }
  return null;
}

// ---------- aquecimento ----------

export interface WarmupExercise {
  id: string;
  title: string;
  timed: TimedSpec;
}

export interface WarmupLevel {
  n: number;
  title: string;
  min: number;
  max: number;
  exercises: WarmupExercise[];
}

export const WARMUP_LEVELS: WarmupLevel[] = [
  {
    n: 1, title: 'Primeiro contato', min: 60, max: 60,
    exercises: [
      { id: 'aq1-toques', title: 'Toques iguais', timed: { ...repeatedTouches, notes: melody('C4 C4 C4 C4 D4 D4 D4 D4 E4 E4 E4 E4 F4 F4 F4 F4 G4 G4 G4 G4 C4:4') } },
      { id: 'aq1-escada-md', title: 'Escada, mão direita', timed: scaleRight },
      { id: 'aq1-escada-me', title: 'Escada, mão esquerda', timed: scaleLeft },
    ],
  },
  {
    n: 2, title: 'Dedos independentes', min: 60, max: 72,
    exercises: [
      { id: 'aq2-alt-md', title: 'Alternância 1-3 e 2-4, mão direita', timed: { ...scaleRight, notes: melody('C4 E4 D4 F4 E4 G4 F4 A4 G4 E4 F4 D4 E4 C4 D4 r C4:4') } },
      { id: 'aq2-alt-me', title: 'Alternância 5-3 e 4-2, mão esquerda', timed: { ...scaleLeft, notes: melody('C3 E3 D3 F3 E3 G3 F3 A3 G3 E3 F3 D3 E3 C3 D3 r C3:4') } },
      { id: 'aq2-pares', title: 'Ritmo firme em pares', timed: { ...scaleRight, notes: melody('C4 C4 D4 D4 E4 E4 F4 F4 G4 G4 F4 F4 E4 E4 D4 D4 C4:4') } },
    ],
  },
  { n: 3, title: 'Mudar de lugar', min: 66, max: 80, exercises: [] },
  { n: 4, title: 'Duas mãos', min: 60, max: 72, exercises: [] },
  { n: 5, title: 'Dedilhado', min: 72, max: 88, exercises: [] },
  { n: 6, title: 'Fluência', min: 80, max: 100, exercises: [] },
];

export function warmupLevel(n: number): WarmupLevel {
  return WARMUP_LEVELS[Math.min(WARMUP_LEVELS.length, Math.max(1, n)) - 1];
}

/** Dois exercícios por dia, alternando entre os do nível. */
export function warmupForDay(level: WarmupLevel, dayIndex: number): WarmupExercise[] {
  const list = level.exercises;
  if (list.length <= 2) return list;
  const a = dayIndex % list.length;
  return [list[a], list[(a + 1) % list.length]];
}

// ---------- leitura à primeira vista ----------

export interface ReadingLevel {
  n: number;
  title: string;
  clef: Clef;
  pool: Midi[];
  bars: number;
  bpm: number;
  ready: boolean;
}

export const READING_LEVELS: ReadingLevel[] = [
  { n: 1, title: 'Dó a Sol, clave de sol, semínimas', clef: 'treble', pool: [60, 62, 64, 65, 67], bars: 4, bpm: 60, ready: true },
  { n: 2, title: 'Dó a Sol, clave de fá, semínimas', clef: 'bass', pool: [48, 50, 52, 53, 55], bars: 4, bpm: 60, ready: true },
  { n: 3, title: 'Posição de Dó com mínimas e pausas', clef: 'treble', pool: [60, 62, 64, 65, 67], bars: 8, bpm: 60, ready: false },
  { n: 4, title: 'Posições de Sol e Fá', clef: 'treble', pool: [], bars: 8, bpm: 60, ready: false },
  { n: 5, title: 'Mãos juntas', clef: 'treble', pool: [], bars: 8, bpm: 60, ready: false },
  { n: 6, title: 'Saltos, sustenidos e bemóis', clef: 'treble', pool: [], bars: 8, bpm: 60, ready: false },
];
