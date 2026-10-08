// O teclado fixo na parte de baixo: as 88 teclas do seu piano, acendendo o que está sendo tocado
// (pelo MIDI, pelo teclado do computador ou clicando nele).

import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { noteInfo, whiteKeysBetween, type Midi } from '../music/notes';
import { detectTriad } from '../music/theory';
import MetronomeButton from './MetronomeButton';
import { useNoteInput } from '../input/useNoteInput';
import { midiStatusLabel } from '../input/useNoteInput';
import { ChevronIcon, PlugIcon } from './Icons';

const LOW = 21; // Lá0
const HIGH = 108; // Dó8
const OPEN_KEY = 'fermata-dock-open';

function readOpen(): boolean {
  try {
    const v = localStorage.getItem(OPEN_KEY);
    if (v !== null) return v === '1';
  } catch {
    // segue o padrão abaixo
  }
  return typeof window !== 'undefined' ? window.innerWidth >= 720 : true;
}

export type FitMark = 'right' | 'left' | 'ok' | 'miss';

export function FullKeyboard({ low, high, held, onPress, onRelease, labelCs = true, className = '', marks }: {
  low: Midi;
  high: Midi;
  held: ReadonlySet<Midi>;
  /** Teclas para destacar: próxima nota de cada mão, acerto ou erro. */
  marks?: Partial<Record<Midi, FitMark>>;
  onPress?: (m: Midi) => void;
  onRelease?: (m: Midi) => void;
  labelCs?: boolean;
  className?: string;
}) {
  const whites = whiteKeysBetween(low, high);
  const n = whites.length;
  const blacks: { midi: Midi; slot: number }[] = [];
  whites.forEach((m, i) => {
    if (m + 1 <= high && noteInfo(m + 1).isBlack) blacks.push({ midi: m + 1, slot: i + 1 });
  });

  const handlers = (m: Midi) =>
    onPress
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
            onPress(m);
          },
          onPointerUp: () => onRelease?.(m),
          onPointerLeave: () => held.has(m) && onRelease?.(m),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPress(m);
              window.setTimeout(() => onRelease?.(m), 180);
            }
          },
        }
      : {};

  return (
    <div className={'fullKeyboard ' + className} style={{ '--whites': n } as React.CSSProperties}>
      {whites.map((m) => {
        const info = noteInfo(m);
        return (
          <span
            key={m}
            data-midi={m}
            role={onPress ? 'button' : undefined}
            tabIndex={onPress ? -1 : undefined}
            aria-label={onPress ? `${info.name} ${info.sci}` : undefined}
            className={'fullKeyboard__white' + (held.has(m) ? ' fullKeyboard__white-on' : '') + (marks?.[m] ? ` fullKeyboard__key-${marks[m]}` : '')}
            {...handlers(m)}
          >
            {labelCs && info.letter === 0 && <span className="fullKeyboard__label">{info.sci}</span>}
          </span>
        );
      })}
      {blacks.map(({ midi, slot }) => (
        <span
          key={midi}
          data-midi={midi}
          role={onPress ? 'button' : undefined}
          tabIndex={onPress ? -1 : undefined}
          aria-label={onPress ? `${noteInfo(midi).name} ${noteInfo(midi).sci}` : undefined}
          className={'fullKeyboard__black' + (held.has(midi) ? ' fullKeyboard__black-on' : '') + (marks?.[midi] ? ` fullKeyboard__key-${marks[midi]}` : '')}
          style={{ '--slot': slot } as React.CSSProperties}
          {...handlers(midi)}
        />
      ))}
    </div>
  );
}

const HEIGHT_KEY = 'fermata-dock-height';
const MIN_H = 64;
const DEFAULT_H = 104;

function maxHeight() {
  return typeof window === 'undefined' ? 360 : Math.max(MIN_H + 40, Math.min(420, Math.round(window.innerHeight * 0.5)));
}

function readHeight(): number {
  try {
    const v = Number(localStorage.getItem(HEIGHT_KEY));
    if (v >= MIN_H) return Math.min(v, maxHeight());
  } catch {
    // padrão abaixo
  }
  return DEFAULT_H;
}

export default function KeyboardDock() {
  const { held, midi, connectMidi, press, release } = useNoteInput();
  const [open, setOpen] = useState(readOpen);
  const [height, setHeight] = useState(readHeight);
  const [dragging, setDragging] = useState(false);
  const dockRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // O dock fica fixo embaixo; a página reserva o espaço dele pela variável --dock-h.
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty('--dock-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--dock-h');
    };
  }, []);

  // Em telas estreitas o teclado rola de lado; começa centralizado no Dó central.
  useEffect(() => {
    const el = scrollRef.current;
    if (!open || !el || el.scrollWidth <= el.clientWidth) return;
    const middleC = el.querySelector('[data-midi="60"]') as HTMLElement | null;
    if (middleC) el.scrollLeft = middleC.offsetLeft - el.clientWidth / 2 + middleC.offsetWidth * 4;
  }, [open]);

  // Segue a última nota tocada quando ela sai da área visível.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || held.size === 0 || el.scrollWidth <= el.clientWidth) return;
    const last = Math.max(...held);
    const key = el.querySelector(`[data-midi="${last}"]`) as HTMLElement | null;
    if (!key) return;
    const left = key.offsetLeft;
    if (left < el.scrollLeft || left > el.scrollLeft + el.clientWidth - 40) el.scrollTo({ left: left - el.clientWidth / 2, behavior: 'smooth' });
  }, [held]);

  const saveHeight = (h: number) => {
    try {
      localStorage.setItem(HEIGHT_KEY, String(Math.round(h)));
    } catch {
      // vale só nesta visita
    }
  };

  const setOpenSaved = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem(OPEN_KEY, v ? '1' : '0');
    } catch {
      // vale só nesta visita
    }
  };

  // Arrastar a alça para cima aumenta as teclas; para baixo diminui. Abaixo do mínimo, recolhe.
  const startDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = open ? height : MIN_H - 30;
    let moved = false;
    let last = startH;
    setDragging(true);
    const onMove = (ev: PointerEvent) => {
      const dy = startY - ev.clientY;
      if (Math.abs(dy) > 3) moved = true;
      last = Math.max(MIN_H - 40, Math.min(maxHeight(), startH + dy));
      if (last >= MIN_H) {
        if (!open) setOpenSaved(true);
        setHeight(last);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragging(false);
      if (!moved) {
        setOpenSaved(!open);
        return;
      }
      if (last < MIN_H) setOpenSaved(false);
      else saveHeight(last);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onHandleKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(MIN_H, Math.min(maxHeight(), height + (e.key === 'ArrowUp' ? step : -step)));
      if (!open) setOpenSaved(true);
      setHeight(next);
      saveHeight(next);
    }
  };

  const notes = [...held].sort((a, b) => a - b);
  const chord = detectTriad(held);

  return (
    <section
      ref={dockRef}
      className={'dock' + (open ? ' dock-open' : '') + (dragging ? ' dock-dragging' : '')}
      aria-label="Seu teclado"
      style={{ '--kb-h': `${height}px` } as React.CSSProperties}
    >
      <button
        className="dock__handle"
        type="button"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Altura do teclado. Arraste ou use as setas para cima e para baixo."
        aria-valuemin={MIN_H}
        aria-valuemax={maxHeight()}
        aria-valuenow={open ? Math.round(height) : 0}
        onPointerDown={startDrag}
        onKeyDown={onHandleKey}
        title="Arraste para aumentar ou diminuir o teclado"
      >
        <span className="dock__grip" aria-hidden />
      </button>
      <div className="dock__bar">
        <button className="dock__toggle" type="button" onClick={() => setOpenSaved(!open)} aria-expanded={open}>
          <ChevronIcon className={'dock__chevron' + (open ? ' dock__chevron-open' : '')} />
          Teclado
        </button>
        <span className="dock__now" aria-live="polite">
          {chord ? (
            <>
              <strong>{chord.name}</strong> · {notes.map((m) => noteInfo(m).sci).join(' ')}
            </>
          ) : notes.length ? (
            notes.map((m) => `${noteInfo(m).name} (${noteInfo(m).sci})`).join(' · ')
          ) : (
            <span className="dock__hint">Toque no piano, clique nas teclas ou use A S D F G H J K</span>
          )}
        </span>
        <MetronomeButton placement="up" />
        <button className="dock__midi" type="button" onClick={connectMidi} title="Ligue o piano pelo cabo USB. Funciona no Chrome e no Edge.">
          {midi.kind === 'connected' ? <span className="dock__dot" aria-hidden /> : <PlugIcon className="dock__plug" />}
          <span className="dock__midiLabel">{midiStatusLabel(midi)}</span>
        </button>
      </div>
      {open && (
        <div className="dock__keys" ref={scrollRef}>
          <FullKeyboard low={LOW} high={HIGH} held={held} onPress={press} onRelease={release} className="fullKeyboard-dock" />
        </div>
      )}
    </section>
  );
}
