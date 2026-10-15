import { describe, expect, it } from 'vitest';
import { ARCADE_SONGS } from './songs';
import { buildChart, chartRange, comboMilestone, expire, gradeOf, hit, multiplier, startState, summarize, waitingAt } from './arcade';

describe('arcade', () => {
  it('toda música abre, compassos fecham e cabe num teclado de até 3 oitavas', () => {
    const ids = new Set<string>();
    for (const s of ARCADE_SONGS) {
      expect(ids.has(s.id), s.id).toBe(false);
      ids.add(s.id);
      const chart = buildChart(s);
      expect(chart.length, s.id).toBeGreaterThan(6);
      for (let i = 1; i < chart.length; i++) expect(chart[i].t, s.id).toBeGreaterThan(chart[i - 1].t);
      const [low, high] = chartRange(chart);
      expect(high - low, s.id).toBeLessThanOrEqual(36);
      expect(low, s.id).toBeGreaterThanOrEqual(48);
    }
  });

  it('julga, pontua com combo e não castiga tecla errada além do combo', () => {
    const chart = buildChart(ARCADE_SONGS[0]);
    expect(gradeOf(30)).toBe('perfeito');
    expect(gradeOf(-120)).toBe('bom');
    expect(gradeOf(200)).toBe('ok');
    expect(multiplier(9)).toBe(1);
    expect(multiplier(10)).toBe(2);
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
    expect(comboMilestone(9, 10)).toBe('10 seguidas');
    expect(comboMilestone(10, 11)).toBeNull();
  });
});
