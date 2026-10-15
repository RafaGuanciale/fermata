import { describe, expect, it } from 'vitest';
import { parseLine } from '../course/music';
import { ARCADE_SONGS } from './songs';
import {
  DIFFICULTIES, WINDOWS_BY, buildChart, chartRange, comboMilestone, easyPick, expire, gradeOf, hit, isHold, mergeHands, multiplier,
  multiplierFill, release, songChart, startState, summarize, sustain, waitingAt, type ChartNote,
} from './arcade';

const totalBeats = (line: string) => parseLine(line).reduce((s, n) => s + n.beats, 0);

describe('arcade', () => {
  it('toda música abre nas três dificuldades e cabe num teclado de 3 oitavas', () => {
    const ids = new Set<string>();
    for (const s of ARCADE_SONGS) {
      expect(ids.has(s.id), s.id).toBe(false);
      ids.add(s.id);
      expect(Math.abs(totalBeats(s.bass) - totalBeats(s.melody)), `${s.id}: baixo e melodia com o mesmo tamanho`).toBeLessThan(1e-6);
      const counts = DIFFICULTIES.map((d) => songChart(s, d.id).length);
      expect(counts[0], s.id).toBeGreaterThan(3);
      expect(counts[0], s.id).toBeLessThanOrEqual(counts[1]);
      expect(counts[1], s.id).toBeLessThan(counts[2]);
      for (const d of DIFFICULTIES) {
        const chart = songChart(s, d.id);
        for (let i = 1; i < chart.length; i++) expect(chart[i].t, `${s.id} ${d.id}`).toBeGreaterThanOrEqual(chart[i - 1].t);
        const [low, high] = chartRange(chart);
        expect(high - low, `${s.id} ${d.id}`).toBeLessThanOrEqual(36);
        expect(low, `${s.id} ${d.id}`).toBeGreaterThanOrEqual(36);
        expect(high, `${s.id} ${d.id}`).toBeLessThanOrEqual(96);
      }
      // No médio a mão direita nunca tem duas notas juntas; no difícil, nunca a mesma tecla duas vezes no mesmo instante.
      const med = songChart(s, 'medio');
      for (let i = 1; i < med.length; i++) expect(med[i].t, s.id).toBeGreaterThan(med[i - 1].t);
      const hard = songChart(s, 'dificil');
      expect(new Set(hard.map((n) => `${n.midi}@${Math.round(n.t)}`)).size, s.id).toBe(hard.length);
    }
  });

  it('fácil: no máximo uma nota por tempo, e a longa ganha da curta', () => {
    const notes = [
      { beat: 0, beats: 0.25 }, { beat: 0.25, beats: 0.25 }, { beat: 0.5, beats: 2.5 }, { beat: 3, beats: 0.5 }, { beat: 3.5, beats: 0.5 }, { beat: 4, beats: 1 },
    ];
    expect(easyPick(notes)).toEqual([{ beat: 0.5, beats: 2.5 }, { beat: 3, beats: 0.5 }, { beat: 4, beats: 1 }]);
  });

  it('junta as mãos sem repetir tecla no mesmo instante', () => {
    const a: ChartNote[] = [{ midi: 60, t: 0, dur: 100, hand: 'r' }];
    const b: ChartNote[] = [{ midi: 60, t: 0, dur: 100, hand: 'l' }, { midi: 48, t: 0, dur: 100, hand: 'l' }];
    expect(mergeHands(a, b).map((n) => n.midi)).toEqual([60, 48]);
  });

  it('julga, pontua com combo e não castiga tecla errada além do combo', () => {
    const chart = buildChart(ARCADE_SONGS.find((s) => s.id === 'brilha')!);
    expect(gradeOf(30)).toBe('perfeito');
    expect(gradeOf(-120)).toBe('bom');
    expect(gradeOf(200)).toBe('ok');
    expect(gradeOf(200, WINDOWS_BY.dificil)).toBe('perdeu');
    expect(gradeOf(240, WINDOWS_BY.facil)).toBe('ok');
    expect(multiplier(9)).toBe(1);
    expect(multiplier(10)).toBe(2);
    expect(multiplier(30)).toBe(4);
    expect(multiplier(99)).toBe(4);
    expect(multiplierFill(15)).toBeCloseTo(0.5);
    expect(multiplierFill(40)).toBe(1);
    let s = startState(chart);
    const a = hit(chart, s, chart[0].midi, chart[0].t + 20);
    expect(a.grade).toBe('perfeito');
    expect(a.state.score).toBe(100);
    s = a.state;
    const wrong = hit(chart, s, 99, chart[1].t);
    expect(wrong.index).toBeNull();
    expect(wrong.state.score).toBe(100);
    expect(wrong.state.combo).toBe(0);
    s = expire(chart, s, chart[3].t + 500);
    expect(s.results[1]).toBe('perdeu');
  });

  it('nota longa: segurar soma pontos; soltar antes perde o resto', () => {
    const chart: ChartNote[] = [{ midi: 60, t: 0, dur: 1000, hand: 'r' }, { midi: 62, t: 2000, dur: 1000, hand: 'r' }];
    expect(isHold(chart[0])).toBe(true);
    let s = hit(chart, startState(chart), 60, 0).state;
    expect(s.holds[0]).toBe('segurando');
    s = sustain(chart, s, 500);
    expect(s.score).toBeCloseTo(100 + 60);
    s = sustain(chart, s, 1200);
    expect(s.holds[0]).toBe('inteira');
    expect(s.score).toBeCloseTo(100 + 120);
    s = hit(chart, s, 62, 2000).state;
    s = release(chart, s, 62, 2300);
    expect(s.holds[1]).toBe('soltou');
    expect(s.score).toBeCloseTo(220 + 100 + 36);
    s = sustain(chart, s, 3000);
    expect(s.score).toBeCloseTo(356);
    expect(summarize(s).held).toBeCloseTo(0.5);
    // Soltar quase no fim ainda vale como inteira.
    let k = hit(chart, startState(chart), 60, 0).state;
    k = release(chart, k, 60, 900);
    expect(k.holds[0]).toBe('inteira');
  });

  it('sem pressa: para na nota que chegou e não foi tocada', () => {
    const chart = buildChart(ARCADE_SONGS[0]);
    const s = startState(chart);
    expect(waitingAt(chart, s, -100)).toBeNull();
    expect(waitingAt(chart, s, chart[0].t + 5)).toBe(chart[0].t);
  });

  it('resumo e marcas de combo', () => {
    const chart = buildChart(ARCADE_SONGS[0]);
    const all = { ...startState(chart), results: chart.map(() => 'perfeito' as const) };
    expect(summarize(all).stars).toBe(3);
    expect(comboMilestone(9, 10)).toBe('Multiplicador ×2');
    expect(comboMilestone(29, 30)).toBe('Multiplicador ×4');
    expect(comboMilestone(49, 50)).toBe('50 seguidas');
    expect(comboMilestone(10, 11)).toBeNull();
  });
});
