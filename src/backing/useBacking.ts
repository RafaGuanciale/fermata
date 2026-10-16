// Toca o acompanhamento em loop, agendado um pouco à frente no relógio do Web Audio (o tempo não oscila).

import { useEffect, useRef, useState } from 'react';
import { audioContext } from '../training/clickTrack';
import { loadPiano, playNotes } from '../audio/synth';
import { barNotes, type BackingStyle } from './backing';

const AHEAD_S = 0.6;

/** `style` null = desligado. Devolve o compasso tocando agora (índice na progressão) ou -1. */
export function useBacking(style: BackingStyle | null, bpm: number, beats = 4): number {
  const [bar, setBar] = useState(-1);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  useEffect(() => {
    if (!style) {
      setBar(-1);
      return;
    }
    const ctx = audioContext();
    if (!ctx) return;
    void ctx.resume();
    void loadPiano();
    const stops: (() => void)[] = [];
    const marks: { at: number; index: number }[] = [];
    let next = ctx.currentTime + 0.25;
    let index = 0;
    const schedule = () => {
      while (next < ctx.currentTime + AHEAD_S) {
        const spb = 60 / bpmRef.current;
        const ch = style.bars[index % style.bars.length];
        stops.push(playNotes(barNotes(ch, beats).map((n) => ({ midi: n.midi, at: next + n.beat * spb, dur: n.beats * spb, velocity: n.velocity })), 0.5));
        if (stops.length > 8) stops.shift();
        marks.push({ at: next, index: index % style.bars.length });
        if (marks.length > 8) marks.shift();
        next += beats * spb;
        index++;
      }
      // Compasso que está soando agora, para a tela.
      const now = ctx.currentTime;
      const cur = [...marks].reverse().find((m) => m.at <= now);
      if (cur) setBar(cur.index);
    };
    schedule();
    const timer = window.setInterval(schedule, 60);
    return () => {
      window.clearInterval(timer);
      stops.forEach((s) => s());
      setBar(-1);
    };
  }, [style, beats]);

  return bar;
}
