// Ajustar o atraso do piano: o aluno toca junto com o clique e o app mede a diferença (vale para tudo que é no tempo).

import { useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNoteInput, useNoteOn, midiStatusLabel } from '../input/useNoteInput';
import { getLatency, scheduleTrack, setLatency } from '../training/clickTrack';
import { latencyFromTaps } from '../training/timing';
import { canFullscreen, enterFullscreen, useFullscreenState } from '../hooks/useFullscreen';
import ThemeToggle from '../components/ThemeToggle';
import { CloseIcon, ExpandIcon, PlugIcon } from '../components/Icons';

// ---------- calibração ----------

const CAL_BPM = 80;
const CAL_BEATS = 12;

export default function CalibratePage({ onClose }: { onClose: () => void }) {
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

