// Progresso: responde quatro perguntas — você está tocando com constância? está evoluindo?
// onde trava? o que já conquistou? Os números vêm de src/progress/stats.ts (puro e testado).

import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Piece } from '../db/db';
import { DAY } from '../db/stats';
import { noteLabel } from '../music/notes';
import { formatPercent, formatSeconds } from '../format';
import StatTile from '../components/StatTile';
import { dayKey } from '../training/progress';
import { PLAN, UNITS } from '../course';
import { finalPassedAt, isPassed, lessonKey, unitComplete, unitUnlocked } from '../course/progress';
import { ALL_TRACKS, bestTechBpm, techRunId, techStatus } from '../course/track';
import { useCourseRows } from './CourseLessonPage';
import { useRuns } from '../training/runs';
import { bestByTreino, heatLevel, heatmap, milestones, minutesByDay, streak, weakNotes, weeklyReading, weeklyTotals, type HeatCell, type WeekReading, type WeekTotal } from '../progress/stats';

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const WEEKDAYS = ['seg', '', 'qua', '', 'sex', '', ''];

const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min` : `${Math.round(m)} min`);

export default function ProgressPage() {
  const location = useLocation();
  const now = Date.now();
  const runs = useRuns();
  const rows = useCourseRows();
  const data = useLiveQuery(async () => {
    const since = Date.now() - 120 * DAY;
    const [practice, sessions, attempts, pieces] = await Promise.all([
      db.practice.toArray(),
      db.sessions.where('startedAt').above(since).toArray(),
      db.attempts.where('at').above(since).toArray(),
      db.pieces.toArray(),
    ]);
    return { practice, sessions, attempts, pieces };
  }, []);

  if (!data || !runs || !rows) return null;

  const byDay = minutesByDay(data.practice, data.sessions);
  const weeks = weeklyTotals(byDay, now, 8);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const days = streak(byDay, now);
  const playedToday = (byDay.get(dayKey(now)) ?? 0) > 0;
  const totalMinutes = [...byDay.values()].reduce((a, b) => a + b, 0);
  const cells = heatmap(byDay, now, 16);
  const reading = weeklyReading(data.attempts, data.sessions, now, 8);
  const lastReading = [...reading].reverse().find((w) => w.findMs !== null) ?? null;
  const recentAttempts = data.attempts.filter((a) => a.at >= now - 30 * DAY);
  const weak = weakNotes(recentAttempts);
  const best = bestByTreino(runs);

  // Técnica do Treino: cada item com registro, o melhor BPM e se está parado há mais de 7 dias.
  const techItems = ALL_TRACKS.flatMap((t) => t.technique.map((item) => ({ item, unit: t.unit })));
  const techMeters = techItems.filter(({ item }) => best.has(techRunId(item))).map(({ item, unit }) => ({ item, unit, best: bestTechBpm(item, runs), status: techStatus(item, runs), last: best.get(techRunId(item))!.last }));
  const stale = techMeters.filter((t) => t.status !== 'no alvo' && now - t.last > 7 * DAY);

  // Curso: estado de cada unidade e os marcos.
  const passedAts = [...rows.values()].flatMap((r) => (r.passedAt ? [r.passedAt] : []));
  const courseMarks = [
    { title: 'Primeira lição do curso concluída', at: passedAts.length ? Math.min(...passedAts) : null },
    ...UNITS.slice(0, 3).map((u) => {
      const lessonsAt = u.lessons.map((l) => rows.get(lessonKey(u, l))?.passedAt ?? null);
      const fin = finalPassedAt(u, runs);
      const done = unitComplete(u, rows, runs) && fin !== null && lessonsAt.every((x) => x !== null);
      return { title: `Unidade ${u.n} concluída`, at: done ? Math.max(fin!, ...(lessonsAt as number[])) : null };
    }),
    { title: 'Primeira técnica no andamento alvo', at: (() => {
      const hits = techItems.flatMap(({ item }) => runs.filter((r) => r.treinoId === techRunId(item) && r.clean && (r.bpm ?? 0) >= item.target).map((r) => r.at));
      return hits.length ? Math.min(...hits) : null;
    })() },
  ];

  const pieceByKey = new Map<string, Piece>();
  for (const p of data.pieces) pieceByKey.set(`peca-${p.uid ?? p.id}`, p);
  const songs = [...best.entries()].filter(([id]) => id.startsWith('peca-') && pieceByKey.has(id)).map(([id, b]) => ({ piece: pieceByKey.get(id)!, ...b })).sort((a, b) => b.last - a.last);
  const songWeak = songs.filter((s) => s.lastWeak);

  const learnedAt = data.pieces.filter((p) => p.status === 'learned' || p.status === 'repertoire').map((p) => p.updatedAt);
  const marks = milestones(runs, byDay, learnedAt, courseMarks).sort((a, b) => (a.at === null ? 1 : 0) - (b.at === null ? 1 : 0) || (a.at ?? 0) - (b.at ?? 0));

  const empty = totalMinutes === 0 && runs.length === 0 && data.attempts.length === 0;

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
          <section className="page__section" aria-labelledby="pg-const">
            <h2 className="page__sectionTitle" id="pg-const">Constância</h2>
            <div className="progress__tiles">
              <StatTile label="Esta semana" value={minutesText(thisWeek.minutes)} delta={lastWeek.minutes ? `semana passada: ${minutesText(lastWeek.minutes)}` : undefined} deltaGood={thisWeek.minutes >= lastWeek.minutes && lastWeek.minutes > 0} />
              <StatTile label="Dias seguidos" value={String(days)} unit={days === 1 ? 'dia' : 'dias'} delta={playedToday ? 'você já tocou hoje' : days ? 'toque hoje para manter' : 'comece hoje'} />
              <StatTile label="Total no piano" value={minutesText(totalMinutes)} delta={`${[...byDay.values()].filter((m) => m > 0).length} dias com prática`} />
            </div>
            <div className="progress__charts">
              <figure className="progress__figure">
                <figcaption className="progress__caption">Minutos por dia, últimas 16 semanas</figcaption>
                <Heatmap cols={cells} />
              </figure>
              <figure className="progress__figure">
                <figcaption className="progress__caption">Minutos por semana</figcaption>
                <WeekBars weeks={weeks} />
              </figure>
            </div>
          </section>

          <section className="page__section" aria-labelledby="pg-evol">
            <h2 className="page__sectionTitle" id="pg-evol">Evolução</h2>
            <div className="progress__charts">
              <figure className="progress__figure">
                <figcaption className="progress__caption">
                  Tempo para achar a nota na leitura
                  <span className="progress__hint">menor é melhor{lastReading?.firstTry != null ? ` · acerto de primeira na última semana: ${formatPercent(lastReading.firstTry)}` : ''}</span>
                </figcaption>
                <ReadingLine weeks={reading} />
              </figure>
              <div className="progress__figure">
                <h3 className="progress__caption">Melhor andamento limpo</h3>
                {techMeters.length === 0 && songs.length === 0 ? (
                  <p className="progress__muted">Faça um treino no tempo ou toque junto uma música para ver o andamento subir.</p>
                ) : (
                  <ul className="progress__meters">
                    {techMeters.map(({ item, unit, best: b, status }) => (
                      <li key={item.id} className="progress__meter">
                        <span className="progress__meterName">{item.title}</span>
                        <span className="progress__meterValue">{b ? `${b} de ${item.target} BPM` : `sem passada boa · alvo ${item.target} BPM`} · unidade {unit}</span>
                        <span className="progress__bar" role="img" aria-label={`${b ?? 0} de ${item.target} BPM`}>
                          <span className="progress__barFill" style={{ width: `${Math.min(100, ((b ?? 0) / item.target) * 100)}%` }} />
                        </span>
                        <span className="progress__meterStatus">{status === 'no alvo' ? 'No alvo' : 'Subindo'}</span>
                      </li>
                    ))}
                    {songs.map((s) => {
                      const target = s.piece.bpm ?? null;
                      const value = s.bestClean ?? 0;
                      return (
                        <li key={s.piece.id} className="progress__meter">
                          <span className="progress__meterName">{s.piece.title}</span>
                          <span className="progress__meterValue">
                            {s.bestClean ? `${s.bestClean}${target ? ` de ${target}` : ''} BPM` : 'sem passada limpa'} · melhor acerto {formatPercent(s.bestAccuracy)}
                          </span>
                          <span className="progress__bar" role="img" aria-label={`acerto ${formatPercent(s.bestAccuracy)}`}>
                            <span className="progress__barFill" style={{ width: `${target && value ? Math.min(100, (value / target) * 100) : s.bestAccuracy * 100}%` }} />
                          </span>
                          <span className="progress__meterStatus">Música</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="page__section" aria-labelledby="pg-trava">
            <h2 className="page__sectionTitle" id="pg-trava">Onde você trava</h2>
            {weak.length === 0 && stale.length === 0 && songWeak.length === 0 ? (
              <p className="progress__muted">Nada travando agora. Quando uma nota, um treino ou um trecho de música começar a falhar, ele aparece aqui.</p>
            ) : (
              <div className="progress__stuck progress__stuck-auto">
                {weak.length > 0 && (
                  <div className="progress__card">
                    <h3 className="progress__cardTitle">Notas que você mais erra</h3>
                    <p className="progress__muted">Últimos 30 dias de leitura.</p>
                    <ul className="progress__chips">
                      {weak.map((w) => (
                        <li key={w.midi} className="progress__chip">
                          <strong>{noteLabel(w.midi)}</strong> erra {formatPercent(w.missRate)}
                        </li>
                      ))}
                    </ul>
                    <Link className="page__link" to="/treino/sessao" state={{ background: location }}>Treinar leitura</Link>
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
                {songWeak.length > 0 && (
                  <div className="progress__card">
                    <h3 className="progress__cardTitle">Trechos difíceis das músicas</h3>
                    <p className="progress__muted">Da última vez que você tocou junto.</p>
                    <ul className="progress__list">
                      {songWeak.map((s) => (
                        <li key={s.piece.id}>
                          <Link to={`/peca/${s.piece.id}/estudar`} state={{ background: location, from: s.lastWeak![0], to: s.lastWeak![1] }}>
                            {s.piece.title}: compassos {s.lastWeak![0]} a {s.lastWeak![1]}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="page__section" aria-labelledby="pg-conq">
            <h2 className="page__sectionTitle" id="pg-conq">Conquistas</h2>
            <div className="progress__stuck">
              <div className="progress__card">
                <h3 className="progress__cardTitle">Unidades do curso</h3>
                <ol className="progress__phases">
                  {PLAN.map((p) => {
                    const i = UNITS.findIndex((u) => u.n === p.n);
                    const unit = i >= 0 ? UNITS[i] : null;
                    const open = unit ? unitUnlocked(UNITS, i, rows, runs) : false;
                    const complete = unit ? unitComplete(unit, rows, runs) : false;
                    const passed = unit ? unit.lessons.filter((l) => isPassed(rows.get(lessonKey(unit, l)))).length : 0;
                    const current = open && !complete;
                    const label = !unit ? 'Em construção' : complete ? 'Concluída' : open ? `${passed} de ${unit.lessons.length} lições` : 'Bloqueada';
                    return (
                      <li key={p.n} className={`progress__phase${complete ? ' progress__phase-done' : current ? ' progress__phase-current' : ''}`}>
                        <span className="progress__phaseN">{p.n}</span>
                        <span className="progress__phaseText">
                          {unit ? <Link className="progress__phaseTitle" to={`/estudo/unidade/${p.n}`}>{p.title}</Link> : <span className="progress__phaseTitle">{p.title}</span>}
                          <span className="progress__muted">{label}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div className="progress__card">
                <h3 className="progress__cardTitle">Marcos</h3>
                <ul className="progress__marks">
                  {marks.map((m) => (
                    <li key={m.title} className={`progress__mark${m.at ? ' progress__mark-done' : ''}`}>
                      <span className="progress__markDot" aria-hidden="true" />
                      <span className="progress__markTitle">{m.title}</span>
                      <span className="progress__muted">{m.at ? shortDate.format(m.at) : 'ainda não'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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

function WeekBars({ weeks }: { weeks: WeekTotal[] }) {
  const W = 320;
  const H = 150;
  const base = H - 22;
  const max = Math.max(30, ...weeks.map((w) => w.minutes));
  const slot = W / weeks.length;
  const bw = Math.min(22, slot * 0.5);
  return (
    <svg className="bars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Minutos por semana">
      <line className="chart__axis" x1={0} x2={W} y1={base} y2={base} />
      {weeks.map((w, i) => {
        const h = (w.minutes / max) * (base - 18);
        const x = i * slot + (slot - bw) / 2;
        const current = i === weeks.length - 1;
        return (
          <g key={w.start}>
            <rect className="bars__hit" x={i * slot} y={0} width={slot} height={base}>
              <title>{`Semana de ${shortDate.format(w.start)}: ${minutesText(w.minutes)} em ${w.days} ${w.days === 1 ? 'dia' : 'dias'}`}</title>
            </rect>
            {w.minutes > 0 && <path className={`bars__bar${current ? ' bars__bar-current' : ''}`} d={roundedTop(x, base, bw, Math.max(h, 3))} pointerEvents="none" />}
            {(current || w.minutes === max) && w.minutes > 0 && (
              <text className="chart__value" x={x + bw / 2} y={base - h - 5} textAnchor="middle">{Math.round(w.minutes)}</text>
            )}
            <text className="chart__tick" x={x + bw / 2} y={H - 6} textAnchor="middle">{dayMonth.format(w.start)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function roundedTop(x: number, base: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + w - r} Q${x + w},${base - h} ${x + w},${base - h + r} V${base} Z`;
}

function ReadingLine({ weeks }: { weeks: WeekReading[] }) {
  const pts = weeks.map((w, i) => ({ i, v: w.findMs, w })).filter((p): p is { i: number; v: number; w: WeekReading } => p.v !== null);
  if (pts.length === 0) return <p className="progress__muted">Faça leituras no treino para ver este gráfico.</p>;
  const W = 320;
  const H = 150;
  const base = H - 22;
  const topY = 16;
  const vals = pts.map((p) => p.v);
  const max = Math.max(...vals) * 1.1;
  const min = Math.max(0, Math.min(...vals) * 0.8);
  const slot = W / weeks.length;
  const x = (i: number) => i * slot + slot / 2;
  const y = (v: number) => (max === min ? (base + topY) / 2 : topY + (1 - (v - min) / (max - min)) * (base - topY));
  const line = pts.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className="line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tempo médio para achar a nota por semana">
      <line className="chart__axis" x1={0} x2={W} y1={base} y2={base} />
      {pts.length > 1 && <polyline className="line__path" points={line} />}
      {pts.map((p) => (
        <g key={p.i}>
          <circle className="line__dot" cx={x(p.i)} cy={y(p.v)} r={4} />
          <rect className="bars__hit" x={p.i * slot} y={0} width={slot} height={base}>
            <title>{`Semana de ${shortDate.format(p.w.start)}: ${formatSeconds(p.v)}${p.w.firstTry != null ? `, ${formatPercent(p.w.firstTry)} de primeira` : ''}`}</title>
          </rect>
        </g>
      ))}
      <text className="chart__value" x={x(last.i)} y={y(last.v) - 9} textAnchor="middle">{formatSeconds(last.v)}</text>
      {weeks.map((w, i) => (
        <text key={w.start} className="chart__tick" x={x(i)} y={H - 6} textAnchor="middle">{dayMonth.format(w.start)}</text>
      ))}
    </svg>
  );
}
