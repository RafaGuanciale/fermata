// Uma lição do curso: aquecimento de revisão, objetivos, teoria com exemplos e prática guiada,
// checkpoint (portão de 85%), mini-projeto e ticket de saída. Tudo respondido no teclado.

import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LessonProgress } from '../db/db';
import PianoKeyboard from '../components/PianoKeyboard';
import { BackIcon, CheckIcon, PlayIcon } from '../components/Icons';
import { useRuns } from '../training/runs';
import { UNITS, findSong } from '../course';
import {
  LESSON_STATE_LABEL, afterCheckpoint, afterReview, canMaster, findLesson, lessonKey, lessonState, markDone, rowsById, unitUnlocked, warmupItems,
} from '../course/progress';
import type { Block, Exercise, Item } from '../course/types';
import { RichText, Verdict, pct } from '../course/ui/shared';
import ItemsRunner from '../course/ui/ItemsRunner';
import { CheckpointRunner, ExerciseRunner, drawItems } from '../course/ui/ExerciseRunner';
import { ExamplePlayer } from '../course/ui/OtherRunners';

export function useCourseRows() {
  const rows = useLiveQuery(() => db.lessons.where('id').startsWith('curso/').toArray(), []);
  return useMemo(() => (rows ? rowsById(rows) : undefined), [rows]);
}

const CALLOUT_LABEL = { erro: 'Erro comum', porque: 'Por que soa assim', dica: 'Dica', saude: 'Saúde' } as const;

export default function CourseLessonPage() {
  const { n = '', lessonId = '' } = useParams();
  const location = useLocation();
  const rows = useCourseRows();
  const runs = useRuns();
  const pos = findLesson(UNITS, Number(n), lessonId);
  const [warmKey, setWarmKey] = useState(0);
  const [checkpointMsg, setCheckpointMsg] = useState<string | null>(null);

  const key = pos ? lessonKey(pos.unit, pos.lesson) : '';
  const row = rows?.get(key);

  const save = useCallback(async (update: (r: LessonProgress | undefined) => LessonProgress) => {
    const current = await db.lessons.get(key);
    await db.lessons.put(update(current));
  }, [key]);

  const done = useCallback((blockId: string) => void save((r) => markDone(r, key, blockId, Date.now())), [save, key]);

  const warmup = useMemo(() => {
    if (!pos || !rows) return [];
    return warmupItems(UNITS, rows, pos, Math.random, Date.now());
    // Sorteia de novo só quando pedir outra rodada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lesson.id, rows === undefined, warmKey]);

  if (!pos) return <Navigate to="/estudo" replace />;
  if (!rows || !runs) return null;

  const { unit, lesson, lessonIndex } = pos;
  const unlocked = unitUnlocked(UNITS, pos.unitIndex, rows, runs);
  const state = lessonState(unit, lessonIndex, rows, unlocked);
  const locked = state === 'bloqueada';
  const isDone = (id: string) => !!row?.done?.includes(id);
  const nextLesson = unit.lessons[lessonIndex + 1];
  const mastering = canMaster(row, Date.now());

  const finishWarmup = (results: { ok: boolean }[]) => {
    // Conta acerto e erro na lição de origem de cada item (revisão espaçada).
    const bySource = new Map<string, { ok: boolean }[]>();
    warmup.forEach((w, i) => bySource.set(w.key, [...(bySource.get(w.key) ?? []), results[i] ?? { ok: false }]));
    void db.transaction('rw', db.lessons, async () => {
      for (const [k, rs] of bySource) {
        const r = await db.lessons.get(k);
        if (r) await db.lessons.put(afterReview(r, rs, Date.now()));
      }
    });
    done('aquecimento');
  };

  const finishCheckpoint = (score: number, passed: boolean) => {
    const before = row;
    void save((r) => afterCheckpoint(r, key, score, Date.now()));
    if (passed && !before?.passedAt) setCheckpointMsg('Lição concluída. Ela volta no aquecimento das próximas lições para não esquecer.');
    else if (passed && mastering) setCheckpointMsg('Selo de domínio: você passou de novo depois de uma semana.');
    else if (passed) setCheckpointMsg('Passou de novo. O selo de domínio libera 7 dias depois da conclusão.');
    else setCheckpointMsg(null);
  };

  const parts = [
    ...(warmup.length ? [{ id: 'aquecimento', label: 'Aquecimento', ok: isDone('aquecimento') }] : []),
    { id: 'teoria', label: 'Teoria e prática', ok: lesson.blocks.filter((b) => b.kind === 'exercise').every((b) => isDone((b as { id: string }).id)) },
    { id: 'checkpoint', label: 'Checkpoint', ok: !!row?.passedAt },
    ...(lesson.project ? [{ id: 'projeto', label: 'Mini-projeto', ok: isDone('projeto') }] : []),
    { id: 'saida', label: 'Ticket de saída', ok: isDone('saida') },
  ];

  return (
    <>
      <Link className="page__back" to={`/estudo/unidade/${unit.n}`}>
        <BackIcon className="page__backIcon" />
        Unidade {unit.n} · {unit.title}
      </Link>
      <header className="page__header">
        <span className="page__eyebrow">
          Lição {lesson.n} · {lessonIndex + 1} de {unit.lessons.length} na unidade · cerca de {lesson.minutes} min · {LESSON_STATE_LABEL[state]}
        </span>
        <h1 className="page__title">{lesson.title}</h1>
      </header>

      <nav className="courseParts" aria-label="Partes da lição">
        {parts.map((p) => (
          <a key={p.id} href={`#${p.id}`} className={'courseParts__item' + (p.ok ? ' courseParts__item-ok' : '')}>
            {p.ok && <CheckIcon className="courseParts__icon" />}
            {p.label}
          </a>
        ))}
      </nav>

      {locked && (
        <p className="courseBanner">
          Esta lição abre quando você concluir a anterior{unlocked ? '' : ' e a unidade anterior (lições e projeto final)'}. Dá para ler a teoria; os exercícios ficam travados.
        </p>
      )}

      <article className="lesson course">
        {warmup.length > 0 && (
          <section className="course__section" id="aquecimento">
            <h2 className="course__h2">Aquecimento de revisão</h2>
            <p className="lesson__p">Perguntas de lições anteriores, misturadas. Responder de memória é o que fixa: se errar, tudo bem, a pergunta volta mais vezes.</p>
            {!locked && (
              <ItemsRunner
                key={warmKey}
                makeItems={() => warmup.map((w) => w.item)}
                low={48}
                high={84}
                labels="off"
                hints={false}
                pass={{ accuracy: 0 }}
                startLabel="Começar o aquecimento"
                onFinish={(r) => finishWarmup(r.perItem)}
              />
            )}
            {isDone('aquecimento') && <button className="linkButton" type="button" onClick={() => setWarmKey(warmKey + 1)}>Outra rodada</button>}
          </section>
        )}

        <section className="course__section">
          <h2 className="course__h2">Ao fim desta lição você consegue</h2>
          <ul className="course__objectives">
            {lesson.objectives.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </section>

        <section className="course__section" id="teoria">
          {lesson.blocks.map((b, i) => (
            <BlockView key={i} block={b} locked={locked} isDone={isDone} onDone={done} background={location} />
          ))}
        </section>

        <section className="course__section course__gate" id="checkpoint">
          <h2 className="course__h2">Checkpoint</h2>
          <p className="lesson__p">
            As mesmas habilidades, sem dicas e com perguntas novas. Para concluir a lição: <strong>85% ou mais</strong> em todas as partes.
            {row?.checkpoint !== undefined && ` Sua melhor nota: ${pct(row.checkpoint)}.`}
            {mastering && ' Já passou uma semana: refaça para ganhar o selo de domínio.'}
          </p>
          {row?.passedAt && !mastering && <Verdict tone="hit">{row.masteredAt ? 'Lição dominada' : 'Lição concluída'}</Verdict>}
          <CheckpointRunner exercises={lesson.checkpoint} disabled={locked} onFinish={finishCheckpoint} />
          {checkpointMsg && <p className="runner__note">{checkpointMsg}</p>}
        </section>

        {lesson.project && (
          <section className="course__section" id="projeto">
            <h2 className="course__h2">Mini-projeto: {lesson.project.title}</h2>
            <RichText body={lesson.project.brief} />
            <ol className="lesson__list">
              {lesson.project.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            {lesson.project.exercise && !locked && (
              <ExerciseCard id="projeto-ex" exercise={lesson.project.exercise} isDone={isDone} onDone={done} />
            )}
            <div className="course__rubric">
              <p className="page__eyebrow">Confira antes de marcar</p>
              <ul className="lesson__list">
                {lesson.project.rubric.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
            <button className={'button ' + (isDone('projeto') ? 'button-secondary' : 'button-primary')} type="button" disabled={locked || isDone('projeto')} onClick={() => done('projeto')}>
              {isDone('projeto') ? 'Projeto feito' : 'Marcar projeto como feito'}
            </button>
          </section>
        )}

        <section className="course__section" id="saida">
          <h2 className="course__h2">Ticket de saída</h2>
          <ExitTicket items={lesson.exit} locked={locked} doneAlready={isDone('saida')} onDone={(tension) => { void save((r) => ({ ...markDone(r, key, 'saida', Date.now()), tension })); }} />
        </section>
      </article>

      <footer className="lesson__footer">
        {row?.passedAt && nextLesson ? (
          <Link className="button button-primary" to={`/estudo/unidade/${unit.n}/${nextLesson.id}`}>Próxima: {nextLesson.title}</Link>
        ) : row?.passedAt && !nextLesson ? (
          <Link className="button button-primary" to={`/estudo/unidade/${unit.n}`}>Ir para o projeto final da unidade</Link>
        ) : (
          <span className="page__link">A próxima lição abre quando você passar no checkpoint.</span>
        )}
      </footer>
    </>
  );
}

function ExerciseCard({ id, exercise, isDone, onDone }: { id: string; exercise: Exercise; isDone: (id: string) => boolean; onDone: (id: string) => void }) {
  const [last, setLast] = useState<{ accuracy: number; passed: boolean } | null>(null);
  const ok = isDone(id);
  return (
    <div className={'exerciseCard' + (ok ? ' exerciseCard-done' : '')}>
      <div className="exerciseCard__head">
        <h3 className="exerciseCard__title">{exercise.title}</h3>
        {ok && <span className="exerciseCard__badge"><CheckIcon className="courseParts__icon" /> Feito</span>}
      </div>
      <p className="exerciseCard__how">{exercise.how}</p>
      <ExerciseRunner
        ex={exercise}
        hints
        onFinish={(o) => {
          setLast(o);
          if (o.passed) onDone(id);
        }}
      />
      {last && !last.passed && <p className="runner__note">Ainda abaixo do mínimo. Repita: na prática guiada as dicas aparecem depois de cada erro.</p>}
    </div>
  );
}

function BlockView({ block, locked, isDone, onDone, background }: { block: Block; locked: boolean; isDone: (id: string) => boolean; onDone: (id: string) => void; background: unknown }) {
  switch (block.kind) {
    case 'text':
      return (
        <div className="course__text">
          {block.title && <h2 className="course__h2">{block.title}</h2>}
          <RichText body={block.body} />
        </div>
      );
    case 'callout':
      return (
        <aside className={`callout callout-${block.tone}`}>
          <p className="callout__label">{CALLOUT_LABEL[block.tone]}: {block.title}</p>
          <RichText body={block.body} />
        </aside>
      );
    case 'keys':
      return (
        <figure className="lesson__figure">
          <PianoKeyboard low={block.low} high={block.high} marks={Object.fromEntries((block.lit ?? []).map((m) => [m, 'lit']))} labels={block.labels} label={block.caption} size="small" />
          <figcaption className="lesson__caption">{block.caption}</figcaption>
        </figure>
      );
    case 'example':
      return (
        <div className="course__example">
          <h3 className="exerciseCard__title">Exemplo: {block.title}</h3>
          <ExamplePlayer block={block} />
        </div>
      );
    case 'exercise':
      return locked ? (
        <div className="exerciseCard exerciseCard-locked">
          <h3 className="exerciseCard__title">{block.exercise.title}</h3>
          <p className="exerciseCard__how">{block.exercise.how}</p>
        </div>
      ) : (
        <ExerciseCard id={block.id} exercise={block.exercise} isDone={isDone} onDone={onDone} />
      );
    case 'song': {
      const song = findSong(block.songId);
      if (!song) return null;
      return (
        <div className="exerciseCard">
          <h3 className="exerciseCard__title">{song.title}</h3>
          <p className="exerciseCard__how">{block.why}</p>
          <Link className="button button-secondary" to={`/curso/musica/${song.id}`} state={{ background }}>
            <PlayIcon className="button__icon" />
            Abrir no "Tocar a música"
          </Link>
        </div>
      );
    }
  }
}

function ExitTicket({ items, locked, doneAlready, onDone }: { items: ((r: () => number) => Item)[]; locked: boolean; doneAlready: boolean; onDone: (tension: boolean) => void }) {
  const [answered, setAnswered] = useState(false);
  const [tension, setTension] = useState<boolean | null>(null);
  if (locked) return <p className="lesson__p">Três perguntas rápidas e uma checagem do corpo, no fim da lição.</p>;
  return (
    <>
      <p className="lesson__p">Três perguntas de memória sobre esta lição e uma checagem do corpo. Leva dois minutos.</p>
      {items.length > 0 && !answered && (
        <ItemsRunner
          makeItems={() => drawItems((r) => items[Math.floor(r() * items.length)](r), 3)}
          low={48}
          high={84}
          labels="off"
          hints={false}
          pass={{ accuracy: 0 }}
          startLabel="Responder"
          onFinish={() => setAnswered(true)}
        />
      )}
      {(answered || items.length === 0 || doneAlready) && (
        <div className="exitCheck">
          <p className="runner__question">Sentiu dor ou tensão no punho, antebraço, ombro ou pescoço?</p>
          <div className="choiceRow">
            <button type="button" className={'choice__option' + (tension === false ? ' choice__option-active' : '')} onClick={() => setTension(false)}>Não</button>
            <button type="button" className={'choice__option' + (tension === true ? ' choice__option-active' : '')} onClick={() => setTension(true)}>Sim</button>
          </div>
          {tension && <p className="runner__note">Pare por hoje e não suba o andamento amanhã. Solte os ombros, deixe o punho na altura do teclado e o peso vir do braço, não dos dedos. Se a dor continuar, procure um fisioterapeuta.</p>}
          <button className="button button-secondary" type="button" disabled={tension === null} onClick={() => onDone(tension === true)}>
            {doneAlready ? 'Atualizar' : 'Fechar a lição de hoje'}
          </button>
        </div>
      )}
    </>
  );
}
