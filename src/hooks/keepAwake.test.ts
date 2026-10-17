import { describe, expect, it } from 'vitest';
import { shouldKeepAwake } from './keepAwake';

describe('manter a tela acesa', () => {
  it('fica acesa com atividade recente e a aba visível; solta depois de 15 minutos parado ou com a aba escondida', () => {
    const t = 1_000_000_000;
    expect(shouldKeepAwake(t, t + 14 * 60_000, true)).toBe(true);
    expect(shouldKeepAwake(t, t + 15 * 60_000, true)).toBe(false);
    expect(shouldKeepAwake(t, t + 60_000, false)).toBe(false);
  });
});
