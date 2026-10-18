// Evolução por habilidade, para o Progresso: cada uma responde uma pergunta e compara as últimas 4 semanas com
// as 4 anteriores. Puro e testado (skills.test.ts).

import type { TrainingRun } from '../db/db';

const DAY = 86_400_000;
const WINDOW = 28 * DAY;

export interface Compare<T> {
  now: T | null;
  before: T | null;
}

const inWindow = (r: TrainingRun, now: number, back: number) => r.at > now - back - WINDOW && r.at <= now - back;

/** Leitura: tempo médio para tocar a nota que aparece e acerto de primeira, em todos os exercícios de leitura. */
export function readingSummary(runs: TrainingRun[], now: number): Compare<{ ms: number; firstTry: number; rounds: number }> {
  const pick = (back: number) => {
    const rs = runs.filter((r) => r.avgMs && (r.kind === 'names' || r.kind === 'locate') && inWindow(r, now, back));
    if (!rs.length) return null;
    const ms = rs.reduce((s, r) => s + r.avgMs!, 0) / rs.length;
    const ft = rs.filter((r) => r.firstTry !== undefined);
    return { ms: Math.round(ms), firstTry: ft.length ? Math.round((ft.reduce((s, r) => s + r.firstTry!, 0) / ft.length) * 1000) / 1000 : 0, rounds: rs.length };
  };
  return { now: pick(0), before: pick(WINDOW) };
}

/** Ouvido: maior frase repetida de ouvido (Ouvir e tocar de volta). */
export function earSummary(runs: TrainingRun[], now: number): Compare<number> {
  const pick = (back: number) => {
    const rs = runs.filter((r) => r.treinoId === 'eco' && (r.level ?? 0) > 0 && inWindow(r, now, back));
    return rs.length ? Math.max(...rs.map((r) => r.level!)) : null;
  };
  return { now: pick(0), before: pick(WINDOW) };
}

export interface SongProgress {
  id: string;
  /** melhor andamento com passada limpa */
  bestClean: number | null;
  /** melhor acerto em qualquer passada */
  bestAccuracy: number;
  /** acerto médio das últimas 4 semanas e das 4 anteriores */
  accuracy: Compare<number>;
  /** passadas nos últimos 7 dias */
  week: number;
  last: number;
}

/** Músicas (do repertório e do curso) tocadas no Tocar junto. */
export function songsProgress(runs: TrainingRun[], now: number): SongProgress[] {
  const by = new Map<string, TrainingRun[]>();
  for (const r of runs) {
    if (r.kind !== 'timed' || !(r.treinoId.startsWith('peca-') || r.treinoId.startsWith('curso-'))) continue;
    by.set(r.treinoId, [...(by.get(r.treinoId) ?? []), r]);
  }
  const mean = (rs: TrainingRun[]) => (rs.length ? rs.reduce((s, r) => s + (r.accuracy ?? 0), 0) / rs.length : null);
  return [...by.entries()]
    .map(([id, rs]) => ({
      id,
      bestClean: rs.reduce<number | null>((m, r) => (r.clean && r.bpm ? Math.max(m ?? 0, r.bpm) : m), null),
      bestAccuracy: Math.max(...rs.map((r) => r.accuracy ?? 0)),
      accuracy: { now: mean(rs.filter((r) => inWindow(r, now, 0))), before: mean(rs.filter((r) => inWindow(r, now, WINDOW))) },
      week: rs.filter((r) => r.at > now - 7 * DAY).length,
      last: Math.max(...rs.map((r) => r.at)),
    }))
    .sort((a, b) => b.last - a.last);
}

/** Texto curto da comparação: "antes 2,1 s" etc. Null quando não há o antes. */
export function trend(now: number | null, before: number | null, lowerIsBetter = false): 'melhor' | 'pior' | 'igual' | null {
  if (now === null || before === null) return null;
  const rel = before === 0 ? 0 : (now - before) / Math.abs(before);
  if (Math.abs(rel) < 0.03) return 'igual';
  return (rel < 0) === lowerIsBetter ? 'melhor' : 'pior';
}

/**
 * Notas que você mais erra na leitura, juntando a Leitura de notas (tabela notes, taxa de acerto de primeira)
 * e as sessões antigas de notas soltas. Só as vistas há menos de 30 dias e pelo menos 3 vezes.
 */
export function weakReading(stats: { midi: number; seen: number; acc: number; lastAt: number }[], fromSessions: { midi: number; missRate: number }[], now: number, top = 5): { midi: number; missRate: number }[] {
  const by = new Map<number, number>();
  for (const s of stats) {
    if (s.seen < 3 || now - s.lastAt > 30 * DAY) continue;
    const miss = 1 - s.acc;
    if (miss >= 0.2) by.set(s.midi, Math.max(by.get(s.midi) ?? 0, miss));
  }
  for (const w of fromSessions) by.set(w.midi, Math.max(by.get(w.midi) ?? 0, w.missRate));
  return [...by.entries()].map(([midi, missRate]) => ({ midi, missRate })).sort((a, b) => b.missRate - a.missRate).slice(0, top);
}
