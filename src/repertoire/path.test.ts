import { describe, expect, it } from 'vitest';
import type { Piece } from '../db/db';
import { PATH_PHASES, PATH_SONGS, nextOnPath, pathItems } from './path';

const piece = (over: Partial<Piece>): Piece => ({
  id: 1, title: 'x', people: [], arrangement: '', categories: [], level: 'facil', status: 'learning', fileId: null, createdAt: 0, updatedAt: 0, openedAt: null, ...over,
});

describe('caminho de repertório', () => {
  it('dez músicas em cinco fases, em ordem; as de domínio público trazem a partitura e a fonte', () => {
    expect(PATH_SONGS.length).toBe(10);
    expect(PATH_SONGS.map((s) => s.phase)).toEqual([...PATH_SONGS.map((s) => s.phase)].sort((a, b) => a - b));
    expect(new Set(PATH_SONGS.map((s) => s.phase)).size).toBe(PATH_PHASES.length);
    const files = PATH_SONGS.filter((s) => s.file).map((s) => s.id);
    expect(files).toEqual(['gymnopedie', 'fur-elise', 'moonlight', 'clair']);
    for (const s of PATH_SONGS) if (s.file) expect(s.file.source).toMatch(/domínio público|CC BY/);
  });

  it('acha a música no seu repertório pelo título ou pela marca, e diz o estado', () => {
    const items = pathItems([
      piece({ id: 1, title: 'Ode to Joy', status: 'learning', scoreFileId: 9 }),
      piece({ id: 2, title: 'Moonlight Sonata (1º mov.)', status: 'wish' }),
      piece({ id: 3, title: 'Qualquer', status: 'learned', pathId: 'let-it-be' }),
    ]);
    const by = Object.fromEntries(items.map((i) => [i.song.id, i]));
    expect(by.ode.piece?.id).toBe(1);
    expect(by.ode.state).toBe('aprendendo');
    expect(by.ode.playable).toBe(true);
    expect(by.moonlight.state).toBe('meta');
    expect(by.moonlight.playable).toBe(false);
    expect(by['let-it-be'].state).toBe('aprendida');
    expect(by.clair.state).toBe('fora');
    expect(nextOnPath(items)?.song.id).toBe('ode');
  });

  it('sem a sua Ode, a do curso serve para tocar', () => {
    const ode = pathItems([]).find((i) => i.song.id === 'ode')!;
    expect(ode.playable).toBe(true);
    expect(ode.song.courseSong).toBe('u01-ode-8');
  });
});
