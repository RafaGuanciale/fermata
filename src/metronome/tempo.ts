// Contas do metrônomo. Funções puras, testadas em tempo.test.ts.

export const MIN_BPM = 30;
export const MAX_BPM = 240;
export const BEAT_OPTIONS = [2, 3, 4, 6] as const;

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return 80;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

/** Segundos entre um tempo e o próximo. */
export function secondsPerBeat(bpm: number): number {
  return 60 / clampBpm(bpm);
}

/**
 * Tap tempo: média dos últimos intervalos entre toques (em ms).
 * Um intervalo maior que 2 s recomeça a contagem. Precisa de pelo menos 2 toques.
 */
export function bpmFromTaps(taps: number[]): number | null {
  const recent: number[] = [];
  for (let i = taps.length - 1; i > 0 && recent.length < 6; i--) {
    const gap = taps[i] - taps[i - 1];
    if (gap <= 0 || gap > 2000) break;
    recent.push(gap);
  }
  if (!recent.length) return null;
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return clampBpm(60000 / avg);
}

/** Nome tradicional do andamento, para dar uma referência. */
export function tempoName(bpm: number): string {
  const b = clampBpm(bpm);
  if (b < 60) return 'Largo';
  if (b < 76) return 'Adagio';
  if (b < 108) return 'Andante';
  if (b < 120) return 'Moderato';
  if (b < 168) return 'Allegro';
  return 'Presto';
}
