// Hoje: quantos dias seguidos você tocou. Nos marcos (3, 7, 14, 30…) ganha destaque e uma faísca, uma vez.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DAY } from '../db/stats';
import { FlameIcon } from '../components/Icons';
import { Burst, celebratedOnce } from '../celebrate/Celebrate';
import { streakMilestone } from '../celebrate/rewards';
import { dayKey } from '../training/progress';
import { minutesByDay, streak } from './stats';

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

  if (!byDay || days < 2) return null;
  return (
    <p className={'streakLine' + (milestone ? ' streakLine-milestone' : '')} role="status">
      {spark && <Burst />}
      <FlameIcon className="streakLine__icon" />
      <span>
        <strong>{days} dias seguidos</strong>
        {milestone ? ' · marco atingido!' : today ? ' · você já tocou hoje' : ' · toque hoje para manter'}
      </span>
    </p>
  );
}
