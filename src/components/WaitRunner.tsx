import { useMemo, useState } from 'react';
import { useNoteInput, useNoteOn } from '../input/useNoteInput';
import type { Midi } from '../music/notes';
import type { TimedSpec } from '../training/program';
import { useElementWidth } from '../hooks/useFullscreen';
import Staff, { type NoteState } from './Staff';
import PianoKeyboard, { type KeyMark } from './PianoKeyboard';

/** Modo estudar: sem metrônomo, a pauta espera a nota certa. Para ler e decorar o trecho antes do tempo. */
export default function WaitRunner({ spec, showNames, lightKeys }: { spec: TimedSpec; showNames: boolean; lightKeys: boolean }) {
  const { press, release } = useNoteInput();
  const [staffRef, staffWidth] = useElementWidth<HTMLDivElement>();
  const playable = useMemo(() => spec.notes.map((n, i) => ({ midi: n.midi, i })).filter((n): n is { midi: Midi; i: number } => n.midi !== null), [spec.notes]);
  const [pos, setPos] = useState(0);
  const [missed, setMissed] = useState<Set<number>>(() => new Set());
  const [wrongKey, setWrongKey] = useState<Midi | null>(null);
  const done = pos >= playable.length;

  useNoteOn((midi) => {
    if (done) return;
    const target = playable[pos];
    if (midi === target.midi) {
      setPos((p) => p + 1);
      setWrongKey(null);
    } else {
      setMissed((m) => new Set(m).add(target.i));
      setWrongKey(midi);
    }
  });

  const currentIndex = done ? spec.notes.length - 1 : playable[pos].i;
  const states: NoteState[] = spec.notes.map((_, i) => {
    if (i === currentIndex && !done) return 'current';
    const passed = done || i < currentIndex;
    if (!passed) return 'upcoming';
    return missed.has(i) ? 'late' : 'hit';
  });

  const marks: Partial<Record<number, KeyMark>> = {};
  if (lightKeys && !done) marks[playable[pos].midi] = 'lit';
  if (wrongKey !== null) marks[wrongKey] = 'miss';

  return (
    <div className="timed">
      <section className="session__staff timed__staff" ref={staffRef} aria-label="Pauta">
        <Staff
          notes={spec.notes.map((n) => n.midi)}
          states={states}
          current={currentIndex}
          showNames={showNames}
          width={staffWidth}
          clef={spec.clef}
          durations={spec.notes.map((n) => n.beats)}
          beatsPerBar={spec.beatsPerBar}
          label="Pauta"
        />
      </section>
      <div className="timed__controls">
        {done ? (
          <button className="button button-primary" type="button" onClick={() => { setPos(0); setMissed(new Set()); setWrongKey(null); }}>
            De novo
          </button>
        ) : null}
        <span className="timed__hint">
          {done
            ? missed.size ? `Terminou. ${missed.size} ${missed.size === 1 ? 'nota pediu' : 'notas pediram'} segunda tentativa.` : 'Terminou sem errar. Pode passar para o modo no tempo.'
            : 'Sem metrônomo: a pauta espera você achar cada nota.'}
        </span>
      </div>
      <div className="session__keyboard timed__keyboard">
        <PianoKeyboard low={spec.low} high={spec.high} marks={marks} showNames={showNames} showComputerKeys onPress={press} onRelease={release} label="Teclado" />
      </div>
    </div>
  );
}
