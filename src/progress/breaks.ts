// Pausa para o corpo: depois de 45 minutos tocando sem parar (sem buraco de 10 minutos), um aviso discreto.
// Puro e testado (breaks.test.ts).

const MIN = 60_000;
export const BREAK_AFTER_MIN = 45;
const GAP_MIN = 10;

/**
 * `minutes`: minutos (Date.now()/60000, arredondado para baixo) em que houve nota, em ordem.
 * `lastNudge`: quando o último aviso apareceu (ms). Devolve true se é hora de avisar agora.
 */
export function breakDue(minutes: number[], now: number, lastNudge: number | null): boolean {
  if (!minutes.length) return false;
  const nowMin = Math.floor(now / MIN);
  const last = minutes[minutes.length - 1];
  if (nowMin - last > 2) return false; // não está tocando agora
  let start = last;
  for (let i = minutes.length - 2; i >= 0; i--) {
    if (start - minutes[i] > GAP_MIN) break;
    start = minutes[i];
  }
  const from = Math.max(start, lastNudge !== null ? Math.floor(lastNudge / MIN) : -Infinity);
  return nowMin - from >= BREAK_AFTER_MIN;
}
