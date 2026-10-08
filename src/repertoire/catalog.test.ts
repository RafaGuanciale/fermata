import { describe, expect, it } from 'vitest';
import { initials, matchesQuery, musiciansOf, normalize, parsePeople } from './catalog';
import type { Piece } from '../db/db';

const piece = (over: Partial<Piece>): Piece => ({
  title: 'Asa Branca', people: ['Luiz Gonzaga', 'Humberto Teixeira'], arrangement: 'arr. Lucas Pinhel', categories: ['mpb'],
  level: 'facil', status: 'wish', fileId: null, createdAt: 0, updatedAt: 0, openedAt: null, ...over,
});

describe('parsePeople', () => {
  it('separa por vírgula, ponto e vírgula e " e " antes de nome', () => {
    expect(parsePeople('Luiz Gonzaga, Humberto Teixeira')).toEqual(['Luiz Gonzaga', 'Humberto Teixeira']);
    expect(parsePeople('Tom Jobim e Vinicius de Moraes')).toEqual(['Tom Jobim', 'Vinicius de Moraes']);
    expect(parsePeople(' Beethoven ;  beethoven ')).toEqual(['Beethoven']);
    expect(parsePeople('')).toEqual([]);
  });
});

describe('busca', () => {
  it('ignora acento e caixa e procura em título, pessoas e categoria', () => {
    expect(normalize('Ode à Alegria')).toBe('ode a alegria');
    expect(matchesQuery(piece({ title: 'Ode à Alegria', people: ['Beethoven'], categories: ['classico'] }), 'ode a alegria')).toBe(true);
    expect(matchesQuery(piece({}), 'gonzaga')).toBe(true);
    expect(matchesQuery(piece({}), 'brasileira')).toBe(true); // categoria "MPB e brasileira"
    expect(matchesQuery(piece({}), 'jazz')).toBe(false);
  });
});

describe('musiciansOf', () => {
  it('agrupa sem diferenciar acento e ordena por quantidade', () => {
    const list = musiciansOf([
      piece({}),
      piece({ title: 'Xote das Meninas', people: ['Luiz Gonzaga'] }),
      piece({ title: 'Für Elise', people: ['Beethoven'] }),
    ]);
    expect(list[0]).toEqual({ name: 'Luiz Gonzaga', count: 2 });
    expect(list.map((m) => m.name)).toEqual(['Luiz Gonzaga', 'Beethoven', 'Humberto Teixeira']);
  });

  it('gera iniciais', () => {
    expect(initials('Luiz Gonzaga')).toBe('LG');
    expect(initials('Vinicius de Moraes')).toBe('VM');
    expect(initials('Beethoven')).toBe('B');
  });
});
