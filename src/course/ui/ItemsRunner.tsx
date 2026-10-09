// Rodada de itens respondidos no teclado: achar nota, acorde, intervalo, grau de ouvido, eco.
// Com dicas (prática guiada) a resposta aparece depois de um erro; sem dicas (checkpoint) não.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PianoKeyboard, { type KeyMark } from '../../components/PianoKeyboard';
import Staff from '../../components/Staff';
import { useElementWidth } from '../../hooks/useFullscreen';
import { useNoteInput } from '../../input/useNoteInput';
import type { Midi } from '../../music/notes';
import { formatSeconds } from '../../format';
import { labelsVisible, pressItem, scoreItems, startItem, type ItemProgress } from '../judge';
import { nameOf } from '../music';
import type { Item } from '../types';
import { Verdict, pct, playListen, useStopOnUnmount } from './shared';

export interface ItemsResult {
  accuracy: number;
  avgMs: number | null;
  passed: boolean;
  perItem: { ok: boolean; skill: string }[];
}

interface Props {
  makeItems: () => Item[];
  low: Midi;
  high: Midi;
  labels: 'on' | 'fade' | 'off';
  hints: boolean;
  pass: { accuracy: number; avgMs?: number };
  onFinish: (r: ItemsResult) => void;
  startLabel?: string;
}

type Phase = 'idle' | 'listening' | 'answer' | 'between' | 'done';

export default function ItemsRunner({ makeItems, low, high, labels, hints, pass, onFinish, startLabel = 'Começar' }: Props) {
  const { subscribe, press, release } = useNoteInput();
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [prog, setProgState] = useState<ItemProgress>(startItem);
  const progRef = useRef<ItemProgress>(prog);
  const setProg = (p: ItemProgress) => {
    progRef.current = p;
    setProgState(p);
  };
  const [results, setResults] = useState<{ misses: number; ms: number; timedOut?: boolean; skill: string }[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [staffRef, staffWidth] = useElementWidth<HTMLDivElement>();
  const startedAt = useRef(0);
  const heldRef = useRef(new Set<Midi>());
  const stopSound = useStopOnUnmount();
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const item = items[index] as Item | undefined;

  const begin = useCallback((list: Item[], i: number) => {
    const it = list[i];
    setProg(startItem());
    setShowHint(false);
    setWrongChoice(null);
    if (it.listen) {
      setPhase('listening');
      stopSound.current?.();
      const { ms, stop } = playListen(it.listen);
      stopSound.current = stop;
      window.setTimeout(() => {
        startedAt.current = performance.now();
        setPhase((p) => (p === 'listening' ? 'answer' : p));
      }, ms);
    } else {
      startedAt.current = performance.now();
      setPhase('answer');
    }
  }, [stopSound]);

  const start = () => {
    const list = makeItems();
    setItems(list);
    setResults([]);
    setIndex(0);
    begin(list, 0);
  };

  const finishItem = useCallback((misses: number, timedOut = false) => {
    if (!item) return;
    const r = { misses, ms: performance.now() - startedAt.current, timedOut, skill: item.skill };
    const all = [...results, r];
    setResults(all);
    setPhase('between');
    window.setTimeout(() => {
      if (index + 1 < items.length) {
        setIndex(index + 1);
        begin(items, index + 1);
      } else {
        const s = scoreItems(all);
        const passed = s.accuracy >= pass.accuracy && (pass.avgMs === undefined || (s.avgMs ?? Infinity) <= pass.avgMs);
        setPhase('done');
        finishRef.current({ accuracy: s.accuracy, avgMs: s.avgMs, passed, perItem: all.map((x) => ({ ok: x.misses === 0 && !x.timedOut, skill: x.skill })) });
      }
    }, timedOut || misses ? 1400 : 650);
  }, [item, results, index, items, begin, pass]);

  // Teclas: mantém o conjunto segurado aqui (acordes precisam dele na hora exata).
  useEffect(() => subscribe((e) => {
    if (e.type === 'off') {
      heldRef.current.delete(e.midi);
      return;
    }
    heldRef.current.add(e.midi);
    if (phase !== 'answer' || !item) return;
    const p = progRef.current;
    const next = pressItem(p, item, e.midi, [...heldRef.current]);
    setProg(next);
    if (next.misses > p.misses && hints) setShowHint(true);
    if (next.done && !p.done) finishItem(next.misses);
  }), [subscribe, phase, item, hints, finishItem]);

  // Tempo-limite.
  useEffect(() => {
    if (phase !== 'answer' || !item?.timeLimitMs) return;
    let raf = 0;
    const tick = () => {
      const t = performance.now();
      setNow(t);
      if (t - startedAt.current >= item.timeLimitMs!) {
        setShowHint(true);
        finishItem(progRef.current.misses, true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, item, finishItem]);

  const recent = useMemo(() => results.map((r) => r.misses === 0 && !r.timedOut), [results]);
  const names = labelsVisible(labels, recent);

  const marks: Partial<Record<Midi, KeyMark>> = {};
  if (item && (showHint || phase === 'between') && item.hintKeys && (hints || phase === 'between')) item.hintKeys.forEach((m) => (marks[m] = 'lit'));
  prog.found.forEach((m) => (marks[m] = 'lit'));
  if (prog.lastWrong !== null && phase === 'answer') marks[prog.lastWrong] = 'miss';

  const score = scoreItems(results);
  const last = results[results.length - 1];
  const remaining = item?.timeLimitMs && phase === 'answer' ? Math.max(0, item.timeLimitMs - (now - startedAt.current)) : null;

  return (
    <div className="runner">
      {phase === 'idle' ? (
        <div className="runner__start">
          <button className="button button-primary" type="button" onClick={start}>{startLabel}</button>
        </div>
      ) : phase === 'done' ? (
        <div className="runner__summary">
          <Verdict tone={score.accuracy >= pass.accuracy ? 'hit' : 'miss'} detail={score.avgMs !== null ? `média ${formatSeconds(score.avgMs)}` : undefined}>
            {pct(score.accuracy)} certas de primeira {score.accuracy >= pass.accuracy ? '' : `(precisa de ${pct(pass.accuracy)})`}
          </Verdict>
          {pass.avgMs !== undefined && score.avgMs !== null && score.avgMs > pass.avgMs && (
            <p className="runner__note">Acertou, mas a média passou de {formatSeconds(pass.avgMs)}. Velocidade vem com repetição: faça de novo.</p>
          )}
          <button className="button button-secondary" type="button" onClick={start}>De novo</button>
        </div>
      ) : item ? (
        <>
          <div className="runner__head">
            <span className="runner__count">{index + 1} de {items.length}</span>
            {remaining !== null && <span className="runner__timer">{Math.ceil(remaining / 1000)} s</span>}
          </div>
          <div className="runner__prompt">
            <p className="runner__question">{item.prompt}</p>
            {item.symbol && <p className="runner__symbol">{item.symbol}</p>}
            {item.detail && <p className="runner__detail">{item.detail}</p>}
          </div>
          {item.staff && (
            <div className="runner__staff" ref={staffRef}>
              <Staff notes={item.staff.notes} states={item.staff.notes.map(() => 'current')} current={0} showNames={false} width={Math.min(staffWidth, 260)} clef={item.staff.clef} fifths={item.staff.fifths} label="Nota na pauta" />
            </div>
          )}
          {item.choices && (
            <div className="quiz__options">
              {item.choices.map((c, k) => (
                <button
                  key={k}
                  type="button"
                  className={'choice__option quiz__option' + (phase === 'between' && k === item.answer ? ' quiz__option-right' : '') + (wrongChoice === k ? ' quiz__option-wrong' : '')}
                  disabled={phase !== 'answer'}
                  onClick={() => {
                    if (k === item.answer) finishItem(progRef.current.misses);
                    else {
                      setWrongChoice(k);
                      setProg({ ...progRef.current, misses: progRef.current.misses + 1 });
                    }
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="runner__feedback">
            {phase === 'listening' ? (
              <Verdict tone="neutral">Ouça…</Verdict>
            ) : phase === 'between' && last ? (
              last.timedOut ? (
                <Verdict tone="miss">O tempo acabou. As teclas certas estão acesas.</Verdict>
              ) : last.misses === 0 ? (
                <Verdict tone="hit" detail={formatSeconds(last.ms)}>Certo</Verdict>
              ) : (
                <Verdict tone="miss">Certo depois de {last.misses} {last.misses === 1 ? 'erro' : 'erros'}</Verdict>
              )
            ) : wrongChoice !== null && item.choices ? (
              <Verdict tone="miss">Não é essa. Tente outra{hints && item.hint ? `: ${item.hint}` : ''}</Verdict>
            ) : prog.why ? (
              <Verdict tone="miss">{prog.why}</Verdict>
            ) : prog.lastWrong !== null ? (
              <Verdict tone="miss">Tocou {nameOf(prog.lastWrong)}. Tente de novo{hints && item.hint ? `: ${item.hint}` : ''}</Verdict>
            ) : item.steps.length > 1 ? (
              <Verdict tone="neutral">Nota {Math.min(prog.step + 1, item.steps.length)} de {item.steps.length}</Verdict>
            ) : null}
          </div>
          <div className="runner__actions">
            {item.listen && phase === 'answer' && (
              <button className="button button-secondary button-small" type="button" onClick={() => { stopSound.current?.(); stopSound.current = playListen(item.listen!).stop; }}>
                Ouvir de novo
              </button>
            )}
            {hints && !showHint && phase === 'answer' && (item.hintKeys || item.hint) && (
              <button className="linkButton" type="button" onClick={() => setShowHint(true)}>Mostrar dica</button>
            )}
            {phase === 'answer' && (
              <button className="linkButton" type="button" onClick={() => { setShowHint(true); finishItem(prog.misses + 1); }}>Pular</button>
            )}
          </div>
        </>
      ) : null}
      <div className="runner__keys">
        <PianoKeyboard low={low} high={high} marks={marks} showNames={names} onPress={press} onRelease={release} label="Teclado do exercício" />
      </div>
    </div>
  );
}
