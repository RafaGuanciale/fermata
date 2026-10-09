// Números da página de Progresso. Funções puras, testadas em stats.test.ts.

import type { Attempt, PracticeDay, Session, TrainingRun } from '../db/db';
import type { Midi } from '../music/notes';
import { startOfDay, startOfWeek } from '../db/stats';
import { dayKey } from '../training/progress';

const DAY = 24 * 60 * 60 * 1000;

/** Minutos tocados por dia. Soma os aparelhos; dias antigos sem relógio usam a duração das sessões. */
export function minutesByDay(practice: PracticeDay[], sessions: Session[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of practice) out.set(p.day, (out.get(p.day) ?? 0) + p.minutes);
  const fromSessions = new Map<string, number>();
  for (const s of sessions) {
    const d = dayKey(s.startedAt);
    fromSessions.set(d, (fromSessions.get(d) ?? 0) + Math.max(0, s.endedAt - s.startedAt) / 60000);
  }
  for (const [d, m] of fromSessions) if (!out.has(d)) out.set(d, Math.round(m));
  return out;
}

/** Dias seguidos com prática, terminando hoje (ou ontem, se hoje ainda não tocou). */
export function streak(byDay: Map<string, number>, now: number): number {
  let t = startOfDay(now);
  if (!(byDay.get(dayKey(t)) ?? 0)) t -= DAY;
  let n = 0;
  while ((byDay.get(dayKey(t)) ?? 0) > 0) {
    n++;
    t -= DAY;
  }
  return n;
}

export interface WeekTotal {
  start: number;
  minutes: number;
  days: number;
}

/** Totais das últimas `weeks` semanas (segunda a domingo), a última é a atual. */
export function weeklyTotals(byDay: Map<string, number>, now: number, weeks: number): WeekTotal[] {
  const current = startOfWeek(now);
  const out: WeekTotal[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = current - w * 7 * DAY;
    let minutes = 0;
    let days = 0;
    for (let d = 0; d < 7; d++) {
      const m = byDay.get(dayKey(start + d * DAY + DAY / 2)) ?? 0;
      minutes += m;
      if (m > 0) days++;
    }
    out.push({ start, minutes, days });
  }
  return out;
}

export interface HeatCell {
  day: string;
  time: number;
  minutes: number;
  future: boolean;
}

/** Calendário: colunas de semanas (segunda no topo), da mais antiga para a atual. */
export function heatmap(byDay: Map<string, number>, now: number, weeks: number): HeatCell[][] {
  const current = startOfWeek(now);
  const today = startOfDay(now);
  const cols: HeatCell[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = current - w * 7 * DAY;
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const time = start + d * DAY + DAY / 2;
      const day = dayKey(time);
      col.push({ day, time, minutes: byDay.get(day) ?? 0, future: startOfDay(time) > today });
    }
    cols.push(col);
  }
  return cols;
}

/** Intensidade 0–4 para o calendário. */
export function heatLevel(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 10) return 1;
  if (minutes < 20) return 2;
  if (minutes < 40) return 3;
  return 4;
}

export interface WeekReading {
  start: number;
  findMs: number | null;
  firstTry: number | null;
}

/** Leitura por semana: tempo médio para achar a nota e acerto de primeira. */
export function weeklyReading(attempts: Attempt[], sessions: Session[], now: number, weeks: number): WeekReading[] {
  const current = startOfWeek(now);
  const out: WeekReading[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = current - w * 7 * DAY;
    const end = start + 7 * DAY;
    const hits = attempts.filter((a) => a.correct && a.ms !== null && a.at >= start && a.at < end);
    const ss = sessions.filter((s) => s.startedAt >= start && s.startedAt < end);
    const total = ss.reduce((n, s) => n + s.total, 0);
    out.push({
      start,
      findMs: hits.length ? hits.reduce((n, a) => n + (a.ms as number), 0) / hits.length : null,
      firstTry: total ? ss.reduce((n, s) => n + s.firstTry, 0) / total : null,
    });
  }
  return out;
}

/** Notas que você mais erra (no mínimo `minSeen` vezes pedidas), da pior para a melhor. */
export function weakNotes(attempts: Attempt[], top = 5, minSeen = 5): { midi: Midi; missRate: number; asked: number }[] {
  const seen = new Map<Midi, { asked: number; missed: number }>();
  for (const a of attempts) {
    const row = seen.get(a.expected) ?? { asked: 0, missed: 0 };
    row.asked++;
    if (!a.correct) row.missed++;
    seen.set(a.expected, row);
  }
  return [...seen.entries()]
    .filter(([, r]) => r.asked >= minSeen && r.missed > 0)
    .map(([midi, r]) => ({ midi, missRate: r.missed / r.asked, asked: r.asked }))
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, top);
}

/** Melhor BPM com passada limpa e melhor acerto por treino ou música (pelo prefixo do id). */
export function bestByTreino(runs: TrainingRun[]): Map<string, { bestClean: number | null; bestAccuracy: number; last: number; lastWeak: [number, number] | null; count: number }> {
  const out = new Map<string, { bestClean: number | null; bestAccuracy: number; last: number; lastWeak: [number, number] | null; count: number }>();
  for (const r of [...runs].sort((a, b) => a.at - b.at)) {
    if (r.kind === 'level') continue;
    const cur = out.get(r.treinoId) ?? { bestClean: null, bestAccuracy: 0, last: 0, lastWeak: null, count: 0 };
    if (r.clean && r.bpm) cur.bestClean = Math.max(cur.bestClean ?? 0, r.bpm);
    cur.bestAccuracy = Math.max(cur.bestAccuracy, r.accuracy ?? 0);
    cur.last = r.at;
    cur.count++;
    if (r.weakFrom) cur.lastWeak = [r.weakFrom, r.weakTo ?? r.weakFrom];
    else if (r.accuracy !== undefined) cur.lastWeak = null;
    out.set(r.treinoId, cur);
  }
  return out;
}

export interface Milestone {
  title: string;
  at: number | null;
}

/** Marcos: o primeiro momento em que cada conquista aconteceu (null = ainda não). */
/** `extra`: marcos do curso calculados fora (lições, unidades, técnica no alvo). */
export function milestones(runs: TrainingRun[], byDay: Map<string, number>, piecesLearnedAt: number[], extra: Milestone[] = []): Milestone[] {
  const sorted = [...runs].sort((a, b) => a.at - b.at);
  const first = (f: (r: TrainingRun) => boolean) => sorted.find(f)?.at ?? null;
  const days = [...byDay.entries()].filter(([, m]) => m > 0).map(([d]) => d).sort();
  let sum = 0;
  let tenHoursAt: number | null = null;
  for (const d of days) {
    sum += byDay.get(d) ?? 0;
    if (sum >= 600) {
      tenHoursAt = new Date(d + 'T12:00').getTime();
      break;
    }
  }
  let run = 0;
  let weekAt: number | null = null;
  for (let i = 0; i < days.length; i++) {
    const prev = i > 0 ? new Date(days[i - 1] + 'T12:00').getTime() : null;
    const cur = new Date(days[i] + 'T12:00').getTime();
    run = prev !== null && Math.round((cur - prev) / DAY) === 1 ? run + 1 : 1;
    if (run >= 7 && weekAt === null) weekAt = cur;
  }
  return [
    { title: 'Primeira passada limpa no tempo', at: first((r) => r.kind === 'timed' && !!r.clean) },
    { title: 'Primeira música tocada junto com 85% ou mais', at: first((r) => (r.treinoId.startsWith('peca-') || r.treinoId.startsWith('curso-')) && (r.accuracy ?? 0) >= 0.85) },
    ...extra,
    { title: 'Primeira música aprendida', at: piecesLearnedAt.length ? Math.min(...piecesLearnedAt) : null },
    { title: '7 dias seguidos tocando', at: weekAt },
    { title: '10 horas de piano', at: tenHoursAt },
  ];
}
