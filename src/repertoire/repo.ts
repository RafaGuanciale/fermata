// Operações do repertório. Todas as telas passam por aqui, nunca direto no banco:
// quando os arquivos forem para a nuvem, só este arquivo muda.

import { db, type Piece, type StoredFile } from '../db/db';

export const ACCEPTED_FILES = 'application/pdf,image/png,image/jpeg,image/webp';
export const MAX_FILE_BYTES = 40 * 1024 * 1024;

export type PieceInput = Omit<Piece, 'id' | 'createdAt' | 'updatedAt' | 'openedAt' | 'fileId'>;

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
async function askPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // sem suporte: segue normal
  }
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED_FILES.split(',').includes(file.type)) return 'Envie um PDF ou uma foto (PNG, JPG ou WEBP).';
  if (file.size > MAX_FILE_BYTES) return 'O arquivo passa de 40 MB. Tente uma versão menor do PDF.';
  return null;
}

/** Cria ou atualiza uma peça. `file`: novo arquivo; `null`: remover o atual; `undefined`: manter. */
export async function savePiece(input: PieceInput, file?: File | null, id?: number): Promise<number> {
  const now = Date.now();
  return db.transaction('rw', db.pieces, db.files, async () => {
    const existing = id ? await db.pieces.get(id) : undefined;
    let fileId = existing?.fileId ?? null;
    if (file !== undefined && fileId) {
      await db.files.delete(fileId);
      fileId = null;
    }
    if (file) {
      const stored: StoredFile = { name: file.name, type: file.type, size: file.size, blob: file, createdAt: now };
      fileId = await db.files.add(stored);
    }
    if (existing?.id) {
      await db.pieces.update(existing.id, { ...input, fileId, updatedAt: now });
      return existing.id;
    }
    return db.pieces.add({ ...input, fileId, createdAt: now, updatedAt: now, openedAt: null });
  }).finally(() => {
    if (file) void askPersistentStorage();
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
    await db.pieces.delete(id);
  });
}

export async function getFile(id: number): Promise<StoredFile | undefined> {
  return db.files.get(id);
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
