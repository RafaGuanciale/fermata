// Formato da troca entre aparelho e servidor. Funções puras, testadas em protocol.test.ts.

export const SYNC_TABLES = ['files', 'pieces', 'lessons', 'sessions', 'attempts', 'runs'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface Change {
  table: SyncTable;
  uid: string;
  mt: number;
  deleted: boolean;
  data: Record<string, unknown> | null;
}

export interface SyncRequest {
  cursor: number;
  changes: Change[];
}

export const MAX_CHANGES = 500;
export const PAGE_SIZE = 1000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Valida o corpo do POST /api/sync. Devolve a mensagem de erro, ou o pedido limpo. */
export function parseSyncRequest(body: unknown): SyncRequest | string {
  if (!isRecord(body)) return 'Pedido inválido.';
  const cursor = body.cursor ?? 0;
  if (typeof cursor !== 'number' || !Number.isFinite(cursor) || cursor < 0) return 'Cursor inválido.';
  const raw = body.changes ?? [];
  if (!Array.isArray(raw)) return 'Lista de mudanças inválida.';
  if (raw.length > MAX_CHANGES) return `Mande no máximo ${MAX_CHANGES} mudanças por vez.`;

  const changes: Change[] = [];
  for (const c of raw) {
    if (!isRecord(c)) return 'Mudança inválida.';
    if (!SYNC_TABLES.includes(c.table as SyncTable)) return 'Tabela desconhecida.';
    if (typeof c.uid !== 'string' || !c.uid || c.uid.length > 120) return 'Identificador inválido.';
    if (typeof c.mt !== 'number' || !Number.isFinite(c.mt)) return 'Data de alteração inválida.';
    const deleted = c.deleted === true;
    if (!deleted && !isRecord(c.data)) return 'Mudança sem dados.';
    changes.push({ table: c.table as SyncTable, uid: c.uid, mt: c.mt, deleted, data: deleted ? null : (c.data as Record<string, unknown>) });
  }
  return { cursor, changes };
}

export function recordId(userId: string, table: string, uid: string): string {
  return `${userId}:${table}:${uid}`;
}

/** Pathname de arquivo só vale dentro da pasta do próprio usuário, sem truques de caminho. */
export function isOwnPathname(pathname: unknown, prefix: string): pathname is string {
  return typeof pathname === 'string' && pathname.startsWith(prefix) && !pathname.includes('..') && pathname.length < 300;
}
