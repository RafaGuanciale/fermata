// Operações do repertório. Todas as telas passam por aqui para gravar.
// A nuvem entra sozinha pelos hooks de src/sync; aqui só cuidamos de baixar o arquivo quando falta.

import { db, type Piece, type StoredFile } from '../db/db';
import { downloadFile } from '../sync/engine';

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
