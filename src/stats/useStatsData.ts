// Carrega tudo o que as Estatísticas e o Progresso usam e monta as passadas (com o nome de cada música).

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AppEvent, type PracticeDay, type Recording, type Session as OldSession, type TrainingRun } from '../db/db';
import { findSong } from '../course';
import { ALL_TRACKS } from '../course/track';
import { parseArcadeRunId } from '../arcade/settings';
import { ARCADE_CATALOG } from '../arcade/songs';
import { buildPasses, type Pass } from './model';
import { studiedSplit, type Engagement } from './focus';

export interface StatsData {
  passes: Pass[];
  runs: TrainingRun[];
  events: AppEvent[];
  practice: PracticeDay[];
  sessions: OldSession[];
  recordings: Recording[];
  titleOf: (sourceId: string) => string | null;
  /** endereço para tocar a música (curso ou repertório) */
  routeOf: (sourceId: string) => string | null;
  /** conta como estudo? (src/stats/focus.ts): as análises só olham para isso */
  isStudied: (sourceId: string) => boolean;
  /** músicas só exploradas (abertas para ver, sem estudar) */
  explored: Map<string, Engagement & { title: string }>;
}

const techTitle = new Map<string, string>(ALL_TRACKS.flatMap((t) => t.technique.map((i): [string, string] => [`tec-${i.id}`, i.title])));

export function useStatsData(): StatsData | undefined {
  const raw = useLiveQuery(async () => {
    const [takes, runs, events, practice, sessions, recordings, pieces] = await Promise.all([
      db.takes.toArray(),
      db.runs.toArray(),
      db.events.toArray(),
      db.practice.toArray(),
      db.sessions.toArray(),
      db.recordings.toArray(),
      db.pieces.toArray(),
    ]);
    return { takes, runs, events, practice, sessions, recordings, pieces };
  }, []);

  return useMemo(() => {
    if (!raw) return undefined;
    const byKey = new Map(raw.pieces.map((p) => [`peca-${p.uid ?? p.id}`, p]));
    const titleOf = (id: string): string | null => {
      if (id.startsWith('curso-')) return findSong(id.slice(6))?.title ?? null;
      if (id.startsWith('peca-')) return byKey.get(id)?.title ?? null;
      if (id.startsWith('tec-')) return techTitle.get(id) ?? null;
      if (id.startsWith('ex:')) return id.slice(3);
      const arcade = parseArcadeRunId(id);
      if (arcade) return ARCADE_CATALOG.find((s) => s.id === arcade.id)?.title ?? null;
      return null;
    };
    const routeOf = (id: string): string | null => {
      if (id.startsWith('curso-')) {
        const s = findSong(id.slice(6));
        return s ? `/curso/musica/${s.id}` : null;
      }
      const p = byKey.get(id);
      return p ? `/peca/${p.id}/estudar` : null;
    };
    const passes = buildPasses(raw.takes, raw.runs, titleOf);
    const { studied, explored } = studiedSplit(passes, (id) => byKey.get(id)?.status ?? null);
    return {
      passes,
      isStudied: (id: string) => !id.startsWith('peca-') || studied.has(id),
      explored,
      runs: raw.runs,
      events: raw.events.sort((a, b) => a.at - b.at),
      practice: raw.practice,
      sessions: raw.sessions,
      recordings: raw.recordings,
      titleOf,
      routeOf,
    };
  }, [raw]);
}
