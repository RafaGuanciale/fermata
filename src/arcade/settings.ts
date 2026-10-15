// Preferências do arcade (guardadas neste aparelho) e o id dos recordes. Leve, para a página não carregar o jogo.

import { DIFFICULTIES, type Difficulty } from './arcade';

const SETTINGS_KEY = 'fermata-arcade';

/** Andamentos que a pessoa pode escolher: nunca acima do original. */
export const SPEEDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

export interface ArcadeSettings {
  wait: boolean;
  /** Fração do andamento original (o fácil ainda multiplica pelo andamento dele). */
  speed: number;
  names: boolean;
  diff: Difficulty;
}

export function readArcadeSettings(): ArcadeSettings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<ArcadeSettings>;
    const diff = DIFFICULTIES.some((d) => d.id === v.diff) ? (v.diff as Difficulty) : 'medio';
    const speed = typeof v.speed === 'number' && v.speed >= 0.5 && v.speed <= 1 ? v.speed : 1;
    return { wait: !!v.wait, speed, names: v.names ?? true, diff };
  } catch {
    return { wait: false, speed: 1, names: true, diff: 'medio' };
  }
}

export function saveArcadeSettings(s: ArcadeSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // vale só agora
  }
}

/** Recorde por música e dificuldade (o médio mantém o id antigo). */
export const arcadeRunId = (id: string, d: Difficulty = 'medio') => (d === 'medio' ? `arcade-${id}` : `arcade-${id}~${d}`);

export function parseArcadeRunId(treinoId: string): { id: string; diff: Difficulty } | null {
  if (!treinoId.startsWith('arcade-')) return null;
  const [id, d] = treinoId.slice(7).split('~');
  return { id, diff: (DIFFICULTIES.some((x) => x.id === d) ? d : 'medio') as Difficulty };
}
