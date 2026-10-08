// Banco local no navegador (IndexedDB via Dexie). Nada sai do seu computador por enquanto.
// Quando houver login, uma sincronização com o servidor parte destas mesmas tabelas.

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

/** Cada nota tocada no treino, certa ou errada. É daqui que sai toda a evolução. */
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

class FermataDB extends Dexie {
  sessions!: Table<Session, number>;
  attempts!: Table<Attempt, number>;

  constructor() {
    super('fermata');
    this.version(1).stores({
      sessions: '++id, startedAt, kind',
      attempts: '++id, sessionId, at, expected',
    });
  }
}

export const db = new FermataDB();
