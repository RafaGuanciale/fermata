import { describe, expect, it } from 'vitest';
import type { TrainingRun } from '../db/db';
import { seeded } from './music';
import { ALL_TRACKS, MAJOR, partsDone, trainingUnit, lineTask, pentachord, scaleUpDown, techRunId, techStartBpm, techStatus, techniqueForDay, trackFor } from './track';
import type { Exercise, TimedTask } from './types';

function checkTask(t: TimedTask, where: string) {
  expect(t.events.length, where).toBeGreaterThan(0);
  for (const e of t.events) expect(e.midi !== null && e.midi >= t.low && e.midi <= t.high, `${where}: nota ${e.midi} fora de ${t.low}–${t.high}`).toBe(true);
  expect(t.low >= 21 && t.high <= 108, where).toBe(true);
  const total = t.display.reduce((s, d) => s + d.beats, 0);
  expect(Math.abs(total / t.beatsPerBar - Math.round(total / t.beatsPerBar)) < 1e-6, `${where}: compasso aberto (${total} tempos)`).toBe(true);
}

function checkExercise(ex: Exercise, where: string) {
  for (let seed = 1; seed <= 20; seed++) {
    if (ex.kind === 'timed') checkTask(ex.gen(seeded(seed)), where);
    if (ex.kind === 'items') {
      const it = ex.gen(seeded(seed));
      expect(it.steps.length > 0 || !!it.choices, where).toBe(true);
    }
  }
}

describe('linhas técnicas', () => {
  it('escala, pentacorde e mãos', () => {
    expect(scaleUpDown(60, MAJOR, 1)).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]);
    expect(pentachord(60)).toEqual([60, 62, 64, 65, 67, 65, 64, 62, 60]);
    const t = lineTask([60, 62, 64], 1, { bpm: 60, hands: 'duas' });
    expect(t.events.map((e) => [e.midi, e.beat])).toEqual([[60, 0], [48, 0], [62, 1], [50, 1], [64, 2], [52, 2]]);
    expect(t.display.map((d) => d.beats)).toEqual([1, 1, 2]);
    const c = lineTask([72, 74], 1, { bpm: 60, hands: 'contrario' });
    expect(c.events.filter((e) => e.beat === 1).map((e) => e.midi).sort()).toEqual([58, 74]);
  });
});

describe.each(ALL_TRACKS.map((t) => [t.unit, t] as const))('trilho da unidade %i', (_n, track) => {
  it('aquecimento, técnica, leitura e ouvido geram tarefas válidas', () => {
    track.warmup.forEach((w, i) => checkExercise(w, `aquecimento ${i + 1}`));
    for (const item of track.technique) for (let seed = 1; seed <= 20; seed++) checkTask(item.gen(seeded(seed)), item.id);
    checkExercise(track.reading, 'leitura');
    checkExercise(track.ear, 'ouvido');
    expect(new Set(track.technique.map((t) => t.id)).size).toBe(track.technique.length);
  });
});

describe('escada que continua', () => {
  const item = trackFor(1).technique[0];
  const run = (bpm: number, clean: boolean): TrainingRun => ({ treinoId: techRunId(item), kind: 'timed', at: bpm, day: '2026-10-09', bpm, clean });

  it('começa no início, depois um degrau abaixo do melhor, e chega ao alvo', () => {
    expect(techStartBpm(item, [])).toBe(item.from);
    expect(techStatus(item, [])).toBe('novo');
    expect(techStartBpm(item, [run(76, true), run(84, false)])).toBe(72);
    expect(techStatus(item, [run(76, true)])).toBe('subindo');
    expect(techStatus(item, [run(item.target, true)])).toBe('no alvo');
  });

  it('técnica do dia prioriza o que ainda sobe', () => {
    const track = trackFor(1);
    const day = techniqueForDay(track, [], 0);
    expect(day).toHaveLength(2);
    const allDone: TrainingRun[] = track.technique.map((t) => ({ treinoId: techRunId(t), kind: 'timed', at: 1, day: 'x', bpm: t.target, clean: true }));
    expect(techniqueForDay(track, allDone, 1)).toHaveLength(1);
  });
});

describe('o dia de treino', () => {
  it('conta as partes feitas no dia e escolhe a unidade', () => {
    const runs: TrainingRun[] = [
      { treinoId: 'dia-aquecimento', kind: 'warmup', at: 1, day: '2026-10-09' },
      { treinoId: 'tec-penta-do-md', kind: 'timed', at: 2, day: '2026-10-09', bpm: 64, clean: true },
      { treinoId: 'dia-leitura', kind: 'reading', at: 3, day: '2026-10-08' },
    ];
    expect([...partsDone(runs, '2026-10-09')].sort()).toEqual(['aquecimento', 'tecnica']);
    expect(trainingUnit({ unit: { n: 3 } }, 9, true)).toBe(3);
    expect(trainingUnit(null, 9, true)).toBe(9);
    expect(trainingUnit(null, 9, false)).toBe(1);
  });
});

describe('registro da mão esquerda no treino', () => {
  it('pentacordes e escalas da esquerda ficam entre Lá1 e Dó4, na clave de fá', async () => {
    const { ALL_TRACKS } = await import('./track');
    const { seeded } = await import('./music');
    for (const t of ALL_TRACKS) {
      for (const item of t.technique.filter((x) => /mão esquerda/.test(x.title))) {
        for (let s = 1; s < 6; s++) {
          const task = item.gen(seeded(s));
          const midis = task.events.map((e) => e.midi).filter((m): m is number => m !== null);
          expect(Math.min(...midis), `${item.title}`).toBeGreaterThanOrEqual(33);
          expect(Math.min(...midis), `${item.title}`).toBeGreaterThanOrEqual(38);
          expect(task.clef, item.title).toBe('bass');
        }
      }
    }
  });
});

describe('variação do treino', () => {
  const variety = (gen: (rng: () => number) => TimedTask, n = 40) => {
    const rng = seeded(7);
    return new Set(Array.from({ length: n }, () => JSON.stringify(gen(rng).display.map((d) => d.midi)))).size;
  };

  it('desenhos do pentacorde não repetem a tecla em seguida e terminam na tônica ou na 5ª', async () => {
    const { PENTA_PATTERNS, pentaPattern } = await import('./track');
    for (const p of PENTA_PATTERNS) {
      const line = pentaPattern(60, MAJOR, p.degrees);
      for (let i = 1; i < line.length; i++) expect(line[i], p.name).not.toBe(line[i - 1]);
      expect([60, 67]).toContain(line[line.length - 1]);
    }
  });

  it('todo aquecimento e toda técnica mudam de uma vez para outra', () => {
    for (const t of ALL_TRACKS) {
      for (const w of t.warmup) if (w.kind === 'timed') expect(variety(w.gen), `u${t.unit} aquecimento ${w.title}`).toBeGreaterThan(1);
      for (const it of t.technique) expect(variety(it.gen), `u${t.unit} técnica ${it.title}`).toBeGreaterThan(1);
    }
  });

  it('toques iguais: as cinco notas, quatro vezes cada, em ordem sorteada', async () => {
    const { touchesLine } = await import('./track');
    const rng = seeded(3);
    const a = touchesLine(rng);
    expect(a.length).toBe(21);
    for (const m of [60, 62, 64, 65, 67]) expect(a.filter((x) => x === m).length).toBe(m === 60 ? 5 : 4);
  });

  it('Alberti: tríades na região da mão esquerda', async () => {
    const { ALBERTI_PROGRESSIONS } = await import('./track');
    for (const p of ALBERTI_PROGRESSIONS) for (const c of p.chords) {
      expect(c.length).toBe(3);
      expect(Math.min(...c) >= 40 && Math.max(...c) <= 57, p.name).toBe(true);
    }
  });
});
