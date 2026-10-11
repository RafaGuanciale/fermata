// Meta da semana (leve): minutos e dias tocados de segunda a domingo, com a meta ajustável ali mesmo.

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DAY } from '../db/stats';
import { minutesByDay } from './stats';
import { GOAL_DAYS, GOAL_MINUTES, getGoal, goalProgress, setGoal, type WeeklyGoal as Goal } from './goals';

export default function WeeklyGoal() {
  const [goal, setLocal] = useState<Goal>(getGoal);
  const [editing, setEditing] = useState(false);
  const byDay = useLiveQuery(async () => {
    const since = Date.now() - 8 * DAY;
    const [practice, sessions] = await Promise.all([db.practice.toArray(), db.sessions.where('startedAt').above(since).toArray()]);
    return minutesByDay(practice, sessions);
  }, []);
  if (!byDay) return null;

  const p = goalProgress(byDay, Date.now(), goal);
  const change = (g: Goal) => {
    setLocal(g);
    setGoal(g);
  };

  return (
    <div className="statTile weeklyGoal">
      <span className="statTile__label">Meta da semana</span>
      <span className="statTile__value">
        {p.minutes}
        <span className="statTile__unit"> de {goal.minutes} min</span>
      </span>
      <Meter value={p.minutes} max={goal.minutes} label="Minutos" />
      <Meter value={p.days} max={goal.days} label="Dias" />
      <span className={'statTile__delta' + (p.met ? ' statTile__delta-good' : '')}>
        {p.met ? 'Meta cumprida. O resto da semana é bônus.' : `${p.days} de ${goal.days} ${goal.days === 1 ? 'dia' : 'dias'} com piano`}
      </span>
      {editing ? (
        <div className="weeklyGoal__edit">
          <GoalChoice label="Minutos" options={GOAL_MINUTES} value={goal.minutes} unit="min" onPick={(minutes) => change({ ...goal, minutes })} />
          <GoalChoice label="Dias" options={GOAL_DAYS} value={goal.days} onPick={(days) => change({ ...goal, days })} />
          <button type="button" className="weeklyGoal__toggle" onClick={() => setEditing(false)}>Pronto</button>
        </div>
      ) : (
        <button type="button" className="weeklyGoal__toggle" onClick={() => setEditing(true)}>Mudar meta</button>
      )}
    </div>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(1, max ? value / max : 0);
  return (
    <span className="weeklyGoal__meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
      <span className="weeklyGoal__meterName">{label}</span>
      <span className="weeklyGoal__bar">
        <span className={'weeklyGoal__fill' + (pct >= 1 ? ' weeklyGoal__fill-full' : '')} style={{ width: `${pct * 100}%` }} />
      </span>
    </span>
  );
}

function GoalChoice({ label, options, value, unit, onPick }: { label: string; options: number[]; value: number; unit?: string; onPick: (v: number) => void }) {
  return (
    <div className="weeklyGoal__choice" role="group" aria-label={label}>
      <span className="weeklyGoal__meterName">{label}</span>
      <div className="segmented">
        {options.map((o) => (
          <button key={o} type="button" className={'segmented__option' + (o === value ? ' segmented__option-active' : '')} aria-pressed={o === value} onClick={() => onPick(o)}>
            {o}{unit ? ` ${unit}` : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
