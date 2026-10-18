// Um bloco de prática: a música, o trecho, o andamento, quantas passadas, como o acerto andou, a nota que mais
// errou e o tempo. Clicando, abre a curva, cada passada e o botão para refazer o mesmo trecho.

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { noteLabel } from '../music/notes';
import type { NoteError } from '../analysis/takeLog';
import { ChevronIcon, CheckIcon, CrossIcon, PlayIcon } from '../components/Icons';
import { FIRM, type Block, type BlockStats, type NoteSpot, type Pass } from './model';
import { clock, durText, handText, ordinal, pct, rangeText } from './format';

const OUTCOME_TEXT: Record<NoteError['outcome'], string> = {
  trocou: 'trocou',
  cedo: 'entrou cedo',
  tarde: 'entrou tarde',
  faltou: 'não tocou',
  hesitou: 'demorou para achar',
};

export function spotText(n: NoteSpot, totalPasses?: number): string {
  const what = n.outcome === 'trocou' && n.played ? `trocou por ${noteLabel(n.played)}` : OUTCOME_TEXT[n.outcome];
  const where = n.measure ? ` no compasso ${n.measure}` : '';
  const many = totalPasses ? `, em ${n.passes} de ${totalPasses} passadas` : `, em ${n.passes} ${n.passes === 1 ? 'passada' : 'passadas'}`;
  return `${noteLabel(n.midi)}${where}: ${what}${many}`;
}

export function timingText(s: BlockStats): string | null {
  const t = s.timing;
  if (t.mean === null) return null;
  const base = t.tendency === 'no tempo' ? `no tempo (média ${Math.abs(t.mean)} ms)` : `${t.tendency} ${Math.abs(t.mean)} ms em média`;
  return t.accelerated ? `${base}; acelerou em ${t.accelerated} de ${t.measured}` : base;
}

export function suggestionText(b: Block, s: BlockStats): string | null {
  const g = s.suggestion;
  if (!g) return null;
  if (g.kind === 'subir') return `Firme nas últimas 5 (${pct(s.recent ?? 0)}): dá para subir para ${g.bpm} BPM.`;
  if (g.kind === 'baixar') return `Abaixo de 60 % nas últimas 5: tente a ${g.bpm} BPM e volte a subir.`;
  if (g.kind === 'tocar junto') return 'No Estudar já sai sem erro: hora de tocar junto no tempo.';
  return b.mode === 'estudo' ? null : s.n < 5 ? null : `Continue a ${b.bpm} BPM até passar de 90 % em 5 seguidas.`;
}

function Curve({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 300;
  const H = 72;
  const x = (i: number) => (i / (values.length - 1)) * (W - 44) + 4;
  const y = (v: number) => H - 6 - v * (H - 14);
  return (
    <svg className="curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Acerto passada a passada: de ${pct(values[0])} a ${pct(values[values.length - 1])}`}>
      <line className="curve__guide" x1={0} x2={W} y1={y(FIRM)} y2={y(FIRM)} />
      <text className="chart__tick" x={W - 2} y={y(FIRM) - 4} textAnchor="end">85 %</text>
      <polyline className="curve__line" points={values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} />
      {values.map((v, i) => (
        <circle key={i} className={'curve__dot' + (v >= FIRM ? ' curve__dot-firm' : '')} cx={x(i)} cy={y(v)} r={values.length > 40 ? 1.8 : 3}>
          <title>{`${ordinal(i + 1)} passada: ${pct(v)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function passErrors(p: Pass): string {
  if (p.errors === null) return p.weak ? `mais fraco: ${rangeText(p.weak)}` : 'sem detalhe (registro antigo)';
  if (!p.errors.length) return 'sem erros';
  const first = p.errors.slice(0, 3).map((e) => `${noteLabel(e.midi)} c. ${e.measure} ${e.outcome === 'trocou' && e.played ? `→ ${noteLabel(e.played)}` : OUTCOME_TEXT[e.outcome]}`);
  return first.join(' · ') + (p.errors.length > 3 ? ` · +${p.errors.length - 3}` : '');
}

export default function BlockCard({ block, stats, route, showTitle = true, open: startOpen = false }: { block: Block; stats: BlockStats; route: string | null; showTitle?: boolean; open?: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(startOpen);
  const b = block;
  const s = stats;
  const meta = [rangeText(b), b.mode === 'estudo' ? 'Estudar (a partitura espera)' : `${b.bpm} BPM`, handText(b.hand)].filter(Boolean).join(' · ');
  const suggestion = suggestionText(b, s);
  const timing = timingText(s);

  return (
    <article className={'blockCard' + (open ? ' blockCard-open' : '')}>
      <button className="blockCard__head" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="blockCard__time">{clock(b.start)}</span>
        <span className="blockCard__main">
          {showTitle && <strong className="blockCard__title">{b.title}</strong>}
          <span className="blockCard__meta">{meta}</span>
          <span className="blockCard__line">
            {s.n ? `${s.n} ${s.n === 1 ? 'passada' : 'passadas'}` : 'nenhuma passada até o fim'}
            {s.n > 1 && s.first !== null && s.last !== null && ` · ${pct(s.first)} → ${pct(s.last)}`}
            {s.n === 1 && s.first !== null && ` · ${pct(s.first)}`}
            {s.stableAt && ` · firme a partir da ${ordinal(s.stableAt)}`}
            {s.aborts > 0 && ` · parou no meio ${s.aborts}×`}
            {` · ${durText(s.durationMs)}`}
          </span>
          {s.notes[0] && <span className="blockCard__note">Mais errada: {spotText(s.notes[0], s.n)}</span>}
          {!s.notes[0] && s.weak && <span className="blockCard__note">Trecho mais fraco: {rangeText(s.weak)} (em {s.weak.count} de {s.n})</span>}
        </span>
        <ChevronIcon className="blockCard__chevron" />
      </button>

      {open && (
        <div className="blockCard__body">
          <Curve values={s.curve} />
          <dl className="blockCard__facts">
            {s.best !== null && (
              <div>
                <dt>Melhor</dt>
                <dd>{pct(s.best)}{s.clean ? ` · ${s.clean} ${s.clean === 1 ? 'limpa' : 'limpas'}` : ''}{s.cleanStreak > 1 ? ` (${s.cleanStreak} seguidas)` : ''}</dd>
              </div>
            )}
            {timing && (
              <div>
                <dt>Tempo</dt>
                <dd>{timing}</dd>
              </div>
            )}
            {s.detailed && (
              <div>
                <dt>Erros</dt>
                <dd>
                  {(Object.entries(s.outcomes) as [NoteError['outcome'], number][])
                    .filter(([, n]) => n)
                    .map(([k, n]) => `${n} ${OUTCOME_TEXT[k]}`)
                    .join(' · ') || 'nenhum'}
                </dd>
              </div>
            )}
            {b.listens > 0 && (
              <div>
                <dt>Ouviu</dt>
                <dd>{b.listens} {b.listens === 1 ? 'vez' : 'vezes'} o trecho</dd>
              </div>
            )}
          </dl>
          {s.notes.length > 1 && (
            <ul className="blockCard__spots">
              {s.notes.map((n) => (
                <li key={`${n.measure}:${n.midi}`}>{spotText(n, s.n)}</li>
              ))}
            </ul>
          )}
          {suggestion && <p className="blockCard__suggest">{suggestion}</p>}
          <ol className="passList">
            {b.passes.map((p, i) => (
              <li key={p.id} className="passList__row">
                <span className="passList__n">{ordinal(i + 1)}</span>
                <span className="passList__time">{clock(p.at)}</span>
                <span className={'passList__acc' + (p.clean ? ' passList__acc-clean' : p.accuracy < 0.6 ? ' passList__acc-low' : '')}>
                  {p.clean ? <CheckIcon className="passList__icon" /> : p.accuracy < 0.6 ? <CrossIcon className="passList__icon" /> : null}
                  {pct(p.accuracy)}
                  {p.mode === 'estudo' && p.complete === false && ' (incompleta)'}
                </span>
                <span className="passList__err">{passErrors(p)}</span>
              </li>
            ))}
          </ol>
          {route && (
            <Link
              className="button button-secondary button-small blockCard__redo"
              to={route}
              state={{ background: location, from: b.from, to: b.to, bpm: b.mode === 'junto' ? (s.suggestion?.kind === 'subir' ? s.suggestion.bpm : b.bpm) : undefined, mode: b.mode === 'estudo' ? 'estudar' : 'junto' }}
            >
              <PlayIcon className="button__icon" />
              {s.suggestion?.kind === 'subir' ? `Tocar este trecho a ${s.suggestion.bpm} BPM` : 'Refazer este trecho'}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
