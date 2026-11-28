import { describe, expect, it } from 'vitest';
import type { Piece } from '../db/db';
import { COURSE_PIECES, findCoursePiece, museScoreSearch, pieceInRepertoire, pieceState } from './pieces';
import { UNITS, findSong } from '.';

const piece = (title: string, extra: Partial<Piece> = {}): Piece => ({
  id: 1, title, people: [], arrangement: '', categories: [], level: 'facil', status: 'wish', fileId: null, createdAt: 0, updatedAt: 0, openedAt: null, ...extra,
});

describe('músicas protegidas do curso', () => {
  it('ids únicos, e o catálogo só tem nome e busca (nunca notas)', () => {
    const ids = COURSE_PIECES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of COURSE_PIECES) {
      for (const k of Object.keys(c)) expect(['aliases', 'categories', 'id', 'kind', 'level', 'part', 'people', 'search', 'title']).toContain(k);
      expect(c.search.length).toBeGreaterThan(3);
    }
  });

  it('acha a sua música pelo título ou por um apelido, sem acento e sem caixa', () => {
    const lmd = findCoursePiece('love-me-do')!;
    expect(pieceInRepertoire(lmd, [piece('Outra'), piece('love me do (arr. fácil)', { id: 7 })])?.id).toBe(7);
    const raiders = findCoursePiece('raiders-march')!;
    expect(pieceInRepertoire(raiders, [piece('Tema de Indiana Jones', { id: 3 })])?.id).toBe(3);
    expect(pieceInRepertoire(lmd, [piece('Let It Be')])).toBeNull();
  });

  it('diz se falta pôr no repertório, falta a partitura ou já dá para tocar junto', () => {
    expect(pieceState(null)).toBe('fora');
    expect(pieceState(piece('Love Me Do'))).toBe('sem-partitura');
    expect(pieceState(piece('Love Me Do', { scoreFileId: 4 }))).toBe('pronta');
    expect(pieceState(piece('Love Me Do', { scoreFileUid: 'x' }))).toBe('pronta');
  });

  it('a busca no MuseScore vai com o texto codificado', () => {
    expect(museScoreSearch(findCoursePiece('hes-a-pirate')!)).toBe("https://musescore.com/sheetmusic?text=He's%20a%20Pirate%20easy%20piano");
  });

  it('toda música de lição existe: no curso ou no catálogo', () => {
    for (const u of UNITS) {
      for (const l of u.lessons) {
        for (const m of l.music ?? []) {
          if ('song' in m) expect(findSong(m.song), `${l.id}: ${m.song}`).toBeTruthy();
          else expect(findCoursePiece(m.piece), `${l.id}: ${m.piece}`).toBeTruthy();
          expect(m.why.length).toBeGreaterThan(10);
        }
      }
    }
  });
});
