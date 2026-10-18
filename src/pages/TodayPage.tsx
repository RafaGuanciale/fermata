import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatToday } from '../format';
import PhotoCard from '../components/PhotoCard';
import PieceList from '../components/PieceList';
import InsightFocus from '../insight/InsightFocus';
import StreakLine from '../progress/StreakLine';
import { PlayIcon } from '../components/Icons';
import { useTrainingToday } from '../course/useTrainingToday';
import ReviewSpots from '../progress/ReviewSpots';
import { useRuns } from '../training/runs';
import { dueSpots } from '../progress/weakSpots';

export default function TodayPage() {
  const location = useLocation();
  const now = Date.now();
  const data = useLiveQuery(async () => ({ learning: await db.pieces.where('status').equals('learning').toArray() }), []);

  const training = useTrainingToday();
  const runs = useRuns();
  const hasDue = !!runs && dueSpots(runs, now).length > 0;
  const lessonTitle = training?.next?.lesson.title;

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">{formatToday(new Date(now))}</span>
        <h1 className="page__title">Seu estudo de hoje</h1>
      </header>

      <PhotoCard
        photo="todayHero"
        size="hero"
        eyebrow={training ? `Treino de hoje · unidade ${training.unit} · cerca de 20 min` : 'Treino de hoje'}
        title={training ? (training.done >= training.total ? 'Treino de hoje completo' : `${training.done} de ${training.total} partes feitas`) : 'Seu treino'}
        sizes="100vw"
      >
        <span className="photoCard__body">
          {lessonTitle
            ? `Aquecimento, revisão, técnica, leitura e ouvido. Lição do curso: ${lessonTitle}.`
            : training?.finalSong
              ? `Aquecimento, revisão, técnica, leitura e ouvido. Para abrir a próxima unidade, falta a música final: ${training.finalSong.title}.`
              : 'Aquecimento, revisão, técnica, leitura e ouvido, no nível da sua unidade.'}
        </span>
        <span className="photoCard__actions">
          <Link className="button button-primary" to="/treino/foco" state={{ background: location }}>
            <PlayIcon className="button__icon" />
            Treinar
          </Link>
          {training?.next && (
            <Link className="button button-secondary" to={`/curso/foco/${training.next.unit.n}/${training.next.lesson.id}`} state={{ background: location }}>
              Lição: {training.next.lesson.title}
            </Link>
          )}
          {!training?.next && training?.finalSong && (
            <Link className="button button-secondary" to={`/curso/musica/${training.finalSong.id}`} state={{ background: location }}>
              Música final: {training.finalSong.title}
            </Link>
          )}
        </span>
      </PhotoCard>
      <StreakLine />
      <InsightFocus />

      {hasDue && (
        <section className="page__section">
          <div className="page__sectionHead">
            <h2 className="page__sectionTitle">Trechos para rever hoje</h2>
          </div>
          <p className="page__lead">Onde você mais errou no Tocar junto. Estude devagar e depois passe o trecho no tempo: se sair bem, ele volta mais espaçado.</p>
          <ReviewSpots mode="hoje" />
        </section>
      )}

      {data && data.learning.length > 0 && (
        <section className="page__section">
          <div className="page__sectionHead">
            <h2 className="page__sectionTitle">Continuar aprendendo</h2>
            <Link className="page__link" to="/repertorio">Ver repertório</Link>
          </div>
          <PieceList pieces={data.learning.slice(0, 3)} />
        </section>
      )}

    </>
  );
}
