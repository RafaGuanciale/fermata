// Treino: a prática diária ligada ao curso. Aquecimento, revisão das lições, técnica com escada
// de andamento que continua de onde parou, leitura à primeira vista e ouvido, no nível da unidade atual.

import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../db/db';
import { CheckIcon, ChevronIcon } from '../components/Icons';
import { getLatency } from '../training/clickTrack';
import { saveRun, useRuns } from '../training/runs';
import { dayIndex, dayKey } from '../training/progress';
import { PLAN, UNITS } from '../course';
import { afterReview, isPassed, lessonKey, nextLesson, unitUnlocked, warmupItems } from '../course/progress';
import {
  DAY_PARTS, DAY_PART_LABEL, bestTechBpm, dayRunId, partsDone, techRunId, techStartBpm, techStatus, techniqueForDay, trackFor, trainingUnit,
  type DayPart, type TechItem,
} from '../course/track';
import type { Exercise } from '../course/types';
import ItemsRunner from '../course/ui/ItemsRunner';
import { ExerciseRunner } from '../course/ui/ExerciseRunner';
import { Verdict } from '../course/ui/shared';
import { useCourseRows } from './CourseLessonPage';

const KIND: Record<DayPart, 'warmup' | 'review' | 'timed' | 'reading' | 'ear'> = {
  aquecimento: 'warmup', revisao: 'review', tecnica: 'timed', leitura: 'reading', ouvido: 'ear',
};

export default function PracticeHubPage() {
  const location = useLocation();
  const runs = useRuns();
  const rows = useCourseRows();
  const [chosenUnit, setChosenUnit] = useState<number | null>(null);
  const [open, setOpen] = useState<DayPart | null>(null);
  const [round, setRound] = useState(0);
  const now = Date.now();
  const today = dayKey(now);

  const next = rows && runs ? nextLesson(UNITS, rows, runs) : null;
  const anyPassed = !!rows && [...rows.values()].some((r) => r.passedAt);
  const courseUnit = trainingUnit(next, UNITS[UNITS.length - 1]?.n ?? 1, anyPassed);
  const unitN = chosenUnit ?? courseUnit;
  const track = trackFor(unitN);

  const review = useMemo(() => {
    if (!rows || !next) return [];
    return warmupItems(UNITS, rows, next, Math.random, Date.now());
    // Sorteia de novo só quando pedir outra rodada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows === undefined, next?.lesson.id, round]);

  if (!runs || !rows) return null;

  const done = partsDone(runs, today);
  const parts = DAY_PARTS.filter((p) => p !== 'revisao' || review.length > 0);
  const count = parts.filter((p) => done.has(p)).length;
  const techToday = techniqueForDay(track, runs, dayIndex(now));
  const unlockedUnits = PLAN.filter((p) => {
    const i = UNITS.findIndex((u) => u.n === p.n);
    return p.n <= courseUnit || (i >= 0 && unitUnlocked(UNITS, i, rows, runs));
  }).map((p) => p.n);
  const latency = getLatency();
  const title = PLAN.find((p) => p.n === unitN)?.title ?? '';

  const finishPart = (part: DayPart, accuracy?: number) => {
    void saveRun({ treinoId: dayRunId(part), kind: KIND[part], accuracy, level: unitN });
  };

  const finishReview = (results: { ok: boolean }[]) => {
    const bySource = new Map<string, { ok: boolean }[]>();
    review.forEach((w, i) => bySource.set(w.key, [...(bySource.get(w.key) ?? []), results[i] ?? { ok: false }]));
    void db.transaction('rw', db.lessons, async () => {
      for (const [k, rs] of bySource) {
        const r = await db.lessons.get(k);
        if (r) await db.lessons.put(afterReview(r, rs, Date.now()));
      }
    });
    finishPart('revisao', results.filter((r) => r.ok).length / Math.max(1, results.length));
  };

  const partMeta = (part: DayPart): string => {
    switch (part) {
      case 'aquecimento': return `${track.warmup.length} exercícios curtos, devagar`;
      case 'revisao': return `${review.length} perguntas das lições já concluídas`;
      case 'tecnica': return techToday.map((t) => t.title).join(' · ') || 'Toda a técnica da unidade está no alvo';
      case 'leitura': return track.reading.how;
      case 'ouvido': return track.ear.how;
    }
  };

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Unidade {unitN} · {title}</span>
        <h1 className="page__title">Treino</h1>
        <p className="page__lead">Todo dia, cerca de 20 minutos, no nível da unidade em que você está no curso. A lição nova fica no Estudo; aqui é onde a mão e o ouvido fixam.</p>
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
                  <span className="dayPlan__meta">{partMeta(part)}</span>
                </span>
                <ChevronIcon className={'path__chevron' + (open === part ? ' path__chevron-open' : '')} />
              </button>
              {open === part && (
                <div className="dayPlan__body">
                  {part === 'aquecimento' && <Sequence exercises={track.warmup} onDone={() => finishPart('aquecimento')} />}
                  {part === 'revisao' && (
                    <>
                      <p className="lesson__p">Perguntas das lições que você já concluiu, misturadas. O que você erra volta mais vezes.</p>
                      <ItemsRunner
                        key={round}
                        makeItems={() => review.map((r) => r.item)}
                        low={36}
                        high={84}
                        labels="off"
                        hints={false}
                        pass={{ accuracy: 0 }}
                        startLabel="Começar a revisão"
                        onFinish={(r) => finishReview(r.perItem)}
                      />
                      {done.has('revisao') && <button className="linkButton" type="button" onClick={() => setRound(round + 1)}>Outra rodada</button>}
                    </>
                  )}
                  {part === 'tecnica' && (
                    <div className="dayPlan__stack">
                      {techToday.map((item) => <TechCard key={item.id} item={item} startBpm={techStartBpm(item, runs)} best={bestTechBpm(item, runs)} />)}
                    </div>
                  )}
                  {part === 'leitura' && <Single exercise={track.reading} onDone={(a) => finishPart('leitura', a)} />}
                  {part === 'ouvido' && <Single exercise={track.ear} onDone={(a) => finishPart('ouvido', a)} />}
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
          <Link className="chip chip-large" to="/treino/sessao?modo=notas" state={{ background: location }}>Ler notas soltas</Link>
          {next && <Link className="chip chip-large" to={`/estudo/unidade/${next.unit.n}/${next.lesson.id}`}>Lição de hoje: {next.lesson.title}</Link>}
          <Link className="chip chip-large" to="/treino/calibrar" state={{ background: location }}>
            {latency === null ? 'Ajustar o atraso do piano' : `Atraso do piano: ${latency} ms`}
          </Link>
        </div>
      </section>
    </>
  );
}

/** Exercícios em sequência; chama `onDone` quando o último termina. */
function Sequence({ exercises, onDone }: { exercises: Exercise[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(false);
  const ex = exercises[i];
  return (
    <div className="dayPlan__stack">
      <p className="runner__count">{exercises.length > 1 ? `Exercício ${i + 1} de ${exercises.length}: ${ex.title}` : ex.title}</p>
      <ExerciseRunner
        key={i}
        ex={ex}
        hints
        onFinish={() => {
          if (i + 1 < exercises.length) setI(i + 1);
          else if (!finished) {
            setFinished(true);
            onDone();
          }
        }}
      />
      {finished && <Verdict tone="hit">Aquecido. Pode seguir para a próxima parte.</Verdict>}
    </div>
  );
}

function Single({ exercise, onDone }: { exercise: Exercise; onDone: (accuracy: number) => void }) {
  const [last, setLast] = useState<{ accuracy: number; passed: boolean } | null>(null);
  return (
    <div className="dayPlan__stack">
      <ExerciseRunner
        ex={exercise}
        hints={false}
        onFinish={(o) => {
          setLast(o);
          onDone(o.accuracy);
        }}
      />
      {last && !last.passed && <p className="runner__note">Abaixo da meta, mas conta como feito: o importante é fazer todo dia.</p>}
    </div>
  );
}

/** Um item de técnica: escada que começa onde você parou e guarda cada passada. */
function TechCard({ item, startBpm, best }: { item: TechItem; startBpm: number; best: number | null }) {
  const [from] = useState(startBpm);
  const ex: Exercise = {
    kind: 'timed',
    title: item.title,
    how: item.how,
    gen: item.gen,
    reps: 2,
    window: 80,
    pass: { accuracy: 0.85 },
    evenness: item.evenness,
    articulation: item.articulation,
    ladder: { from, to: item.target, step: item.step },
  };
  return (
    <div className="exerciseCard">
      <div className="exerciseCard__head">
        <h3 className="exerciseCard__title">{item.title}</h3>
        <span className="page__link">{best ? `melhor: ${best} BPM` : 'primeira vez'} · alvo {item.target} BPM</span>
      </div>
      <p className="exerciseCard__how">{item.how}</p>
      <ExerciseRunner
        ex={ex}
        hints
        onFinish={() => undefined}
        onTake={(t) => void saveRun({ treinoId: techRunId(item), kind: 'timed', bpm: t.bpm, accuracy: t.accuracy, clean: t.ok })}
      />
    </div>
  );
}

/** Resumo do dia para a página Hoje. */
export function useTrainingToday() {
  const runs = useRuns();
  const rows = useCourseRows();
  if (!runs || !rows) return null;
  const next = nextLesson(UNITS, rows, runs);
  const anyPassed = [...rows.values()].some((r) => r.passedAt);
  const unit = trainingUnit(next, UNITS[UNITS.length - 1]?.n ?? 1, anyPassed);
  const done = partsDone(runs, dayKey(Date.now()));
  const hasReview = UNITS.some((u) => u.lessons.some((l) => isPassed(rows.get(lessonKey(u, l)))));
  const total = DAY_PARTS.length - (hasReview ? 0 : 1);
  return { next, unit, done: [...done].filter((p) => p !== 'revisao' || hasReview).length, total };
}
