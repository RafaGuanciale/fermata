// Gravações no banco (tabela recordings, sincroniza com a conta). Telas passam por aqui.

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Recording } from '../db/db';
import { packNotes, packPedal, unpackNotes, unpackPedal, type RecNote, type RecPedal, type TakeFacts } from './take';

export function useRecordings(sourceId?: string): Recording[] | undefined {
  return useLiveQuery(
    () => (sourceId ? db.recordings.where('sourceId').equals(sourceId).toArray() : db.recordings.toArray()).then((r) => r.sort((a, b) => b.createdAt - a.createdAt)),
    [sourceId],
  );
}

export interface NewRecording {
  title: string;
  kind: Recording['kind'];
  durationMs: number;
  notes: RecNote[];
  pedal: RecPedal[];
  sourceId?: string;
  sourceTitle?: string;
  bpm?: number;
  accuracy?: number;
  timing?: Recording['timing'];
  from?: number;
  to?: number;
  hand?: string;
}

export async function saveRecording(r: NewRecording): Promise<string> {
  const id = `rec-${crypto.randomUUID().slice(0, 12)}`;
  const { notes, pedal, ...rest } = r;
  await db.recordings.put({ ...rest, id, createdAt: Date.now(), notes: packNotes(notes), pedal: packPedal(pedal) });
  return id;
}

export async function renameRecording(id: string, title: string) {
  if (title.trim()) await db.recordings.update(id, { title: title.trim() });
}

export async function deleteRecording(id: string) {
  await db.recordings.delete(id);
}

export function factsOf(r: Recording): TakeFacts & { pedal: RecPedal[] } {
  return { createdAt: r.createdAt, durationMs: r.durationMs, notes: unpackNotes(r.notes), pedal: unpackPedal(r.pedal), bpm: r.bpm, accuracy: r.accuracy, timing: r.timing };
}
