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
  /** Quantas semínimas vale um tempo de `durations` (1,5 no compasso composto, em que o tempo é a semínima pontuada). */
  beatScale?: number;
  /** Ligadura de prolongamento: true liga a nota à seguinte. */
  ties?: boolean[];
  /** Acordes: todas as notas da figura (a de `notes` é uma delas). Desenhadas na mesma haste. */
  chords?: (Midi[] | undefined)[];
  /** Mostra todas as notas de uma vez, encolhendo o quanto precisar (figuras fixas, como na Consulta). */
  fitAll?: boolean;
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

export default function Staff({ notes, states, current, showNames, barEvery, width, label, clef = 'treble', durations, beatsPerBar, fifths = 0, beatScale = 1, ties, chords, fitAll = false }: StaffProps) {
  if (width <= 0) return <div className="staff" style={{ height: HEIGHT * 0.62 }} />;
  const keyW = fifths ? Math.abs(fifths) * KEY_GAP + 6 : 0;
  const layout = staffLayout(width, notes.length, keyW);
  const allWidth = FIRST_X + keyW + (Math.max(1, notes.length) - 1) * GAP + END_PAD;
  const { scale, visible } = fitAll ? { scale: Math.min(1, width / allWidth), visible: notes.length } : layout;
  const start = windowStart(current, visible, notes.length);
  const slice = notes.slice(start, start + visible);
  const sliceStates = states.slice(start, start + visible);

  const naturalWidth = FIRST_X + keyW + (slice.length - 1) * GAP + END_PAD;
  const xOf = (i: number) => FIRST_X + keyW + i * GAP;
  const keySig = Array.from({ length: Math.abs(fifths) }, (_, i) => ({
    x: KEY_X + i * KEY_GAP,
    step: (fifths > 0 ? SHARP_STEPS[i] : FLAT_STEPS[i]) - (clef === 'bass' ? 2 : 0),
  }));
  // Notas longe da pauta (muitas linhas suplementares): a área do desenho cresce para cima ou para baixo.
  // Mede todas as notas (não só as visíveis), para a pauta não mudar de altura no meio de um exercício.
  let lowestHead = BOTTOM;
  let top = 0;
  let bottom = HEIGHT;
  notes.forEach((m, i) => {
    if (m === null) return;
    const group = chords?.[i] && chords[i]!.length > 1 ? chords[i]! : [m];
    for (const g of group) {
      const st = spellOnStaff(g, clef, fifths).step;
      const cy = y(st);
      const stemUp = st < 4;
      top = Math.min(top, cy - 28, stemUp ? cy - STEM - 8 : top);
      bottom = Math.max(bottom, cy + 28, stemUp ? bottom : cy + STEM + 8);
      lowestHead = Math.max(lowestHead, cy + HEAD_RY);
    }
  });
  const nameY = Math.max(BOTTOM + 2.6 * S, lowestHead + 22);
  if (showNames) bottom = Math.max(bottom, nameY + 8);
  const viewH = bottom - top;
  const figures = durations?.map((d) => d * beatScale);
  const tuplets = tupletMiddles(figures);

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
        viewBox={`0 ${top} ${naturalWidth} ${viewH}`}
        width={naturalWidth * scale}
        height={viewH * scale}
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
          if (!ties?.[start + i] || midi === null || i + 1 >= slice.length) return null;
          // Curva do lado oposto à haste: embaixo da cabeça com haste para cima, em cima com haste para baixo.
          const cy = y(spellOnStaff(midi, clef, fifths).step);
          const below = spellOnStaff(midi, clef, fifths).step < 4;
          const x1 = xOf(i) + HEAD_RX - 2;
          const x2 = xOf(i + 1) - HEAD_RX + 2;
          const yy = below ? cy + HEAD_RY + 3 : cy - HEAD_RY - 3;
          const bend = below ? 12 : -12;
          return <path key={`tie${start + i}`} className="staff__tie" d={`M${x1} ${yy} Q${(x1 + x2) / 2} ${yy + bend} ${x2} ${yy}`} />;
        })}
        {slice.map((midi, i) => {
          const x = xOf(i);
          const state = sliceStates[i];
          const mod = state === 'current' || state === 'plain' ? '' : `-${state}`;
          const beats = figures?.[start + i] ?? 1;
          if (midi === null) {
            return (
              <g key={start + i}>
                {state === 'current' && <circle className="staff__halo" cx={x} cy={TOP + 2 * S} r={25} />}
                <text className={`staff__rest${mod ? ` staff__rest${mod}` : ''}`} x={x} y={TOP + 2.9 * S} fontSize={3.4 * S} aria-hidden>
                  {beats >= 4 || (beatsPerBar && Math.abs(beats - beatsPerBar * beatScale) < 1e-6) ? '𝄻' : beats >= 2 ? '𝄼' : beats >= 1 ? '𝄽' : '𝄾'}
                </text>
              </g>
            );
          }
          const { step, name } = spellOnStaff(midi, clef, fifths);
          // Acorde: as cabeças empilhadas numa haste só; a direção vem da média em relação à linha do meio.
          const chord = chords?.[start + i];
          const heads = (chord && chord.length > 1 ? [...chord].sort((a, b) => a - b) : [midi]).map((m) => spellOnStaff(m, clef, fifths));
          const lowStep = heads[0].step;
          const highStep = heads[heads.length - 1].step;
          const stemUp = heads.length > 1 ? (lowStep + highStep) / 2 < 4 : step < 4;
          const mark = state === 'hit' ? ' ✓' : state === 'miss' ? ' ✕' : state === 'late' ? ' ~' : '';
          const stemX = stemUp ? x + HEAD_RX - 1.5 : x - HEAD_RX + 1.5;
          const stemStart = stemUp ? y(lowStep) : y(highStep);
          const stemEnd = stemUp ? y(highStep) - STEM : y(lowStep) + STEM;
          // Segunda no acorde: a cabeça de cima vai para a direita (haste para cima ou semibreve);
          // com haste para baixo, a de baixo vai para a esquerda da haste.
          const right = stemUp || beats >= 4 - 1e-6;
          const headX = heads.map((h, k) => {
            const clash = right ? k > 0 && h.step - heads[k - 1].step === 1 && !(k > 1 && heads[k - 1].step - heads[k - 2].step === 1) : k < heads.length - 1 && heads[k + 1].step - h.step === 1;
            return clash ? x + (right ? 2 * HEAD_RX - 3 : -(2 * HEAD_RX - 3)) : x;
          });
          const hollow = beats >= 2 - 1e-6;
          const near = (x: number) => Math.abs(beats - x) < 1e-6;
          const dotted = near(3) || near(1.5) || near(0.75);
          const triplet = isTriplet(beats);
          const sixteenth = near(0.25) || near(0.375);
          const eighth = near(0.5) || near(0.75) || triplet || sixteenth;
          return (
            <g key={start + i}>
              {ledgerSteps(Math.min(lowStep, step)).concat(ledgerSteps(Math.max(highStep, step))).filter((v, k, a) => a.indexOf(v) === k).map((ls) => (
                <line key={ls} className="staff__ledger" x1={x - 22} x2={x + 22} y1={y(ls)} y2={y(ls)} />
              ))}
              {state === 'current' && <ellipse className="staff__halo" cx={x} cy={(y(lowStep) + y(highStep)) / 2} rx={25} ry={25 + (y(lowStep) - y(highStep)) / 2} />}
              {heads.map((h, k) =>
                h.accidental ? (
                  <text key={`acc${k}`} className={`staff__accidental${mod ? ` staff__head${mod}` : ''}`} x={Math.min(...headX) - HEAD_RX - 6 - (heads.length > 1 && k % 2 ? 12 : 0)} y={y(h.step) + 7} fontSize={1.4 * S} aria-hidden>
                    {h.accidental}
                  </text>
                ) : null,
              )}
              {beats < 4 && <line className={`staff__stem${mod ? ` staff__stem${mod}` : ''}`} x1={stemX} x2={stemX} y1={stemStart} y2={stemEnd} />}
              {eighth && (
                <path
                  className={`staff__flag${mod ? ` staff__stem${mod}` : ''}`}
                  d={stemUp ? `M${stemX} ${stemEnd} c 4 10, 18 14, 12 32` : `M${stemX} ${stemEnd} c 4 -10, 18 -14, 12 -32`}
                />
              )}
              {sixteenth && (
                <path
                  className={`staff__flag${mod ? ` staff__stem${mod}` : ''}`}
                  d={stemUp ? `M${stemX} ${stemEnd + 11} c 4 10, 18 14, 12 32` : `M${stemX} ${stemEnd - 11} c 4 -10, 18 -14, 12 -32`}
                />
              )}
              {heads.map((h, k) => (
                <ellipse
                  key={`h${k}`}
                  className={`staff__head${mod ? ` staff__head${mod}` : ''}${hollow ? ' staff__head-hollow' : ''}`}
                  cx={headX[k]}
                  cy={y(h.step)}
                  rx={HEAD_RX}
                  ry={HEAD_RY}
                  transform={`rotate(-20 ${headX[k]} ${y(h.step)})`}
                />
              ))}
              {tuplets.has(start + i) && (
                <text className="staff__tuplet" x={stemUp ? stemX + 6 : x} y={stemUp ? stemEnd - 8 : stemEnd + 20} aria-hidden>
                  3
                </text>
              )}
              {dotted &&
                heads.map((h, k) => (
                  <circle key={`d${k}`} className={`staff__dot${mod ? ` staff__head${mod}` : ''}`} cx={Math.max(...headX) + HEAD_RX + 8} cy={h.step % 2 === 0 ? y(h.step) - S / 2 : y(h.step)} r={3.2} />
                ))}
              {(showNames || mark) && (
                <text className={'staff__name' + (state === 'current' ? ' staff__name-current' : '') + (heads.length > 1 ? ' staff__name-chord' : '')} x={x} y={nameY}>
                  {showNames ? (heads.length > 1 ? heads.map((h) => h.name).join(' ') : name) + mark : mark.trim()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Colcheia de tercina: um terço de tempo. */
const isTriplet = (beats: number) => Math.abs(beats - 1 / 3) < 1e-6;

/** Índices das notas do meio de cada grupo de tercina (é onde vai o "3"). */
function tupletMiddles(durations?: number[]): Set<number> {
  const out = new Set<number>();
  if (!durations) return out;
  let run = 0;
  durations.forEach((d, i) => {
    if (!isTriplet(d)) {
      run = 0;
      return;
    }
    run++;
    if (run % 3 === 2) out.add(i);
  });
  return out;
}
