// O que conta como estudo de verdade: as análises (IA, Progresso, revisões, metas) só olham para isso.
// Abrir uma música para ver se é fácil, tocar um ou dois compassos, não é estudar: fica de fora.
// Puro e testado (focus.test.ts).

import type { LearnStatus } from '../db/db';
import { blockStats, buildBlocks, type Pass } from './model';

/** Uma música fora de "Aprendendo" só entra se houve prática de verdade: tantos dias e tantos minutos. */
export const EXPLORE_LIMIT = { days: 3, minutes: 30 };

export interface Engagement {
  minutes: number;
  days: number;
  passes: number;
}

export function engagement(passes: Pass[]): Engagement {
  const blocks = buildBlocks(passes);
  const ms = blocks.reduce((a, b) => a + blockStats(b).durationMs, 0);
  return { minutes: Math.round(ms / 60_000), days: new Set(passes.map((p) => p.day)).size, passes: passes.length };
}

export type StatusOf = (sourceId: string) => LearnStatus | null;

/**
 * Conta: exercícios, técnica, arcade, músicas do curso e músicas do repertório marcadas como Aprendendo,
 * Aprendida ou Repertório. Uma música em "Quero aprender" (ou fora do repertório) só conta depois de
 * EXPLORE_LIMIT de prática.
 */
export function isStudied(sourceId: string, passes: Pass[], statusOf: StatusOf): boolean {
  if (!sourceId.startsWith('peca-')) return true;
  const st = statusOf(sourceId);
  if (st === 'learning' || st === 'learned' || st === 'repertoire') return true;
  const e = engagement(passes.filter((p) => p.sourceId === sourceId));
  return e.days >= EXPLORE_LIMIT.days && e.minutes >= EXPLORE_LIMIT.minutes;
}

/** Separa as fontes em estudadas e só exploradas (com quanto foi tocado), olhando todas as passadas. */
export function studiedSplit(passes: Pass[], statusOf: StatusOf): { studied: Set<string>; explored: Map<string, Engagement & { title: string }> } {
  const by = new Map<string, Pass[]>();
  for (const p of passes) by.set(p.sourceId, [...(by.get(p.sourceId) ?? []), p]);
  const studied = new Set<string>();
  const explored = new Map<string, Engagement & { title: string }>();
  for (const [id, ps] of by) {
    if (isStudied(id, passes, statusOf)) studied.add(id);
    else explored.set(id, { ...engagement(ps), title: ps[ps.length - 1].title });
  }
  return { studied, explored };
}

/** Filtro pronto: fica com o que é estudo (para passadas, treinos e trechos). */
export function studiedFilter(passes: Pass[], statusOf: StatusOf): (sourceId: string) => boolean {
  const { studied } = studiedSplit(passes, statusOf);
  return (id) => !id.startsWith('peca-') || studied.has(id);
}

