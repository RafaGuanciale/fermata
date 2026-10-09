// Tocar uma música do repertório a partir do MusicXML.
// Estudar: a partitura espera cada nota ou acorde. Tocar junto: as notas andam no tempo do metrônomo,
// com teclas-guia, cascata de notas opcional e a outra mão tocada pelo app.
// A partitura é desenhada pelo OpenSheetMusicDisplay; as notas da vez são pintadas direto no SVG.
// A lógica fica em src/score/practice.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { OpenSheetMusicDisplay, type Note } from 'opensheetmusicdisplay';
import { db } from '../db/db';
import type { SongSpec } from '../course/types';
import { songXml } from '../course/song';
import { songPassed } from '../course/progress';
import { getFile, setPieceBpm } from '../repertoire/repo';
import { useNoteInput, useNoteOn, midiStatusLabel } from '../input/useNoteInput';
import { useMetronome } from '../metronome/MetronomeProvider';
import { whiteKeysBetween, type Midi } from '../music/notes';
import {
  createWait,
  expectedFor,
  handOfStaff,
  measureAccuracy,
  measureCount,
  playNotes,
  playableSteps,
  timedPlan,
  waitPress,
  weakestRange,
  type Hand,
  type PlayNote,
  type Range,
  type ScoreStep,
  type TimedPlan,
  type WaitState,
} from '../score/practice';
import { judgeExpected, windowsFor, type PlayedEvent, type TakeResult } from '../training/timing';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../training/clickTrack';
import { loadPiano, playNotes as synth } from '../audio/synth';
import { saveRun } from '../training/runs';
import { canFullscreen, enterFullscreen, useFullscreenState } from '../hooks/useFullscreen';
import { FullKeyboard, type FitMark } from '../components/KeyboardDock';
import ThemeToggle from '../components/ThemeToggle';
import { TakeSummary } from '../components/TimedRunner';
import { CloseIcon, ExpandIcon, MinusIcon, PlayIcon, PlugIcon, PlusIcon } from '../components/Icons';

interface NoteEl {
  midi: Midi;
  staff: number;
  el: SVGGElement | null;
}

interface Loaded {
  title: string;
  /** BPM ideal salvo (música do repertório) ou alvo (música do curso). */
  ideal: number | null;
  /** Id do registro de treino: "peca-<uid>" ou "curso-<id da música>". */
  runId: string;
  /** Só músicas do repertório: onde salvar o BPM ideal. */
  pieceId: number | null;
  /** Só músicas do curso: o que precisa para passar. */
  song: SongSpec | null;
  steps: ScoreStep[];
  staffCount: number;
  beatsPerBar: number;
  low: Midi;
  high: Midi;
  scoreTempo: number | null;
}

type Mode = 'estudar' | 'junto';
type Take = 'idle' | 'countin' | 'playing' | 'done';

const NOTE_CLASSES = ['sn-current', 'sn-ok', 'sn-late', 'sn-miss', 'sn-done'];
const LOOK_MS = 2600;

/** Percorre a partitura com o cursor: o que soa em cada momento e o elemento SVG de cada nota. */
function readScore(osmd: OpenSheetMusicDisplay): { steps: ScoreStep[]; els: NoteEl[][]; staffCount: number } {
  const staves = osmd.Sheet.Staves;
  const cursor = osmd.cursor;
  cursor.reset();
  const steps: ScoreStep[] = [];
  const els: NoteEl[][] = [];
  let beat = 0;
  let lastTs: number | null = null;
  let lastLen = 1;
  let guard = 0;
  const keep = (n: Note) => !n.isRest() && !n.IsGraceNote && n.PrintObject !== false;
  while (!cursor.Iterator.EndReached && guard++ < 20000) {
    const ts = cursor.Iterator.currentTimeStamp.RealValue * 4;
    if (lastTs !== null) {
      const d = ts - lastTs;
      beat += d > 0 ? d : lastLen;
    }
    const notes = cursor.NotesUnderCursor().filter(keep);
    lastLen = notes.length ? Math.min(...notes.map((n) => n.Length.RealValue * 4)) : 1;
    const staffOf = (n: Note) => Math.max(0, staves.indexOf(n.ParentStaffEntry.ParentStaff));
    steps.push({
      measure: cursor.Iterator.CurrentMeasureIndex + 1,
      beat,
      notes: notes.map((n) => ({ midi: n.halfTone + 12, staff: staffOf(n), tied: Boolean(n.NoteTie && n.NoteTie.StartNote !== n), beats: n.Length.RealValue * 4 })),
    });
    els.push(
      cursor
        .GNotesUnderCursor()
        .filter((g) => keep(g.sourceNote))
        .map((g) => ({
          midi: g.sourceNote.halfTone + 12,
          staff: staffOf(g.sourceNote),
          el: (g as unknown as { getSVGGElement?: () => SVGGElement }).getSVGGElement?.() ?? null,
        })),
    );
    lastTs = ts;
    cursor.next();
  }
  cursor.reset();
  return { steps, els, staffCount: Math.max(1, staves.length) };
}

/** Teclas da cascata: posição e largura em %, na mesma geometria do teclado. */
function keyGeometry(low: Midi, high: Midi) {
  const whites = whiteKeysBetween(low, high);
  const W = whites.length;
  const map = new Map<Midi, { left: number; width: number; black: boolean }>();
  whites.forEach((m, i) => {
    map.set(m, { left: (i / W) * 100, width: (1 / W) * 100, black: false });
    if (m + 1 <= high && !whites.includes(m + 1)) map.set(m + 1, { left: ((i + 1 - 0.31) / W) * 100, width: (0.62 / W) * 100, black: true });
  });
  return map;
}

const CLICK_KEY = 'fermata-score-click';

/** Toca uma música do repertório (pelo id da rota) ou uma música do curso (`song`). */
export default function ScorePracticePage({ onClose, song }: { onClose: () => void; song?: SongSpec }) {
  const id = Number(useParams().id);
  // A página de Progresso pode abrir direto num trecho difícil.
  const startAt = useLocation().state as { from?: number; to?: number } | null;
  const startFrom = startAt?.from;
  const startTo = startAt?.to;
  const { midi, held, connectMidi, press, release } = useNoteInput();
  const metronome = useMetronome();
  const isFull = useFullscreenState();
  const paperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const elsRef = useRef<NoteEl[][]>([]);
  const paintedRef = useRef<SVGGElement[]>([]);
  const [renderTick, setRenderTick] = useState(0);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('estudar');
  const [hand, setHand] = useState<Hand>('direita');
  const [range, setRange] = useState<Range>({ from: 1, to: 1 });
  const [bpm, setBpm] = useState(80);
  const [guideKeys, setGuideKeys] = useState(true);
  const [cascade, setCascade] = useState(true);
  const [otherHand, setOtherHand] = useState(true);
  const [click, setClick] = useState(() => {
    try {
      return localStorage.getItem(CLICK_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const toggleClick = (on: boolean) => {
    setClick(on);
    try {
      localStorage.setItem(CLICK_KEY, on ? '1' : '0');
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  };

  useEffect(() => {
    void loadPiano();
  }, []);

  // ---------- carregar ----------
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let source: Blob | string;
      let meta: Pick<Loaded, 'title' | 'ideal' | 'runId' | 'pieceId' | 'song'>;
      if (song) {
        source = songXml(song);
        meta = { title: song.title, ideal: song.bpm, runId: `curso-${song.id}`, pieceId: null, song };
      } else {
        const piece = await db.pieces.get(id);
        if (!piece?.scoreFileId) return setError('Esta música ainda não tem o MusicXML. Adicione em Editar.');
        let file;
        try {
          file = await getFile(piece.scoreFileId);
        } catch (err) {
          return setError(err instanceof Error ? err.message : 'Não deu para baixar o arquivo.');
        }
        if (!file) return;
        source = file.blob;
        meta = { title: piece.title, ideal: piece.bpm ?? null, runId: `peca-${piece.uid ?? piece.id}`, pieceId: piece.id ?? null, song: null };
      }
      if (!hostRef.current || cancelled) return;
      const osmd = new OpenSheetMusicDisplay(hostRef.current, {
        autoResize: false,
        backend: 'svg',
        drawTitle: true,
        drawPartNames: false,
        followCursor: false,
      });
      try {
        await osmd.load(source, meta.title);
        if (cancelled) return;
        osmd.render();
      } catch (err) {
        console.error(err);
        return setError('Não deu para ler este MusicXML. Exporte de novo no MuseScore e tente outra vez.');
      }
      osmdRef.current = osmd;
      const { steps, els, staffCount } = readScore(osmd);
      elsRef.current = els;
      const all = steps.flatMap((s) => s.notes.map((n) => n.midi));
      const minNote = Math.min(...all, 60);
      const maxNote = Math.max(...all, 72);
      // Teclado do trecho da música, de Dó a Dó, com pelo menos duas oitavas.
      // Teclado inteiro (88 teclas), como o piano de verdade.
      const low = Math.min(21, minNote);
      const high = Math.max(108, maxNote);
      const ts = osmd.Sheet.SourceMeasures[0]?.ActiveTimeSignature;
      const beatsPerBar = ts ? Math.round((ts.Numerator * 4) / ts.Denominator) || 4 : 4;
      const tempo = osmd.Sheet.DefaultStartTempoInBpm;
      const scoreTempo = tempo > 0 ? Math.round(tempo) : null;
      const total = measureCount(steps);
      if (startFrom && startTo && startFrom <= startTo && startTo <= total) setRange({ from: startFrom, to: startTo });
      else setRange({ from: 1, to: total });
      setBpm(meta.song ? Math.round(meta.song.bpm * 0.8) : (meta.ideal ?? scoreTempo ?? 80));
      setHand('direita');
      setLoaded({ ...meta, steps, staffCount, beatsPerBar, low, high, scoreTempo });
      if (meta.song) setHand(meta.song.hands);
    })();
    return () => {
      cancelled = true;
      osmdRef.current?.clear();
      osmdRef.current = null;
    };
  }, [id, song, startFrom, startTo]);

  // Redesenha a partitura quando a largura muda (os elementos SVG mudam, então relê).
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper || !loaded) return;
    let last = paper.clientWidth;
    let timer = 0;
    const ro = new ResizeObserver(() => {
      if (Math.abs(paper.clientWidth - last) < 24) return;
      last = paper.clientWidth;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const osmd = osmdRef.current;
        if (!osmd) return;
        osmd.render();
        elsRef.current = readScore(osmd).els;
        paintedRef.current = [];
        setRenderTick((t) => t + 1);
      }, 250);
    });
    ro.observe(paper);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [loaded]);

  const order = useMemo(() => (loaded ? playableSteps(loaded.steps, hand, loaded.staffCount, range) : []), [loaded, hand, range]);
  const allNotes = useMemo(() => (loaded ? playNotes(loaded.steps, loaded.staffCount, range, bpm) : []), [loaded, range, bpm]);

  // ---------- estudar ----------
  const [wait, setWait] = useState<WaitState>(() => createWait([]));
  const [wrongKey, setWrongKey] = useState<number | null>(null);
  useEffect(() => {
    setWait(createWait(order));
    setWrongKey(null);
  }, [order, mode]);

  const currentStep = loaded && wait.order.length ? loaded.steps[wait.order[wait.pos]] : null;
  const expected = currentStep && loaded ? expectedFor(currentStep, hand, loaded.staffCount) : [];

  // ---------- tocar junto ----------
  const [take, setTake] = useState<Take>('idle');
  const [listening, setListening] = useState(false);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<{ r: TakeResult; weak: Range | null; plan: TimedPlan } | null>(null);
  const trackRef = useRef<ScheduledTrack | null>(null);
  const planRef = useRef<TimedPlan | null>(null);
  const eventsRef = useRef<PlayedEvent[]>([]);
  const stopSoundRef = useRef<(() => void) | null>(null);
  const takeRef = useRef<Take>(take);
  takeRef.current = take;

  const stopTake = useCallback(() => {
    trackRef.current?.cancel();
    trackRef.current = null;
    stopSoundRef.current?.();
    stopSoundRef.current = null;
    setListening(false);
    setTake('idle');
  }, []);

  useEffect(() => () => {
    trackRef.current?.cancel();
    stopSoundRef.current?.();
  }, []);

  useEffect(() => {
    stopTake();
    setResult(null);
  }, [mode, hand, range, stopTake]);

  const start = (listenOnly: boolean) => {
    if (!loaded) return;
    if (metronome.running) metronome.stop();
    const plan = timedPlan(loaded.steps, hand, loaded.staffCount, range, bpm);
    if (!plan.stepTimes.length) return;
    // Sem clique, nem a contagem soa: a tela mostra 4, 3, 2, 1 e a cascata mostra quando entrar.
    const track = scheduleTrack({ bpm, countIn: loaded.beatsPerBar, beats: plan.beats, beatsPerBar: loaded.beatsPerBar, volume: listenOnly ? 0.35 : 0.6, pulse: click, countInSound: click });
    if (!track) return;
    // O app toca: tudo (ouvir) ou só a outra mão (acompanhamento).
    const sounding = allNotes.filter((n) => listenOnly || (otherHand && hand !== 'duas' && n.hand !== hand));
    stopSoundRef.current = sounding.length
      ? synth(sounding.map((n) => ({ midi: n.midi, at: track.firstBeatCtx + n.t / 1000, dur: n.dur / 1000 })), listenOnly ? 0.75 : 0.55)
      : null;
    planRef.current = plan;
    trackRef.current = track;
    eventsRef.current = [];
    setResult(null);
    setListening(listenOnly);
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
      const reach = Math.max(150, track.beatMs / 2);
      if (elapsed > plan.lengthMs + reach) {
        trackRef.current = null;
        stopSoundRef.current = null;
        if (listening) {
          setListening(false);
          setTake('idle');
          return;
        }
        const r = judgeExpected(plan.expected, eventsRef.current, windowsFor(1), reach);
        const weak = weakestRange(measureAccuracy(plan, r.notes.map((n) => n?.grade)));
        setResult({ r, weak, plan });
        setTake('done');
        const passed = loaded.song ? songPassed(loaded.song, { bpm, accuracy: r.accuracy, hand, from: range.from, to: range.to, bars: measureCount(loaded.steps) }) : undefined;
        void saveRun({ treinoId: loaded.runId, kind: 'timed', bpm, accuracy: r.accuracy, clean: r.clean, weakFrom: weak?.from, weakTo: weak?.to, passed });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [take, loaded, bpm, listening, hand, range]);

  // ---------- entrada de notas ----------
  useNoteOn((m, at) => {
    if (!loaded) return;
    if (mode === 'estudar') {
      if (!currentStep) return;
      const next = waitPress(wait, m, expected);
      setWrongKey(next.wrong);
      setWait(next);
      return;
    }
    const track = trackRef.current;
    if (!track || listening || (takeRef.current !== 'countin' && takeRef.current !== 'playing')) return;
    const t = at - track.firstBeat - (getLatency() ?? 0);
    if (t < -track.beatMs) return;
    eventsRef.current = [...eventsRef.current, { midi: m, t }];
  });

  // ---------- o que está acontecendo agora ----------
  const track = trackRef.current;
  const elapsed = track && (take === 'countin' || take === 'playing') ? now - track.firstBeat : null;
  const plan = planRef.current;
  let playStep: number | null = null;
  if (mode === 'junto' && plan && elapsed !== null && elapsed >= -60) {
    for (const st of plan.stepTimes) if (st.t <= elapsed + 60) playStep = st.step;
  }
  const liveJudge = mode === 'junto' && take === 'playing' && plan && elapsed !== null && !listening ? judgeExpected(plan.expected, eventsRef.current, windowsFor(1), Math.max(150, (track?.beatMs ?? 1000) / 2), elapsed) : null;

  // ---------- pintar a partitura ----------
  // A mão que não está sendo estudada fica apagada.
  useEffect(() => {
    if (!loaded) return;
    elsRef.current.forEach((step) =>
      step.forEach((n) => n.el?.classList.toggle('sn-muted', hand !== 'duas' && handOfStaff(n.staff, loaded.staffCount) !== hand)),
    );
  }, [hand, loaded, renderTick]);

  useEffect(() => {
    if (!loaded) return;
    for (const el of paintedRef.current) el.classList.remove(...NOTE_CLASSES);
    const painted: SVGGElement[] = [];
    const paint = (step: number, cls: string, onlyMidi?: Midi) => {
      for (const n of elsRef.current[step] ?? []) {
        if (!n.el) continue;
        if (hand !== 'duas' && handOfStaff(n.staff, loaded.staffCount) !== hand) continue;
        if (onlyMidi !== undefined && n.midi !== onlyMidi) continue;
        n.el.classList.add(cls);
        painted.push(n.el);
      }
    };

    let focus: number | null = null;
    if (mode === 'estudar') {
      wait.order.forEach((step, i) => {
        if (i < wait.pos) paint(step, wait.missedSteps.includes(step) ? 'sn-late' : 'sn-done');
      });
      if (currentStep) {
        const step = wait.order[wait.pos];
        paint(step, 'sn-current');
        for (const m of wait.pressed) paint(step, 'sn-ok', m);
        focus = step;
      }
    } else {
      const judged = liveJudge ?? (take === 'done' ? result?.r : null);
      const p = take === 'done' ? result?.plan : plan;
      if (judged && p) {
        p.expected.forEach((e, i) => {
          const g = judged.notes[i]?.grade;
          if (!g) return;
          paint(e.step, g === 'perfect' || g === 'good' ? 'sn-ok' : g === 'off' ? 'sn-late' : 'sn-miss', e.midi ?? undefined);
        });
      }
      if (playStep !== null) {
        paint(playStep, 'sn-current');
        focus = playStep;
      } else if (take === 'idle' && order.length) focus = order[0];
    }
    paintedRef.current = painted;

    // Mantém a nota da vez visível dentro do papel.
    const paper = paperRef.current;
    const el = focus !== null ? elsRef.current[focus]?.find((n) => n.el)?.el : null;
    if (paper && el) {
      const pr = paper.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      if (er.top < pr.top + 40 || er.bottom > pr.bottom - 40) {
        paper.scrollTo({ top: paper.scrollTop + (er.top - pr.top) - pr.height / 3, behavior: 'smooth' });
      }
    }
  });

  // ---------- teclado e cascata ----------
  const marks: Partial<Record<Midi, FitMark>> = {};
  if (mode === 'estudar') {
    if (guideKeys && currentStep) {
      const handFor = (m: Midi): FitMark => {
        const n = currentStep.notes.find((x) => x.midi === m);
        return n && loaded && handOfStaff(n.staff, loaded.staffCount) === 'esquerda' ? 'left' : 'right';
      };
      for (const m of expected) marks[m] = wait.pressed.includes(m) ? 'ok' : handFor(m);
    }
    if (wrongKey !== null) marks[wrongKey] = 'miss';
  } else if (elapsed !== null && guideKeys) {
    for (const n of allNotes) {
      if (n.t <= elapsed + 40 && n.t + n.dur > elapsed + 40 && (hand === 'duas' || n.hand === hand || otherHand || listening)) marks[n.midi] = n.hand === 'esquerda' ? 'left' : 'right';
    }
  }

  const geometry = useMemo(() => (loaded ? keyGeometry(loaded.low, loaded.high) : null), [loaded]);
  const showCascade = mode === 'junto' && cascade && geometry;
  const cascadeTime = elapsed ?? (take === 'idle' && loaded ? -loaded.beatsPerBar * (60000 / bpm) : null);

  const total = loaded ? measureCount(loaded.steps) : 1;
  const countdown = take === 'countin' && track ? Math.max(1, Math.ceil(-(now - track.firstBeat) / track.beatMs)) : null;
  const setFrom = (v: number) => setRange((r) => ({ from: Math.min(Math.max(1, v), r.to), to: r.to }));
  const setTo = (v: number) => setRange((r) => ({ from: r.from, to: Math.max(Math.min(total, v), r.from) }));
  const ideal = loaded?.ideal ?? loaded?.scoreTempo ?? null;
  const busy = take === 'countin' || take === 'playing';

  const saveIdeal = async () => {
    if (!loaded?.pieceId) return;
    await setPieceBpm(loaded.pieceId, bpm);
    setLoaded({ ...loaded, ideal: bpm });
  };

  return (
    <div className="session session-fit">
      <header className="session__bar">
        <button className="session__icon" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">Tocar a música</p>
          <h1 className="session__name">{loaded?.title ?? ''}</h1>
        </div>
        <div className="session__controls">
          <div className="segmented" role="group" aria-label="Modo">
            <button type="button" className={'segmented__option' + (mode === 'estudar' ? ' segmented__option-active' : '')} aria-pressed={mode === 'estudar'} onClick={() => setMode('estudar')}>
              Estudar
            </button>
            <button type="button" className={'segmented__option' + (mode === 'junto' ? ' segmented__option-active' : '')} aria-pressed={mode === 'junto'} onClick={() => setMode('junto')}>
              Tocar junto
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

      <main className="scoreStage">
        {error ? (
          <p className="training__how">{error}</p>
        ) : (
          <>
            <div className="scoreStage__bar">
              {loaded && loaded.staffCount > 1 && (
                <div className="segmented" role="group" aria-label="Mão">
                  {(['direita', 'esquerda', 'duas'] as Hand[]).map((h) => (
                    <button key={h} type="button" className={'segmented__option' + (hand === h ? ' segmented__option-active' : '')} aria-pressed={hand === h} onClick={() => setHand(h)}>
                      {h === 'direita' ? 'Mão direita' : h === 'esquerda' ? 'Mão esquerda' : 'Duas mãos'}
                    </button>
                  ))}
                </div>
              )}
              <div className="scoreStage__range">
                <span>Compassos</span>
                <input type="number" min={1} max={total} value={range.from} onChange={(e) => setFrom(Number(e.target.value))} aria-label="Do compasso" />
                <span>a</span>
                <input type="number" min={1} max={total} value={range.to} onChange={(e) => setTo(Number(e.target.value))} aria-label="Até o compasso" />
                {(range.from !== 1 || range.to !== total) && (
                  <button className="linkButton" type="button" onClick={() => setRange({ from: 1, to: total })}>
                    Música inteira
                  </button>
                )}
              </div>
              {mode === 'junto' && (
                <div className="scoreStage__bpm">
                  <button className="metronome__step metronome__step-round" type="button" onClick={() => setBpm((b) => Math.max(30, b - 4))} aria-label="Mais devagar" disabled={busy}>
                    <MinusIcon className="metronome__stepIcon" />
                  </button>
                  <span className="scoreStage__bpmValue">
                    <strong>{bpm} BPM</strong>
                    {loaded?.song ? (
                      <small>alvo para passar: {loaded.song.bpm} BPM</small>
                    ) : ideal !== null && (
                      bpm === ideal ? <small>ideal da música</small> : (
                        <button className="linkButton" type="button" onClick={() => void saveIdeal()}>
                          usar como ideal
                        </button>
                      )
                    )}
                  </span>
                  <button className="metronome__step metronome__step-round" type="button" onClick={() => setBpm((b) => Math.min(220, b + 4))} aria-label="Mais rápido" disabled={busy}>
                    <PlusIcon className="metronome__stepIcon" />
                  </button>
                </div>
              )}
              <div className="scoreStage__toggles">
                <label className="metronome__check">
                  <input type="checkbox" checked={guideKeys} onChange={(e) => setGuideKeys(e.target.checked)} />
                  Teclas-guia
                </label>
                {mode === 'junto' && (
                  <label className="metronome__check">
                    <input type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} />
                    Cascata
                  </label>
                )}
                {mode === 'junto' && (
                  <label className="metronome__check">
                    <input type="checkbox" checked={click} onChange={(e) => toggleClick(e.target.checked)} />
                    Clique
                  </label>
                )}
                {mode === 'junto' && hand !== 'duas' && loaded && loaded.staffCount > 1 && (
                  <label className="metronome__check">
                    <input type="checkbox" checked={otherHand} onChange={(e) => setOtherHand(e.target.checked)} />
                    App toca a outra mão
                  </label>
                )}
              </div>
            </div>

            <div className="scorePaper" ref={paperRef}>
              {!loaded && <p className="scorePaper__msg">Abrindo a música…</p>}
              <div ref={hostRef} />
            </div>

            {loaded && (
              <div className="scoreStage__status">
                {mode === 'estudar' ? (
                  <span className="timed__hint">
                    {wait.laps > 0 ? `Volta ${wait.laps + 1} no trecho · ` : ''}
                    {wrongKey !== null ? 'Essa não. A partitura espera a nota certa.' : 'Toque a nota ou o acorde pintado. A partitura espera você.'}
                    {wait.missedSteps.length > 0 && ` · ${wait.missedSteps.length} ${wait.missedSteps.length === 1 ? 'ponto pediu' : 'pontos pediram'} segunda tentativa`}
                  </span>
                ) : take === 'countin' ? (
                  <p className="timed__count" aria-live="assertive">{countdown}</p>
                ) : take === 'playing' ? (
                  <>
                    <button className="button button-secondary button-small" type="button" onClick={stopTake}>Parar</button>
                    <span className="timed__hint">{listening ? 'Ouvindo o trecho' : `${bpm} BPM`}</span>
                  </>
                ) : (
                  <>
                    <button className="button button-primary timed__start" type="button" onClick={() => start(false)}>
                      <PlayIcon className="button__icon" />
                      {take === 'done' ? 'De novo' : 'Tocar junto'}
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => start(true)}>
                      Ouvir o trecho
                    </button>
                    {result ? (
                      <span className="timed__hint">
                        <TakeSummary result={result.r} />
                        {loaded.song && (
                          <strong className="scoreStage__verdict">
                            {' · '}
                            {songPassed(loaded.song, { bpm, accuracy: result.r.accuracy, hand, from: range.from, to: range.to, bars: total })
                              ? 'Aprovado: projeto final concluído'
                              : `Para passar: música inteira, ${loaded.song.hands === 'duas' ? 'duas mãos' : `mão ${loaded.song.hands}`}, ${loaded.song.bpm} BPM e ${Math.round(loaded.song.pass.accuracy * 100)}% de acerto`}
                          </strong>
                        )}
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
                      <span className="timed__hint">Contagem de {loaded.beatsPerBar} tempos e as notas andam no tempo.</span>
                    )}
                  </>
                )}
              </div>
            )}

            {loaded && (
              <div className="scoreStage__keys">
                {showCascade && cascadeTime !== null && (
                  <Cascade notes={allNotes} geometry={geometry!} elapsed={cascadeTime} hand={hand} otherHand={otherHand || listening} />
                )}
                <FullKeyboard low={loaded.low} high={loaded.high} held={held} marks={marks} onPress={press} onRelease={release} className="fullKeyboard-score" />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** Notas caindo até o teclado, cada uma na coluna da sua tecla. Chegam na tecla na hora de tocar. */
function Cascade({ notes, geometry, elapsed, hand, otherHand }: { notes: PlayNote[]; geometry: Map<Midi, { left: number; width: number; black: boolean }>; elapsed: number; hand: Hand; otherHand: boolean }) {
  const visible = notes.filter((n) => n.t + n.dur > elapsed && n.t < elapsed + LOOK_MS && (hand === 'duas' || n.hand === hand || otherHand));
  return (
    <div className="cascade" aria-hidden>
      {visible.map((n, i) => {
        const g = geometry.get(n.midi);
        if (!g) return null;
        const bottom = ((n.t - elapsed) / LOOK_MS) * 100;
        const height = (n.dur / LOOK_MS) * 100;
        const active = hand === 'duas' || n.hand === hand;
        return (
          <span
            key={`${n.step}-${n.midi}-${i}`}
            className={'cascade__note' + (n.hand === 'esquerda' ? ' cascade__note-left' : '') + (g.black ? ' cascade__note-black' : '') + (active ? '' : ' cascade__note-other')}
            style={{ left: `${g.left}%`, width: `${g.width}%`, bottom: `${bottom}%`, height: `${Math.max(2, height)}%` }}
          />
        );
      })}
    </div>
  );
}
