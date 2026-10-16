// Ouvir e tocar de volta: o app toca, você repete de ouvido. A frase cresce quando você acerta.

import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseIcon, PlayIcon } from '../components/Icons';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import { useNoteInput, useNoteOn } from '../input/useNoteInput';
import { audioContext } from '../training/clickTrack';
import { loadPiano, playNotes } from '../audio/synth';
import { saveRun } from '../training/runs';
import { noteInfo, type Midi } from '../music/notes';
import { ECHO_POOLS, judgeEcho, makePhrase, nextLength, type EchoPool } from '../ear/echo';

const NOTE_S = 0.55;
type Phase = 'idle' | 'listening' | 'yours' | 'right' | 'wrong';

export default function EchoPage({ onClose }: { onClose: () => void }) {
  const { held, press, release } = useNoteInput();
  const [pool, setPool] = useState<EchoPool>('cinco');
  const [len, setLen] = useState(3);
  const [phrase, setPhrase] = useState<Midi[]>([]);
  const [played, setPlayed] = useState<Midi[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fails, setFails] = useState(0);
  const [wrong, setWrong] = useState<{ got: Midi; expected: Midi } | null>(null);
  const [best, setBest] = useState(0);
  const [rounds, setRounds] = useState({ ok: 0, total: 0 });
  const [names, setNames] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const listen = useCallback(async (notes: Midi[]) => {
    clearTimers();
    stopRef.current?.();
    const ctx = audioContext();
    if (!ctx) return;
    await loadPiano();
    setPhase('listening');
    setPlayed([]);
    const at0 = ctx.currentTime + 0.2;
    stopRef.current = playNotes(notes.map((m, i) => ({ midi: m, at: at0 + i * NOTE_S, dur: NOTE_S * 0.9, velocity: 0.7 })), 0.8);
    timers.current.push(window.setTimeout(() => setPhase('yours'), 200 + notes.length * NOTE_S * 1000));
  }, []);

  const newPhrase = useCallback(
    (length: number, p: EchoPool = pool) => {
      const next = makePhrase(Math.random, length, ECHO_POOLS[p].notes);
      setPhrase(next);
      setFails(0);
      setWrong(null);
      void listen(next);
    },
    [pool, listen],
  );

  useEffect(
    () => () => {
      clearTimers();
      stopRef.current?.();
    },
    [],
  );

  // Ao sair, guarda o melhor tamanho de frase do dia.
  const summary = useRef({ best, rounds });
  summary.current = { best, rounds };
  useEffect(
    () => () => {
      const s = summary.current;
      if (s.rounds.total) void saveRun({ treinoId: 'eco', kind: 'ear', level: s.best, accuracy: s.rounds.ok / s.rounds.total, reps: s.rounds.total });
    },
    [],
  );

  useNoteOn((m) => {
    if (phase !== 'yours') return;
    const next = [...played, m];
    const j = judgeEcho(phrase, next);
    setPlayed(next);
    if (j.state === 'wrong') {
      setWrong({ got: m, expected: j.expected });
      setPhase('wrong');
      const f = fails + 1;
      setFails(f);
      if (f >= 2) setRounds((r) => ({ ok: r.ok, total: r.total + 1 }));
    } else if (j.state === 'done') {
      setPhase('right');
      setBest((b) => Math.max(b, phrase.length));
      setRounds((r) => ({ ok: r.ok + (fails === 0 ? 1 : 0), total: r.total + 1 }));
      const nl = nextLength(len, fails === 0);
      setLen(nl);
      timers.current.push(window.setTimeout(() => newPhrase(nl), 1100));
    }
  });

  const retry = () => {
    setWrong(null);
    if (fails >= 2) {
      const nl = nextLength(len, false);
      setLen(nl);
      newPhrase(nl);
    } else void listen(phrase);
  };

  const notes = ECHO_POOLS[pool].notes;
  const marks: Partial<Record<Midi, KeyMark>> = {};
  if (phase === 'wrong' && wrong) {
    marks[wrong.got] = 'miss';
    if (fails >= 2) for (const m of phrase) marks[m] = 'lit';
    else marks[wrong.expected] = 'next';
  }

  return (
    <div className="session session-fit echo">
      <header className="session__bar">
        <button className="session__icon" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">Ouvido</p>
          <h1 className="session__name">Ouvir e tocar de volta</h1>
        </div>
        <div className="session__controls">
          <div className="segmented" role="group" aria-label="Notas">
            {(Object.keys(ECHO_POOLS) as EchoPool[]).map((p) => (
              <button
                key={p}
                type="button"
                className={'segmented__option' + (pool === p ? ' segmented__option-active' : '')}
                aria-pressed={pool === p}
                onClick={() => {
                  setPool(p);
                  if (phase !== 'idle') newPhrase(len, p);
                }}
              >
                {ECHO_POOLS[p].label}
              </button>
            ))}
          </div>
          <label className="metronome__check">
            <input type="checkbox" checked={names} onChange={(e) => setNames(e.target.checked)} />
            Nomes nas teclas
          </label>
        </div>
      </header>

      <main className="echo__stage">
        <div className="echo__dots" aria-hidden>
          {phrase.map((m, i) => (
            <span key={i} className={'echo__dot' + (i < played.length && (phase !== 'wrong' || i < played.length - 1) ? ' echo__dot-ok' : '') + (phase === 'wrong' && i === played.length - 1 ? ' echo__dot-miss' : '')}>
              {phase === 'wrong' && fails >= 2 ? noteInfo(m).name : null}
            </span>
          ))}
        </div>
        <p className="echo__status" aria-live="polite">
          {phase === 'idle' && 'O app toca uma frase curta. Você repete no piano, de ouvido. Acertou, a próxima tem uma nota a mais.'}
          {phase === 'listening' && 'Ouça…'}
          {phase === 'yours' && `Sua vez: ${phrase.length} notas.`}
          {phase === 'right' && (fails === 0 ? 'Isso! A próxima tem uma nota a mais.' : 'Isso! Agora uma nova frase.')}
          {phase === 'wrong' && wrong && (fails >= 2 ? `A frase era ${phrase.map((m) => noteInfo(m).name).join(', ')}. A próxima vem uma nota menor.` : `Essa era ${noteInfo(wrong.expected).name}, não ${noteInfo(wrong.got).name}. Ouça de novo e repita desde o começo.`)}
        </p>
        <div className="echo__actions">
          {phase === 'idle' ? (
            <button className="button button-primary" type="button" onClick={() => newPhrase(len)}>
              <PlayIcon className="button__icon" />
              Começar
            </button>
          ) : phase === 'wrong' ? (
            <button className="button button-primary" type="button" onClick={retry}>
              {fails >= 2 ? 'Próxima frase' : 'Ouvir de novo'}
            </button>
          ) : (
            <button className="button button-secondary" type="button" onClick={() => void listen(phrase)} disabled={phase === 'listening'}>
              Ouvir de novo
            </button>
          )}
        </div>
        {rounds.total > 0 && (
          <p className="echo__score">
            {best ? `Maior frase acertada: ${best} notas · ` : ''}{rounds.ok} de {rounds.total} de primeira
          </p>
        )}
      </main>

      <div className="echo__keys">
        <PianoKeyboard low={notes[0]} high={notes[notes.length - 1]} marks={marks} pressed={held} showNames={names} onPress={press} onRelease={release} label="Teclado do eco" />
      </div>
    </div>
  );
}
