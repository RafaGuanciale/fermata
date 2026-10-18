// A análise da semana anterior: busca a já gerada; se não houver e a semana teve treino suficiente,
// pede uma nova (uma vez por semana, a partir de segunda). Guarda neste aparelho para não perguntar de novo.

import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { authHeaders } from '../sync/account';
import { findSong } from '../course';
import { getGoal } from '../progress/goals';
import type { Insight } from '../../api/_lib/insight';
import { buildDigest, lastWeek, type Target } from './digest';

export type InsightState =
  | { status: 'loading' }
  | { status: 'ready'; insight: Insight; createdAt: number; week: string; targets: Target[] }
  | { status: 'skipped'; week: string; minutes: number; days: number }
  | { status: 'error'; message: string };

const cacheKey = (week: string) => `fermata-insight:${week}`;

function readCache(week: string): InsightState | null {
  try {
    const v = localStorage.getItem(cacheKey(week));
    return v ? (JSON.parse(v) as InsightState) : null;
  } catch {
    return null;
  }
}

function writeCache(week: string, s: InsightState) {
  try {
    localStorage.setItem(cacheKey(week), JSON.stringify(s));
  } catch {
    // sem armazenamento: pergunta ao servidor de novo na próxima vez (ele devolve a guardada, sem gastar)
  }
}

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? 'Não deu para buscar a análise agora.';
}

async function songLookup(): Promise<{ route: (id: string) => string | null; title: (id: string) => string | null }> {
  const pieces = await db.pieces.toArray();
  const byKey = new Map(pieces.map((p) => [`peca-${p.uid ?? p.id}`, p]));
  return {
    route: (id) => {
      if (id.startsWith('curso-')) {
        const s = findSong(id.slice(6));
        return s ? `/curso/musica/${s.id}` : null;
      }
      const p = byKey.get(id);
      return p ? `/peca/${p.id}/estudar` : null;
    },
    title: (id) => (id.startsWith('curso-') ? (findSong(id.slice(6))?.title ?? null) : (byKey.get(id)?.title ?? null)),
  };
}

let inflight: Promise<InsightState> | null = null;

async function load(): Promise<InsightState> {
  const now = Date.now();
  const week = lastWeek(now);
  const cached = readCache(week.id);
  if (cached?.status === 'ready') return cached;

  const [takes, runs, practice, recordings, notes, route, events] = await Promise.all([
    db.takes.where('at').between(week.start, week.end).toArray(),
    db.runs.where('at').between(week.start - 7 * 86_400_000, week.end).toArray(),
    db.practice.toArray(),
    db.recordings.toArray(),
    db.notes.toArray(),
    songLookup(),
    db.events.where('at').between(week.start, week.end).toArray(),
  ]);
  const built = buildDigest({ now, takes, runs, practice, recordings, notes, events, goal: getGoal(), songRoute: route.route, songTitle: route.title });
  const targets = built.digest.alvos;

  let res = await fetch(`/api/insight?week=${week.id}`, { headers: authHeaders() }).catch(() => null);
  if (res?.ok) {
    const data = (await res.json()) as { insight: Insight; createdAt: number };
    const s: InsightState = { status: 'ready', insight: data.insight, createdAt: data.createdAt, week: week.id, targets };
    writeCache(week.id, s);
    return s;
  }
  if (!res) return { status: 'error', message: 'Sem conexão: a análise aparece quando a internet voltar.' };
  if (res.status !== 404) return { status: 'error', message: await readMessage(res) };

  // Pouco treino: não guarda a decisão (dados de outro aparelho podem chegar depois pela sincronização).
  if (!built.qualifies) return { status: 'skipped', week: week.id, minutes: built.minutes, days: built.days };
  res = await fetch('/api/insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ week: week.id, digest: built.digest, targets: targets.map((t) => t.id) }),
  }).catch(() => null);
  if (!res) return { status: 'error', message: 'Sem conexão: a análise aparece quando a internet voltar.' };
  if (!res.ok) return { status: 'error', message: await readMessage(res) };
  const data = (await res.json()) as { insight: Insight; createdAt: number };
  const s: InsightState = { status: 'ready', insight: data.insight, createdAt: data.createdAt, week: week.id, targets };
  writeCache(week.id, s);
  return s;
}

export function useWeeklyInsight(): InsightState {
  const [state, setState] = useState<InsightState>(() => {
    const c = readCache(lastWeek(Date.now()).id);
    return c?.status === 'ready' ? c : { status: 'loading' };
  });
  useEffect(() => {
    let alive = true;
    inflight ??= load().finally(() => {
      inflight = null;
    });
    void inflight.then((s) => alive && setState(s)).catch(() => alive && setState({ status: 'error', message: 'Não deu para buscar a análise agora.' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
