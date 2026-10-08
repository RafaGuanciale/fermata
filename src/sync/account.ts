// Conta Permana neste aparelho. O token fica no localStorage, como no próprio Permana.

import { useSyncExternalStore } from 'react';

export interface AccountUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface Account {
  token: string;
  user: AccountUser;
}

const KEY = 'fermata-account';
const listeners = new Set<() => void>();
let account: Account | null = read();
let signOutReason: string | null = null;

function read(): Account | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Account) : null;
    return parsed?.token && parsed.user?.id ? parsed : null;
  } catch {
    return null;
  }
}

function set(next: Account | null) {
  account = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // sem localStorage: a conta vale só nesta aba
  }
  listeners.forEach((l) => l());
}

export function getAccount(): Account | null {
  return account;
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount(): Account | null {
  return useSyncExternalStore(subscribeAccount, getAccount, () => null);
}

/** Motivo da última saída automática (sessão expirada), para mostrar na tela de conta. */
export function takeSignOutReason(): string | null {
  const r = signOutReason;
  signOutReason = null;
  return r;
}

export function authHeaders(): Record<string, string> {
  return account ? { Authorization: `Bearer ${account.token}` } : {};
}

async function readMessage(res: Response): Promise<string | null> {
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) return null;
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? null;
}

export async function login(email: string, password: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Sem conexão. Confira a internet e tente de novo.');
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  if (!isJson) throw new Error('O login só funciona no site publicado, não no modo de desenvolvimento.');
  if (!res.ok) throw new Error((await readMessage(res)) ?? 'Não deu para entrar agora. Tente de novo.');
  const data = (await res.json()) as Account;
  signOutReason = null;
  set({ token: data.token, user: data.user });
}

export function logout(reason?: string) {
  signOutReason = reason ?? null;
  set(null);
}

export { readMessage };
