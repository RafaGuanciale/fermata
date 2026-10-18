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
  /** pedaços de 30 s com atividade útil */
  slices: Set<number>;
  subject: { sourceId: string; title: string } | null;
}

let open: OpenView | null = null;

/** A tela aberta diz o que está mostrando (música ou exercício); a visita leva junto quando fecha. */
export function setViewSubject(s: { sourceId: string; title: string }): void {
  if (open) open.subject = s;
}

export function startView(path: string, at = Date.now()): void {
  open = { path, start: at, notes: 0, slices: new Set(), subject: null };
}

export function countViewNote(): void {
  if (open) open.notes++;
}

/**
 * Tempo útil, não tempo com a página aberta: ficar parado no Hoje não conta. Cada pedaço de 30 s conta se teve
 * atividade útil (quem decide o que é útil é o ActivityTracker, com as mesmas regras do relógio de prática).
 */
export const ACTIVE_SLICE_MS = 30_000;

export function markViewActive(at = Date.now()): void {
  open?.slices.add(Math.floor(at / ACTIVE_SLICE_MS));
}

/** Fecha a visita e grava (visitas de menos de 2 s sem nota são só passagem e não contam). */
export function endView(area: string, at = Date.now()): void {
  const v = open;
  open = null;
  if (!v) return;
  const dur = at - v.start;
  if (dur < 2000 && !v.notes) return;
  const active = Math.min(dur, v.slices.size * ACTIVE_SLICE_MS);
  const slices = [...v.slices];
  const span = slices.length ? { activeFrom: Math.max(v.start, Math.min(...slices) * ACTIVE_SLICE_MS), activeTo: Math.min(at, (Math.max(...slices) + 1) * ACTIVE_SLICE_MS) } : {};
  void logEvent({ type: 'view', at: v.start, path: v.path, area, dur, active, ...span, notes: v.notes, ...(v.subject ?? {}) });
}
