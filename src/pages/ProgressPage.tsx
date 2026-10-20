// Progresso: responde "estou melhorando, e onde eu travo?". Hoje é o "o que eu faço agora"; Estatísticas é o
// lugar de investigar (painel, dia a dia, cada música, constância).
// Uma coluna só, para ler de cima para baixo: 1 sua semana (IA), 2 metas da semana, 3 o que mudou,
// 4 onde você está, 5 o que treinar. Cada parte tem uma manchete e linhas com o número em destaque.
// Só entra o que você está estudando (src/stats/focus.ts): música aberta só para ver não conta.
// Os números vêm de src/stats/summary.ts e src/progress/skills.ts (puros e testados).

import type React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DAY } from '../db/stats';
import { noteLabel } from '../music/notes';
import { formatPercent } from '../format';
import { CheckIcon, CrossIcon } from '../components/Icons';
import { useWeeklyInsight } from '../insight/useWeeklyInsight';
import WeekGoals, { useWeekGoals } from '../insight/WeekGoals';
import { ALL_TRACKS, bestTechBpm, techRunId, techStatus } from '../course/track';
import ReviewSpots from '../progress/ReviewSpots';
import { bestByTreino, weakNotes } from '../progress/stats';
import { weakSpots } from '../progress/weakSpots';
import { earSummary, readingSummary, trend, weakReading } from '../progress/skills';
import { useStatsData } from '../stats/useStatsData';
import { findPatterns, progressChanges, skillChanges, songNow, type Change } from '../stats/summary';
import { FIRM } from '../stats/model';
import { handText, rangeText } from '../stats/format';

const seconds = (ms: number) => `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} s`;
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

function weekLabel(week: string) {
  const start = new Date(`${week}T12:00`);
  return `${dayMonth.format(start)} a ${dayMonth.format(new Date(start.getTime() + 6 * DAY))}`;
}

/** Uma parte da página: número, nome, manchete e o conteúdo. */
function Part({ n, name, headline, children, id }: { n: number; name: string; headline: React.ReactNode; children?: React.ReactNode; id: string }) {
  return (
    <section className="story__part" aria-labelledby={id}>
      <p className="story__eyebrow">
        <span className="story__n">{n}</span>
        {name}
      </p>
      <h2 className="story__headline" id={id}>{headline}</h2>
      {children}
    </section>
  );
}

/** Linha: rótulo à esquerda, o número em destaque, o detalhe embaixo, e uma ação opcional. */
function Row({ label, value, detail, trendNode, action }: { label: React.ReactNode; value: React.ReactNode; detail?: React.ReactNode; trendNode?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <li className="storyRow">
      <span className="storyRow__label">{label}</span>
      <span className="storyRow__main">
        <span className="storyRow__value">{value}</span>
        {detail && <span className="storyRow__detail">{detail}</span>}
        {trendNode}
      </span>
      {action && <span className="storyRow__action">{action}</span>}
    </li>
  );
}

/** "melhor" / "pior" com ícone e palavra (nunca só cor). */
function TrendTag({ t, text }: { t: 'melhor' | 'pior' | 'igual' | null; text: string }) {
  if (!t) return null;
  return (
    <span className={'storyRow__trend' + (t === 'melhor' ? ' storyRow__trend-up' : t === 'pior' ? ' storyRow__trend-down' : '')}>
      {t === 'melhor' && <CheckIcon className="storyRow__trendIcon" />}
      {t === 'pior' && <CrossIcon className="storyRow__trendIcon" />}
      {text}
    </span>
  );
}

function ChangeRows({ items }: { items: Change[] }) {
  return (
    <ul className="story__rows">
      {items.map((c) => (
        <li key={c.id} className={'storyChange storyChange-' + (c.dir === 'melhor' ? 'up' : 'down')}>
          {c.dir === 'melhor' ? <CheckIcon className="storyChange__icon" /> : <CrossIcon className="storyChange__icon" />}
          <span className="storyChange__word">{c.dir === 'melhor' ? 'Melhorou' : 'Piorou'}</span>
          <span className="storyChange__text">
            <strong>{c.sourceId ? <Link to={`/estatisticas?ver=musica&id=${encodeURIComponent(c.sourceId)}`}>{c.title}</Link> : c.title}</strong>
            <span>{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function WeekPart() {
  const s = useWeeklyInsight();
  if (s.status === 'loading') return <Part n={1} id="pg-semana" name="Sua semana" headline="Preparando a análise da semana passada…" />;
  if (s.status === 'error') return <Part n={1} id="pg-semana" name="Sua semana" headline="Análise indisponível agora"><p className="story__lead">{s.message}</p></Part>;
  if (s.status === 'skipped')
    return (
      <Part n={1} id="pg-semana" name={`Sua semana · ${weekLabel(s.week)}`} headline="Semana com pouco treino">
        <p className="story__lead">{s.minutes} min em {s.days} {s.days === 1 ? 'dia' : 'dias'}. A análise sai toda segunda quando a semana anterior tem pelo menos 60 minutos em 3 dias.</p>
      </Part>
    );
  const { insight } = s;
  return (
    <Part n={1} id="pg-semana" name={`Sua semana · ${weekLabel(s.week)}`} headline={insight.titulo}>
      <p className="story__lead">{insight.resumo}</p>
      {(insight.melhorou.length > 0 || insight.atencao.length > 0) && (
        <ul className="story__rows">
          {insight.melhorou.map((t) => (
            <li key={t} className="storyChange storyChange-up">
              <CheckIcon className="storyChange__icon" />
              <span className="storyChange__word">Melhorou</span>
              <span className="storyChange__text"><span>{t}</span></span>
            </li>
          ))}
          {insight.atencao.map((t) => (
            <li key={t} className="storyChange storyChange-down">
              <CrossIcon className="storyChange__icon" />
              <span className="storyChange__word">Atenção</span>
              <span className="storyChange__text"><span>{t}</span></span>
            </li>
          ))}
        </ul>
      )}
      <p className="story__note">Feita pela IA a partir dos números do app, só com o que você está estudando. "Dedo" é o do dedilhado sugerido.</p>
    </Part>
  );
}

function GoalsPart() {
  const w = useWeekGoals();
  if (!w) return null;
  const done = w.states.filter((g) => g.done).length;
  return (
    <Part n={2} id="pg-metas" name="Metas da semana" headline={done === w.states.length ? 'Todas as metas feitas' : `${done} de ${w.states.length} metas feitas`}>
      <p className="story__lead">Saem da análise. O app marca sozinho quando vê você conseguir; você também pode marcar.</p>
      <WeekGoals />
    </Part>
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
  const { runs } = stats;
  // Só o que é estudo: música aberta para ver como era fica de fora.
  const passes = stats.passes.filter((p) => stats.isStudied(p.sourceId));

  const weak = weakReading(extra.notes, weakNotes(extra.attempts), now);
  const best = bestByTreino(runs);
  const reading = readingSummary(runs, now);
  const ear = earSummary(runs, now);

  const changes = [...progressChanges(passes, now), ...skillChanges(runs, now, stats.titleOf)].sort((a, b) => b.weight - a.weight).slice(0, 6);
  const better = changes.filter((c) => c.dir === 'melhor').length;
  const worse = changes.length - better;

  const techItems = ALL_TRACKS.flatMap((t) => t.technique.map((item) => ({ item, unit: t.unit })));
  const techMeters = techItems
    .filter(({ item }) => best.has(techRunId(item)))
    .map(({ item, unit }) => ({ item, unit, best: bestTechBpm(item, runs), status: techStatus(item, runs), last: best.get(techRunId(item))!.last }));
  const onTarget = techMeters.filter((t) => t.status === 'no alvo').length;
  const climbing = techMeters.filter((t) => t.status !== 'no alvo').sort((a, b) => b.last - a.last);
  const stale = climbing.filter((t) => now - t.last > 7 * DAY);

  const songIds = [...new Set(passes.filter((p) => p.kind === 'musica').map((p) => p.sourceId))];
  const songs = songIds
    .map((id) => {
      const ps = passes.filter((p) => p.sourceId === id);
      const at = songNow(ps);
      if (!at) return null;
      const recent = ps.filter((p) => p.mode === 'junto' && p.at > now - 28 * DAY && p.from === at.from && p.to === at.to);
      const byBpm = new Map<number, number[]>();
      for (const p of recent) byBpm.set(p.bpm, [...(byBpm.get(p.bpm) ?? []), p.accuracy]);
      const firm = [...byBpm.entries()].filter(([, a]) => a.length >= 3 && a.reduce((x, y) => x + y, 0) / a.length >= FIRM).map(([b]) => b);
      const same = ps.filter((p) => p.mode === 'junto' && p.bpm === at.bpm && p.from === at.from && p.to === at.to);
      const prev = same.slice(0, -10);
      const prevMean = prev.length >= 3 ? prev.slice(-10).reduce((a, p) => a + p.accuracy, 0) / Math.min(10, prev.length) : null;
      return { id, title: ps[ps.length - 1].title, at, firm: firm.length ? Math.max(...firm) : null, prevMean, route: stats.routeOf(id) };
    })
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => b.at.last - a.at.last)
    .slice(0, 5);

  const patterns = findPatterns(passes.filter((p) => p.at > now - 14 * DAY)).slice(0, 3);
  const empty = runs.length === 0 && stats.passes.length === 0 && extra.attempts.length === 0 && extra.notes.length === 0;
  const spots = weakSpots(runs.filter((r) => stats.isStudied(r.treinoId))).length;
  const toTrain = patterns.length + weak.length + stale.length + spots;

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
        <div className="story">
          <WeekPart />
          <GoalsPart />

          <Part
            n={3}
            id="pg-mudou"
            name="O que mudou · últimos 7 dias contra as 3 semanas antes"
            headline={changes.length ? [better ? `${better} ${better === 1 ? 'coisa melhorou' : 'coisas melhoraram'}` : '', worse ? `${worse} ${worse === 1 ? 'piorou' : 'pioraram'}` : ''].filter(Boolean).join(', ') : 'Ainda sem comparação'}
          >
            {changes.length ? (
              <ChangeRows items={changes} />
            ) : (
              <p className="story__lead">Precisa de pelo menos 3 passadas do mesmo trecho e andamento nesta semana e nas anteriores, ou de leitura, ouvido e técnica nos dois períodos.</p>
            )}
          </Part>

          <Part n={4} id="pg-onde" name="Onde você está" headline="Cada habilidade, hoje">
            <ul className="story__rows">
              {songs.map((s) => (
                <Row
                  key={s.id}
                  label="Música"
                  value={<><Link to={`/estatisticas?ver=musica&id=${encodeURIComponent(s.id)}`}>{s.title}</Link> <span className="storyRow__num">{formatPercent(s.at.mean)}</span></>}
                  detail={`${[rangeText(s.at), `${s.at.bpm} BPM`, handText(s.at.hand)].filter(Boolean).join(' · ')} · últimas ${s.at.recent} ${s.at.recent === 1 ? 'passada' : 'passadas'}${s.firm ? ` · firme a ${s.firm} BPM` : ''}`}
                  trendNode={s.prevMean !== null ? <TrendTag t={trend(s.at.mean, s.prevMean)} text={`${trend(s.at.mean, s.prevMean)} que as 10 passadas antes (${formatPercent(s.prevMean)})`} /> : null}
                  action={s.route ? <Link className="page__link" to={s.route} state={{ background: location, from: s.at.from, to: s.at.to, bpm: s.at.bpm, mode: 'junto' }}>Continuar</Link> : null}
                />
              ))}
              <Row
                label="Leitura"
                value={reading.now ? <span className="storyRow__num">{seconds(reading.now.ms)} <small>por nota</small></span> : 'Sem leitura em 4 semanas'}
                detail={reading.now ? `Acerto de primeira ${formatPercent(reading.now.firstTry)} · ${reading.now.rounds} ${reading.now.rounds === 1 ? 'rodada' : 'rodadas'} em 4 semanas` : undefined}
                trendNode={reading.now && reading.before ? <TrendTag t={trend(reading.now.ms, reading.before.ms, true)} text={`${trend(reading.now.ms, reading.before.ms, true)} que nas 4 semanas antes (${seconds(reading.before.ms)})`} /> : null}
                action={<Link className="page__link" to="/treino/notas" state={{ background: location }}>Treinar</Link>}
              />
              <Row
                label="Técnica"
                value={techMeters.length ? <span className="storyRow__num">{onTarget} <small>de {techMeters.length} no andamento alvo</small></span> : 'Nenhum exercício ainda'}
                detail={climbing[0] ? `Subindo: ${climbing[0].item.title}, ${climbing[0].best ?? 0} de ${climbing[0].item.target} BPM` : undefined}
                action={<Link className="page__link" to="/treino">Treinar</Link>}
              />
              <Row
                label="Ouvido"
                value={ear.now ? <span className="storyRow__num">{ear.now} <small>notas na maior frase de ouvido</small></span> : 'Ainda sem medida'}
                trendNode={ear.now && ear.before ? <TrendTag t={trend(ear.now, ear.before)} text={`${trend(ear.now, ear.before)} que nas 4 semanas antes (${ear.before} notas)`} /> : null}
                action={<Link className="page__link" to="/treino/eco" state={{ background: location }}>Treinar</Link>}
              />
            </ul>
          </Part>

          <Part n={5} id="pg-treinar" name="O que treinar" headline={patterns.length || weak.length ? 'Onde você mais erra' : toTrain ? 'O que revisar' : 'Nada travando agora'}>
            {patterns.length > 0 && (
              <>
                <h3 className="story__sub">Erros que se repetem nas últimas 2 semanas</h3>
                <ul className="story__rows">
                  {patterns.map((p) => (
                    <Row key={p.id} label="Padrão" value={p.title} detail={p.detail} />
                  ))}
                </ul>
              </>
            )}
            <ReviewSpots mode="todos">
              <h3 className="story__sub">Trechos que voltam para revisão (1, 3, 7 e 14 dias)</h3>
            </ReviewSpots>
            {weak.length > 0 && (
              <>
                <h3 className="story__sub">Notas que você mais erra na leitura (30 dias)</h3>
                <ul className="story__rows">
                  <Row label="Leitura" value={weak.map((w) => noteLabel(w.midi)).join(', ')} detail={weak.map((w) => `${noteLabel(w.midi)} erra ${formatPercent(w.missRate)}`).join(' · ')} action={<Link className="page__link" to="/treino/notas" state={{ background: location }}>Treinar</Link>} />
                </ul>
              </>
            )}
            {stale.length > 0 && (
              <>
                <h3 className="story__sub">Técnica parada há mais de 7 dias</h3>
                <ul className="story__rows">
                  {stale.map((t) => (
                    <Row key={t.item.id} label="Técnica" value={t.item.title} detail={`unidade ${t.unit} · ${t.best ?? 0} de ${t.item.target} BPM`} action={<Link className="page__link" to="/treino">Treinar</Link>} />
                  ))}
                </ul>
              </>
            )}
            {!toTrain && <p className="story__lead">Quando um erro começar a se repetir, ele aparece aqui.</p>}
          </Part>
        </div>
      )}
    </>
  );
}
