// Rastreador: grava na tabela `events` o que acontece no app além das passadas completas.
// Visitas (ActivityTracker), mudanças de andamento, trecho, mão ou modo, ouvir o trecho, parar no meio, marcos.

import { db, type AppEvent } from '../db/db';
import { dayKey } from '../training/progress';

export type EventInput = Omit<AppEvent, 'id' | 'at' | 'day' | 'uid' | 'mt'> & { at?: number };

export async function logEvent(e: EventInput): Promise<void> {
  const at = e.at ?? Date.now();
  try {
    await db.events.put({ ...e, id: `ev-${crypto.randomUUID().slice(0, 12)}`, at, day: dayKey(at) });
  } catch (err) {
    console.error('[Fermata] Não foi possível registrar o evento', err);
  }
}

/** A visita aberta agora (uma por vez). */
interface OpenView {
  path: string;
  start: number;
  notes: number;
  subject: { sourceId: string; title: string } | null;
}

let open: OpenView | null = null;

/** A tela aberta diz o que está mostrando (música ou exercício); a visita leva junto quando fecha. */
export function setViewSubject(s: { sourceId: string; title: string }): void {
  if (open) open.subject = s;
}

export function startView(path: string, at = Date.now()): void {
  open = { path, start: at, notes: 0, subject: null };
}

export function countViewNote(): void {
  if (open) open.notes++;
}

/** Fecha a visita e grava (visitas de menos de 2 s sem nota são só passagem e não contam). */
export function endView(area: string, at = Date.now()): void {
  const v = open;
  open = null;
  if (!v) return;
  const dur = at - v.start;
  if (dur < 2000 && !v.notes) return;
  void logEvent({ type: 'view', at: v.start, path: v.path, area, dur, notes: v.notes, ...(v.subject ?? {}) });
}
