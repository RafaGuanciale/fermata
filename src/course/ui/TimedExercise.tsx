// Exercício no tempo: contagem, pulso, notas pintadas e resultado. Mede ritmo, e se pedido,
// legato/staccato (pelo soltar das teclas) e dinâmica (pela força, com o piano conectado).
// Conclui depois de N passadas boas seguidas; com escada, o BPM sobe a cada passada boa.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PianoKeyboard, { type KeyMark } from '../../components/PianoKeyboard';
import Staff, { type NoteState } from '../../components/Staff';
import { PlayIcon } from '../../components/Icons';
import { useElementWidth } from '../../hooks/useFullscreen';
import { useNoteInput } from '../../input/useNoteInput';
import { useMetronome } from '../../metronome/MetronomeProvider';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../../training/clickTrack';
import type { TakeResult } from '../../training/timing';
import { articulationScore, dynamicsScore, judgeTask, matchedVelocities, taskBeats, type CourseEvent } from '../judge';
import type { Exercise, Rng, TimedTask } from '../types';
import { LEVEL_LABEL, Verdict, getVelocityCal, pct } from './shared';

type TimedEx = Extract<Exercise, { kind: 'timed' }>;

export interface TimedOutcome {
  accuracy: number;
  passed: boolean;
}

interface TakeScore {
  r: TakeResult;
  artic: number | null;
  dyn: number | null;
  /** A passada foi sem força medida (teclado da tela ou do computador). */
  noVelocity: boolean;
  ok: boolean;
}

type Phase = 'idle' | 'countin' | 'playing' | 'done';

export default function TimedExercise({ ex, hints, rng, onFinish }: { ex: TimedEx; hints: boolean; rng: Rng; onFinish: (o: TimedOutcome) => void }) {
  const [task, setTask] = useState<TimedTask>(() => ex.gen(rng));
  const [bpm, setBpm] = useState(() => ex.ladder?.from ?? task.bpm);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [finished, setFinished] = useState(false);
  const target = ex.ladder?.to ?? task.bpm;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const onTake = (s: TakeScore) => {
    setBest((b) => Math.max(b, s.r.accuracy));
    if (!s.ok) {
      setStreak(0);
      if (ex.ladder) setBpm((b) => Math.max(ex.ladder!.from, b - ex.ladder!.step));
      return;
    }
    if (ex.ladder && bpm < target) {
      setBpm(Math.min(target, bpm + ex.ladder.step));
      setStreak(0);
      return;
    }
    const n = streak + 1;
    setStreak(n);
    if (n >= ex.reps && !finished) {
      setFinished(true);
      finishRef.current({ accuracy: Math.max(best, s.r.accuracy), passed: true });
    } else {
      // Instância nova a cada passada boa, para não decorar.
      setTask(ex.gen(rng));
    }
  };

  return (
    <div className="runner">
      <div className="runner__head">
        <span className="runner__count">
          {finished ? 'Concluído' : `Passadas boas seguidas: ${streak} de ${ex.reps}`}
          {ex.ladder && !finished && ` · ${bpm} de ${target} BPM`}
        </span>
        {!finished && best > 0 && (
          <button className="linkButton" type="button" onClick={() => finishRef.current({ accuracy: best, passed: false })}>
            Encerrar por aqui
          </button>
        )}
      </div>
      <TimedTake task={task} bpm={bpm} ex={ex} hints={hints} onTake={onTake} />
    </div>
  );
}

function TimedTake({ task, bpm, ex, hints, onTake }: { task: TimedTask; bpm: number; ex: TimedEx; hints: boolean; onTake: (s: TakeScore) => void }) {
  const metronome = useMetronome();
  const { subscribe, press, release } = useNoteInput();
  const [staffRef, staffWidth] = useElementWidth<HTMLDivElement>();
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [now, setNow] = useState(0);
  const [score, setScore] = useState<TakeScore | null>(null);
  const trackRef = useRef<ScheduledTrack | null>(null);
  const eventsRef = useRef<CourseEvent[]>([]);
  const phaseRef = useRef<Phase>('idle');
  const takeRef = useRef(onTake);
  takeRef.current = onTake;
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const beats = taskBeats(task);
  const lengthMs = (beats * 60000) / bpm;
  const anyKey = task.events.some((e) => e.midi === null);

  useEffect(() => {
    trackRef.current?.cancel();
    trackRef.current = null;
    setScore(null);
    setPhase('idle');
  }, [task, bpm]);
  useEffect(() => () => trackRef.current?.cancel(), []);

  const start = useCallback(() => {
    if (metronome.running) metronome.stop();
    trackRef.current?.cancel();
    const track = scheduleTrack({ bpm, countIn: task.beatsPerBar, beats, beatsPerBar: task.beatsPerBar });
    if (!track) return;
    trackRef.current = track;
    eventsRef.current = [];
    setScore(null);
    setPhase('countin');
  }, [bpm, task, beats, metronome]);

  const finish = useCallback(() => {
    const events = eventsRef.current;
    const r = judgeTask(task, bpm, events, ex.window);
    const artic = ex.articulation ? articulationScore(task, bpm, events, ex.articulation) : null;
    const cal = getVelocityCal();
    const vels = matchedVelocities(task, bpm, events);
    const noVelocity = !!ex.dynamics && vels.length === 0;
    const dyn = ex.dynamics && cal && vels.length ? dynamicsScore(vels, ex.dynamics, cal) : null;
    const need = ex.pass.accuracy;
    const ok = r.accuracy >= need && (artic === null || artic >= 0.9) && (dyn === null || dyn >= need);
    const s = { r, artic, dyn, noVelocity, ok };
    setScore(s);
    setPhase('done');
    takeRef.current(s);
  }, [task, bpm, ex]);

  useEffect(() => {
    if (phase !== 'countin' && phase !== 'playing') return;
    let raf = 0;
    const tick = () => {
      const track = trackRef.current;
      if (!track) return;
      const t = performance.now();
      setNow(t);
      const elapsed = t - track.firstBeat;
      if (elapsed >= 0 && phaseRef.current === 'countin') setPhase('playing');
      if (elapsed > lengthMs + Math.max(ex.window * 1.5, 30000 / bpm) + 80) {
        trackRef.current = null;
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, lengthMs, bpm, ex.window, finish]);

  useEffect(() => subscribe((e) => {
    const track = trackRef.current;
    if (!track || (phaseRef.current !== 'countin' && phaseRef.current !== 'playing')) return;
    const t = e.at - track.firstBeat - (getLatency() ?? 0);
    if (e.type === 'on') {
      if (t < -track.beatMs) return;
      eventsRef.current = [...eventsRef.current, { midi: e.midi, t, off: null, velocity: e.velocity }];
    } else {
      const i = eventsRef.current.map((x) => x.midi === e.midi && x.off === null).lastIndexOf(true);
      if (i >= 0) eventsRef.current = eventsRef.current.map((x, k) => (k === i ? { ...x, off: t } : x));
    }
  }), [subscribe]);

  const track = trackRef.current;
  const elapsed = track ? now - track.firstBeat : -Infinity;
  const live = phase === 'playing' ? judgeTask(task, bpm, eventsRef.current, ex.window, elapsed) : score?.r ?? null;

  // A pauta mostra a linha `display`; o estado de cada nota vem do evento esperado no mesmo tempo.
  const beatMs = 60000 / bpm;
  const displayStarts = useMemo(() => {
    let b = 0;
    return task.display.map((d) => {
      const at = b;
      b += d.beats;
      return at;
    });
  }, [task.display]);
  let current = 0;
  displayStarts.forEach((b, i) => {
    if (phase === 'playing' && b * beatMs - 120 <= elapsed) current = i;
  });
  const states: NoteState[] = task.display.map((d, i) => {
    if (d.midi === null && !anyKey) return 'plain';
    const ei = task.events.findIndex((e) => Math.abs(e.beat - displayStarts[i]) < 1e-6 && (e.midi === null || e.midi === d.midi));
    const j = ei >= 0 ? live?.notes[ei] : null;
    if (j) return j.grade === 'perfect' || j.grade === 'good' ? 'hit' : j.grade === 'off' ? 'late' : 'miss';
    if (phase === 'done') return 'plain';
    if (i === current) return 'current';
    return phase === 'idle' ? 'plain' : 'upcoming';
  });

  const marks: Partial<Record<number, KeyMark>> = {};
  const next = task.display[current]?.midi;
  if (hints && !anyKey && next !== null && next !== undefined && phase !== 'done') marks[next] = 'lit';

  const countdown = phase === 'countin' && track ? Math.max(1, Math.ceil(-elapsed / track.beatMs)) : null;

  return (
    <>
      {task.caption && <p className="runner__detail">{task.caption}</p>}
      <div className="runner__staff runner__staff-wide" ref={staffRef}>
        <Staff
          notes={task.display.map((d) => d.midi)}
          states={states}
          current={current}
          showNames={hints && !anyKey}
          width={staffWidth}
          clef={task.clef}
          durations={task.display.map((d) => d.beats)}
          beatsPerBar={task.beatsPerBar}
          label="Pauta do exercício"
        />
      </div>
      <div className="runner__actions">
        {phase === 'countin' ? (
          <p className="timed__count" aria-live="assertive">{countdown}</p>
        ) : phase === 'playing' ? (
          <button className="button button-secondary button-small" type="button" onClick={() => { trackRef.current?.cancel(); trackRef.current = null; setPhase('idle'); }}>
            Parar
          </button>
        ) : (
          <button className="button button-primary" type="button" onClick={start}>
            <PlayIcon className="button__icon" />
            {phase === 'done' ? 'De novo' : 'Tocar'}
          </button>
        )}
        <span className="timed__hint">
          {phase === 'idle' && `${bpm} BPM · contagem de ${task.beatsPerBar} tempos${anyKey ? ' · qualquer tecla' : ''}`}
          {phase === 'countin' && 'Prepare a mão, começa no próximo 1'}
          {phase === 'playing' && `${bpm} BPM`}
        </span>
      </div>
      {phase === 'done' && score && (
        <div className="runner__feedback">
          <Verdict tone={score.ok ? 'hit' : 'miss'}>
            {pct(score.r.accuracy)} no tempo{score.ok ? ': passada boa' : ` (precisa de ${pct(ex.pass.accuracy)})`}
          </Verdict>
          {score.artic !== null && (
            <p className="runner__note">
              {ex.articulation === 'legato' ? 'Legato' : 'Staccato'}: {pct(score.artic)} das passagens certas
              {score.artic < 0.9 && (ex.articulation === 'legato' ? '. Só solte a tecla quando a próxima já estiver descendo.' : '. Solte cada nota logo depois de tocar, como se a tecla estivesse quente.')}
            </p>
          )}
          {ex.dynamics && (
            <p className="runner__note">
              {score.noVelocity
                ? 'A força só é medida com o piano conectado. Esta passada contou só o ritmo.'
                : score.dyn === null
                  ? 'Calibre a força do seu piano (lição 1) para medir a dinâmica.'
                  : `Dinâmica: ${pct(score.dyn)} ${ex.dynamics === 'crescendo' ? 'subindo de nota em nota' : ex.dynamics === 'diminuendo' ? 'descendo de nota em nota' : `na faixa ${LEVEL_LABEL[ex.dynamics]}`}`}
            </p>
          )}
        </div>
      )}
      <div className="runner__keys">
        <PianoKeyboard low={task.low} high={task.high} marks={marks} showNames={hints} onPress={press} onRelease={release} label="Teclado do exercício" />
      </div>
    </>
  );
}
