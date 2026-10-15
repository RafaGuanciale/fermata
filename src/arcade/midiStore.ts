// MIDIs importados no arcade: guardados só neste aparelho (tabela arcadeMidi, fora da sincronização).

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ArcadeMidi } from '../db/db';
import { guessParts, midiTune, parseMidi } from './midi';
import type { ArcadeTune } from './arcade';

/** Maior arquivo aceito (um MIDI de música inteira raramente passa de 200 KB). */
export const MIDI_MAX_BYTES = 2 * 1024 * 1024;

export function useArcadeMidis(): ArcadeMidi[] | undefined {
  return useLiveQuery(() => db.arcadeMidi.orderBy('addedAt').reverse().toArray(), []);
}

export function useArcadeMidi(id: string): ArcadeMidi | null | undefined {
  return useLiveQuery(async () => (await db.arcadeMidi.get(id)) ?? null, [id]);
}

/** Lê o arquivo, confere se é MIDI, adivinha melodia e baixo e guarda. Devolve o id. */
export async function importMidi(file: File): Promise<string> {
  if (file.size > MIDI_MAX_BYTES) throw new Error('Arquivo grande demais para um MIDI (máximo de 2 MB).');
  const data = await file.arrayBuffer();
  const parsed = parseMidi(data);
  const { melody, bass } = guessParts(parsed);
  const id = `midi-${crypto.randomUUID().slice(0, 8)}`;
  const title = (parsed.title && parsed.title.length > 2 ? parsed.title : file.name.replace(/\.(mid|midi|kar)$/i, '')).replace(/[_-]+/g, ' ').trim();
  await db.arcadeMidi.put({ id, title, data, melody, bass, addedAt: Date.now() });
  return id;
}

export async function updateMidi(id: string, patch: Partial<Pick<ArcadeMidi, 'title' | 'melody' | 'bass'>>) {
  await db.arcadeMidi.update(id, patch);
}

export async function deleteMidi(id: string) {
  await db.arcadeMidi.delete(id);
}

export function tuneOf(m: ArcadeMidi): ArcadeTune {
  return midiTune(parseMidi(m.data), { melody: m.melody, bass: m.bass }, { id: m.id, title: m.title });
}
