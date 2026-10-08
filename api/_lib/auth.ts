// Login com a conta Permana sem mexer no backend do Permana.
// O token é o mesmo JWT que o Permana emite; para saber de quem é, perguntamos ao próprio
// Permana (GET /users/me). Assim o Fermata nunca precisa do JWT_SECRET de lá.

import { HttpError, env } from './http.js';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

interface PermanaMe {
  _id: string;
  name?: string;
  username?: string;
  avatar?: string;
}

/** Cache por instância: evita chamar o Permana a cada sincronização. */
const cache = new Map<string, { user: User; until: number }>();
const CACHE_MS = 10 * 60 * 1000;

export function permanaUrl(): string {
  return env('PERMANA_API_URL').replace(/\/+$/, '');
}

export function toUser(me: PermanaMe): User {
  return { id: String(me._id), name: me.name ?? '', username: me.username ?? '', avatar: me.avatar ?? '' };
}

export async function fetchMe(token: string): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${permanaUrl()}/users/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new HttpError(502, 'O servidor do Permana não respondeu. Tente de novo em instantes.');
  }
  if (res.status === 401 || res.status === 404) throw new HttpError(401, 'Sua sessão expirou. Entre de novo.');
  if (!res.ok) throw new HttpError(502, 'O servidor do Permana não respondeu. Tente de novo em instantes.');
  return toUser((await res.json()) as PermanaMe);
}

export async function requireUser(request: Request): Promise<User> {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Entre com sua conta Permana.');
  const token = header.slice(7).trim();

  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;

  const user = await fetchMe(token);
  if (cache.size > 200) cache.clear();
  cache.set(token, { user, until: Date.now() + CACHE_MS });
  return user;
}

/** Todos os arquivos de um usuário ficam embaixo desta pasta no Blob. */
export function blobPrefix(user: User): string {
  return `fermata/${user.id}/`;
}
