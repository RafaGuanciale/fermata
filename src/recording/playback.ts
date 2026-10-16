// Toca uma gravação com o som de piano do app e diz em que ponto ela está.

import { useCallback, useEffect, useRef, useState } from 'react';
import { audioContext } from '../training/clickTrack';
import { loadPiano, playNotes } from '../audio/synth';
import { soundingNotes, type RecNote, type RecPedal } from './take';

export function usePlayback() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const rafRef = useRef(0);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setPlaying(null);
    setProgress(0);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (id: string, notes: RecNote[], pedal: RecPedal[], durationMs: number) => {
      stop();
      const ctx = audioContext();
      if (!ctx) return;
      await loadPiano();
      const at0 = ctx.currentTime + 0.15;
      const silence = playNotes(soundingNotes(notes, pedal).map((n) => ({ midi: n.midi, at: at0 + n.t / 1000, dur: n.dur / 1000, velocity: n.vel !== null ? n.vel / 127 : 0.7 })), 0.8);
      stopRef.current = silence;
      setPlaying(id);
      const total = Math.max(500, durationMs);
      const t0 = performance.now() + 150;
      const tick = () => {
        const p = (performance.now() - t0) / total;
        if (p >= 1) {
          stopRef.current = null;
          setPlaying(null);
          setProgress(0);
          return;
        }
        setProgress(Math.max(0, p));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stop],
  );

  return { playing, progress, play, stop };
}
