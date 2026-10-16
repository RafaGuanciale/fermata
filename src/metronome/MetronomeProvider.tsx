// Metrônomo do app. Um só para tudo: continua tocando quando você troca de página
// ou abre um treino. O som é gerado pelo Web Audio e agendado um pouco à frente,
// então o tempo não oscila mesmo com a tela ocupada.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { bpmFromTaps, clampBpm, secondsPerBeat } from './tempo';
import { isSilentBar, type BeatMark } from './pulse';

interface MetronomeSettings {
  bpm: number;
  beats: number;
  accent: boolean;
  volume: number;
  /** Metrônomo que some: N compassos com clique e N em silêncio (0 = sempre toca). */
  gap: number;
}

export interface MetronomeApi extends MetronomeSettings {
  running: boolean;
  /** Tempo atual dentro do compasso (0 = primeiro), ou -1 parado. */
  beat: number;
  /** O compasso atual está no silêncio (metrônomo que some). */
  silent: boolean;
  setGap: (gap: number) => void;
  /** Os últimos tempos, no relógio do aparelho, para medir o pulso. */
  beatLog: () => BeatMark[];
  start: () => void;
  stop: () => void;
  toggle: () => void;
  setBpm: (bpm: number) => void;
  setBeats: (beats: number) => void;
  setAccent: (on: boolean) => void;
  setVolume: (v: number) => void;
  tap: () => void;
}

const KEY = 'fermata-metronome';
const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;

function readSettings(): MetronomeSettings {
  const fallback = { bpm: 72, beats: 4, accent: true, volume: 0.7, gap: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<MetronomeSettings> | null;
    return raw ? { ...fallback, ...raw, bpm: clampBpm(raw.bpm ?? fallback.bpm) } : fallback;
  } catch {
    return fallback;
  }
}

const MetronomeContext = createContext<MetronomeApi | null>(null);

export function MetronomeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(readSettings);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [silent, setSilent] = useState(false);
  const totalRef = useRef(0);
  const logRef = useRef<BeatMark[]>([]);

  const settingsRef = useRef(settings);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextTimeRef = useRef(0);
  const beatRef = useRef(0);
  const visualTimers = useRef<number[]>([]);
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    settingsRef.current = settings;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // vale só nesta visita
    }
  }, [settings]);

  const click = useCallback((ctx: AudioContext, time: number, strong: boolean) => {
    const { volume } = settingsRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = strong ? 1660 : 1100;
    const peak = Math.max(0.0001, volume * (strong ? 1 : 0.7));
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  }, []);

  const schedule = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    while (nextTimeRef.current < ctx.currentTime + LOOKAHEAD_S) {
      const { beats, accent, bpm, gap } = settingsRef.current;
      const index = beatRef.current % beats;
      const at = nextTimeRef.current;
      const quiet = isSilentBar(totalRef.current, beats, gap);
      totalRef.current++;
      if (!quiet) click(ctx, at, accent && index === 0);
      const delay = Math.max(0, (at - ctx.currentTime) * 1000);
      logRef.current.push({ t: performance.now() + delay, silent: quiet });
      if (logRef.current.length > 512) logRef.current.splice(0, 256);
      visualTimers.current.push(window.setTimeout(() => { setBeat(index); setSilent(quiet); }, delay));
      if (visualTimers.current.length > 32) visualTimers.current.splice(0, 16);
      nextTimeRef.current += secondsPerBeat(bpm);
      beatRef.current = index + 1;
    }
  }, [click]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    visualTimers.current.forEach((t) => window.clearTimeout(t));
    visualTimers.current = [];
    setRunning(false);
    setBeat(-1);
    setSilent(false);
  }, []);

  const start = useCallback(() => {
    if (timerRef.current !== null) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = ctxRef.current ?? new Ctor();
    ctxRef.current = ctx;
    void ctx.resume();
    beatRef.current = 0;
    totalRef.current = 0;
    logRef.current = [];
    nextTimeRef.current = ctx.currentTime + 0.06;
    schedule();
    timerRef.current = window.setInterval(schedule, TICK_MS);
    setRunning(true);
  }, [schedule]);

  useEffect(() => stop, [stop]);

  const setBpm = useCallback((bpm: number) => setSettings((s) => ({ ...s, bpm: clampBpm(bpm) })), []);
  const setBeats = useCallback((beats: number) => {
    beatRef.current = 0;
    setSettings((s) => ({ ...s, beats }));
  }, []);
  const setGap = useCallback((gap: number) => setSettings((s) => ({ ...s, gap })), []);
  const beatLog = useCallback(() => logRef.current.slice(), []);
  const setAccent = useCallback((accent: boolean) => setSettings((s) => ({ ...s, accent })), []);
  const setVolume = useCallback((volume: number) => setSettings((s) => ({ ...s, volume: Math.min(1, Math.max(0, volume)) })), []);
  const tap = useCallback(() => {
    const now = performance.now();
    tapsRef.current = [...tapsRef.current.slice(-7), now];
    const bpm = bpmFromTaps(tapsRef.current);
    if (bpm) setBpm(bpm);
  }, [setBpm]);

  const api = useMemo<MetronomeApi>(
    () => ({ ...settings, running, beat, silent, start, stop, toggle: () => (timerRef.current === null ? start() : stop()), setBpm, setBeats, setAccent, setVolume, setGap, beatLog, tap }),
    [settings, running, beat, silent, start, stop, setBpm, setBeats, setAccent, setVolume, setGap, beatLog, tap],
  );

  return <MetronomeContext.Provider value={api}>{children}</MetronomeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMetronome(): MetronomeApi {
  const ctx = useContext(MetronomeContext);
  if (!ctx) throw new Error('useMetronome fora do MetronomeProvider');
  return ctx;
}
