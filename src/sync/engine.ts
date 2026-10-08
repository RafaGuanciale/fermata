// Sincronização entre aparelhos.
//
// 1. Hooks do Dexie marcam toda gravação local com `uid` e `mt` e põem a chave na fila (outbox).
//    Nenhuma tela precisa saber que a nuvem existe.
// 2. syncNow() manda a fila para /api/sync e aplica o que veio dos outros aparelhos.
// 3. Partituras: o arquivo sobe direto para o Vercel Blob antes do registro; nos outros aparelhos
//    só baixa quando alguém abre (downloadFile).

import type { Table, Transaction } from 'dexie';
import { db, type OutboxEntry, type StoredFile } from '../db/db';
import { authHeaders, getAccount, logout, readMessage, subscribeAccount, type Account } from './account';
import { setSyncStatus } from './status';
import {
  SYNC_TABLES,
  blobPathname,
  byTableOrder,
  fromRemoteData,
  shouldApply,
  toRemoteData,
  uidOf,
  type Change,
  type SyncTable,
} from './serialize';

type Row = Record<string, unknown>;

const PUSH_BATCH = 200;
/** Na primeira sincronização de cada abertura, pede de novo um pouco do que já veio (cobre corridas entre aparelhos). */
const OVERLAP = 200;
const DEBOUNCE_MS = 4000;
const INTERVAL_MS = 2 * 60 * 1000;

const remoteTx = new WeakSet<Transaction>();
const txBatches = new WeakMap<Transaction, Map<string, OutboxEntry>>();
let stamp = 0;

class AuthError extends Error {}

function table(name: SyncTable): Table<Row, unknown> {
  return db.table(name) as Table<Row, unknown>;
}

function nextVersion(): number {
  stamp = (stamp + 1) % 1000;
  return Date.now() + stamp / 1000;
}

function enqueue(tx: Transaction, tableName: SyncTable, uid: string | undefined, deleted: boolean) {
  if (!uid) return;
  let batch = txBatches.get(tx);
  if (!batch) {
    const fresh = new Map<string, OutboxEntry>();
    txBatches.set(tx, fresh);
    tx.on('complete', () => {
      void db.outbox.bulkPut([...fresh.values()]).then(scheduleSync, () => undefined);
    });
    batch = fresh;
  }
  const key = `${tableName}:${uid}`;
  batch.set(key, { key, table: tableName, uid, deleted, v: nextVersion() });
}

let hooksInstalled = false;

/** Precisa rodar antes de qualquer gravação no banco. */
export function installSyncHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const name of SYNC_TABLES) {
    const t = table(name);
    t.hook('creating', function (_pk, obj, tx) {
      obj.uid ??= name === 'lessons' ? obj.id : crypto.randomUUID();
      if (remoteTx.has(tx)) return;
      obj.mt = Date.now();
      enqueue(tx, name, uidOf(name, obj), false);
    });
    t.hook('updating', function (mods, _pk, obj, tx) {
      if (remoteTx.has(tx)) return undefined;
      enqueue(tx, name, uidOf(name, obj), false);
      const extra: Row = { mt: Date.now() };
      // put() de um objeto sem uid apagaria o uid antigo: devolve.
      if ('uid' in mods && !(mods as unknown as Row).uid) extra.uid = obj.uid ?? uidOf(name, obj);
      return extra;
    });
    t.hook('deleting', function (_pk, obj, tx) {
      if (remoteTx.has(tx)) return;
      enqueue(tx, name, uidOf(name, obj as Row), true);
    });
  }
}

/** Gravações que vieram da nuvem não voltam para a fila. */
async function remoteWrite<T>(fn: () => Promise<T>): Promise<T> {
  return db.transaction('rw', SYNC_TABLES.map((n) => db.table(n)), async (tx) => {
    remoteTx.add(tx);
    return fn();
  });
}

async function getByUid(name: SyncTable, uid: string): Promise<Row | undefined> {
  if (name === 'lessons') return table(name).get(uid);
  return table(name).where('uid').equals(uid).first();
}

async function api<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new TypeError('offline');
  }
  if (res.status === 401) throw new AuthError((await readMessage(res)) ?? 'Sua sessão expirou. Entre de novo.');
  if (!res.ok) throw new Error((await readMessage(res)) ?? 'O servidor não respondeu. Tente de novo em instantes.');
  return (await res.json()) as T;
}

// ---------- arquivos ----------

async function uploadFile(file: StoredFile & { blob: Blob }, acc: Account): Promise<string> {
  const { uploadPresigned } = await import('@vercel/blob/client');
  const result = await uploadPresigned(blobPathname(acc.user.id, file.uid!, file.type), file.blob, {
    access: 'private',
    handleUploadUrl: '/api/blob?action=upload',
    headers: authHeaders(),
    contentType: file.type,
    multipart: file.size > 8 * 1024 * 1024,
  });
  return result.pathname;
}

/** Baixa da nuvem uma partitura que veio de outro aparelho e guarda neste. */
export async function downloadFile(file: StoredFile): Promise<Blob> {
  if (!file.pathname) throw new Error('Este arquivo não está na nuvem.');
  if (!getAccount()) throw new Error('Esta partitura está na nuvem. Entre com sua conta Permana para baixar.');
  let blob: Blob | null = null;
  try {
    const { url } = await api<{ url: string }>('/api/blob?action=url', { pathname: file.pathname });
    const res = await fetch(url);
    if (res.ok) blob = await res.blob();
  } catch (err) {
    if (err instanceof AuthError) throw err;
  }
  if (!blob) {
    // Plano B: o arquivo passa pela função.
    const res = await fetch(`/api/blob?pathname=${encodeURIComponent(file.pathname)}`, { headers: authHeaders() }).catch(() => null);
    if (!res) throw new Error('Sem internet para baixar a partitura agora.');
    if (!res.ok) throw new Error((await readMessage(res)) ?? 'Não deu para baixar a partitura.');
    blob = await res.blob();
  }
  const typed = blob.type ? blob : new Blob([blob], { type: file.type });
  await remoteWrite(() => db.files.update(file.id!, { blob: typed }));
  return typed;
}

// ---------- envio e recebimento ----------

async function buildChange(entry: OutboxEntry, acc: Account): Promise<Change> {
  const name = entry.table as SyncTable;
  const tombstone: Change = { table: name, uid: entry.uid, mt: entry.v, deleted: true, data: null };
  if (entry.deleted) return tombstone;
  const row = await getByUid(name, entry.uid);
  if (!row) return tombstone;

  if (name === 'files') {
    const file = row as unknown as StoredFile;
    if (!file.pathname && file.blob) {
      const pathname = await uploadFile(file as StoredFile & { blob: Blob }, acc);
      await remoteWrite(() => db.files.update(file.id!, { pathname }));
      row.pathname = pathname;
    }
  }

  let refs = {};
  if (name === 'pieces') {
    const fileId = row.fileId as number | null;
    const f = fileId ? await db.files.get(fileId) : undefined;
    refs = { fileUid: f?.uid ?? (row.fileUid as string | null | undefined) ?? null };
  } else if (name === 'attempts') {
    const s = await db.sessions.get(row.sessionId as number);
    refs = { sessionUid: s?.uid ?? (row.sessionUid as string | undefined) ?? null };
  }

  return { table: name, uid: entry.uid, mt: typeof row.mt === 'number' ? row.mt : Date.now(), deleted: false, data: toRemoteData(name, row, refs) };
}

async function applyRemote(changes: Change[]) {
  if (!changes.length) return;
  const sorted = [...changes].sort(byTableOrder);
  await remoteWrite(async () => {
    for (const c of sorted) {
      if (!SYNC_TABLES.includes(c.table)) continue;
      const local = await getByUid(c.table, c.uid);
      if (!shouldApply(local?.mt, c.mt)) continue;
      const t = table(c.table);
      if (c.deleted) {
        if (local) await t.delete(local.id);
        continue;
      }
      let refs = {};
      if (c.table === 'pieces') {
        const fileUid = c.data?.fileUid as string | null | undefined;
        refs = { fileId: fileUid ? ((await db.files.where('uid').equals(fileUid).first())?.id ?? null) : null };
      } else if (c.table === 'attempts') {
        const sessionUid = c.data?.sessionUid as string | null | undefined;
        refs = { sessionId: sessionUid ? ((await db.sessions.where('uid').equals(sessionUid).first())?.id ?? 0) : 0 };
      }
      await t.put(fromRemoteData(c.table, c, local, refs));
    }
  });
}

/** Referências que chegaram antes do registro referenciado (páginas diferentes). */
async function fixRefs() {
  await remoteWrite(async () => {
    const pieces = await db.pieces.filter((p) => !p.fileId && !!p.fileUid).toArray();
    for (const p of pieces) {
      const f = await db.files.where('uid').equals(p.fileUid!).first();
      if (f?.id) await db.pieces.update(p.id!, { fileId: f.id });
    }
    const attempts = await db.attempts.where('sessionId').equals(0).toArray();
    for (const a of attempts) {
      if (!a.sessionUid) continue;
      const s = await db.sessions.where('uid').equals(a.sessionUid).first();
      if (s?.id) await db.attempts.update(a.id!, { sessionId: s.id });
    }
  });
}

/** Primeira vez desta conta neste aparelho: tudo o que já existe aqui sobe. */
async function enqueueEverything() {
  const entries: OutboxEntry[] = [];
  for (const name of SYNC_TABLES) {
    const rows = await table(name).toArray();
    for (const r of rows) {
      const uid = uidOf(name, r);
      if (uid) entries.push({ key: `${name}:${uid}`, table: name, uid, deleted: false, v: nextVersion() });
    }
  }
  await db.outbox.bulkPut(entries);
}

async function removeSent(sent: OutboxEntry[]) {
  if (!sent.length) return;
  await db.transaction('rw', db.outbox, async () => {
    const current = await db.outbox.bulkGet(sent.map((e) => e.key));
    const done = sent.filter((e, i) => current[i]?.v === e.v).map((e) => e.key);
    await db.outbox.bulkDelete(done);
  });
}

interface SyncResponse {
  cursor: number;
  more: boolean;
  changes: Change[];
}

let running: Promise<void> | null = null;
let again = false;
const rewound = new Set<string>();

async function run() {
  const acc = getAccount();
  if (!acc) return;
  setSyncStatus({ phase: 'syncing' });
  const cursorKey = `fermata-sync-cursor:${acc.user.id}`;
  let fileProblem: string | null = null;
  try {
    const saved = Number(localStorage.getItem(cursorKey) ?? NaN);
    let cursor: number;
    if (!Number.isFinite(saved)) {
      await enqueueEverything();
      cursor = 0;
    } else if (!rewound.has(acc.user.id)) {
      cursor = Math.max(0, saved - OVERLAP);
    } else {
      cursor = saved;
    }
    rewound.add(acc.user.id);

    for (let round = 0; round < 500; round++) {
      if (getAccount()?.token !== acc.token) return;
      const entries = (await db.outbox.toArray()).sort(byTableOrder).slice(0, PUSH_BATCH);
      const changes: Change[] = [];
      const sent: OutboxEntry[] = [];
      for (const e of entries) {
        try {
          changes.push(await buildChange(e, acc));
          sent.push(e);
        } catch (err) {
          if (err instanceof AuthError) throw err;
          fileProblem = 'Uma partitura não subiu para a nuvem. Tento de novo depois.';
          console.warn('sync: item não enviado', e.key, err);
        }
      }
      const res = await api<SyncResponse>('/api/sync', { cursor, changes });
      await removeSent(sent);
      await applyRemote(res.changes);
      cursor = res.cursor;
      localStorage.setItem(cursorKey, String(cursor));
      const left = await db.outbox.count();
      if (!res.more && (left === 0 || sent.length === 0)) break;
    }
    await fixRefs();
    setSyncStatus(fileProblem ? { phase: 'error', message: fileProblem } : { phase: 'idle', lastSyncAt: Date.now(), message: null });
  } catch (err) {
    if (err instanceof AuthError) {
      logout(err.message);
      setSyncStatus({ phase: 'off', message: null });
    } else if (err instanceof TypeError || !navigator.onLine) {
      setSyncStatus({ phase: 'offline', message: null });
    } else {
      setSyncStatus({ phase: 'error', message: err instanceof Error ? err.message : 'Não deu para sincronizar.' });
    }
  }
}

export function syncNow(): Promise<void> {
  if (!getAccount()) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = run().finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync() {
  if (!getAccount()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, DEBOUNCE_MS);
}

let started = false;

/** Liga tudo: hooks, sincronização ao abrir, ao voltar para a aba, ao reconectar e a cada 2 min. */
export function startSync() {
  installSyncHooks();
  if (started || typeof window === 'undefined') return;
  started = true;
  const kick = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };
  window.addEventListener('online', kick);
  document.addEventListener('visibilitychange', kick);
  setInterval(kick, INTERVAL_MS);
  let lastToken = getAccount()?.token ?? null;
  subscribeAccount(() => {
    const token = getAccount()?.token ?? null;
    if (token && token !== lastToken) void syncNow();
    if (!token) setSyncStatus({ phase: 'off', lastSyncAt: null });
    lastToken = token;
  });
  if (getAccount()) void syncNow();
}

export { remoteWrite as _remoteWriteForTests, applyRemote as _applyRemoteForTests };
