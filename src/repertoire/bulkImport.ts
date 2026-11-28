// Importar várias músicas de uma vez: junta os arquivos de cada música (PDF ou foto para ler, MusicXML para tocar
// junto), dá título, músicos, nível e categorias, e diz se é música nova ou se completa uma que já está no repertório.
// Puro e testado (bulkImport.test.ts); a tela (BulkImportPage) só desenha e grava pelo repo.

import type { Level, Piece } from '../db/db';
import { normalize, parsePeople } from './catalog';

export interface ImportFile {
  name: string;
  size: number;
  /** Pasta de onde veio (quando a escolha foi de uma pasta inteira). */
  folder?: string;
}

export interface ImportMeta {
  title: string;
  people: string[];
  level: Level;
  categories: string[];
  arrangement: string;
}

export type ImportAction = 'nova' | 'completar' | 'nada';

export interface ImportRow extends ImportMeta {
  key: string;
  /** Índice do arquivo para ler (PDF ou foto). */
  sheet?: number;
  /** Índice do MusicXML. */
  score?: number;
  /** Arquivos a mais da mesma música, que ficam de fora (uma música guarda um PDF e um MusicXML). */
  extra: number[];
  existingId?: number;
  action: ImportAction;
}

const SHEET_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
const SCORE_EXT = ['mxl', 'musicxml', 'xml'];
const LEVELS: Level[] = ['facil', 'intermediario', 'avancado'];

const ext = (name: string) => name.toLowerCase().split('.').pop() ?? '';
export const isSheetFile = (name: string) => SHEET_EXT.includes(ext(name));
export const isScoreFile = (name: string) => SCORE_EXT.includes(ext(name));

export function sheetMime(name: string): string {
  const e = ext(name);
  if (e === 'pdf') return 'application/pdf';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  return `image/${e}`;
}

/**
 * Lista colada, uma linha por arquivo: `arquivo ; título ; músicos ; nível ; categorias ; arranjo`.
 * Só o arquivo e o título são obrigatórios. Nível: fácil, intermediário ou avançado. Categorias pelo slug, com vírgula.
 * Linhas vazias e começadas por # são ignoradas.
 */
export function parseManifest(text: string): Map<string, ImportMeta> {
  const out = new Map<string, ImportMeta>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [file, title, people = '', level = '', cats = '', arrangement = ''] = line.split(';').map((s) => s.trim());
    if (!file || !title) continue;
    const lv = normalize(level).replace(/[^a-z]/g, '') as Level;
    out.set(file, {
      title,
      people: parsePeople(people),
      level: LEVELS.includes(lv) ? lv : 'facil',
      categories: cats.split(',').map((c) => c.trim()).filter(Boolean),
      arrangement,
    });
  }
  return out;
}

const NOISE = /\b(piano|facil|easy|beginner|intermediario|arr|lupin|sheet|music|partitura|for|de|do|da|com)\b/g;

/** Título a partir do nome do arquivo, quando não há lista: "Hes_A_Pirate_-_Piano_Facil.pdf" → "Hes A Pirate". */
export function guessMeta(file: ImportFile): ImportMeta {
  const base = file.name.replace(/\.[^.]+$/, '');
  const [first] = base.split(/\s+-\s+|_-_/);
  const title = first.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const folder = (file.folder ?? '').split('/').filter(Boolean).pop() ?? '';
  const people = folder ? [folder.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())] : [];
  const level: Level = /intermedi/i.test(base) ? 'intermediario' : 'facil';
  return { title: title.replace(/\b\w/g, (c) => c.toUpperCase()), people, level, categories: [], arrangement: '' };
}

/** Chave que junta os arquivos da mesma música: o título sem acento, sem caixa e sem palavras como "piano" e "fácil". */
export function titleKey(title: string): string {
  return normalize(title).replace(/[^a-z0-9 ]+/g, ' ').replace(NOISE, ' ').replace(/\s+/g, ' ').trim();
}

/** Monta as músicas a importar. Com lista, o título dela manda (arquivos com o mesmo título viram uma música só). */
export function planImport(files: ImportFile[], pieces: Piece[], manifestText = ''): ImportRow[] {
  const manifest = parseManifest(manifestText);
  const rows = new Map<string, ImportRow>();
  files.forEach((f, i) => {
    if (!isSheetFile(f.name) && !isScoreFile(f.name)) return;
    const meta = manifest.get(f.name) ?? manifest.get(f.name.toLowerCase()) ?? guessMeta(f);
    const key = titleKey(meta.title);
    let row = rows.get(key);
    if (!row) {
      row = { ...meta, key, extra: [], action: 'nova' };
      rows.set(key, row);
    } else {
      // Dados da lista valem mais que o palpite pelo nome do arquivo.
      if (manifest.has(f.name)) Object.assign(row, { ...meta, key });
    }
    const slot = isScoreFile(f.name) ? 'score' : 'sheet';
    if (row[slot] === undefined) row[slot] = i;
    else row.extra.push(i);
  });

  for (const row of rows.values()) {
    const existing = pieces.find((p) => titleKey(p.title) === row.key);
    if (!existing) continue;
    row.existingId = existing.id;
    // Nunca troca o arquivo que já está lá: só completa o que falta.
    if (row.sheet !== undefined && existing.fileId) {
      row.extra.push(row.sheet);
      row.sheet = undefined;
    }
    if (row.score !== undefined && existing.scoreFileId) {
      row.extra.push(row.score);
      row.score = undefined;
    }
    row.action = row.sheet !== undefined || row.score !== undefined ? 'completar' : 'nada';
  }
  return [...rows.values()].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}
