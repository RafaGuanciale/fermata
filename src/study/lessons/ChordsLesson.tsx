import { useState } from 'react';
import PianoKeyboard, { type KeyMark } from '../../components/PianoKeyboard';
import { useNoteInput } from '../../input/useNoteInput';
import { NOTE_LETTERS, detectTriad, voiceTriad, type TriadQuality } from '../../music/theory';
import type { Midi } from '../../music/notes';

const INVERSIONS = ['Fundamental', '1ª inversão', '2ª inversão'] as const;

export default function ChordsLesson() {
  const [rootLetter, setRoot] = useState(0);
  const [quality, setQuality] = useState<TriadQuality>('major');
  const [inversion, setInversion] = useState<0 | 1 | 2>(0);
  const { held } = useNoteInput();

  const chord = voiceTriad({ rootLetter, quality, inversion });
  const marks: Partial<Record<Midi, KeyMark>> = {};
  const labels: Partial<Record<Midi, string>> = {};
  chord.midis.forEach((m, i) => {
    marks[m] = 'lit';
    labels[m] = chord.degrees[i];
  });
  held.forEach((m) => { if (!marks[m]) marks[m] = 'miss'; });

  const played = detectTriad(held);
  const correct = played?.name === chord.name;

  return (
    <>
      <p className="lesson__p">
        Uma <strong>tríade</strong> junta três notas: a <strong>fundamental</strong> (que dá o nome), a <strong>terça</strong> e a <strong>quinta</strong>. A
        diferença entre maior e menor está só na terça: na maior ela fica 4 semitons acima da fundamental; na menor, 3. A quinta fica 7 semitons acima nos dois casos.
      </p>

      <div className="lesson__controls">
        <div className="lesson__control">
          <span className="page__eyebrow">Fundamental</span>
          <div className="chips">
            {NOTE_LETTERS.map((l, i) => (
              <button key={l} type="button" className={'chip' + (rootLetter === i ? ' chip-active' : '')} aria-pressed={rootLetter === i} onClick={() => setRoot(i)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="lesson__control">
          <span className="page__eyebrow">Tipo</span>
          <div className="chips">
            {(['major', 'minor'] as const).map((q) => (
              <button key={q} type="button" className={'chip' + (quality === q ? ' chip-active' : '')} aria-pressed={quality === q} onClick={() => setQuality(q)}>
                {q === 'major' ? 'Maior' : 'Menor'}
              </button>
            ))}
          </div>
        </div>
        <div className="lesson__control">
          <span className="page__eyebrow">Posição</span>
          <div className="chips">
            {INVERSIONS.map((label, i) => (
              <button key={label} type="button" className={'chip' + (inversion === i ? ' chip-active' : '')} aria-pressed={inversion === i} onClick={() => setInversion(i as 0 | 1 | 2)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <figure className="lesson__figure lesson__figure-panel">
        <div className="lesson__chordHead">
          <h2 className="lesson__chordName">Acorde de {chord.name}</h2>
          <span className="lesson__chordNotes">
            {chord.noteNames.join(' · ')} <span className="lesson__chordDegrees">({chord.degrees.join(' · ')})</span>
          </span>
        </div>
        <div className="lesson__scroll">
          <PianoKeyboard low={60} high={83} marks={marks} labels={labels} label={`Teclado com ${chord.noteNames.join(', ')} acesas`} />
        </div>
        <figcaption className="lesson__caption">
          {inversion === 0
            ? 'Na posição fundamental, a nota mais grave é a fundamental.'
            : `Na ${INVERSIONS[inversion].toLowerCase()}, a nota mais grave é ${chord.noteNames[0]}. O acorde continua o mesmo; muda só a ordem.`}
        </figcaption>
      </figure>

      <section className="lesson__try">
        <h2 className="lesson__h2">Experimente</h2>
        <p className="lesson__p">Segure as três notas no piano, em qualquer oitava ou posição.</p>
        <p className={'lesson__result' + (correct ? ' lesson__result-good' : '')} aria-live="polite">
          {correct
            ? `Isso: ${chord.name}.`
            : played
              ? `Você está tocando ${played.name}. Procure ${chord.name}.`
              : held.size
                ? `${held.size} ${held.size === 1 ? 'nota' : 'notas'} segurada${held.size === 1 ? '' : 's'}. Faltam ${Math.max(0, 3 - held.size)}.`
                : 'Nenhuma nota ainda.'}
        </p>
      </section>
    </>
  );
}
