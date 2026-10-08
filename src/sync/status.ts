// Estado da sincronização, para a barra lateral e a tela de conta.

import { useSyncExternalStore } from 'react';

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  lastSyncAt: number | null;
  message: string | null;
}

let status: SyncStatus = { phase: 'off', lastSyncAt: null, message: null };
const listeners = new Set<() => void>();

export function getSyncStatus(): SyncStatus {
  return status;
}

export function setSyncStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus, getSyncStatus);
}

export function syncLabel(s: SyncStatus, now = Date.now()): string {
  if (s.phase === 'off') return 'Só neste aparelho';
  if (s.phase === 'syncing') return 'Sincronizando…';
  if (s.phase === 'offline') return 'Sem internet, guarda e envia depois';
  if (s.phase === 'error') return s.message ?? 'Não deu para sincronizar';
  if (!s.lastSyncAt) return 'Conectado';
  const min = Math.floor((now - s.lastSyncAt) / 60000);
  if (min < 1) return 'Sincronizado agora';
  if (min < 60) return `Sincronizado há ${min} min`;
  return `Sincronizado às ${new Date(s.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
