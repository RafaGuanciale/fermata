// Banco local no navegador (IndexedDB via Dexie). Nada sai do aparelho por enquanto.
// Quando houver login, a sincronização com a nuvem parte destas mesmas tabelas.

import Dexie, { type Table } from 'dexie';
import type { ExerciseKind } from '../music/exercises';
import type { Midi } from '../music/notes';

export interface Session {
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
export interface Attempt {
  id?: number;
  sessionId: number;
  at: number;
  expected: Midi;
  played: Midi;
  correct: boolean;
  /** Só nos acertos: tempo até achar a nota. */
  ms: number | null;
}

export type LearnStatus = 'wish' | 'learning' | 'learned' | 'repertoire';
export type Level = 'facil' | 'intermediario' | 'avancado';

export interface Piece {
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
  createdAt: number;
  updatedAt: number;
  openedAt: number | null;
}

/** Partituras (PDF ou foto). Guardadas no próprio navegador. */
export interface StoredFile {
  id?: number;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

export interface LessonProgress {
  /** "modulo/licao" */
  id: string;
  status: LearnStatus;
  updatedAt: number;
}

class FermataDB extends Dexie {
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
  }
}

export const db = new FermataDB();
