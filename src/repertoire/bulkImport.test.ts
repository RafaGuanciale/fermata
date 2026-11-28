import { describe, expect, it } from 'vitest';
import type { Piece } from '../db/db';
import { guessMeta, parseManifest, planImport, titleKey } from './bulkImport';

const piece = (id: number, title: string, extra: Partial<Piece> = {}): Piece => ({
  id, title, people: [], arrangement: '', categories: [], level: 'facil', status: 'wish', fileId: null, createdAt: 0, updatedAt: 0, openedAt: null, ...extra,
});

describe('importar várias músicas', () => {
  it('lê a lista colada: arquivo, título, músicos, nível, categorias e arranjo', () => {
    const m = parseManifest(`# comentário
let-it-be.mxl ; Let It Be ; The Beatles ; fácil ; pop-rock
Sonata.pdf ; Moonlight Sonata, completa ; Beethoven ; Avançado ; classico ; os três movimentos
sem-titulo.pdf`);
    expect(m.size).toBe(2);
    expect(m.get('let-it-be.mxl')).toEqual({ title: 'Let It Be', people: ['The Beatles'], level: 'facil', categories: ['pop-rock'], arrangement: '' });
    expect(m.get('Sonata.pdf')).toMatchObject({ level: 'avancado', categories: ['classico'], arrangement: 'os três movimentos' });
  });

  it('sem lista, tira o título do nome do arquivo e o músico da pasta', () => {
    expect(guessMeta({ name: 'Hes_A_Pirate_-_Piano_Facil.pdf', size: 1, folder: 'Partituras/hans-zimmer' })).toMatchObject({ title: 'Hes A Pirate', people: ['Hans Zimmer'] });
    expect(titleKey('Let It Be (piano fácil)')).toBe(titleKey('let-it-be'));
  });

  it('junta PDF e MusicXML da mesma música e completa a que você já tem, sem trocar arquivo', () => {
    const files = [
      { name: 'let-it-be.mxl', size: 1 },
      { name: 'let-it-be-lead-sheet.pdf', size: 1 },
      { name: 'sorriso.mxl', size: 1 },
      { name: 'Sorriso.pdf', size: 1 },
      { name: 'Skyfall.pdf', size: 1 },
      { name: 'Skyfall_outra.pdf', size: 1 },
      { name: 'leia-me.txt', size: 1 },
    ];
    const manifest = `let-it-be.mxl ; Let It Be ; The Beatles
let-it-be-lead-sheet.pdf ; Let It Be ; The Beatles
sorriso.mxl ; DAN DAN Kokoro Hikareteku ; Field of View
Sorriso.pdf ; DAN DAN Kokoro Hikareteku ; Field of View
Skyfall.pdf ; Skyfall ; Adele
Skyfall_outra.pdf ; Skyfall ; Adele`;
    const pieces = [piece(1, 'Let It Be'), piece(2, 'DAN DAN Kokoro Hikareteku', { fileId: 9 })];
    const rows = planImport(files, pieces, manifest);
    const byTitle = Object.fromEntries(rows.map((r) => [r.title, r]));
    expect(rows).toHaveLength(3);
    expect(byTitle['Let It Be']).toMatchObject({ action: 'completar', existingId: 1, score: 0, sheet: 1, extra: [] });
    expect(byTitle['DAN DAN Kokoro Hikareteku']).toMatchObject({ action: 'completar', existingId: 2, score: 2, sheet: undefined, extra: [3] });
    expect(byTitle['Skyfall']).toMatchObject({ action: 'nova', sheet: 4, extra: [5], people: ['Adele'] });
  });

  it('não faz nada quando a música já tem os dois arquivos', () => {
    const rows = planImport([{ name: 'a.pdf', size: 1 }], [piece(1, 'Canon in D', { fileId: 1, scoreFileId: 2 })], 'a.pdf ; Canon in D ; Pachelbel');
    expect(rows[0]).toMatchObject({ action: 'nada', existingId: 1, extra: [0] });
  });
});
