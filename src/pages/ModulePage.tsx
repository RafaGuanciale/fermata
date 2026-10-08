import { Link, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { MODULES, findModule, lessonKey } from '../study/modules';
import PhotoCard from '../components/PhotoCard';
import StatusBadge from '../components/StatusBadge';
import { BackIcon } from '../components/Icons';

export default function ModulePage() {
  const { moduleId = '' } = useParams();
  const mod = findModule(moduleId);
  const progress = useLiveQuery(() => db.lessons.where('id').startsWith(`${moduleId}/`).toArray(), [moduleId]) ?? [];
  if (!mod) return <Navigate to="/estudo" replace />;
  const statusOf = (lessonId: string) => progress.find((p) => p.id === lessonKey(mod.id, lessonId))?.status;
  const done = mod.lessons.filter((l) => statusOf(l.id) === 'learned').length;
  const index = MODULES.indexOf(mod);

  return (
    <>
      <Link className="page__back" to="/estudo">
        <BackIcon className="page__backIcon" />
        Estudo
      </Link>
      <PhotoCard photo={mod.photo} size="hero" eyebrow={`Módulo ${index + 1} · ${mod.eyebrow}`} title={mod.title} sizes="100vw">
        <span className="photoCard__body">{mod.description}</span>
      </PhotoCard>

      <section className="page__section">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Lições</h2>
          <span className="page__link page__num">{done} de {mod.lessons.length} aprendidas</span>
        </div>
        <div className="progressTrack" aria-hidden>
          <div className="progressTrack__fill" style={{ width: `${(done / mod.lessons.length) * 100}%` }} />
        </div>
        <ol className="lessonList">
          {mod.lessons.map((l, i) => {
            const status = statusOf(l.id);
            const inner = (
              <>
                <span className="lessonList__num">{i + 1}</span>
                <span className="lessonList__main">
                  <span className="lessonList__title">{l.title}</span>
                  <span className="lessonList__summary">{l.summary}</span>
                </span>
                {l.ready ? (status ? <StatusBadge status={status} /> : <span className="lessonList__go">Abrir</span>) : <span className="lessonList__soon">Em breve</span>}
              </>
            );
            return (
              <li key={l.id}>
                {l.ready ? (
                  <Link className="lessonList__item" to={`/estudo/${mod.id}/${l.id}`}>{inner}</Link>
                ) : (
                  <div className="lessonList__item lessonList__item-soon">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
