// Som das notas: o Fermata toca o que você toca (piano por MIDI, teclado da tela ou do computador), com o pedal,
// em todas as telas. Ligado por padrão, baixinho, para conferir de ouvido e para tocar só pelo computador
// (fone, ou o piano desligado). Volume e liga/desliga ficam guardados neste aparelho.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNoteInput } from '../input/useNoteInput';
import { loadPiano, startLiveNote } from './synth';
import { audioContext } from '../training/clickTrack';

const KEY = 'fermata-note-sound';
/** Volume inicial: baixo, para não brigar com o som do próprio piano. */
export const DEFAULT_VOLUME = 0.3;

interface LiveSoundState {
  on: boolean;
  setOn: (on: boolean) => void;
  /** 0 a 1. */
  volume: number;
  setVolume: (v: number) => void;
  /** O navegador só libera o som depois de um clique na página. */
  ready: boolean;
}

const Ctx = createContext<LiveSoundState>({ on: false, setOn: () => undefined, volume: DEFAULT_VOLUME, setVolume: () => undefined, ready: true });

// eslint-disable-next-line react-refresh/only-export-components
export const useLiveSound = () => useContext(Ctx);

function readSaved(): { on: boolean; volume: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { on?: boolean; volume?: number } | null;
    const volume = typeof v?.volume === 'number' && v.volume >= 0 && v.volume <= 1 ? v.volume : DEFAULT_VOLUME;
    return { on: v?.on ?? true, volume };
  } catch {
    return { on: true, volume: DEFAULT_VOLUME };
  }
}

function save(on: boolean, volume: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ on, volume }));
  } catch {
    // vale só nesta visita
  }
}

export function LiveSoundProvider({ children }: { children: ReactNode }) {
  const { subscribe, subscribePedal } = useNoteInput();
  const [saved] = useState(readSaved);
  const [on, setOnState] = useState(saved.on);
  const [volume, setVolumeState] = useState(saved.volume);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const [ready, setReady] = useState(() => audioContext()?.state === 'running');
  const voices = useRef(new Map<number, () => void>());
  const sustained = useRef(new Set<number>());
  const pedal = useRef(false);

  const setVolume = (v: number) => {
    const x = Math.max(0, Math.min(1, v));
    setVolumeState(x);
    save(on, x);
  };

  const setOn = (v: boolean) => {
    setOnState(v);
    save(v, volume);
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
        if (volumeRef.current <= 0.001) return;
        voices.current.set(e.midi, startLiveNote(e.midi, e.velocity !== undefined ? e.velocity / 127 : 0.6, volumeRef.current));
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

  return <Ctx.Provider value={{ on, setOn, volume, setVolume, ready }}>{children}</Ctx.Provider>;
}
