// No Hoje: o foco da semana, da análise com IA (só quando há análise pronta).

import { Link } from 'react-router-dom';
import { useWeeklyInsight } from './useWeeklyInsight';

export default function InsightFocus() {
  const s = useWeeklyInsight();
  // Com metas, o foco aparece junto delas (WeekGoals).
  if (s.status !== 'ready' || !s.insight.foco || s.insight.acoes.length) return null;
  return (
    <p className="insightFocus">
      <span className="insightFocus__label">Foco da semana</span>
      <span className="insightFocus__text">{s.insight.foco}</span>
      <Link className="insightFocus__link" to="/progresso">Ver a análise</Link>
    </p>
  );
}
