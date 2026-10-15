// O conteúdo de cada parte do Treino de hoje. A página do Treino mostra numa lista; o modo foco, uma por tela.

import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { saveRun } from '../../training/runs';
import { bestTechBpm, techRunId, techStartBpm, type DayPart, type TechItem } from '../track';
import type { Exercise } from '../types';
import type { DayPlan } from '../useDayPlan';
import ItemsRunner from './ItemsRunner';
import NoteReadingTrainer from '../../reading/NoteReadingTrainer';
import { ExerciseRunner } from './ExerciseRunner';
import { Verdict } from './shared';

/** Uma frase sob o título de cada parte. */
export function partMeta(part: DayPart, plan: DayPlan): string {
  switch (part) {
    case 'aquecimento': return `${plan.track.warmup.length} exercícios curtos, devagar`;
    case 'notas': return '10 notas para reconhecer na pauta, no seu nível de leitura';
    case 'revisao': return `${plan.review.length} perguntas das lições já concluídas`;
    case 'tecnica': return plan.techToday.map((t) => t.title).join(' · ') || 'Toda a técnica da unidade está no alvo';
    case 'leitura': return plan.track.reading.how;
    case 'ouvido': return plan.track.ear.how;
  }
}

/** O corpo de uma parte. `techItem`: no modo foco, um item de técnica por tela. `onPartDone`: avisa quem quiser seguir sozinho. */
export function DayPartBody({ part, plan, techItem, onPartDone, inFocus = false }: {
  part: DayPart;
  plan: DayPlan;
  techItem?: TechItem;
  onPartDone?: () => void;
  inFocus?: boolean;
}) {
  const location = useLocation();
  const done = () => onPartDone?.();
  switch (part) {
    case 'aquecimento':
      return <Sequence exercises={plan.track.warmup} onDone={() => { plan.finishPart('aquecimento'); done(); }} />;
    case 'notas':
      return (
        <div className="dayPlan__stack">
          <NoteReadingTrainer compact count={10} onDone={(r) => { plan.finishPart('notas', r.firstTry / Math.max(1, r.total)); done(); }} />
          {!inFocus && <Link className="linkButton" to="/treino/notas" state={{ background: location }}>Abrir a leitura de notas completa (níveis e mapa)</Link>}
        </div>
      );
    case 'revisao':
      return (
        <>
          <p className="lesson__p">Perguntas das lições que você já concluiu, misturadas. O que você erra volta mais vezes.</p>
          <ItemsRunner
            key={plan.round}
            makeItems={() => plan.review.map((r) => r.item)}
            low={36}
            high={84}
            labels="off"
            hints={false}
            pass={{ accuracy: 0 }}
            startLabel="Começar a revisão"
            onFinish={(r) => { plan.finishReview(r.perItem); done(); }}
          />
          {plan.done.has('revisao') && <button className="linkButton" type="button" onClick={plan.nextRound}>Outra rodada</button>}
        </>
      );
    case 'tecnica': {
      const items = techItem ? [techItem] : plan.techToday;
      return (
        <div className="dayPlan__stack">
          {items.map((item) => (
            <TechCard key={item.id} item={item} startBpm={techStartBpm(item, plan.runs)} best={bestTechBpm(item, plan.runs)} onDone={done} />
          ))}
        </div>
      );
    }
    case 'leitura':
      return <Single exercise={plan.track.reading} onDone={(a) => { plan.finishPart('leitura', a); done(); }} />;
    case 'ouvido':
      return <Single exercise={plan.track.ear} onDone={(a) => { plan.finishPart('ouvido', a); done(); }} />;
  }
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
function TechCard({ item, startBpm, best, onDone }: { item: TechItem; startBpm: number; best: number | null; onDone?: () => void }) {
  const [from] = useState(startBpm);
  // Mesmo objeto entre renderizações: a passada em andamento não reinicia o relógio quando a página atualiza.
  const ex: Exercise = useMemo(() => ({
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
  }), [item, from]);
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
        onFinish={() => onDone?.()}
        onTake={(t) => void saveRun({ treinoId: techRunId(item), kind: 'timed', bpm: t.bpm, accuracy: t.accuracy, clean: t.ok })}
      />
    </div>
  );
}
