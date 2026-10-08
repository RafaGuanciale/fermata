// Uma única porta de entrada para notas, venham elas do piano (MIDI),
// de um clique no teclado da tela ou do teclado do computador.
// O provider guarda as notas seguradas (para o teclado fixo) e avisa quem estiver ouvindo.

import { createContext, useContext, useEffect, useRef } from 'react';
import type { Midi } from '../music/notes';

export type NoteSource = 'midi' | 'screen' | 'computer';
export type NoteEvent = { type: 'on' | 'off'; midi: Midi; at: number; source: NoteSource };
export type NoteListener = (e: NoteEvent) => void;

export type MidiStatus =
  | { kind: 'unsupported' }
  | { kind: 'idle' }
  | { kind: 'denied' }
  | { kind: 'waiting' } // acesso liberado, nenhum teclado conectado
  | { kind: 'connected'; names: string[] };

// Teclado do computador → Dó4 a Dó5. Linha do meio = brancas; linha de cima = pretas.
export const COMPUTER_KEYS: Record<string, Midi> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72,
};

/** Mensagem MIDI → evento de nota. "Note on" com força 0 conta como tecla solta. */
export function parseMidiMessage(data: ArrayLike<number>): { type: 'on' | 'off'; midi: Midi } | null {
  if (data.length < 3) return null;
  const command = data[0] & 0xf0;
  if (command === 0x90) return { type: data[2] > 0 ? 'on' : 'off', midi: data[1] };
  if (command === 0x80) return { type: 'off', midi: data[1] };
  return null;
}

export interface NoteInputValue {
  held: ReadonlySet<Midi>;
  midi: MidiStatus;
  connectMidi: () => Promise<void>;
  /** Para teclas da tela: aperta e solta. */
  press: (midi: Midi) => void;
  release: (midi: Midi) => void;
  subscribe: (listener: NoteListener) => () => void;
}

export const NoteInputContext = createContext<NoteInputValue | null>(null);

export function useNoteInput(): NoteInputValue {
  const ctx = useContext(NoteInputContext);
  if (!ctx) throw new Error('useNoteInput precisa estar dentro de NoteInputProvider');
  return ctx;
}

/** Chama `onNoteOn` a cada tecla abaixada, de qualquer origem. */
export function useNoteOn(onNoteOn: (midi: Midi, at: number, source: NoteSource) => void) {
  const { subscribe } = useNoteInput();
  const ref = useRef(onNoteOn);
  ref.current = onNoteOn;
  useEffect(() => subscribe((e) => { if (e.type === 'on') ref.current(e.midi, e.at, e.source); }), [subscribe]);
}

export function midiStatusLabel(status: MidiStatus): string {
  switch (status.kind) {
    case 'unsupported': return 'Sem MIDI neste navegador';
    case 'idle': return 'Conectar piano';
    case 'waiting': return 'Nenhum piano encontrado';
    case 'denied': return 'MIDI bloqueado';
    case 'connected': return status.names[0];
  }
}
