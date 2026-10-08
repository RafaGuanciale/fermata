// POST /api/sync  { cursor, changes }  →  { cursor, more, changes }
// Cada chamada envia até 500 mudanças do aparelho e devolve uma página do que mudou desde `cursor`.
// Regra de conflito: vale a alteração mais recente (campo `mt`).

import { del } from '@vercel/blob';
import { MongoBulkWriteError } from 'mongodb';
import { blobPrefix, requireUser } from './_lib/auth.js';
import { HttpError, fail, json, readJson } from './_lib/http.js';
import { getDb, type Counter, type SyncRecord } from './_lib/mongo.js';
import { PAGE_SIZE, isOwnPathname, parseSyncRequest, recordId } from './_lib/protocol.js';

export const config = { maxDuration: 30 };

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireUser(request);
    const parsed = parseSyncRequest(await readJson<unknown>(request));
    if (typeof parsed === 'string') throw new HttpError(400, parsed);
    const { cursor, changes } = parsed;

    const db = await getDb();
    const records = db.collection<SyncRecord>('records');

    if (changes.length) {
      // Arquivos apagados: guarda o caminho no Blob antes de sobrescrever o registro.
      const fileDeletes = changes.filter((c) => c.table === 'files' && c.deleted).map((c) => recordId(user.id, c.table, c.uid));
      const before = fileDeletes.length ? await records.find({ _id: { $in: fileDeletes } }).toArray() : [];

      const counter = await db
        .collection<Counter>('counters')
        .findOneAndUpdate({ _id: user.id }, { $inc: { seq: changes.length } }, { upsert: true, returnDocument: 'after' });
      const last = counter?.seq ?? changes.length;
      const first = last - changes.length + 1;

      try {
        await records.bulkWrite(
          changes.map((c, i) => ({
            updateOne: {
              filter: { _id: recordId(user.id, c.table, c.uid), mt: { $lt: c.mt } },
              update: { $set: { userId: user.id, table: c.table, uid: c.uid, mt: c.mt, deleted: c.deleted, data: c.data, seq: first + i } },
              upsert: true,
            },
          })),
          { ordered: false },
        );
      } catch (err) {
        // Chave duplicada = o servidor já tinha uma versão mais nova. Não é erro.
        const onlyDuplicates = err instanceof MongoBulkWriteError && [err.writeErrors].flat().every((e) => e.code === 11000);
        if (!onlyDuplicates) throw err;
      }

      if (before.length) {
        const won = await records.find({ _id: { $in: fileDeletes }, deleted: true, seq: { $gte: first, $lte: last } }).toArray();
        const wonIds = new Set(won.map((r) => r._id));
        const prefix = blobPrefix(user);
        const paths = before.filter((r) => wonIds.has(r._id)).map((r) => r.data?.pathname).filter((p): p is string => isOwnPathname(p, prefix));
        if (paths.length) await del(paths).catch((err) => console.error('blob del', err));
      }
    }

    const page = await records
      .find({ userId: user.id, seq: { $gt: cursor } })
      .sort({ seq: 1 })
      .limit(PAGE_SIZE + 1)
      .toArray();
    const more = page.length > PAGE_SIZE;
    const out = page.slice(0, PAGE_SIZE);

    return json({
      cursor: out.length ? out[out.length - 1].seq : cursor,
      more,
      changes: out.map(({ table, uid, mt, deleted, data }) => ({ table, uid, mt, deleted, data })),
    });
  } catch (err) {
    return fail(err);
  }
}
