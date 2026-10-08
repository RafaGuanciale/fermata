import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DAY, avgFindMs, dailyAvgFindMs, firstTryRate, practiceMinutes, startOfWeek, weakestNote } from '../db/stats';
import { C_POSITION } from '../music/exercises';
import { noteLabel } from '../music/notes';
import { formatPercent, formatSeconds, formatToday } from '../format';
import PianoKeyboard from '../components/PianoKeyboard';
import StatTile from '../components/StatTile';
import { PlayIcon } from '../components/Icons';

export default function TodayPage() {
  const now = Date.now();
  const since = now - 28 * DAY;
  const data = useLiveQuery(async () => {
    const [sessions, attempts] = await Promise.all([
      db.sessions.where('startedAt').above(since).toArray(),
      db.attempts.where('at').above(since).toArray(),
    ]);
    return { sessions, attempts };
  }, []);

  const litKeys = Object.fromEntries(C_POSITION.map((m) => [m, 'lit' as const]));

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">{formatToday(new Date(now))}</span>
        <h1 className="page__title">Seu estudo de hoje</h1>
      </header>

      <section className="today__hero" aria-label="Treino sugerido">
        <div className="today__heroText">
          <span className="page__eyebrow">Treino sugerido · cerca de 5 min</span>
          <h2 className="today__heroTitle">Leitura de Dó a Sol na clave de sol</h2>
          <p className="today__heroBody">
            As cinco notas da posição de Dó, as mesmas da Ode à Alegria. Sem metrônomo: o foco é achar a tecla certa.
          </p>
          <div className="today__actions">
            <Link className="button button-primary" to="/treino?modo=notas">
              <PlayIcon className="button__icon" />
              Começar treino
            </Link>
            <Link className="button button-secondary" to="/treino?modo=musica">
              Tocar Ode à Alegria
            </Link>
          </div>
        </div>
        <PianoKeyboard low={60} high={72} marks={litKeys} showNames size="small" label="Teclas de Dó a Sol acesas" />
      </section>

      <section className="page__section" aria-label="Sua evolução">
        <h2 className="page__sectionTitle">Sua evolução</h2>
        {data === undefined ? null : data.sessions.length === 0 ? (
          <p className="today__empty">
            Seus números aparecem aqui depois do primeiro treino: minutos praticados, tempo para achar cada nota e acertos de primeira.
          </p>
        ) : (
          <Evolution sessions={data.sessions} attempts={data.attempts} now={now} />
        )}
      </section>
    </>
  );
}

function Evolution({ sessions, attempts, now }: { sessions: Parameters<typeof practiceMinutes>[0]; attempts: Parameters<typeof avgFindMs>[0]; now: number }) {
  const week = startOfWeek(now);
  const minutes = practiceMinutes(sessions, week, week + 7 * DAY);
  const minutesBefore = practiceMinutes(sessions, week - 7 * DAY, week);

  const last7 = now - 7 * DAY;
  const find = avgFindMs(attempts, last7, Infinity);
  const findBefore = avgFindMs(attempts, last7 - 7 * DAY, last7);
  const rate = firstTryRate(sessions, last7, Infinity);
  const rateBefore = firstTryRate(sessions, last7 - 7 * DAY, last7);
  const weak = weakestNote(attempts.filter((a) => a.at >= last7));

  let findDelta: string | undefined;
  if (find !== null && findBefore !== null) {
    const change = (findBefore - find) / findBefore;
    findDelta = change >= 0 ? `${formatPercent(change)} mais rápido que na semana anterior` : `${formatPercent(-change)} mais lento que na semana anterior`;
  }
  let rateDelta: string | undefined;
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
          value={String(minutes)}
          unit="min"
          delta={minutesBefore ? `${minuteDiff >= 0 ? '+' : '−'}${Math.abs(minuteDiff)} min sobre a semana passada` : undefined}
          deltaGood={minuteDiff > 0}
        />
        <StatTile
          label="Tempo para achar a nota"
          value={find !== null ? formatSeconds(find).replace(' s', '') : '—'}
          unit={find !== null ? 's' : undefined}
          delta={findDelta ?? 'Média dos últimos 7 dias'}
          deltaGood={find !== null && findBefore !== null && find < findBefore}
          series={dailyAvgFindMs(attempts, now, 14)}
          lowerIsBetter
        />
        <StatTile
          label="Acertos de primeira"
          value={rate !== null ? String(Math.round(rate * 100)) : '—'}
          unit={rate !== null ? '%' : undefined}
          delta={rateDelta ?? 'Últimos 7 dias'}
          deltaGood={rate !== null && rateBefore !== null && rate > rateBefore}
        />
      </div>
      {weak && (
        <p className="statTile__delta">
          Nota que você mais erra esta semana: <strong style={{ color: 'var(--text)' }}>{noteLabel(weak.midi)}</strong>, {formatPercent(weak.missRate)} de erro.
        </p>
      )}
    </>
  );
}
