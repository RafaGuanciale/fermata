// Gravação e leitura dos registros de treino. A sincronização pega daqui sozinha (hooks do Dexie).

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TrainingRun } from '../db/db';
import { dayKey } from './progress';

export async function saveRun(run: Omit<TrainingRun, 'at' | 'day'>): Promise<void> {
  const at = Date.now();
  try {
    await db.runs.add({ ...run, at, day: dayKey(at) });
  } catch (err) {
    console.error('[Fermata] Não foi possível salvar o treino', err);
  }
}

/** Todos os registros, atualizando sozinho. `undefined` enquanto carrega. */
export function useRuns(): TrainingRun[] | undefined {
  return useLiveQuery(() => db.runs.toArray(), []);
}

/** Maior BPM com passada limpa num treino, para a escada começar perto de onde você parou. */
export function bestCleanBpm(runs: TrainingRun[], treinoId: string): number | null {
  const clean = runs.filter((r) => r.treinoId === treinoId && r.clean && r.bpm);
  return clean.length ? Math.max(...clean.map((r) => r.bpm!)) : null;
}
