// Respostas e erros comuns às funções da Vercel.

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Converte qualquer erro em resposta. Erros inesperados viram 500 sem vazar detalhe. */
export function fail(err: unknown): Response {
  if (err instanceof HttpError) return json({ message: err.message }, err.status);
  console.error(err);
  return json({ message: 'Algo deu errado no servidor. Tente de novo em instantes.' }, 500);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, 'Pedido inválido.');
  }
}

export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new HttpError(500, `Falta configurar ${name} na Vercel.`);
  return value;
}
