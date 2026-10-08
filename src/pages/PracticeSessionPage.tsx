// Sessão de treino imersiva: sem barra lateral, em tela cheia quando o aparelho deixa.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import Staff, { type NoteState } from '../components/Staff';
import DrillFeedback from '../components/DrillFeedback';
import ThemeToggle from '../components/ThemeToggle';
import { CloseIcon, ExpandIcon, PlugIcon } from '../components/Icons';
import { createDrill, drillReducer, isFinished, summarize, type DrillAction, type DrillState } from '../drill/drill';
import { makeExercise, type Exercise, type ExerciseKind } from '../music/exercises';
import type { Midi } from '../music/notes';
import { useNoteInput, useNoteOn } from '../input/useNoteInput';
import { midiStatusLabel } from '../input/useNoteInput';
import { canFullscreen, enterFullscreen, useElementWidth, useFullscreenState } from '../hooks/useFullscreen';
import { db } from '../db/db';
import { formatPercent, formatSeconds } from '../format';

const NAMES_KEY = 'fermata-show-names';

function readShowNames(): boolean {
  try {
    return localStorage.getItem(NAMES_KEY) === '1';
  } catch {
    return false;
  }
}

export default function PracticeSessionPage({ onClose }: { onClose: () => void }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const kind: ExerciseKind = params.get('modo') === 'musica' ? 'song' : 'locate';
  const isFull = useFullscreenState();
  const [staffRef, staffWidth] = useElementWidth<HTMLDivElement>();
  const { held, midi, connectMidi, press, release } = useNoteInput();

  const [exercise, setExercise] = useState<Exercise>(() => makeExercise(kind));
  const [drill, setDrill] = useState<DrillState>(() => createDrill(exercise.notes, performance.now()));
  const [showNames, setShowNames] = useState(readShowNames);
  const drillRef = useRef(drill);
  const sessionRef = useRef<Promise<number> | null>(null);

  const startExercise = useCallback((k: ExerciseKind) => {
    const ex = makeExercise(k);
    const next = createDrill(ex.notes, performance.now());
    sessionRef.current = null;
    drillRef.current = next;
    setExercise(ex);
    setDrill(next);
  }, []);

  if (exercise.kind !== kind) startExercise(kind);

  const persist = useCallback(
    (prev: DrillState, next: DrillState, played: Midi) => {
      if (prev === next) return;
      const now = Date.now();
      const s = summarize(next);
      if (!sessionRef.current) {
        sessionRef.current = db.sessions.add({
          exerciseId: exercise.id, kind: exercise.kind, startedAt: now, endedAt: now, total: 0, firstTry: 0, misses: 0, avgMs: 0,
        });
      }
      const correct = next.index > prev.index;
      const ms = correct ? next.results[next.results.length - 1].ms : null;
      const expected = prev.notes[prev.index];
      sessionRef.current
        .then((sessionId) =>
          db.transaction('rw', db.sessions, db.attempts, async () => {
            await db.attempts.add({ sessionId, at: now, expected, played, correct, ms });
            await db.sessions.update(sessionId, { endedAt: now, total: s.done, firstTry: s.firstTry, misses: s.misses, avgMs: s.avgMs ?? 0 });
          }),
        )
        .catch((err) => console.error('[Fermata] Não foi possível salvar a tentativa', err));
    },
    [exercise],
  );

  const dispatch = useCallback(
    (action: DrillAction) => {
      const prev = drillRef.current;
      const next = drillReducer(prev, action);
      drillRef.current = next;
      setDrill(next);
      if (action.type === 'press') persist(prev, next, action.midi);
    },
    [persist],
  );

  useNoteOn((note, at) => dispatch({ type: 'press', midi: note, at }));

  const toggleNames = () =>
    setShowNames((v) => {
      try {
        localStorage.setItem(NAMES_KEY, v ? '0' : '1');
      } catch {
        // vale só nesta visita
      }
      return !v;
    });

  const leave = onClose;

  const states: NoteState[] = useMemo(
    () =>
      exercise.notes.map((_, i) => {
        if (i < drill.index) return drill.results[i].wrong.length ? 'miss' : 'hit';
        if (i === drill.index) return 'current';
        return 'upcoming';
      }),
    [exercise.notes, drill],
  );

  const marks: Partial<Record<Midi, KeyMark>> = {};
  held.forEach((m) => { marks[m] = 'lit'; });
  if (drill.lastPress && !drill.lastPress.correct && held.has(drill.lastPress.midi)) marks[drill.lastPress.midi] = 'miss';

  const summary = summarize(drill);
  const finished = isFinished(drill);

  return (
    <div className="session">
      <header className="session__bar">
        <button className="session__icon" type="button" onClick={leave} aria-label="Sair do treino" title="Sair do treino">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">{exercise.subtitle}</p>
          <h1 className="session__name">{exercise.title}</h1>
        </div>
        <div className="session__controls">
          <div className="segmented" role="group" aria-label="Tipo de treino">
            <button type="button" className={'segmented__option' + (kind === 'locate' ? ' segmented__option-active' : '')} aria-pressed={kind === 'locate'} onClick={() => setParams({ modo: 'notas' }, { replace: true, state: location.state })}>
              Notas soltas
            </button>
            <button type="button" className={'segmented__option' + (kind === 'song' ? ' segmented__option-active' : '')} aria-pressed={kind === 'song'} onClick={() => setParams({ modo: 'musica' }, { replace: true, state: location.state })}>
              Música
            </button>
          </div>
          <button className="pill" type="button" aria-pressed={showNames} onClick={toggleNames}>
            {showNames ? 'Esconder nomes' : 'Mostrar nomes'}
          </button>
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

      <main className="session__stage">
        <section className="session__staff" aria-label="Pauta" ref={staffRef}>
          <Staff
            notes={exercise.notes}
            states={states}
            current={Math.min(drill.index, exercise.notes.length - 1)}
            showNames={showNames}
            barEvery={exercise.kind === 'song' ? 4 : undefined}
            width={staffWidth}
            label={`Pauta com ${exercise.notes.length} notas; ${summary.done} já tocadas`}
          />
        </section>

        <div className="session__feedback">
          {finished ? (
            <div className="session__done">
              <div className="drillFeedback drillFeedback-hit" role="status">
                <span className="drillFeedback__text">
                  Pronto: {summary.firstTry} de {summary.total} notas de primeira
                </span>
                {summary.avgMs !== null && <span className="drillFeedback__detail">{formatSeconds(summary.avgMs)} por nota</span>}
              </div>
              <div className="session__doneActions">
                <button className="button button-primary" type="button" onClick={() => startExercise(kind)}>
                  Treinar de novo
                </button>
                <button className="button button-secondary" type="button" onClick={leave}>
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <DrillFeedback feedback={drill.feedback} />
          )}
        </div>
      </main>

      <footer className="session__footer">
        <dl className="session__stats">
          <div className="session__stat">
            <dt className="page__eyebrow">Notas</dt>
            <dd className="session__statValue">{summary.done} de {summary.total}</dd>
          </div>
          <div className="session__stat">
            <dt className="page__eyebrow">De primeira</dt>
            <dd className="session__statValue">{summary.done ? formatPercent(summary.firstTry / summary.done) : '—'}</dd>
          </div>
          <div className="session__stat">
            <dt className="page__eyebrow">Tempo médio</dt>
            <dd className="session__statValue">{summary.avgMs !== null ? formatSeconds(summary.avgMs) : '—'}</dd>
          </div>
          <div className="session__stat">
            <dt className="page__eyebrow">Erros</dt>
            <dd className="session__statValue">{summary.misses}</dd>
          </div>
        </dl>
        <div className="session__keyboard">
          <PianoKeyboard
            low={60}
            high={72}
            marks={marks}
            showNames={showNames}
            showComputerKeys
            onPress={press}
            onRelease={release}
            label="Teclado de Dó 4 a Dó 5"
          />
        </div>
        <button className="button button-ghost button-small session__restart" type="button" onClick={() => startExercise(kind)}>
          Recomeçar
        </button>
      </footer>
    </div>
  );
}
