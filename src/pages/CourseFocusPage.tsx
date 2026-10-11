// Modo foco da lição: um passo por tela, barra de progresso no topo, "Continuar" embaixo e uma tela de conclusão
// com comemoração. Abre num popup por cima da página da lição (ImmersiveFrame).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Navigate, useLocation, useNavigate, useParams, type Location } from 'react-router-dom';
import { db } from '../db/db';
import { DAY } from '../db/stats';
import { CheckIcon, CloseIcon, FlameIcon, NoteIcon, StarIcon } from '../components/Icons';
import type { ImmersiveState } from '../components/ImmersiveFrame';
import { focusSteps, resumeStep, type FocusStep } from '../course/focus';
import { markDone } from '../course/progress';
import { useLesson } from '../course/useLesson';
import type { Exercise } from '../course/types';
import { RichText, Verdict, pct } from '../course/ui/shared';
import ItemsRunner from '../course/ui/ItemsRunner';
import { CheckpointRunner, ExerciseRunner } from '../course/ui/ExerciseRunner';
import { BlockView, ExitTicket } from '../course/ui/LessonParts';
import { Burst } from '../celebrate/Celebrate';
import { starsFor, streakMilestone } from '../celebrate/rewards';
import { playReward, rewardSoundOn, setRewardSound } from '../celebrate/sound';
import { minutesByDay, streak } from '../progress/stats';
import { getGoal, goalProgress } from '../progress/goals';

const ACTION: FocusStep['kind'][] = ['warmup', 'exercise', 'checkpoint', 'project', 'exit'];

const passOf = (ex: Exercise) => ('pass' in ex && ex.pass && 'accuracy' in ex.pass ? ex.pass.accuracy : 0.85);

export default function CourseFocusPage({ onClose }: { onClose: () => void }) {
  const { n = '', lessonId = '' } = useParams();
  const L = useLesson(n, lessonId);
  if (L.status === 'missing') return <Navigate to="/estudo" replace />;
  if (L.status === 'loading') return <div className="focus" />;
  return <Focus key={`${n}/${lessonId}`} L={L} onClose={onClose} />;
}

type Ready = Extract<ReturnType<typeof useLesson>, { status: 'ready' }>;

function Focus({ L, onClose }: { L: Ready; onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const background = (location.state as ImmersiveState | null)?.background as Location | undefined;
  const { unit, lesson, lessonIndex, row, key, locked, isDone, done, save, warmup, nextLesson } = L;
  const steps = useMemo(() => focusSteps(lesson, warmup.length > 0), [lesson, warmup.length]);
  const [i, setI] = useState(() => resumeStep(steps, isDone, !!row?.passedAt));
  const [stars, setStars] = useState<Record<string, number>>({});
  const [sound, setSound] = useState(rewardSoundOn);
  const bodyRef = useRef<HTMLDivElement>(null);
  const step = steps[i];

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [i]);

  const go = (to: number) => setI(Math.max(0, Math.min(steps.length - 1, to)));
  const next = () => go(i + 1);

  const exerciseFinished = (id: string, ex: Exercise, o: { accuracy: number; passed: boolean }) => {
    if (!o.passed) return;
    done(id);
    setStars((s) => ({ ...s, [id]: Math.max(s[id] ?? 0, starsFor(o.accuracy, passOf(ex)) || 1) }));
  };

  const stepDone = (s: FocusStep): boolean => {
    switch (s.kind) {
      case 'warmup': return isDone('aquecimento');
      case 'exercise': return isDone(s.block.id);
      case 'checkpoint': return !!row?.passedAt;
      case 'project': return isDone('projeto');
      case 'exit': return isDone('saida');
      default: return true;
    }
  };
  const needsAction = ACTION.includes(step.kind);
  const ok = stepDone(step);

  return (
    <div className="focus">
      <header className="focus__top">
        <button className="focus__icon" type="button" onClick={onClose} aria-label="Fechar o modo foco">
          <CloseIcon className="focus__glyph" />
        </button>
        <div className="focus__progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label={`Passo ${i + 1} de ${steps.length}`}>
          {steps.map((s, k) => (
            <button
              key={k}
              type="button"
              className={'focus__seg' + (k === i ? ' focus__seg-current' : '') + ((ACTION.includes(s.kind) ? stepDone(s) : k < i) ? ' focus__seg-done' : '')}
              onClick={() => go(k)}
              aria-label={`Ir para o passo ${k + 1}`}
            />
          ))}
        </div>
        <button className={'focus__icon' + (sound ? '' : ' focus__icon-off')} type="button" onClick={() => { setRewardSound(!sound); setSound(!sound); }} aria-pressed={sound} aria-label={sound ? 'Desligar sons de comemoração' : 'Ligar sons de comemoração'} title={sound ? 'Sons de comemoração ligados' : 'Sons de comemoração desligados'}>
          <NoteIcon className="focus__glyph" />
        </button>
      </header>

      <div className="focus__body" ref={bodyRef}>
        <div className="focus__step" key={i}>
          {step.kind === 'warmup' && (
            <>
              <StepHead eyebrow="Aquecimento" title="Revisão do que você já aprendeu" />
              <p className="lesson__p">Perguntas de lições anteriores, misturadas. Responder de memória é o que fixa: se errar, tudo bem, a pergunta volta mais vezes.</p>
              {!locked && (
                <ItemsRunner key={L.warmKey} makeItems={() => warmup.map((w) => w.item)} low={48} high={84} labels="off" hints={false} pass={{ accuracy: 0 }} startLabel="Começar o aquecimento" onFinish={(r) => L.finishWarmup(r.perItem)} />
              )}
            </>
          )}

          {step.kind === 'intro' && (
            <div className="focus__intro">
              <span className="page__eyebrow">Unidade {unit.n} · lição {lessonIndex + 1} de {unit.lessons.length} · cerca de {lesson.minutes} min</span>
              <h1 className="focus__title">{lesson.title}</h1>
              <p className="focus__lead">Ao fim desta lição você consegue:</p>
              <ul className="focus__goals">
                {lesson.objectives.map((o) => (
                  <li key={o}><CheckIcon className="focus__goalIcon" />{o}</li>
                ))}
              </ul>
              {locked && <p className="courseBanner">Esta lição abre quando você concluir a anterior. Dá para ler; os exercícios ficam travados.</p>}
            </div>
          )}

          {step.kind === 'read' && step.blocks.map((b, k) => (
            <BlockView key={k} block={b} locked={locked} isDone={isDone} onDone={done} background={background ?? location} />
          ))}

          {step.kind === 'exercise' && (
            <>
              <StepHead eyebrow={isDone(step.block.id) ? 'Exercício · feito' : 'Exercício'} title={step.block.exercise.title} />
              <p className="exerciseCard__how">{step.block.exercise.how}</p>
              {locked ? (
                <p className="courseBanner">Exercício travado até você concluir a lição anterior.</p>
              ) : (
                <ExerciseRunner key={step.block.id} ex={step.block.exercise} hints onFinish={(o) => exerciseFinished(step.block.id, step.block.exercise, o)} />
              )}
            </>
          )}

          {step.kind === 'song' && <BlockView block={step.block} locked={locked} isDone={isDone} onDone={done} background={background ?? location} />}

          {step.kind === 'checkpoint' && (
            <>
              <StepHead eyebrow="Checkpoint" title="Mostre o que aprendeu" />
              <p className="lesson__p">
                As mesmas habilidades, sem dicas e com perguntas novas. Para concluir a lição: <strong>85% ou mais</strong> em todas as partes.
                {row?.checkpoint !== undefined && ` Sua melhor nota: ${pct(row.checkpoint)}.`}
              </p>
              {row?.passedAt && <Verdict tone="hit">{row.masteredAt ? 'Lição dominada' : 'Lição concluída'}</Verdict>}
              <CheckpointRunner
                exercises={lesson.checkpoint}
                disabled={locked}
                onFinish={(score, passed) => {
                  L.finishCheckpoint(score, passed);
                  if (passed) playReward('great');
                }}
              />
              {L.checkpointMsg && <p className="runner__note">{L.checkpointMsg}</p>}
            </>
          )}

          {step.kind === 'project' && lesson.project && (
            <>
              <StepHead eyebrow="Mini-projeto" title={lesson.project.title} />
              <RichText body={lesson.project.brief} />
              <ol className="lesson__list">
                {lesson.project.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              {lesson.project.exercise && !locked && (
                <ExerciseRunner ex={lesson.project.exercise} hints onFinish={(o) => exerciseFinished('projeto-ex', lesson.project!.exercise!, o)} />
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
            </>
          )}

          {step.kind === 'exit' && (
            <>
              <StepHead eyebrow="Ticket de saída" title="Fechando a lição" />
              <ExitTicket
                items={lesson.exit}
                locked={locked}
                doneAlready={isDone('saida')}
                onDone={(tension) => {
                  void save((r) => ({ ...markDone(r, key, 'saida', Date.now()), tension }));
                  next();
                }}
              />
            </>
          )}

          {step.kind === 'done' && (
            <Done
              passed={!!row?.passedAt}
              mastered={!!row?.masteredAt}
              stars={Object.values(stars).reduce((a, b) => a + b, 0)}
              lessonTitle={lesson.title}
              unitN={unit.n}
              lessonIndex={lessonIndex}
              lessonCount={unit.lessons.length}
              next={nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null}
              onCheckpoint={() => go(steps.findIndex((s) => s.kind === 'checkpoint'))}
              onNext={() => nextLesson && navigate(`/curso/foco/${unit.n}/${nextLesson.id}`, { replace: true, state: location.state })}
              onClose={onClose}
            />
          )}
        </div>
      </div>

      {step.kind !== 'done' && (
        <footer className="focus__nav">
          <button className="button button-secondary" type="button" onClick={() => go(i - 1)} disabled={i === 0}>Voltar</button>
          <span className="focus__count">{i + 1} de {steps.length}</span>
          {needsAction && !ok ? (
            <button className="button button-secondary" type="button" onClick={next}>Pular por agora</button>
          ) : (
            <button className="button button-primary" type="button" onClick={next}>
              {ok && needsAction && <CheckIcon className="button__icon" />}
              Continuar
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

function StepHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="focus__head">
      <span className="page__eyebrow">{eyebrow}</span>
      <h2 className="focus__h2">{title}</h2>
    </div>
  );
}

function Done({ passed, mastered, stars, lessonTitle, unitN, lessonIndex, lessonCount, next, onCheckpoint, onNext, onClose }: {
  passed: boolean; mastered: boolean; stars: number; lessonTitle: string; unitN: number; lessonIndex: number; lessonCount: number;
  next: { id: string; title: string } | null; onCheckpoint: () => void; onNext: () => void; onClose: () => void;
}) {
  const data = useLiveQuery(async () => {
    const [practice, sessions] = await Promise.all([db.practice.toArray(), db.sessions.where('startedAt').above(Date.now() - 400 * DAY).toArray()]);
    return minutesByDay(practice, sessions);
  }, []);
  const played = useRef(false);
  useEffect(() => {
    if (passed && !played.current) {
      played.current = true;
      playReward('lesson');
    }
  }, [passed]);

  if (!passed) {
    return (
      <div className="focusDone focusDone-pending">
        <h2 className="focus__title">Quase lá</h2>
        <p className="focus__lead">Falta passar no checkpoint para concluir “{lessonTitle}”. Ele abre a próxima lição.</p>
        <div className="focusDone__actions">
          <button className="button button-primary" type="button" onClick={onCheckpoint}>Ir para o checkpoint</button>
          <button className="button button-secondary" type="button" onClick={onClose}>Continuar depois</button>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const days = data ? streak(data, now) : 0;
  const milestone = streakMilestone(days);
  const goal = getGoal();
  const week = data ? goalProgress(data, now, goal) : null;

  return (
    <div className="focusDone">
      <div className="focusDone__hero">
        <Burst big />
        <span className="focusDone__badge"><CheckIcon className="focusDone__badgeIcon" /></span>
      </div>
      <span className="page__eyebrow">{mastered ? 'Lição dominada' : 'Lição concluída'}</span>
      <h2 className="focus__title">{lessonTitle}</h2>
      <ul className="focusDone__stats">
        {stars > 0 && (
          <li className="focusDone__stat">
            <StarIcon className="focusDone__icon focusDone__icon-star" />
            <span><strong>{stars}</strong> {stars === 1 ? 'estrela' : 'estrelas'} nesta sessão</span>
          </li>
        )}
        {days > 0 && (
          <li className={'focusDone__stat' + (milestone ? ' focusDone__stat-milestone' : '')}>
            <FlameIcon className="focusDone__icon" />
            <span><strong>{days}</strong> {days === 1 ? 'dia seguido' : 'dias seguidos'}{milestone ? ': marco atingido!' : ''}</span>
          </li>
        )}
        {week && (
          <li className="focusDone__stat">
            <NoteIcon className="focusDone__icon" />
            <span>{week.met ? 'Meta da semana cumprida' : <><strong>{week.minutes}</strong> de {goal.minutes} min na semana</>}</span>
          </li>
        )}
      </ul>
      <div className="focusDone__unit" aria-label={`Lição ${lessonIndex + 1} de ${lessonCount} da unidade ${unitN}`}>
        {Array.from({ length: lessonCount }, (_, k) => (
          <span key={k} className={'focusDone__dot' + (k <= lessonIndex ? ' focusDone__dot-on' : '') + (k === lessonIndex ? ' focusDone__dot-now' : '')} />
        ))}
        <span className="focusDone__unitText">Unidade {unitN}: {lessonIndex + 1} de {lessonCount} lições</span>
      </div>
      <div className="focusDone__actions">
        {next ? (
          <button className="button button-primary" type="button" onClick={onNext}>Próxima: {next.title}</button>
        ) : (
          <Link className="button button-primary" to={`/estudo/unidade/${unitN}`}>Ir para a música final da unidade</Link>
        )}
        <button className="button button-secondary" type="button" onClick={onClose}>Terminar por hoje</button>
      </div>
    </div>
  );
}
