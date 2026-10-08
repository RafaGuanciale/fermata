interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  /** Pinta a variação em azul de acerto quando é uma melhora. */
  deltaGood?: boolean;
  /** Série diária; null = dia sem treino. */
  series?: (number | null)[];
  /** Quando menor é melhor (tempo), inverte o eixo para a linha subir com a melhora. */
  lowerIsBetter?: boolean;
}

function Sparkline({ series, lowerIsBetter }: { series: (number | null)[]; lowerIsBetter: boolean }) {
  const points = series.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (points.length < 2) return null;
  const W = 200;
  const H = 40;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const toXY = ({ v, i }: { v: number; i: number }) => {
    let t = max === min ? 0.5 : (v - min) / (max - min);
    if (lowerIsBetter) t = 1 - t;
    return [(i / (series.length - 1)) * W, H - 4 - t * (H - 10)];
  };
  const xy = points.map(toXY);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${xy[0][0].toFixed(1)},${H} ${line} ${xy[xy.length - 1][0].toFixed(1)},${H}`;
  return (
    <svg className="statTile__spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <line className="statTile__sparkBase" x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} />
      <polygon className="statTile__sparkArea" points={area} />
      <polyline className="statTile__sparkLine" points={line} />
    </svg>
  );
}

export default function StatTile({ label, value, unit, delta, deltaGood, series, lowerIsBetter = false }: StatTileProps) {
  return (
    <div className="statTile">
      <span className="statTile__label">{label}</span>
      <span className="statTile__value">
        {value}
        {unit && <span className="statTile__unit"> {unit}</span>}
      </span>
      {delta && <span className={'statTile__delta' + (deltaGood ? ' statTile__delta-good' : '')}>{delta}</span>}
      {series && <Sparkline series={series} lowerIsBetter={lowerIsBetter} />}
    </div>
  );
}
