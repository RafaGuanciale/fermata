// Recompensas do estudo: estrelas por precisão, sequência de acertos e marcos de dias seguidos. Puro e testado.

/**
 * Estrelas de uma passada: 0 abaixo do mínimo; 1 no mínimo; 2 a meio caminho entre o mínimo e 100%;
 * 3 perto da perfeição (pelo menos 97%, ou 80% do caminho entre o mínimo e 100%, o que for maior).
 */
export function starsFor(accuracy: number, pass: number): 0 | 1 | 2 | 3 {
  if (accuracy < pass - 1e-9) return 0;
  const room = 1 - pass;
  if (accuracy >= Math.max(0.97, pass + room * 0.8) - 1e-9) return 3;
  if (accuracy >= pass + room * 0.4 - 1e-9) return 2;
  return 1;
}

/** Acertos de primeira seguidos, contando do fim. */
export function streakOf(results: boolean[]): number {
  let n = 0;
  for (let i = results.length - 1; i >= 0 && results[i]; i--) n++;
  return n;
}

/** Sequências que merecem um destaque a mais: 5, 10, 15… */
export const isComboMilestone = (n: number) => n >= 5 && n % 5 === 0;

/** Marcos de dias seguidos que ganham comemoração. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

/** O marco atingido hoje (se `days` é exatamente um marco), ou null. */
export const streakMilestone = (days: number) => (STREAK_MILESTONES.includes(days) ? days : null);
