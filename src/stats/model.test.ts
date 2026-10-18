import { describe, expect, it } from 'vitest';
import type { AppEvent, TakeLog, TrainingRun } from '../db/db';
import { packErrors, type NoteError } from '../analysis/takeLog';
import { blockStats, buildBlocks, buildPasses, buildTimeline, nextBpm, MIN } from './model';
import { findPatterns, progressChanges, skillChanges, songDetail, songNow, timeByArea, topNotesAcross } from './summary';

const T0 = new Date(2026, 9, 18, 19, 0).getTime();
const err = (measure: number, midi: number, outcome: NoteError['outcome'], played = 0, delta = 0, finger = 4): NoteError => ({ measure, midi, finger, hand: 'r', outcome, delta, played });

let seq = 0;
function take(over: Partial<TakeLog> & { errs?: NoteError[] }): TakeLog {
  const { errs = [], ...rest } = over;
  seq++;
  return {
    id: `t${seq}`,
    at: T0,
    day: '2026-10-18',
    kind: 'musica',
    sourceId: 'peca-ode',
    title: 'Ode to Joy',
    n: seq,
    bpm: 60,
    hand: 'direita',
    from: 1,
    to: 8,
    accuracy: 1,
    total: 30,
    errors: packErrors(errs),
    fingers: [6, 6, 6, 6, 6, 0, 0, 0, 0, 0],
    extras: 0,
    meanDelta: -30,
    drift: 0,
    ...rest,
  };
}

const run = (over: Partial<TrainingRun>): TrainingRun => ({ id: seq++, treinoId: 'peca-ode', kind: 'timed', at: T0, day: '2026-10-18', bpm: 120, accuracy: 0.7, ...over });

describe('passadas e blocos', () => {
  it('junta passadas nota a nota com registros antigos, sem contar duas vezes', () => {
    const t = take({ at: T0 });
    const passes = buildPasses([t], [run({ at: T0 + 1000, bpm: 60 }), run({ at: T0 - 3 * 86_400_000, bpm: 120, weakFrom: 10, weakTo: 10 })], () => null);
    expect(passes.map((p) => [p.bpm, p.errors === null])).toEqual([
      [120, true],
      [60, false],
    ]);
    expect(passes[0].weak).toEqual({ from: 10, to: 10 });
  });

  it('mesma música, trecho, mão e andamento em sequência viram um bloco; mudou o trecho, outro bloco', () => {
    const takes = [
      ...Array.from({ length: 6 }, (_, i) => take({ at: T0 + i * 20_000, accuracy: [0.6, 0.9, 0.92, 0.95, 0.95, 1][i], errs: i < 4 ? [err(7, 65, 'trocou', 64)] : [] })),
      ...Array.from({ length: 3 }, (_, i) => take({ at: T0 + 10 * MIN + i * 20_000, to: 12, accuracy: 0.8, errs: [err(10, 67, 'cedo', 0, -120)] })),
    ];
    const abort: AppEvent = { id: 'a', at: T0 + 2 * 60_000 + 30_000, day: '2026-10-18', type: 'abort', sourceId: 'peca-ode', title: 'Ode to Joy', mode: 'junto', bpm: 60, hand: 'direita', from: 1, to: 8, accuracy: 0.4, ms: 5000 };
    const listen: AppEvent = { id: 'l', at: T0 + 9 * MIN, day: '2026-10-18', type: 'listen', sourceId: 'peca-ode', from: 1, to: 12, bpm: 60 };
    const blocks = buildBlocks(buildPasses(takes, [], () => null), [abort, listen]);
    expect(blocks.map((b) => [b.from, b.to, b.passes.length, b.aborts.length, b.listens])).toEqual([
      [1, 8, 6, 1, 0],
      [1, 12, 3, 0, 1],
    ]);
    const s = blockStats(blocks[0]);
    expect(s.first).toBe(0.6);
    expect(s.last).toBe(1);
    expect(s.stableAt).toBe(2);
    expect(s.cleanStreak).toBe(2);
    expect(s.notes[0]).toMatchObject({ measure: 7, midi: 65, passes: 4, outcome: 'trocou', played: 64 });
    expect(s.timing.tendency).toBe('adiantado');
    expect(s.suggestion).toEqual({ kind: 'subir', bpm: 64 });
    expect(blockStats(blocks[1]).suggestion).toEqual({ kind: 'continuar' });
  });

  it('parar mais de 20 minutos separa o bloco; andamento seguinte é par e pelo menos 2 a mais', () => {
    const takes = [take({ at: T0 }), take({ at: T0 + 25 * MIN })];
    expect(buildBlocks(buildPasses(takes, [], () => null)).length).toBe(2);
    expect(nextBpm(60)).toBe(64);
    expect(nextBpm(30)).toBe(32);
  });

  it('linha do tempo: sessões separadas por mais de 30 minutos, treinos seguidos viram um item', () => {
    const blocks = buildBlocks(buildPasses([take({ at: T0 }), take({ at: T0 + 60_000 })], [], () => null));
    const runs: TrainingRun[] = [run({ treinoId: 'leitura', kind: 'names', at: T0 + 5 * MIN }), run({ treinoId: 'leitura', kind: 'names', at: T0 + 7 * MIN }), run({ treinoId: 'eco', kind: 'ear', at: T0 + 3 * 3_600_000 })];
    const views: AppEvent[] = [
      { id: 'v', at: T0 + 90 * MIN, day: '2026-10-18', type: 'view', path: '/peca/1/estudar', area: 'musicas', dur: 40_000, notes: 0, title: 'Ode to Joy' },
      // Hoje aberto 2 horas sem fazer nada: não cria nem estica sessão
      { id: 'h', at: T0 + 100 * MIN, day: '2026-10-18', type: 'view', path: '/', area: 'navegacao', dur: 2 * 3_600_000, active: 0, notes: 0 },
      // Tocar livre: 5 min tocando e a página ficou aberta mais 3 horas
      { id: 'l', at: T0 + 190 * MIN, day: '2026-10-18', type: 'view', path: '/tocar', area: 'livre', dur: 3 * 3_600_000, active: 5 * MIN, activeFrom: T0 + 190 * MIN, activeTo: T0 + 195 * MIN, notes: 400 },
    ];
    const sessions = buildTimeline(blocks, runs, views, (r) => (r.kind === 'names' ? { label: 'Leitura', detail: 'x' } : r.kind === 'ear' ? { label: 'Ouvido', detail: 'y' } : null), (v) => (v.notes ? null : `Abriu ${v.title} e saiu sem tocar`));
    expect(sessions.length).toBe(3);
    expect(sessions[0].items.map((i) => i.type)).toEqual(['block', 'activity']);
    expect(sessions[0].items[1].type === 'activity' && sessions[0].items[1].count).toBe(2);
    expect(sessions[1].items[0].type).toBe('view');
    expect(sessions[2].end).toBe(T0 + 195 * MIN);
    expect(sessions[2].activeMs).toBe(5 * MIN);
  });
});

describe('painel, música, padrões e mudanças', () => {
  it('raio-x da música: compassos, andamentos, onde está agora', () => {
    const passes = buildPasses(
      [take({ at: T0, errs: [err(7, 65, 'trocou', 64)], accuracy: 0.9 }), take({ at: T0 + 30_000, accuracy: 1 })],
      [run({ at: T0 - 86_400_000, bpm: 120, from: 1, to: 2, weakFrom: 2, weakTo: 2 })],
      () => null,
    );
    const d = songDetail(passes);
    expect(d.measures.length).toBe(8);
    expect(d.measures[6]).toEqual({ measure: 7, played: 2, errors: 1, weak: 0 });
    expect(d.measures[1].weak).toBe(1);
    expect(d.byBpm.map((b) => [b.bpm, b.passes])).toEqual([[60, 2], [120, 1]]);
    expect(songNow(passes)).toMatchObject({ bpm: 60, from: 1, to: 8, recent: 2, mean: 0.95 });
  });

  it('tempo por área só conta o tempo útil, não a página aberta', () => {
    const v = (area: string, dur: number, active: number): AppEvent => ({ id: area + dur, at: T0, day: '', type: 'view', area, dur, active });
    // 40 min com a música aberta, só 10 min tocando: contam 10
    expect(timeByArea([v('musicas', 2_400_000, 600_000), v('musicas', 30_000, 0), v('curso', 300_000, 120_000), v('navegacao', 7_200_000, 0)])).toEqual([
      { area: 'musicas', ms: 600_000 },
      { area: 'curso', ms: 120_000 },
    ]);
  });

  it('padrões: adiantado, tecla vizinha e o dedo com mais erro', () => {
    const takes = Array.from({ length: 10 }, (_, i) => take({ at: T0 + i * 20_000, meanDelta: -45, errs: [err(7, 65, 'trocou', 64, 0, 4), err(3, 62, 'trocou', 63, 0, 4)] }));
    const ids = findPatterns(buildPasses(takes, [], () => null)).map((p) => p.id);
    expect(ids).toContain('tempo');
    expect(ids).toContain('vizinha');
    expect(ids).toContain('dedo');
    const spots = topNotesAcross(buildPasses(takes, [], () => null));
    expect(spots[0]).toMatchObject({ title: 'Ode to Joy', passes: 10 });
  });

  it('mudanças: mesmo trecho e andamento melhorou; firme num andamento novo', () => {
    const now = T0;
    const old = Array.from({ length: 4 }, (_, i) => take({ at: now - 10 * 86_400_000 + i * 1000, accuracy: 0.7, meanDelta: null }));
    const fresh = Array.from({ length: 4 }, (_, i) => take({ at: now - 86_400_000 + i * 1000, accuracy: 0.9, meanDelta: null }));
    const changes = progressChanges(buildPasses([...old, ...fresh], [], () => null), now);
    expect(changes.map((c) => [c.id.split(':')[0], c.dir])).toEqual(expect.arrayContaining([['cfg', 'melhor'], ['firme', 'melhor']]));
    expect(changes.find((c) => c.id.startsWith('cfg'))!.detail).toContain('70 % para 90 %');
  });

  it('mudanças nas habilidades: leitura mais rápida, ouvido e técnica', () => {
    const d = 86_400_000;
    const runs: TrainingRun[] = [
      run({ treinoId: 'leitura', kind: 'names', at: T0 - 12 * d, avgMs: 2000 }),
      run({ treinoId: 'leitura', kind: 'names', at: T0 - 11 * d, avgMs: 2200 }),
      run({ treinoId: 'leitura', kind: 'names', at: T0 - 2 * d, avgMs: 1500 }),
      run({ treinoId: 'leitura', kind: 'names', at: T0 - d, avgMs: 1500 }),
      run({ treinoId: 'eco', kind: 'ear', at: T0 - 10 * d, level: 4 }),
      run({ treinoId: 'eco', kind: 'ear', at: T0 - d, level: 6 }),
      run({ treinoId: 'tec-x', kind: 'timed', at: T0 - 10 * d, bpm: 60, clean: true }),
      run({ treinoId: 'tec-x', kind: 'timed', at: T0 - d, bpm: 68, clean: true }),
    ];
    const c = skillChanges(runs, T0, () => 'Escala de Dó');
    expect(c.map((x) => [x.id, x.dir])).toEqual(expect.arrayContaining([['leitura', 'melhor'], ['ouvido', 'melhor'], ['tec:tec-x', 'melhor']]));
    expect(c.find((x) => x.id === 'leitura')!.detail).toContain('2,1 s para 1,5 s');
  });
});
