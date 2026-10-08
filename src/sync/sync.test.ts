import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { chunk, fromRemoteData, shouldApply, toRemoteData, blobPathname, byTableOrder } from './serialize';
import { parseSyncRequest, isOwnPathname } from '../../api/_lib/protocol';
import { db } from '../db/db';
import { installSyncHooks, _applyRemoteForTests as applyRemote } from './engine';

installSyncHooks();
const tick = () => new Promise((r) => setTimeout(r, 30));

describe('serialização', () => {
  it('tira campos locais e troca ids por uid', () => {
    const data = toRemoteData('pieces', { id: 3, uid: 'p1', mt: 5, title: 'Asa Branca', fileId: 9 }, { fileUid: 'f1' });
    expect(data).toEqual({ title: 'Asa Branca', fileUid: 'f1' });
    const file = toRemoteData('files', { id: 1, uid: 'f1', blob: new Blob(['x']), name: 'a.pdf', pathname: 'fermata/u/f1.pdf' });
    expect(file).toEqual({ name: 'a.pdf', pathname: 'fermata/u/f1.pdf' });
  });

  it('mantém o id local e o arquivo já baixado', () => {
    const blob = new Blob(['x']);
    const row = fromRemoteData('files', { uid: 'f1', mt: 9, data: { name: 'a.pdf' } }, { id: 4, blob });
    expect(row).toMatchObject({ id: 4, uid: 'f1', mt: 9, name: 'a.pdf', blob });
    expect(fromRemoteData('lessons', { uid: 'teclado/x', mt: 1, data: { id: 'teclado/x', status: 'learned' } }, undefined)).toMatchObject({ id: 'teclado/x' });
  });

  it('vale a alteração mais recente', () => {
    expect(shouldApply(undefined, 1)).toBe(true);
    expect(shouldApply(5, 6)).toBe(true);
    expect(shouldApply(6, 6)).toBe(false);
    expect(shouldApply(7, 6)).toBe(false);
  });

  it('ordena arquivos antes de peças e sessões antes de tentativas', () => {
    const order = [{ table: 'attempts' }, { table: 'pieces' }, { table: 'sessions' }, { table: 'files' }].sort(byTableOrder).map((x) => x.table);
    expect(order).toEqual(['files', 'pieces', 'sessions', 'attempts']);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(blobPathname('u1', 'f1', 'application/pdf')).toBe('fermata/u1/f1.pdf');
  });
});

describe('protocolo do servidor', () => {
  it('valida o pedido', () => {
    expect(parseSyncRequest({ cursor: 0, changes: [{ table: 'pieces', uid: 'a', mt: 1, data: {} }] })).toMatchObject({ cursor: 0 });
    expect(parseSyncRequest({ changes: [{ table: 'users', uid: 'a', mt: 1, data: {} }] })).toBe('Tabela desconhecida.');
    expect(parseSyncRequest({ changes: [{ table: 'pieces', uid: 'a', mt: 1 }] })).toBe('Mudança sem dados.');
    expect(parseSyncRequest({ changes: [{ table: 'pieces', uid: 'a', mt: 1, deleted: true }] })).toMatchObject({ changes: [{ deleted: true, data: null }] });
  });

  it('só aceita arquivos da pasta do usuário', () => {
    expect(isOwnPathname('fermata/u1/x.pdf', 'fermata/u1/')).toBe(true);
    expect(isOwnPathname('fermata/u2/x.pdf', 'fermata/u1/')).toBe(false);
    expect(isOwnPathname('fermata/u1/../u2/x.pdf', 'fermata/u1/')).toBe(false);
  });
});

describe('fila de envio', () => {
  it('marca gravações locais e põe na fila', async () => {
    const id = await db.pieces.add({ title: 'Ode', people: [], arrangement: '', categories: [], level: 'facil', status: 'learning', fileId: null, createdAt: 1, updatedAt: 1, openedAt: null });
    const p = await db.pieces.get(id);
    expect(p?.uid).toBeTruthy();
    expect(p?.mt).toBeGreaterThan(0);
    await tick();
    expect(await db.outbox.get(`pieces:${p!.uid}`)).toMatchObject({ deleted: false });

    await db.lessons.put({ id: 'teclado/a', status: 'learned', updatedAt: 1 });
    await db.lessons.put({ id: 'teclado/a', status: 'learning', updatedAt: 2 });
    expect((await db.lessons.get('teclado/a'))?.uid).toBe('teclado/a');

    await db.pieces.delete(id);
    await tick();
    expect(await db.outbox.get(`pieces:${p!.uid}`)).toMatchObject({ deleted: true });
  });

  it('o que vem da nuvem não volta para a fila e respeita a mais recente', async () => {
    await db.outbox.clear();
    await applyRemote([{ table: 'pieces', uid: 'remota', mt: 100, deleted: false, data: { title: 'Remota', people: [], arrangement: '', categories: [], level: 'facil', status: 'wish', createdAt: 1, updatedAt: 1, openedAt: null, fileUid: null } }]);
    await tick();
    expect(await db.outbox.count()).toBe(0);
    const p = await db.pieces.where('uid').equals('remota').first();
    expect(p?.title).toBe('Remota');
    expect(p?.mt).toBe(100);

    await applyRemote([{ table: 'pieces', uid: 'remota', mt: 50, deleted: false, data: { title: 'Velha' } }]);
    expect((await db.pieces.where('uid').equals('remota').first())?.title).toBe('Remota');

    await applyRemote([{ table: 'pieces', uid: 'remota', mt: 200, deleted: true, data: null }]);
    expect(await db.pieces.where('uid').equals('remota').first()).toBeUndefined();
  });
});
