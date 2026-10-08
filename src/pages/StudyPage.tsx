import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { MODULES, lessonKey } from '../study/modules';
import PhotoCard from '../components/PhotoCard';

export default function StudyPage() {
  const progress = useLiveQuery(() => db.lessons.toArray(), []) ?? [];
  const learned = new Set(progress.filter((p) => p.status === 'learned' || p.status === 'repertoire').map((p) => p.id));

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Teoria para consultar e aprender</span>
        <h1 className="page__title">Estudo</h1>
        <p className="page__lead">Seis módulos, na ordem sugerida. Cada lição pode ser marcada como aprendida, e o mapa mostra o que você já domina.</p>
      </header>
      <div className="photoGrid photoGrid-modules">
        {MODULES.map((m, i) => {
          const ready = m.lessons.filter((l) => l.ready);
          const done = m.lessons.filter((l) => learned.has(lessonKey(m.id, l.id))).length;
          return (
            <PhotoCard
              key={m.id}
              photo={m.photo}
              to={`/estudo/${m.id}`}
              eyebrow={`Módulo ${i + 1} · ${m.eyebrow}`}
              title={m.title}
              badge={ready.length ? `${done} de ${m.lessons.length} aprendidas` : 'Em breve'}
            />
          );
        })}
      </div>
    </>
  );
}
