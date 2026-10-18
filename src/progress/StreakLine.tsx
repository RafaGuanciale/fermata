// Hoje: uma linha com a semana (minutos e dias contra a meta) e quantos dias seguidos você tocou.
// Nos marcos de sequência (3, 7, 14, 30…) ganha destaque e uma faísca, uma vez. O detalhe fica no Progresso.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DAY } from '../db/stats';
import { FlameIcon } from '../components/Icons';
import { Burst, celebratedOnce } from '../celebrate/Celebrate';
import { streakMilestone } from '../celebrate/rewards';
import { dayKey } from '../training/progress';
import { minutesByDay, streak } from './stats';
import { getGoal, goalProgress } from './goals';
import { Link } from 'react-router-dom';

export default function StreakLine() {
  const now = Date.now();
  const byDay = useLiveQuery(async () => {
    const [practice, sessions] = await Promise.all([db.practice.toArray(), db.sessions.where('startedAt').above(Date.now() - 400 * DAY).toArray()]);
    return minutesByDay(practice, sessions);
  }, []);
  const days = byDay ? streak(byDay, now) : 0;
  const today = byDay ? (byDay.get(dayKey(now)) ?? 0) > 0 : false;
  const milestone = today ? streakMilestone(days) : null;
  const [spark, setSpark] = useState(false);
  useEffect(() => {
    if (milestone && celebratedOnce(`dias-${milestone}-${dayKey(Date.now())}`)) setSpark(true);
  }, [milestone]);

  if (!byDay) return null;
  const goal = getGoal();
  const week = goalProgress(byDay, now, goal);
  return (
    <p className={'streakLine' + (milestone ? ' streakLine-milestone' : '')} role="status">
      {spark && <Burst />}
      <FlameIcon className="streakLine__icon" />
      <span>
        Semana: <strong>{week.minutes} de {goal.minutes} min</strong>, {week.days} de {goal.days} {goal.days === 1 ? 'dia' : 'dias'}
        {week.met ? ' (meta cumprida)' : ''}
        {days >= 2 && (
          <>
            {' · '}
            <strong>{days} dias seguidos</strong>
            {milestone ? ', marco atingido!' : today ? '' : ', toque hoje para manter'}
          </>
        )}
        {' · '}
        <Link className="streakLine__link" to="/progresso">Ver progresso</Link>
      </span>
    </p>
  );
}
