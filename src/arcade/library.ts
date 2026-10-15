// A biblioteca do arcade: todas as músicas (do app e importadas) com a dificuldade calculada e o palco.
// Uma música importada cai sozinha no palco certo, pelo mesmo cálculo das músicas do app.

import { useEffect, useState } from 'react';
import type { ArcadeMidi } from '../db/db';
import { difficultyScore, intensityOf, stageOf, type ArcadeTune, type StageId } from './arcade';
import { loadTune } from './catalog';
import { tuneOf } from './midiStore';
import { ARCADE_CATALOG } from './songs';

export interface LibraryEntry {
  id: string;
  title: string;
  artist: string;
  tag: string;
  midi: boolean;
  score: number;
  stage: StageId;
  intensity: number;
  /** Se tem modo fácil (some quando simplificar descaracteriza a música). */
  easy: boolean;
}

function entryOf(t: ArcadeTune, tag: string, midi: boolean): LibraryEntry {
  const score = difficultyScore(t.chart('medio'), t.chart('dificil'));
  return { id: t.id, title: t.title, artist: t.artist, tag, midi, score, stage: stageOf(score), intensity: intensityOf(score), easy: t.available.includes('facil') };
}

let builtIn: Promise<LibraryEntry[]> | null = null;

/** As músicas do app (calculadas uma vez por visita). */
function builtInEntries(): Promise<LibraryEntry[]> {
  builtIn ??= Promise.all(
    ARCADE_CATALOG.map(async (c) => {
      const t = await loadTune(c.id);
      return t ? entryOf(t, c.tag, false) : null;
    }),
  ).then((xs) => xs.filter((x): x is LibraryEntry => x !== null));
  return builtIn;
}

export function midiEntry(m: ArcadeMidi): LibraryEntry | null {
  try {
    return entryOf(tuneOf(m), 'Sua música', true);
  } catch {
    return null;
  }
}

/** undefined enquanto calcula. */
export function useArcadeLibrary(midis: ArcadeMidi[] | undefined): LibraryEntry[] | undefined {
  const [apps, setApps] = useState<LibraryEntry[] | undefined>(undefined);
  const [mine, setMine] = useState<LibraryEntry[]>([]);
  useEffect(() => {
    let alive = true;
    void builtInEntries().then((xs) => alive && setApps(xs));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    setMine((midis ?? []).map(midiEntry).filter((x): x is LibraryEntry => x !== null));
  }, [midis]);
  return apps && [...apps, ...mine];
}
