// Rolo de uma gravação: o tempo da esquerda para a direita, a altura da nota de baixo para cima.
// A força vira opacidade (só com piano MIDI). `scaleMs` alinha dois rolos na mesma escala para comparar.

import type { RecNote } from './take';

export default function Roll({ notes, durationMs, scaleMs, progress, height = 72, label, tone = 'a' }: {
  notes: RecNote[];
  durationMs: number;
  scaleMs?: number;
  /** 0 a 1: linha de onde a reprodução está */
  progress?: number;
  height?: number;
  label: string;
  tone?: 'a' | 'b';
}) {
  const W = 1000;
  const total = Math.max(1000, scaleMs ?? durationMs);
  const mids = notes.map((n) => n.midi);
  let low = mids.length ? Math.min(...mids) - 1 : 58;
  let high = mids.length ? Math.max(...mids) + 1 : 70;
  if (high - low < 14) {
    const mid = (high + low) / 2;
    low = Math.floor(mid - 7);
    high = Math.ceil(mid + 7);
  }
  const rowH = height / (high - low + 1);
  return (
    <svg className={`recRoll recRoll-${tone}`} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={label} style={{ height }}>
      <rect className="recRoll__bg" x={0} y={0} width={W} height={height} />
      {notes.map((n, i) => (
        <rect
          key={i}
          className="recRoll__note"
          x={(n.t / total) * W}
          y={(high - n.midi) * rowH}
          width={Math.max(2.5, (n.dur / total) * W)}
          height={Math.max(1.5, rowH * 0.85)}
          rx={Math.min(2, rowH / 3)}
          opacity={n.vel !== null ? 0.45 + 0.55 * (n.vel / 127) : 0.9}
        />
      ))}
      {progress !== undefined && progress > 0 && <line className="recRoll__head" x1={(progress * durationMs * W) / total} x2={(progress * durationMs * W) / total} y1={0} y2={height} />}
    </svg>
  );
}
