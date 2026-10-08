import { ledgerSteps, noteInfo, trebleStep, type Midi } from '../music/notes';

export type NoteState = 'hit' | 'miss' | 'current' | 'upcoming';

interface StaffProps {
  notes: Midi[];
  states: NoteState[];
  showNames: boolean;
  /** Barra de compasso a cada N notas (música em 4/4 de semínimas). */
  barEvery?: number;
  label: string;
}

// Medidas em "staff-space" (S): distância entre duas linhas da pauta. No treino, S = 20px.
const S = 20;
const TOP = 40;
const BOTTOM = TOP + 4 * S; // linha de baixo (Mi4)
const FIRST_X = 116;
const GAP = 64;
const HEAD_RX = 13;
const HEAD_RY = 9.5;
const STEM = 3.5 * S;

const y = (step: number) => BOTTOM - (step * S) / 2;

export default function Staff({ notes, states, showNames, barEvery, label }: StaffProps) {
  const barGap = barEvery ? 20 : 0;
  const xOf = (i: number) => FIRST_X + i * GAP + (barEvery ? Math.floor(i / barEvery) * barGap : 0);
  const width = xOf(notes.length - 1) + 56;
  const height = BOTTOM + 3 * S + 10;
  const nameY = BOTTOM + 2.6 * S;

  const bars: number[] = [];
  if (barEvery) for (let i = barEvery; i < notes.length; i += barEvery) bars.push(xOf(i) - GAP / 2 - barGap / 2);

  return (
    <div className="staff">
      <svg className="staff__svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} className="staff__line" x1={0} x2={width} y1={TOP + i * S} y2={TOP + i * S} />
        ))}
        <line className="staff__line" x1={width - 1} x2={width - 1} y1={TOP} y2={BOTTOM} />
        {bars.map((x) => (
          <line key={x} className="staff__line" x1={x} x2={x} y1={TOP} y2={BOTTOM} />
        ))}
        <text className="staff__clef" x={6} y={BOTTOM + 0.95 * S} fontSize={6.4 * S} aria-hidden>
          𝄞
        </text>

        {notes.map((midi, i) => {
          const step = trebleStep(midi);
          const x = xOf(i);
          const cy = y(step);
          const state = states[i];
          const stemUp = step < 4;
          const mod = state === 'current' ? '' : `-${state}`;
          const name = noteInfo(midi).name;
          const mark = state === 'hit' ? ' ✓' : state === 'miss' ? ' ✕' : '';
          return (
            <g key={i}>
              {ledgerSteps(step).map((ls) => (
                <line key={ls} className="staff__ledger" x1={x - 22} x2={x + 22} y1={y(ls)} y2={y(ls)} />
              ))}
              {state === 'current' && <circle className="staff__halo" cx={x} cy={cy} r={25} />}
              <line
                className={`staff__stem${mod ? ` staff__stem${mod}` : ''}`}
                x1={stemUp ? x + HEAD_RX - 1.5 : x - HEAD_RX + 1.5}
                x2={stemUp ? x + HEAD_RX - 1.5 : x - HEAD_RX + 1.5}
                y1={cy}
                y2={stemUp ? cy - STEM : cy + STEM}
              />
              <ellipse
                className={`staff__head${mod ? ` staff__head${mod}` : ''}`}
                cx={x}
                cy={cy}
                rx={HEAD_RX}
                ry={HEAD_RY}
                transform={`rotate(-20 ${x} ${cy})`}
              />
              {(showNames || state === 'hit' || state === 'miss') && (
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
