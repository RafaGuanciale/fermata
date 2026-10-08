import { describe, expect, it } from 'vitest';
import type { TrainingRun } from '../db/db';
import { afterRep, createLadder, judgeTake, latencyFromTaps, onsets, repBpm, shouldIsolate, windowsFor } from './timing';
import { PHASES, WARMUP_LEVELS, melody, warmupForDay } from './program';
import { currentWarmupLevel, phaseState, readingChange, treinoStatus, warmupIsEasy, warmupTarget } from './progress';

const w = windowsFor(1);

describe('julgamento no tempo', () => {
  const notes = melody('C4 D4 E4:2');

  it('calcula onde cada nota cai', () => {
    expect(onsets(notes, 60)).toEqual([0, 1000, 2000]);
    expect(onsets(melody('C4 r D4'), 120)).toEqual([0, null, 1000]);
  });

  it('dá nota por proximidade do tempo', () => {
    const r = judgeTake(notes, 60, [
      { midi: 60, t: 10 },
      { midi: 62, t: 1080 },
      { midi: 64, t: 1870 },
    ], w);
    expect(r.notes.map((n) => n?.grade)).toEqual(['perfect', 'good', 'off']);
    expect(r.clean).toBe(false);
    expect(r.accuracy).toBeCloseTo((1 + 0.9 + 0.5) / 3);
  });

  it('passada limpa: tudo tocado, 90% bom, nada fora de 150 ms', () => {
    const r = judgeTake(notes, 60, [
      { midi: 60, t: -20 },
      { midi: 62, t: 1030 },
      { midi: 64, t: 2090 },
    ], w);
    expect(r.clean).toBe(true);
    expect(r.extras).toBe(0);
  });

  it('nota errada vira extra e a esperada vira erro quando o prazo vence', () => {
    const r = judgeTake(notes, 60, [{ midi: 61, t: 0 }], w, 1400);
    expect(r.extras).toBe(1);
    expect(r.notes[0]).toEqual({ grade: 'miss', delta: null });
    expect(r.notes[1]).toBeNull();
  });
});

describe('escada de BPM', () => {
  it('começa em 60% e sobe 5% depois de 3 limpas', () => {
    let l = createLadder(80);
    expect(l.bpm).toBe(48);
    l = afterRep(afterRep(afterRep(l, true), true), true);
    expect(l.bpm).toBe(52);
  });

  it('desce depois de 2 falhas e pede para isolar depois de 2 descidas', () => {
    let l = createLadder(80, 72);
    expect(l.bpm).toBe(68);
    l = afterRep(afterRep(l, false), false);
    expect(l.bpm).toBe(64);
    l = afterRep(afterRep(l, false), false);
    expect(shouldIsolate(l)).toBe(true);
  });

  it('a cada 4 passadas, uma mais devagar que não conta para subir', () => {
    let l = createLadder(60, 60);
    expect(l.bpm).toBe(56);
    l = afterRep(afterRep(afterRep(l, true), true), true);
    expect(l.bpm).toBe(60);
    expect(repBpm(l)).toBe(56);
    l = afterRep(l, true, 56);
    expect(l.atTarget).toBe(0);
    l = afterRep(afterRep(afterRep(l, true), true), true);
    expect(l.atTarget).toBe(3);
  });

  it('mede o atraso do aparelho pela mediana', () => {
    expect(latencyFromTaps([105, 1110, 2090, 3100, 4600], [0, 1000, 2000, 3000, 4000])).toBe(103);
    expect(latencyFromTaps([10, 20], [0, 1000])).toBeNull();
  });
});

const run = (r: Partial<TrainingRun>): TrainingRun => ({ treinoId: 'x', kind: 'timed', at: 0, day: '2026-10-01', ...r });

describe('progresso', () => {
  const f1 = PHASES[0];
  const escada = f1.treinos.find((t) => t.id === 'f1-escada-md')!;
  const leitura = f1.treinos.find((t) => t.id === 'f1-leitura')!;

  it('treino no tempo: vencido no alvo com 85%, dominado em outro dia', () => {
    expect(treinoStatus(escada, [])).toBe('novo');
    expect(treinoStatus(escada, [run({ treinoId: escada.id, bpm: 52, accuracy: 1 })])).toBe('andamento');
    const first = run({ treinoId: escada.id, bpm: 60, accuracy: 0.9, at: 1, atTarget: 3 });
    expect(treinoStatus(escada, [first])).toBe('vencido');
    expect(treinoStatus(escada, [first, run({ treinoId: escada.id, bpm: 60, accuracy: 1, at: 2, day: '2026-10-02', atTarget: 3 })])).toBe('dominado');
  });

  it('leitura: 90% de primeira e menos de 2 s em 2 dias', () => {
    const good = (day: string) => run({ treinoId: leitura.id, kind: 'locate', firstTry: 0.92, avgMs: 1500, day });
    expect(treinoStatus(leitura, [good('2026-10-01'), good('2026-10-01')])).toBe('andamento');
    expect(treinoStatus(leitura, [good('2026-10-01'), good('2026-10-02')])).toBe('vencido');
  });

  it('a fase termina com a prova em 2 dias diferentes', () => {
    const exam = (day: string) => run({ treinoId: 'prova-1', kind: 'exam', passed: true, day });
    expect(phaseState(f1, [exam('2026-10-01')]).complete).toBe(false);
    expect(phaseState(f1, [exam('2026-10-01'), exam('2026-10-03')]).complete).toBe(true);
  });

  it('aquecimento: sobe o tempo, fica fácil em 3 dias e muda de nível', () => {
    const lvl2 = WARMUP_LEVELS[1];
    const levelUp = run({ treinoId: 'aquecimento', kind: 'level', level: 2, at: 1 });
    expect(currentWarmupLevel([levelUp]).n).toBe(2);
    const w2 = (day: string, bpm: number, at: number) => run({ treinoId: 'aq2-pares', kind: 'warmup', level: 2, clean: true, bpm, day, at });
    expect(warmupTarget(lvl2, [levelUp])).toBe(60);
    expect(warmupTarget(lvl2, [levelUp, w2('2026-10-02', 64, 2)])).toBe(68);
    const easy = [levelUp, w2('2026-10-02', 72, 2), w2('2026-10-03', 72, 3), w2('2026-10-04', 72, 4)];
    expect(warmupIsEasy(lvl2, easy)).toBe(true);
    expect(warmupForDay(WARMUP_LEVELS[0], 1).length).toBe(2);
  });

  it('leitura sobe com 80% em 3 dias', () => {
    const r = (day: string) => run({ treinoId: 'leitura', kind: 'reading', level: 1, accuracy: 0.85, day });
    expect(readingChange(1, [r('2026-10-01'), r('2026-10-02')])).toBeNull();
    expect(readingChange(1, [r('2026-10-01'), r('2026-10-02'), r('2026-10-03')])).toBe('up');
  });
});
