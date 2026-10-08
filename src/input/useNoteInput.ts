// Uma única porta de entrada para "nota tocada", venha ela do piano (MIDI),
// de um clique no teclado da tela ou do teclado do computador.
// O treino só conhece onNote(midi, at) e não sabe de onde a nota veio.

import { useEffect, useRef, useState } from 'react';
import type { Midi } from '../music/notes';

export type NoteSource = 'midi' | 'screen' | 'computer';
export type NoteHandler = (midi: Midi, at: number, source: NoteSource) => void;

export type MidiStatus =
  | { kind: 'unsupported' }
  | { kind: 'idle' }
  | { kind: 'denied' }
  | { kind: 'waiting' } // acesso liberado, nenhum teclado conectado
  | { kind: 'connected'; names: string[] };

// Teclado do computador → notas de Dó4 a Dó5, como num app de piano.
// Linha do meio = teclas brancas; linha de cima = teclas pretas.
export const COMPUTER_KEYS: Record<string, Midi> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72,
};

/** Mensagem MIDI → nota, só para "tecla abaixada" com força > 0. */
export function parseMidiMessage(data: ArrayLike<number>): Midi | null {
  if (data.length < 3) return null;
  const command = data[0] & 0xf0;
  const velocity = data[2];
  return command === 0x90 && velocity > 0 ? data[1] : null;
}

export function useNoteInput(onNote: NoteHandler, { computerKeys = true } = {}) {
  const handler = useRef(onNote);
  handler.current = onNote;
  const [midi, setMidi] = useState<MidiStatus>(() =>
    typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator ? { kind: 'idle' } : { kind: 'unsupported' },
  );
  const accessRef = useRef<MIDIAccess | null>(null);

  // Teclado do computador
  useEffect(() => {
    if (!computerKeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const note = COMPUTER_KEYS[e.key.toLowerCase()];
      if (note !== undefined) {
        e.preventDefault();
        handler.current(note, performance.now(), 'computer');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [computerKeys]);

  // Libera os ouvintes MIDI ao sair da tela
  useEffect(() => () => {
    const access = accessRef.current;
    if (!access) return;
    access.onstatechange = null;
    access.inputs.forEach((input) => { input.onmidimessage = null; });
  }, []);

  async function connectMidi() {
    if (midi.kind === 'unsupported') return;
    try {
      const access = await navigator.requestMIDIAccess();
      accessRef.current = access;
      const bind = () => {
        const names: string[] = [];
        access.inputs.forEach((input) => {
          names.push(input.name ?? 'Teclado MIDI');
          input.onmidimessage = (e) => {
            if (!e.data) return;
            const note = parseMidiMessage(e.data);
            if (note !== null) handler.current(note, performance.now(), 'midi');
          };
        });
        setMidi(names.length ? { kind: 'connected', names } : { kind: 'waiting' });
      };
      bind();
      access.onstatechange = bind;
    } catch {
      setMidi({ kind: 'denied' });
    }
  }

  const press = (note: Midi) => handler.current(note, performance.now(), 'screen');

  return { midi, connectMidi, press };
}
