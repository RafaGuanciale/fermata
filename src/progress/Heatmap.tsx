// Calendário de prática (16 semanas, uma cor). Nas Estatísticas, clicar num dia abre o que foi feito nele.

import { heatLevel, type HeatCell } from './stats';
import { minutesText } from '../stats/format';

const fullDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const WEEKDAYS = ['seg', '', 'qua', '', 'sex', '', ''];

export default function Heatmap({ cols, selected, onPick }: { cols: HeatCell[][]; selected?: string; onPick?: (day: string) => void }) {
  const C = 14;
  const G = 3;
  const left = 28;
  const top = 16;
  const W = left + cols.length * (C + G);
  const H = top + 7 * (C + G);
  return (
    <svg className={'heat' + (onPick ? ' heat-pick' : '')} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Calendário de prática">
      {cols.map((col, x) =>
        col[0].time && new Date(col[0].time).getDate() <= 7 ? (
          <text key={`m${x}`} className="heat__label" x={left + x * (C + G)} y={10}>
            {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(col[0].time).replace('.', '')}
          </text>
        ) : null,
      )}
      {WEEKDAYS.map((d, y) => (d ? <text key={d} className="heat__label" x={0} y={top + y * (C + G) + C - 3}>{d}</text> : null))}
      {cols.map((col, x) =>
        col.map((c, y) =>
          c.future ? null : (
            <rect
              key={c.day}
              className={`heat__cell heat__cell-${heatLevel(c.minutes)}` + (selected === c.day ? ' heat__cell-selected' : '')}
              x={left + x * (C + G)}
              y={top + y * (C + G)}
              width={C}
              height={C}
              rx={3}
              onClick={onPick ? () => onPick(c.day) : undefined}
            >
              <title>{`${fullDate.format(c.time)}: ${c.minutes ? minutesText(c.minutes) : 'sem prática'}`}</title>
            </rect>
          ),
        ),
      )}
    </svg>
  );
}
