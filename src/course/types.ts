// O curso: 12 unidades, cerca de 100 lições. Cada lição é um documento com teoria curta,
// exemplos que o app toca e exercícios respondidos no teclado. O conteúdo fica em src/course/units/,
// um arquivo por unidade; o motor (exercícios, progresso, telas) não muda de unidade para unidade.
// Plano completo e regras de escrita: docs/curso/PLANO.md e docs/curso/PROTOCOLO.md.

import type { Clef, Midi } from '../music/notes';

/** Classe de altura: 0 = Dó … 11 = Si. */
export type Pc = number;

/** Gerador de números entre 0 e 1. Os exercícios usam para sortear instâncias novas a cada vez. */
export type Rng = () => number;

// ---------- itens de resposta (tocar uma nota, um acorde, uma sequência) ----------

/** O que conta como resposta certa para um passo. */
export type Accept =
  /** Uma nota de uma destas classes, em qualquer oitava. */
  | { kind: 'pc'; pcs: Pc[] }
  /** Uma destas teclas exatamente. */
  | { kind: 'exact'; midis: Midi[] }
  /** Acorde: todas as classes seguradas ao mesmo tempo, sem notas a mais. `bass` exige a nota mais grave. */
  | { kind: 'chord'; pcs: Pc[]; bass?: Pc }
  /** Apertar todas estas teclas, em qualquer ordem (por exemplo, todos os Fá do teclado). */
  | { kind: 'all'; midis: Midi[] };

/** Algo que o app toca antes da resposta (ditado, eco, cadência). Cada passo é uma nota ou um acorde. */
export interface Listen {
  /** `velocity` de 0 a 1 (padrão 0,75), para exemplos de dinâmica. */
  steps: { midis: Midi[]; beats: number; velocity?: number }[];
  bpm: number;
}

export interface Item {
  /** Pergunta curta: "Toque um Fá". */
  prompt: string;
  /** Linha menor abaixo da pergunta. */
  detail?: string;
  /** O que mostrar junto: nota na pauta, símbolo grande (cifra, grau). */
  staff?: { notes: Midi[]; clef: Clef };
  symbol?: string;
  /** Teclas acesas como dica (só com dicas ligadas). */
  hintKeys?: Midi[];
  /** Dica em texto (só com dicas ligadas). */
  hint?: string;
  /** O app toca isto antes; o aluno pode ouvir de novo. */
  listen?: Listen;
  /** Passos em ordem. Um item simples tem um passo só. Vazio quando a resposta é uma escolha. */
  steps: Accept[];
  /** Pergunta de escolha (respondida clicando), para conceitos que não se tocam: "Quantos tempos tem a mínima?". */
  choices?: string[];
  answer?: number;
  /** Tempo máximo em ms (por exemplo, achar todos os Fá em 15 s). */
  timeLimitMs?: number;
  /** Habilidade treinada, para estatística e revisão: "achar-nota", "grau". */
  skill: string;
}

export type ItemGen = (rng: Rng) => Item;

// ---------- tarefas no tempo ----------

/** Uma nota esperada numa tarefa no tempo. `midi: null` = qualquer tecla (exercício só de ritmo). */
export interface TimedEvent {
  midi: Midi | null;
  /** Início em tempos desde o primeiro tempo. */
  beat: number;
  /** Duração em tempos (para a pauta e para medir legato/staccato). */
  beats: number;
}

export interface TimedTask {
  /** Linha para a pauta (uma voz). Pausas = midi null em `display`. */
  display: { midi: Midi | null; beats: number }[];
  clef: Clef;
  /** O que precisa ser tocado. Para acordes ou duas vozes, eventos com o mesmo `beat`. */
  events: TimedEvent[];
  beatsPerBar: number;
  bpm: number;
  /** Teclado mostrado. */
  low: Midi;
  high: Midi;
  /** Texto curto acima da pauta. */
  caption?: string;
}

// ---------- exercícios ----------

interface ExerciseBase {
  title: string;
  /** Uma ou duas frases: o que fazer. */
  how: string;
}

export type Exercise =
  | (ExerciseBase & {
      kind: 'items';
      gen: ItemGen;
      count: number;
      /** Trecho do teclado mostrado. */
      low: Midi;
      high: Midi;
      /** Nomes nas teclas: sempre, somem quando a precisão sobe, ou nunca. */
      labels: 'on' | 'fade' | 'off';
      pass: { accuracy: number; avgMs?: number };
    })
  | (ExerciseBase & {
      kind: 'timed';
      gen: (rng: Rng) => TimedTask;
      /** Quantas passadas boas seguidas para concluir. */
      reps: number;
      /** Janela de tempo (ms) para contar como "no tempo". */
      window: number;
      pass: { accuracy: number };
      /** Medir articulação: legato (sem buraco entre notas) ou staccato (nota curta). */
      articulation?: 'legato' | 'staccato';
      /** Dinâmica pedida para todas as notas, ou crescendo ao longo da passada. */
      dynamics?: 'p' | 'mf' | 'f' | 'crescendo' | 'diminuendo';
      /** Sobe o BPM a cada passada boa até o alvo (escada). */
      ladder?: { from: number; to: number; step: number };
    })
  | (ExerciseBase & {
      kind: 'improv';
      /** Notas permitidas. */
      pcs: Pc[];
      bars: number;
      bpm: number;
      beatsPerBar: number;
      /** Acompanhamento que o app toca em loop (um acorde ou bordão por compasso). */
      backing: Midi[][];
      low: Midi;
      high: Midi;
      pass: { inSet: number; /** pausas de pelo menos um tempo a cada 4 compassos */ restsPer4: number; /** termina numa destas classes */ endOn?: Pc[] };
    })
  | (ExerciseBase & {
      kind: 'dynamics';
      /** Sequência de pedidos, sorteada: cada um é uma nota numa faixa de força. */
      gen: (rng: Rng) => { midi: Midi; level: 'p' | 'mf' | 'f' }[];
      low: Midi;
      high: Midi;
      pass: { accuracy: number };
    })
  | (ExerciseBase & { kind: 'calibrate' })
  | (ExerciseBase & { kind: 'checklist'; items: string[] })
  | (ExerciseBase & {
      kind: 'quiz';
      questions: { q: string; options: string[]; answer: number; why: string }[];
      pass: { accuracy: number };
    });

// ---------- blocos da lição ----------

export type Block =
  /** Texto de teoria. Parágrafos separados por linha em branco; **negrito**, *itálico*, listas com "- ". */
  | { kind: 'text'; title?: string; body: string }
  /** Quadro destacado: erro comum, por que soa assim, dica, saúde. */
  | { kind: 'callout'; tone: 'erro' | 'porque' | 'dica' | 'saude'; title: string; body: string }
  /** Teclado ilustrado. */
  | { kind: 'keys'; low: Midi; high: Midi; lit?: Midi[]; labels?: Partial<Record<Midi, string>>; caption: string }
  /** Exemplo resolvido: o app mostra e toca passo a passo. */
  | { kind: 'example'; title: string; steps: { say: string; play?: Listen; keys?: Midi[] }[] }
  /** Exercício guiado (com dicas). `id` é estável: é o que marca "feito". */
  | { kind: 'exercise'; id: string; exercise: Exercise }
  /** Música para tocar no estúdio (popup "Tocar a música"). */
  | { kind: 'song'; songId: string; why: string };

export interface Lesson {
  /** Número no curso inteiro (1 a 100). */
  n: number;
  /** Curto e estável: "l01". Vira parte da chave do progresso. */
  id: string;
  title: string;
  /** Duração planejada em minutos. */
  minutes: number;
  /** Frases "Consigo…". */
  objectives: string[];
  blocks: Block[];
  /** Perguntas desta lição que voltam no aquecimento das lições seguintes (revisão espaçada). */
  review: ItemGen[];
  /** Portão da lição: exercícios sem dica. Todos precisam passar. */
  checkpoint: Exercise[];
  project?: { title: string; brief: string; steps: string[]; rubric: string[]; exercise?: Exercise };
  /** Ticket de saída: perguntas rápidas de recuperação (além da autoavaliação, que é fixa). */
  exit: ItemGen[];
}

/** Música do curso. Vira MusicXML na hora e abre no "Tocar a música". */
export interface SongSpec {
  id: string;
  title: string;
  composer: string;
  /** Quem simplificou e o quê (aparece na tela). */
  arrangement?: string;
  /** Andamento alvo para passar. */
  bpm: number;
  beatsPerBar: number;
  /** Armadura: número de sustenidos (positivo) ou bemóis (negativo). */
  fifths: number;
  /** Melodia por compasso, separada por "|". Notas "C4", "F#4", "Bb3"; duração após ":"; "r" = pausa; acorde "C3+E3+G3:4". */
  right: string;
  left?: string;
  /** Mão exigida para passar. */
  hands: 'direita' | 'esquerda' | 'duas';
  /** Acerto mínimo no "Tocar junto" com o BPM alvo. */
  pass: { accuracy: number };
}

export interface Unit {
  n: number;
  /** "u01" */
  id: string;
  title: string;
  /** Uma frase: ao fim da unidade você consegue… */
  goal: string;
  /** Meta do trilho técnico (texto). */
  technique: string;
  lessons: Lesson[];
  /** Músicas usadas nas lições e no projeto final. */
  songs: SongSpec[];
  /** Projeto final da unidade: a música que fecha o módulo. */
  final: { songId: string; brief: string };
}
