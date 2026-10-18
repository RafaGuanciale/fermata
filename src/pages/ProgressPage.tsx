// Progresso: responde "estou melhorando, e onde eu travo?". Hoje é o "o que eu faço agora".
// No topo, a análise da semana (IA); depois constância, evolução por habilidade e onde você trava.
// Os números vêm de src/progress/stats.ts e skills.ts (puros e testados).

import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Piece } from '../db/db';
import { DAY } from '../db/stats';
import { noteLabel } from '../music/notes';
import { formatPercent } from '../format';
import StatTile from '../components/StatTile';
import { CheckIcon, CrossIcon } from '../components/Icons';
import WeeklyGoal from '../progress/WeeklyGoal';
import WeeklyInsight from '../insight/WeeklyInsight';
import { dayKey } from '../training/progress';
import { findSong } from '../course';
import { ALL_TRACKS, bestTechBpm, techRunId, techStatus } from '../course/track';
import { useRuns } from '../training/runs';
import ReviewSpots from '../progress/ReviewSpots';
import { weakSpots } from '../progress/weakSpots';
import { bestByTreino, freeMinutes, heatLevel, heatmap, minutesByDay, streak, weakNotes, type HeatCell } from '../progress/stats';
import { earSummary, readingSummary, songsProgress, trend, weakReading } from '../progress/skills';

const fullDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const WEEKDAYS = ['seg', '', 'qua', '', 'sex', '', ''];

const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min` : `${Math.round(m)} min`);
const seconds = (ms: number) => `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} s`;

/** "melhor" / "pior" com ícone e palavra (nunca só cor). */
function Trend({ t, before }: { t: ReturnType<typeof trend>; before: string }) {
  if (!t) return null;
  return (
    <span className={'skill__trend' + (t === 'melhor' ? ' skill__trend-up' : t === 'pior' ? ' skill__trend-down' : '')}>
      {t === 'melhor' && <CheckIcon className="skill__trendIcon" />}
      {t === 'pior' && <CrossIcon className="skill__trendIcon" />}
      {t === 'igual' ? 'igual' : t} que nas 4 semanas antes ({before})
    </span>
  );
}

export default function ProgressPage() {
  const location = useLocation();
  const now = Date.now();
  const runs = useRuns();
  const data = useLiveQuery(async () => {
    const since = Date.now() - 120 * DAY;
    const [practice, sessions, attempts, pieces, notes] = await Promise.all([
      db.practice.toArray(),
      db.sessions.where('startedAt').above(since).toArray(),
      db.attempts.where('at').above(since).toArray(),
      db.pieces.toArray(),
      db.notes.toArray(),
    ]);
    return { practice, sessions, attempts, pieces, notes };
  }, []);

  if (!data || !runs) return null;

  const byDay = minutesByDay(data.practice, data.sessions);
  const days = streak(byDay, now);
  const playedToday = (byDay.get(dayKey(now)) ?? 0) > 0;
  const totalMinutes = [...byDay.values()].reduce((a, b) => a + b, 0);
  const free = freeMinutes(data.practice);
  const cells = heatmap(byDay, now, 16);
  const weak = weakReading(data.notes, weakNotes(data.attempts.filter((a) => a.at >= now - 30 * DAY)), now);
  const best = bestByTreino(runs);
  const reading = readingSummary(runs, now);
  const ear = earSummary(runs, now);

  // Técnica: quantos exercícios começados já estão no alvo, e os que estão subindo.
  const techItems = ALL_TRACKS.flatMap((t) => t.technique.map((item) => ({ item, unit: t.unit })));
  const techMeters = techItems
    .filter(({ item }) => best.has(techRunId(item)))
    .map(({ item, unit }) => ({ item, unit, best: bestTechBpm(item, runs), status: techStatus(item, runs), last: best.get(techRunId(item))!.last }));
  const onTarget = techMeters.filter((t) => t.status === 'no alvo').length;
  const climbing = techMeters.filter((t) => t.status !== 'no alvo').sort((a, b) => b.last - a.last);
  const stale = climbing.filter((t) => now - t.last > 7 * DAY);

  // Músicas: do repertório e do curso.
  const pieceByKey = new Map<string, Piece>();
  for (const p of data.pieces) pieceByKey.set(`peca-${p.uid ?? p.id}`, p);
  const songs = songsProgress(runs, now)
    .map((s) => {
      if (s.id.startsWith('curso-')) {
        const song = findSong(s.id.slice(6));
        return song ? { ...s, title: song.title, target: song.bpm, to: `/curso/musica/${song.id}` } : null;
      }
      const piece = pieceByKey.get(s.id);
      return piece ? { ...s, title: piece.title, target: piece.bpm ?? null, to: `/peca/${piece.id}/estudar` } : null;
    })
    .filter((s): s is NonNullable<typeof s> => !!s)
    .slice(0, 6);
  const songWeak = weakSpots(runs);

  const empty = totalMinutes === 0 && runs.length === 0 && data.attempts.length === 0 && data.notes.length === 0;

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Sua evolução</span>
        <h1 className="page__title">Progresso</h1>
      </header>

      {empty ? (
        <section className="progress__empty">
          <p>Ainda não há nada para mostrar. Toque um pouco no piano conectado, faça o treino do dia ou uma leitura: a partir daí esta página mostra sua constância, sua evolução e onde você trava.</p>
          <Link className="button button-primary" to="/treino">Ir para o treino</Link>
        </section>
      ) : (
        <div className="progress">
          <WeeklyInsight />

          <section className="page__section" aria-labelledby="pg-const">
            <h2 className="page__sectionTitle" id="pg-const">Constância</h2>
            <div className="progress__tiles">
              <WeeklyGoal />
              <StatTile label="Dias seguidos" value={String(days)} unit={days === 1 ? 'dia' : 'dias'} delta={playedToday ? 'você já tocou hoje' : days ? 'toque hoje para manter' : 'comece hoje'} />
              <StatTile label="Total no piano" value={minutesText(totalMinutes)} delta={`${[...byDay.values()].filter((m) => m > 0).length} dias com prática${free ? `, ${minutesText(free)} tocando livre` : ''}`} />
            </div>
            <figure className="progress__figure progress__figure-wide">
              <figcaption className="progress__caption">
                Dias com piano, últimas 16 semanas
                <span className="progress__hint">quanto mais escuro, mais minutos naquele dia</span>
              </figcaption>
              <Heatmap cols={cells} />
            </figure>
          </section>

          <section className="page__section" aria-labelledby="pg-evol">
            <h2 className="page__sectionTitle" id="pg-evol">Evolução</h2>
            <p className="page__lead">Cada cartão responde uma pergunta e compara as últimas 4 semanas com as 4 anteriores.</p>
            <div className="skills">
              <article className="skill">
                <h3 className="skill__name">Leitura</h3>
                <p className="skill__question">Quanto tempo você leva para tocar a nota que aparece na pauta?</p>
                {reading.now ? (
                  <>
                    <p className="skill__value">{seconds(reading.now.ms)}</p>
                    <p className="skill__detail">Acerto de primeira: {formatPercent(reading.now.firstTry)} · {reading.now.rounds} {reading.now.rounds === 1 ? 'rodada' : 'rodadas'}</p>
                    <Trend t={trend(reading.now.ms, reading.before?.ms ?? null, true)} before={reading.before ? seconds(reading.before.ms) : ''} />
                  </>
                ) : (
                  <p className="skill__empty">
                    Sem leitura nas últimas 4 semanas. <Link to="/treino/notas" state={{ background: location }}>Fazer uma leitura de notas</Link>
                  </p>
                )}
              </article>

              <article className="skill">
                <h3 className="skill__name">Técnica</h3>
                <p className="skill__question">Quantos exercícios de técnica já estão no andamento alvo?</p>
                {techMeters.length ? (
                  <>
                    <p className="skill__value">
                      {onTarget} <span className="skill__unit">de {techMeters.length}</span>
                    </p>
                    {climbing.length > 0 && (
                      <ul className="progress__meters">
                        {climbing.slice(0, 4).map(({ item, unit, best: b }) => (
                          <li key={item.id} className="progress__meter">
                            <span className="progress__meterName">{item.title}</span>
                            <span className="progress__meterValue">{b ? `${b} de ${item.target} BPM` : `começa em ${item.from} BPM, alvo ${item.target} BPM`} · unidade {unit}</span>
                            <span className="progress__bar" role="img" aria-label={`${b ?? 0} de ${item.target} BPM`}>
                              <span className="progress__barFill" style={{ width: `${Math.min(100, ((b ?? 0) / item.target) * 100)}%` }} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {climbing.length === 0 && <p className="skill__detail">Todos os exercícios começados estão no alvo.</p>}
                  </>
                ) : (
                  <p className="skill__empty">
                    Nenhum exercício de técnica ainda. <Link to="/treino">Ir para o treino</Link>
                  </p>
                )}
              </article>

              <article className="skill">
                <h3 className="skill__name">Ouvido</h3>
                <p className="skill__question">Qual a maior frase que você repete de ouvido?</p>
                {ear.now ? (
                  <>
                    <p className="skill__value">
                      {ear.now} <span className="skill__unit">notas</span>
                    </p>
                    <Trend t={trend(ear.now, ear.before)} before={ear.before ? `${ear.before} notas` : ''} />
                  </>
                ) : (
                  <p className="skill__empty">
                    Ainda sem medida. <Link to="/treino/eco" state={{ background: location }}>Ouvir e tocar de volta</Link>
                  </p>
                )}
              </article>

              <article className="skill skill-wide">
                <h3 className="skill__name">Músicas</h3>
                <p className="skill__question">Como estão as músicas que você toca junto?</p>
                {songs.length ? (
                  <ul className="skill__songs">
                    {songs.map((s) => (
                      <li key={s.id} className="skill__song">
                        <Link className="skill__songTitle" to={s.to} state={{ background: location }}>{s.title}</Link>
                        <span className="skill__songMeta">
                          {s.accuracy.now !== null ? `acerto médio ${formatPercent(s.accuracy.now)}` : `melhor acerto ${formatPercent(s.bestAccuracy)}`}
                          {s.bestClean ? ` · limpa até ${s.bestClean}${s.target ? ` de ${s.target}` : ''} BPM` : ''}
                          {s.week ? ` · ${s.week} ${s.week === 1 ? 'passada' : 'passadas'} nesta semana` : ''}
                        </span>
                        <Trend t={trend(s.accuracy.now, s.accuracy.before)} before={s.accuracy.before !== null ? formatPercent(s.accuracy.before) : ''} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="skill__empty">Toque uma música no "Tocar junto" para ver o acerto e o andamento aqui.</p>
                )}
              </article>

            </div>
          </section>

          <section className="page__section" aria-labelledby="pg-trava">
            <h2 className="page__sectionTitle" id="pg-trava">Onde você trava</h2>
            {weak.length === 0 && stale.length === 0 && songWeak.length === 0 ? (
              <p className="progress__muted">Nada travando agora. Quando uma nota, um treino ou um trecho de música começar a falhar, ele aparece aqui.</p>
            ) : (
              <div className="progress__stuck progress__stuck-auto">
                {songWeak.length > 0 && (
                  <div className="progress__card">
                    <h3 className="progress__cardTitle">Trechos difíceis das músicas</h3>
                    <p className="progress__muted">Cada um volta para revisão em 1, 3, 7 e 14 dias, até sair bem.</p>
                    <ReviewSpots mode="todos" />
                  </div>
                )}
                {weak.length > 0 && (
                  <div className="progress__card">
                    <h3 className="progress__cardTitle">Notas que você mais erra na leitura</h3>
                    <p className="progress__muted">Últimos 30 dias.</p>
                    <ul className="progress__chips">
                      {weak.map((w) => (
                        <li key={w.midi} className="progress__chip">
                          <strong>{noteLabel(w.midi)}</strong> erra {formatPercent(w.missRate)}
                        </li>
                      ))}
                    </ul>
                    <Link className="page__link" to="/treino/notas" state={{ background: location }}>Treinar leitura</Link>
                  </div>
                )}
                {stale.length > 0 && (
                  <div className="progress__card">
                    <h3 className="progress__cardTitle">Técnica parada</h3>
                    <p className="progress__muted">Começada, abaixo do alvo e sem treino há mais de 7 dias.</p>
                    <ul className="progress__list">
                      {stale.map((t) => (
                        <li key={t.item.id}>
                          <Link to="/treino">{t.item.title} (unidade {t.unit})</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

// ---------- gráficos (SVG simples, uma cor) ----------

function Heatmap({ cols }: { cols: HeatCell[][] }) {
  const C = 14;
  const G = 3;
  const left = 28;
  const top = 16;
  const W = left + cols.length * (C + G);
  const H = top + 7 * (C + G);
  return (
    <svg className="heat" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Calendário de prática">
      {cols.map((col, x) =>
        col[0].time && new Date(col[0].time).getDate() <= 7 ? (
          <text key={`m${x}`} className="heat__label" x={left + x * (C + G)} y={10}>
            {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(col[0].time).replace('.', '')}
          </text>
        ) : null,
      )}
      {WEEKDAYS.map((d, y) => (d ? <text key={d} className="heat__label" x={0} y={top + y * (C + G) + C - 3}>{d}</text> : null))}
      {cols.map((col, x) =>
        col.map((c, y) =>
          c.future ? null : (
            <rect key={c.day} className={`heat__cell heat__cell-${heatLevel(c.minutes)}`} x={left + x * (C + G)} y={top + y * (C + G)} width={C} height={C} rx={3}>
              <title>{`${fullDate.format(c.time)}: ${c.minutes ? minutesText(c.minutes) : 'sem prática'}`}</title>
            </rect>
          ),
        ),
      )}
    </svg>
  );
}
