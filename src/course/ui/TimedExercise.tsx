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
import { swingBeat } from '../tasks';
import { articulationScore, balanceScore, dynamicsScore, ioiSd, judgeTask, matchedVelocities, pedalScore, taskBeats, type CourseEvent, type PedalEvent, type PedalScore } from '../judge';
import type { Exercise, Rng, TimedTask } from '../types';
import { LEVEL_LABEL, Verdict, getVelocityCal, pct } from './shared';

type TimedEx = Extract<Exercise, { kind: 'timed' }>;

export interface TimedOutcome {
  accuracy: number;
  passed: boolean;
}

interface TakeScore {
  r: TakeResult;
  /** Equilíbrio entre as mãos (fração dos compassos com a melodia acima), null se não medido. */
  bal: number | null;
  artic: number | null;
  dyn: number | null;
  /** A passada foi sem força medida (teclado da tela ou do computador). */
  noVelocity: boolean;
  /** Pedal medido (null = nenhum evento de pedal chegou). */
  ped: PedalScore | null;
  /** Uniformidade (IOI-SD em ms). */
  even: number | null;
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
  const { subscribe, subscribePedal, press, release } = useNoteInput();
  const [staffRef, staffWidth] = useElementWidth<HTMLDivElement>();
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [now, setNow] = useState(0);
  const [score, setScore] = useState<TakeScore | null>(null);
  const trackRef = useRef<ScheduledTrack | null>(null);
  const eventsRef = useRef<CourseEvent[]>([]);
  const pedalRef = useRef<PedalEvent[]>([]);
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
    pedalRef.current = [];
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
    const ped = ex.pedal ? pedalScore(task, bpm, pedalRef.current, ex.pedal) : null;
    const even = ex.evenness ? ioiSd(task, bpm, events) : null;
    const bal = ex.balance !== undefined ? balanceScore(task, bpm, events, ex.balance) : null;
    const need = ex.pass.accuracy;
    const ok = r.accuracy >= need && (artic === null || artic >= 0.9) && (dyn === null || dyn >= need) && (!ex.noExtras || r.extras === 0) && (ped === null || ped.score >= 0.85) && (even === null || even <= ex.evenness!) && (bal === null || bal >= 0.8);
    const s = { r, artic, dyn, noVelocity, ped, even, bal, ok };
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

  useEffect(() => subscribePedal((e) => {
    const track = trackRef.current;
    if (!track || (phaseRef.current !== 'countin' && phaseRef.current !== 'playing')) return;
    pedalRef.current = [...pedalRef.current, { down: e.down, t: e.at - track.firstBeat - (getLatency() ?? 0) }];
  }), [subscribePedal]);

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
      // Swing: a colcheia do contratempo é tocada no último terço do tempo.
      return task.swing ? swingBeat(at) : at;
    });
  }, [task.display, task.swing]);
  const shift = task.transpose ?? 0;
  let current = 0;
  displayStarts.forEach((b, i) => {
    if (phase === 'playing' && b * beatMs - 120 <= elapsed) current = i;
  });
  const states: NoteState[] = task.display.map((d, i) => {
    if (d.midi === null && !anyKey) return 'plain';
    const ei = task.events.findIndex((e) => Math.abs(e.beat - displayStarts[i]) < 1e-6 && (e.midi === null || (d.midi !== null && e.midi === d.midi + shift)));
    const j = ei >= 0 ? live?.notes[ei] : null;
    if (j) return j.grade === 'perfect' || j.grade === 'good' ? 'hit' : j.grade === 'off' ? 'late' : 'miss';
    if (phase === 'done') return 'plain';
    if (i === current) return 'current';
    return phase === 'idle' ? 'plain' : 'upcoming';
  });

  const marks: Partial<Record<number, KeyMark>> = {};
  const next = task.display[current]?.midi;
  if (hints && !anyKey && next !== null && next !== undefined && phase !== 'done') marks[next + shift] = 'lit';

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
          beatScale={task.compound ? 1.5 : 1}
          fifths={task.fifths}
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
          {ex.pedal && (
            <p className="runner__note">
              {score.ped === null
                ? 'O pedal só é medido com o piano conectado por MIDI e o pedal ligado nele. Esta passada contou só as notas.'
                : `Pedal: ${pct(score.ped.score)} certo${score.ped.muddy ? `, ${score.ped.muddy} troca${score.ped.muddy > 1 ? 's' : ''} com som misturado (suba o pedal antes do próximo acorde)` : ''}${score.ped.stuck ? `, ${score.ped.stuck} pausa${score.ped.stuck > 1 ? 's' : ''} com pedal preso` : ''}${score.ped.missed ? `, ${score.ped.missed} acorde${score.ped.missed > 1 ? 's' : ''} sem pedal` : ''}${score.ped.early ? `, ${score.ped.early} troca${score.ped.early > 1 ? 's' : ''} antecipada${score.ped.early > 1 ? 's' : ''} (troque logo depois do acorde novo, não antes)` : ''}.`}
            </p>
          )}
          {score.even !== null && ex.evenness && (
            <p className="runner__note">
              Uniformidade: variação de {Math.round(score.even)} ms entre as notas (meta: até {ex.evenness} ms){score.even > ex.evenness ? '. Pense em notas iguais, como gotas: nem correr na passagem do polegar, nem frear depois.' : '.'}
            </p>
          )}
          {ex.balance !== undefined && (
            <p className="runner__note">
              {score.bal === null
                ? 'O equilíbrio entre as mãos só é medido com o piano conectado. Esta passada contou só as notas.'
                : `Equilíbrio: a melodia ficou acima do acompanhamento em ${pct(score.bal)} dos compassos (meta: 80%)${score.bal < 0.8 ? '. Deixe a esquerda mais leve e a direita cantando.' : '.'}`}
            </p>
          )}
          {ex.noExtras && score.r.extras > 0 && (
            <p className="runner__note">
              {score.r.extras === 1 ? '1 nota a mais' : `${score.r.extras} notas a mais`}. Nota ligada não se toca de novo: segure até a próxima nota diferente.
            </p>
          )}
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
