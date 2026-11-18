// Pauta dupla: as duas mãos em colunas comuns, para que notas tocadas juntas fiquem uma em cima da outra.
// Puro e testado (grandStaff.test.ts). Quem desenha é o Staff, uma vez por mão, com as mesmas colunas.

import type { TimedTask } from './types';

type Line = TimedTask['display'];

export interface Columns {
  /** Tempo (escrito) em que cada coluna começa. */
  starts: number[];
  /** Para cada coluna, o índice da figura da direita que começa ali (ou undefined). */
  upper: (number | undefined)[];
  /** O mesmo para a esquerda. */
  lower: (number | undefined)[];
}

const startsOf = (line: Line) => {
  let b = 0;
  return line.map((d) => {
    const at = b;
    b += d.beats;
    return at;
  });
};

const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** Junta as duas linhas por tempo. Sem `lower`, uma coluna por figura da direita. */
export function grandColumns(upper: Line, lower?: Line): Columns {
  const up = startsOf(upper);
  if (!lower?.length) return { starts: up, upper: up.map((_, i) => i), lower: up.map(() => undefined) };
  const lo = startsOf(lower);
  const all = [...up, ...lo].sort((a, b) => a - b).filter((v, i, a) => i === 0 || !same(v, a[i - 1]));
  return {
    starts: all,
    upper: all.map((t) => {
      const i = up.findIndex((u) => same(u, t));
      return i >= 0 ? i : undefined;
    }),
    lower: all.map((t) => {
      const i = lo.findIndex((u) => same(u, t));
      return i >= 0 ? i : undefined;
    }),
  };
}

/** Uma linha por coluna: a figura que começa ali, ou undefined. */
export function spread<T>(cols: (number | undefined)[], values: T[]): (T | undefined)[] {
  return cols.map((i) => (i === undefined ? undefined : values[i]));
}
