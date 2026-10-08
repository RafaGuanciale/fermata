import type React from 'react';
import { noteInfo, whiteKeysBetween, type Midi } from '../music/notes';
import { COMPUTER_KEYS } from '../input/useNoteInput';

export type KeyMark = 'lit' | 'miss';

interface PianoKeyboardProps {
  low: Midi;
  high: Midi;
  /** Teclas destacadas: acesas (petróleo) ou erro (blush). */
  marks?: Partial<Record<Midi, KeyMark>>;
  showNames?: boolean;
  /** Texto sobre teclas específicas (grau do acorde, número da escala). Tem prioridade sobre o nome. */
  labels?: Partial<Record<Midi, string>>;
  /** Mostra a tecla do computador correspondente (A, S, D…). */
  showComputerKeys?: boolean;
  onPress?: (midi: Midi) => void;
  onRelease?: (midi: Midi) => void;
  size?: 'regular' | 'small';
  label: string;
}

const KEY_FOR_NOTE: Record<number, string> = Object.fromEntries(
  Object.entries(COMPUTER_KEYS).map(([k, m]) => [m, k.toUpperCase()]),
);

export default function PianoKeyboard({
  low,
  high,
  marks = {},
  showNames = false,
  labels = {},
  showComputerKeys = false,
  onPress,
  onRelease,
  size = 'regular',
  label,
}: PianoKeyboardProps) {
  const whites = whiteKeysBetween(low, high);
  const interactive = Boolean(onPress);

  // Cada tecla preta fica entre a branca de índice i e a seguinte; o CSS converte o índice em posição.
  const blacks: { midi: Midi; slot: number }[] = [];
  whites.forEach((m, i) => {
    const sharp = m + 1;
    if (sharp <= high && noteInfo(sharp).isBlack) blacks.push({ midi: sharp, slot: i + 1 });
  });

  const markClass = (base: string, m: Midi) => {
    const mark = marks[m];
    return mark ? `${base} ${base}-${mark}` : base;
  };

  const Tag = interactive ? 'button' : 'span';

  // Aperta no toque/clique e solta ao levantar, para o teclado se comportar como um piano.
  const keyProps = (m: Midi, label: string) =>
    interactive
      ? {
          type: 'button' as const,
          'aria-label': label,
          onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            onPress?.(m);
          },
          onPointerUp: () => onRelease?.(m),
          onPointerLeave: (e: React.PointerEvent<HTMLElement>) => { if (e.buttons) onRelease?.(m); },
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            e.stopPropagation();
            onPress?.(m);
            window.setTimeout(() => onRelease?.(m), 180);
          },
        }
      : {};

  return (
    <div
      className={
        'pianoKeyboard' + (size === 'small' ? ' pianoKeyboard-small' : '') + (interactive ? '' : ' pianoKeyboard-static')
      }
      role="group"
      aria-label={label}
    >
      {whites.map((m) => {
        const n = noteInfo(m);
        return (
          <Tag
            key={m}
            data-midi={m}
            className={markClass('pianoKeyboard__white', m)}
            {...keyProps(m, `${n.name} ${n.sci}`)}
          >
            <span style={{ display: 'grid', justifyItems: 'center' }}>
              {labels[m] ?? (showNames ? n.name : '')}
              {showComputerKeys && KEY_FOR_NOTE[m] ? <span className="pianoKeyboard__hint">{KEY_FOR_NOTE[m]}</span> : null}
            </span>
          </Tag>
        );
      })}
      {blacks.map(({ midi, slot }) => {
        const n = noteInfo(midi);
        return (
          <Tag
            key={midi}
            data-midi={midi}
            className={markClass('pianoKeyboard__black', midi)}
            style={{ '--slot': slot } as React.CSSProperties}
            {...keyProps(midi, `${n.name} ${n.sci}`)}
          >
            {labels[midi] ?? (showComputerKeys && KEY_FOR_NOTE[midi] ? <span className="pianoKeyboard__hint">{KEY_FOR_NOTE[midi]}</span> : null)}
          </Tag>
        );
      })}
    </div>
  );
}
