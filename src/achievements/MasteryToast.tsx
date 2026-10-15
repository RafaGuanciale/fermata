// Aviso de conquista: quando uma maestria sobe de nível, um cartão aparece no canto com o emblema novo.
// Na primeira vez (sem histórico guardado), só registra os níveis atuais, sem enxurrada de avisos.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { playReward } from '../celebrate/sound';
import { Burst } from '../celebrate/Celebrate';
import Emblem from './Emblem';
import { LEVEL_NAMES, levelUps, type TrackId, type TrackStatus } from './mastery';
import { useMastery } from './useMastery';

const SEEN_KEY = 'fermata-mastery-seen';

function readSeen(): Partial<Record<TrackId, number>> | null {
  try {
    const v = localStorage.getItem(SEEN_KEY);
    return v ? (JSON.parse(v) as Partial<Record<TrackId, number>>) : null;
  } catch {
    return null;
  }
}

function saveSeen(tracks: TrackStatus[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(tracks.map((t) => [t.def.id, t.level]))));
  } catch {
    // sem armazenamento: avisa de novo na próxima visita, sem problema
  }
}

export default function MasteryToast() {
  const m = useMastery();
  const [queue, setQueue] = useState<TrackStatus[]>([]);

  useEffect(() => {
    if (!m) return;
    const seen = readSeen();
    if (!seen) {
      saveSeen(m.tracks);
      return;
    }
    const ups = levelUps(seen, m.tracks);
    if (!ups.length) return;
    saveSeen(m.tracks);
    setQueue((q) => [...q, ...ups.filter((u) => !q.some((x) => x.def.id === u.def.id))]);
    playReward('great');
  }, [m]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 5500);
    return () => window.clearTimeout(id);
  }, [current]);

  if (!current) return null;
  return (
    <Link className="masteryToast" to="/conta" onClick={() => setQueue((q) => q.slice(1))} role="status" key={current.def.id}>
      <Burst />
      <Emblem track={current.def.id} level={current.level} size={52} />
      <span className="masteryToast__text">
        <span className="masteryToast__eyebrow">Nova maestria</span>
        <strong>{current.def.name}: nível {LEVEL_NAMES[current.level]}</strong>
        <span className="masteryToast__sub">{current.def.show(current.value)}</span>
      </span>
    </Link>
  );
}
