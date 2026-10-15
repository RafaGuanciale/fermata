// Pauta grande de uma nota só, para o treino de leitura. Com `refs`, mostra as notas de referência em cinza
// (Sol na 2ª linha, Dó central, Fá na 4ª linha…), para você achar a nota contando a partir delas.

import { staffStep, type Clef, type Midi } from '../music/notes';
import { LANDMARKS, masteryOf, type NoteStat, type ReadItem, itemKey } from './noteReading';

const S = 18;
const W = 380;
const BOTTOM = 7.5 * S;
const H = 11 * S;
const y = (step: number) => BOTTOM - (step * S) / 2;

function Lines({ from = 18, to = W - 18 }: { from?: number; to?: number }) {
  return (
    <>
      {[0, 2, 4, 6, 8].map((s) => (
        <line key={s} className="readStaff__line" x1={from} x2={to} y1={y(s)} y2={y(s)} />
      ))}
    </>
  );
}

function ClefGlyph({ clef }: { clef: Clef }) {
  return clef === 'bass' ? (
    <text className="readStaff__clef" x={22} y={y(8) + 2.95 * S} fontSize={4 * S} aria-hidden>𝄢</text>
  ) : (
    <text className="readStaff__clef" x={18} y={BOTTOM + 0.95 * S} fontSize={6.4 * S} aria-hidden>𝄞</text>
  );
}

function ledgers(step: number): number[] {
  const out: number[] = [];
  for (let s = -2; s >= step; s -= 2) out.push(s);
  for (let s = 10; s <= step; s += 2) out.push(s);
  return out;
}

function Head({ x, step, className, scale = 1 }: { x: number; step: number; className: string; scale?: number }) {
  const rx = 0.78 * S * scale;
  const ry = 0.52 * S * scale;
  return (
    <g className={className}>
      {ledgers(step).map((s) => (
        <line key={s} className="readStaff__ledger" x1={x - rx - 0.45 * S * scale} x2={x + rx + 0.45 * S * scale} y1={y(s)} y2={y(s)} />
      ))}
      {/* Semibreve: oval vazado, levemente inclinado. */}
      <ellipse className="readStaff__head" cx={x} cy={y(step)} rx={rx} ry={ry} transform={`rotate(-18 ${x} ${y(step)})`} />
      <ellipse className="readStaff__hole" cx={x} cy={y(step)} rx={rx * 0.48} ry={ry * 0.62} transform={`rotate(32 ${x} ${y(step)})`} />
    </g>
  );
}

export type ReadState = 'ask' | 'hit' | 'miss';

export default function ReadingStaff({ item, state, refs, label }: { item: ReadItem; state: ReadState; refs: boolean; label: string }) {
  const step = staffStep(item.midi, item.clef);
  const noteX = W * 0.74;
  const refX = W * 0.46;
  return (
    <svg className={`readStaff readStaff-${state}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <Lines />
      <ClefGlyph clef={item.clef} />
      {refs &&
        LANDMARKS[item.clef].map((l) => {
          const s = staffStep(l.midi, item.clef);
          return (
            <g key={l.midi} className="readStaff__ref">
              <Head x={refX} step={s} className="readStaff__refNote" scale={0.72} />
              <text className="readStaff__refName" x={refX - 1.05 * S} y={y(s) + 4} textAnchor="end">{l.name}</text>
            </g>
          );
        })}
      <g key={itemKey(item)} className="readStaff__note">
        <Head x={noteX} step={step} className="readStaff__target" />
      </g>
    </svg>
  );
}

/** Mapa de domínio: todas as notas do nível na pauta, coloridas pelo quanto você já sabe cada uma. */
export function MasteryStaff({ items, stats, clef }: { items: ReadItem[]; stats: Map<string, NoteStat>; clef: Clef }) {
  const mine = [...new Map(items.filter((i) => i.clef === clef).map((i) => [i.midi, i])).values()].sort((a, b) => a.midi - b.midi);
  if (!mine.length) return null;
  const gap = Math.max(18, Math.min(30, (W * 1.4 - 90) / mine.length));
  const width = 100 + gap * mine.length;
  return (
    <svg className="readStaff readStaff-map" viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`Mapa das notas na clave de ${clef === 'bass' ? 'fá' : 'sol'}`}>
      <Lines to={width - 10} />
      <ClefGlyph clef={clef} />
      {mine.map((it, i) => (
        <Head key={it.midi} x={98 + i * gap} step={staffStep(it.midi as Midi, clef)} className={`readStaff__map readStaff__map-${masteryOf(stats.get(itemKey(it)))}`} scale={0.8} />
      ))}
    </svg>
  );
}
