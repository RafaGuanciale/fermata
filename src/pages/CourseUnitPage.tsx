// Uma unidade do curso: lições em ordem (cada uma abre quando a anterior passa no checkpoint)
// e o projeto final, a música que fecha o módulo.

import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import PhotoCard from '../components/PhotoCard';
import { BackIcon, PlayIcon } from '../components/Icons';
import { useRuns } from '../training/runs';
import { UNITS, findSong } from '../course';
import { LESSON_STATE_LABEL, finalPassedAt, isPassed, lessonKey, lessonState, unitUnlocked } from '../course/progress';
import { useCourseRows } from './CourseLessonPage';
import { UNIT_PHOTOS } from './StudyPage';

export default function CourseUnitPage() {
  const n = Number(useParams().n);
  const location = useLocation();
  const rows = useCourseRows();
  const runs = useRuns();
  const index = UNITS.findIndex((u) => u.n === n);
  if (index < 0) return <Navigate to="/estudo" replace />;
  if (!rows || !runs) return null;

  const unit = UNITS[index];
  const open = unitUnlocked(UNITS, index, rows, runs);
  const passed = unit.lessons.filter((l) => isPassed(rows.get(lessonKey(unit, l)))).length;
  const song = findSong(unit.final.songId);
  const finalAt = finalPassedAt(unit, runs);
  const songRuns = runs.filter((r) => r.treinoId === `curso-${unit.final.songId}`);
  const bestAcc = songRuns.reduce((m, r) => Math.max(m, r.accuracy ?? 0), 0);
  const allLessons = passed === unit.lessons.length;

  return (
    <>
      <Link className="page__back" to="/estudo">
        <BackIcon className="page__backIcon" />
        Estudo
      </Link>
      <PhotoCard photo={UNIT_PHOTOS[unit.n - 1]} size="hero" eyebrow={`Unidade ${unit.n} · ${unit.lessons.length} lições + projeto final`} title={unit.title} sizes="100vw">
        <span className="photoCard__body">{unit.goal}</span>
      </PhotoCard>

      {!open && <p className="courseBanner">Esta unidade abre quando você concluir a anterior: todas as lições e o projeto final.</p>}

      <section className="page__section">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Lições</h2>
          <span className="page__link page__num">{passed} de {unit.lessons.length} concluídas</span>
        </div>
        <div className="progressTrack" aria-hidden>
          <div className="progressTrack__fill" style={{ width: `${(passed / unit.lessons.length) * 100}%` }} />
        </div>
        <ol className="lessonList">
          {unit.lessons.map((l, i) => {
            const state = lessonState(unit, i, rows, open);
            return (
              <li key={l.id}>
                <Link className={'lessonList__item' + (state === 'bloqueada' ? ' lessonList__item-soon' : '')} to={`/estudo/unidade/${unit.n}/${l.id}`}>
                  <span className="lessonList__num">{l.n}</span>
                  <span className="lessonList__main">
                    <span className="lessonList__title">{l.title}</span>
                    <span className="lessonList__summary">{l.objectives[0]}</span>
                  </span>
                  <span className={`courseState courseState-${state}`}>{LESSON_STATE_LABEL[state]}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {song && (
        <section className="page__section">
          <h2 className="page__sectionTitle">Projeto final</h2>
          <div className={'finalCard' + (finalAt ? ' finalCard-done' : '')}>
            <div className="finalCard__main">
              <p className="page__eyebrow">{song.composer}{song.arrangement ? ` · ${song.arrangement}` : ''}</p>
              <h3 className="finalCard__title">{song.title}</h3>
              <p className="lesson__p">{unit.final.brief}</p>
              <p className="finalCard__rule">
                Para passar: música inteira, {song.hands === 'duas' ? 'duas mãos' : `mão ${song.hands}`}, no "Tocar junto" a {song.bpm} BPM, com {Math.round(song.pass.accuracy * 100)}% de acerto.
              </p>
              <p className="finalCard__status">
                {finalAt
                  ? allLessons ? 'Aprovado. Unidade concluída.' : 'Música aprovada. Falta concluir as lições para fechar a unidade.'
                  : songRuns.length
                    ? `Melhor acerto até agora: ${Math.round(bestAcc * 100)}%.`
                    : allLessons
                      ? 'Lições concluídas: falta só a música.'
                      : 'Você pode estudar a música desde já; ela vale como projeto final quando todas as lições estiverem concluídas.'}
              </p>
            </div>
            <Link className="button button-primary" to={`/curso/musica/${song.id}`} state={{ background: location }}>
              <PlayIcon className="button__icon" />
              Tocar a música
            </Link>
          </div>
        </section>
      )}

      <section className="page__section">
        <h2 className="page__sectionTitle">Trilho técnico</h2>
        <p className="page__lead">{unit.technique}</p>
      </section>
    </>
  );
}
