// Peças comuns das telas do curso: texto de teoria, feedback, tocar um "ouça", calibração de força.

import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { playNotes } from '../../audio/synth';
import { audioContext } from '../../training/clickTrack';
import { CheckIcon, CrossIcon, NoteIcon } from '../../components/Icons';
import type { VelocityCalibration } from '../judge';
import type { Listen } from '../types';

// ---------- texto ----------

/** **negrito** e *itálico* dentro de uma linha. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith('**') ? <strong key={k++}>{t.slice(2, -2)}</strong> : <em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Parágrafos separados por linha em branco; linhas começando com "- " viram lista, "1. " lista numerada. */
export function RichText({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split('\n').map((l) => l.trim());
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="lesson__list">
              {lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return (
            <ol key={i} className="lesson__list">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ''))}</li>)}
            </ol>
          );
        }
        return (
          <p key={i} className="lesson__p">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && ' '}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

// ---------- feedback ----------

export function Verdict({ tone, children, detail }: { tone: 'hit' | 'miss' | 'neutral'; children: ReactNode; detail?: ReactNode }) {
  const Icon = tone === 'hit' ? CheckIcon : tone === 'miss' ? CrossIcon : NoteIcon;
  return (
    <div className={`drillFeedback drillFeedback-${tone}`} role="status">
      <span className="drillFeedback__icon"><Icon className="drillFeedback__glyph" /></span>
      <span className="drillFeedback__text">{children}</span>
      {detail && <span className="drillFeedback__detail">{detail}</span>}
    </div>
  );
}

// ---------- som ----------

/** Toca um "ouça". Devolve a duração em ms e uma função para calar. */
export function playListen(listen: Listen): { ms: number; stop: () => void } {
  const ctx = audioContext();
  if (!ctx) return { ms: 0, stop: () => undefined };
  const beat = 60 / listen.bpm;
  let t = ctx.currentTime + 0.12;
  const notes: { midi: number; at: number; dur: number; velocity?: number }[] = [];
  for (const s of listen.steps) {
    for (const m of s.midis) notes.push({ midi: m, at: t, dur: s.beats * beat * 0.95, velocity: s.velocity });
    t += s.beats * beat;
  }
  const stop = playNotes(notes, 0.7);
  return { ms: (t - ctx.currentTime) * 1000, stop };
}

/** Para o som quando o componente sai da tela. */
export function useStopOnUnmount() {
  const ref = useRef<(() => void) | null>(null);
  useEffect(() => () => ref.current?.(), []);
  return ref;
}

// ---------- força ----------

const CAL_KEY = 'fermata-velocity';

/** Calibração de força do piano deste aparelho (cada piano digital tem uma curva diferente). */
export function getVelocityCal(): VelocityCalibration | null {
  try {
    const v = localStorage.getItem(CAL_KEY);
    return v ? (JSON.parse(v) as VelocityCalibration) : null;
  } catch {
    return null;
  }
}

export function setVelocityCal(cal: VelocityCalibration) {
  try {
    localStorage.setItem(CAL_KEY, JSON.stringify(cal));
  } catch {
    // sem armazenamento: calibra de novo na próxima visita
  }
}

export const LEVEL_LABEL = { p: 'piano (p), leve', mf: 'mezzo forte (mf), médio', f: 'forte (f)' } as const;

export const pct = (x: number) => `${Math.round(x * 100)}%`;
