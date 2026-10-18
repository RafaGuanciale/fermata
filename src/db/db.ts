// Banco local no navegador (IndexedDB via Dexie). O app sempre lê e grava aqui, mesmo sem internet.
// Com login, src/sync leva as mudanças para a nuvem e traz as dos outros aparelhos.
// `uid` é o identificador que vale entre aparelhos; `mt` é o momento da última alteração.

import Dexie, { type Table } from 'dexie';
import type { ExerciseKind } from '../music/exercises';
import type { Midi } from '../music/notes';

/** Campos que a sincronização preenche sozinha (hooks em src/sync/engine.ts). */
export interface Synced {
  uid?: string;
  mt?: number;
}

export interface Session extends Synced {
  id?: number;
  exerciseId: string;
  kind: ExerciseKind;
  startedAt: number;
  endedAt: number;
  total: number;
  firstTry: number;
  misses: number;
  avgMs: number;
}

/** Cada nota tocada no treino, certa ou errada. É daqui que sai a evolução. */
export interface Attempt extends Synced {
  id?: number;
  sessionId: number;
  /** Preenchido quando a tentativa veio de outro aparelho. */
  sessionUid?: string;
  at: number;
  expected: Midi;
  played: Midi;
  correct: boolean;
  /** Só nos acertos: tempo até achar a nota. */
  ms: number | null;
}

export type LearnStatus = 'wish' | 'learning' | 'learned' | 'repertoire';
export type Level = 'facil' | 'intermediario' | 'avancado';

export interface Piece extends Synced {
  id?: number;
  title: string;
  /** Compositores e artistas: alimentam a área Músicos. */
  people: string[];
  /** Arranjo ou fonte ("arr. Lucas Pinhel", "curso X") */
  arrangement: string;
  categories: string[];
  level: Level;
  status: LearnStatus;
  fileId: number | null;
  /** Preenchido quando a peça veio de outro aparelho. */
  fileUid?: string | null;
  /** MusicXML exportado do MuseScore: as notas que o app sabe tocar junto. */
  scoreFileId?: number | null;
  scoreFileUid?: string | null;
  /** Andamento ideal (BPM). Sem ele, vale o da partitura. */
  bpm?: number | null;
  createdAt: number;
  updatedAt: number;
  openedAt: number | null;
}

/** Partituras (PDF ou foto). O arquivo fica no navegador; com login, também no Blob. */
export interface StoredFile extends Synced {
  id?: number;
  name: string;
  type: string;
  size: number;
  /** null quando o arquivo veio de outro aparelho e ainda não foi baixado. */
  blob: Blob | null;
  /** Caminho no Vercel Blob, depois do primeiro envio. */
  pathname?: string | null;
  createdAt: number;
}

export interface LessonProgress extends Synced {
  /** "modulo/licao" (consulta) ou "curso/u01/l01" (curso) */
  id: string;
  status: LearnStatus;
  updatedAt: number;
  // Só nas lições do curso:
  /** Blocos feitos (exercícios guiados, mini-projeto, ticket de saída). */
  done?: string[];
  /** Melhor nota no checkpoint (0 a 1). */
  checkpoint?: number;
  /** Primeira vez que passou no checkpoint (85%): lição concluída. */
  passedAt?: number;
  /** Passou de novo 7 dias depois: lição dominada. */
  masteredAt?: number;
  /** Revisão espaçada: itens desta lição que voltaram no aquecimento, e quantos errou. */
  reviewSeen?: number;
  reviewMiss?: number;
  /** Ticket de saída: sentiu dor ou tensão? Segura o aumento de andamento. */
  tension?: boolean;
}

/** Resultado de um treino do programa (fases, aquecimento, leitura, prova) ou mudança de nível. */
export interface TrainingRun extends Synced {
  id?: number;
  /** id do treino ("f1-escada-md"), "aquecimento", "leitura" ou "prova-1" */
  treinoId: string;
  kind: 'timed' | 'locate' | 'names' | 'warmup' | 'reading' | 'exam' | 'level' | 'review' | 'ear';
  at: number;
  /** Dia local "2026-10-08": as regras contam dias diferentes. */
  day: string;
  bpm?: number;
  /** 0 a 1 */
  accuracy?: number;
  clean?: boolean;
  reps?: number;
  cleanReps?: number;
  /** Passadas limpas seguidas no tempo-alvo */
  atTarget?: number;
  firstTry?: number;
  avgMs?: number;
  passed?: boolean;
  /** Música: trecho com mais erro na passada */
  weakFrom?: number;
  weakTo?: number;
  /** Música: compassos tocados na passada (para saber se um trecho difícil foi revisto) */
  from?: number;
  to?: number;
  /** Mudança de nível (kind 'level') ou nível em que foi feito */
  level?: number;
  /** Pontos (modo arcade). */
  score?: number;
  /** Estrelas de 0 a 3 (modo arcade). */
  stars?: number;
}

/** Minutos tocando por dia, um registro por aparelho (somados na tela de Progresso). */
export interface PracticeDay extends Synced {
  /** `${dia}:${aparelho}` */
  id: string;
  day: string;
  minutes: number;
  /** Quantos desses minutos foram no Tocar livre. */
  free?: number;
  device: string;
}

/** Leitura de notas: como você vai em cada nota, em cada clave (`${clave}:${midi}`). */
export interface NoteReadStat extends Synced {
  id: string;
  clef: 'treble' | 'bass';
  midi: number;
  seen: number;
  acc: number;
  ms: number | null;
  lastAt: number;
}

/** MIDI importado no arcade. É do usuário: sincroniza só com a conta dele (o arquivo vai em base64). */
export interface ArcadeMidi extends Synced {
  id: string;
  title: string;
  /** Banda, compositor ou intérprete (o app tenta adivinhar pelo nome do arquivo; a pessoa corrige). */
  artist?: string;
  data: ArrayBuffer;
  /** Partes escolhidas (índices de `parseMidi(data).parts`). */
  melody: number;
  bass: number | null;
  addedAt: number;
}

/**
 * Gravação do que você tocou (MIDI, não áudio). "livre": no Tocar livre; "marco": uma passada boa no Tocar junto,
 * guardada para comparar com as próximas. Sincroniza com a conta.
 */
export interface Recording extends Synced {
  id: string;
  title: string;
  kind: 'livre' | 'marco';
  createdAt: number;
  durationMs: number;
  /** notas compactadas: midi, início (ms), duração (ms), força (0 = sem força), uma após a outra (take.ts) */
  notes: number[];
  /** pedal compactado: momento (ms), 1 = desce / 0 = sobe */
  pedal: number[];
  /** De onde veio o marco: o mesmo id dos registros de treino da música (`curso-…` ou `peca-…`). */
  sourceId?: string;
  sourceTitle?: string;
  bpm?: number;
  accuracy?: number;
  timing?: { mean: number; spread: number } | null;
  /** Trecho e mão do marco. */
  from?: number;
  to?: number;
  hand?: string;
}

/**
 * Uma passada registrada nota a nota (Tocar junto, exercícios com tempo, arcade): só os erros e alguns totais
 * (src/analysis/takeLog.ts). É o material da análise semanal.
 */
export interface TakeLog extends Synced {
  id: string;
  at: number;
  day: string;
  kind: 'musica' | 'exercicio' | 'arcade';
  /** mesmo id dos runs da música ou do exercício */
  sourceId: string;
  title: string;
  /** n-ésima passada desta música ou exercício */
  n: number;
  bpm: number;
  target?: number;
  hand?: string;
  from?: number;
  to?: number;
  accuracy: number;
  /** notas que contavam */
  total: number;
  /** erros compactados (packErrors) */
  errors: number[];
  /** notas esperadas por dedo sugerido: direita 1–5, esquerda 1–5 */
  fingers: number[];
  extras: number;
  meanDelta: number | null;
  drift: number | null;
  /** "estudo": uma volta no modo Estudar (a partitura espera; bpm 0, sem tempo). Sem o campo: Tocar junto. */
  mode?: 'junto' | 'estudo';
  /** Estudar: false quando você saiu antes de terminar a volta. */
  complete?: boolean;
  /** Estudar: tempo típico (mediana, ms) para achar cada nota ou acorde. */
  stepMs?: number | null;
}

/**
 * Tudo o que acontece no app, como um rastreador: cada página visitada (quanto tempo, quantas notas), cada
 * mudança de andamento, trecho, mão ou modo, cada vez que ouviu o trecho, parou no meio ou guardou um marco.
 * As passadas completas ficam em `takes`; aqui fica o resto (src/analysis/activity.ts). Sincroniza.
 */
export interface AppEvent extends Synced {
  id: string;
  at: number;
  day: string;
  type: 'view' | 'config' | 'listen' | 'abort' | 'marco';
  /** visita: endereço, área ("musicas", "leitura"…), duração com a aba visível (ms) e notas tocadas */
  path?: string;
  area?: string;
  dur?: number;
  /** tempo útil (ms): pedaços de 30 s em que você tocou (ou, numa lição, leu mexendo na página) */
  active?: number;
  /** primeiro e último momento com atividade útil na visita */
  activeFrom?: number;
  activeTo?: number;
  notes?: number;
  /** música ou exercício (mesmo id dos runs e takes) */
  sourceId?: string;
  title?: string;
  mode?: 'junto' | 'estudo';
  bpm?: number;
  hand?: string;
  from?: number;
  to?: number;
  /** parou no meio: acerto até ali e quanto tempo tocou (ms) */
  accuracy?: number;
  ms?: number;
}

/** Fila do que mudou neste aparelho e ainda não subiu. */
export interface OutboxEntry {
  /** `${table}:${uid}` */
  key: string;
  table: string;
  uid: string;
  deleted: boolean;
  /** Muda a cada nova alteração: só sai da fila se não mudou durante o envio. */
  v: number;
}

class FermataDB extends Dexie {
  outbox!: Table<OutboxEntry, string>;
  runs!: Table<TrainingRun, number>;
  practice!: Table<PracticeDay, string>;
  notes!: Table<NoteReadStat, string>;
  sessions!: Table<Session, number>;
  attempts!: Table<Attempt, number>;
  pieces!: Table<Piece, number>;
  files!: Table<StoredFile, number>;
  lessons!: Table<LessonProgress, string>;
  arcadeMidi!: Table<ArcadeMidi, string>;
  recordings!: Table<Recording, string>;
  takes!: Table<TakeLog, string>;
  events!: Table<AppEvent, string>;

  constructor() {
    super('fermata');
    this.version(1).stores({
      sessions: '++id, startedAt, kind',
      attempts: '++id, sessionId, at, expected',
    });
    this.version(2).stores({
      pieces: '++id, status, *categories, *people, updatedAt',
      files: '++id',
      lessons: 'id, status',
    });
    this.version(3)
      .stores({
        sessions: '++id, startedAt, kind, &uid',
        attempts: '++id, sessionId, at, expected, &uid',
        pieces: '++id, status, *categories, *people, updatedAt, &uid',
        files: '++id, &uid',
        lessons: 'id, status',
        outbox: '&key',
      })
      .upgrade(async (tx) => {
        const stamp = (t: string) =>
          tx.table(t).toCollection().modify((r: Synced & { updatedAt?: number; endedAt?: number; at?: number; createdAt?: number }) => {
            r.uid ??= crypto.randomUUID();
            r.mt ??= r.updatedAt ?? r.endedAt ?? r.at ?? r.createdAt ?? Date.now();
          });
        await Promise.all(['sessions', 'attempts', 'pieces', 'files'].map(stamp));
        await tx.table('lessons').toCollection().modify((r: LessonProgress) => {
          r.uid ??= r.id;
          r.mt ??= r.updatedAt;
        });
      });
    this.version(4).stores({
      runs: '++id, treinoId, day, at, &uid',
    });
    this.version(5).stores({
      practice: 'id, day',
    });
    this.version(6).stores({
      notes: 'id',
    });
    this.version(7).stores({
      arcadeMidi: 'id, addedAt',
    });
    // MIDIs do arcade passam a sincronizar: os que já existem ganham uid e mt e entram na fila.
    this.version(8)
      .stores({ arcadeMidi: 'id, addedAt' })
      .upgrade(async (tx) => {
        const rows = (await tx.table('arcadeMidi').toArray()) as ArcadeMidi[];
        await tx.table('arcadeMidi').toCollection().modify((r: ArcadeMidi) => {
          r.uid ??= r.id;
          r.mt ??= r.addedAt;
        });
        await tx.table('outbox').bulkPut(rows.map((r, i) => ({ key: `arcadeMidi:${r.id}`, table: 'arcadeMidi', uid: r.id, deleted: false, v: Date.now() + i / 1000 })));
      });
    this.version(9).stores({
      recordings: 'id, createdAt, sourceId',
    });
    this.version(10).stores({
      takes: 'id, at, day, sourceId',
    });
    this.version(11).stores({
      events: 'id, at, day, type, sourceId',
    });
  }
}

export const db = new FermataDB();
