// Escolhe o executor certo para cada tipo de exercício, e o checkpoint (vários exercícios sem dica, em sequência).

import { useCallback, useMemo, useState } from 'react';
import type { Exercise, Item } from '../types';
import ItemsRunner from './ItemsRunner';
import TimedExercise from './TimedExercise';
import { CalibrateRunner, ChecklistRunner, DynamicsRunner, ImprovRunner, QuizRunner, type Outcome } from './OtherRunners';
import { Verdict, pct } from './shared';

const rng = () => Math.random();

/** Sorteia `count` itens evitando dois iguais seguidos. */
export function drawItems(gen: (r: () => number) => Item, count: number): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < count; i++) {
    let it = gen(rng);
    for (let k = 0; k < 6 && out.length && sameItem(it, out[out.length - 1]); k++) it = gen(rng);
    out.push(it);
  }
  return out;
}

const sameItem = (a: Item, b: Item) => a.prompt === b.prompt && a.symbol === b.symbol && JSON.stringify(a.steps) === JSON.stringify(b.steps);

export function ExerciseRunner({ ex, hints, onFinish }: { ex: Exercise; hints: boolean; onFinish: (o: Outcome) => void }) {
  switch (ex.kind) {
    case 'items':
      return (
        <ItemsRunner
          makeItems={() => drawItems(ex.gen, ex.count)}
          low={ex.low}
          high={ex.high}
          labels={hints ? ex.labels : 'off'}
          hints={hints}
          pass={ex.pass}
          onFinish={(r) => onFinish({ accuracy: r.accuracy, passed: r.passed })}
        />
      );
    case 'timed':
      return <TimedExercise ex={ex} hints={hints} rng={rng} onFinish={onFinish} />;
    case 'improv':
      return <ImprovRunner ex={ex} onFinish={onFinish} />;
    case 'dynamics':
      return <DynamicsRunner ex={ex} rng={rng} onFinish={onFinish} />;
    case 'calibrate':
      return <CalibrateRunner onFinish={onFinish} />;
    case 'checklist':
      return <ChecklistRunner items={ex.items} onFinish={onFinish} />;
    case 'quiz':
      return <QuizRunner ex={ex} onFinish={onFinish} />;
  }
}

/** Checkpoint: os exercícios em sequência, sem dicas. Passa quando todos passam; a nota é a média. */
export function CheckpointRunner({ exercises, disabled, onFinish }: { exercises: Exercise[]; disabled?: boolean; onFinish: (score: number, passed: boolean) => void }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [run, setRun] = useState(0);

  const done = outcomes.length >= exercises.length;
  const score = outcomes.length ? outcomes.reduce((s, o) => s + o.accuracy, 0) / outcomes.length : 0;
  const passed = done && outcomes.every((o) => o.passed);

  const finishOne = useCallback((o: Outcome) => {
    if (outcomes.length > i) return;
    const all = [...outcomes, o];
    setOutcomes(all);
    if (all.length >= exercises.length) {
      const s = all.reduce((acc, x) => acc + x.accuracy, 0) / all.length;
      onFinish(s, all.every((x) => x.passed));
    }
  }, [outcomes, i, exercises.length, onFinish]);

  const ex = exercises[i];
  const key = useMemo(() => `${run}-${i}`, [run, i]);

  if (!started) {
    return (
      <div className="runner__start">
        <button className="button button-primary" type="button" disabled={disabled} onClick={() => setStarted(true)}>Começar o checkpoint</button>
      </div>
    );
  }
  if (done) {
    return (
      <div className="runner__summary">
        <Verdict tone={passed ? 'hit' : 'miss'}>{passed ? `Passou: ${pct(score)}` : `Ainda não: ${pct(score)}`}</Verdict>
        <ul className="checkpoint__list">
          {exercises.map((e, k) => (
            <li key={k} className={outcomes[k]?.passed ? 'checkpoint__ok' : 'checkpoint__bad'}>
              {e.title}: {pct(outcomes[k]?.accuracy ?? 0)} {outcomes[k]?.passed ? '' : '(abaixo do mínimo)'}
            </li>
          ))}
        </ul>
        {!passed && <p className="runner__note">Errar aqui é o treino funcionando. Volte à prática guiada do que ficou abaixo e tente de novo.</p>}
        <button className="button button-secondary" type="button" onClick={() => { setOutcomes([]); setI(0); setRun(run + 1); }}>Fazer de novo</button>
      </div>
    );
  }
  const finished = outcomes.length > i;
  return (
    <div className="checkpoint">
      <div className="runner__head">
        <span className="runner__count">Parte {i + 1} de {exercises.length}: {ex.title}</span>
      </div>
      <p className="runner__detail">{ex.how}</p>
      <ExerciseRunner key={key} ex={ex} hints={false} onFinish={finishOne} />
      {finished && i + 1 < exercises.length && (
        <div className="runner__actions">
          <button className="button button-primary" type="button" onClick={() => setI(i + 1)}>Próxima parte</button>
        </div>
      )}
    </div>
  );
}
