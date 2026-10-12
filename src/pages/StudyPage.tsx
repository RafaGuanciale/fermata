import { Link, useLocation } from 'react-router-dom';
import PhotoCard from '../components/PhotoCard';
import type { PhotoKey } from '../media/photos';
import { useRuns } from '../training/runs';
import { PLAN, UNITS } from '../course';
import { courseStep, courseSummary, isPassed, lessonKey, nextLesson, unitComplete, unitUnlocked } from '../course/progress';
import { useCourseRows } from '../course/useCourseRows';

/** Foto de cada unidade (reaproveita as fotos dos módulos e do repertório). */
export const UNIT_PHOTOS: PhotoKey[] = ['teclado', 'leitura', 'acordes', 'escalas', 'ritmo', 'harmonia', 'acordes', 'jazz', 'classico', 'harmonia', 'mpb', 'filmes'];

export default function StudyPage() {
  const rows = useCourseRows();
  const runs = useRuns();
  const location = useLocation();

  const next = rows && runs ? nextLesson(UNITS, rows, runs) : null;
  const summary = rows && runs ? courseSummary(UNITS, rows, runs) : null;
  const step = rows && runs ? courseStep(UNITS, rows, runs) : null;
  const finalUnit = step?.kind === 'final' ? step.unit : null;
  const finalSong = finalUnit ? finalUnit.songs.find((s) => s.id === finalUnit.final.songId) : undefined;

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Curso de piano · 12 unidades</span>
        <h1 className="page__title">Estudo</h1>
        <p className="page__lead">
          Cada lição tem cerca de uma hora: revisão, teoria curta, exemplos que o app toca, prática no teclado e um checkpoint de 85% para avançar. Cada unidade fecha com uma música.
        </p>
      </header>

      {next && (
        <PhotoCard photo={UNIT_PHOTOS[next.unit.n - 1]} size="hero" eyebrow={`Unidade ${next.unit.n} · lição ${next.lessonIndex + 1} de ${next.unit.lessons.length}`} title={next.lesson.title} sizes="100vw">
          <span className="photoCard__body">{next.lesson.objectives[0]}</span>
          <span className="photoCard__actions">
            <Link className="button button-primary" to={`/estudo/unidade/${next.unit.n}/${next.lesson.id}`}>
              {rows?.get(lessonKey(next.unit, next.lesson)) ? 'Continuar a lição' : 'Começar a lição'}
            </Link>
            {summary && <span className="photoCard__note">{summary.lessonsPassed} de {summary.lessonsTotal} lições escritas concluídas</span>}
          </span>
        </PhotoCard>
      )}

      {!next && finalUnit && finalSong && (
        <PhotoCard photo={UNIT_PHOTOS[finalUnit.n - 1]} size="hero" eyebrow={`Unidade ${finalUnit.n} · música final`} title={finalSong.title} sizes="100vw">
          <span className="photoCard__body">As lições da unidade estão feitas. Toque a música final no andamento pedido para abrir a próxima unidade.</span>
          <span className="photoCard__actions">
            <Link className="button button-primary" to={`/curso/musica/${finalSong.id}`} state={{ background: location }}>Tocar a música</Link>
          </span>
        </PhotoCard>
      )}

      <section className="page__section">
        <h2 className="page__sectionTitle">Unidades</h2>
        <div className="photoGrid photoGrid-units">
          {PLAN.map((p, i) => {
            const unit = UNITS.find((u) => u.n === p.n);
            const index = unit ? UNITS.indexOf(unit) : -1;
            const open = unit && rows && runs ? unitUnlocked(UNITS, index, rows, runs) : false;
            const passed = unit && rows ? unit.lessons.filter((l) => isPassed(rows.get(lessonKey(unit, l)))).length : 0;
            const complete = unit && rows && runs ? unitComplete(unit, rows, runs) : false;
            const badge = !unit ? 'Em construção' : complete ? 'Concluída' : !open ? 'Bloqueada' : `${passed} de ${unit.lessons.length} lições`;
            return (
              <PhotoCard
                key={p.n}
                photo={UNIT_PHOTOS[i]}
                to={unit ? `/estudo/unidade/${p.n}` : undefined}
                eyebrow={`Unidade ${p.n}`}
                title={p.title}
                badge={badge}
              />
            );
          })}
        </div>
      </section>

      <section className="page__section">
        <h2 className="page__sectionTitle">Consulta</h2>
        <p className="page__lead">Acordes, escalas, campo harmônico, intervalos, claves, ritmo e termos, para olhar e tentar no piano a qualquer hora.</p>
        <Link className="button button-secondary" to="/consulta">Abrir a Consulta</Link>
      </section>
    </>
  );
}
