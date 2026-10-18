// Estatísticas: o lugar de investigar. Painel do período, o que você fez em cada dia (sessões e blocos de prática)
// e o raio-x de cada música. A escolha fica na URL (?ver=dia&dia=2026-10-18), então dá para linkar.
// Os números vêm de src/stats/model.ts e summary.ts (puros e testados).

import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import StatTile from '../components/StatTile';
import { BackIcon, ChevronIcon, PlayIcon } from '../components/Icons';
import WeeklyGoal from '../progress/WeeklyGoal';
import Heatmap from '../progress/Heatmap';
import { heatmap, minutesByDay, streak } from '../progress/stats';
import { dayKey } from '../training/progress';
import { AREA_LABEL, viewName, type Area } from '../analysis/areas';
import type { AppEvent, TrainingRun } from '../db/db';
import { useStatsData, type StatsData } from '../stats/useStatsData';
import { blockStats, buildBlocks, buildTimeline, DAY, type Pass, type Session } from '../stats/model';
import { bySource, findPatterns, songDetail, timeByArea, topNotesAcross } from '../stats/summary';
import BlockCard, { spotText, suggestionText } from '../stats/BlockCard';
import { clock, dayShort, dayTitle, durText, handText, minutesText, pct, rangeText } from '../stats/format';

type View = 'painel' | 'dia' | 'musica';
const PERIODS = [
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: 'tudo', label: 'Tudo', days: 100_000 },
] as const;


export default function StatsPage() {
  const [params, setParams] = useSearchParams();
  const data = useStatsData();
  const view = (params.get('ver') as View) || 'painel';
  const go = (next: Record<string, string>) => setParams(next, { replace: false });

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Tudo o que você tocou</span>
        <h1 className="page__title">Estatísticas</h1>
      </header>
      <div className="stats__tabs segmented" role="tablist" aria-label="Ver">
        {([
          ['painel', 'Painel'],
          ['dia', 'Dia a dia'],
          ['musica', 'Músicas'],
        ] as [View, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={'segmented__option' + (view === id ? ' segmented__option-active' : '')}
            onClick={() => go(id === 'painel' ? {} : id === 'dia' ? { ver: 'dia', dia: params.get('dia') ?? dayKey(Date.now()) } : { ver: 'musica', ...(params.get('id') ? { id: params.get('id')! } : {}) })}
          >
            {label}
          </button>
        ))}
      </div>
      {!data ? null : view === 'dia' ? (
        <DayView data={data} day={params.get('dia') ?? dayKey(Date.now())} onDay={(d) => go({ ver: 'dia', dia: d })} onSong={(id) => go({ ver: 'musica', id })} />
      ) : view === 'musica' ? (
        <SongView data={data} id={params.get('id')} onSong={(id) => go({ ver: 'musica', id })} onDay={(d) => go({ ver: 'dia', dia: d })} />
      ) : (
        <Dashboard data={data} period={params.get('periodo') ?? '7'} onPeriod={(p) => go(p === '7' ? {} : { periodo: p })} onDay={(d) => go({ ver: 'dia', dia: d })} onSong={(id) => go({ ver: 'musica', id })} />
      )}
    </>
  );
}

// ---------- painel ----------

function Dashboard({ data, period, onPeriod, onDay, onSong }: { data: StatsData; period: string; onPeriod: (p: string) => void; onDay: (d: string) => void; onSong: (id: string) => void }) {
  const now = Date.now();
  const days = PERIODS.find((p) => p.id === period)?.days ?? 7;
  const since = dayKey(now - (days - 1) * DAY);
  const inPeriod = (d: string) => d >= since;
  const byDay = useMemo(() => minutesByDay(data.practice, data.sessions), [data]);
  const passes = data.passes.filter((p) => inPeriod(p.day));
  const views = data.events.filter((e) => e.type === 'view' && inPeriod(e.day));
  const minutes = [...byDay.entries()].filter(([d]) => inPeriod(d)).reduce((a, [, m]) => a + m, 0);
  const activeDays = [...byDay.entries()].filter(([d, m]) => inPeriod(d) && m > 0).length;
  const j = passes.filter((p) => p.mode === 'junto');
  const mean = j.length ? j.reduce((a, p) => a + p.accuracy, 0) / j.length : null;
  const areas = timeByArea(views);
  const areaMax = Math.max(1, ...areas.map((a) => a.ms));
  const sources = bySource(passes);
  const spots = topNotesAcross(passes);
  const patterns = findPatterns(passes);
  const cells = heatmap(byDay, now, 16);
  const dayStreak = streak(byDay, now);

  return (
    <div className="stats">
      <div className="segmented stats__period" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" className={'segmented__option' + (period === p.id ? ' segmented__option-active' : '')} aria-pressed={period === p.id} onClick={() => onPeriod(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="stats__tiles">
        <StatTile label="Tempo no piano" value={minutesText(minutes)} delta={`${activeDays} ${activeDays === 1 ? 'dia' : 'dias'} com prática`} />
        <StatTile label="Passadas" value={String(passes.length)} delta={`${passes.filter((p) => p.clean).length} limpas`} />
        <StatTile label="Acerto médio" value={mean === null ? 'sem dado' : pct(mean)} delta={j.length ? `no Tocar junto, ${j.length} passadas` : undefined} />
        <StatTile label="Dias seguidos" value={String(dayStreak)} unit={dayStreak === 1 ? 'dia' : 'dias'} />
      </div>

      <section className="stats__card" aria-labelledby="st-cal">
        <h2 className="stats__cardTitle" id="st-cal">Calendário</h2>
        <p className="stats__hint">Clique num dia para ver tudo o que você fez nele.</p>
        <div className="stats__calendar">
          <WeeklyGoal />
          <Heatmap cols={cells} onPick={onDay} />
        </div>
      </section>

      <div className="stats__grid">
        <section className="stats__card" aria-labelledby="st-area">
          <h2 className="stats__cardTitle" id="st-area">Onde foi o tempo</h2>
          <p className="stats__hint">Só o tempo útil: tocando, ou lendo uma lição. Página aberta parada não conta.</p>
          {areas.length ? (
            <ul className="hbars">
              {areas.map((a) => (
                <li key={a.area} className="hbars__row">
                  <span className="hbars__label">{AREA_LABEL[a.area as Area] ?? a.area}</span>
                  <span className="hbars__track"><span className="hbars__fill" style={{ width: `${(a.ms / areaMax) * 100}%` }} /></span>
                  <span className="hbars__value">{durText(a.ms)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="stats__hint">O app passou a medir o tempo útil por área hoje. Depois da próxima prática, ele aparece aqui.</p>
          )}
        </section>

        <section className="stats__card" aria-labelledby="st-src">
          <h2 className="stats__cardTitle" id="st-src">Músicas e exercícios</h2>
          {sources.length ? (
            <ul className="stats__list">
              {sources.slice(0, 8).map((s) => (
                <li key={s.sourceId}>
                  <button className="stats__row" type="button" onClick={() => onSong(s.sourceId)}>
                    <span className="stats__rowTitle">{s.title}</span>
                    <span className="stats__rowMeta">{s.passes} {s.passes === 1 ? 'passada' : 'passadas'} · {pct(s.mean)} · agora {s.mode === 'estudo' ? 'no Estudar' : `a ${s.bpm} BPM`}</span>
                    <ChevronIcon className="stats__rowIcon" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="stats__hint">Nenhuma passada no período.</p>
          )}
        </section>

        <section className="stats__card" aria-labelledby="st-notes">
          <h2 className="stats__cardTitle" id="st-notes">Notas que você mais erra</h2>
          {spots.length ? (
            <ul className="stats__list">
              {spots.map((n) => (
                <li key={`${n.sourceId}:${n.measure}:${n.midi}`}>
                  <button className="stats__row" type="button" onClick={() => onSong(n.sourceId)}>
                    <span className="stats__rowTitle">{n.title}</span>
                    <span className="stats__rowMeta">{spotText(n)}</span>
                    <ChevronIcon className="stats__rowIcon" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="stats__hint">Aparece quando houver passadas com o registro nota a nota (a partir de hoje).</p>
          )}
        </section>

        <section className="stats__card" aria-labelledby="st-pat">
          <h2 className="stats__cardTitle" id="st-pat">Padrões que se repetem</h2>
          {patterns.length ? (
            <ul className="patterns">
              {patterns.map((p) => (
                <li key={p.id} className="patterns__item">
                  <strong>{p.title}</strong>
                  <span>{p.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="stats__hint">Nenhum padrão forte ainda. Com mais passadas nota a nota, o app procura erros que se repetem em várias músicas: tempo, dedo, tecla vizinha, aceleração.</p>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------- dia ----------

function runName(r: TrainingRun, titleOf: StatsData['titleOf']): { label: string; detail: string } | null {
  const acc = r.accuracy !== undefined ? pct(r.accuracy) : null;
  switch (r.kind) {
    case 'names':
    case 'locate':
      return { label: 'Leitura de notas', detail: [acc ? `${acc} de primeira` : null, r.avgMs ? `${(r.avgMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s por nota` : null].filter(Boolean).join(' · ') };
    case 'reading':
      return { label: 'Leitura à primeira vista', detail: acc ? `${acc} de acerto` : '' };
    case 'ear':
      return r.treinoId === 'eco' ? { label: 'Ouvir e tocar de volta', detail: `maior frase ${r.level ?? 0} notas${acc ? ` · ${acc} de primeira` : ''}` } : { label: 'Ouvido', detail: acc ? `${acc} de acerto` : '' };
    case 'warmup':
      return { label: 'Aquecimento', detail: acc ? `${acc} de acerto` : '' };
    case 'review':
      return { label: 'Revisão', detail: acc ? `${acc} de acerto` : '' };
    case 'exam':
      return { label: 'Prova', detail: r.passed ? 'aprovado' : acc ? `${acc} de acerto` : '' };
    case 'timed':
      if (r.treinoId.startsWith('arcade-')) return { label: `Arcade: ${titleOf(r.treinoId) ?? 'música'}`, detail: [acc ? `${acc} de acerto` : null, r.stars !== undefined ? `${r.stars} ${r.stars === 1 ? 'estrela' : 'estrelas'}` : null].filter(Boolean).join(' · ') };
      if (r.treinoId.startsWith('dia-')) return { label: 'Técnica do dia', detail: acc ? `${acc} de acerto` : '' };
      return null;
    default:
      return null;
  }
}

function viewLabel(v: AppEvent): string | null {
  const name = viewName(v.path ?? '');
  const subject = v.title ? ` (${v.title})` : '';
  const dur = v.dur ?? 0;
  const active = v.active ?? 0;
  if (v.area === 'livre' && v.notes) return `Tocou livre: ${v.notes} notas em ${durText(active || dur)} tocando`;
  if ((v.area === 'curso' || v.area === 'consulta') && active >= 30_000) return `${name}: ${durText(active)} lendo${v.notes ? `, ${v.notes} notas` : ''}`;
  if (['musicas', 'leitura', 'ouvido', 'tecnica', 'arcade', 'livre'].includes(v.area ?? '') && !v.notes && !active && dur >= 3000) return `Abriu ${name}${subject} e saiu sem tocar (ficou ${durText(dur)})`;
  return null;
}

function DayView({ data, day, onDay, onSong }: { data: StatsData; day: string; onDay: (d: string) => void; onSong: (id: string) => void }) {
  const today = dayKey(Date.now());
  const byDay = useMemo(() => minutesByDay(data.practice, data.sessions), [data]);
  const passes = data.passes.filter((p) => p.day === day);
  const events = data.events.filter((e) => e.day === day);
  const runs = data.runs.filter((r) => r.day === day);
  const blocks = buildBlocks(passes, events);
  const sessions: Session[] = buildTimeline(blocks, runs, events.filter((e) => e.type === 'view'), (r) => runName(r, data.titleOf), viewLabel);
  const minutes = byDay.get(day) ?? 0;
  const daysWithData = useMemo(() => {
    const s = new Set<string>();
    for (const [d, m] of byDay) if (m > 0) s.add(d);
    for (const p of data.passes) s.add(p.day);
    return [...s].sort();
  }, [byDay, data.passes]);
  const prev = [...daysWithData].reverse().find((d) => d < day);
  const next = daysWithData.find((d) => d > day && d <= today);

  return (
    <div className="stats">
      <div className="dayNav">
        <button className="pill pill-icon" type="button" onClick={() => prev && onDay(prev)} disabled={!prev} aria-label="Dia anterior com prática" title="Dia anterior com prática">
          <BackIcon className="pill__icon" />
        </button>
        <h2 className="dayNav__title">{dayTitle(day)}</h2>
        <button className="pill pill-icon dayNav__next" type="button" onClick={() => next && onDay(next)} disabled={!next} aria-label="Próximo dia com prática" title="Próximo dia com prática">
          <BackIcon className="pill__icon" />
        </button>
        <input className="dayNav__date" type="date" value={day} max={today} onChange={(e) => e.target.value && onDay(e.target.value)} aria-label="Escolher o dia" />
        {day !== today && (
          <button className="linkButton" type="button" onClick={() => onDay(today)}>Hoje</button>
        )}
      </div>

      <p className="dayNav__summary">
        {minutes ? `${minutesText(minutes)} no piano` : 'Sem minutos de piano registrados'}
        {sessions.length > 0 && ` · ${sessions.length} ${sessions.length === 1 ? 'sessão' : 'sessões'}`}
        {blocks.length > 0 && ` · ${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'} de prática`}
        {passes.length > 0 && ` · ${passes.length} ${passes.length === 1 ? 'passada' : 'passadas'}`}
      </p>

      {sessions.length === 0 ? (
        <p className="stats__hint">Nada registrado neste dia.</p>
      ) : (
        sessions.map((s, i) => (
          <section key={s.start} className="daySession" aria-label={`Sessão ${i + 1}`}>
            <h3 className="sessionHead">
              Sessão {i + 1} <span>{clock(s.start)}–{clock(s.end)} · {s.activeMs ? `${durText(s.activeMs)} de tempo útil` : durText(s.end - s.start)}{s.notes ? ` · ${s.notes} notas` : ''}</span>
            </h3>
            <div className="timeline">
              {s.items.map((it, k) =>
                it.type === 'block' ? (
                  <div key={k} className="timeline__item">
                    <BlockCard block={it.block} stats={blockStats(it.block)} route={data.routeOf(it.block.sourceId)} />
                    {it.block.kind === 'musica' && (
                      <button className="linkButton timeline__song" type="button" onClick={() => onSong(it.block.sourceId)}>Ver a música</button>
                    )}
                  </div>
                ) : (
                  <div key={k} className="timeline__item timeline__item-small">
                    <span className="timeline__time">{clock(it.at)}</span>
                    <span className="timeline__text">
                      <strong>{it.label}{it.type === 'activity' && it.count > 1 ? ` · ${it.count} rodadas` : ''}</strong>
                      {it.type === 'activity' && it.detail && <span> · {it.detail}{it.count > 1 ? ' (a última)' : ''}</span>}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

// ---------- música ----------

function SongView({ data, id, onSong, onDay }: { data: StatsData; id: string | null; onSong: (id: string) => void; onDay: (d: string) => void }) {
  const location = useLocation();
  const sources = bySource(data.passes).sort((a, b) => b.last - a.last);
  const current = id ?? sources[0]?.sourceId ?? null;
  const passes: Pass[] = current ? data.passes.filter((p) => p.sourceId === current) : [];
  const events = current ? data.events.filter((e) => e.sourceId === current) : [];
  const detail = songDetail(passes);
  const blocks = buildBlocks(passes, events).reverse();
  const lastBlock = blocks.find((b) => b.mode === 'junto');
  const lastStats = lastBlock ? blockStats(lastBlock) : null;
  const route = current ? data.routeOf(current) : null;
  const title = passes[passes.length - 1]?.title ?? '';

  if (!sources.length) return <p className="stats__hint">Toque uma música ou um exercício e ele aparece aqui.</p>;

  const heatMax = Math.max(1, ...detail.measures.map((m) => (detail.detailed ? (m.played ? m.errors / m.played : 0) : m.weak)));
  const now = detail.now;

  return (
    <div className="stats">
      <label className="songPick">
        <span className="songPick__label">Música ou exercício</span>
        <select className="songPick__select" value={current ?? ''} onChange={(e) => onSong(e.target.value)}>
          {sources.map((s) => (
            <option key={s.sourceId} value={s.sourceId}>{s.title}</option>
          ))}
        </select>
      </label>

      {now && (
        <section className="stats__card songNow" aria-labelledby="st-now">
          <h2 className="stats__cardTitle" id="st-now">Onde você está agora</h2>
          <p className="songNow__big">
            {pct(now.mean)} <span>nas últimas {now.recent} {now.recent === 1 ? 'passada' : 'passadas'}</span>
          </p>
          <p className="songNow__meta">{[rangeText(now), `${now.bpm} BPM`, handText(now.hand)].filter(Boolean).join(' · ')}</p>
          {lastBlock && lastStats && suggestionText(lastBlock, lastStats) && <p className="blockCard__suggest">{suggestionText(lastBlock, lastStats)}</p>}
          {route && (
            <Link className="button button-primary button-small" to={route} state={{ background: location, from: now.from, to: now.to, bpm: lastStats?.suggestion?.kind === 'subir' ? lastStats.suggestion.bpm : now.bpm, mode: 'junto' }}>
              <PlayIcon className="button__icon" />
              Tocar {title}
            </Link>
          )}
        </section>
      )}

      <div className="stats__grid">
        {detail.measures.length > 0 && (
          <section className="stats__card" aria-labelledby="st-heat">
            <h2 className="stats__cardTitle" id="st-heat">Mapa dos compassos</h2>
            <p className="stats__hint">{detail.detailed ? 'Quanto mais forte, mais erro por passada naquele compasso.' : 'Registro antigo: quanto mais forte, mais vezes foi o trecho mais fraco da passada.'}</p>
            <div className="measureMap">
              {detail.measures.map((m) => {
                const v = detail.detailed ? (m.played ? m.errors / m.played : 0) : m.weak;
                const level = v === 0 ? 0 : Math.min(4, Math.ceil((v / heatMax) * 4));
                const label = detail.detailed ? `compasso ${m.measure}: ${m.errors} erros em ${m.played} passadas` : `compasso ${m.measure}: o mais fraco em ${m.weak} passadas`;
                return (
                  <span key={m.measure} className={`measureMap__cell measureMap__cell-${level}`} title={label} aria-label={label}>
                    {m.measure}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {detail.byBpm.length > 0 && (
          <section className="stats__card" aria-labelledby="st-bpm">
            <h2 className="stats__cardTitle" id="st-bpm">Acerto por andamento</h2>
            <ul className="hbars">
              {detail.byBpm.map((b) => (
                <li key={b.bpm} className="hbars__row" title={`${b.passes} passadas, melhor ${pct(b.best)}`}>
                  <span className="hbars__label">{b.bpm} BPM</span>
                  <span className="hbars__track"><span className="hbars__fill" style={{ width: `${b.mean * 100}%` }} /></span>
                  <span className="hbars__value">{pct(b.mean)} · {b.passes}×</span>
                </li>
              ))}
            </ul>
            <p className="stats__hint">A barra é o acerto médio; o número depois é quantas passadas.</p>
          </section>
        )}

        {detail.notes.length > 0 && (
          <section className="stats__card" aria-labelledby="st-sn">
            <h2 className="stats__cardTitle" id="st-sn">Notas que mais erra</h2>
            <ul className="stats__plain">
              {detail.notes.map((n) => (
                <li key={`${n.measure}:${n.midi}`}>{spotText(n)}</li>
              ))}
            </ul>
          </section>
        )}

        {detail.days.length > 0 && (
          <section className="stats__card" aria-labelledby="st-days">
            <h2 className="stats__cardTitle" id="st-days">Dia a dia</h2>
            <ul className="stats__list">
              {[...detail.days].reverse().slice(0, 10).map((d) => (
                <li key={d.day}>
                  <button className="stats__row" type="button" onClick={() => onDay(d.day)}>
                    <span className="stats__rowTitle">{dayShort(d.day)}</span>
                    <span className="stats__rowMeta">{d.passes} {d.passes === 1 ? 'passada' : 'passadas'} · {pct(d.mean)} · mais a {d.bpm} BPM</span>
                    <ChevronIcon className="stats__rowIcon" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {detail.study.laps > 0 && (
          <section className="stats__card" aria-labelledby="st-study">
            <h2 className="stats__cardTitle" id="st-study">Modo Estudar</h2>
            <p className="stats__plain">
              {detail.study.laps} {detail.study.laps === 1 ? 'volta' : 'voltas'} · {pct(detail.study.mean ?? 0)} dos pontos sem tecla errada
              {detail.study.stepMs ? ` · ${(detail.study.stepMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s em média para achar cada nota` : ''}
            </p>
          </section>
        )}
      </div>

      <section className="page__section" aria-labelledby="st-blocks">
        <h2 className="page__sectionTitle" id="st-blocks">Blocos de prática</h2>
        <div className="timeline">
          {blocks.slice(0, 12).map((b, i, list) => (
            <div key={`${b.key}:${b.start}`} className="timeline__item">
              {(i === 0 || dayKey(list[i - 1].start) !== dayKey(b.start)) && <p className="timeline__day">{dayShort(dayKey(b.start))}</p>}
              <BlockCard block={b} stats={blockStats(b)} route={route} showTitle={false} />
            </div>
          ))}
        </div>
        {blocks.length > 12 && <p className="stats__hint">Mostrando os 12 blocos mais recentes de {blocks.length}. Use o Dia a dia para ver os outros.</p>}
      </section>
    </div>
  );
}
