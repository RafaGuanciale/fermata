import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNoteInput, useNoteOn } from '../input/useNoteInput';
import { useMetronome } from '../metronome/MetronomeProvider';
import type { TimedSpec } from '../training/program';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../training/clickTrack';
import { judgeTake, onsets, totalBeats, windowsFor, type PlayedEvent, type TakeResult } from '../training/timing';
import { useElementWidth } from '../hooks/useFullscreen';
import Staff, { type NoteState } from './Staff';
import PianoKeyboard, { type KeyMark } from './PianoKeyboard';
import { PlayIcon } from './Icons';

interface TimedRunnerProps {
  spec: TimedSpec;
  bpm: number;
  phase: number;
  showNames: boolean;
  /** Acende no teclado a próxima nota. Desligado na prova e na leitura. */
  lightKeys: boolean;
  /** Pulso do metrônomo durante a passada (a contagem sempre toca). */
  pulse?: boolean;
  startLabel?: string;
  disabled?: boolean;
  onFinish: (result: TakeResult, bpm: number) => void;
  /** Muda quando o pai quer limpar a pauta (novo trecho). */
  resetKey?: string | number;
}

type Phase = 'idle' | 'countin' | 'playing' | 'done';

/** Uma passada no tempo: contagem, pulso, notas pintadas ao vivo e resultado no fim. */
export default function TimedRunner({ spec, bpm, phase, showNames, lightKeys, pulse = true, startLabel = 'Tocar', disabled, onFinish, resetKey }: TimedRunnerProps) {
  const metronome = useMetronome();
  const { press, release } = useNoteInput();
  const [staffRef, staffWidth] = useElementWidth<HTMLDivElement>();
  const [state, setState] = useState<Phase>('idle');
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<TakeResult | null>(null);
  const [lastWrong, setLastWrong] = useState<number | null>(null);
  const trackRef = useRef<ScheduledTrack | null>(null);
  const eventsRef = useRef<PlayedEvent[]>([]);
  const stateRef = useRef<Phase>('idle');
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const windows = windowsFor(phase);
  const times = useMemo(() => onsets(spec.notes, bpm), [spec.notes, bpm]);
  const lengthMs = (totalBeats(spec.notes) * 60000) / bpm;
  const durations = useMemo(() => spec.notes.map((n) => n.beats), [spec.notes]);
  const midis = useMemo(() => spec.notes.map((n) => n.midi), [spec.notes]);

  const setPhase = (p: Phase) => {
    stateRef.current = p;
    setState(p);
  };

  useEffect(() => {
    trackRef.current?.cancel();
    trackRef.current = null;
    eventsRef.current = [];
    setResult(null);
    setPhase('idle');
  }, [resetKey, spec]);

  useEffect(() => () => trackRef.current?.cancel(), []);

  const start = useCallback(() => {
    if (metronome.running) metronome.stop();
    trackRef.current?.cancel();
    const track = scheduleTrack({ bpm, countIn: spec.beatsPerBar, beats: totalBeats(spec.notes), beatsPerBar: spec.beatsPerBar, pulse });
    if (!track) return;
    trackRef.current = track;
    eventsRef.current = [];
    setResult(null);
    setLastWrong(null);
    setPhase('countin');
  }, [bpm, spec, pulse, metronome]);

  const stop = () => {
    trackRef.current?.cancel();
    trackRef.current = null;
    setPhase('idle');
  };

  // Relógio da tela durante a passada.
  useEffect(() => {
    if (state !== 'countin' && state !== 'playing') return;
    let raf = 0;
    const tick = () => {
      const track = trackRef.current;
      if (!track) return;
      const t = performance.now();
      setNow(t);
      const elapsed = t - track.firstBeat;
      if (elapsed >= 0 && stateRef.current === 'countin') setPhase('playing');
      if (elapsed > lengthMs + Math.max(windows.off, 30000 / bpm) + 50) {
        const r = judgeTake(spec.notes, bpm, eventsRef.current, windows);
        trackRef.current = null;
        setResult(r);
        setPhase('done');
        finishRef.current(r, bpm);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, lengthMs, bpm, spec.notes, windows]);

  useNoteOn((midi, at) => {
    const track = trackRef.current;
    if (!track || (stateRef.current !== 'countin' && stateRef.current !== 'playing')) return;
    const t = at - track.firstBeat - (getLatency() ?? 0);
    if (t < -track.beatMs) return; // tecla no meio da contagem: ignora
    eventsRef.current = [...eventsRef.current, { midi, t }];
    if (!spec.notes.some((n) => n.midi === midi)) setLastWrong(midi);
  });

  const track = trackRef.current;
  const elapsed = track ? now - track.firstBeat : -Infinity;
  const live = state === 'playing' ? judgeTake(spec.notes, bpm, eventsRef.current, windows, elapsed) : result;

  let current = 0;
  if (state === 'playing') {
    times.forEach((t, i) => {
      if (t !== null && t - 120 <= elapsed) current = i;
    });
  }

  const states: NoteState[] = spec.notes.map((_, i) => {
    const j = live?.notes[i];
    if (j) return j.grade === 'perfect' || j.grade === 'good' ? 'hit' : j.grade === 'off' ? 'late' : 'miss';
    if (state === 'done') return 'plain';
    if (i === current && (state === 'playing' || state === 'idle')) return 'current';
    return state === 'idle' ? 'plain' : 'upcoming';
  });

  const marks: Partial<Record<number, KeyMark>> = {};
  const next = midis[current];
  if (lightKeys && next !== null && next !== undefined && state !== 'done') marks[next] = 'lit';
  if (lastWrong !== null && state === 'playing') marks[lastWrong] = 'miss';

  const countdown = state === 'countin' && track ? Math.max(1, Math.ceil(-elapsed / track.beatMs)) : null;

  return (
    <div className="timed">
      <section className="session__staff timed__staff" ref={staffRef} aria-label="Pauta">
        <Staff
          notes={midis}
          states={states}
          current={current}
          showNames={showNames}
          width={staffWidth}
          clef={spec.clef}
          durations={durations}
          beatsPerBar={spec.beatsPerBar}
          label={`Pauta com ${midis.length} notas`}
        />
      </section>

      <div className="timed__controls">
        {state === 'countin' ? (
          <p className="timed__count" aria-live="assertive">
            {countdown}
          </p>
        ) : state === 'playing' ? (
          <button className="button button-secondary" type="button" onClick={stop}>
            Parar
          </button>
        ) : (
          <button className="button button-primary timed__start" type="button" onClick={start} disabled={disabled}>
            <PlayIcon className="button__icon" />
            {state === 'done' ? 'De novo' : startLabel}
          </button>
        )}
        <span className="timed__hint">
          {state === 'idle' && `${bpm} BPM · ${spec.beatsPerBar} tempos de contagem antes de começar`}
          {state === 'countin' && 'Prepare a mão, começa no próximo 1'}
          {state === 'playing' && `${bpm} BPM`}
          {state === 'done' && live && <TakeSummary result={live} />}
        </span>
      </div>

      <div className="session__keyboard timed__keyboard">
        <PianoKeyboard low={spec.low} high={spec.high} marks={marks} showNames={showNames} showComputerKeys onPress={press} onRelease={release} label="Teclado" />
      </div>
    </div>
  );
}

export function TakeSummary({ result }: { result: TakeResult }) {
  const count = (g: string) => result.notes.filter((n) => n?.grade === g).length;
  return (
    <span className="takeSummary">
      <strong>{Math.round(result.accuracy * 100)}% de acerto</strong>
      <span>{count('perfect') + count('good')} no tempo</span>
      {count('off') > 0 && <span>{count('off')} fora do tempo</span>}
      {count('miss') > 0 && <span>{count('miss')} erradas ou faltando</span>}
      {result.extras > 0 && <span>{result.extras} a mais</span>}
    </span>
  );
}
