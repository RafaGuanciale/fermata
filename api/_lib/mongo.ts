// Conexão com o MongoDB Atlas, reaproveitada entre chamadas da mesma instância.
// Usa um banco separado ("fermata") no mesmo cluster do Permana: os dados não se misturam.

import { MongoClient, type Db } from 'mongodb';
import { env } from './http.js';

export interface SyncRecord {
  /** `${userId}:${table}:${uid}` */
  _id: string;
  userId: string;
  table: string;
  uid: string;
  /** Momento da última alteração no aparelho (quem alterou por último vence). */
  mt: number;
  deleted: boolean;
  data: Record<string, unknown> | null;
  /** Ordem de chegada no servidor, por usuário. É o que os aparelhos usam para pedir só o que é novo. */
  seq: number;
}

export interface Counter {
  _id: string;
  seq: number;
}

let clientPromise: Promise<MongoClient> | null = null;
let indexesReady: Promise<unknown> | null = null;

export async function getDb(): Promise<Db> {
  if (!clientPromise) {
    clientPromise = new MongoClient(env('MONGODB_URI'), { maxPoolSize: 5 }).connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  const db = (await clientPromise).db('fermata');
  if (!indexesReady) {
    indexesReady = db.collection<SyncRecord>('records').createIndex({ userId: 1, seq: 1 }).catch(() => {
      indexesReady = null;
    });
  }
  await indexesReady;
  return db;
}
