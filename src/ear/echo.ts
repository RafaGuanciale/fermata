// Ouvir e tocar de volta: o app toca uma frase curta, você repete de ouvido. Acertou, a próxima tem uma nota a
// mais; errou duas vezes a mesma frase, a próxima tem uma a menos. Puro e testado (echo.test.ts).

import type { Midi } from '../music/notes';

export type Rng = () => number;

export const ECHO_POOLS = {
  cinco: { label: 'Cinco notas', notes: [60, 62, 64, 65, 67] },
  escala: { label: 'Escala de Dó', notes: [60, 62, 64, 65, 67, 69, 71, 72] },
  cromatica: { label: 'Com as pretas', notes: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72] },
} as const;
export type EchoPool = keyof typeof ECHO_POOLS;

export const MIN_LEN = 2;
export const MAX_LEN = 10;

/**
 * Frase cantável: começa perto da tônica e anda quase sempre por grau conjunto (às vezes uma terça, raramente
 * um salto maior), sem a mesma nota mais de duas vezes seguidas.
 */
export function makePhrase(rng: Rng, length: number, pool: readonly Midi[]): Midi[] {
  let i = Math.floor(rng() * Math.min(3, pool.length));
  const out: Midi[] = [pool[i]];
  while (out.length < length) {
    const r = rng();
    const size = r < 0.62 ? 1 : r < 0.9 ? 2 : r < 0.97 ? 3 : 4;
    const dir = rng() < 0.5 ? -1 : 1;
    let j = i + dir * size;
    if (j < 0 || j >= pool.length) j = i - dir * size;
    j = Math.max(0, Math.min(pool.length - 1, j));
    const n = out.length;
    if (n >= 2 && out[n - 1] === pool[j] && out[n - 2] === pool[j]) continue;
    i = j;
    out.push(pool[i]);
  }
  return out;
}

export type EchoJudge = { state: 'going'; next: number } | { state: 'done' } | { state: 'wrong'; at: number; expected: Midi };

/** Confere o que já foi tocado contra a frase, nota a nota. */
export function judgeEcho(target: readonly Midi[], played: readonly Midi[]): EchoJudge {
  for (let k = 0; k < played.length; k++) if (played[k] !== target[k]) return { state: 'wrong', at: k, expected: target[k] };
  return played.length >= target.length ? { state: 'done' } : { state: 'going', next: played.length };
}

/** Tamanho da próxima frase. */
export function nextLength(len: number, ok: boolean): number {
  return Math.max(MIN_LEN, Math.min(MAX_LEN, len + (ok ? 1 : -1)));
}
