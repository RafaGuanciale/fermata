// Metas da semana (as ações da análise com IA) como lista que se marca sozinha quando você consegue.
// No Progresso, completa; no Hoje (`compact`), só o título e a marca.

import { Link, useLocation } from 'react-router-dom';
import { CheckIcon } from '../components/Icons';
import { logEvent } from '../analysis/activity';
import { useStatsData } from '../stats/useStatsData';
import { useWeeklyInsight } from './useWeeklyInsight';
import { lastWeek } from './digest';
import { goalId, goalStates, type GoalState } from './goals';

export function useWeekGoals(): { states: GoalState[]; route: (alvo: string) => string; foco: string } | null {
  const s = useWeeklyInsight();
  const data = useStatsData();
  if (s.status !== 'ready' || !data || !s.insight.acoes.length) return null;
  const goals = s.insight.acoes.map((action, i) => ({ id: goalId(s.week, i), action }));
  // Vale o que você fez desde o fim da semana analisada (segunda 00:00).
  const since = lastWeek(Date.now()).end;
  const states = goalStates(goals, { since, passes: data.passes, runs: data.runs, events: data.events });
  const route = (alvo: string) => s.targets.find((t) => t.id === alvo)?.rota ?? '/treino';
  return { states, route, foco: s.insight.foco };
}

export function toggleGoal(g: GoalState) {
  void logEvent({ type: 'goal', sourceId: g.goal.id, accuracy: g.done ? 0 : 1 });
}

export default function WeekGoals({ compact = false }: { compact?: boolean }) {
  const location = useLocation();
  const w = useWeekGoals();
  if (!w) return null;
  const done = w.states.filter((g) => g.done).length;

  return (
    <section className={'goals' + (compact ? ' goals-compact' : '')} aria-label="Metas da semana">
      {compact && w.foco && (
        <p className="goals__focus">
          <span className="goals__label">Foco da semana</span> {w.foco}
        </p>
      )}
      {compact && (
        <p className="goals__head">
          <span className="goals__label">Metas da semana</span>
          <span className="goals__count">{done} de {w.states.length} feitas</span>
          <Link className="goals__more" to="/progresso">Ver no progresso</Link>
        </p>
      )}
      <ul className="goals__list">
        {w.states.map((g) => {
          const a = g.goal.action;
          const to = w.route(a.alvo);
          const state = to !== '/treino' ? { background: location, ...(a.compassos ? { from: a.compassos.de, to: a.compassos.ate } : {}), ...(a.criterio?.bpm ? { bpm: a.criterio.bpm, mode: 'junto' } : {}) } : undefined;
          return (
            <li key={g.goal.id} className={'goals__item' + (g.done ? ' goals__item-done' : '')}>
              <button className="goals__check" type="button" onClick={() => toggleGoal(g)} aria-pressed={g.done} aria-label={g.done ? `Desmarcar: ${a.titulo}` : `Marcar como feita: ${a.titulo}`}>
                {g.done && <CheckIcon className="goals__checkIcon" />}
              </button>
              <span className="goals__body">
                <span className="goals__title">{a.titulo}</span>
                {!compact && <span className="goals__how">{a.como}</span>}
                <span className="goals__meta">
                  {g.done ? (g.auto ? 'Feita: o app viu você conseguir' : 'Feita') : g.progress ?? `${a.minutos} min`}
                  {!g.done && (
                    <>
                      {' · '}
                      <Link to={to} state={state}>
                        Abrir{a.compassos ? ` nos compassos ${a.compassos.de} a ${a.compassos.ate}` : ''}
                      </Link>
                    </>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
