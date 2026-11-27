import { describe, expect, it } from 'vitest';
import type { TrainingRun } from '../db/db';
import { seeded } from './music';
import { ALL_TRACKS, MAJOR, partsDone, trainingUnit, lineTask, pentachord, scaleUpDown, techRunId, techStartBpm, techStatus, techniqueForDay, trackFor, trackForDay } from './track';
import { UNITS } from '.';
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

// Um conceito por vez: o treino de uma unidade só usa o que já foi ensinado.
// Lição que apresenta cada coisa que o detector abaixo reconhece numa tarefa.
const TAUGHT_IN = { colcheias: 20, tercinas: 39, semicolcheias: 70, 'mãos juntas': 14 } as const;
type Concept = keyof typeof TAUGHT_IN;

function conceptsIn(t: TimedTask): Concept[] {
  const out = new Set<Concept>();
  const figures = [...t.display, ...(t.lower ?? [])].map((d) => d.beats * (t.compound ? 1.5 : 1));
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  if (figures.some((b) => near(b, 0.5))) out.add('colcheias');
  if (figures.some((b) => near(b, 1 / 3))) out.add('tercinas');
  if (figures.some((b) => near(b, 0.25))) out.add('semicolcheias');
  if (t.events.some((e) => e.hand === 'l') || !!t.lower?.length) out.add('mãos juntas');
  return [...out];
}

describe('um conceito por vez no treino', () => {
  const firstLesson = (unit: number) => Math.min(...UNITS[unit - 1].lessons.map((l) => l.n));
  const cases = ALL_TRACKS.flatMap((track) => [
    ...track.warmup.map((w) => ({ track, what: `aquecimento "${w.title}"`, after: w.afterLesson, gen: w.kind === 'timed' ? w.gen : null })),
    ...track.technique.map((t) => ({ track, what: `técnica "${t.id}"`, after: t.afterLesson, gen: t.gen })),
    { track, what: 'leitura', after: track.reading.afterLesson, gen: track.reading.kind === 'timed' ? track.reading.gen : null },
  ]);
  it.each(cases.map((c) => [`unidade ${c.track.unit}, ${c.what}`, c] as const))('%s', (_name, c) => {
    if (!c.gen) return;
    for (let seed = 1; seed <= 10; seed++) {
      for (const k of conceptsIn(c.gen(seeded(seed)))) {
        const lesson = TAUGHT_IN[k];
        const ok = lesson < firstLesson(c.track.unit) || (c.after ?? 0) >= lesson;
        expect(ok, `usa ${k} (lição ${lesson}) sem "afterLesson" a partir dela`).toBe(true);
      }
    }
  });

  it('chegar na unidade 3 não traz colcheias nem tercinas antes das lições', () => {
    const none = trackForDay(3, () => false);
    expect(none.technique.map((t) => t.id)).toEqual(trackFor(2).technique.map((t) => t.id));
    const after17 = trackForDay(3, (n) => n <= 17);
    expect(after17.technique.map((t) => t.id)).toEqual(['triade-quebrada-1']);
    const after20 = trackForDay(3, (n) => n <= 20);
    expect(after20.technique.map((t) => t.id)).toEqual(['triade-quebrada-1', 'penta-colcheias']);
    expect(after20.warmup.map((w) => w.title)).toContain('Pentacorde em colcheias');
    for (const seed of [1, 2, 3]) expect(conceptsIn(after17.technique[0].gen(seeded(seed)))).toEqual([]);
  });

  it('o ouvido do treino só traz o ditado do baixo depois da lição 23, e os graus de ouvido depois da 28', () => {
    const before23 = trackForDay(3, (n) => n <= 22);
    expect(before23.ear.how).toBe(trackFor(2).ear.how);
    expect(trackForDay(3, (n) => n <= 23).ear.how).toBe(trackFor(3).ear.how);
    expect(trackForDay(4, (n) => n <= 27).ear.how).toBe(trackFor(3).ear.how);
    expect(trackForDay(4, (n) => n <= 28).ear.how).toBe(trackFor(4).ear.how);
  });

  it('a tríade quebrada da unidade 3 cabe na pauta (sem linhas suplementares em cima)', () => {
    const item = trackFor(3).technique.find((t) => t.id === 'triade-quebrada-1')!;
    for (let seed = 1; seed <= 20; seed++) {
      const midis = item.gen(seeded(seed)).display.map((d) => d.midi ?? 0);
      expect(Math.max(...midis)).toBeLessThanOrEqual(79);
      expect(Math.min(...midis)).toBeGreaterThanOrEqual(60);
    }
  });
});
