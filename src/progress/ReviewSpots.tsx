// Trechos difíceis com revisão marcada (weakSpots.ts). No Hoje, só os que vencem hoje; no Progresso, todos.

import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { findSong } from '../course';
import { useRuns } from '../training/runs';
import { REVIEW_DAYS, dueSpots, weakSpots, type WeakSpot } from './weakSpots';

const DAY = 86_400_000;

function useSongTargets() {
  return useLiveQuery(async () => {
    const pieces = await db.pieces.toArray();
    const map = new Map<string, { title: string; to: string }>();
    for (const p of pieces) if (p.id !== undefined) map.set(`peca-${p.uid ?? p.id}`, { title: p.title, to: `/peca/${p.id}/estudar` });
    return map;
  }, []);
}

function target(id: string, pieces: Map<string, { title: string; to: string }>) {
  if (id.startsWith('curso-')) {
    const song = findSong(id.slice(6));
    return song ? { title: song.title, to: `/curso/musica/${song.id}` } : null;
  }
  return pieces.get(id) ?? null;
}

function since(at: number, now: number) {
  const d = Math.floor((now - at) / DAY);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
}

function when(s: WeakSpot, now: number) {
  if (s.dueAt <= now) return 'rever hoje';
  const d = Math.ceil((s.dueAt - now) / DAY);
  return d === 1 ? 'rever amanhã' : `rever em ${d} dias`;
}

export default function ReviewSpots({ mode }: { mode: 'hoje' | 'todos' }) {
  const location = useLocation();
  const runs = useRuns();
  const pieces = useSongTargets();
  if (!runs || !pieces) return null;
  const now = Date.now();
  const spots = (mode === 'hoje' ? dueSpots(runs, now) : weakSpots(runs)).map((s) => ({ s, t: target(s.songId, pieces) })).filter((x) => x.t);
  if (!spots.length) return null;
  return (
    <ul className="reviewSpots">
      {spots.map(({ s, t }) => (
        <li key={`${s.songId}:${s.from}`} className="reviewSpots__item">
          <Link className="reviewSpots__link" to={t!.to} state={{ background: location, from: s.from, to: s.to }}>
            <span className="reviewSpots__title">{t!.title}: {s.from === s.to ? `compasso ${s.from}` : `compassos ${s.from} a ${s.to}`}</span>
            <span className="reviewSpots__meta">
              {s.level === 0 ? `errou ${since(s.lastAt, now)}` : `revisão ${s.level} de ${REVIEW_DAYS.length}`} · {when(s, now)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
