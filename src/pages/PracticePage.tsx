import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import Staff, { type NoteState } from '../components/Staff';
import DrillFeedback from '../components/DrillFeedback';
import ThemeToggle from '../components/ThemeToggle';
import { BackIcon, PlugIcon } from '../components/Icons';
import { createDrill, drillReducer, isFinished, summarize, type DrillAction, type DrillState } from '../drill/drill';
import { makeExercise, type Exercise, type ExerciseKind } from '../music/exercises';
import type { Midi } from '../music/notes';
import { useNoteInput, type MidiStatus } from '../input/useNoteInput';
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

function midiLabel(status: MidiStatus): string {
  switch (status.kind) {
    case 'unsupported': return 'MIDI indisponível neste navegador';
    case 'idle': return 'Conectar teclado';
    case 'waiting': return 'Nenhum teclado encontrado';
    case 'denied': return 'Acesso ao MIDI negado';
    case 'connected': return status.names[0];
  }
}

export default function PracticePage() {
  const [params, setParams] = useSearchParams();
  const kind: ExerciseKind = params.get('modo') === 'musica' ? 'song' : 'locate';

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

  // Se o modo na URL mudar (link da tela Hoje, botão voltar), troca o exercício.
  if (exercise.kind !== kind) startExercise(kind);

  const persist = useCallback(
    (prev: DrillState, next: DrillState, played: Midi) => {
      if (prev === next) return;
      const now = Date.now();
      const s = summarize(next);
      if (!sessionRef.current) {
        sessionRef.current = db.sessions.add({
          exerciseId: exercise.id,
          kind: exercise.kind,
          startedAt: now,
          endedAt: now,
          total: 0,
          firstTry: 0,
          misses: 0,
          avgMs: 0,
        });
      }
      const correct = next.index > prev.index;
      const ms = correct ? next.results[next.results.length - 1].ms : null;
      const expected = prev.notes[prev.index];
      sessionRef.current
        .then((sessionId) =>
          db.transaction('rw', db.sessions, db.attempts, async () => {
            await db.attempts.add({ sessionId, at: now, expected, played, correct, ms });
            await db.sessions.update(sessionId, {
              endedAt: now,
              total: s.done,
              firstTry: s.firstTry,
              misses: s.misses,
              avgMs: s.avgMs ?? 0,
            });
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

  const { midi, connectMidi, press } = useNoteInput((note, at) => dispatch({ type: 'press', midi: note, at }));

  const toggleNames = () => {
    setShowNames((v) => {
      try {
        localStorage.setItem(NAMES_KEY, v ? '0' : '1');
      } catch {
        // Sem armazenamento: a preferência vale só nesta visita.
      }
      return !v;
    });
  };

  const states: NoteState[] = useMemo(
    () =>
      exercise.notes.map((_, i) => {
        if (i < drill.index) return drill.results[i].wrong.length ? 'miss' : 'hit';
        if (i === drill.index) return 'current';
        return 'upcoming';
      }),
    [exercise.notes, drill],
  );

  const marks: Partial<Record<Midi, KeyMark>> = drill.lastPress
    ? { [drill.lastPress.midi]: drill.lastPress.correct ? 'lit' : 'miss' }
    : {};

  const summary = summarize(drill);
  const finished = isFinished(drill);

  return (
    <div className="drill">
      <header className="drill__header">
        <div className="drill__heading">
          <Link className="button button-ghost" to="/">
            <BackIcon className="button__icon" />
            Sair do treino
          </Link>
          <div>
            <p className="page__eyebrow">Treino de leitura · {exercise.subtitle}</p>
            <h1 className="drill__title">{exercise.title}</h1>
          </div>
        </div>
        <div className="drill__controls">
          <div className="segmented" role="group" aria-label="Tipo de treino">
            <button
              type="button"
              className={'segmented__option' + (kind === 'locate' ? ' segmented__option-active' : '')}
              aria-pressed={kind === 'locate'}
              onClick={() => setParams({ modo: 'notas' })}
            >
              Notas soltas
            </button>
            <button
              type="button"
              className={'segmented__option' + (kind === 'song' ? ' segmented__option-active' : '')}
              aria-pressed={kind === 'song'}
              onClick={() => setParams({ modo: 'musica' })}
            >
              Música
            </button>
          </div>
          <button className="pill" type="button" aria-pressed={showNames} onClick={toggleNames}>
            {showNames ? 'Esconder nomes' : 'Mostrar nomes'}
          </button>
          <button
            className="pill"
            type="button"
            onClick={connectMidi}
            title="Conecte o piano ao computador pelo cabo USB e use o Chrome ou o Edge"
          >
            {midi.kind === 'connected' ? (
              <span className="pill__dot pill__dot-on" aria-hidden />
            ) : (
              <PlugIcon className="pill__icon" />
            )}
            {midiLabel(midi)}
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="drill__stage">
        <section className="drill__staffPanel" aria-label="Pauta">
          <Staff
            notes={exercise.notes}
            states={states}
            showNames={showNames}
            barEvery={exercise.kind === 'song' ? 4 : undefined}
            label={`Pauta com ${exercise.notes.length} notas; ${summary.done} já tocadas`}
          />
        </section>

        <div className="drill__feedbackSlot">
          {finished ? (
            <div className="drill__done">
              <div className="drillFeedback drillFeedback-hit" role="status" style={{ flex: '1 1 100%' }}>
                <span className="drillFeedback__text">
                  Pronto: {summary.firstTry} de {summary.total} notas de primeira
                </span>
                {summary.avgMs !== null && (
                  <span className="drillFeedback__detail">média de {formatSeconds(summary.avgMs)} por nota</span>
                )}
              </div>
              <button className="button button-primary" type="button" onClick={() => startExercise(kind)}>
                Treinar de novo
              </button>
              <Link className="button button-secondary" to="/">
                Ver minha evolução
              </Link>
            </div>
          ) : (
            <DrillFeedback feedback={drill.feedback} />
          )}
        </div>

        <div className="drill__input">
          <p className="drill__inputHelp">
            Toque no seu piano. Sem cabo, clique nas teclas abaixo ou use o teclado do computador: <span className="drill__kbd">A</span> é Dó,{' '}
            <span className="drill__kbd">S</span> é Ré, <span className="drill__kbd">D</span> é Mi e assim por diante.
          </p>
          <div className="drill__keyboardScroll">
            <PianoKeyboard
              low={60}
              high={72}
              marks={marks}
              showNames={showNames}
              showComputerKeys
              onPress={press}
              label="Teclado de Dó 4 a Dó 5"
            />
          </div>
        </div>
      </main>

      <footer className="drill__footer">
        <div className="drill__stats">
          <div className="drill__stat">
            <span className="page__eyebrow">Notas</span>
            <span className="drill__statValue">
              {summary.done} de {summary.total}
            </span>
          </div>
          <div className="drill__stat">
            <span className="page__eyebrow">De primeira</span>
            <span className="drill__statValue">{summary.done ? formatPercent(summary.firstTry / summary.done) : '—'}</span>
          </div>
          <div className="drill__stat">
            <span className="page__eyebrow">Tempo médio</span>
            <span className="drill__statValue">{summary.avgMs !== null ? formatSeconds(summary.avgMs) : '—'}</span>
          </div>
          <div className="drill__stat">
            <span className="page__eyebrow">Erros</span>
            <span className="drill__statValue">{summary.misses}</span>
          </div>
        </div>
        <button className="button button-secondary" type="button" onClick={() => startExercise(kind)}>
          Recomeçar
        </button>
      </footer>
    </div>
  );
}
