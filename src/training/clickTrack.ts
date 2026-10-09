// Cliques do treino no tempo: contagem antes de começar e o pulso durante a passada.
// Tudo agendado no relógio do Web Audio, que não oscila; a tela converte para performance.now().

let shared: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (shared) return shared;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  shared = new Ctor();
  return shared;
}

export interface ScheduledTrack {
  /** performance.now() do primeiro tempo depois da contagem */
  firstBeat: number;
  /** O mesmo momento no relógio do Web Audio, para agendar sons junto. */
  firstBeatCtx: number;
  beatMs: number;
  cancel: () => void;
}

/**
 * Agenda `countIn` tempos de contagem e mais `beats` tempos de pulso.
 * `mutedAfterCountIn`: só a contagem toca (leitura à primeira vista, prova).
 */
export function scheduleTrack(opts: { bpm: number; countIn: number; beats: number; beatsPerBar: number; volume?: number; pulse?: boolean; /** false = contagem muda (só a tela conta) */ countInSound?: boolean }): ScheduledTrack | null {
  const ctx = audioContext();
  if (!ctx) return null;
  void ctx.resume();
  const beatSec = 60 / opts.bpm;
  const start = ctx.currentTime + 0.25;
  const volume = opts.volume ?? 0.6;
  const oscs: OscillatorNode[] = [];
  const total = opts.countIn + (opts.pulse === false ? 0 : Math.ceil(opts.beats));
  for (let i = 0; i < total; i++) {
    if (i < opts.countIn && opts.countInSound === false) continue;
    const at = start + i * beatSec;
    const inBar = i < opts.countIn ? i % opts.beatsPerBar : (i - opts.countIn) % opts.beatsPerBar;
    const strong = inBar === 0;
    const countIn = i < opts.countIn;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = countIn ? (strong ? 1760 : 1320) : strong ? 1500 : 1000;
    const peak = volume * (countIn ? 1 : strong ? 0.8 : 0.5);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.07);
    oscs.push(osc);
  }
  const firstBeatCtx = start + opts.countIn * beatSec;
  const firstBeat = performance.now() + (firstBeatCtx - ctx.currentTime) * 1000;
  return {
    firstBeat,
    firstBeatCtx,
    beatMs: beatSec * 1000,
    cancel: () => oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // já tocou
      }
    }),
  };
}

const LATENCY_KEY = 'fermata-latency-ms';

/** Atraso medido na calibração (ms). É de cada aparelho, não sincroniza. */
export function getLatency(): number | null {
  try {
    const v = localStorage.getItem(LATENCY_KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export function setLatency(ms: number) {
  try {
    localStorage.setItem(LATENCY_KEY, String(Math.round(ms)));
  } catch {
    // vale só agora
  }
}
