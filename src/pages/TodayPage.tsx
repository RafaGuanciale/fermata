import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Attempt, type Session } from '../db/db';
import { DAY, avgFindMs, dailyAvgFindMs, firstTryRate, practiceMinutes, startOfWeek, weakestNote } from '../db/stats';
import { noteLabel } from '../music/notes';
import { formatPercent, formatSeconds, formatToday } from '../format';
import PhotoCard from '../components/PhotoCard';
import PieceList from '../components/PieceList';
import StatTile from '../components/StatTile';
import { PlayIcon } from '../components/Icons';
import { enterFullscreen } from '../hooks/useFullscreen';

export default function TodayPage() {
  const now = Date.now();
  const since = now - 28 * DAY;
  const data = useLiveQuery(async () => {
    const [sessions, attempts, learning] = await Promise.all([
      db.sessions.where('startedAt').above(since).toArray(),
      db.attempts.where('at').above(since).toArray(),
      db.pieces.where('status').equals('learning').toArray(),
    ]);
    return { sessions, attempts, learning };
  }, []);

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">{formatToday(new Date(now))}</span>
        <h1 className="page__title">Seu estudo de hoje</h1>
      </header>

      <PhotoCard photo="todayHero" size="hero" eyebrow="Treino sugerido · cerca de 3 min" title="Leitura de Dó a Sol na clave de sol" sizes="100vw">
        <span className="photoCard__body">As cinco notas da posição de Dó, as mesmas da Ode à Alegria. O foco é achar a tecla certa.</span>
        <span className="photoCard__actions">
          <Link className="button button-primary" to="/treino/sessao?modo=notas" onClick={enterFullscreen}>
            <PlayIcon className="button__icon" />
            Começar treino
          </Link>
          <Link className="button button-secondary" to="/treino/sessao?modo=musica" onClick={enterFullscreen}>
            Tocar Ode à Alegria
          </Link>
        </span>
      </PhotoCard>

      {data && data.learning.length > 0 && (
        <section className="page__section">
          <div className="page__sectionHead">
            <h2 className="page__sectionTitle">Continuar aprendendo</h2>
            <Link className="page__link" to="/repertorio">Ver repertório</Link>
          </div>
          <PieceList pieces={data.learning.slice(0, 3)} />
        </section>
      )}

      <section className="page__section" aria-label="Sua evolução">
        <h2 className="page__sectionTitle">Sua evolução</h2>
        {data === undefined ? null : data.sessions.length === 0 ? (
          <p className="emptyState__body">Depois do primeiro treino aparecem aqui seus minutos praticados, o tempo para achar cada nota e os acertos de primeira.</p>
        ) : (
          <Evolution sessions={data.sessions} attempts={data.attempts} now={now} />
        )}
      </section>
    </>
  );
}

function Evolution({ sessions, attempts, now }: { sessions: Session[]; attempts: Attempt[]; now: number }) {
  const week = startOfWeek(now);
  const minutes = practiceMinutes(sessions, week, week + 7 * DAY);
  const minutesBefore = practiceMinutes(sessions, week - 7 * DAY, week);
  const last7 = now - 7 * DAY;
  const find = avgFindMs(attempts, last7, Infinity);
  const findBefore = avgFindMs(attempts, last7 - 7 * DAY, last7);
  const rate = firstTryRate(sessions, last7, Infinity);
  const rateBefore = firstTryRate(sessions, last7 - 7 * DAY, last7);
  const weak = weakestNote(attempts.filter((a) => a.at >= last7));

  let findDelta = 'Média dos últimos 7 dias';
  if (find !== null && findBefore !== null) {
    const change = (findBefore - find) / findBefore;
    findDelta = change >= 0 ? `${formatPercent(change)} mais rápido que na semana anterior` : `${formatPercent(-change)} mais lento que na semana anterior`;
  }
  let rateDelta = 'Últimos 7 dias';
  if (rate !== null && rateBefore !== null) {
    const pts = Math.round((rate - rateBefore) * 100);
    rateDelta = `${pts >= 0 ? '+' : '−'}${Math.abs(pts)} pontos sobre a semana anterior`;
  }
  const minuteDiff = minutes - minutesBefore;

  return (
    <>
      <div className="today__stats">
        <StatTile
          label="Prática esta semana"
          value={minutes < 1 && sessions.some((s) => s.startedAt >= week) ? '< 1' : String(minutes)}
          unit="min"
          delta={minutesBefore ? `${minuteDiff >= 0 ? '+' : '−'}${Math.abs(minuteDiff)} min sobre a semana passada` : undefined}
          deltaGood={minuteDiff > 0}
        />
        <StatTile
          label="Tempo para achar a nota"
          value={find !== null ? formatSeconds(find).replace(' s', '') : '—'}
          unit={find !== null ? 's' : undefined}
          delta={findDelta}
          deltaGood={find !== null && findBefore !== null && find < findBefore}
          series={dailyAvgFindMs(attempts, now, 14)}
          lowerIsBetter
        />
        <StatTile
          label="Acertos de primeira"
          value={rate !== null ? String(Math.round(rate * 100)) : '—'}
          unit={rate !== null ? '%' : undefined}
          delta={rateDelta}
          deltaGood={rate !== null && rateBefore !== null && rate > rateBefore}
        />
      </div>
      {weak && (
        <p className="statTile__delta">
          Nota que você mais erra esta semana: <strong className="today__weak">{noteLabel(weak.midi)}</strong>, {formatPercent(weak.missRate)} de erro.
        </p>
      )}
    </>
  );
}
