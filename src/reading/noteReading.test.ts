import { describe, expect, it } from 'vitest';
import { seeded } from '../course/music';
import {
  LEVELS, answerMatches, drawRound, hintFor, isLine, itemKey, masteryOf, nearestLandmark, positionLabel, roundPassed, suggestedLevel, updateStat, wherePhrase, weightOf,
  type NoteStat,
} from './noteReading';

describe('leitura de notas', () => {
  it('nomeia linhas, espaços e suplementares nas duas claves', () => {
    expect(positionLabel(64, 'treble')).toBe('1ª linha');
    expect(positionLabel(67, 'treble')).toBe('2ª linha');
    expect(positionLabel(65, 'treble')).toBe('1º espaço');
    expect(positionLabel(76, 'treble')).toBe('4º espaço');
    expect(positionLabel(62, 'treble')).toBe('espaço logo abaixo da pauta');
    expect(positionLabel(60, 'treble')).toBe('1ª linha suplementar abaixo');
    expect(positionLabel(59, 'treble')).toBe('abaixo da 1ª linha suplementar');
    expect(positionLabel(81, 'treble')).toBe('1ª linha suplementar acima');
    expect(positionLabel(83, 'treble')).toBe('acima da 1ª linha suplementar');
    // Clave de fá: o espaço abaixo da 2ª linha (Si2) é o 1º espaço, Lá2.
    expect(positionLabel(45, 'bass')).toBe('1º espaço');
    expect(positionLabel(53, 'bass')).toBe('4ª linha');
    expect(positionLabel(60, 'bass')).toBe('1ª linha suplementar acima');
    expect(wherePhrase(67, 'treble')).toBe('na 2ª linha');
    expect(wherePhrase(72, 'treble')).toBe('no 3º espaço');
    expect(wherePhrase(62, 'treble')).toBe('no espaço logo abaixo da pauta');
    expect(isLine(60, 'treble')).toBe(true);
  });

  it('dica conta a partir da referência mais perto', () => {
    expect(nearestLandmark(64, 'treble').name).toBe('Sol');
    expect(hintFor(64, 'treble')).toBe('Referência: Sol, na 2ª linha, onde a clave de sol se enrola. Desça 2 posições, alternando linha e espaço: Sol, Fá, Mi. Mi fica na 1ª linha.');
    expect(hintFor(52, 'bass')).toContain('Fá, na 4ª linha');
    expect(hintFor(67, 'treble')).toContain('é uma referência');
  });

  it('níveis só com teclas brancas, dentro da clave', () => {
    expect(LEVELS).toHaveLength(10);
    for (const l of LEVELS) for (const it of l.items) expect([1, 3, 6, 8, 10]).not.toContain(it.midi % 12);
    expect(LEVELS[0].items.map((i) => i.midi)).toEqual([64, 67, 71, 74, 77]);
  });

  it('nota fraca pesa mais; sorteio não repete em seguida', () => {
    const weak: NoteStat = { seen: 5, acc: 0.3, ms: 4000, lastAt: 0 };
    const strong: NoteStat = { seen: 5, acc: 1, ms: 900, lastAt: 0 };
    expect(masteryOf(weak)).toBe('fraca');
    expect(masteryOf(strong)).toBe('forte');
    expect(masteryOf(undefined)).toBe('nova');
    expect(weightOf(weak)).toBeGreaterThan(weightOf(strong) * 4);
    const items = LEVELS[0].items;
    const stats = new Map([[itemKey(items[0]), weak], ...items.slice(1).map((i) => [itemKey(i), strong] as [string, NoteStat])]);
    const round = drawRound(items, stats, 200, seeded(5));
    for (let i = 1; i < round.length; i++) expect(itemKey(round[i])).not.toBe(itemKey(round[i - 1]));
    const weakCount = round.filter((r) => r.midi === items[0].midi).length;
    expect(weakCount).toBeGreaterThan(60);
  });

  it('estatística, resposta e nível', () => {
    let s = updateStat(undefined, true, 1500, 1);
    expect(s).toEqual({ seen: 1, acc: 1, ms: 1500, lastAt: 1 });
    s = updateStat(s, false, 3000, 2);
    expect(s.acc).toBeCloseTo(0.7);
    expect(answerMatches({ clef: 'treble', midi: 64 }, 52, 'nome')).toBe(true);
    expect(answerMatches({ clef: 'treble', midi: 64 }, 52, 'tecla')).toBe(false);
    expect(roundPassed({ firstTry: 18, total: 20, avgMs: 2400 })).toBe(true);
    expect(roundPassed({ firstTry: 17, total: 20, avgMs: 1000 })).toBe(false);
    expect(suggestedLevel(new Set([1, 2]))).toBe(3);
  });
});
