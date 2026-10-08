// Um som de piano simples feito no Web Audio, para ouvir o trecho e a outra mão.
// Não é um piano sampleado: é um timbre suave com ataque rápido e queda, o bastante para guiar.

import { audioContext } from '../training/clickTrack';

export interface SynthNote {
  midi: number;
  /** segundos no relógio do Web Audio */
  at: number;
  /** segundos */
  dur: number;
  velocity?: number;
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Agenda notas e devolve uma função que cala tudo. */
export function playNotes(notes: SynthNote[], volume = 0.35): () => void {
  const ctx = audioContext();
  if (!ctx) return () => undefined;
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = volume;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 3200;
  filter.connect(master).connect(ctx.destination);
  const nodes: OscillatorNode[] = [];
  for (const n of notes) {
    const v = (n.velocity ?? 0.8) * 0.5;
    const end = n.at + Math.max(0.15, Math.min(n.dur, 4)) + 0.25;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, n.at);
    gain.gain.exponentialRampToValueAtTime(v, n.at + 0.008);
    gain.gain.exponentialRampToValueAtTime(v * 0.35, n.at + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.connect(filter);
    for (const [type, mult, level] of [['triangle', 1, 1], ['sine', 2, 0.25]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq(n.midi) * mult;
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start(n.at);
      osc.stop(end + 0.05);
      nodes.push(osc);
    }
  }
  return () => {
    for (const o of nodes) {
      try {
        o.stop();
      } catch {
        // já parou
      }
    }
    master.disconnect();
  };
}
