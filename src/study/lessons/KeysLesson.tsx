import { useState } from 'react';
import { FullKeyboard } from '../../components/KeyboardDock';
import { useNoteInput, useNoteOn } from '../../input/useNoteInput';
import { noteInfo } from '../../music/notes';

// Dós do teclado de 88 teclas: Dó1 (24) a Dó8 (108)
const ALL_CS = [24, 36, 48, 60, 72, 84, 96, 108];

export default function KeysLesson() {
  const { held } = useNoteInput();
  const [found, setFound] = useState<Set<number>>(new Set());
  const [last, setLast] = useState<number | null>(null);

  useNoteOn((m) => {
    setLast(m);
    if (noteInfo(m).letter === 0 && !noteInfo(m).sharp) setFound((f) => new Set(f).add(m));
  });

  const lit = new Set<number>([...ALL_CS, ...held]);

  return (
    <>
      <p className="lesson__p">
        As teclas pretas vêm em grupos de <strong>duas</strong> e de <strong>três</strong>, e esse desenho se repete por todo o piano. É ele que diz onde
        cada nota está, sem precisar contar.
      </p>
      <p className="lesson__p">
        O <strong>Dó</strong> é sempre a tecla branca logo à esquerda de um grupo de duas pretas. Daí para a direita vêm Ré, Mi, Fá, Sol, Lá e Si, e a
        sequência recomeça no próximo Dó. Esse trecho de Dó a Dó é uma <strong>oitava</strong>.
      </p>

      <figure className="lesson__figure">
        <div className="lesson__scroll">
          <FullKeyboard low={21} high={108} held={lit} />
        </div>
        <figcaption className="lesson__caption">Os oito Dós do seu piano de 88 teclas, acesos. O do meio, Dó4, é o Dó central.</figcaption>
      </figure>

      <section className="lesson__try">
        <h2 className="lesson__h2">Experimente</h2>
        <p className="lesson__p">Ache e toque todos os Dós no seu piano. Cada um que você achar fica marcado aqui.</p>
        <div className="chips">
          {ALL_CS.map((c) => (
            <span key={c} className={'chip' + (found.has(c) ? ' chip-active' : '')}>
              {noteInfo(c).sci}
            </span>
          ))}
        </div>
        <p className="lesson__result" aria-live="polite">
          {found.size === ALL_CS.length
            ? 'Todos os oito. Você já acha qualquer Dó de olhos fechados.'
            : last !== null
              ? `Você tocou ${noteInfo(last).name}, na oitava ${noteInfo(last).octave} (${noteInfo(last).sci}).`
              : 'Sem o piano conectado, use o teclado na parte de baixo da tela.'}
        </p>
      </section>
    </>
  );
}
