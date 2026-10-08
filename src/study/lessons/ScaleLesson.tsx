import { useState } from 'react';
import PianoKeyboard, { type KeyMark } from '../../components/PianoKeyboard';
import { useNoteOn } from '../../input/useNoteInput';
import { MAJOR_STEPS, NOTE_LETTERS, majorScale } from '../../music/theory';
import type { Midi } from '../../music/notes';

export default function ScaleLesson() {
  const [rootLetter, setRoot] = useState(0);
  const [progress, setProgress] = useState(0);
  const [missed, setMissed] = useState<Midi | null>(null);
  const scale = majorScale(rootLetter);

  const pick = (i: number) => {
    setRoot(i);
    setProgress(0);
    setMissed(null);
  };

  // Tocar a escala subindo, a partir da fundamental mostrada. Errou: recomeça.
  useNoteOn((m) => {
    if (progress >= scale.midis.length) return;
    if (m === scale.midis[progress]) {
      setProgress((p) => p + 1);
      setMissed(null);
    } else {
      setProgress(m === scale.midis[0] ? 1 : 0);
      setMissed(m);
    }
  });

  const marks: Partial<Record<Midi, KeyMark>> = {};
  const labels: Partial<Record<Midi, string>> = {};
  scale.midis.forEach((m, i) => {
    marks[m] = 'lit';
    labels[m] = String(i + 1);
  });
  if (missed !== null) marks[missed] = 'miss';

  return (
    <>
      <p className="lesson__p">
        Toda escala maior segue a mesma fórmula de distâncias: <strong>tom, tom, semitom, tom, tom, tom, semitom</strong>. Semitom é a tecla vizinha (branca
        ou preta); tom são duas.
      </p>
      <p className="lesson__p">Em Dó, a fórmula cai só nas brancas. Em outros tons, ela pede teclas pretas, e é por isso que cada tom tem seus sustenidos ou bemóis.</p>

      <div className="lesson__control">
        <span className="page__eyebrow">Escala de</span>
        <div className="chips">
          {NOTE_LETTERS.map((l, i) => (
            <button key={l} type="button" className={'chip' + (rootLetter === i ? ' chip-active' : '')} aria-pressed={rootLetter === i} onClick={() => pick(i)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <figure className="lesson__figure lesson__figure-panel">
        <div className="scaleSteps" aria-label={`Escala de ${scale.names[0]} maior`}>
          {scale.names.map((n, i) => (
            <span key={i} className="scaleSteps__cell">
              <span className={'scaleSteps__note' + (i < progress ? ' scaleSteps__note-done' : '')}>{n}</span>
              {i < MAJOR_STEPS.length && <span className="scaleSteps__step">{MAJOR_STEPS[i] === 2 ? 'T' : 'S'}</span>}
            </span>
          ))}
        </div>
        <div className="lesson__scroll">
          <PianoKeyboard low={60} high={84} marks={marks} labels={labels} label={`Escala de ${scale.names[0]} maior no teclado`} />
        </div>
      </figure>

      <section className="lesson__try">
        <h2 className="lesson__h2">Experimente</h2>
        <p className="lesson__p">Toque a escala subindo, da tecla 1 até a 8.</p>
        <p className={'lesson__result' + (progress === scale.midis.length ? ' lesson__result-good' : '')} aria-live="polite">
          {progress === scale.midis.length
            ? `Escala de ${scale.names[0]} maior completa.`
            : missed !== null
              ? `Essa não era a próxima. Recomece pelo ${scale.names[0]}.`
              : `${progress} de 8 notas.`}
        </p>
      </section>
    </>
  );
}
