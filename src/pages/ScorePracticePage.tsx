// Estudar uma peça do repertório a partir do MusicXML: a partitura desenhada pelo OpenSheetMusicDisplay,
// um cursor que espera a nota (modo estudar) ou anda no tempo do metrônomo (modo no tempo),
// escolha de mão e repetição de compassos. A lógica fica em src/score/practice.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OpenSheetMusicDisplay, type Note } from 'opensheetmusicdisplay';
import { db, type Piece } from '../db/db';
import { getFile } from '../repertoire/repo';
import { useNoteInput, useNoteOn, midiStatusLabel } from '../input/useNoteInput';
import { useMetronome } from '../metronome/MetronomeProvider';
import {
  createWait,
  expectedFor,
  measureAccuracy,
  measureCount,
  playableSteps,
  timedPlan,
  waitPress,
  weakestRange,
  type Hand,
  type Range,
  type ScoreStep,
  type TimedPlan,
  type WaitState,
} from '../score/practice';
import { judgeExpected, windowsFor, type PlayedEvent, type TakeResult } from '../training/timing';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../training/clickTrack';
import { saveRun } from '../training/runs';
import { canFullscreen, enterFullscreen, useFullscreenState } from '../hooks/useFullscreen';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import ThemeToggle from '../components/ThemeToggle';
import { TakeSummary } from '../components/TimedRunner';
import { CloseIcon, ExpandIcon, MinusIcon, PlayIcon, PlugIcon, PlusIcon } from '../components/Icons';

interface Loaded {
  piece: Piece;
  steps: ScoreStep[];
  staffCount: number;
  beatsPerBar: number;
  low: number;
  high: number;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Percorre a partitura com o cursor e anota o que soa em cada momento. */
function readSteps(osmd: OpenSheetMusicDisplay): { steps: ScoreStep[]; staffCount: number } {
  const staves = osmd.Sheet.Staves;
  const cursor = osmd.cursor;
  cursor.reset();
  const steps: ScoreStep[] = [];
  let beat = 0;
  let lastTs: number | null = null;
  let lastLen = 1;
  let guard = 0;
  while (!cursor.Iterator.EndReached && guard++ < 20000) {
    const ts = cursor.Iterator.currentTimeStamp.RealValue * 4;
    if (lastTs !== null) {
      const d = ts - lastTs;
      beat += d > 0 ? d : lastLen;
    }
    const notes = cursor.NotesUnderCursor().filter((n: Note) => !n.isRest() && !n.IsGraceNote && n.PrintObject !== false);
    lastLen = notes.length ? Math.min(...notes.map((n) => n.Length.RealValue * 4)) : 1;
    steps.push({
      measure: cursor.Iterator.CurrentMeasureIndex + 1,
      beat,
      notes: notes.map((n) => ({
        midi: n.halfTone + 12,
        staff: Math.max(0, staves.indexOf(n.ParentStaffEntry.ParentStaff)),
        tied: Boolean(n.NoteTie && n.NoteTie.StartNote !== n),
      })),
    });
    lastTs = ts;
    cursor.next();
  }
  cursor.reset();
  return { steps, staffCount: Math.max(1, staves.length) };
}

export default function ScorePracticePage({ onClose }: { onClose: () => void }) {
  const id = Number(useParams().id);
  const { midi, connectMidi, press, release } = useNoteInput();
  const metronome = useMetronome();
  const isFull = useFullscreenState();
  const paperRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const cursorAt = useRef(0);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'estudar' | 'tempo'>('estudar');
  const [hand, setHand] = useState<Hand>('direita');
  const [range, setRange] = useState<Range>({ from: 1, to: 1 });
  const [bpm, setBpm] = useState(60);
  const [lightKeys, setLightKeys] = useState(true);

  // ---------- carregar ----------
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const piece = await db.pieces.get(id);
      if (!piece?.scoreFileId) return setError('Esta peça ainda não tem o MusicXML. Adicione em Editar.');
      let file;
      try {
        file = await getFile(piece.scoreFileId);
      } catch (err) {
        return setError(err instanceof Error ? err.message : 'Não deu para baixar o arquivo.');
      }
      if (!file || !paperRef.current || cancelled) return;
      const osmd = new OpenSheetMusicDisplay(paperRef.current, {
        autoResize: true,
        backend: 'svg',
        drawTitle: true,
        drawPartNames: false,
        followCursor: true,
        cursorsOptions: [{ type: 0, color: cssVar('--color-petrol') || 'teal', alpha: 0.45, follow: true }],
      });
      try {
        await osmd.load(file.blob, piece.title);
        if (cancelled) return;
        osmd.render();
        osmd.cursor.show();
      } catch (err) {
        console.error(err);
        return setError('Não deu para ler este MusicXML. Exporte de novo no MuseScore e tente outra vez.');
      }
      osmdRef.current = osmd;
      const { steps, staffCount } = readSteps(osmd);
      const all = steps.flatMap((s) => s.notes.map((n) => n.midi));
      const low = Math.max(21, Math.min(...all, 60) - 2);
      const high = Math.min(108, Math.max(...all, 72) + 2);
      const ts = osmd.Sheet.SourceMeasures[0]?.ActiveTimeSignature;
      const beatsPerBar = ts ? Math.round((ts.Numerator * 4) / ts.Denominator) || 4 : 4;
      cursorAt.current = 0;
      setRange({ from: 1, to: measureCount(steps) });
      // Começa em 60% do andamento da partitura, como na escada de BPM do treino.
      const tempo = osmd.Sheet.DefaultStartTempoInBpm;
      if (tempo > 0) setBpm(Math.max(40, Math.round((tempo * 0.6) / 2) * 2));
      setLoaded({ piece, steps, staffCount, beatsPerBar, low, high });
    })();
    return () => {
      cancelled = true;
      osmdRef.current?.clear();
      osmdRef.current = null;
    };
  }, [id]);

  /** Leva o cursor da partitura até um passo. */
  const moveCursor = useCallback((step: number) => {
    const osmd = osmdRef.current;
    if (!osmd) return;
    const c = osmd.cursor;
    if (step < cursorAt.current) {
      c.reset();
      cursorAt.current = 0;
    }
    while (cursorAt.current < step && !c.Iterator.EndReached) {
      c.next();
      cursorAt.current++;
    }
  }, []);

  const order = useMemo(() => (loaded ? playableSteps(loaded.steps, hand, loaded.staffCount, range) : []), [loaded, hand, range]);

  // ---------- modo estudar ----------
  const [wait, setWait] = useState<WaitState>(() => createWait([]));
  useEffect(() => {
    setWait(createWait(order));
    if (order.length) moveCursor(order[0]);
  }, [order, moveCursor, mode]);

  const currentStep = loaded && wait.order.length ? loaded.steps[wait.order[wait.pos]] : null;
  const expected = currentStep && loaded ? expectedFor(currentStep, hand, loaded.staffCount) : [];

  // ---------- modo no tempo ----------
  const [take, setTake] = useState<'idle' | 'countin' | 'playing' | 'done'>('idle');
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<{ r: TakeResult; weak: Range | null } | null>(null);
  const trackRef = useRef<ScheduledTrack | null>(null);
  const planRef = useRef<TimedPlan | null>(null);
  const eventsRef = useRef<PlayedEvent[]>([]);
  const takeRef = useRef(take);
  takeRef.current = take;

  const stopTake = () => {
    trackRef.current?.cancel();
    trackRef.current = null;
    setTake('idle');
  };

  useEffect(() => () => trackRef.current?.cancel(), []);
  useEffect(() => {
    if (mode === 'estudar') stopTake();
    setResult(null);
  }, [mode, hand, range]);

  const startTake = () => {
    if (!loaded) return;
    if (metronome.running) metronome.stop();
    const plan = timedPlan(loaded.steps, hand, loaded.staffCount, range, bpm);
    if (!plan.expected.length) return;
    const track = scheduleTrack({ bpm, countIn: loaded.beatsPerBar, beats: plan.beats, beatsPerBar: loaded.beatsPerBar });
    if (!track) return;
    planRef.current = plan;
    trackRef.current = track;
    eventsRef.current = [];
    setResult(null);
    moveCursor(plan.stepTimes[0].step);
    setTake('countin');
  };

  useEffect(() => {
    if (take !== 'countin' && take !== 'playing') return;
    let raf = 0;
    const tick = () => {
      const track = trackRef.current;
      const plan = planRef.current;
      if (!track || !plan || !loaded) return;
      const t = performance.now();
      setNow(t);
      const elapsed = t - track.firstBeat;
      if (elapsed >= 0 && takeRef.current === 'countin') setTake('playing');
      // O cursor chega um pouquinho antes da nota, para dar tempo de ler.
      let target = plan.stepTimes[0].step;
      for (const st of plan.stepTimes) if (st.t <= elapsed + 90) target = st.step;
      moveCursor(target);
      const reach = Math.max(150, track.beatMs / 2);
      if (elapsed > plan.lengthMs + reach) {
        const r = judgeExpected(plan.expected, eventsRef.current, windowsFor(1), reach);
        const weak = weakestRange(measureAccuracy(plan, r.notes.map((n) => n?.grade)));
        trackRef.current = null;
        setResult({ r, weak });
        setTake('done');
        void saveRun({ treinoId: `peca-${loaded.piece.uid ?? loaded.piece.id}`, kind: 'timed', bpm, accuracy: r.accuracy, clean: r.clean });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [take, loaded, bpm, moveCursor]);

  // ---------- entrada de notas ----------
  const [wrongKey, setWrongKey] = useState<number | null>(null);
  useNoteOn((m, at) => {
    if (!loaded) return;
    if (mode === 'estudar') {
      if (!currentStep) return;
      const next = waitPress(wait, m, expected);
      setWrongKey(next.wrong);
      if (next.pos !== wait.pos || next.laps !== wait.laps) moveCursor(next.order[next.pos]);
      setWait(next);
      return;
    }
    const track = trackRef.current;
    if (!track || (takeRef.current !== 'countin' && takeRef.current !== 'playing')) return;
    const t = at - track.firstBeat - (getLatency() ?? 0);
    if (t < -track.beatMs) return;
    eventsRef.current = [...eventsRef.current, { midi: m, t }];
  });

  // Teclado começa no trecho da peça.
  useEffect(() => {
    const box = keysRef.current;
    if (!box || !loaded) return;
    const anchor = box.querySelector<HTMLElement>(`[data-midi="${loaded.low + 2}"]`);
    if (anchor) box.scrollLeft = Math.max(0, anchor.offsetLeft - 40);
  }, [loaded]);

  const marks: Partial<Record<number, KeyMark>> = {};
  if (mode === 'estudar' && lightKeys) for (const m of expected) if (!wait.pressed.includes(m)) marks[m] = 'lit';
  if (mode === 'estudar' && wrongKey !== null) marks[wrongKey] = 'miss';

  const total = loaded ? measureCount(loaded.steps) : 1;
  const track = trackRef.current;
  const countdown = take === 'countin' && track ? Math.max(1, Math.ceil(-(now - track.firstBeat) / track.beatMs)) : null;
  const setFrom = (v: number) => setRange((r) => ({ from: Math.min(Math.max(1, v), r.to), to: r.to }));
  const setTo = (v: number) => setRange((r) => ({ from: r.from, to: Math.max(Math.min(total, v), r.from) }));

  return (
    <div className="session">
      <header className="session__bar">
        <button className="session__icon" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">Estudar a peça</p>
          <h1 className="session__name">{loaded?.piece.title ?? ''}</h1>
        </div>
        <div className="session__controls">
          <div className="segmented" role="group" aria-label="Modo">
            <button type="button" className={'segmented__option' + (mode === 'estudar' ? ' segmented__option-active' : '')} aria-pressed={mode === 'estudar'} onClick={() => setMode('estudar')}>
              Estudar
            </button>
            <button type="button" className={'segmented__option' + (mode === 'tempo' ? ' segmented__option-active' : '')} aria-pressed={mode === 'tempo'} onClick={() => setMode('tempo')}>
              No tempo
            </button>
          </div>
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

      <main className="session__stage training__stage scorePractice">
        {error ? (
          <p className="training__how">{error}</p>
        ) : (
          <>
            {loaded && (
              <div className="scorePractice__bar">
                {loaded.staffCount > 1 && (
                  <div className="segmented" role="group" aria-label="Mão">
                    {(['direita', 'esquerda', 'duas'] as Hand[]).map((h) => (
                      <button key={h} type="button" className={'segmented__option' + (hand === h ? ' segmented__option-active' : '')} aria-pressed={hand === h} onClick={() => setHand(h)}>
                        {h === 'direita' ? 'Mão direita' : h === 'esquerda' ? 'Mão esquerda' : 'Duas mãos'}
                      </button>
                    ))}
                  </div>
                )}
                <div className="scorePractice__range">
                  <span>Compassos</span>
                  <input type="number" min={1} max={total} value={range.from} onChange={(e) => setFrom(Number(e.target.value))} aria-label="Do compasso" />
                  <span>a</span>
                  <input type="number" min={1} max={total} value={range.to} onChange={(e) => setTo(Number(e.target.value))} aria-label="Até o compasso" />
                  {(range.from !== 1 || range.to !== total) && (
                    <button className="button button-ghost button-small" type="button" onClick={() => setRange({ from: 1, to: total })}>
                      Peça inteira
                    </button>
                  )}
                </div>
                {mode === 'tempo' ? (
                  <div className="scorePractice__bpm">
                    <button className="metronome__step metronome__step-round" type="button" onClick={() => setBpm((b) => Math.max(30, b - 4))} aria-label="Mais devagar">
                      <MinusIcon className="metronome__stepIcon" />
                    </button>
                    <strong>{bpm} BPM</strong>
                    <button className="metronome__step metronome__step-round" type="button" onClick={() => setBpm((b) => Math.min(200, b + 4))} aria-label="Mais rápido">
                      <PlusIcon className="metronome__stepIcon" />
                    </button>
                  </div>
                ) : (
                  <label className="metronome__check">
                    <input type="checkbox" checked={lightKeys} onChange={(e) => setLightKeys(e.target.checked)} />
                    Acender a próxima tecla
                  </label>
                )}
              </div>
            )}

            <div className="scorePractice__paper">
              {!loaded && <p className="emptyState__body viewer__msg">Abrindo a peça…</p>}
              <div ref={paperRef} />
            </div>

            {loaded && (
              <div className="timed__controls">
                {mode === 'estudar' ? (
                  <span className="timed__hint">
                    {wait.laps > 0 ? `Volta ${wait.laps + 1} no trecho. ` : ''}
                    {wrongKey !== null ? 'Essa não. Procure de novo, a partitura espera.' : 'A partitura espera você tocar cada nota ou acorde.'}
                    {wait.missedSteps.length > 0 && ` · ${wait.missedSteps.length} ${wait.missedSteps.length === 1 ? 'ponto pediu' : 'pontos pediram'} segunda tentativa`}
                  </span>
                ) : take === 'countin' ? (
                  <p className="timed__count" aria-live="assertive">{countdown}</p>
                ) : take === 'playing' ? (
                  <button className="button button-secondary" type="button" onClick={stopTake}>Parar</button>
                ) : (
                  <>
                    <button className="button button-primary timed__start" type="button" onClick={startTake}>
                      <PlayIcon className="button__icon" />
                      {take === 'done' ? 'De novo' : 'Tocar'}
                    </button>
                    {result ? (
                      <span className="timed__hint">
                        <TakeSummary result={result.r} />
                        {result.weak && (
                          <>
                            {' · '}
                            <button className="linkButton" type="button" onClick={() => { setRange(result.weak!); setMode('estudar'); }}>
                              Estudar os compassos {result.weak.from === result.weak.to ? result.weak.from : `${result.weak.from} a ${result.weak.to}`}
                            </button>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="timed__hint">{loaded.beatsPerBar} tempos de contagem, depois o cursor anda no tempo.</span>
                    )}
                  </>
                )}
              </div>
            )}

            {loaded && (
              <div className="session__keyboard session__keyboard-full timed__keyboard" ref={keysRef}>
                <PianoKeyboard low={21} high={108} marks={marks} onPress={press} onRelease={release} label="Teclado inteiro" />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
