// Métricas de evolução calculadas a partir das sessões e tentativas salvas. Funções puras.

import type { Attempt, Session } from './db';
import type { Midi } from '../music/notes';

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Segunda-feira 00:00 da semana de `t`. */
export function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

export function practiceMinutes(sessions: Session[], from: number, to: number): number {
  const ms = sessions
    .filter((s) => s.startedAt >= from && s.startedAt < to)
    .reduce((n, s) => n + Math.max(0, s.endedAt - s.startedAt), 0);
  return Math.round(ms / 60000);
}

function average(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Tempo médio para achar a nota (só acertos) num intervalo. */
export function avgFindMs(attempts: Attempt[], from: number, to: number): number | null {
  return average(attempts.filter((a) => a.correct && a.ms !== null && a.at >= from && a.at < to).map((a) => a.ms as number));
}

/** Notas acertadas de primeira / notas lidas, num intervalo de sessões. */
export function firstTryRate(sessions: Session[], from: number, to: number): number | null {
  const s = sessions.filter((x) => x.startedAt >= from && x.startedAt < to);
  const total = s.reduce((n, x) => n + x.total, 0);
  return total ? s.reduce((n, x) => n + x.firstTry, 0) / total : null;
}

/** Série diária dos últimos `days` dias (o último ponto é hoje). Dias sem treino ficam null. */
export function dailyAvgFindMs(attempts: Attempt[], now: number, days: number): (number | null)[] {
  const today = startOfDay(now);
  const out: (number | null)[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = today - i * DAY;
    out.push(avgFindMs(attempts, from, from + DAY));
  }
  return out;
}

/** A nota esperada que você mais erra, com ao menos `minSeen` aparições. */
export function weakestNote(attempts: Attempt[], minSeen = 5): { midi: Midi; missRate: number } | null {
  const seen = new Map<Midi, { asked: number; missed: number }>();
  for (const a of attempts) {
    const row = seen.get(a.expected) ?? { asked: 0, missed: 0 };
    if (a.correct) row.asked += 1;
    else row.missed += 1;
    seen.set(a.expected, row);
  }
  let best: { midi: Midi; missRate: number } | null = null;
  for (const [midi, { asked, missed }] of seen) {
    if (asked < minSeen) continue;
    const missRate = missed / (asked + missed);
    if (missRate > 0 && (!best || missRate > best.missRate)) best = { midi, missRate };
  }
  return best;
}

export { DAY };
