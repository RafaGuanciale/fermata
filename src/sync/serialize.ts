// Conversão entre o registro local (Dexie) e o que vai para a nuvem. Funções puras.
// Ids numéricos são só deste aparelho; entre aparelhos as referências usam `uid`.

export const SYNC_TABLES = ['files', 'pieces', 'lessons', 'sessions', 'attempts'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface Change {
  table: SyncTable;
  uid: string;
  mt: number;
  deleted: boolean;
  data: Record<string, unknown> | null;
}

type Row = Record<string, unknown>;

/** Campos que nunca saem do aparelho. */
const LOCAL_ONLY: Record<SyncTable, string[]> = {
  files: ['id', 'blob'],
  pieces: ['id', 'fileId'],
  lessons: [],
  sessions: ['id'],
  attempts: ['id', 'sessionId'],
};

export interface Refs {
  fileUid?: string | null;
  sessionUid?: string | null;
}

export interface LocalRefs {
  fileId?: number | null;
  sessionId?: number;
}

/** Ordem de aplicação: quem é referenciado vem antes de quem referencia. */
export function tableRank(table: string): number {
  const i = SYNC_TABLES.indexOf(table as SyncTable);
  return i === -1 ? SYNC_TABLES.length : i;
}

export function byTableOrder<T extends { table: string }>(a: T, b: T): number {
  return tableRank(a.table) - tableRank(b.table);
}

/** Na tabela de lições a chave já é global ("modulo/licao"). */
export function uidOf(table: string, row: Row): string | undefined {
  const v = table === 'lessons' ? row.id : row.uid;
  return typeof v === 'string' ? v : undefined;
}

export function toRemoteData(table: SyncTable, row: Row, refs: Refs = {}): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'uid' || k === 'mt' || LOCAL_ONLY[table].includes(k) || v === undefined) continue;
    out[k] = v;
  }
  if (table === 'pieces') out.fileUid = refs.fileUid ?? null;
  if (table === 'attempts') out.sessionUid = refs.sessionUid ?? null;
  return out;
}

export function fromRemoteData(table: SyncTable, change: Pick<Change, 'uid' | 'mt' | 'data'>, local: Row | undefined, refs: LocalRefs = {}): Row {
  const row: Row = { ...(change.data ?? {}), uid: change.uid, mt: change.mt };
  for (const k of LOCAL_ONLY[table]) delete row[k];
  if (local?.id !== undefined && table !== 'lessons') row.id = local.id;
  if (table === 'lessons') row.id = change.uid;
  if (table === 'files') row.blob = local?.blob ?? null;
  if (table === 'pieces') row.fileId = refs.fileId ?? null;
  if (table === 'attempts') row.sessionId = refs.sessionId ?? 0;
  return row;
}

/** Vale a alteração mais recente. Empate: fica a local (já é a mesma). */
export function shouldApply(localMt: unknown, remoteMt: number): boolean {
  return typeof localMt !== 'number' || remoteMt > localMt;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const EXT_BY_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function blobPathname(userId: string, fileUid: string, type: string): string {
  return `fermata/${userId}/${fileUid}.${EXT_BY_TYPE[type] ?? 'bin'}`;
}
