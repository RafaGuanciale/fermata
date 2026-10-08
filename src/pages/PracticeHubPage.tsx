import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PhotoCard from '../components/PhotoCard';
import { ChevronIcon, PlayIcon } from '../components/Icons';
import { PHASES, READING_LEVELS, type Phase } from '../training/program';
import { currentPhase, currentReadingLevel, currentWarmupLevel, nextTreino, phaseState, warmupTarget, TREINO_STATUS_LABEL, type TreinoStatus } from '../training/progress';
import { useRuns } from '../training/runs';
import { getLatency } from '../training/clickTrack';
import type { TrainingRun } from '../db/db';

const BADGE: Record<TreinoStatus, string> = { novo: 'wish', andamento: 'learning', vencido: 'learned', dominado: 'repertoire' };

export default function PracticeHubPage() {
  const location = useLocation();
  const runs = useRuns();
  if (!runs) return null;

  const cur = currentPhase(runs);
  const warm = currentWarmupLevel(runs);
  const readingN = currentReadingLevel(runs);
  const next = nextTreino(cur);
  const latency = getLatency();
  const bg = { background: location };

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Fase {cur.phase.n} de {PHASES.length} · {cur.phase.title}</span>
        <h1 className="page__title">Treino</h1>
        <p className="page__lead">Todo dia: aquecimento, o próximo treino da fase e um trecho de leitura. Cerca de 15 minutos.</p>
      </header>

      <div className="hub__grid hub__grid-daily">
        <PhotoCard photo="practiceSong" size="wide" eyebrow={`Aquecimento · nível ${warm.n} · ${warmupTarget(warm, runs)} BPM`} title={warm.title} sizes="(max-width: 900px) 100vw, 50vw">
          <span className="photoCard__body">Dois exercícios curtos para soltar as mãos. Sobe de nível sozinho quando ficar fácil.</span>
          <span className="photoCard__actions">
            <Link className="button button-primary" to="/treino/aquecimento" state={bg}>
              <PlayIcon className="button__icon" />
              Aquecer
            </Link>
          </span>
        </PhotoCard>
        <PhotoCard photo="practiceLocate" size="wide" eyebrow={`Leitura à primeira vista · nível ${readingN}`} title={READING_LEVELS[readingN - 1].title} sizes="(max-width: 900px) 100vw, 50vw">
          <span className="photoCard__body">Um trecho novo a cada vez, tocado uma vez só, sem parar no erro.</span>
          <span className="photoCard__actions">
            <Link className="button button-primary" to="/treino/leitura" state={bg}>
              <PlayIcon className="button__icon" />
              Ler um trecho
            </Link>
          </span>
        </PhotoCard>
      </div>

      <section className="page__section" aria-label="Caminho">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Caminho</h2>
          {next && (
            <Link className="button button-secondary button-small" to={`/treino/t/${next.id}`} state={bg}>
              Próximo: {next.title}
            </Link>
          )}
        </div>
        <ol className="path">
          {PHASES.map((p) => (
            <PhaseRow key={p.n} phase={p} runs={runs} current={p.n === cur.phase.n} />
          ))}
        </ol>
      </section>

      <section className="page__section" aria-label="Treino livre">
        <h2 className="page__sectionTitle">Treino livre</h2>
        <div className="chips">
          <Link className="chip chip-large" to="/treino/sessao?modo=notas" state={bg}>Notas soltas de Dó a Sol</Link>
          <Link className="chip chip-large" to="/treino/sessao?modo=musica" state={bg}>Ode à Alegria, nota por nota</Link>
          <Link className="chip chip-large" to="/treino/calibrar" state={bg}>
            {latency === null ? 'Ajustar o atraso do piano' : `Atraso do piano: ${latency} ms`}
          </Link>
        </div>
      </section>
    </>
  );
}

function PhaseRow({ phase, runs, current }: { phase: Phase; runs: TrainingRun[]; current: boolean }) {
  const location = useLocation();
  const state = phaseState(phase, runs);
  const [open, setOpen] = useState(current);
  const total = phase.treinos.length;

  return (
    <li className={'path__phase' + (current ? ' path__phase-current' : '') + (state.complete ? ' path__phase-done' : '')}>
      <button className="path__head" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="path__num" aria-hidden>{state.complete ? '✓' : phase.n}</span>
        <span className="path__titles">
          <span className="path__title">{phase.title}</span>
          <span className="path__meta">
            {state.complete ? 'Concluída' : phase.ready ? `${state.passedCount} de ${total} treinos vencidos` : 'Chega numa próxima etapa do app'}
          </span>
        </span>
        <ChevronIcon className={'path__chevron' + (open ? ' path__chevron-open' : '')} />
      </button>
      {open && (
        <div className="path__body">
          <p className="path__goal">{phase.goal}</p>
          <ul className="path__treinos">
            {phase.treinos.map((t) => {
              const status = state.statuses[t.id];
              const content = (
                <>
                  <span className="path__treinoText">
                    <span className="path__treinoTitle">{t.title}</span>
                    <span className="path__treinoHow">{t.how}</span>
                  </span>
                  {phase.ready ? (
                    <span className={`statusBadge statusBadge-${BADGE[status]}`}>
                      <span className="statusBadge__glyph" aria-hidden>{status === 'dominado' ? '𝄐' : ''}</span>
                      {TREINO_STATUS_LABEL[status]}
                    </span>
                  ) : (
                    <span className="path__soon">Em breve</span>
                  )}
                </>
              );
              return (
                <li key={t.id}>
                  {phase.ready ? (
                    <Link className="path__treino" to={`/treino/t/${t.id}`} state={{ background: location }}>{content}</Link>
                  ) : (
                    <div className="path__treino path__treino-locked">{content}</div>
                  )}
                </li>
              );
            })}
            {phase.ready && (
              <li>
                {state.examUnlocked ? (
                  <Link className="path__treino path__exam" to={`/treino/prova/${phase.n}`} state={{ background: location }}>
                    <span className="path__treinoText">
                      <span className="path__treinoTitle">Prova da fase {phase.n}</span>
                      <span className="path__treinoHow">{state.examDays === 1 ? 'Passou uma vez. Confirme em outro dia.' : 'Sem ajudas: sem nomes e sem tecla acesa.'}</span>
                    </span>
                    <span className="path__go">{state.complete ? 'Concluída' : 'Fazer a prova'}</span>
                  </Link>
                ) : (
                  <div className="path__treino path__treino-locked path__exam">
                    <span className="path__treinoText">
                      <span className="path__treinoTitle">Prova da fase {phase.n}</span>
                      <span className="path__treinoHow">Libera quando todos os treinos acima estiverem vencidos.</span>
                    </span>
                    <span className="path__soon">Bloqueada</span>
                  </div>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </li>
  );
}
