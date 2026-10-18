// Progresso: responde "estou melhorando, e onde eu travo?". Hoje é o "o que eu faço agora"; Estatísticas é o
// lugar de investigar (painel, dia a dia, cada música, constância).
// Aqui: a análise da semana (IA), o que melhorou e o que piorou, a evolução por habilidade e o que pode melhorar.
// Os números vêm de src/stats/summary.ts e src/progress/skills.ts (puros e testados).

import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DAY } from '../db/stats';
import { noteLabel } from '../music/notes';
import { formatPercent } from '../format';
import { CheckIcon, CrossIcon } from '../components/Icons';
import WeeklyInsight from '../insight/WeeklyInsight';
import { ALL_TRACKS, bestTechBpm, techRunId, techStatus } from '../course/track';
import ReviewSpots from '../progress/ReviewSpots';
import { weakSpots } from '../progress/weakSpots';
import { bestByTreino, weakNotes } from '../progress/stats';
import { earSummary, readingSummary, trend, weakReading } from '../progress/skills';
import { useStatsData } from '../stats/useStatsData';
import { findPatterns, progressChanges, skillChanges, songNow, type Change } from '../stats/summary';
import { FIRM } from '../stats/model';
import { handText, rangeText } from '../stats/format';

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

function ChangeList({ items, dir }: { items: Change[]; dir: 'melhor' | 'pior' }) {
  return (
    <ul className="changes__list">
      {items.map((c) => (
        <li key={c.id} className={'changes__item changes__item-' + (dir === 'melhor' ? 'up' : 'down')}>
          {dir === 'melhor' ? <CheckIcon className="changes__icon" /> : <CrossIcon className="changes__icon" />}
          <span className="changes__text">
            <strong>{c.sourceId ? <Link to={`/estatisticas?ver=musica&id=${encodeURIComponent(c.sourceId)}`}>{c.title}</Link> : c.title}</strong>
            <span>{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ProgressPage() {
  const location = useLocation();
  const now = Date.now();
  const stats = useStatsData();
  const extra = useLiveQuery(async () => {
    const [attempts, notes] = await Promise.all([db.attempts.where('at').above(Date.now() - 30 * DAY).toArray(), db.notes.toArray()]);
    return { attempts, notes };
  }, []);

  if (!stats || !extra) return null;
  const { runs, passes } = stats;

  const weak = weakReading(extra.notes, weakNotes(extra.attempts), now);
  const best = bestByTreino(runs);
  const reading = readingSummary(runs, now);
  const ear = earSummary(runs, now);

  // O que mudou: últimos 7 dias contra os 21 antes.
  const changes = [...progressChanges(passes, now), ...skillChanges(runs, now, stats.titleOf)].sort((a, b) => b.weight - a.weight);
  const better = changes.filter((c) => c.dir === 'melhor').slice(0, 4);
  const worse = changes.filter((c) => c.dir === 'pior').slice(0, 4);

  // Técnica: quantos exercícios começados já estão no alvo, e os que estão subindo.
  const techItems = ALL_TRACKS.flatMap((t) => t.technique.map((item) => ({ item, unit: t.unit })));
  const techMeters = techItems
    .filter(({ item }) => best.has(techRunId(item)))
    .map(({ item, unit }) => ({ item, unit, best: bestTechBpm(item, runs), status: techStatus(item, runs), last: best.get(techRunId(item))!.last }));
  const onTarget = techMeters.filter((t) => t.status === 'no alvo').length;
  const climbing = techMeters.filter((t) => t.status !== 'no alvo').sort((a, b) => b.last - a.last);
  const stale = climbing.filter((t) => now - t.last > 7 * DAY);

  // Músicas: onde você está agora em cada uma (última configuração do Tocar junto) e o andamento firme.
  const songIds = [...new Set(passes.filter((p) => p.kind === 'musica').map((p) => p.sourceId))];
  const songs = songIds
    .map((id) => {
      const ps = passes.filter((p) => p.sourceId === id);
      const at = songNow(ps);
      if (!at) return null;
      const recent = ps.filter((p) => p.mode === 'junto' && p.at > now - 28 * DAY);
      const byBpm = new Map<number, number[]>();
      for (const p of recent) byBpm.set(p.bpm, [...(byBpm.get(p.bpm) ?? []), p.accuracy]);
      const firm = [...byBpm.entries()].filter(([, a]) => a.length >= 3 && a.reduce((x, y) => x + y, 0) / a.length >= FIRM).map(([b]) => b);
      const same = ps.filter((p) => p.mode === 'junto' && p.bpm === at.bpm && p.from === at.from && p.to === at.to);
      const prev = same.slice(0, -10);
      const prevMean = prev.length >= 3 ? prev.slice(-10).reduce((a, p) => a + p.accuracy, 0) / Math.min(10, prev.length) : null;
      return { id, title: ps[ps.length - 1].title, at, firm: firm.length ? Math.max(...firm) : null, prevMean, week: ps.filter((p) => p.at > now - 7 * DAY).length, route: stats.routeOf(id) };
    })
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => b.at.last - a.at.last)
    .slice(0, 6);

  const patterns = findPatterns(passes.filter((p) => p.at > now - 14 * DAY)).slice(0, 3);
  const songWeak = weakSpots(runs);
  const empty = runs.length === 0 && passes.length === 0 && extra.attempts.length === 0 && extra.notes.length === 0;

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Sua evolução</span>
        <h1 className="page__title">Progresso</h1>
        <Link className="page__link" to="/estatisticas">Ver as estatísticas: dia a dia, cada música e o calendário</Link>
      </header>

      {empty ? (
        <section className="progress__empty">
          <p>Ainda não há nada para mostrar. Toque um pouco no piano conectado, faça o treino do dia ou uma leitura: a partir daí esta página mostra o que melhorou, o que piorou e onde você trava.</p>
          <Link className="button button-primary" to="/treino">Ir para o treino</Link>
        </section>
      ) : (
        <div className="progress">
          <WeeklyInsight />

          <section className="page__section" aria-labelledby="pg-mudou">
            <h2 className="page__sectionTitle" id="pg-mudou">O que mudou</h2>
            <p className="page__lead">Últimos 7 dias comparados com as 3 semanas antes.</p>
            {better.length || worse.length ? (
              <div className="changes">
                <div className="progress__card">
                  <h3 className="progress__cardTitle">Melhorou</h3>
                  {better.length ? <ChangeList items={better} dir="melhor" /> : <p className="progress__muted">Nada subiu de forma clara nesta semana.</p>}
                </div>
                <div className="progress__card">
                  <h3 className="progress__cardTitle">Piorou</h3>
                  {worse.length ? <ChangeList items={worse} dir="pior" /> : <p className="progress__muted">Nada caiu. Bom sinal.</p>}
                </div>
              </div>
            ) : (
              <p className="progress__muted">Ainda não dá para comparar: precisa de pelo menos 3 passadas do mesmo trecho e andamento nesta semana e nas anteriores, ou leitura, ouvido e técnica nos dois períodos.</p>
            )}
          </section>

          <section className="page__section" aria-labelledby="pg-evol">
            <h2 className="page__sectionTitle" id="pg-evol">Evolução</h2>
            <p className="page__lead">Cada cartão responde uma pergunta.</p>
            <div className="skills">
              <article className="skill skill-wide">
                <h3 className="skill__name">Músicas</h3>
                <p className="skill__question">Onde você está em cada música?</p>
                {songs.length ? (
                  <ul className="skill__songs">
                    {songs.map((s) => (
                      <li key={s.id} className="skill__song">
                        <Link className="skill__songTitle" to={`/estatisticas?ver=musica&id=${encodeURIComponent(s.id)}`}>{s.title}</Link>
                        <span className="skill__songMeta">
                          Agora: {[rangeText(s.at), `${s.at.bpm} BPM`, handText(s.at.hand)].filter(Boolean).join(', ')} · {formatPercent(s.at.mean)} nas últimas {s.at.recent} {s.at.recent === 1 ? 'passada' : 'passadas'}
                          {s.firm ? ` · firme a ${s.firm} BPM` : ''}
                          {s.week ? ` · ${s.week} ${s.week === 1 ? 'passada' : 'passadas'} nesta semana` : ''}
                        </span>
                        {s.prevMean !== null && (
                          <span className={'skill__trend' + (s.at.mean - s.prevMean >= 0.03 ? ' skill__trend-up' : s.at.mean - s.prevMean <= -0.03 ? ' skill__trend-down' : '')}>
                            {s.at.mean - s.prevMean >= 0.03 && <CheckIcon className="skill__trendIcon" />}
                            {s.at.mean - s.prevMean <= -0.03 && <CrossIcon className="skill__trendIcon" />}
                            {s.at.mean - s.prevMean >= 0.03 ? 'melhor' : s.at.mean - s.prevMean <= -0.03 ? 'pior' : 'igual'} que nas 10 passadas antes no mesmo trecho e andamento ({formatPercent(s.prevMean)})
                          </span>
                        )}
                        {s.route && (
                          <Link className="page__link skill__play" to={s.route} state={{ background: location, from: s.at.from, to: s.at.to, bpm: s.at.bpm, mode: 'junto' }}>Continuar daqui</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="skill__empty">Toque uma música no "Tocar junto" para ver aqui onde você está nela.</p>
                )}
              </article>

              <article className="skill">
                <h3 className="skill__name">Leitura</h3>
                <p className="skill__question">Quanto tempo você leva para tocar a nota que aparece na pauta?</p>
                {reading.now ? (
                  <>
                    <p className="skill__value">{seconds(reading.now.ms)}</p>
                    <p className="skill__detail">Acerto de primeira: {formatPercent(reading.now.firstTry)} · {reading.now.rounds} {reading.now.rounds === 1 ? 'rodada' : 'rodadas'} em 4 semanas</p>
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
                        {climbing.slice(0, 3).map(({ item, unit, best: b }) => (
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
            </div>
          </section>

          <section className="page__section" aria-labelledby="pg-trava">
            <h2 className="page__sectionTitle" id="pg-trava">O que pode melhorar</h2>
            {patterns.length === 0 && weak.length === 0 && stale.length === 0 && songWeak.length === 0 ? (
              <p className="progress__muted">Nada travando agora. Quando um erro começar a se repetir, ele aparece aqui.</p>
            ) : (
              <div className="progress__stuck progress__stuck-auto">
                {patterns.length > 0 && (
                  <div className="progress__card">
                    <h3 className="progress__cardTitle">Erros que se repetem</h3>
                    <p className="progress__muted">Últimas 2 semanas, em todas as músicas e exercícios.</p>
                    <ul className="patterns">
                      {patterns.map((p) => (
                        <li key={p.id} className="patterns__item">
                          <strong>{p.title}</strong>
                          <span>{p.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
