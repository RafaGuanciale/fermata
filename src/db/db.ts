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
  /** "modulo/licao" */
  id: string;
  status: LearnStatus;
  updatedAt: number;
}

/** Resultado de um treino do programa (fases, aquecimento, leitura, prova) ou mudança de nível. */
export interface TrainingRun extends Synced {
  id?: number;
  /** id do treino ("f1-escada-md"), "aquecimento", "leitura" ou "prova-1" */
  treinoId: string;
  kind: 'timed' | 'locate' | 'names' | 'warmup' | 'reading' | 'exam' | 'level';
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
  /** Mudança de nível (kind 'level') ou nível em que foi feito */
  level?: number;
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
  sessions!: Table<Session, number>;
  attempts!: Table<Attempt, number>;
  pieces!: Table<Piece, number>;
  files!: Table<StoredFile, number>;
  lessons!: Table<LessonProgress, string>;

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
  }
}

export const db = new FermataDB();
