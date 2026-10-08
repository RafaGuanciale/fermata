import type { Midi } from './notes';

export type ExerciseKind = 'locate' | 'song';

export interface Exercise {
  id: string;
  kind: ExerciseKind;
  title: string;
  subtitle: string;
  notes: Midi[];
  /** Notas que o exercício usa, para acender no teclado da tela inicial. */
  range: Midi[];
}

/** Posição de Dó: Dó4 a Sol4, um dedo por tecla. */
export const C_POSITION: Midi[] = [60, 62, 64, 65, 67];

/** Ode à Alegria, primeiros quatro compassos (posição de Dó). */
export const ODE_TO_JOY: Midi[] = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];

/** Gerador pseudoaleatório determinístico (mulberry32), para testes reproduzíveis. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sequência para treinar localização de notas.
 * Não é sorteio puro: a maior parte dos movimentos é por grau vizinho ou salto de terça,
 * como numa melodia real, com um salto maior de vez em quando. Nunca repete a mesma nota
 * duas vezes seguidas, para que cada nota exija uma leitura nova.
 */
export function generateLocateSequence(pool: Midi[], length: number, rand: () => number = Math.random): Midi[] {
  if (pool.length < 2) throw new Error('O exercício precisa de pelo menos duas notas.');
  const sorted = [...pool].sort((a, b) => a - b);
  const out: number[] = [];
  let i = Math.floor(rand() * sorted.length);
  out.push(sorted[i]);
  while (out.length < length) {
    const r = rand();
    // 60% grau vizinho, 30% terça, 10% qualquer outra nota.
    const size = r < 0.6 ? 1 : r < 0.9 ? 2 : 0;
    let next: number;
    if (size === 0) {
      do next = Math.floor(rand() * sorted.length); while (next === i);
    } else {
      const dir = rand() < 0.5 ? -1 : 1;
      next = i + dir * size;
      if (next < 0 || next >= sorted.length) next = i - dir * size;
      if (next < 0 || next >= sorted.length) next = i === 0 ? 1 : i - 1;
    }
    i = next;
    out.push(sorted[i]);
  }
  return out;
}

export function makeExercise(kind: ExerciseKind, rand: () => number = Math.random): Exercise {
  if (kind === 'song') {
    return {
      id: 'ode-to-joy-1',
      kind,
      title: 'Ode à Alegria, primeiros compassos',
      subtitle: 'Beethoven · posição de Dó',
      notes: ODE_TO_JOY,
      range: C_POSITION,
    };
  }
  return {
    id: 'locate-c-position',
    kind,
    title: 'Notas soltas de Dó a Sol',
    subtitle: 'Clave de sol · posição de Dó',
    notes: generateLocateSequence(C_POSITION, 12, rand),
    range: C_POSITION,
  };
}
