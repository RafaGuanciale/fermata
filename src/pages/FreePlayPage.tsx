// Tocar livre: sem exercício, sem nota certa. O acorde que você forma aparece grande, o que você toca sobe num
// rolo a partir das teclas, e dá para gravar e ouvir depois. Cada minuto com nota conta no tempo de piano
// (separado como "livre" no Progresso).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { midiStatusLabel, useNoteInput } from '../input/useNoteInput';
import { CloseIcon, ExpandIcon, PlugIcon, RecordIcon, StopIcon } from '../components/Icons';
import { FullKeyboard } from '../components/KeyboardDock';
import MetronomeButton from '../components/MetronomeButton';
import SoundButton from '../components/SoundButton';
import ThemeToggle from '../components/ThemeToggle';
import { keyGeometry } from '../components/keyGeometry';
import { canFullscreen, enterFullscreen, useFullscreenState } from '../hooks/useFullscreen';
import { identifyChord } from '../reference/data';
import { noteInfo, type Midi } from '../music/notes';
import { dayKey } from '../training/progress';
import { useRecorder } from '../recording/useRecorder';
import { saveRecording } from '../recording/repo';
import RecordingsPanel from '../recording/RecordingsPanel';
import { useMetronome } from '../metronome/MetronomeProvider';
import { pulseReport, pulseText } from '../metronome/pulse';
import { BACKING_STYLES } from '../backing/backing';
import { useBacking } from '../backing/useBacking';

/** Quanto tempo o rolo mostra, do teclado até o alto. */
const WINDOW_MS = 6000;

const stamp = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function FreePlayPage({ onClose }: { onClose: () => void }) {
  const { held, press, release, midi, connectMidi, subscribe } = useNoteInput();
  const isFull = useFullscreenState();
  const [view, setView] = useState<'tocar' | 'gravacoes'>('tocar');
  const recorder = useRecorder();
  const [recStart, setRecStart] = useState<number | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [now, setNow] = useState(() => performance.now());

  // Teclado inteiro no notebook e no tablet; no celular, cinco oitavas.
  const narrow = typeof window !== 'undefined' && window.innerWidth < 720;
  const [low, high] = narrow ? [36, 96] : [21, 108];
  const geometry = useMemo(() => keyGeometry(low, high), [low, high]);

  // ----- o rolo: notas recentes, cada uma com início e fim (fim null = ainda segurada) -----
  const notesRef = useRef<{ midi: Midi; start: number; end: number | null }[]>([]);
  /** Inícios das notas dos últimos minutos, para medir o pulso com o metrônomo que some. */
  const onsetsRef = useRef<number[]>([]);
  const metronome = useMetronome();
  const [backingId, setBackingId] = useState<string | null>(null);
  const backing = BACKING_STYLES.find((b) => b.id === backingId) ?? null;
  const backingBar = useBacking(backing, metronome.bpm);
  useEffect(
    () =>
      subscribe((e) => {
        const list = notesRef.current;
        if (e.type === 'on') {
          list.push({ midi: e.midi, start: e.at, end: null });
          onsetsRef.current = [...onsetsRef.current.filter((t) => t > e.at - 120_000), e.at];
          setCount((c) => c + 1);
        } else {
          for (let i = list.length - 1; i >= 0; i--) if (list[i].midi === e.midi && list[i].end === null) { list[i].end = e.at; break; }
        }
      }),
    [subscribe],
  );
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const list = notesRef.current;
      const cut = performance.now() - WINDOW_MS;
      notesRef.current = list.filter((n) => n.end === null || n.end > cut);
      // ~30 quadros por segundo enquanto há algo subindo ou gravando.
      if ((notesRef.current.length || recStart !== null) && t - last > 33) {
        last = t;
        setNow(performance.now());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [recStart]);

  // ----- gravar -----
  const stopAndSave = async () => {
    const take = recorder.stop();
    setRecStart(null);
    if (!take || !take.notes.length) return;
    const title = `Tocar livre, ${stamp.format(Date.now())}`;
    await saveRecording({ title, kind: 'livre', durationMs: take.durationMs, notes: take.notes, pedal: take.pedal });
    setSaved(title);
  };
  const stopRef = useRef(stopAndSave);
  stopRef.current = stopAndSave;
  // Fechou a tela gravando: guarda o que já foi tocado.
  useEffect(() => () => void stopRef.current(), []);

  const toggleRecord = () => {
    if (recorder.recording) return void stopAndSave();
    setSaved(null);
    const t = performance.now();
    recorder.start(t);
    setRecStart(t);
  };

  // ----- acorde agora -----
  const heldList = [...held].sort((a, b) => a - b);
  const chord = heldList.length >= 3 ? identifyChord(heldList) : null;
  const names = heldList.length ? heldList.map((m) => noteInfo(m).name).filter((n, i, a) => a.indexOf(n) === i) : [];

  // Pulso: com o metrônomo que some ligado, quanto você adianta ou atrasa com e sem o clique.
  const pulse = metronome.running && metronome.gap > 0 ? pulseReport(onsetsRef.current, metronome.beatLog().filter((b) => b.t > performance.now() - 120_000), 60000 / metronome.bpm) : null;

  const today = dayKey(Date.now());
  const freeToday = useLiveQuery(async () => (await db.practice.where('day').equals(today).toArray()).reduce((s, p) => s + (p.free ?? 0), 0), [today]) ?? 0;
  const recCount = useLiveQuery(() => db.recordings.count(), []) ?? 0;

  return (
    <div className="session session-fit freePlay">
      <header className="session__bar">
        <button className="session__icon" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">Treino livre</p>
          <h1 className="session__name">Tocar livre</h1>
        </div>
        <div className="session__controls">
          <div className="segmented" role="group" aria-label="Tela">
            <button type="button" className={'segmented__option' + (view === 'tocar' ? ' segmented__option-active' : '')} aria-pressed={view === 'tocar'} onClick={() => setView('tocar')}>
              Tocar
            </button>
            <button type="button" className={'segmented__option' + (view === 'gravacoes' ? ' segmented__option-active' : '')} aria-pressed={view === 'gravacoes'} onClick={() => setView('gravacoes')}>
              Gravações{recCount ? ` (${recCount})` : ''}
            </button>
          </div>
          <button className={'pill freePlay__rec' + (recorder.recording ? ' freePlay__rec-on' : '')} type="button" onClick={toggleRecord} aria-pressed={recorder.recording}>
            {recorder.recording ? <StopIcon className="pill__icon" /> : <RecordIcon className="pill__icon freePlay__recDot" />}
            {recorder.recording && recStart !== null ? `Parar ${clock(now - recStart)}` : 'Gravar'}
          </button>
          <MetronomeButton placement="down" />
          <SoundButton placement="down" />
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

      {view === 'gravacoes' ? (
        <main className="freePlay__list">
          <RecordingsPanel empty="Nenhuma gravação ainda. Aperte Gravar, toque o que quiser e aperte Parar: fica guardado aqui, e na sua conta." />
        </main>
      ) : (
        <main className="freePlay__stage">
          <div className="freePlay__now" aria-live="polite">
            {chord ? (
              <>
                <span className="freePlay__chord">{chord.symbol}</span>
                <span className="freePlay__chordName">{chord.name}</span>
              </>
            ) : names.length ? (
              <span className="freePlay__notes">{names.join(' · ')}</span>
            ) : (
              <span className="freePlay__idle">Toque o que quiser. Acordes aparecem aqui pelo nome.</span>
            )}
          </div>
          <p className="freePlay__meta">
            {saved ? (
              <>
                Guardado: {saved} ·{' '}
                <button className="linkButton" type="button" onClick={() => setView('gravacoes')}>Ver gravações</button>
              </>
            ) : (
              <>Hoje, tocando livre: {freeToday} min · {count} {count === 1 ? 'nota' : 'notas'} agora</>
            )}
          </p>
          <div className="freePlay__backing">
            <div className="segmented" role="group" aria-label="Acompanhamento">
              <button type="button" className={'segmented__option' + (!backing ? ' segmented__option-active' : '')} aria-pressed={!backing} onClick={() => setBackingId(null)}>
                Sem acompanhamento
              </button>
              {BACKING_STYLES.map((b) => (
                <button key={b.id} type="button" className={'segmented__option' + (backingId === b.id ? ' segmented__option-active' : '')} aria-pressed={backingId === b.id} onClick={() => setBackingId(b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
            {backing && (
              <p className="freePlay__backingNow">
                {backingBar >= 0 ? (
                  <>
                    <strong>{backing.bars[backingBar].symbol}</strong>, depois {backing.bars[(backingBar + 1) % backing.bars.length].symbol}
                  </>
                ) : (
                  'Começando…'
                )}
                {' · '}improvise na {backing.scale.name} ({backing.scale.names}) · {metronome.bpm} BPM, mude no metrônomo
              </p>
            )}
          </div>
          {pulse && (
            <p className="freePlay__pulse" aria-live="polite">
              {pulse.silent
                ? <>Sem o clique: <strong>{pulseText(pulse.silent)}</strong>{pulse.click ? <> · com o clique: {pulseText(pulse.click)}</> : null}</>
                : 'Metrônomo que some ligado: toque semínimas junto com o clique e continue quando ele calar.'}
            </p>
          )}
        </main>
      )}

      {view === 'tocar' && (
        <div className="scoreStage__keys freePlay__keys">
          <div className="freePlay__roll" aria-hidden>
            {notesRef.current.map((n, i) => {
              const g = geometry.get(n.midi);
              if (!g) return null;
              const end = n.end ?? now;
              return (
                <span
                  key={`${n.midi}-${n.start}-${i}`}
                  className={'freePlay__bar' + (g.black ? ' freePlay__bar-black' : '') + (n.end === null ? ' freePlay__bar-held' : '')}
                  style={{ left: `${g.left}%`, width: `${g.width}%`, bottom: `${Math.max(0, ((now - end) / WINDOW_MS) * 100)}%`, height: `${Math.max(1.5, ((end - n.start) / WINDOW_MS) * 100)}%` }}
                />
              );
            })}
          </div>
          <FullKeyboard low={low} high={high} held={held} onPress={press} onRelease={release} className="fullKeyboard-score" />
        </div>
      )}
    </div>
  );
}
