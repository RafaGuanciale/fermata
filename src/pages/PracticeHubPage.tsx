// Treino: a prática diária ligada ao curso. Aquecimento, revisão das lições, técnica com escada
// de andamento que continua de onde parou, leitura à primeira vista e ouvido, no nível da unidade atual.

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckIcon, ChevronIcon, PlayIcon } from '../components/Icons';
import { getLatency } from '../training/clickTrack';
import { PLAN, UNITS } from '../course';
import { unitUnlocked } from '../course/progress';
import { DAY_PART_LABEL, bestTechBpm, techStatus, type DayPart } from '../course/track';
import { DayPartBody, partMeta } from '../course/ui/DayParts';
import { Verdict } from '../course/ui/shared';
import { useDayPlan } from '../course/useDayPlan';

export default function PracticeHubPage() {
  const location = useLocation();
  const [chosenUnit, setChosenUnit] = useState<number | null>(null);
  const [open, setOpen] = useState<DayPart | null>(null);
  const plan = useDayPlan(chosenUnit);
  const { ready, runs, rows, next, courseUnit, unitN, title, track, parts, done, count } = plan;

  if (!ready || !rows) return null;

  const unlockedUnits = PLAN.filter((p) => {
    const i = UNITS.findIndex((u) => u.n === p.n);
    return p.n <= courseUnit || (i >= 0 && unitUnlocked(UNITS, i, rows, runs));
  }).map((p) => p.n);
  const latency = getLatency();

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Unidade {unitN} · {title}</span>
        <h1 className="page__title">Treino</h1>
        <p className="page__lead">Todo dia, cerca de 20 minutos, no nível da unidade em que você está no curso. A lição nova fica no Estudo; aqui é onde a mão e o ouvido fixam.</p>
        <div className="page__actions">
          <Link className="button button-primary" to={chosenUnit ? `/treino/foco?unidade=${chosenUnit}` : '/treino/foco'} state={{ background: location }}>
            <PlayIcon className="button__icon" />
            Treinar em tela de foco
          </Link>
        </div>
      </header>

      <section className="page__section">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Treino de hoje</h2>
          <span className="page__link page__num">{count} de {parts.length} partes feitas</span>
        </div>
        <div className="progressTrack" aria-hidden>
          <div className="progressTrack__fill" style={{ width: `${(count / parts.length) * 100}%` }} />
        </div>

        <ol className="dayPlan">
          {parts.map((part, i) => (
            <li key={part} className={'dayPlan__item' + (done.has(part) ? ' dayPlan__item-done' : '') + (open === part ? ' dayPlan__item-open' : '')}>
              <button className="dayPlan__head" type="button" onClick={() => setOpen(open === part ? null : part)} aria-expanded={open === part}>
                <span className="dayPlan__num" aria-hidden>{done.has(part) ? <CheckIcon className="dayPlan__check" /> : i + 1}</span>
                <span className="dayPlan__titles">
                  <span className="dayPlan__title">{DAY_PART_LABEL[part]}</span>
                  <span className="dayPlan__meta">{partMeta(part, plan)}</span>
                </span>
                <ChevronIcon className={'path__chevron' + (open === part ? ' path__chevron-open' : '')} />
              </button>
              {open === part && (
                <div className="dayPlan__body">
                  <DayPartBody part={part} plan={plan} />
                </div>
              )}
            </li>
          ))}
        </ol>
        {count === parts.length && <Verdict tone="hit">Treino de hoje completo. Amanhã a escada continua de onde você parou.</Verdict>}
      </section>

      <section className="page__section">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Técnica da unidade {unitN}</h2>
        </div>
        <p className="page__lead">Meta: {track.goal}</p>
        <ul className="techList">
          {track.technique.map((item) => {
            const best = bestTechBpm(item, runs);
            const status = techStatus(item, runs);
            const pct = best ? Math.min(100, ((best - item.from) / Math.max(1, item.target - item.from)) * 100) : 0;
            return (
              <li key={item.id} className="techList__item">
                <span className="techList__title">{item.title}</span>
                <span className={`courseState courseState-${status === 'no alvo' ? 'concluida' : status === 'subindo' ? 'andamento' : 'nova'}`}>{status === 'no alvo' ? 'No alvo' : status === 'subindo' ? 'Subindo' : 'Novo'}</span>
                <span className="techList__value">{best ? `${best} de ${item.target} BPM` : `começa em ${item.from} BPM, alvo ${item.target} BPM`}</span>
                <span className="progress__bar" role="img" aria-label={`${best ?? 0} de ${item.target} BPM`}>
                  <span className="progress__barFill" style={{ width: `${pct}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {unlockedUnits.length > 1 && (
        <section className="page__section">
          <h2 className="page__sectionTitle">Outras unidades</h2>
          <p className="page__lead">Trilhos das unidades que você já alcançou, para revisar a técnica de antes.</p>
          <div className="chips">
            {unlockedUnits.map((n) => (
              <button key={n} type="button" className={'chip' + (n === unitN ? ' chip-active' : '')} aria-pressed={n === unitN} onClick={() => { setChosenUnit(n === courseUnit ? null : n); setOpen(null); }}>
                Unidade {n}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="page__section" aria-label="Treino livre">
        <h2 className="page__sectionTitle">Treino livre</h2>
        <div className="chips">
          <Link className="chip chip-large" to="/tocar" state={{ background: location }}>Tocar livre e gravar</Link>
          <Link className="chip chip-large" to="/treino/notas" state={{ background: location }}>Leitura de notas na pauta</Link>
          <Link className="chip chip-large" to="/treino/eco" state={{ background: location }}>Ouvir e tocar de volta</Link>
          {next && <Link className="chip chip-large" to={`/estudo/unidade/${next.unit.n}/${next.lesson.id}`}>Lição de hoje: {next.lesson.title}</Link>}
          <Link className="chip chip-large" to="/treino/calibrar" state={{ background: location }}>
            {latency === null ? 'Ajustar o atraso do piano' : `Atraso do piano: ${latency} ms`}
          </Link>
        </div>
      </section>
    </>
  );
}
