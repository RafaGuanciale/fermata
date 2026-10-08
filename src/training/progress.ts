// Regras de progresso: quando um treino está vencido, quando a fase termina, em que nível
// está o aquecimento e a leitura. Tudo calculado a partir dos registros de treino (runs).

import type { TrainingRun } from '../db/db';
import { PHASES, READING_LEVELS, WARMUP_LEVELS, type Phase, type Treino, type WarmupLevel } from './program';
import { ladderStep } from './timing';

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Dias corridos desde uma data fixa, para alternar exercícios do aquecimento. */
export function dayIndex(ts: number): number {
  const d = new Date(ts);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

const distinctDays = (runs: TrainingRun[]) => new Set(runs.map((r) => r.day)).size;
const of = (runs: TrainingRun[], treinoId: string) => runs.filter((r) => r.treinoId === treinoId);

export type TreinoStatus = 'novo' | 'andamento' | 'vencido' | 'dominado';

export const TREINO_STATUS_LABEL: Record<TreinoStatus, string> = {
  novo: 'Novo',
  andamento: 'Em andamento',
  vencido: 'Vencido',
  dominado: 'Dominado',
};

/**
 * Notas soltas: 90% de primeira e média abaixo de 2 s (mapa do teclado: 3 s), em 2 dias.
 * No tempo: vencido = uma passada no tempo-alvo com 85% ou mais; dominado = 3 limpas seguidas
 * no tempo-alvo num dia depois do primeiro vencido.
 */
export function treinoStatus(treino: Treino, runs: TrainingRun[]): TreinoStatus {
  const mine = of(runs, treino.id);
  if (!mine.length) return 'novo';

  if (treino.kind === 'locate' || treino.kind === 'names') {
    const limit = treino.kind === 'names' ? 3000 : 2000;
    const good = mine.filter((r) => (r.firstTry ?? 0) >= 0.9 && (r.avgMs ?? Infinity) < limit);
    if (distinctDays(good) >= 3) return 'dominado';
    if (distinctDays(good) >= 2) return 'vencido';
    return 'andamento';
  }

  const target = treino.timed?.target ?? 60;
  const passed = mine.filter((r) => (r.bpm ?? 0) >= target && (r.accuracy ?? 0) >= 0.85).sort((a, b) => a.at - b.at);
  if (!passed.length) return 'andamento';
  const firstDay = passed[0].day;
  const mastered = mine.some((r) => r.day > firstDay && (r.atTarget ?? 0) >= 3);
  return mastered ? 'dominado' : 'vencido';
}

export interface PhaseState {
  phase: Phase;
  statuses: Record<string, TreinoStatus>;
  passedCount: number;
  examUnlocked: boolean;
  examDays: number;
  complete: boolean;
}

export function phaseState(phase: Phase, runs: TrainingRun[]): PhaseState {
  const statuses: Record<string, TreinoStatus> = {};
  for (const t of phase.treinos) statuses[t.id] = treinoStatus(t, runs);
  const passedCount = Object.values(statuses).filter((s) => s === 'vencido' || s === 'dominado').length;
  const examDays = distinctDays(of(runs, `prova-${phase.n}`).filter((r) => r.passed));
  return {
    phase,
    statuses,
    passedCount,
    examUnlocked: phase.ready && passedCount === phase.treinos.length,
    examDays,
    // A prova precisa ser confirmada em outro dia.
    complete: examDays >= 2,
  };
}

/** Primeira fase não concluída. */
export function currentPhase(runs: TrainingRun[]): PhaseState {
  for (const p of PHASES) {
    const s = phaseState(p, runs);
    if (!s.complete) return s;
  }
  return phaseState(PHASES[PHASES.length - 1], runs);
}

/** Último treino que ainda não foi vencido: é o "próximo" sugerido. */
export function nextTreino(state: PhaseState): Treino | null {
  return state.phase.treinos.find((t) => state.statuses[t.id] === 'novo' || state.statuses[t.id] === 'andamento') ?? null;
}

// ---------- níveis (aquecimento e leitura) ----------

function levelFrom(runs: TrainingRun[], treinoId: string): number {
  const changes = of(runs, treinoId).filter((r) => r.kind === 'level' && r.level).sort((a, b) => a.at - b.at);
  return changes.length ? changes[changes.length - 1].level! : 1;
}

export function currentWarmupLevel(runs: TrainingRun[]): WarmupLevel {
  const n = Math.min(levelFrom(runs, 'aquecimento'), WARMUP_LEVELS.length);
  return WARMUP_LEVELS[n - 1];
}

/** Registros do aquecimento feitos no nível dado (depois da última troca de nível). */
function warmupRunsAt(runs: TrainingRun[], level: number): TrainingRun[] {
  const changes = of(runs, 'aquecimento').filter((r) => r.kind === 'level').sort((a, b) => a.at - b.at);
  const since = changes.length ? changes[changes.length - 1].at : 0;
  return runs.filter((r) => r.kind === 'warmup' && r.level === level && r.at >= since);
}

/** Tempo do aquecimento hoje: sobe 5% (mín. 4 BPM) a partir do melhor tempo limpo, até o topo do nível. */
export function warmupTarget(level: WarmupLevel, runs: TrainingRun[]): number {
  const clean = warmupRunsAt(runs, level.n).filter((r) => r.clean && r.bpm);
  if (!clean.length) return level.min;
  const best = Math.max(...clean.map((r) => r.bpm!));
  return Math.min(level.max, Math.max(level.min, best + ladderStep(level.max)));
}

/** Primeira passada de cada dia, limpa, no topo do nível, em 3 dias diferentes. */
export function warmupIsEasy(level: WarmupLevel, runs: TrainingRun[]): boolean {
  const byDay = new Map<string, TrainingRun>();
  for (const r of warmupRunsAt(runs, level.n).sort((a, b) => a.at - b.at)) if (!byDay.has(r.day)) byDay.set(r.day, r);
  const easyDays = [...byDay.values()].filter((r) => r.clean && (r.bpm ?? 0) >= level.max).length;
  return easyDays >= 3;
}

/** Dois dias seguidos de aquecimento com média abaixo de 65%: volta um nível. */
export function warmupShouldDrop(level: WarmupLevel, runs: TrainingRun[]): boolean {
  if (level.n === 1) return false;
  const byDay = new Map<string, number[]>();
  for (const r of warmupRunsAt(runs, level.n)) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r.accuracy ?? 0]);
  const days = [...byDay.keys()].sort().slice(-2);
  if (days.length < 2) return false;
  return days.every((d) => {
    const acc = byDay.get(d)!;
    return acc.reduce((a, b) => a + b, 0) / acc.length < 0.65;
  });
}

export function currentReadingLevel(runs: TrainingRun[]): number {
  return Math.min(levelFrom(runs, 'leitura'), READING_LEVELS.length);
}

/** Leitura: sobe com 80% em 3 dias diferentes; desce com os 2 últimos dias abaixo de 60%. */
export function readingChange(level: number, runs: TrainingRun[]): 'up' | 'down' | null {
  const changes = of(runs, 'leitura').filter((r) => r.kind === 'level').sort((a, b) => a.at - b.at);
  const since = changes.length ? changes[changes.length - 1].at : 0;
  const mine = runs.filter((r) => r.kind === 'reading' && r.level === level && r.at >= since);
  const bestByDay = new Map<string, number>();
  for (const r of mine) bestByDay.set(r.day, Math.max(bestByDay.get(r.day) ?? 0, r.accuracy ?? 0));
  const good = [...bestByDay.values()].filter((a) => a >= 0.8).length;
  if (good >= 3 && level < READING_LEVELS.length && READING_LEVELS[level].ready) return 'up';
  const last = [...bestByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-2);
  if (level > 1 && last.length === 2 && last.every(([, a]) => a < 0.6)) return 'down';
  return null;
}
