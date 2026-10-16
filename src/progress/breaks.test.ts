import { describe, expect, it } from 'vitest';
import { breakDue } from './breaks';

const M = 60_000;
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

describe('pausa para o corpo', () => {
  it('avisa depois de 45 minutos seguidos tocando', () => {
    expect(breakDue(range(1000, 1044), 1044 * M, null)).toBe(false);
    expect(breakDue(range(1000, 1045), 1045 * M, null)).toBe(true);
  });

  it('um buraco de mais de 10 minutos zera a conta; minutos sem nota dentro do buraco pequeno não', () => {
    expect(breakDue([...range(1000, 1020), ...range(1040, 1070)], 1070 * M, null)).toBe(false);
    expect(breakDue([...range(1000, 1020, 3), ...range(1025, 1046)], 1046 * M, null)).toBe(true);
  });

  it('depois do aviso, só de novo 45 minutos depois; parado não avisa', () => {
    expect(breakDue(range(1000, 1060), 1060 * M, 1045 * M)).toBe(false);
    expect(breakDue(range(1000, 1090), 1090 * M, 1045 * M)).toBe(true);
    expect(breakDue(range(1000, 1050), 1056 * M, null)).toBe(false);
  });
});
