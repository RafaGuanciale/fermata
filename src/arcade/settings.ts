// Preferências do arcade (guardadas neste aparelho) e o id dos recordes. Leve, para a página não carregar o jogo.

import { DIFFICULTIES, type Difficulty } from './arcade';

const SETTINGS_KEY = 'fermata-arcade';

export interface ArcadeSettings {
  wait: boolean;
  slow: boolean;
  names: boolean;
  diff: Difficulty;
}

export function readArcadeSettings(): ArcadeSettings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<ArcadeSettings>;
    const diff = DIFFICULTIES.some((d) => d.id === v.diff) ? (v.diff as Difficulty) : 'medio';
    return { wait: !!v.wait, slow: v.slow ?? true, names: v.names ?? true, diff };
  } catch {
    return { wait: false, slow: true, names: true, diff: 'medio' };
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
