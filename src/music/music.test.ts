import { describe, expect, it } from 'vitest';
import { ledgerSteps, noteInfo, trebleStep, whiteKeysBetween } from './notes';
import { C_POSITION, generateLocateSequence, seededRandom } from './exercises';
import { createDrill, drillReducer, summarize } from '../drill/drill';
import { avgFindMs, dailyAvgFindMs, firstTryRate, practiceMinutes, startOfWeek, weakestNote } from '../db/stats';
import type { Attempt, Session } from '../db/db';

describe('notes', () => {
  it('nomeia notas em português e em notação científica', () => {
    expect(noteInfo(60)).toMatchObject({ name: 'Dó', sci: 'C4', isBlack: false });
    expect(noteInfo(66)).toMatchObject({ name: 'Fá♯', sci: 'F♯4', isBlack: true });
    expect(noteInfo(21).sci).toBe('A0');
    expect(noteInfo(108).sci).toBe('C8');
  });

  it('posiciona as notas na clave de sol', () => {
    expect(trebleStep(64)).toBe(0); // Mi4, linha de baixo
    expect(trebleStep(60)).toBe(-2); // Dó4, linha suplementar
    expect(trebleStep(77)).toBe(8); // Fá5, linha de cima
    expect(trebleStep(81)).toBe(10); // Lá5, linha suplementar acima
  });

  it('calcula linhas suplementares', () => {
    expect(ledgerSteps(0)).toEqual([]);
    expect(ledgerSteps(-2)).toEqual([-2]);
    expect(ledgerSteps(-3)).toEqual([-2]);
    expect(ledgerSteps(-4)).toEqual([-2, -4]);
    expect(ledgerSteps(10)).toEqual([10]);
  });

  it('lista teclas brancas de uma oitava', () => {
    expect(whiteKeysBetween(60, 72)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });
});

describe('generateLocateSequence', () => {
  it('é reproduzível, usa só as notas pedidas e nunca repete em seguida', () => {
    const a = generateLocateSequence(C_POSITION, 200, seededRandom(7));
    const b = generateLocateSequence(C_POSITION, 200, seededRandom(7));
    expect(a).toEqual(b);
    expect(a).toHaveLength(200);
    for (let i = 0; i < a.length; i++) {
      expect(C_POSITION).toContain(a[i]);
      if (i > 0) expect(a[i]).not.toBe(a[i - 1]);
    }
  });

  it('prefere movimentos curtos, como numa melodia', () => {
    const seq = generateLocateSequence(C_POSITION, 2000, seededRandom(42));
    let short = 0;
    for (let i = 1; i < seq.length; i++) {
      const jump = Math.abs(C_POSITION.indexOf(seq[i]) - C_POSITION.indexOf(seq[i - 1]));
      if (jump <= 2) short++;
    }
    expect(short / (seq.length - 1)).toBeGreaterThan(0.85);
  });
});

describe('drillReducer', () => {
  it('avança no acerto, segura no erro e mede o tempo da nota', () => {
    let s = createDrill([64, 65, 67], 1000);
    s = drillReducer(s, { type: 'press', midi: 64, at: 1800 });
    expect(s.index).toBe(1);
    expect(s.feedback).toEqual({ kind: 'hit', played: 64, ms: 800 });

    s = drillReducer(s, { type: 'press', midi: 67, at: 2500 });
    expect(s.index).toBe(1);
    expect(s.feedback).toEqual({ kind: 'miss', played: 67, expected: 65 });

    s = drillReducer(s, { type: 'press', midi: 65, at: 3000 });
    expect(s.results[1]).toEqual({ expected: 65, wrong: [67], ms: 1200 });

    s = drillReducer(s, { type: 'press', midi: 67, at: 3500 });
    expect(s.feedback).toEqual({ kind: 'done' });
    expect(summarize(s)).toEqual({ done: 3, total: 3, firstTry: 2, misses: 1, avgMs: (800 + 1200 + 500) / 3 });

    const after = drillReducer(s, { type: 'press', midi: 60, at: 4000 });
    expect(after).toBe(s);
  });
});

describe('stats', () => {
  const day = (d: number, h = 12) => new Date(2026, 9, d, h).getTime(); // outubro de 2026
  const sessions: Session[] = [
    { exerciseId: 'x', kind: 'locate', startedAt: day(5), endedAt: day(5) + 10 * 60000, total: 10, firstTry: 6, misses: 5, avgMs: 2000 },
    { exerciseId: 'x', kind: 'locate', startedAt: day(8), endedAt: day(8) + 5 * 60000, total: 10, firstTry: 9, misses: 1, avgMs: 1000 },
  ];
  const attempts: Attempt[] = [
    { sessionId: 1, at: day(5), expected: 65, played: 67, correct: false, ms: null },
    { sessionId: 1, at: day(5), expected: 65, played: 65, correct: true, ms: 3000 },
    { sessionId: 2, at: day(8), expected: 64, played: 64, correct: true, ms: 1000 },
  ];

  it('soma minutos e taxa de primeira por intervalo', () => {
    const week = startOfWeek(day(8));
    expect(new Date(week).getDate()).toBe(5); // segunda, 5 de outubro
    expect(practiceMinutes(sessions, week, week + 7 * 86400000)).toBe(15);
    expect(firstTryRate(sessions, week, week + 7 * 86400000)).toBeCloseTo(0.75);
  });

  it('calcula tempo médio e série diária', () => {
    expect(avgFindMs(attempts, 0, Infinity)).toBe(2000);
    const series = dailyAvgFindMs(attempts, day(8), 4);
    expect(series).toEqual([3000, null, null, 1000]);
  });

  it('acha a nota mais errada só com amostra suficiente', () => {
    expect(weakestNote(attempts)).toBeNull();
    expect(weakestNote(attempts, 1)).toEqual({ midi: 65, missRate: 0.5 });
  });
});

import { spellOnStaff, staffLayout, windowStart } from '../components/staffLayout';

describe('janela da pauta', () => {
  it('mostra tudo no notebook e menos notas, em escala, no celular', () => {
    expect(staffLayout(1100, 15)).toEqual({ scale: 1, visible: 15 });
    const phone = staffLayout(340, 15);
    expect(phone.scale).toBeCloseTo(0.62);
    expect(phone.visible).toBeGreaterThanOrEqual(5);
    expect(phone.visible).toBeLessThan(15);
  });

  it('acompanha a nota ativa sem passar do fim', () => {
    expect(windowStart(0, 6, 15)).toBe(0);
    expect(windowStart(5, 6, 15)).toBe(4);
    expect(windowStart(14, 6, 15)).toBe(9);
  });
});

describe('grafia na armadura', () => {
  it('sustenido, bemol e bequadro conforme a armadura', () => {
    expect(spellOnStaff(66, 'treble')).toMatchObject({ accidental: '♯', name: 'Fá♯' });
    expect(spellOnStaff(66, 'treble', 1)).toMatchObject({ accidental: '', name: 'Fá♯' });
    expect(spellOnStaff(65, 'treble', 1)).toMatchObject({ accidental: '♮', name: 'Fá' });
    const bb = spellOnStaff(70, 'treble', -1);
    expect(bb).toMatchObject({ accidental: '', name: 'Si♭' });
    expect(bb.step).toBe(spellOnStaff(71, 'treble').step);
    expect(spellOnStaff(63, 'treble', -1)).toMatchObject({ accidental: '♭', name: 'Mi♭' });
    expect(spellOnStaff(60, 'treble', 2).accidental).toBe('♮');
    expect(spellOnStaff(61, 'treble', 2).accidental).toBe('');
    // Sensível das menores com bemóis: Dó♯ em Ré menor, Fá♯ em Sol menor.
    expect(spellOnStaff(73, 'treble', -1)).toMatchObject({ accidental: '♯', name: 'Dó♯' });
    expect(spellOnStaff(66, 'treble', -2)).toMatchObject({ accidental: '♯', name: 'Fá♯' });
    expect(spellOnStaff(68, 'treble', -3)).toMatchObject({ accidental: '', name: 'Lá♭' });
  });
});
