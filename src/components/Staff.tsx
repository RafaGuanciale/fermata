import { ledgerSteps, type Clef, type Midi } from '../music/notes';
import { END_PAD, FIRST_X, FLAT_STEPS, GAP, SHARP_STEPS, spellOnStaff, staffLayout, windowStart } from './staffLayout';

export type NoteState = 'hit' | 'late' | 'miss' | 'current' | 'upcoming' | 'plain';

interface StaffProps {
  /** null = pausa */
  notes: (Midi | null)[];
  states: NoteState[];
  /** Nota ativa: a janela visível acompanha ela. */
  current: number;
  showNames: boolean;
  /** Barra de compasso a cada N notas (música em 4/4 de semínimas). */
  barEvery?: number;
  /** Largura disponível em px. A pauta escolhe quantas notas cabem e escala no celular. */
  width: number;
  label: string;
  clef?: Clef;
  /** Duração de cada nota em tempos (semínima = 1). Sem isso, tudo é semínima. */
  durations?: number[];
  /** Com `durations`, desenha barra de compasso a cada N tempos. */
  beatsPerBar?: number;
  /** Armadura: sustenidos (positivo) ou bemóis (negativo). Com bemóis, as pretas são escritas como bemol. */
  fifths?: number;
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

const KEY_X = 72;
const KEY_GAP = 13;

export default function Staff({ notes, states, current, showNames, barEvery, width, label, clef = 'treble', durations, beatsPerBar, fifths = 0 }: StaffProps) {
  if (width <= 0) return <div className="staff" style={{ height: HEIGHT * 0.62 }} />;
  const keyW = fifths ? Math.abs(fifths) * KEY_GAP + 6 : 0;
  const { scale, visible } = staffLayout(width, notes.length, keyW);
  const start = windowStart(current, visible, notes.length);
  const slice = notes.slice(start, start + visible);
  const sliceStates = states.slice(start, start + visible);

  const naturalWidth = FIRST_X + keyW + (slice.length - 1) * GAP + END_PAD;
  const xOf = (i: number) => FIRST_X + keyW + i * GAP;
  const keySig = Array.from({ length: Math.abs(fifths) }, (_, i) => ({
    x: KEY_X + i * KEY_GAP,
    step: (fifths > 0 ? SHARP_STEPS[i] : FLAT_STEPS[i]) - (clef === 'bass' ? 2 : 0),
  }));
  const nameY = BOTTOM + 2.6 * S;

  const bars: number[] = [];
  if (durations && beatsPerBar) {
    let acc = durations.slice(0, start).reduce((a, b) => a + b, 0);
    slice.forEach((_, i) => {
      if (i > 0 && acc > 0 && Math.abs(acc % beatsPerBar) < 1e-6) bars.push(xOf(i) - GAP / 2);
      acc += durations[start + i] ?? 1;
    });
  } else if (barEvery) slice.forEach((_, i) => { if (i > 0 && (start + i) % barEvery === 0) bars.push(xOf(i) - GAP / 2); });

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
        {clef === 'bass' ? (
          <text className="staff__clef" x={10} y={TOP + 2.95 * S} fontSize={4 * S} aria-hidden>
            𝄢
          </text>
        ) : (
          <text className="staff__clef" x={6} y={BOTTOM + 0.95 * S} fontSize={6.4 * S} aria-hidden>
            𝄞
          </text>
        )}

        {keySig.map((k) => (
          <text key={k.x} className="staff__accidental staff__accidental-key" x={k.x} y={y(k.step) + 7} fontSize={1.4 * S} aria-hidden>
            {fifths > 0 ? '♯' : '♭'}
          </text>
        ))}
        {slice.map((midi, i) => {
          const x = xOf(i);
          const state = sliceStates[i];
          const mod = state === 'current' || state === 'plain' ? '' : `-${state}`;
          const beats = durations?.[start + i] ?? 1;
          if (midi === null) {
            return (
              <g key={start + i}>
                {state === 'current' && <circle className="staff__halo" cx={x} cy={TOP + 2 * S} r={25} />}
                <text className={`staff__rest${mod ? ` staff__rest${mod}` : ''}`} x={x} y={TOP + 2.9 * S} fontSize={3.4 * S} aria-hidden>
                  {beats >= 4 ? '𝄻' : beats >= 2 ? '𝄼' : beats >= 1 ? '𝄽' : '𝄾'}
                </text>
              </g>
            );
          }
          const { step, accidental, name } = spellOnStaff(midi, clef, fifths);
          const cy = y(step);
          const stemUp = step < 4;
          const mark = state === 'hit' ? ' ✓' : state === 'miss' ? ' ✕' : state === 'late' ? ' ~' : '';
          const stemX = stemUp ? x + HEAD_RX - 1.5 : x - HEAD_RX + 1.5;
          const stemEnd = stemUp ? cy - STEM : cy + STEM;
          const hollow = beats >= 2;
          const dotted = beats === 3 || beats === 1.5;
          const eighth = beats === 0.5;
          return (
            <g key={start + i}>
              {ledgerSteps(step).map((ls) => (
                <line key={ls} className="staff__ledger" x1={x - 22} x2={x + 22} y1={y(ls)} y2={y(ls)} />
              ))}
              {state === 'current' && <circle className="staff__halo" cx={x} cy={cy} r={25} />}
              {accidental && (
                <text className={`staff__accidental${mod ? ` staff__head${mod}` : ''}`} x={x - HEAD_RX - 6} y={cy + 7} fontSize={1.4 * S} aria-hidden>
                  {accidental}
                </text>
              )}
              {beats < 4 && <line className={`staff__stem${mod ? ` staff__stem${mod}` : ''}`} x1={stemX} x2={stemX} y1={cy} y2={stemEnd} />}
              {eighth && (
                <path
                  className={`staff__flag${mod ? ` staff__stem${mod}` : ''}`}
                  d={stemUp ? `M${stemX} ${stemEnd} c 4 10, 18 14, 12 32` : `M${stemX} ${stemEnd} c 4 -10, 18 -14, 12 -32`}
                />
              )}
              <ellipse
                className={`staff__head${mod ? ` staff__head${mod}` : ''}${hollow ? ' staff__head-hollow' : ''}`}
                cx={x}
                cy={cy}
                rx={HEAD_RX}
                ry={HEAD_RY}
                transform={`rotate(-20 ${x} ${cy})`}
              />
              {dotted && <circle className={`staff__dot${mod ? ` staff__head${mod}` : ''}`} cx={x + HEAD_RX + 8} cy={step % 2 === 0 ? cy - S / 2 : cy} r={3.2} />}
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
