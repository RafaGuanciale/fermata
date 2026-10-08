import { Link, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LearnStatus } from '../db/db';
import { findModule, lessonKey } from '../study/modules';
import { BackIcon } from '../components/Icons';
import KeysLesson from '../study/lessons/KeysLesson';
import ClefLesson from '../study/lessons/ClefLesson';
import ChordsLesson from '../study/lessons/ChordsLesson';
import ScaleLesson from '../study/lessons/ScaleLesson';

const CONTENT: Record<string, () => React.JSX.Element> = {
  'teclado/teclas-e-oitavas': KeysLesson,
  'leitura/clave-de-sol': ClefLesson,
  'acordes/triades': ChordsLesson,
  'escalas/escala-maior': ScaleLesson,
};

const LESSON_STATUS: { value: LearnStatus; label: string }[] = [
  { value: 'learning', label: 'Estou aprendendo' },
  { value: 'learned', label: 'Aprendi' },
];

export default function LessonPage() {
  const { moduleId = '', lessonId = '' } = useParams();
  const mod = findModule(moduleId);
  const lesson = mod?.lessons.find((l) => l.id === lessonId);
  const key = lessonKey(moduleId, lessonId);
  const progress = useLiveQuery(() => db.lessons.get(key), [key]);
  const Content = CONTENT[key];
  if (!mod || !lesson || !Content) return <Navigate to={mod ? `/estudo/${mod.id}` : '/estudo'} replace />;

  const index = mod.lessons.indexOf(lesson);
  const next = mod.lessons.slice(index + 1).find((l) => l.ready);
  const setStatus = (status: LearnStatus) =>
    progress?.status === status ? db.lessons.delete(key) : db.lessons.put({ id: key, status, updatedAt: Date.now() });

  return (
    <>
      <Link className="page__back" to={`/estudo/${mod.id}`}>
        <BackIcon className="page__backIcon" />
        {mod.title}
      </Link>
      <header className="page__header">
        <span className="page__eyebrow">{mod.title} · lição {index + 1}</span>
        <h1 className="page__title">{lesson.title}</h1>
      </header>

      <article className="lesson">
        <Content />
      </article>

      <footer className="lesson__footer">
        <div className="chips" role="group" aria-label="Seu progresso nesta lição">
          {LESSON_STATUS.map((s) => (
            <button key={s.value} type="button" className={'chip chip-large' + (progress?.status === s.value ? ' chip-active' : '')} aria-pressed={progress?.status === s.value} onClick={() => setStatus(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        {next && (
          <Link className="button button-secondary" to={`/estudo/${mod.id}/${next.id}`}>
            Próxima: {next.title}
          </Link>
        )}
      </footer>
    </>
  );
}
