// "Som do app": o Fermata toca o que você toca (piano por MIDI, teclado da tela ou do computador), com o pedal.
// Para estudar de fone no computador, com o volume do piano no zero. A escolha fica guardada neste aparelho.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNoteInput } from '../input/useNoteInput';
import { loadPiano, startLiveNote } from './synth';
import { audioContext } from '../training/clickTrack';

const KEY = 'fermata-key-sound';

interface LiveSoundState {
  on: boolean;
  setOn: (on: boolean) => void;
  /** O navegador só libera o som depois de um clique na página. */
  ready: boolean;
}

const Ctx = createContext<LiveSoundState>({ on: false, setOn: () => undefined, ready: true });

// eslint-disable-next-line react-refresh/only-export-components
export const useLiveSound = () => useContext(Ctx);

function readOn(): boolean {
  try {
    return localStorage.getItem(KEY) === 'app';
  } catch {
    return false;
  }
}

export function LiveSoundProvider({ children }: { children: ReactNode }) {
  const { subscribe, subscribePedal } = useNoteInput();
  const [on, setOnState] = useState(readOn);
  const [ready, setReady] = useState(() => audioContext()?.state === 'running');
  const voices = useRef(new Map<number, () => void>());
  const sustained = useRef(new Set<number>());
  const pedal = useRef(false);

  const setOn = (v: boolean) => {
    setOnState(v);
    try {
      localStorage.setItem(KEY, v ? 'app' : 'piano');
    } catch {
      // vale só nesta visita
    }
    if (v) {
      const ctx = audioContext();
      void ctx?.resume().then(() => setReady(true));
      void loadPiano();
    }
  };

  // O primeiro clique ou tecla na página libera o áudio (regra dos navegadores).
  useEffect(() => {
    if (!on) return;
    void loadPiano();
    const unlock = () => {
      const ctx = audioContext();
      void ctx?.resume().then(() => setReady(ctx.state === 'running'));
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const releaseAll = () => {
      voices.current.forEach((stop) => stop());
      voices.current.clear();
      sustained.current.clear();
    };
    const offNotes = subscribe((e) => {
      if (e.type === 'on') {
        voices.current.get(e.midi)?.();
        sustained.current.delete(e.midi);
        // Teclado da tela e do computador não têm força: soa como um toque médio.
        voices.current.set(e.midi, startLiveNote(e.midi, e.velocity !== undefined ? e.velocity / 127 : 0.6));
      } else if (pedal.current) {
        sustained.current.add(e.midi);
      } else {
        voices.current.get(e.midi)?.();
        voices.current.delete(e.midi);
      }
    });
    const offPedal = subscribePedal((e) => {
      pedal.current = e.down;
      if (!e.down) {
        sustained.current.forEach((m) => {
          voices.current.get(m)?.();
          voices.current.delete(m);
        });
        sustained.current.clear();
      }
    });
    return () => {
      offNotes();
      offPedal();
      releaseAll();
    };
  }, [on, subscribe, subscribePedal]);

  return <Ctx.Provider value={{ on, setOn, ready }}>{children}</Ctx.Provider>;
}
