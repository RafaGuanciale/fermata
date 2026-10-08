// O teclado fixo na parte de baixo: as 88 teclas do seu piano, acendendo o que está sendo tocado
// (pelo MIDI, pelo teclado do computador ou clicando nele).

import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { noteInfo, whiteKeysBetween, type Midi } from '../music/notes';
import { detectTriad } from '../music/theory';
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

export function FullKeyboard({ low, high, held, onPress, onRelease, labelCs = true, className = '' }: {
  low: Midi;
  high: Midi;
  held: ReadonlySet<Midi>;
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
            className={'fullKeyboard__white' + (held.has(m) ? ' fullKeyboard__white-on' : '')}
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
          className={'fullKeyboard__black' + (held.has(midi) ? ' fullKeyboard__black-on' : '')}
          style={{ '--slot': slot } as React.CSSProperties}
          {...handlers(midi)}
        />
      ))}
    </div>
  );
}

export default function KeyboardDock() {
  const { held, midi, connectMidi, press, release } = useNoteInput();
  const [open, setOpen] = useState(readOpen);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const toggle = () =>
    setOpen((v) => {
      try {
        localStorage.setItem(OPEN_KEY, v ? '0' : '1');
      } catch {
        // preferência vale só nesta visita
      }
      return !v;
    });

  const notes = [...held].sort((a, b) => a - b);
  const chord = detectTriad(held);

  return (
    <section className={'dock' + (open ? ' dock-open' : '')} aria-label="Seu teclado">
      <div className="dock__bar">
        <button className="dock__toggle" type="button" onClick={toggle} aria-expanded={open}>
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
