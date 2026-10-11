// Uma lição do curso: aquecimento de revisão, objetivos, teoria com exemplos e prática guiada,
// checkpoint (portão de 85%), mini-projeto e ticket de saída. Tudo respondido no teclado.

import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { BackIcon, CheckIcon, PlayIcon } from '../components/Icons';
import { LESSON_STATE_LABEL, markDone } from '../course/progress';
import { RichText, Verdict, pct } from '../course/ui/shared';
import ItemsRunner from '../course/ui/ItemsRunner';
import { CheckpointRunner } from '../course/ui/ExerciseRunner';
import { BlockView, ExerciseCard, ExitTicket } from '../course/ui/LessonParts';
import { useLesson } from '../course/useLesson';

export default function CourseLessonPage() {
  const { n = '', lessonId = '' } = useParams();
  const location = useLocation();
  const L = useLesson(n, lessonId);
  if (L.status === 'missing') return <Navigate to="/estudo" replace />;
  if (L.status === 'loading') return null;
  const { unit, lesson, lessonIndex, row, key, state, locked, unlocked, isDone, nextLesson, mastering, save, done, warmup, warmKey, finishWarmup, checkpointMsg } = L;
  const finishCheckpoint = (score: number, passed: boolean) => void L.finishCheckpoint(score, passed);
  const setWarmKey = () => L.rerollWarmup();

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

      <div className="lesson__focusCta">
        <Link className="button button-primary" to={`/curso/foco/${unit.n}/${lesson.id}`} state={{ background: location }}>
          <PlayIcon className="button__icon" />
          {row?.passedAt ? 'Rever em modo foco' : row?.done?.length ? 'Continuar em modo foco' : 'Começar em modo foco'}
        </Link>
        <span className="page__link">Um passo por vez, em tela cheia. Ou role a página para ver tudo.</span>
      </div>

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
            {isDone('aquecimento') && <button className="linkButton" type="button" onClick={setWarmKey}>Outra rodada</button>}
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
