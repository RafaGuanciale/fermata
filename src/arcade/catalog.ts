// Carrega a fase de qualquer música do app pelo id: as escritas à mão (songs.ts) na hora,
// as versões completas (charts/*.json) sob demanda, para não pesar a abertura do app.

import { useEffect, useState } from 'react';
import { songTune, type ArcadeTune } from './arcade';
import { chartTune } from './midi';
import { findArcadeSong, findChartSong } from './songs';

export async function loadTune(id: string): Promise<ArcadeTune | null> {
  const s = findArcadeSong(id);
  if (s) return songTune(s);
  const c = findChartSong(id);
  if (!c) return null;
  const [full, easy] = await Promise.all([c.load(), c.loadEasy?.()]);
  return chartTune(c, full, easy);
}

/** undefined enquanto carrega; null se o id não existe. */
export function useArcadeTune(id: string): ArcadeTune | null | undefined {
  const [state, setState] = useState<{ id: string; tune: ArcadeTune | null } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadTune(id).then((tune) => alive && setState({ id, tune }), () => alive && setState({ id, tune: null }));
    return () => {
      alive = false;
    };
  }, [id]);
  return state?.id === id ? state.tune : undefined;
}
