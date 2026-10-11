// Meta semanal leve: minutos e dias tocados na semana (segunda a domingo). Fica neste aparelho.

import { weeklyTotals } from './stats';

export interface WeeklyGoal {
  minutes: number;
  days: number;
}

export const DEFAULT_GOAL: WeeklyGoal = { minutes: 90, days: 3 };
export const GOAL_MINUTES = [60, 90, 120, 180];
export const GOAL_DAYS = [2, 3, 4, 5];

const KEY = 'fermata-weekly-goal';

export function getGoal(): WeeklyGoal {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return DEFAULT_GOAL;
    const g = JSON.parse(v) as Partial<WeeklyGoal>;
    return { minutes: g.minutes ?? DEFAULT_GOAL.minutes, days: g.days ?? DEFAULT_GOAL.days };
  } catch {
    return DEFAULT_GOAL;
  }
}

export function setGoal(goal: WeeklyGoal) {
  try {
    localStorage.setItem(KEY, JSON.stringify(goal));
  } catch {
    // sem armazenamento: vale só nesta visita
  }
}

export interface GoalProgress {
  minutes: number;
  days: number;
  met: boolean;
}

/** Quanto da meta já foi feito nesta semana. */
export function goalProgress(byDay: Map<string, number>, now: number, goal: WeeklyGoal): GoalProgress {
  const week = weeklyTotals(byDay, now, 1)[0];
  return { minutes: Math.round(week.minutes), days: week.days, met: week.minutes >= goal.minutes && week.days >= goal.days };
}
