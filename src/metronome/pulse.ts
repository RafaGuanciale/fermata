// Metrônomo que some: toca N compassos e cala N, para treinar o pulso interno. E a medida do que você tocou
// nos compassos com e sem clique. Puro e testado (pulse.test.ts).

/** Opções: 0 = sempre tocando; N = N compassos com clique e N em silêncio (os primeiros N sempre tocam). */
export const GAP_OPTIONS = [0, 1, 2, 4] as const;

export function isSilentBar(totalBeat: number, beats: number, gap: number): boolean {
  if (gap <= 0) return false;
  const bar = Math.floor(totalBeat / beats);
  return bar % (2 * gap) >= gap;
}

export interface BeatMark {
  /** relógio do aparelho (performance.now) */
  t: number;
  silent: boolean;
}

export interface PulseSide {
  /** ms em média: negativo = adiantado */
  mean: number;
  count: number;
}

/**
 * Para cada nota, a distância até o tempo mais perto (só as que caem perto de um tempo: até 30% do intervalo,
 * para colcheias e outras notas entre os tempos não contarem). Separa compassos com e sem clique.
 */
export function pulseReport(noteTimes: number[], beats: BeatMark[], spbMs: number): { click: PulseSide | null; silent: PulseSide | null } {
  const acc = { click: [] as number[], silent: [] as number[] };
  if (!beats.length) return { click: null, silent: null };
  const sorted = [...beats].sort((a, b) => a.t - b.t);
  for (const t of noteTimes) {
    let best: BeatMark | null = null;
    for (const b of sorted) if (!best || Math.abs(b.t - t) < Math.abs(best.t - t)) best = b;
    if (!best || Math.abs(t - best.t) > spbMs * 0.3) continue;
    (best.silent ? acc.silent : acc.click).push(t - best.t);
  }
  const side = (xs: number[]): PulseSide | null => (xs.length >= 3 ? { mean: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), count: xs.length } : null);
  return { click: side(acc.click), silent: side(acc.silent) };
}

export function pulseText(p: PulseSide): string {
  if (Math.abs(p.mean) < 15) return 'no tempo';
  return p.mean < 0 ? `${-p.mean} ms adiantado` : `${p.mean} ms atrasado`;
}
