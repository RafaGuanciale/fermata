// Regras gerais de todos os exercícios do curso e do Treino: nenhuma meta exige acertar tudo sem querer,
// nenhuma janela de tempo é mais apertada do que o atraso natural do piano e da calibração permite.
import { describe, expect, it } from 'vitest';
import { UNITS } from '.';
import { needCount } from './judge';
import { ALL_TRACKS } from './track';
import type { Exercise } from './types';

function all(): { where: string; ex: Exercise }[] {
  const out: { where: string; ex: Exercise }[] = [];
  for (const u of UNITS) for (const l of u.lessons) {
    for (const b of l.blocks) if (b.kind === 'exercise') out.push({ where: `${l.id} ${b.exercise.title}`, ex: b.exercise });
    l.checkpoint.forEach((ex) => out.push({ where: `${l.id} checkpoint ${ex.title}`, ex }));
    if (l.project?.exercise) out.push({ where: `${l.id} projeto`, ex: l.project.exercise });
  }
  for (const t of ALL_TRACKS) [...t.warmup, t.reading, t.ear].forEach((ex) => out.push({ where: `treino u${t.unit} ${ex.title}`, ex }));
  return out;
}

describe('regras dos exercícios', () => {
  it('rodadas com mais de 3 perguntas aceitam pelo menos um erro, a não ser que a meta seja 100%', () => {
    for (const { where, ex } of all()) {
      const n = ex.kind === 'items' ? ex.count : ex.kind === 'quiz' ? ex.questions.length : 0;
      const share = ex.kind === 'items' || ex.kind === 'quiz' ? ex.pass.accuracy : 1;
      if (n > 3 && share < 1) expect(needCount(n, share), where).toBeLessThan(n);
    }
  });

  it('janela de tempo de pelo menos ±50 ms', () => {
    for (const { where, ex } of all()) if (ex.kind === 'timed') expect(ex.window, where).toBeGreaterThanOrEqual(50);
  });
});
