// POST /api/login  { email, password }  →  { token, user }
// Repassa o login para o servidor do Permana. A senha não fica guardada em lugar nenhum do Fermata.

import { fetchMe, permanaUrl } from './_lib/auth.js';
import { HttpError, fail, json, readJson } from './_lib/http.js';

export const config = { maxDuration: 30 };

export async function POST(request: Request): Promise<Response> {
  try {
    const { email, password } = await readJson<{ email?: unknown; password?: unknown }>(request);
    if (typeof email !== 'string' || typeof password !== 'string' || !email.includes('@') || !password) {
      throw new HttpError(400, 'Preencha email e senha.');
    }

    let res: Response;
    try {
      res = await fetch(`${permanaUrl()}/auth/login`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
    } catch {
      throw new HttpError(502, 'O servidor do Permana não respondeu. Tente de novo em instantes.');
    }

    // 400 vem da validação do Permana (senha curta demais etc.): para quem digita, é senha errada.
    if (res.status === 400 || res.status === 401) throw new HttpError(401, 'Email ou senha incorretos.');
    if (res.status === 429) throw new HttpError(429, 'Muitas tentativas. Espere alguns minutos e tente de novo.');
    if (!res.ok) throw new HttpError(502, 'O servidor do Permana não respondeu. Tente de novo em instantes.');

    const { token } = (await res.json()) as { token?: string };
    if (!token) throw new HttpError(502, 'O Permana não devolveu o acesso. Tente de novo.');

    const user = await fetchMe(token);
    return json({ token, user });
  } catch (err) {
    return fail(err);
  }
}
