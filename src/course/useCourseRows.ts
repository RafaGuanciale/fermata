// Progresso das lições do curso, ao vivo do Dexie. `undefined` enquanto carrega.

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { rowsById } from './progress';

export function useCourseRows() {
  const rows = useLiveQuery(() => db.lessons.where('id').startsWith('curso/').toArray(), []);
  return useMemo(() => (rows ? rowsById(rows) : undefined), [rows]);
}
