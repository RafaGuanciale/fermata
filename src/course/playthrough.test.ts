// Robô que "toca" a resposta certa de cada exercício de todas as unidades e confere se ele é aprovável:
// itens (notas, acordes com baixo e condução, sequências), tarefas no tempo (com legato/staccato) e improviso.
// Pega exercício impossível: nota fora do teclado, acorde que o julgamento não aceita, passada que não fecha.

import { describe, expect, it } from 'vitest';
import type { Midi } from '../music/notes';
import { UNITS } from '.';
import { articulationScore, judgeTask, pedalOnsets, pedalScore, pressItem, scoreImprov, startItem, voiceMove, type CourseEvent, type ItemProgress } from './judge';
import { pcOf, seeded } from './music';
import type { Accept, Exercise, Item, Pc, TimedTask, Unit } from './types';

/** Todas as maneiras de dispor as classes numa oitava (uma nota por classe), perto de `center`. */
function voicings(pcs: Pc[], center: Midi): Midi[][] {
  const out: Midi[][] = [];
  for (let base = center - 12; base <= center + 12; base++) {
    if (!pcs.includes(pcOf(base))) continue;
    const chord = [base];
    for (const p of pcs) if (p !== pcOf(base)) chord.push(base + ((p - pcOf(base) + 12) % 12));
    out.push(chord.sort((a, b) => a - b));
  }
  return out;
}

/** O acorde que o robô toca: com baixo pedido, o baixo embaixo; com condução, o caminho mais curto desde o anterior. */
function playChord(accept: Extract<Accept, { kind: 'chord' }>, prev: Midi[] | undefined, low: Midi, high: Midi): Midi[] {
  const pcs = accept.pcs.filter((p) => !accept.optional?.includes(p) || accept.lead === undefined || true);
  const center = Math.round((low + high) / 2);
  if (accept.lead !== undefined && prev?.length) {
    const withBass = accept.bass !== undefined && prev.length === pcs.length + 1;
    const prevUpper = withBass ? prev.slice(1) : prev;
    let best: Midi[] = [];
    let bestMove = Infinity;
    for (const v of voicings(pcs, Math.round(prevUpper.reduce((a, b) => a + b, 0) / prevUpper.length))) {
      const m = voiceMove(prevUpper, v);
      if (m < bestMove) {
        best = v;
        bestMove = m;
      }
    }
    if (withBass) return [Math.min(...best) - 12 - ((pcOf(Math.min(...best)) - accept.bass! + 12) % 12), ...best].sort((a, b) => a - b);
    return best;
  }
  const upper = voicings(pcs, center)[0] ?? [];
  if (accept.bass === undefined) return upper;
  // Condução com baixo: o baixo na esquerda, abaixo das três vozes da direita.
  if (accept.lead !== undefined) return [Math.min(...upper) - 12 - ((pcOf(Math.min(...upper)) - accept.bass + 12) % 12), ...upper].sort((a, c) => a - c);
  // Baixo pedido: inversão fechada a partir do baixo.
  const b = center - 12 - ((pcOf(center - 12) - accept.bass + 12) % 12);
  const rest = pcs.filter((p) => p !== accept.bass).map((p) => b + ((p - accept.bass! + 12) % 12) || b + 12);
  return [b, ...rest].sort((a, c) => a - c);
}

/** Toca um item e devolve o progresso final. */
function solve(item: Item, low: Midi, high: Midi): ItemProgress {
  let p = startItem();
  if (item.choices) return { ...p, done: item.answer !== undefined && item.answer >= 0 && item.answer < item.choices.length };
  for (let guard = 0; guard < 50 && !p.done; guard++) {
    const accept = item.steps[p.step];
    let keys: Midi[] = [];
    if (accept.kind === 'pc') {
      let k = low;
      while (pcOf(k) !== accept.pcs[0]) k++;
      keys = [k];
    } else if (accept.kind === 'exact') keys = [accept.midis[0]];
    else if (accept.kind === 'all') keys = accept.midis;
    else if (accept.kind === 'chord') keys = playChord(accept, p.lastChord, low, high);
    else if (accept.kind === 'anyChord') keys = playChord({ kind: 'chord', ...accept.options[0] }, undefined, low, high);
    const held: Midi[] = [];
    const before = p.step;
    for (const k of keys) {
      held.push(k);
      p = pressItem(p, item, k, held);
      if (p.step !== before) break;
    }
    if (p.step === before && !p.done) break;
  }
  return p;
}

/** Toca a tarefa exatamente no tempo; legato encosta as notas, staccato solta cedo. */
function perform(task: TimedTask, bpm: number, articulation?: 'legato' | 'staccato'): CourseEvent[] {
  const beatMs = 60000 / bpm;
  const sorted = [...task.events].sort((a, b) => a.beat - b.beat);
  return sorted.map((e) => {
    const t = e.beat * beatMs;
    const dur = e.beats * beatMs;
    const off = articulation === 'staccato' ? t + dur * 0.3 : articulation === 'legato' ? t + dur + 10 : t + dur * 0.9;
    return { midi: e.midi ?? 60, t, off, velocity: 80 };
  });
}

function check(ex: Exercise, where: string) {
  for (let seed = 1; seed <= 12; seed++) {
    const rng = seeded(seed);
    const at = `${where} (semente ${seed})`;
    if (ex.kind === 'items') {
      const item = ex.gen(rng);
      const p = solve(item, ex.low, ex.high);
      expect(p.done, `${at}: "${item.prompt}" não fecha tocando a resposta certa`).toBe(true);
      expect(p.misses, `${at}: "${item.prompt}" conta erro tocando a resposta certa (${p.why ?? ''})`).toBe(0);
    }
    if (ex.kind === 'timed') {
      const task = ex.gen(rng);
      const bpm = ex.ladder?.to ?? task.bpm;
      const events = perform(task, bpm, ex.articulation);
      const r = judgeTask(task, bpm, events, ex.window);
      expect(r.accuracy, `${at}: passada perfeita deu ${Math.round(r.accuracy * 100)}%`).toBeGreaterThanOrEqual(ex.pass.accuracy);
      if (ex.pedal) {
        // Pedal certo: legato sobe logo depois de cada troca e desce em seguida; direto desce com o acorde e sobe no fim dele.
        const beatMs = 60000 / bpm;
        const ons = pedalOnsets(task).map((b) => b * beatMs);
        const pedal =
          ex.pedal === 'legato'
            ? ons.flatMap((t, i) => (i === 0 ? [{ t: t + 50, down: true }] : [{ t: t + 60, down: false }, { t: t + 150, down: true }]))
            : ons.flatMap((t) => {
                const ends = task.events.filter((e) => Math.abs(e.beat * beatMs - t) < 1).map((e) => (e.beat + e.beats) * beatMs);
                return [{ t: t + 50, down: true }, { t: Math.max(...ends) - 20, down: false }];
              });
        const ps = pedalScore(task, bpm, pedal, ex.pedal);
        expect(ps?.score, `${at}: pedal ${ex.pedal} perfeito deu ${JSON.stringify(ps)}`).toBeGreaterThanOrEqual(0.85);
      }
      if (ex.articulation) {
        const a = articulationScore(task, bpm, events, ex.articulation);
        if (a !== null) expect(a, `${at}: ${ex.articulation} perfeito deu ${a}`).toBeGreaterThanOrEqual(0.9);
      }
    }
  }
  if (ex.kind === 'improv') {
    const beatMs = 60000 / ex.bpm;
    const inSet: Midi[] = [];
    for (let m = ex.low; m <= ex.high; m++) if (ex.pcs.includes(pcOf(m))) inSet.push(m);
    const events: CourseEvent[] = [];
    for (let bar = 0; bar < ex.bars; bar++) {
      const t0 = bar * ex.beatsPerBar * beatMs;
      events.push({ midi: inSet[bar % inSet.length], t: t0, off: t0 + beatMs * 0.9 }, { midi: inSet[(bar + 1) % inSet.length], t: t0 + beatMs, off: t0 + beatMs * 1.9 });
    }
    if (ex.pass.endOn) {
      const last = inSet.find((m) => ex.pass.endOn!.includes(pcOf(m)));
      expect(last, `${where}: nenhuma tecla do teclado termina na casa`).toBeDefined();
      events[events.length - 1].midi = last!;
    }
    const s = scoreImprov(events, ex.pcs, ex.bpm, ex.bars, ex.beatsPerBar);
    expect(s.inSet, where).toBeGreaterThanOrEqual(ex.pass.inSet);
    expect(s.restsPer4, where).toBeGreaterThanOrEqual(ex.pass.restsPer4);
  }
}

describe.each(UNITS.map((u) => [u.n, u] as [number, Unit]))('robô na unidade %i', (_n, unit) => {
  it('todo exercício guiado, checkpoint e projeto é aprovável tocando certo', () => {
    for (const l of unit.lessons) {
      for (const b of l.blocks) if (b.kind === 'exercise') check(b.exercise, `${unit.id}/${l.id}/${b.id}`);
      l.checkpoint.forEach((ex, i) => check(ex, `${unit.id}/${l.id}/checkpoint ${i + 1}`));
      if (l.project?.exercise) check(l.project.exercise, `${unit.id}/${l.id}/projeto`);
    }
  });

  it('itens de revisão e de saída fecham tocando certo', () => {
    for (const l of unit.lessons) {
      for (const g of [...l.review, ...l.exit]) {
        for (let seed = 1; seed <= 12; seed++) {
          const item = g(seeded(seed));
          const p = solve(item, 21, 108);
          expect(p.done && p.misses === 0, `${unit.id}/${l.id} revisão: "${item.prompt}" (${p.why ?? ''})`).toBe(true);
        }
      }
    }
  });
});
