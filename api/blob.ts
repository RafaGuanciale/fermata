// Partituras na nuvem (Vercel Blob, loja privada).
// POST /api/blob?action=upload  → protocolo do uploadPresigned: o navegador manda o arquivo direto para o Blob.
// POST /api/blob?action=url     { pathname } → link assinado de leitura, vale 10 min.
// GET  /api/blob?pathname=…     → plano B: o arquivo passa pela função (quando o link direto falha).
// Toda chamada confere o login e se o arquivo é da pasta do próprio usuário.

import { get, issueSignedToken, presignUrl } from '@vercel/blob';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { blobPrefix, requireUser } from './_lib/auth.js';
import { HttpError, fail, json, readJson } from './_lib/http.js';
import { isOwnPathname } from './_lib/protocol.js';

export const config = { maxDuration: 60 };

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.recordare.musicxml', 'application/vnd.recordare.musicxml+xml'];
const MAX_BYTES = 40 * 1024 * 1024;
const MINUTES = 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  try {
    const action = new URL(request.url).searchParams.get('action');

    if (action === 'upload') {
      const user = await requireUser(request);
      const body = await readJson<HandleUploadPresignedBody>(request);
      const result = await handleUploadPresigned({
        body,
        request,
        getSignedToken: async (pathname) => {
          if (!isOwnPathname(pathname, blobPrefix(user))) throw new HttpError(403, 'Arquivo fora da sua pasta.');
          const token = await issueSignedToken({
            pathname,
            operations: ['put'],
            allowedContentTypes: ALLOWED_TYPES,
            maximumSizeInBytes: MAX_BYTES,
            validUntil: Date.now() + 30 * MINUTES,
          });
          return {
            token,
            urlOptions: {
              allowedContentTypes: ALLOWED_TYPES,
              maximumSizeInBytes: MAX_BYTES,
              addRandomSuffix: false,
              allowOverwrite: true,
              validUntil: Date.now() + 30 * MINUTES,
            },
          };
        },
      });
      return json(result);
    }

    if (action === 'url') {
      const user = await requireUser(request);
      const { pathname } = await readJson<{ pathname?: unknown }>(request);
      if (!isOwnPathname(pathname, blobPrefix(user))) throw new HttpError(403, 'Arquivo fora da sua pasta.');
      const token = await issueSignedToken({ pathname, operations: ['get'], validUntil: Date.now() + 10 * MINUTES });
      const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil: Date.now() + 10 * MINUTES });
      return json({ url: presignedUrl });
    }

    throw new HttpError(400, 'Ação desconhecida.');
  } catch (err) {
    return fail(err);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireUser(request);
    const pathname = new URL(request.url).searchParams.get('pathname');
    if (!isOwnPathname(pathname, blobPrefix(user))) throw new HttpError(403, 'Arquivo fora da sua pasta.');
    const result = await get(pathname, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) throw new HttpError(404, 'Arquivo não encontrado na nuvem.');
    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return fail(err);
  }
}
