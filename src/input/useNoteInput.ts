// Uma única porta de entrada para notas, venham elas do piano (MIDI),
// de um clique no teclado da tela ou do teclado do computador.
// O provider guarda as notas seguradas (para o teclado fixo) e avisa quem estiver ouvindo.

import { createContext, useContext, useEffect, useRef } from 'react';
import type { Midi } from '../music/notes';

export type NoteSource = 'midi' | 'screen' | 'computer';
/** `velocity` (1–127) só vem do piano MIDI; teclado da tela e do computador não têm força. */
export type NoteEvent = { type: 'on' | 'off'; midi: Midi; at: number; source: NoteSource; velocity?: number };
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
export function parseMidiMessage(data: ArrayLike<number>): { type: 'on' | 'off'; midi: Midi; velocity?: number } | null {
  if (data.length < 3) return null;
  const command = data[0] & 0xf0;
  if (command === 0x90) return data[2] > 0 ? { type: 'on', midi: data[1], velocity: data[2] } : { type: 'off', midi: data[1] };
  if (command === 0x80) return { type: 'off', midi: data[1] };
  return null;
}

/** Pedal de sustentação (controle 64): valor 64 ou mais = abaixado. Outras mensagens → null. */
export function parsePedalMessage(data: ArrayLike<number>): { down: boolean } | null {
  if (data.length < 3) return null;
  if ((data[0] & 0xf0) !== 0xb0 || data[1] !== 64) return null;
  return { down: data[2] >= 64 };
}

export type PedalListener = (e: { down: boolean; at: number }) => void;

export interface NoteInputValue {
  held: ReadonlySet<Midi>;
  midi: MidiStatus;
  connectMidi: () => Promise<void>;
  /** Para teclas da tela: aperta e solta. */
  press: (midi: Midi) => void;
  release: (midi: Midi) => void;
  subscribe: (listener: NoteListener) => () => void;
  /** Pedal de sustentação do piano MIDI (só existe com MIDI). */
  subscribePedal: (listener: PedalListener) => () => void;
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
