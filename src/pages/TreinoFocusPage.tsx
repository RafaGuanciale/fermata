// Treino de hoje em tela de foco: uma parte por tela (cada item de técnica na sua), barra de progresso no topo
// e a próxima parte entrando sozinha quando a atual termina. As mãos ficam no piano: tecla, pedal ou espaço começam.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckIcon, CloseIcon } from '../components/Icons';
import { HandsFreeAuto, isTypingTarget } from '../input/handsFree';
import { DAY_PART_LABEL, techRunId, type DayPart, type TechItem } from '../course/track';
import { DayPartBody, partMeta } from '../course/ui/DayParts';
import { useDayPlan } from '../course/useDayPlan';
import { Burst } from '../celebrate/Celebrate';
import { playReward } from '../celebrate/sound';

interface Step {
  part: DayPart;
  item?: TechItem;
}

const ADVANCE_MS = 2500;

export default function TreinoFocusPage({ onClose }: { onClose: () => void }) {
  const [params] = useSearchParams();
  const chosen = Number(params.get('unidade')) || null;
  const plan = useDayPlan(chosen);
  const steps: Step[] = useMemo(
    () => plan.parts.flatMap((part): Step[] => (part === 'tecnica' ? (plan.techToday.length ? plan.techToday.map((item) => ({ part, item })) : [{ part }]) : [{ part }])),
    [plan.parts, plan.techToday],
  );
  const [i, setI] = useState(0);
  const [advanceAt, setAdvanceAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const stepDone = (s: Step) =>
    s.item ? plan.runs.some((r) => r.day === plan.today && r.treinoId === techRunId(s.item!) && r.clean) : plan.done.has(s.part);

  const go = (k: number) => {
    setAdvanceAt(null);
    if (k >= steps.length) {
      setFinished(true);
      playReward('lesson');
      return;
    }
    setFinished(false);
    setI(Math.max(0, k));
    bodyRef.current?.scrollTo({ top: 0 });
  };
  const goRef = useRef(go);
  goRef.current = go;

  // A parte terminou: a próxima entra sozinha em alguns segundos (dá para ficar).
  useEffect(() => {
    if (advanceAt === null) return;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t >= advanceAt) {
        window.clearInterval(id);
        goRef.current(i + 1);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [advanceAt, i]);

  // Setas: parte anterior e seguinte.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'ArrowRight') goRef.current(i + 1);
      if (e.key === 'ArrowLeft' && i > 0) goRef.current(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i]);

  if (!plan.ready) return <div className="focus" />;
  const step = steps[i];
  const label = step ? (step.item ? `${DAY_PART_LABEL.tecnica}: ${step.item.title}` : DAY_PART_LABEL[step.part]) : '';
  const nextStep = steps[i + 1];
  const nextLabel = nextStep ? (nextStep.item ? nextStep.item.title : DAY_PART_LABEL[nextStep.part]) : 'fim do treino';

  return (
    <HandsFreeAuto.Provider value>
      <div className="focus treinoFocus">
        <header className="focus__top">
          <button className="focus__icon" type="button" onClick={onClose} aria-label="Fechar o treino">
            <CloseIcon className="focus__glyph" />
          </button>
          <span className="reading__title">Treino · unidade {plan.unitN}</span>
          <div className="focus__progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label={`Parte ${i + 1} de ${steps.length}`}>
            {steps.map((s, k) => (
              <button
                key={k}
                type="button"
                className={'focus__seg' + (k === i && !finished ? ' focus__seg-current' : '') + (stepDone(s) ? ' focus__seg-done' : '')}
                onClick={() => go(k)}
                aria-label={s.item ? s.item.title : DAY_PART_LABEL[s.part]}
              />
            ))}
          </div>
        </header>

        <div className="focus__body" ref={bodyRef}>
          {finished ? (
            <div className="focus__step treinoFocus__end">
              <Burst big />
              <h1 className="focus__title">Treino de hoje feito</h1>
              <p className="focus__lead">{plan.count} de {plan.parts.length} partes concluídas. Amanhã a escada de andamento continua de onde você parou.</p>
              <div className="runner__actions">
                <button className="button button-primary" type="button" onClick={onClose}>Fechar</button>
                <button className="button button-secondary" type="button" onClick={() => go(0)}>Voltar ao começo</button>
              </div>
            </div>
          ) : step ? (
            <div className="focus__step" key={i}>
              <div className="focus__head">
                <span className="page__eyebrow">{i + 1} de {steps.length}{stepDone(step) ? ' · feito hoje' : ''}</span>
                <h2 className="focus__h2">{label}</h2>
                {!step.item && <p className="focus__lead">{partMeta(step.part, plan)}</p>}
              </div>
              <DayPartBody
                part={step.part}
                plan={plan}
                techItem={step.item}
                inFocus
                onPartDone={() => setAdvanceAt(performance.now() + ADVANCE_MS)}
              />
              {advanceAt !== null && (
                <div className="timed__next" role="status">
                  <CheckIcon className="button__icon" />
                  <span className="timed__nextCount">Próxima: {nextLabel}, em {Math.max(1, Math.ceil((advanceAt - now) / 1000))} s</span>
                  <button className="linkButton" type="button" onClick={() => go(i + 1)}>Ir agora</button>
                  <button className="linkButton" type="button" onClick={() => setAdvanceAt(null)}>Ficar aqui</button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {!finished && (
          <footer className="focus__nav">
            <button className="button button-secondary" type="button" onClick={() => go(i - 1)} disabled={i === 0}>Voltar</button>
            <span className="focus__count">{i + 1} de {steps.length}</span>
            <button className="button button-primary" type="button" onClick={() => go(i + 1)}>
              {step && stepDone(step) && <CheckIcon className="button__icon" />}
              {i + 1 < steps.length ? 'Próxima parte' : 'Concluir'}
            </button>
          </footer>
        )}
      </div>
    </HandsFreeAuto.Provider>
  );
}
