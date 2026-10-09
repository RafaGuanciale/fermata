// Os outros formatos de exercício: improviso sobre base, dinâmica, calibração de força,
// checklist (postura), quiz e o exemplo resolvido que o app toca passo a passo.

import { useEffect, useMemo, useRef, useState } from 'react';
import PianoKeyboard, { type KeyMark } from '../../components/PianoKeyboard';
import { PlayIcon } from '../../components/Icons';
import { useNoteInput } from '../../input/useNoteInput';
import { useMetronome } from '../../metronome/MetronomeProvider';
import { playNotes } from '../../audio/synth';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../../training/clickTrack';
import type { Midi } from '../../music/notes';
import { calibrate, chordTargets, levelOf, scoreImprov, type CourseEvent, type ImprovScore } from '../judge';
import { PC_NAMES, nameOf } from '../music';
import type { Block, Exercise, Listen, Rng } from '../types';
import { LEVEL_LABEL, RichText, Verdict, getVelocityCal, pct, playListen, setVelocityCal, useStopOnUnmount } from './shared';

export interface Outcome {
  accuracy: number;
  passed: boolean;
}

// ---------- improviso ----------

type ImprovEx = Extract<Exercise, { kind: 'improv' }>;

export function ImprovRunner({ ex, onFinish }: { ex: ImprovEx; onFinish: (o: Outcome) => void }) {
  const metronome = useMetronome();
  const { subscribe, press, release } = useNoteInput();
  const [phase, setPhaseState] = useState<'idle' | 'countin' | 'playing' | 'done'>('idle');
  const [score, setScore] = useState<ImprovScore | null>(null);
  const [targets, setTargets] = useState<ReturnType<typeof chordTargets> | null>(null);
  const [now, setNow] = useState(0);
  const trackRef = useRef<ScheduledTrack | null>(null);
  const stopBacking = useStopOnUnmount();
  const eventsRef = useRef<CourseEvent[]>([]);
  const phaseRef = useRef(phase);
  const setPhase = (p: typeof phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const beatMs = 60000 / ex.bpm;
  const lengthMs = ex.bars * ex.beatsPerBar * beatMs;

  useEffect(() => () => trackRef.current?.cancel(), []);

  const start = () => {
    if (metronome.running) metronome.stop();
    const track = scheduleTrack({ bpm: ex.bpm, countIn: ex.beatsPerBar, beats: ex.bars * ex.beatsPerBar, beatsPerBar: ex.beatsPerBar, volume: 0.35 });
    if (!track) return;
    const barSec = (ex.beatsPerBar * beatMs) / 1000;
    const notes = [];
    for (let b = 0; b < ex.bars; b++) {
      const chord = ex.backing[b % ex.backing.length];
      for (const m of chord) notes.push({ midi: m, at: track.firstBeatCtx + b * barSec, dur: barSec * 0.98, velocity: 0.45 });
    }
    stopBacking.current?.();
    stopBacking.current = playNotes(notes, 0.5);
    trackRef.current = track;
    eventsRef.current = [];
    setScore(null);
    setPhase('countin');
  };

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
      if (elapsed > lengthMs + 100) {
        trackRef.current = null;
        const s = scoreImprov(eventsRef.current, ex.pcs, ex.bpm, ex.bars, ex.beatsPerBar);
        const tg = ex.pass.targets !== undefined ? chordTargets(eventsRef.current, ex.backing, ex.bpm, ex.bars, ex.beatsPerBar) : null;
        setScore(s);
        setTargets(tg);
        setPhase('done');
        const endOk = !ex.pass.endOn || (s.lastPc !== null && ex.pass.endOn.includes(s.lastPc));
        const targetsOk = !tg || tg.ratio >= (ex.pass.targets ?? 0);
        const passed = s.notes >= ex.bars && s.inSet >= ex.pass.inSet && s.restsPer4 >= ex.pass.restsPer4 && endOk && targetsOk;
        onFinish({ accuracy: s.inSet, passed });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, lengthMs, ex, onFinish]);

  useEffect(() => subscribe((e) => {
    const track = trackRef.current;
    if (!track || phaseRef.current === 'idle' || phaseRef.current === 'done') return;
    const t = e.at - track.firstBeat - (getLatency() ?? 0);
    if (e.type === 'on') eventsRef.current = [...eventsRef.current, { midi: e.midi, t, off: null }];
    else {
      const i = eventsRef.current.map((x) => x.midi === e.midi && x.off === null).lastIndexOf(true);
      if (i >= 0) eventsRef.current = eventsRef.current.map((x, k) => (k === i ? { ...x, off: t } : x));
    }
  }), [subscribe]);

  const track = trackRef.current;
  const elapsed = track ? now - track.firstBeat : -Infinity;
  const bar = phase === 'playing' ? Math.min(ex.bars, Math.floor(elapsed / (ex.beatsPerBar * beatMs)) + 1) : 0;
  const marks: Partial<Record<Midi, KeyMark>> = {};
  for (let m = ex.low; m <= ex.high; m++) if (ex.pcs.includes(((m % 12) + 12) % 12)) marks[m] = 'lit';
  const endOk = score && (!ex.pass.endOn || (score.lastPc !== null && ex.pass.endOn.includes(score.lastPc)));

  return (
    <div className="runner">
      <div className="runner__actions">
        {phase === 'countin' ? (
          <p className="timed__count">{Math.max(1, Math.ceil(-elapsed / beatMs))}</p>
        ) : phase === 'playing' ? (
          <span className="runner__count">Compasso {bar} de {ex.bars}</span>
        ) : (
          <button className="button button-primary" type="button" onClick={start}>
            <PlayIcon className="button__icon" />
            {phase === 'done' ? 'De novo' : 'Começar com a base'}
          </button>
        )}
        {phase === 'idle' && <span className="timed__hint">{ex.bars} compassos a {ex.bpm} BPM. As teclas acesas são as que valem.</span>}
      </div>
      {score && (
        <div className="runner__feedback">
          <Verdict tone={score.inSet >= ex.pass.inSet ? 'hit' : 'miss'}>{pct(score.inSet)} das notas nas teclas certas ({score.notes} notas)</Verdict>
          <p className="runner__note">
            Pausas: {score.rests} {score.restsPer4 >= ex.pass.restsPer4 ? '(boa respiração entre as frases)' : `(faltou respirar: pelo menos ${ex.pass.restsPer4} a cada 4 compassos)`}
            {ex.pass.endOn && (endOk ? '. Terminou na casa.' : `. Termine num ${ex.pass.endOn.map((p) => PC_NAMES[p]).join(' ou ')} para soar como fim.`)}
          </p>
          {targets && (
            <p className="runner__note">
              Trocas de acorde: {targets.hits} de {targets.arrivals} chegadas numa nota do acorde ({pct(targets.ratio)}; meta {pct(ex.pass.targets ?? 0)}).
            </p>
          )}
        </div>
      )}
      <div className="runner__keys">
        <PianoKeyboard low={ex.low} high={ex.high} marks={marks} onPress={press} onRelease={release} label="Teclado do improviso" />
      </div>
    </div>
  );
}

// ---------- dinâmica ----------

type DynEx = Extract<Exercise, { kind: 'dynamics' }>;

export function DynamicsRunner({ ex, rng, onFinish }: { ex: DynEx; rng: Rng; onFinish: (o: Outcome) => void }) {
  const { subscribe, midi, press, release } = useNoteInput();
  const [asks, setAsks] = useState(() => ex.gen(rng));
  const [i, setI] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [last, setLast] = useState<{ ok: boolean; level: string } | null>(null);
  const cal = getVelocityCal();
  const done = i >= asks.length;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => subscribe((e) => {
    if (e.type !== 'on' || done || e.velocity === undefined || !cal) return;
    const ask = asks[i];
    if (e.midi !== ask.midi) return;
    const level = levelOf(e.velocity, cal);
    const ok = level === ask.level;
    const all = [...results, ok];
    setResults(all);
    setLast({ ok, level: LEVEL_LABEL[level] });
    setI(i + 1);
    if (i + 1 >= asks.length) {
      const acc = all.filter(Boolean).length / all.length;
      finishRef.current({ accuracy: acc, passed: acc >= ex.pass.accuracy });
    }
  }), [subscribe, asks, i, results, done, cal, ex.pass.accuracy]);

  if (midi.kind !== 'connected' || !cal) {
    return (
      <div className="runner">
        <p className="runner__note">
          {midi.kind !== 'connected'
            ? 'Dinâmica só dá para medir com o piano conectado por MIDI (o teclado da tela não tem força).'
            : 'Falta calibrar a força do seu piano: faça a calibração da lição 1.'}
        </p>
        <button className="linkButton" type="button" onClick={() => finishRef.current({ accuracy: 1, passed: true })}>Pular por agora</button>
      </div>
    );
  }

  const acc = results.length ? results.filter(Boolean).length / results.length : 0;
  const ask = asks[i];
  return (
    <div className="runner">
      {done ? (
        <div className="runner__summary">
          <Verdict tone={acc >= ex.pass.accuracy ? 'hit' : 'miss'}>{pct(acc)} na faixa pedida</Verdict>
          <button className="button button-secondary" type="button" onClick={() => { setAsks(ex.gen(rng)); setI(0); setResults([]); setLast(null); }}>De novo</button>
        </div>
      ) : (
        <>
          <div className="runner__head"><span className="runner__count">{i + 1} de {asks.length}</span></div>
          <div className="runner__prompt">
            <p className="runner__question">Toque {nameOf(ask.midi)}</p>
            <p className="runner__symbol">{ask.level}</p>
            <p className="runner__detail">{LEVEL_LABEL[ask.level]}</p>
          </div>
          {last && <div className="runner__feedback"><Verdict tone={last.ok ? 'hit' : 'miss'}>{last.ok ? 'Na faixa' : `Saiu ${last.level}`}</Verdict></div>}
        </>
      )}
      <div className="runner__keys">
        <PianoKeyboard low={ex.low} high={ex.high} marks={!done ? { [ask.midi]: 'lit' } : {}} onPress={press} onRelease={release} label="Teclado" />
      </div>
    </div>
  );
}

// ---------- calibração de força ----------

export function CalibrateRunner({ onFinish }: { onFinish: (o: Outcome) => void }) {
  const { subscribe, midi, connectMidi } = useNoteInput();
  const [soft, setSoft] = useState<number[]>([]);
  const [loud, setLoud] = useState<number[]>([]);
  const [result, setResult] = useState(getVelocityCal());
  const [error, setError] = useState(false);
  const stage = soft.length < 6 ? 'soft' : loud.length < 6 ? 'loud' : 'done';
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => subscribe((e) => {
    if (e.type !== 'on' || e.velocity === undefined) return;
    if (stage === 'soft') setSoft((s) => [...s, e.velocity!]);
    else if (stage === 'loud') {
      const next = [...loud, e.velocity];
      setLoud(next);
      if (next.length >= 6) {
        const cal = calibrate(soft, next);
        if (cal) {
          setVelocityCal(cal);
          setResult(cal);
          finishRef.current({ accuracy: 1, passed: true });
        } else {
          setError(true);
        }
      }
    }
  }), [subscribe, stage, soft, loud]);

  if (midi.kind !== 'connected') {
    return (
      <div className="runner">
        <p className="runner__note">A calibração precisa do piano conectado por MIDI.</p>
        <div className="runner__actions">
          <button className="button button-secondary" type="button" onClick={() => void connectMidi()}>Conectar piano</button>
          <button className="linkButton" type="button" onClick={() => finishRef.current({ accuracy: 1, passed: true })}>Pular por agora</button>
        </div>
      </div>
    );
  }
  return (
    <div className="runner">
      {stage === 'soft' && <Verdict tone="neutral">Toque 6 notas quaisquer o mais leve que conseguir, sem a nota falhar ({soft.length} de 6)</Verdict>}
      {stage === 'loud' && <Verdict tone="neutral">Agora 6 notas fortes, com o peso do braço, sem bater ({loud.length} de 6)</Verdict>}
      {stage === 'done' && result && !error && <Verdict tone="hit">Calibrado: leve perto de {result.soft}, forte perto de {result.loud} (escala MIDI de 1 a 127)</Verdict>}
      {error && (
        <>
          <Verdict tone="miss">Leve e forte ficaram parecidos demais. Exagere a diferença.</Verdict>
          <button className="button button-secondary" type="button" onClick={() => { setSoft([]); setLoud([]); setError(false); }}>De novo</button>
        </>
      )}
    </div>
  );
}

// ---------- checklist ----------

export function ChecklistRunner({ items, onFinish }: { items: string[]; onFinish: (o: Outcome) => void }) {
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const all = checked.every(Boolean);
  return (
    <div className="runner">
      <ul className="checklist">
        {items.map((t, i) => (
          <li key={i}>
            <label className="checklist__item">
              <input type="checkbox" checked={checked[i]} onChange={(e) => setChecked(checked.map((c, k) => (k === i ? e.target.checked : c)))} />
              <span>{t}</span>
            </label>
          </li>
        ))}
      </ul>
      <button className="button button-secondary" type="button" disabled={!all} onClick={() => onFinish({ accuracy: 1, passed: true })}>
        Conferi tudo
      </button>
    </div>
  );
}

// ---------- quiz ----------

type QuizEx = Extract<Exercise, { kind: 'quiz' }>;

export function QuizRunner({ ex, onFinish }: { ex: QuizEx; onFinish: (o: Outcome) => void }) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const q = ex.questions[i];
  if (!q) {
    const acc = right / ex.questions.length;
    return (
      <div className="runner__summary">
        <Verdict tone={acc >= ex.pass.accuracy ? 'hit' : 'miss'}>{right} de {ex.questions.length} certas</Verdict>
        <button className="button button-secondary" type="button" onClick={() => { setI(0); setRight(0); setChosen(null); }}>De novo</button>
      </div>
    );
  }
  const answer = (k: number) => {
    if (chosen !== null) return;
    setChosen(k);
    if (k === q.answer) setRight((r) => r + 1);
  };
  const next = () => {
    const nextI = i + 1;
    setChosen(null);
    setI(nextI);
    if (nextI >= ex.questions.length) {
      const acc = right / ex.questions.length;
      onFinish({ accuracy: acc, passed: acc >= ex.pass.accuracy });
    }
  };
  return (
    <div className="runner">
      <div className="runner__head"><span className="runner__count">{i + 1} de {ex.questions.length}</span></div>
      <p className="runner__question">{q.q}</p>
      <div className="quiz__options">
        {q.options.map((o, k) => (
          <button
            key={k}
            type="button"
            className={'choice__option quiz__option' + (chosen !== null && k === q.answer ? ' quiz__option-right' : '') + (chosen === k && k !== q.answer ? ' quiz__option-wrong' : '')}
            onClick={() => answer(k)}
            disabled={chosen !== null}
          >
            {o}
          </button>
        ))}
      </div>
      {chosen !== null && (
        <>
          <Verdict tone={chosen === q.answer ? 'hit' : 'miss'}>{chosen === q.answer ? 'Certo' : 'Não é essa'}</Verdict>
          <p className="runner__note">{q.why}</p>
          <button className="button button-secondary" type="button" onClick={next}>{i + 1 < ex.questions.length ? 'Próxima' : 'Ver resultado'}</button>
        </>
      )}
    </div>
  );
}

// ---------- exemplo resolvido ----------

type ExampleBlock = Extract<Block, { kind: 'example' }>;

function rangeFor(keys: Midi[]): [Midi, Midi] {
  if (!keys.length) return [60, 72];
  const lo = Math.min(...keys);
  const hi = Math.max(...keys);
  const low = lo - (lo % 12);
  let high = hi + ((12 - (hi % 12)) % 12);
  if (high === hi && hi % 12 === 0 && high - low < 12) high += 12;
  if (high - low < 12) high = low + 12;
  return [low, high];
}

export function ExamplePlayer({ block }: { block: ExampleBlock }) {
  const [i, setI] = useState(0);
  const stop = useStopOnUnmount();
  const step = block.steps[i];
  const allKeys = useMemo(() => block.steps.flatMap((s) => [...(s.keys ?? []), ...(s.play?.steps.flatMap((x) => x.midis) ?? [])]), [block]);
  const [low, high] = rangeFor(allKeys);
  const marks: Partial<Record<Midi, KeyMark>> = {};
  (step.keys ?? step.play?.steps.flatMap((s) => s.midis) ?? []).forEach((m) => (marks[m] = 'lit'));
  const play = (l: Listen) => {
    stop.current?.();
    stop.current = playListen(l).stop;
  };
  return (
    <div className="example">
      <div className="example__head">
        <span className="runner__count">Passo {i + 1} de {block.steps.length}</span>
      </div>
      <div className="example__say"><RichText body={step.say} /></div>
      <PianoKeyboard low={low} high={high} marks={marks} showNames label="Teclado do exemplo" size="small" />
      <div className="runner__actions">
        {step.play && (
          <button className="button button-secondary button-small" type="button" onClick={() => play(step.play!)}>
            <PlayIcon className="button__icon" />
            Ouvir
          </button>
        )}
        <button className="linkButton" type="button" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
        {i + 1 < block.steps.length && (
          <button className="button button-primary button-small" type="button" onClick={() => { setI(i + 1); if (block.steps[i + 1].play) play(block.steps[i + 1].play!); }}>
            Próximo passo
          </button>
        )}
      </div>
    </div>
  );
}
