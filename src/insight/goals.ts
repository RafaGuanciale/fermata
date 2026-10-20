// Metas da semana: as ações da análise com IA viram uma lista que se marca sozinha quando você consegue
// (pelos blocos de prática e treinos depois da análise) ou à mão. Puro e testado (goals.test.ts).

import type { AppEvent, TrainingRun } from '../db/db';
import type { InsightAction } from '../../api/_lib/insight';
import { FIRM, type Pass } from '../stats/model';

export interface Goal {
  id: string;
  action: InsightAction;
}

export interface GoalState {
  goal: Goal;
  done: boolean;
  /** marcada pelo app (não à mão) */
  auto: boolean;
  /** como está: "2 de 3 passadas acima de 85 % a 60 BPM" */
  progress: string | null;
}

export const goalId = (week: string, i: number) => `meta:${week}:${i}`;

/** Passadas seguidas que bastam para contar como feito. */
const IN_A_ROW = 3;

function songProgress(a: InsightAction, passes: Pass[]): { done: boolean; progress: string | null } {
  const need = a.criterio?.acerto ?? FIRM;
  const bpm = a.criterio?.bpm;
  const ok = passes.filter(
    (p) =>
      p.sourceId === a.alvo &&
      p.mode === 'junto' &&
      (!bpm || p.bpm >= bpm) &&
      (!a.compassos || (p.from !== undefined && p.to !== undefined && p.from <= a.compassos.de && p.to >= a.compassos.ate)),
  );
  let run = 0;
  let best = 0;
  for (const p of ok) {
    run = p.accuracy >= need ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const pct = `${Math.round(need * 100)} %`;
  const where = bpm ? ` a ${bpm} BPM ou mais` : '';
  if (best >= IN_A_ROW) return { done: true, progress: `${IN_A_ROW} passadas seguidas acima de ${pct}${where}` };
  if (!ok.length) return { done: false, progress: null };
  return { done: false, progress: `${best} de ${IN_A_ROW} passadas seguidas acima de ${pct}${where}` };
}

/**
 * Estado de cada meta. Música: 3 passadas seguidas no trecho (ou num trecho maior que o contém), no andamento
 * e acerto do critério (sem critério: 85 %). Leitura: 2 rodadas. Ouvido: 1 rodada. Tocar livre: os minutos da meta.
 * Treino do dia: uma parte feita. A marca à mão (a mais recente) vale sobre a do app.
 */
export function goalStates(goals: Goal[], ctx: { since: number; passes: Pass[]; runs: TrainingRun[]; events: AppEvent[] }): GoalState[] {
  const passes = ctx.passes.filter((p) => p.at >= ctx.since).sort((a, b) => a.at - b.at);
  const runs = ctx.runs.filter((r) => r.at >= ctx.since);
  const manual = new Map<string, boolean>();
  for (const e of [...ctx.events].sort((a, b) => a.at - b.at)) if (e.type === 'goal' && e.sourceId) manual.set(e.sourceId, (e.accuracy ?? 0) >= 1);
  return goals.map((goal) => {
    const a = goal.action;
    let auto: { done: boolean; progress: string | null } = { done: false, progress: null };
    if (a.alvo.startsWith('peca-') || a.alvo.startsWith('curso-')) auto = songProgress(a, passes);
    else if (a.alvo === 'leitura') {
      const n = runs.filter((r) => r.kind === 'names' || r.kind === 'locate').length;
      auto = { done: n >= 2, progress: n ? `${Math.min(n, 2)} de 2 rodadas` : null };
    } else if (a.alvo === 'eco') {
      const n = runs.filter((r) => r.treinoId === 'eco').length;
      auto = { done: n >= 1, progress: null };
    } else if (a.alvo === 'livre') {
      const ms = ctx.events.filter((e) => e.type === 'view' && e.area === 'livre' && e.at >= ctx.since).reduce((s, e) => s + (e.active ?? 0), 0);
      const min = Math.round(ms / 60_000);
      auto = { done: min >= a.minutos, progress: min ? `${Math.min(min, a.minutos)} de ${a.minutos} min` : null };
    } else if (a.alvo === 'treino') {
      auto = { done: runs.some((r) => r.treinoId.startsWith('dia-') || r.treinoId.startsWith('tec-')), progress: null };
    }
    const m = manual.get(goal.id);
    return { goal, done: m ?? auto.done, auto: m === undefined && auto.done, progress: auto.progress };
  });
}
