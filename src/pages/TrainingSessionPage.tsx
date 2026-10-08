import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useNoteInput, useNoteOn, midiStatusLabel } from '../input/useNoteInput';
import { noteInfo, type Midi } from '../music/notes';
import { findTreino, type Treino } from '../training/program';
import { afterRep, createLadder, repBpm, shouldIsolate, type Ladder, type TakeResult } from '../training/timing';
import { treinoStatus, TREINO_STATUS_LABEL } from '../training/progress';
import { bestCleanBpm, saveRun, useRuns } from '../training/runs';
import { getLatency } from '../training/clickTrack';
import { canFullscreen, enterFullscreen, useFullscreenState } from '../hooks/useFullscreen';
import TimedRunner from '../components/TimedRunner';
import WaitRunner from '../components/WaitRunner';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import ThemeToggle from '../components/ThemeToggle';
import { CloseIcon, ExpandIcon, PlugIcon } from '../components/Icons';
import { formatSeconds } from '../format';

/** Popup de um treino do programa: no tempo (com escada de BPM), estudar (espera) ou mapa do teclado. */
export default function TrainingSessionPage({ onClose }: { onClose: () => void }) {
  const { id = '' } = useParams();
  const location = useLocation();
  const found = findTreino(id);
  const runs = useRuns();
  const { midi, connectMidi } = useNoteInput();
  const isFull = useFullscreenState();
  const [showNames, setShowNames] = useState(false);

  if (!found) return <Navigate to="/treino" replace />;
  const { phase, treino } = found;
  if (treino.kind === 'locate') return <Navigate to={`/treino/sessao?modo=notas&treino=${treino.id}`} replace state={location.state} />;

  const index = phase.treinos.indexOf(treino) + 1;
  const status = runs ? treinoStatus(treino, runs) : null;

  return (
    <div className="session">
      <header className="session__bar">
        <button className="session__icon" type="button" onClick={onClose} aria-label="Fechar treino" title="Fechar treino">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">
            Fase {phase.n} · treino {index} de {phase.treinos.length}
            {status && status !== 'novo' ? ` · ${TREINO_STATUS_LABEL[status]}` : ''}
          </p>
          <h1 className="session__name">{treino.title}</h1>
        </div>
        <div className="session__controls">
          <button className="pill" type="button" aria-pressed={showNames} onClick={() => setShowNames((v) => !v)}>
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

      <main className="session__stage training__stage">
        <p className="training__how">{treino.how}{treino.source ? <span className="training__source"> · {treino.source}</span> : null}</p>
        {treino.kind === 'names' ? (
          <NamesRunner treino={treino} showNames={showNames} />
        ) : runs ? (
          <TimedTreino key={treino.id} treino={treino} phaseN={phase.n} showNames={showNames} lastClean={bestCleanBpm(runs, treino.id)} />
        ) : null}
      </main>
    </div>
  );
}

function TimedTreino({ treino, phaseN, showNames, lastClean }: { treino: Treino; phaseN: number; showNames: boolean; lastClean: number | null }) {
  const spec = treino.timed!;
  const [mode, setMode] = useState<'tempo' | 'estudar'>('tempo');
  const [ladder, setLadder] = useState<Ladder>(() => createLadder(spec.target, lastClean));
  const [message, setMessage] = useState<string | null>(null);
  const location = useLocation();
  const bpm = repBpm(ladder);
  const calibrated = getLatency() !== null;

  const onFinish = (r: TakeResult, played: number) => {
    const next = afterRep(ladder, r.clean, played);
    setLadder(next);
    void saveRun({ treinoId: treino.id, kind: 'timed', bpm: played, accuracy: r.accuracy, clean: r.clean, atTarget: next.atTarget });
    if (next.bpm > ladder.bpm) setMessage(`Três limpas seguidas. Subiu para ${next.bpm} BPM.`);
    else if (next.bpm < ladder.bpm) setMessage(shouldIsolate(next) ? `Voltou para ${next.bpm} BPM. Use o modo estudar no trecho que está travando e depois volte.` : `Voltou para ${next.bpm} BPM para recuperar o controle.`);
    else if (played < ladder.bpm) setMessage(r.clean ? 'Passada mais lenta, para variar. Agora volta ao tempo.' : 'Passada mais lenta, para variar.');
    else if (next.atTarget >= 3) setMessage('Três limpas no tempo-alvo. Repita em outro dia para dominar.');
    else if (r.clean) setMessage(`Limpa. ${next.bpm >= spec.target ? `${next.atTarget} de 3 no tempo-alvo.` : `${next.cleanStreak} de 3 para subir.`}`);
    else if (r.accuracy >= 0.85 && played >= spec.target) setMessage('Passou dos 85% no tempo-alvo: o treino está vencido. Agora busque passadas limpas.');
    else setMessage('Ainda não foi limpa. Devagar e com a mão solta.');
  };

  return (
    <>
      <div className="training__bar">
        <div className="segmented" role="group" aria-label="Modo">
          <button type="button" className={'segmented__option' + (mode === 'tempo' ? ' segmented__option-active' : '')} aria-pressed={mode === 'tempo'} onClick={() => setMode('tempo')}>
            No tempo
          </button>
          <button type="button" className={'segmented__option' + (mode === 'estudar' ? ' segmented__option-active' : '')} aria-pressed={mode === 'estudar'} onClick={() => setMode('estudar')}>
            Estudar
          </button>
        </div>
        {mode === 'tempo' && (
          <dl className="ladder">
            <div className="ladder__item">
              <dt>Agora</dt>
              <dd>{bpm} BPM</dd>
            </div>
            <div className="ladder__item">
              <dt>Alvo</dt>
              <dd>{spec.target} BPM</dd>
            </div>
            <div className="ladder__item">
              <dt>{ladder.bpm >= spec.target ? 'Limpas no alvo' : 'Limpas seguidas'}</dt>
              <dd>{ladder.bpm >= spec.target ? ladder.atTarget : ladder.cleanStreak} de 3</dd>
            </div>
          </dl>
        )}
      </div>
      {mode === 'tempo' && !calibrated && (
        <p className="training__notice">
          Antes do primeiro treino no tempo, ajuste o atraso do seu piano: leva 20 segundos.{' '}
          <Link to="/treino/calibrar" state={location.state}>Ajustar agora</Link>
        </p>
      )}
      {message && mode === 'tempo' && <p className="training__message" role="status">{message}</p>}
      {mode === 'tempo' ? (
        <TimedRunner spec={spec} bpm={bpm} phase={phaseN} showNames={showNames} lightKeys onFinish={onFinish} />
      ) : (
        <WaitRunner spec={spec} showNames={showNames} lightKeys />
      )}
    </>
  );
}

const NAME_POOL: number[] = [0, 2, 4, 5, 7, 9, 11];
const ROUNDS = 12;

function randomPitchClasses(n: number): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const pc = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
    if (pc !== out[out.length - 1]) out.push(pc);
  }
  return out;
}

/** Mapa do teclado: o app pede um nome e qualquer oitava vale. */
function NamesRunner({ treino, showNames }: { treino: Treino; showNames: boolean }) {
  const { press, release } = useNoteInput();
  const [round, setRound] = useState(0);
  const [prompts, setPrompts] = useState(() => randomPitchClasses(ROUNDS));
  const [results, setResults] = useState<{ ms: number; firstTry: boolean }[]>([]);
  const [wrong, setWrong] = useState<Midi | null>(null);
  const [lastHit, setLastHit] = useState<Midi | null>(null);
  const startedRef = useRef(performance.now());
  const missedRef = useRef(false);
  const done = round >= ROUNDS;

  useNoteOn((m, at) => {
    if (done) return;
    if (((m % 12) + 12) % 12 === prompts[round]) {
      const next = [...results, { ms: at - startedRef.current, firstTry: !missedRef.current }];
      setResults(next);
      setLastHit(m);
      setWrong(null);
      missedRef.current = false;
      startedRef.current = at;
      setRound((r) => r + 1);
      if (next.length === ROUNDS) {
        const firstTry = next.filter((r) => r.firstTry).length / ROUNDS;
        const avgMs = next.reduce((s, r) => s + r.ms, 0) / ROUNDS;
        void saveRun({ treinoId: treino.id, kind: 'names', accuracy: firstTry, firstTry, avgMs, passed: firstTry >= 0.9 && avgMs < 3000 });
      }
    } else {
      missedRef.current = true;
      setWrong(m);
    }
  });

  const restart = () => {
    setPrompts(randomPitchClasses(ROUNDS));
    setResults([]);
    setRound(0);
    setWrong(null);
    setLastHit(null);
    missedRef.current = false;
    startedRef.current = performance.now();
  };

  const name = done ? null : noteInfo(60 + prompts[round]).name;
  const firstTry = results.filter((r) => r.firstTry).length;
  const avg = results.length ? results.reduce((s, r) => s + r.ms, 0) / results.length : null;
  const marks: Partial<Record<number, KeyMark>> = {};
  if (lastHit !== null) marks[lastHit] = 'lit';
  if (wrong !== null) marks[wrong] = 'miss';
  const summary = useMemo(() => ({ firstTry, avg }), [firstTry, avg]);

  return (
    <div className="timed">
      <div className="names">
        {done ? (
          <>
            <p className="names__done">
              {summary.firstTry} de {ROUNDS} de primeira{summary.avg !== null ? ` · ${formatSeconds(summary.avg)} por nota` : ''}
            </p>
            <p className="timed__hint">
              {summary.firstTry / ROUNDS >= 0.9 && (summary.avg ?? Infinity) < 3000
                ? 'Este conta para vencer o treino. Repita em outro dia para fechar.'
                : 'Para contar: 90% de primeira e menos de 3 s por nota, em 2 dias diferentes.'}
            </p>
            <button className="button button-primary" type="button" onClick={restart}>
              De novo
            </button>
          </>
        ) : (
          <>
            <p className="page__eyebrow">Nota {round + 1} de {ROUNDS} · qualquer oitava</p>
            <p className="names__prompt" aria-live="polite">{name}</p>
            <p className="timed__hint">{wrong !== null ? `Essa foi ${noteInfo(wrong).name}. Procure de novo.` : 'Ache a tecla no piano.'}</p>
          </>
        )}
      </div>
      <div className="session__keyboard session__keyboard-full timed__keyboard">
        <PianoKeyboard low={36} high={84} marks={marks} showNames={showNames} onPress={press} onRelease={release} label="Teclado de Dó 2 a Dó 6" />
      </div>
    </div>
  );
}
