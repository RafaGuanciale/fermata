import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Midi } from '../music/notes';
import { COMPUTER_KEYS, NoteInputContext, parseMidiMessage, type MidiStatus, type NoteEvent, type NoteListener, type NoteSource } from './useNoteInput';

const AUTO_KEY = 'fermata-midi-auto';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export function NoteInputProvider({ children }: { children: ReactNode }) {
  const [held, setHeld] = useState<ReadonlySet<Midi>>(() => new Set());
  const [midi, setMidi] = useState<MidiStatus>(() =>
    typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator ? { kind: 'idle' } : { kind: 'unsupported' },
  );
  const listeners = useRef(new Set<NoteListener>());
  const accessRef = useRef<MIDIAccess | null>(null);

  const emit = useCallback((type: 'on' | 'off', note: Midi, source: NoteSource, at: number = performance.now()) => {
    setHeld((prev) => {
      if (type === 'on' ? prev.has(note) : !prev.has(note)) return prev;
      const next = new Set(prev);
      if (type === 'on') next.add(note);
      else next.delete(note);
      return next;
    });
    const event: NoteEvent = { type, midi: note, at, source };
    listeners.current.forEach((l) => l(event));
  }, []);

  const subscribe = useCallback((listener: NoteListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  // Teclado do computador
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const note = COMPUTER_KEYS[e.key.toLowerCase()];
      if (note === undefined) return;
      e.preventDefault();
      emit('on', note, 'computer');
    };
    const up = (e: KeyboardEvent) => {
      const note = COMPUTER_KEYS[e.key.toLowerCase()];
      if (note !== undefined) emit('off', note, 'computer');
    };
    // Ao trocar de janela, nenhuma tecla fica "presa" acesa.
    const clear = () => setHeld(new Set());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [emit]);

  const connectMidi = useCallback(async () => {
    if (!('requestMIDIAccess' in navigator)) return;
    try {
      const access = accessRef.current ?? (await navigator.requestMIDIAccess());
      accessRef.current = access;
      const bind = () => {
        const names: string[] = [];
        access.inputs.forEach((input) => {
          names.push(input.name ?? 'Teclado MIDI');
          input.onmidimessage = (e) => {
            if (!e.data) return;
            const ev = parseMidiMessage(e.data);
            // O carimbo do MIDI é mais preciso que a hora em que o navegador entrega a mensagem.
            if (ev) emit(ev.type, ev.midi, 'midi', e.timeStamp || performance.now());
          };
        });
        setMidi(names.length ? { kind: 'connected', names } : { kind: 'waiting' });
      };
      bind();
      access.onstatechange = bind;
      try {
        localStorage.setItem(AUTO_KEY, '1');
      } catch {
        // sem armazenamento: só não reconecta sozinho na próxima visita
      }
    } catch {
      setMidi({ kind: 'denied' });
    }
  }, [emit]);

  // Quem já liberou o MIDI uma vez não precisa clicar de novo a cada visita.
  useEffect(() => {
    let auto = false;
    try {
      auto = localStorage.getItem(AUTO_KEY) === '1';
    } catch {
      auto = false;
    }
    if (auto && 'requestMIDIAccess' in navigator) void connectMidi();
  }, [connectMidi]);

  const value = useMemo(
    () => ({
      held,
      midi,
      connectMidi,
      press: (m: Midi) => emit('on', m, 'screen'),
      release: (m: Midi) => emit('off', m, 'screen'),
      subscribe,
    }),
    [held, midi, connectMidi, emit, subscribe],
  );

  return <NoteInputContext.Provider value={value}>{children}</NoteInputContext.Provider>;
}
