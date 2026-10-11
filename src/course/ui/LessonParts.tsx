// Partes de uma lição, usadas na página da lição e no modo foco: blocos de teoria, cartão de exercício e ticket de saída.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import PianoKeyboard from '../../components/PianoKeyboard';
import { CheckIcon, PlayIcon } from '../../components/Icons';
import { findSong } from '..';
import type { Block, Exercise, Item } from '../types';
import { RichText } from './shared';
import ItemsRunner from './ItemsRunner';
import { ExerciseRunner, drawItems } from './ExerciseRunner';
import { ExamplePlayer } from './OtherRunners';

export const CALLOUT_LABEL = { erro: 'Erro comum', porque: 'Por que soa assim', dica: 'Dica', saude: 'Saúde' } as const;

export function ExerciseCard({ id, exercise, isDone, onDone }: { id: string; exercise: Exercise; isDone: (id: string) => boolean; onDone: (id: string) => void }) {
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

export function BlockView({ block, locked, isDone, onDone, background }: { block: Block; locked: boolean; isDone: (id: string) => boolean; onDone: (id: string) => void; background: unknown }) {
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

export function ExitTicket({ items, locked, doneAlready, onDone }: { items: ((r: () => number) => Item)[]; locked: boolean; doneAlready: boolean; onDone: (tension: boolean) => void }) {
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
