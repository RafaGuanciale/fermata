// Marcos: a primeira vez de cada conquista (no perfil, junto das maestrias e emblemas).

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DAY } from '../db/stats';
import { UNITS } from '../course';
import { finalPassedAt, lessonKey, unitComplete } from '../course/progress';
import { ALL_TRACKS, techRunId } from '../course/track';
import { useCourseRows } from '../course/useCourseRows';
import { useRuns } from '../training/runs';
import { milestones, minutesByDay } from './stats';

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Milestones() {
  const runs = useRuns();
  const rows = useCourseRows();
  const data = useLiveQuery(async () => {
    const [practice, sessions, pieces] = await Promise.all([db.practice.toArray(), db.sessions.where('startedAt').above(Date.now() - 400 * DAY).toArray(), db.pieces.toArray()]);
    return { practice, sessions, pieces };
  }, []);
  if (!runs || !rows || !data) return null;

  const passedAts = [...rows.values()].flatMap((r) => (r.passedAt ? [r.passedAt] : []));
  const techItems = ALL_TRACKS.flatMap((t) => t.technique);
  const courseMarks = [
    { title: 'Primeira lição do curso concluída', at: passedAts.length ? Math.min(...passedAts) : null },
    ...UNITS.slice(0, 3).map((u) => {
      const lessonsAt = u.lessons.map((l) => rows.get(lessonKey(u, l))?.passedAt ?? null);
      const fin = finalPassedAt(u, runs);
      const done = unitComplete(u, rows, runs) && fin !== null && lessonsAt.every((x) => x !== null);
      return { title: `Unidade ${u.n} concluída`, at: done ? Math.max(fin!, ...(lessonsAt as number[])) : null };
    }),
    {
      title: 'Primeira técnica no andamento alvo',
      at: (() => {
        const hits = techItems.flatMap((item) => runs.filter((r) => r.treinoId === techRunId(item) && r.clean && (r.bpm ?? 0) >= item.target).map((r) => r.at));
        return hits.length ? Math.min(...hits) : null;
      })(),
    },
  ];
  const learnedAt = data.pieces.filter((p) => p.status === 'learned' || p.status === 'repertoire').map((p) => p.updatedAt);
  const marks = milestones(runs, minutesByDay(data.practice, data.sessions), learnedAt, courseMarks).sort(
    (a, b) => (a.at === null ? 1 : 0) - (b.at === null ? 1 : 0) || (a.at ?? 0) - (b.at ?? 0),
  );

  return (
    <section className="page__section">
      <h2 className="page__sectionTitle">Marcos</h2>
      <ul className="progress__marks">
        {marks.map((m) => (
          <li key={m.title} className={`progress__mark${m.at ? ' progress__mark-done' : ''}`}>
            <span className="progress__markDot" aria-hidden="true" />
            <span className="progress__markTitle">{m.title}</span>
            <span className="progress__muted">{m.at ? shortDate.format(m.at) : 'ainda não'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
