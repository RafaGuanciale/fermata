import { describe, expect, it } from 'vitest';
import { isComboMilestone, starsFor, streakMilestone, streakOf } from './rewards';

describe('recompensas', () => {
  it('estrelas pela precisão, relativas ao mínimo', () => {
    expect(starsFor(0.8, 0.85)).toBe(0);
    expect(starsFor(0.85, 0.85)).toBe(1);
    expect(starsFor(0.91, 0.85)).toBe(2);
    expect(starsFor(0.97, 0.85)).toBe(3);
    expect(starsFor(1, 0.85)).toBe(3);
    // Sem mínimo (aquecimento): 3 estrelas só perto de 100%.
    expect(starsFor(0.5, 0)).toBe(2);
    expect(starsFor(0.3, 0)).toBe(1);
    expect(starsFor(0.97, 0)).toBe(3);
  });

  it('sequência de acertos e marcos', () => {
    expect(streakOf([true, false, true, true, true])).toBe(3);
    expect(streakOf([false])).toBe(0);
    expect(isComboMilestone(5)).toBe(true);
    expect(isComboMilestone(6)).toBe(false);
    expect(streakMilestone(7)).toBe(7);
    expect(streakMilestone(8)).toBeNull();
  });
});
