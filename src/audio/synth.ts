// Som de piano do app (ouvir o trecho, a outra mão, exemplos das lições).
// Usa amostras de um piano de cauda de verdade (Salamander Grand Piano, de Alexander Holm, licença CC BY 3.0),
// uma a cada terça menor, de Lá1 a Dó8, em public/samples/piano. As notas do meio são a amostra
// mais perto, afinada pela velocidade de reprodução. Enquanto as amostras carregam, toca um timbre sintetizado.

import { audioContext } from '../training/clickTrack';

export interface SynthNote {
  midi: number;
  /** segundos no relógio do Web Audio */
  at: number;
  /** segundos */
  dur: number;
  /** 0 a 1 */
  velocity?: number;
}

const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
/** Amostras disponíveis: Lá, Dó, Ré♯ e Fá♯ de cada oitava. */
const SAMPLE_MIDIS: number[] = [];
for (let m = 33; m <= 108; m++) if ([0, 3, 6, 9].includes(m % 12)) SAMPLE_MIDIS.push(m);

const fileOf = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

const buffers = new Map<number, AudioBuffer>();
let loading: Promise<void> | null = null;

/** Baixa e decodifica as amostras (uma vez). Pode chamar ao abrir uma tela que vai tocar som. */
export function loadPiano(): Promise<void> {
  if (loading) return loading;
  const ctx = audioContext();
  if (!ctx) return Promise.resolve();
  loading = Promise.all(
    SAMPLE_MIDIS.map(async (m) => {
      try {
        const res = await fetch(`/samples/piano/${fileOf(m)}.mp3`);
        if (!res.ok) return;
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        buffers.set(m, buf);
      } catch {
        // sem essa amostra: a nota usa a vizinha ou o timbre sintetizado
      }
    }),
  ).then(() => undefined);
  return loading;
}

function nearestSample(midi: number): number | null {
  let best: number | null = null;
  for (const m of buffers.keys()) if (best === null || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
  return best;
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Agenda notas e devolve uma função que cala tudo. */
export function playNotes(notes: SynthNote[], volume = 0.6): () => void {
  const ctx = audioContext();
  if (!ctx) return () => undefined;
  void ctx.resume();
  void loadPiano();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const sources: AudioScheduledSourceNode[] = [];

  for (const n of notes) {
    const v = n.velocity ?? 0.75;
    const sample = nearestSample(n.midi);
    // O abafador desce no fim da nota: some em ~0,3 s (notas graves soam um pouco mais).
    const release = n.midi < 48 ? 0.45 : 0.3;
    const end = n.at + Math.max(0.12, n.dur);
    const gain = ctx.createGain();
    gain.connect(master);
    if (sample !== null) {
      const src = ctx.createBufferSource();
      src.buffer = buffers.get(sample)!;
      src.playbackRate.value = Math.pow(2, (n.midi - sample) / 12);
      // Toque leve soa mais escuro, como num piano de verdade.
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 1800 + 9000 * v * v;
      src.connect(tone).connect(gain);
      gain.gain.setValueAtTime(0.25 + 0.75 * v, n.at);
      gain.gain.setValueAtTime(0.25 + 0.75 * v, end);
      gain.gain.exponentialRampToValueAtTime(0.0001, end + release);
      src.start(n.at);
      src.stop(end + release + 0.05);
      sources.push(src);
    } else {
      const peak = v * 0.4;
      gain.gain.setValueAtTime(0.0001, n.at);
      gain.gain.exponentialRampToValueAtTime(peak, n.at + 0.008);
      gain.gain.exponentialRampToValueAtTime(peak * 0.35, n.at + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, end + release);
      for (const [type, mult, level] of [['triangle', 1, 1], ['sine', 2, 0.25]] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq(n.midi) * mult;
        g.gain.value = level;
        osc.connect(g).connect(gain);
        osc.start(n.at);
        osc.stop(end + release + 0.05);
        sources.push(osc);
      }
    }
  }
  return () => {
    for (const s of sources) {
      try {
        s.stop();
      } catch {
        // já parou
      }
    }
    master.disconnect();
  };
}
