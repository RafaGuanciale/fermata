// Trechos difíceis que voltam: cada trecho em que você errou mais numa passada do "Tocar junto" entra numa fila
// de revisão espaçada (1, 3, 7 e 14 dias). Passada boa (85% ou mais) que cobre o trecho sem errar nele sobe um
// degrau; errar de novo nele volta para o começo. Depois do último degrau, o trecho sai da fila.
// Puro e testado (weakSpots.test.ts).

import type { TrainingRun } from '../db/db';

const DAY = 86_400_000;
/** Dias até a próxima revisão, por degrau. */
export const REVIEW_DAYS = [1, 3, 7, 14] as const;
const GOOD = 0.85;

export interface WeakSpot {
  /** Id da música nos registros (`peca-…` ou `curso-…`). */
  songId: string;
  from: number;
  to: number;
  /** Degrau da revisão (0 = acabou de errar). */
  level: number;
  /** Última vez que você tocou o trecho. */
  lastAt: number;
  /** Quando a próxima revisão vence. */
  dueAt: number;
}

const overlaps = (a: { from: number; to: number }, b: { from: number; to: number }) => a.from <= b.to && a.to >= b.from;

export function weakSpots(runs: TrainingRun[]): WeakSpot[] {
  const spots: WeakSpot[] = [];
  const sorted = runs.filter((r) => r.kind === 'timed' && (r.treinoId.startsWith('peca-') || r.treinoId.startsWith('curso-'))).sort((a, b) => a.at - b.at);
  for (const r of sorted) {
    const weak = r.weakFrom ? { from: r.weakFrom, to: r.weakTo ?? r.weakFrom } : null;
    // Passadas antigas não guardavam o trecho tocado: valem como a música inteira.
    const played = { from: r.from ?? 1, to: r.to ?? Number.MAX_SAFE_INTEGER };
    for (const s of spots) {
      if (s.songId !== r.treinoId || s.level >= REVIEW_DAYS.length || !overlaps(s, played)) continue;
      if (weak && overlaps(s, weak)) s.level = 0;
      else if ((r.accuracy ?? 0) >= GOOD && r.from !== undefined && r.from <= s.from && (r.to ?? 0) >= s.to) s.level++;
      else continue;
      s.lastAt = r.at;
    }
    if (weak && !spots.some((s) => s.songId === r.treinoId && s.level < REVIEW_DAYS.length && overlaps(s, weak))) {
      spots.push({ songId: r.treinoId, ...weak, level: 0, lastAt: r.at, dueAt: 0 });
    } else if (weak) {
      // Mesmo trecho com limites um pouco diferentes: fica com o mais recente.
      const s = spots.find((x) => x.songId === r.treinoId && x.level < REVIEW_DAYS.length && overlaps(x, weak))!;
      s.from = weak.from;
      s.to = weak.to;
    }
  }
  return spots
    .filter((s) => s.level < REVIEW_DAYS.length)
    .map((s) => ({ ...s, dueAt: s.lastAt + REVIEW_DAYS[s.level] * DAY }))
    .sort((a, b) => a.dueAt - b.dueAt);
}

/** Os que vencem até `now` (para o Hoje). */
export function dueSpots(runs: TrainingRun[], now: number, max = 3): WeakSpot[] {
  return weakSpots(runs).filter((s) => s.dueAt <= now).slice(0, max);
}
