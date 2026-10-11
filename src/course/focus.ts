// Modo foco: a lição vira uma sequência de passos, um por tela. Puro e testado.

import type { Block, Lesson } from './types';

export type FocusStep =
  | { kind: 'warmup' }
  | { kind: 'intro' }
  | { kind: 'read'; blocks: Block[]; title?: string }
  | { kind: 'exercise'; block: Extract<Block, { kind: 'exercise' }> }
  | { kind: 'song'; block: Extract<Block, { kind: 'song' }> }
  | { kind: 'checkpoint' }
  | { kind: 'project' }
  | { kind: 'exit' }
  | { kind: 'done' };

/**
 * Cada texto abre um passo de leitura e leva junto as figuras, exemplos e avisos que vêm logo depois;
 * cada exercício e cada música são um passo próprio. Antes: aquecimento (se houver) e objetivos;
 * depois: checkpoint, mini-projeto (se houver), ticket de saída e a tela de conclusão.
 */
export function focusSteps(lesson: Lesson, hasWarmup: boolean): FocusStep[] {
  const steps: FocusStep[] = [];
  if (hasWarmup) steps.push({ kind: 'warmup' });
  steps.push({ kind: 'intro' });
  let reading: Extract<FocusStep, { kind: 'read' }> | null = null;
  for (const b of lesson.blocks) {
    if (b.kind === 'exercise') {
      reading = null;
      steps.push({ kind: 'exercise', block: b });
    } else if (b.kind === 'song') {
      reading = null;
      steps.push({ kind: 'song', block: b });
    } else if (b.kind === 'text' || !reading) {
      reading = { kind: 'read', blocks: [b], title: b.kind === 'text' ? b.title : undefined };
      steps.push(reading);
    } else {
      reading.blocks.push(b);
    }
  }
  steps.push({ kind: 'checkpoint' });
  if (lesson.project) steps.push({ kind: 'project' });
  steps.push({ kind: 'exit' }, { kind: 'done' });
  return steps;
}

/** Onde retomar: o primeiro exercício ainda não feito; sem pendência, o checkpoint (ou o começo, se já concluiu). */
export function resumeStep(steps: FocusStep[], isDone: (id: string) => boolean, passed: boolean): number {
  if (passed) return 0;
  const anyDone = steps.some((s) => s.kind === 'exercise' && isDone(s.block.id));
  if (!anyDone) return 0;
  const i = steps.findIndex((s) => s.kind === 'exercise' && !isDone(s.block.id));
  if (i >= 0) {
    // Volta para a leitura que prepara esse exercício, se houver.
    return i > 0 && steps[i - 1].kind === 'read' ? i - 1 : i;
  }
  return steps.findIndex((s) => s.kind === 'checkpoint');
}
