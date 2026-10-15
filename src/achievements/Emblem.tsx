// Emblema de maestria: o desenho evolui com o nível. 1–2 contorno cáqui; 3–4 petróleo cheio; 5–6 champanhe com
// louros; 7 degradê petróleo–champanhe com louros, coroa e brilho. Abaixo, o nome do nível (pp a fff).

import { useId } from 'react';
import { LEVEL_NAMES, type TrackId } from './mastery';

const ICONS: Record<TrackId, string> = {
  horas: 'M12 6.5v5.5l3.5 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  constancia: 'M12 20c-3.4 0-5.7-2.4-5.7-5.5 0-3.2 2.5-5 3.4-8.2.9 1.4 1.4 2.5 1.3 4 1.5-1.2 2.5-3.2 2.5-5.8 2.7 2 4.2 5.3 4.2 9 0 4-2.3 6.5-5.7 6.5z',
  curso: 'M4 5.5c2.6-1 5.4-1 8 .6 2.6-1.6 5.4-1.6 8-.6v13c-2.6-1-5.4-1-8 .6-2.6-1.6-5.4-1.6-8-.6zM12 6.1v13',
  repertorio: 'M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  tecnica: 'M8 20h8l-2.5-15h-3zM12 13l4.5-6.5M7 20h10',
  leitura: 'M3 7h18M3 10.5h18M3 14h18M3 17.5h18M9 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 19V9',
  arcade: 'M7.5 8.5h9a4.5 4.5 0 0 1 4.4 5.5l-.6 2.7a2.2 2.2 0 0 1-3.8 1l-2-2.2h-5l-2 2.2a2.2 2.2 0 0 1-3.8-1l-.6-2.7A4.5 4.5 0 0 1 7.5 8.5zM8 11.3v2.6M6.7 12.6h2.6',
  treino: 'M5 5.5h14v14H5zM5 9.5h14M9 3.5v4M15 3.5v4M8.5 14.5l2.3 2.3 4.7-4.7',
};

const HEX = 'M32 4 57 18.5v29L32 62 7 47.5v-29z';

export default function Emblem({ track, level, size = 72, label = true }: { track: TrackId; level: number; size?: number; label?: boolean }) {
  const id = useId().replace(/:/g, '');
  const tier = level === 0 ? 0 : level <= 2 ? 1 : level <= 4 ? 2 : level <= 6 ? 3 : 4;
  return (
    <span className={`emblem emblem-t${tier}`} style={{ width: size }}>
      <svg viewBox="0 0 64 80" width={size} height={size * 1.25} role="img" aria-label={`Nível ${LEVEL_NAMES[level]}`}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="emblem__stopA" />
            <stop offset="1" className="emblem__stopB" />
          </linearGradient>
        </defs>
        {tier >= 3 && (
          <g className="emblem__laurel">
            <path d="M8 22c-5 8-5 18 2 26M5 30l4 2M4 38l5 1M6 45l4-1" />
            <path d="M56 22c5 8 5 18-2 26M59 30l-4 2M60 38l-5 1M58 45l-4-1" />
          </g>
        )}
        {tier === 4 && <path className="emblem__crown" d="M22 6l4 4 6-7 6 7 4-4-2 8H24z" />}
        <path className="emblem__shape" d={HEX} fill={tier >= 3 ? `url(#g${id})` : undefined} />
        <g transform="translate(20 21)">
          <path className="emblem__icon" d={ICONS[track]} />
        </g>
        {label && (
          <g className="emblem__tag">
            <rect x="18" y="62" width="28" height="15" rx="7.5" />
            <text x="32" y="73.2" textAnchor="middle">{LEVEL_NAMES[level]}</text>
          </g>
        )}
      </svg>
    </span>
  );
}
