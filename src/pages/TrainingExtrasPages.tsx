// Popups do treino além dos treinos da fase: aquecimento, leitura à primeira vista, prova e calibração.

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useNoteInput, useNoteOn, midiStatusLabel } from '../input/useNoteInput';
import type { Midi } from '../music/notes';
import { generateLocateSequence, C_POSITION } from '../music/exercises';
import { createDrill, drillReducer, isFinished, summarize, type DrillState } from '../drill/drill';
import { PHASES, READING_LEVELS, WARMUP_LEVELS, warmupForDay, findTreino, type TimedSpec } from '../training/program';
import {
  currentReadingLevel,
  currentWarmupLevel,
  dayIndex,
  dayKey,
  phaseState,
  readingChange,
  warmupIsEasy,
  warmupShouldDrop,
  warmupTarget,
} from '../training/progress';
import { saveRun, useRuns } from '../training/runs';
import { getLatency, scheduleTrack, setLatency } from '../training/clickTrack';
import { latencyFromTaps, type TakeResult } from '../training/timing';
import { canFullscreen, enterFullscreen, useElementWidth, useFullscreenState } from '../hooks/useFullscreen';
import TimedRunner, { TakeSummary } from '../components/TimedRunner';
import Staff, { type NoteState } from '../components/Staff';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import ThemeToggle from '../components/ThemeToggle';
import { CheckIcon, CloseIcon, ExpandIcon, PlugIcon } from '../components/Icons';
import { formatSeconds } from '../format';

function Shell({ eyebrow, title, onClose, children, names }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode; names?: { on: boolean; toggle: () => void } }) {
  const { midi, connectMidi } = useNoteInput();
  const isFull = useFullscreenState();
  return (
    <div className="session">
      <header className="session__bar">
        <button className="session__icon" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">{eyebrow}</p>
          <h1 className="session__name">{title}</h1>
        </div>
        <div className="session__controls">
          {names && (
            <button className="pill" type="button" aria-pressed={names.on} onClick={names.toggle}>
              {names.on ? 'Esconder nomes' : 'Mostrar nomes'}
            </button>
          )}
          <button className="pill session__midi" type="button" onClick={connectMidi}>
            {midi.kind === 'connected' ? <span className="pill__dot pill__dot-on" aria-hidden /> : <PlugIcon className="pill__icon" />}
            <span className="session__midiLabel">{midiStatusLabel(midi)}</span>
          </button>
          {canFullscreen() && !isFull && (
            <button className="pill pill-icon" type="button" onClick={enterFullscreen} aria-label="Tela cheia" title="Tela cheia">
              <ExpandIcon className="pill__icon" />
            </button>
          )}
          <ThemeToggle iconOnly />
        </div>
      </header>
      <main className="session__stage training__stage">{children}</main>
    </div>
  );
}

// ---------- aquecimento ----------

const WARMUP_REPS = 3;
type Tension = 'leve' | 'tenso' | 'travado';

export function WarmupPage({ onClose }: { onClose: () => void }) {
  const runs = useRuns();
  const [showNames, setShowNames] = useState(false);
  if (!runs) return <Shell eyebrow="Aquecimento" title="" onClose={onClose}>{null}</Shell>;
  return (
    <Shell eyebrow="Aquecimento" title={`Nível ${currentWarmupLevel(runs).n} · ${currentWarmupLevel(runs).title}`} onClose={onClose} names={{ on: showNames, toggle: () => setShowNames((v) => !v) }}>
      <WarmupFlow key={currentWarmupLevel(runs).n} showNames={showNames} />
    </Shell>
  );
}

function WarmupFlow({ showNames }: { showNames: boolean }) {
  const runs = useRuns() ?? [];
  const level = currentWarmupLevel(runs);
  const [frozen] = useState(() => ({ target: warmupTarget(level, runs), list: warmupForDay(level, dayIndex(Date.now())) }));
  const [ex, setEx] = useState(0);
  const [reps, setReps] = useState(0);
  const [cleanCount, setCleanCount] = useState(0);
  const [tension, setTension] = useState<Tension | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const done = ex >= frozen.list.length;
  const current = frozen.list[ex];

  if (!frozen.list.length) return <p className="emptyState__body">Os exercícios deste nível chegam na próxima etapa.</p>;

  const onFinish = (r: TakeResult, bpm: number) => {
    void saveRun({ treinoId: current.id, kind: 'warmup', level: level.n, bpm, accuracy: r.accuracy, clean: r.clean });
    const nextReps = reps + 1;
    const nextClean = cleanCount + (r.clean ? 1 : 0);
    if (nextReps >= WARMUP_REPS || nextClean >= 2) {
      setEx((e) => e + 1);
      setReps(0);
      setCleanCount(0);
    } else {
      setReps(nextReps);
      setCleanCount(nextClean);
    }
  };

  const finishTension = async (t: Tension) => {
    setTension(t);
    const all = runs;
    if (warmupShouldDrop(level, all)) {
      await saveRun({ treinoId: 'aquecimento', kind: 'level', level: level.n - 1 });
      setDecision(`Dois dias abaixo de 65%: o aquecimento volta para o nível ${level.n - 1}. É a regra do curso, não castigo.`);
    }
  };

  const easy = warmupIsEasy(level, runs);
  const nextLevelReady = level.n < WARMUP_LEVELS.length;
  const nextHasContent = nextLevelReady && WARMUP_LEVELS[level.n].exercises.length > 0;

  if (done) {
    return (
      <div className="training__done">
        <p className="training__doneTitle">
          <CheckIcon className="training__doneIcon" />
          Aquecimento feito a {frozen.target} BPM
        </p>
        {!tension ? (
          <>
            <p className="timed__hint">Como ficaram as mãos?</p>
            <div className="choice choice-3 training__tension">
              <button type="button" className="choice__option" onClick={() => void finishTension('leve')}>Leves</button>
              <button type="button" className="choice__option" onClick={() => void finishTension('tenso')}>Um pouco tensas</button>
              <button type="button" className="choice__option" onClick={() => void finishTension('travado')}>Travadas</button>
            </div>
          </>
        ) : decision ? (
          <p className="training__message">{decision}</p>
        ) : tension === 'travado' ? (
          <p className="training__message">Então hoje o nível fica onde está. Solte os ombros e os pulsos antes de seguir.</p>
        ) : easy && nextLevelReady ? (
          nextHasContent ? (
            <div className="training__levelUp">
              <p className="training__message">O nível {level.n} ficou fácil: três dias limpos no topo do tempo. Quer subir para o nível {level.n + 1}?</p>
              <button className="button button-primary" type="button" onClick={() => void saveRun({ treinoId: 'aquecimento', kind: 'level', level: level.n + 1 }).then(() => setDecision(`Pronto: a partir de amanhã o aquecimento é o nível ${level.n + 1}.`))}>
                Subir de nível
              </button>
            </div>
          ) : (
            <p className="training__message">O nível {level.n} ficou fácil. O nível {level.n + 1} chega na próxima etapa do app.</p>
          )
        ) : (
          <p className="training__message">Bom. Amanhã o tempo sobe um pouco, até chegar a {level.max} BPM.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="training__bar">
        <p className="training__step">
          Exercício {ex + 1} de {frozen.list.length} · <strong>{current.title}</strong>
        </p>
        <p className="timed__hint">Passada {reps + 1} de até {WARMUP_REPS} · {frozen.target} BPM, sem pressa</p>
      </div>
      <TimedRunner key={current.id} spec={current.timed} bpm={frozen.target} phase={1} showNames={showNames} lightKeys onFinish={onFinish} />
    </>
  );
}

// ---------- leitura à primeira vista ----------

function readingSpec(levelN: number, seed: number): TimedSpec {
  const level = READING_LEVELS[levelN - 1];
  void seed;
  const notes = generateLocateSequence(level.pool, level.bars * 4).map((midi) => ({ midi, beats: 1 }));
  const low = level.clef === 'bass' ? 48 : 60;
  return { clef: level.clef, hand: level.clef === 'bass' ? 'esquerda' : 'direita', notes, beatsPerBar: 4, target: level.bpm, low, high: low + 12 };
}

export function ReadingPage({ onClose }: { onClose: () => void }) {
  const runs = useRuns();
  const levelN = runs ? currentReadingLevel(runs) : 1;
  const level = READING_LEVELS[levelN - 1];
  const [seed, setSeed] = useState(0);
  const spec = useMemo(() => readingSpec(levelN, seed), [levelN, seed]);
  const [stage, setStage] = useState<'olhar' | 'tocar' | 'fim'>('olhar');
  const [result, setResult] = useState<TakeResult | null>(null);
  const [news, setNews] = useState<string | null>(null);

  const onFinish = async (r: TakeResult, bpm: number) => {
    setResult(r);
    setStage('fim');
    await saveRun({ treinoId: 'leitura', kind: 'reading', level: levelN, bpm, accuracy: r.accuracy, clean: r.clean });
    const all = [...(runs ?? []), { treinoId: 'leitura', kind: 'reading' as const, level: levelN, accuracy: r.accuracy, at: Date.now(), day: dayKey(Date.now()) }];
    const change = readingChange(levelN, all);
    if (change === 'up') {
      await saveRun({ treinoId: 'leitura', kind: 'level', level: levelN + 1 });
      setNews(`Três dias com 80% ou mais: a leitura sobe para o nível ${levelN + 1}.`);
    } else if (change === 'down') {
      await saveRun({ treinoId: 'leitura', kind: 'level', level: levelN - 1 });
      setNews(`Dois dias abaixo de 60%: a leitura volta para o nível ${levelN - 1} por enquanto.`);
    }
  };

  const another = () => {
    setSeed((s) => s + 1);
    setStage('olhar');
    setResult(null);
  };

  return (
    <Shell eyebrow={`Leitura à primeira vista · nível ${levelN}`} title={level.title} onClose={onClose}>
      {stage === 'olhar' && (
        <p className="training__how">Olhe o trecho antes: onde a mão começa e o desenho das notas. Depois toque uma vez só, sem parar no erro.</p>
      )}
      {stage === 'fim' && result && (
        <div className="training__message" role="status">
          <TakeSummary result={result} />
          {news && <p>{news}</p>}
        </div>
      )}
      <TimedRunner
        resetKey={seed}
        spec={spec}
        bpm={level.bpm}
        phase={1}
        showNames={false}
        lightKeys={false}
        pulse
        startLabel="Já olhei, tocar"
        disabled={stage === 'fim'}
        onFinish={(r, bpm) => void onFinish(r, bpm)}
      />
      {stage === 'fim' && (
        <div className="training__actions">
          <button className="button button-primary" type="button" onClick={another}>
            Outro trecho
          </button>
          <span className="timed__hint">Leitura não repete o mesmo trecho: repetir vira estudo de música.</span>
        </div>
      )}
    </Shell>
  );
}

// ---------- prova ----------

export function ExamPage({ onClose }: { onClose: () => void }) {
  const phaseN = Number(useParams().n ?? 1);
  const phase = PHASES.find((p) => p.n === phaseN) ?? PHASES[0];
  const runs = useRuns();
  const [step, setStep] = useState(0);
  const [reps, setReps] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);
  const state = runs ? phaseState(phase, runs) : null;
  const current = phase.exam[step];

  const advance = async () => {
    if (step + 1 < phase.exam.length) {
      setStep(step + 1);
      setReps(0);
      return;
    }
    setPassed(true);
    await saveRun({ treinoId: `prova-${phase.n}`, kind: 'exam', passed: true });
  };

  const fail = async (why: string) => {
    setFailed(why);
    setPassed(false);
    await saveRun({ treinoId: `prova-${phase.n}`, kind: 'exam', passed: false });
  };

  const restart = () => {
    setStep(0);
    setReps(0);
    setFailed(null);
    setPassed(null);
    setAttempt((a) => a + 1);
  };

  if (!state) return <Shell eyebrow={`Prova da fase ${phase.n}`} title={phase.title} onClose={onClose}>{null}</Shell>;

  if (!state.examUnlocked) {
    return (
      <Shell eyebrow={`Prova da fase ${phase.n}`} title={phase.title} onClose={onClose}>
        <p className="training__how">A prova libera quando todos os treinos da fase estiverem vencidos. Faltam {phase.treinos.length - state.passedCount}.</p>
      </Shell>
    );
  }

  const examDaysAfter = state.examDays + (passed ? 1 : 0);

  return (
    <Shell eyebrow={`Prova da fase ${phase.n} · sem ajudas`} title={phase.title} onClose={onClose}>
      <ol className="exam__steps">
        {phase.exam.map((s, i) => (
          <li key={s.title} className={'exam__step' + (i < step || passed ? ' exam__step-done' : i === step && passed === null ? ' exam__step-current' : '')}>
            {s.title}
          </li>
        ))}
      </ol>

      {passed === true && (
        <div className="training__done">
          <p className="training__doneTitle">
            <CheckIcon className="training__doneIcon" />
            Passou na prova
          </p>
          <p className="training__message">
            {examDaysAfter >= 2 ? `Fase ${phase.n} concluída. A próxima fase abre no Caminho.` : 'Agora confirme em outro dia. O que vale é o que ficou, não o que saiu hoje.'}
          </p>
        </div>
      )}
      {passed === false && (
        <div className="training__done">
          <p className="training__message">{failed} Volte aos treinos dessa parte e tente a prova outro dia.</p>
          <button className="button button-secondary" type="button" onClick={restart}>
            Tentar de novo agora
          </button>
        </div>
      )}

      {passed === null && current?.kind === 'locate' && (
        <LocateExam key={`l${attempt}`} onDone={(firstTry, avgMs) => (firstTry >= 0.9 && avgMs < 2000 ? void advance() : void fail(`Leitura com ${Math.round(firstTry * 100)}% de primeira e ${formatSeconds(avgMs)} por nota.`))} />
      )}
      {passed === null && current?.kind === 'timed' && current.treinoId && (() => {
        const t = findTreino(current.treinoId)!.treino;
        const need = current.reps ?? 1;
        return (
          <>
            <p className="timed__hint exam__hint">Passada {reps + 1} de {need} · {t.timed!.target} BPM</p>
            <TimedRunner
              key={`${current.treinoId}-${attempt}`}
              spec={t.timed!}
              bpm={t.timed!.target}
              phase={phase.n}
              showNames={false}
              lightKeys={false}
              onFinish={(r) => {
                const ok = current.requireClean ? r.clean : r.accuracy >= (current.minAccuracy ?? 0.85);
                if (!ok) return void fail(`${t.title}: ${Math.round(r.accuracy * 100)}% de acerto${current.requireClean ? ', a passada precisava ser limpa' : ''}.`);
                if (reps + 1 >= need) void advance();
                else setReps(reps + 1);
              }}
            />
          </>
        );
      })()}
    </Shell>
  );
}

function LocateExam({ onDone }: { onDone: (firstTry: number, avgMs: number) => void }) {
  const { press, release } = useNoteInput();
  const [staffRef, width] = useElementWidth<HTMLDivElement>();
  const [drill, setDrill] = useState<DrillState>(() => createDrill(generateLocateSequence(C_POSITION, 12), performance.now()));
  const reported = useRef(false);

  useNoteOn((m: Midi, at) => {
    if (isFinished(drill)) return;
    const next = drillReducer(drill, { type: 'press', midi: m, at });
    setDrill(next);
    if (isFinished(next) && !reported.current) {
      reported.current = true;
      const s = summarize(next);
      onDone(s.firstTry / s.total, s.avgMs ?? Infinity);
    }
  });

  const states: NoteState[] = drill.notes.map((_, i) => (i < drill.index ? (drill.results[i].wrong.length ? 'miss' : 'hit') : i === drill.index ? 'current' : 'upcoming'));
  const marks: Partial<Record<number, KeyMark>> = {};
  if (drill.lastPress && !drill.lastPress.correct) marks[drill.lastPress.midi] = 'miss';

  return (
    <div className="timed">
      <section className="session__staff timed__staff" ref={staffRef} aria-label="Pauta">
        <Staff notes={drill.notes} states={states} current={Math.min(drill.index, drill.notes.length - 1)} showNames={false} width={width} label="Pauta da prova" />
      </section>
      <div className="session__keyboard timed__keyboard">
        <PianoKeyboard low={60} high={72} marks={marks} onPress={press} onRelease={release} label="Teclado" />
      </div>
    </div>
  );
}

// ---------- calibração ----------

const CAL_BPM = 80;
const CAL_BEATS = 12;

export function CalibratePage({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [value, setValue] = useState<number | null>(getLatency());
  const [error, setError] = useState<string | null>(null);
  const tapsRef = useRef<number[]>([]);
  const beatsRef = useRef<number[]>([]);
  const firstRef = useRef(0);

  useNoteOn((_m, at) => {
    if (state === 'running') tapsRef.current.push(at - firstRef.current);
  });

  const start = () => {
    const track = scheduleTrack({ bpm: CAL_BPM, countIn: 4, beats: CAL_BEATS, beatsPerBar: 4 });
    if (!track) return setError('Este navegador não toca áudio.');
    tapsRef.current = [];
    firstRef.current = track.firstBeat;
    beatsRef.current = Array.from({ length: CAL_BEATS }, (_, i) => i * track.beatMs);
    setError(null);
    setState('running');
    window.setTimeout(() => {
      const ms = latencyFromTaps(tapsRef.current, beatsRef.current);
      if (ms === null) {
        setError('Não deu para medir: toque junto com cada clique depois da contagem. Tente de novo.');
        setState('idle');
        return;
      }
      setLatency(ms);
      setValue(ms);
      setState('done');
    }, track.firstBeat - performance.now() + CAL_BEATS * track.beatMs + 400);
  };

  return (
    <Shell eyebrow="Treino no tempo" title="Ajustar o atraso do piano" onClose={onClose}>
      <div className="training__done">
        <p className="training__how">
          Entre o piano, o cabo e o computador sempre existe um pequeno atraso. Toque qualquer tecla junto com cada clique depois dos 4 da contagem, 12 vezes. O app mede a diferença e desconta nos treinos.
        </p>
        {error && <p className="form__error">{error}</p>}
        {state === 'running' ? (
          <p className="timed__count">Toque junto com o clique</p>
        ) : (
          <button className="button button-primary" type="button" onClick={start}>
            {value === null ? 'Começar' : 'Medir de novo'}
          </button>
        )}
        {value !== null && state !== 'running' && (
          <p className="training__message">
            Atraso medido: <strong>{value} ms</strong>. {state === 'done' && <Link to="/treino" state={location.state}>Voltar ao treino</Link>}
          </p>
        )}
      </div>
    </Shell>
  );
}
