import { ledgerSteps, noteInfo, trebleStep, type Midi } from '../music/notes';
import { END_PAD, FIRST_X, GAP, staffLayout, windowStart } from './staffLayout';

export type NoteState = 'hit' | 'miss' | 'current' | 'upcoming' | 'plain';

interface StaffProps {
  notes: Midi[];
  states: NoteState[];
  /** Nota ativa: a janela visível acompanha ela. */
  current: number;
  showNames: boolean;
  /** Barra de compasso a cada N notas (música em 4/4 de semínimas). */
  barEvery?: number;
  /** Largura disponível em px. A pauta escolhe quantas notas cabem e escala no celular. */
  width: number;
  label: string;
}

// Medidas em "staff-space" (S): distância entre duas linhas da pauta. Tamanho natural: S = 20px.
const S = 20;
const TOP = 40;
const BOTTOM = TOP + 4 * S; // linha de baixo (Mi4)
const HEAD_RX = 13;
const HEAD_RY = 9.5;
const STEM = 3.5 * S;
const HEIGHT = BOTTOM + 3 * S + 10;

const y = (step: number) => BOTTOM - (step * S) / 2;

export default function Staff({ notes, states, current, showNames, barEvery, width, label }: StaffProps) {
  if (width <= 0) return <div className="staff" style={{ height: HEIGHT * 0.62 }} />;
  const { scale, visible } = staffLayout(width, notes.length);
  const start = windowStart(current, visible, notes.length);
  const slice = notes.slice(start, start + visible);
  const sliceStates = states.slice(start, start + visible);

  const naturalWidth = FIRST_X + (slice.length - 1) * GAP + END_PAD;
  const xOf = (i: number) => FIRST_X + i * GAP;
  const nameY = BOTTOM + 2.6 * S;

  const bars: number[] = [];
  if (barEvery) slice.forEach((_, i) => { if (i > 0 && (start + i) % barEvery === 0) bars.push(xOf(i) - GAP / 2); });

  return (
    <div className="staff">
      <svg
        className="staff__svg"
        viewBox={`0 0 ${naturalWidth} ${HEIGHT}`}
        width={naturalWidth * scale}
        height={HEIGHT * scale}
        role="img"
        aria-label={label}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} className="staff__line" x1={0} x2={naturalWidth} y1={TOP + i * S} y2={TOP + i * S} />
        ))}
        {start + visible >= notes.length && <line className="staff__line staff__line-end" x1={naturalWidth - 2} x2={naturalWidth - 2} y1={TOP} y2={BOTTOM} />}
        {bars.map((x) => (
          <line key={x} className="staff__line" x1={x} x2={x} y1={TOP} y2={BOTTOM} />
        ))}
        <text className="staff__clef" x={6} y={BOTTOM + 0.95 * S} fontSize={6.4 * S} aria-hidden>
          𝄞
        </text>

        {slice.map((midi, i) => {
          const step = trebleStep(midi);
          const x = xOf(i);
          const cy = y(step);
          const state = sliceStates[i];
          const stemUp = step < 4;
          const mod = state === 'current' || state === 'plain' ? '' : `-${state}`;
          const name = noteInfo(midi).name;
          const mark = state === 'hit' ? ' ✓' : state === 'miss' ? ' ✕' : '';
          const stemX = stemUp ? x + HEAD_RX - 1.5 : x - HEAD_RX + 1.5;
          return (
            <g key={start + i}>
              {ledgerSteps(step).map((ls) => (
                <line key={ls} className="staff__ledger" x1={x - 22} x2={x + 22} y1={y(ls)} y2={y(ls)} />
              ))}
              {state === 'current' && <circle className="staff__halo" cx={x} cy={cy} r={25} />}
              <line className={`staff__stem${mod ? ` staff__stem${mod}` : ''}`} x1={stemX} x2={stemX} y1={cy} y2={stemUp ? cy - STEM : cy + STEM} />
              <ellipse
                className={`staff__head${mod ? ` staff__head${mod}` : ''}`}
                cx={x}
                cy={cy}
                rx={HEAD_RX}
                ry={HEAD_RY}
                transform={`rotate(-20 ${x} ${cy})`}
              />
              {(showNames || mark) && (
                <text className={'staff__name' + (state === 'current' ? ' staff__name-current' : '')} x={x} y={nameY}>
                  {showNames ? name + mark : mark.trim()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
