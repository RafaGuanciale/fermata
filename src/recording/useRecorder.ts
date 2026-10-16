// Grava o que chega pela entrada de notas (piano, tela ou teclado do computador) e o pedal.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNoteInput } from '../input/useNoteInput';
import { captureNotes, type RawNoteEvent, type RecNote, type RecPedal } from './take';

export interface Take {
  notes: RecNote[];
  pedal: RecPedal[];
  durationMs: number;
}

/** `start(at?)` começa (opcionalmente marcando o zero num momento do relógio); `stop()` devolve o que foi tocado. */
export function useRecorder() {
  const { subscribe, subscribePedal } = useNoteInput();
  const [recording, setRecording] = useState(false);
  const state = useRef<{ zero: number; events: RawNoteEvent[]; pedal: RecPedal[] } | null>(null);

  useEffect(() => {
    const offNotes = subscribe((e) => {
      const s = state.current;
      if (s) s.events.push({ type: e.type, midi: e.midi, at: e.at, velocity: e.velocity });
    });
    const offPedal = subscribePedal((e) => {
      const s = state.current;
      if (s) s.pedal.push({ t: Math.max(0, Math.round(e.at - s.zero)), down: e.down });
    });
    return () => {
      offNotes();
      offPedal();
    };
  }, [subscribe, subscribePedal]);

  const start = useCallback((zero = performance.now()) => {
    state.current = { zero, events: [], pedal: [] };
    setRecording(true);
  }, []);

  const stop = useCallback((): Take | null => {
    const s = state.current;
    state.current = null;
    setRecording(false);
    if (!s) return null;
    const end = performance.now();
    // Começa a contar um pouco antes do zero (uma nota adiantada no primeiro tempo também entra).
    const notes = captureNotes(s.events, s.zero - 400, end).map((n) => ({ ...n, t: Math.max(0, n.t - 400) }));
    return { notes, pedal: s.pedal, durationMs: Math.max(0, Math.round(end - s.zero)) };
  }, []);

  const cancel = useCallback(() => {
    state.current = null;
    setRecording(false);
  }, []);

  return { recording, start, stop, cancel };
}
