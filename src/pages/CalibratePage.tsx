// Ajustar o atraso do piano: o aluno toca junto com o clique e o app mede a diferença (vale para tudo que é no tempo).

import { useRef, useState, type ReactNode } from 'react';
import { useNoteInput, useNoteOn, midiStatusLabel } from '../input/useNoteInput';
import { getLatency, scheduleTrack, setLatency } from '../training/clickTrack';
import { latencyReport } from '../training/timing';
import { canFullscreen, enterFullscreen, useFullscreenState } from '../hooks/useFullscreen';
import ThemeToggle from '../components/ThemeToggle';
import { CloseIcon, ExpandIcon, PlugIcon } from '../components/Icons';

// ---------- calibração ----------

const CAL_BPM = 80;
const CAL_BEATS = 12;
/** Dois compassos de contagem: o primeiro só para escutar o pulso, o segundo para preparar a mão. */
const CAL_COUNT = 8;
/** Respiro antes do primeiro clique, para a mão chegar ao piano. */
const LEAD_MS = 2000;

export default function CalibratePage({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [saved, setSaved] = useState<number | null>(getLatency());
  const [report, setReport] = useState<ReturnType<typeof latencyReport>>(null);
  const [error, setError] = useState<string | null>(null);
  const [beat, setBeat] = useState(0);
  const tapsRef = useRef<number[]>([]);
  const beatsRef = useRef<number[]>([]);
  const firstRef = useRef(0);

  useNoteOn((_m, at) => {
    if (state === 'running') tapsRef.current.push(at - firstRef.current);
  });

  const [preparing, setPreparing] = useState(false);

  const start = () => {
    setError(null);
    setReport(null);
    setPreparing(true);
    setState('running');
    window.setTimeout(() => {
      setPreparing(false);
      run();
    }, LEAD_MS);
  };

  const run = () => {
    const track = scheduleTrack({ bpm: CAL_BPM, countIn: CAL_COUNT, beats: CAL_BEATS, beatsPerBar: 4 });
    if (!track) return setError('Este navegador não toca áudio.');
    tapsRef.current = [];
    firstRef.current = track.firstBeat;
    beatsRef.current = Array.from({ length: CAL_BEATS }, (_, i) => i * track.beatMs);
    setError(null);
    setReport(null);
    setBeat(-CAL_COUNT);
    setState('running');
    // Contagem na tela: 4, 3, 2, 1 e depois os toques.
    const tick = window.setInterval(() => setBeat(Math.floor((performance.now() - track.firstBeat) / track.beatMs)), 16);
    window.setTimeout(() => {
      window.clearInterval(tick);
      const r = latencyReport(tapsRef.current, beatsRef.current);
      if (r === null) {
        setError('Não deu para medir: toque junto com cada clique depois da contagem. Tente de novo.');
        setState('idle');
        return;
      }
      setReport(r);
      if (r.usable) {
        setLatency(r.ms);
        setSaved(r.ms);
      }
      setState('done');
    }, track.firstBeat - performance.now() + CAL_BEATS * track.beatMs + 400);
  };

  return (
    <Shell eyebrow="Treino no tempo" title="Ajustar o atraso do piano" onClose={onClose}>
      <div className="training__done">
        <p className="training__how">
          Entre o piano, o cabo e o computador sempre existe um pequeno atraso. Primeiro vêm 4 cliques só para escutar o pulso e mais 4 de contagem (4, 3, 2, 1). Depois, toque qualquer tecla <strong>quando ouvir</strong> cada clique, 12 vezes. A bolinha pisca junto com o clique. Não tente adivinhar o clique: toque no som dele. O app mede a diferença e desconta em todos os exercícios no tempo.
        </p>
        {error && <p className="form__error">{error}</p>}

        {state === 'running' && (
          <div className="calib__stage" aria-live="polite">
            <span key={preparing ? 'p' : beat} className={'calib__pulse' + (!preparing && beat >= 0 ? ' calib__pulse-play' : '')} aria-hidden />
            <p className="timed__count">
              {preparing
                ? 'Mão no piano. Já vai começar…'
                : beat < -4
                  ? `Só escute o pulso · ${-beat - 4}`
                  : beat < 0
                    ? `Prepare: ${-beat}`
                    : `Toque junto · ${Math.min(CAL_BEATS, beat + 1)} de ${CAL_BEATS}`}
            </p>
          </div>
        )}

        {state === 'done' && report && (
          <div className={'training__message' + (report.usable ? '' : ' training__message-warn')}>
            {report.usable ? (
              <>
                <p><strong>Pronto: {report.ms} ms de atraso.</strong> O app já desconta esse tempo nos exercícios no tempo, no Treino e no "Tocar a música".</p>
                <p className="runner__note">Seus toques variaram {report.spread} ms entre si{report.spread <= 40 ? ': medida firme.' : '. Se quiser uma medida mais firme, meça de novo com calma.'}</p>
              </>
            ) : report.reason === 'early' ? (
              <p><strong>A medida deu {report.ms} ms: você tocou antes do clique.</strong> Isso é antecipação, muito comum: a mão tenta adivinhar o próximo clique. Meça de novo tocando só quando o som chegar. Esta medida não foi guardada.</p>
            ) : report.reason === 'late' ? (
              <p><strong>A medida deu {report.ms} ms, alto demais para o cabo.</strong> Confira se o som do computador sai por fone Bluetooth (ele atrasa muito o clique). Use o alto-falante ou um fone com fio e meça de novo. Esta medida não foi guardada.</p>
            ) : (
              <p><strong>Os toques ficaram espalhados demais ({report.spread} ms entre si).</strong> Meça de novo, com calma, tocando sempre no som do clique. Esta medida não foi guardada.</p>
            )}
          </div>
        )}

        {state !== 'running' && (
          <div className="runner__actions">
            {state === 'done' && report?.usable ? (
              <>
                <button className="button button-primary" type="button" onClick={onClose}>Concluir</button>
                <button className="button button-secondary" type="button" onClick={start}>Medir de novo</button>
              </>
            ) : (
              <>
                <button className="button button-primary" type="button" onClick={start}>{state === 'done' ? 'Medir de novo' : 'Começar'}</button>
                {state === 'done' && <button className="button button-secondary" type="button" onClick={onClose}>Fechar</button>}
              </>
            )}
          </div>
        )}

        {state === 'idle' && saved !== null && (
          <p className="runner__note">
            Atraso guardado neste aparelho: {saved} ms.{' '}
            <button className="linkButton" type="button" onClick={() => { setLatency(null); setSaved(null); }}>Zerar</button>
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

