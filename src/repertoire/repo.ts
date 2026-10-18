// Operações do repertório. Todas as telas passam por aqui para gravar.
// A nuvem entra sozinha pelos hooks de src/sync; aqui só cuidamos de baixar o arquivo quando falta.

import { db, type Piece, type StoredFile } from '../db/db';
import { downloadFile } from '../sync/engine';
import type { PathSong } from './path';

export const ACCEPTED_FILES = 'application/pdf,image/png,image/jpeg,image/webp';
export const MAX_FILE_BYTES = 40 * 1024 * 1024;

export type PieceInput = Omit<Piece, 'id' | 'createdAt' | 'updatedAt' | 'openedAt' | 'fileId' | 'fileUid' | 'scoreFileId' | 'scoreFileUid' | 'uid' | 'mt'>;

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
async function askPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // sem suporte: segue normal
  }
}

export const ACCEPTED_SCORE = '.mxl,.musicxml,.xml';
const MAX_SCORE_BYTES = 5 * 1024 * 1024;

/** Tipo do MusicXML pela extensão (o navegador costuma não saber). null = não é MusicXML. */
export function scoreType(name: string): string | null {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'mxl') return 'application/vnd.recordare.musicxml';
  if (ext === 'musicxml' || ext === 'xml') return 'application/vnd.recordare.musicxml+xml';
  return null;
}

export function validateScoreFile(file: File): string | null {
  if (!scoreType(file.name)) return 'Envie o arquivo exportado do MuseScore em MusicXML (.mxl ou .musicxml).';
  if (file.size > MAX_SCORE_BYTES) return 'O MusicXML passa de 5 MB. Exporte em .mxl, que é compactado.';
  return null;
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED_FILES.split(',').includes(file.type)) return 'Envie um PDF ou uma foto (PNG, JPG ou WEBP).';
  if (file.size > MAX_FILE_BYTES) return 'O arquivo passa de 40 MB. Tente uma versão menor do PDF.';
  return null;
}

export interface PieceFiles {
  /** Partitura para ler (PDF ou foto). Novo arquivo, `null` para remover, ausente para manter. */
  sheet?: File | null;
  /** MusicXML para tocar junto. Mesmas regras. */
  score?: File | null;
}

/** Cria ou atualiza uma peça e seus arquivos. */
export async function savePiece(input: PieceInput, files: PieceFiles = {}, id?: number): Promise<number> {
  const now = Date.now();
  const store = async (file: File, type: string) =>
    db.files.add({ name: file.name, type, size: file.size, blob: new Blob([file], { type }), createdAt: now } satisfies StoredFile);
  return db.transaction('rw', db.pieces, db.files, async () => {
    const existing = id ? await db.pieces.get(id) : undefined;
    let fileId = existing?.fileId ?? null;
    let scoreFileId = existing?.scoreFileId ?? null;
    if (files.sheet !== undefined && fileId) {
      await db.files.delete(fileId);
      fileId = null;
    }
    if (files.sheet) fileId = await store(files.sheet, files.sheet.type);
    if (files.score !== undefined && scoreFileId) {
      await db.files.delete(scoreFileId);
      scoreFileId = null;
    }
    if (files.score) scoreFileId = await store(files.score, scoreType(files.score.name) ?? 'application/vnd.recordare.musicxml+xml');
    if (existing?.id) {
      await db.pieces.update(existing.id, { ...input, fileId, scoreFileId, updatedAt: now });
      return existing.id;
    }
    return db.pieces.add({ ...input, fileId, scoreFileId, createdAt: now, updatedAt: now, openedAt: null });
  }).finally(() => {
    if (files.sheet || files.score) void askPersistentStorage();
  });
}

export async function setStatus(id: number, status: Piece['status']) {
  await db.pieces.update(id, { status, updatedAt: Date.now() });
}

export async function setPieceBpm(id: number, bpm: number | null) {
  await db.pieces.update(id, { bpm, updatedAt: Date.now() });
}

export async function markOpened(id: number) {
  await db.pieces.update(id, { openedAt: Date.now() });
}

export async function deletePiece(id: number) {
  await db.transaction('rw', db.pieces, db.files, async () => {
    const p = await db.pieces.get(id);
    if (p?.fileId) await db.files.delete(p.fileId);
    if (p?.scoreFileId) await db.files.delete(p.scoreFileId);
    await db.pieces.delete(id);
  });
}

/**
 * Põe uma música do caminho no seu repertório como "Quero aprender". As de domínio público vêm com a partitura
 * do app (public/library); as outras ficam sem partitura até você importar em Editar.
 */
export async function addPathSong(song: PathSong): Promise<number> {
  let score: File | undefined;
  if (song.file) {
    const res = await fetch(song.file.path);
    if (!res.ok) throw new Error('Não deu para baixar a partitura. Tente de novo com internet.');
    score = new File([await res.blob()], song.file.name, { type: 'application/vnd.recordare.musicxml' });
  }
  return savePiece(
    { title: song.title, people: song.people, arrangement: song.file?.source ?? '', categories: song.categories, level: song.level, status: 'wish', bpm: song.bpm ?? null, pathId: song.id },
    score ? { score } : {},
  );
}

const SEED_KEY = 'fermata-path-seeded-v1';

/** Já trouxe os dados da nuvem pelo menos uma vez neste aparelho? (senão o caminho poderia duplicar músicas) */
function syncedOnce(): boolean {
  try {
    const acc = JSON.parse(localStorage.getItem('fermata-account') ?? 'null') as { user?: { id?: string } } | null;
    return Boolean(acc?.user?.id && localStorage.getItem(`fermata-sync-cursor:${acc.user.id}`) !== null);
  } catch {
    return false;
  }
}

let syncing: Promise<void> | null = null;

/**
 * Deixa o caminho no repertório: põe as músicas que faltam (uma vez por aparelho, depois da primeira
 * sincronização; se você apagar uma depois, ela não volta) e troca os títulos antigos traduzidos pelo original,
 * com a partitura nova junto.
 */
export function syncPath(): Promise<void> {
  syncing ??= (async () => {
    const { PATH_SONGS, OLD_PATH_TITLES, findPathPiece } = await import('./path');
    const pieces = await db.pieces.toArray();
    for (const song of PATH_SONGS) {
      const piece = findPathPiece(song, pieces);
      if (piece?.id && piece.pathId === song.id && OLD_PATH_TITLES[song.id]?.includes(piece.title)) {
        let score: File | undefined;
        if (song.file) {
          const res = await fetch(song.file.path).catch(() => null);
          if (res?.ok) score = new File([await res.blob()], song.file.name, { type: 'application/vnd.recordare.musicxml' });
        }
        await savePiece({ ...piece, title: song.title }, score ? { score } : {}, piece.id);
      }
    }
    let seeded = false;
    try {
      seeded = localStorage.getItem(SEED_KEY) === '1';
    } catch {
      return;
    }
    if (seeded || !syncedOnce()) return;
    const now = await db.pieces.toArray();
    for (const song of PATH_SONGS) if (!findPathPiece(song, now)) await addPathSong(song);
    localStorage.setItem(SEED_KEY, '1');
  })()
    .catch((err) => console.error('[Fermata] Não foi possível montar o caminho no repertório', err))
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

/** Devolve a partitura com o arquivo. Se ela veio de outro aparelho, baixa da nuvem na primeira vez. */
export async function getFile(id: number): Promise<(StoredFile & { blob: Blob }) | undefined> {
  const file = await db.files.get(id);
  if (!file) return undefined;
  if (file.blob) return file as StoredFile & { blob: Blob };
  const blob = await downloadFile(file);
  return { ...file, blob };
}

/** Onde a partitura está, em palavras. */
export function fileWhere(file: Pick<StoredFile, 'blob' | 'pathname'>): string {
  if (file.blob && file.pathname) return 'neste aparelho e na nuvem';
  if (file.blob) return 'salvo neste aparelho';
  return 'na nuvem, baixa ao abrir';
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
