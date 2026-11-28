import { describe, expect, it } from 'vitest';
import type { Piece } from '../db/db';
import { COURSE_PIECES, coursePieceRows, findCoursePiece, missingLine, museScoreSearch, pieceInRepertoire, pieceState } from './pieces';
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
    expect(pieceState(piece('Love Me Do', { fileId: 2 }))).toBe('so-pdf');
    expect(pieceState(piece('Love Me Do', { fileUid: 'y' }))).toBe('so-pdf');
  });

  it('com dois arranjos, vale o que tem MusicXML, depois o com PDF, depois o de título igual', () => {
    const nem = findCoursePiece('nothing-else-matters')!;
    const list = [piece('Nothing Else Matters, outro arranjo', { id: 1, fileId: 5 }), piece('Nothing Else Matters', { id: 2, fileId: 6, scoreFileId: 7 })];
    expect(pieceInRepertoire(nem, list)?.id).toBe(2);
    expect(pieceInRepertoire(nem, [piece('Nothing Else Matters, fácil', { id: 3 }), piece('Nothing Else Matters, outro', { id: 4, fileId: 1 })])?.id).toBe(4);
    const hp = findCoursePiece('hes-a-pirate')!;
    expect(pieceInRepertoire(hp, [piece("He's a Pirate, arranjo Lupin", { id: 8, fileId: 1 }), piece("He's a Pirate", { id: 9, fileId: 2 })])?.id).toBe(9);
  });

  it('lista as músicas do curso na ordem das lições, com o que falta de cada uma', () => {
    const rows = coursePieceRows(UNITS, [piece('Let It Be', { id: 1, fileId: 1, scoreFileId: 2 }), piece('Yesterday', { id: 2, fileId: 3 })]);
    const firsts = rows.map((r) => r.lessons[0].n);
    expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
    expect(new Set(rows.map((r) => r.cp.id)).size).toBe(rows.length);
    const byId = Object.fromEntries(rows.map((r) => [r.cp.id, r]));
    expect(byId['let-it-be'].state).toBe('pronta');
    expect(byId['let-it-be'].lessons.length).toBeGreaterThan(3);
    expect(missingLine(byId['let-it-be'])).toBeNull();
    expect(missingLine(byId.yesterday)).toBe('Yesterday (The Beatles) - XML');
    expect(missingLine(byId['love-me-do'])).toBe('Love Me Do (The Beatles) - Partitura - XML');
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
