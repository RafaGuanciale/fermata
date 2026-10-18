// Exercício no tempo: contagem, pulso, notas pintadas e resultado. Mede ritmo, e se pedido,
// legato/staccato (pelo soltar das teclas) e dinâmica (pela força, com o piano conectado).
// Conclui depois de N passadas boas seguidas; com escada, o BPM sobe a cada passada boa.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PianoKeyboard, { type KeyMark } from '../../components/PianoKeyboard';
import Staff, { type NoteState } from '../../components/Staff';
import { timedExpected, timedFingers } from '../fingers';
import { logTake } from '../../analysis/takesRepo';
import { PlayIcon } from '../../components/Icons';
import { useElementWidth } from '../../hooks/useFullscreen';
import { useNoteInput } from '../../input/useNoteInput';
import { getAutoNext, isTypingTarget, setAutoNext, useHandsFree } from '../../input/handsFree';
import { useMetronome } from '../../metronome/MetronomeProvider';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../../training/clickTrack';
import type { TakeResult } from '../../training/timing';
import { swingBeat } from '../tasks';
import { ARTIC_PASS, articulationScore, rulesLine, balanceScore, takeAftermath, dynamicsScore, ioiSd, judgeTask, LEGATO_GAP_MS, matchedVelocities, nextToPlay, pedalScore, releaseGap, takeHeadline, takePassed, taskBeats, type CourseEvent, type PedalEvent, type PedalScore, type TakeChecks } from '../judge';
import type { Exercise, Rng, TimedTask } from '../types';
import { LEVEL_LABEL, Verdict, getVelocityCal, pct } from './shared';
import { Burst, Combo, PassReward } from '../../celebrate/Celebrate';
import { playReward } from '../../celebrate/sound';
import { starsFor } from '../../celebrate/rewards';

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
  /** Silêncio típico entre soltar uma nota e tocar a próxima (ms), para orientar o legato. */
  gap: number | null;
  checks: TakeChecks;
  ok: boolean;
}

type Phase = 'idle' | 'countin' | 'playing' | 'done';

/** `onTake`: cada passada (para quem quer guardar o BPM alcançado, como a escada do Treino). */
export default function TimedExercise({ ex, hints, rng, onFinish, onTake: onEachTake }: { ex: TimedEx; hints: boolean; rng: Rng; onFinish: (o: TimedOutcome) => void; onTake?: (t: { bpm: number; accuracy: number; ok: boolean }) => void }) {
  const [task, setTask] = useState<TimedTask>(() => ex.gen(rng));
  const [bpm, setBpm] = useState(() => ex.ladder?.from ?? task.bpm);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [finished, setFinished] = useState(false);
  // Resultado da última passada quando o exercício reinicia (BPM novo ou desenho novo): fica até a próxima.
  const [last, setLast] = useState<{ ok: boolean; headline: string; note: string } | null>(null);
  const target = ex.ladder?.to ?? task.bpm;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const handsFree = useHandsFree();
  const [autoNext, setAutoNextState] = useState(getAutoNext);
  // Cada passada terminada (sem concluir o exercício) pede a próxima sozinha, se "Seguir sozinho" estiver ligado.
  const [autoKick, setAutoKick] = useState(0);

  const onTake = (s: TakeScore) => {
    onEachTake?.({ bpm, accuracy: s.r.accuracy, ok: s.ok });
    setBest((b) => Math.max(b, s.r.accuracy));
    const headline = takeHeadline(s.checks, pct);
    let nextBpm = bpm;
    let n = 0;
    let newTask = false;
    if (!s.ok) {
      setStreak(0);
      // Errou: o andamento fica onde está. Para descer ou recomeçar, há os botões da escada.
    } else if (ex.ladder && bpm < target) {
      nextBpm = Math.min(target, bpm + ex.ladder.step);
      setStreak(0);
      // Degrau novo, desenho novo: a escada não vira decoreba.
      newTask = true;
    } else {
      n = streak + 1;
      setStreak(n);
      if (n >= ex.reps && !finished) {
        setFinished(true);
        finishRef.current({ accuracy: Math.max(best, s.r.accuracy), passed: true });
      } else {
        // Instância nova a cada passada boa, para não decorar.
        newTask = true;
      }
    }
    // Só diz "desenho novo" quando o sorteio mudou mesmo (exercícios de melodia fixa repetem o trecho).
    const fresh = newTask ? ex.gen(rng) : null;
    const changed = !!fresh && JSON.stringify(fresh.display) !== JSON.stringify(task.display);
    const note = takeAftermath({ ok: s.ok, bpm, nextBpm, streak: n, reps: ex.reps, newTask: changed });
    if (note && (nextBpm !== bpm || newTask)) {
      setLast({ ok: s.ok, headline, note });
      if (s.ok) playReward('pass');
    }
    if (nextBpm !== bpm) setBpm(nextBpm);
    if (fresh) setTask(fresh);
    const concluded = !!s.ok && !(ex.ladder && bpm < target) && n >= ex.reps;
    const played = s.r.notes.some((x) => x && x.delta !== null) || s.r.extras > 0;
    if (autoNext && !concluded && !finished && played) setAutoKick((k) => k + 1);
  };

  return (
    <div className="runner runner-timed" onPointerDownCapture={handsFree.claim}>
      <div className="runner__head">
        <span className="runner__count">
          {finished ? 'Concluído' : `Passadas boas seguidas: ${streak} de ${ex.reps}`}
          {ex.ladder && !finished && ` · ${bpm} de ${target} BPM`}
        </span>
        {!finished && (
          <label className="timed__auto" title="A próxima passada começa sozinha depois do resultado">
            <input type="checkbox" checked={autoNext} onChange={(e) => { setAutoNext(e.target.checked); setAutoNextState(e.target.checked); }} />
            Seguir sozinho
          </label>
        )}
        {!finished && best > 0 && (
          <button className="linkButton" type="button" onClick={() => finishRef.current({ accuracy: best, passed: false })}>
            Encerrar por aqui
          </button>
        )}
      </div>
      {ex.ladder && !finished && bpm > ex.ladder.from && (
        <div className="timed__ladder">
          <button className="linkButton" type="button" onClick={() => { setBpm(Math.max(ex.ladder!.from, bpm - ex.ladder!.step)); setLast(null); }}>
            Descer para {Math.max(ex.ladder.from, bpm - ex.ladder.step)} BPM
          </button>
          {bpm - ex.ladder.step > ex.ladder.from && (
            <button className="linkButton" type="button" onClick={() => { setBpm(ex.ladder!.from); setLast(null); }}>
              Recomeçar em {ex.ladder.from} BPM
            </button>
          )}
        </div>
      )}
      {finished && (
        <PassReward stars={starsFor(best, ex.pass.accuracy) || 1}>
          <p className="passReward__text">Concluído: {pct(best)} no tempo na melhor passada.</p>
        </PassReward>
      )}
      {!finished && (
        <p className="runner__detail timed__rules">
          {rulesLine({ need: ex.pass.accuracy, window: ex.window, articulation: ex.articulation, evenness: ex.evenness, pedal: ex.pedal, dynamics: ex.dynamics, noExtras: ex.noExtras, balance: ex.balance }, pct)}
        </p>
      )}
      {last && !finished && (
        <div className="timed__last">
          {last.ok && <Burst />}
          <Verdict tone={last.ok ? 'hit' : 'miss'} detail={last.note}>{last.headline}</Verdict>
        </div>
      )}
      <TimedTake task={task} bpm={bpm} ex={ex} hints={hints} onTake={onTake} onStart={() => setLast(null)} active={handsFree.isActive && !finished} autoKick={autoKick} />
    </div>
  );
}

const AUTO_MS = 3500;
/** Depois de uma passada, notas tocadas por um instante ainda são o fim da música, não o pedido de começar outra. */
const GRACE_MS = 1500;

function TimedTake({ task, bpm, ex, hints, onTake, onStart, active, autoKick }: {
  task: TimedTask;
  bpm: number;
  ex: TimedEx;
  hints: boolean;
  onTake: (s: TakeScore) => void;
  onStart: () => void;
  /** Responde ao piano, ao pedal e ao espaço (o exercício ativo da página). */
  active: boolean;
  /** Muda a cada passada que deve emendar na próxima ("Seguir sozinho"). */
  autoKick: number;
}) {
  const metronome = useMetronome();
  const { held, subscribe, subscribePedal, press, release } = useNoteInput();
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
  const [autoAt, setAutoAt] = useState<number | null>(null);
  const endedAt = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const beats = taskBeats(task);
  const lengthMs = (beats * 60000) / bpm;
  const anyKey = task.events.some((e) => e.midi === null);
  // Dedilhado sugerido junto com as outras dicas (nomes e teclas acesas).
  const fingers = useMemo(() => timedFingers(task), [task]);
  const showFingers = hints && !anyKey;

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
    setAutoAt(null);
    onStart();
    eventsRef.current = [];
    pedalRef.current = [];
    setScore(null);
    setPhase('countin');
  }, [bpm, task, beats, metronome, onStart]);

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
    const checks: TakeChecks = {
      accuracy: r.accuracy, need: ex.pass.accuracy, articulation: ex.articulation, artic, dyn, extras: r.extras,
      noExtras: ex.noExtras, ped: ped?.score ?? null, pedN: ped?.total, even, evenness: ex.evenness, bal,
      balN: Math.ceil(taskBeats(task) / task.beatsPerBar),
    };
    const gap = ex.articulation === 'legato' ? releaseGap(task, bpm, events) : null;
    const s = { r, artic, dyn, noVelocity, ped, even, bal, gap, checks, ok: takePassed(checks) };
    setScore(s);
    setPhase('done');
    endedAt.current = performance.now();
    takeRef.current(s);
    // Registro nota a nota (exercícios só de ritmo, em qualquer tecla, ficam de fora).
    if (!task.events.some((e) => e.midi === null)) {
      void logTake({
        kind: 'exercicio',
        sourceId: `ex:${ex.title}`,
        title: ex.title,
        bpm,
        accuracy: r.accuracy,
        expected: timedExpected(task, bpm),
        played: events.map((e) => ({ midi: e.midi, t: e.t })),
        judged: r.notes,
        reachMs: Math.max(ex.window * 1.5, 150, 60000 / bpm / 2),
      });
    }
  }, [task, bpm, ex]);

  const stop = useCallback(() => {
    trackRef.current?.cancel();
    trackRef.current = null;
    endedAt.current = performance.now();
    setAutoAt(null);
    setPhase('idle');
  }, []);

  const startRef = useRef(start);
  startRef.current = start;
  const stopRef = useRef(stop);
  stopRef.current = stop;
  /** Parado (ou no resultado), no exercício ativo e passado o instante do fim: pode começar. */
  const canStart = () => activeRef.current && (phaseRef.current === 'idle' || phaseRef.current === 'done') && performance.now() - endedAt.current > GRACE_MS;

  // Seguir sozinho: a próxima passada começa depois de alguns segundos, com contagem visível.
  useEffect(() => {
    if (!autoKick) return;
    setAutoAt(performance.now() + AUTO_MS);
  }, [autoKick]);
  useEffect(() => {
    if (autoAt === null) return;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t >= autoAt) {
        window.clearInterval(id);
        if (activeRef.current) startRef.current();
        else setAutoAt(null);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [autoAt]);

  // Espaço ou Enter começam; espaço durante a passada para; Esc cancela a próxima automática.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current || isTypingTarget(e.target)) return;
      if (e.key === 'Escape' && autoAtRef.current !== null) {
        setAutoAt(null);
        return;
      }
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (phaseRef.current === 'countin' || phaseRef.current === 'playing') {
        if (e.key === ' ') {
          e.preventDefault();
          stopRef.current();
        }
        return;
      }
      if (canStart()) {
        e.preventDefault();
        startRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const autoAtRef = useRef(autoAt);
  autoAtRef.current = autoAt;

  useEffect(() => {
    if (phase !== 'countin' && phase !== 'playing') return;
    let raf = 0;
    let lastPaint = 0;
    const tick = () => {
      const track = trackRef.current;
      if (!track) return;
      const t = performance.now();
      // Redesenha a pauta a ~25 quadros por segundo: suficiente para o cursor e leve para computadores mais simples.
      if (t - lastPaint >= 40) {
        lastPaint = t;
        setNow(t);
      }
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
    // Parado: tocar qualquer tecla começa a contagem (a própria tecla não conta como nota).
    if (e.type === 'on' && canStart()) {
      startRef.current();
      return;
    }
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
    if (e.down && canStart()) {
      startRef.current();
      return;
    }
    const track = trackRef.current;
    if (!track || (phaseRef.current !== 'countin' && phaseRef.current !== 'playing')) return;
    pedalRef.current = [...pedalRef.current, { down: e.down, t: e.at - track.firstBeat - (getLatency() ?? 0) }];
  }), [subscribePedal]);

  const track = trackRef.current;
  const elapsed = track ? now - track.firstBeat : -Infinity;
  const live = phase === 'playing' ? judgeTask(task, bpm, eventsRef.current, ex.window, elapsed) : score?.r ?? null;
  // Notas no tempo em sequência (perfeita ou boa), na ordem da música: o contador aparece durante a passada.
  let onTime = 0;
  if (phase === 'playing' && live) {
    const order = task.events.map((e, i) => ({ beat: e.beat, i })).sort((a, b) => a.beat - b.beat);
    for (const { i } of order) {
      const j = live.notes[i];
      if (!j) continue;
      onTime = j.grade === 'perfect' || j.grade === 'good' ? onTime + 1 : 0;
    }
  }

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
  const states: NoteState[] = [];
  task.display.forEach((d, i) => {
    // A figura que continua uma ligadura não é tocada: herda o estado da nota de onde vem.
    states.push(i > 0 && task.display[i - 1].tie ? states[i - 1] : stateOf(d, i));
  });
  function stateOf(d: TimedTask['display'][number], i: number): NoteState {
    if (d.midi === null && !anyKey) return 'plain';
    const ei = task.events.findIndex((e) => Math.abs(e.beat - displayStarts[i]) < 1e-6 && (e.midi === null || (d.midi !== null && e.midi === d.midi + shift)));
    const j = ei >= 0 ? live?.notes[ei] : null;
    if (j) return j.grade === 'perfect' || j.grade === 'good' ? 'hit' : j.grade === 'off' ? 'late' : 'miss';
    if (phase === 'done') return 'plain';
    if (i === current) return 'current';
    return phase === 'idle' ? 'plain' : 'upcoming';
  }

  // Guia: a próxima nota ainda não tocada. Anda quando você toca, não sozinho com o relógio.
  const marks: Partial<Record<number, KeyMark>> = {};
  if (hints && !anyKey && phase !== 'done') {
    const notesNow = phase === 'playing' && live ? live.notes : task.events.map(() => null);
    for (const m of nextToPlay(task, notesNow)) marks[m] = 'next';
  }

  const countdown = phase === 'countin' && track ? Math.min(task.beatsPerBar, Math.max(1, Math.ceil(-elapsed / track.beatMs))) : null;

  return (
    <>
      {task.caption && <p className="runner__detail">{task.caption}</p>}
      <div className={'runner__staff runner__staff-wide' + (onTime >= 16 ? ' runner__staff-blazing' : onTime >= 8 ? ' runner__staff-hot' : '')} ref={staffRef}>
        <Staff
          notes={task.display.map((d) => d.midi)}
          states={states}
          current={current}
          showNames={hints && !anyKey}
          width={staffWidth}
          clef={task.clef}
          durations={task.display.map((d) => d.beats)}
          ties={task.display.map((d) => !!d.tie)}
          chords={task.display.map((d) => d.chord)}
          fingers={showFingers ? fingers : undefined}
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
          <button className="button button-secondary button-small" type="button" onClick={stop}>
            Parar
          </button>
        ) : (
          <button className="button button-primary" type="button" onClick={start}>
            <PlayIcon className="button__icon" />
            {phase === 'done' ? 'De novo' : 'Tocar'}
          </button>
        )}
        <span className="timed__hint">
          {phase === 'idle' && autoAt === null && `${bpm} BPM · contagem de ${task.beatsPerBar} tempos${anyKey ? ' · qualquer tecla' : ''}`}
          {phase === 'countin' && 'Prepare a mão, começa no próximo 1'}
          {phase === 'playing' && `${bpm} BPM${active ? ' · espaço para parar' : ''}`}
        </span>
        {phase === 'playing' && <Combo streak={onTime} label="no tempo" />}
      </div>
      {autoAt !== null && (phase === 'idle' || phase === 'done') ? (
        <div className="timed__next" role="status">
          <span className="timed__nextCount">Próxima passada em {Math.max(1, Math.ceil((autoAt - now) / 1000))} s, a {bpm} BPM</span>
          <button className="linkButton" type="button" onClick={start}>Começar já</button>
          <button className="linkButton" type="button" onClick={() => setAutoAt(null)}>Esperar</button>
        </div>
      ) : active && (phase === 'idle' || phase === 'done') ? (
        <p className="timed__handsFree">Para começar sem o mouse: toque qualquer tecla, o pedal ou aperte espaço.</p>
      ) : null}
      {phase === 'done' && score && (
        <div className="runner__feedback">
          <Verdict tone={score.ok ? 'hit' : 'miss'}>
            {takeHeadline(score.checks, pct)}
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
              {score.artic < ARTIC_PASS && ` (precisa de ${pct(ARTIC_PASS)})`}
              {score.artic < ARTIC_PASS && (ex.articulation === 'legato'
                ? `${score.gap !== null && score.gap > LEGATO_GAP_MS ? `. Entre uma nota e outra ficou em média ${Math.round(score.gap)} ms de silêncio` : ''}. Só solte a tecla quando a próxima já estiver descendo.`
                : '. Solte cada nota logo depois de tocar, como se a tecla estivesse quente.')}
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
        <PianoKeyboard low={task.low} high={task.high} marks={marks} pressed={held} showNames={hints} onPress={press} onRelease={release} label="Teclado do exercício" />
      </div>
    </>
  );
}
