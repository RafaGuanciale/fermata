// Análise semanal com IA.
// GET  /api/insight?week=AAAA-MM-DD  →  { insight } (a já gerada) ou 404
// POST /api/insight  { week, digest, targets }  →  { insight }
// Gera uma vez por semana e por usuário: se já existe, devolve a guardada (não gasta de novo).
// A chave da Anthropic fica só aqui, na variável ANTHROPIC_API_KEY da Vercel; nunca vai para o navegador.

import { requireUser } from './_lib/auth.js';
import { HttpError, env, fail, json, readJson } from './_lib/http.js';
import { getDb } from './_lib/mongo.js';
import { INSIGHT_SYSTEM, INSIGHT_TOOL, isWeekId, parseInsight, type Insight } from './_lib/insight.js';

export const config = { maxDuration: 60 };

interface StoredInsight {
  _id: string;
  userId: string;
  week: string;
  createdAt: number;
  model: string;
  insight: Insight;
  usage?: unknown;
}

const MAX_DIGEST_BYTES = 80_000;
/** Teto de gerações por usuário em 24 horas (proteção contra erro em loop). */
const MAX_PER_DAY = 3;

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireUser(request);
    const week = new URL(request.url).searchParams.get('week');
    if (!isWeekId(week)) throw new HttpError(400, 'Semana inválida.');
    const db = await getDb();
    const found = await db.collection<StoredInsight>('insights').findOne({ _id: `${user.id}:${week}` });
    if (!found) return json({ message: 'Ainda não há análise desta semana.' }, 404);
    return json({ insight: found.insight, createdAt: found.createdAt });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireUser(request);
    const body = await readJson<{ week?: unknown; digest?: unknown; targets?: unknown }>(request);
    if (!isWeekId(body.week)) throw new HttpError(400, 'Semana inválida.');
    const digestText = JSON.stringify(body.digest ?? null);
    if (!body.digest || digestText.length > MAX_DIGEST_BYTES) throw new HttpError(400, 'Resumo da semana inválido.');
    const targets = Array.isArray(body.targets) ? body.targets.filter((t): t is string => typeof t === 'string').slice(0, 40) : ['treino'];

    const db = await getDb();
    const col = db.collection<StoredInsight>('insights');
    const id = `${user.id}:${body.week}`;
    const found = await col.findOne({ _id: id });
    if (found) return json({ insight: found.insight, createdAt: found.createdAt });

    const recent = await col.countDocuments({ userId: user.id, createdAt: { $gt: Date.now() - 86_400_000 } });
    if (recent >= MAX_PER_DAY) throw new HttpError(429, 'Muitas análises hoje. Tente amanhã.');

    const key = env('ANTHROPIC_API_KEY');
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          max_tokens: 2500,
          system: INSIGHT_SYSTEM,
          tools: [INSIGHT_TOOL],
          tool_choice: { type: 'tool', name: INSIGHT_TOOL.name },
          messages: [{ role: 'user', content: `Dados da semana (JSON calculado pelo app):\n${digestText}` }],
        }),
      });
    } catch {
      throw new HttpError(502, 'A IA não respondeu. Tente de novo mais tarde.');
    }
    if (res.status === 401) throw new HttpError(500, 'A chave ANTHROPIC_API_KEY da Vercel foi recusada. Confira se está certa.');
    if (!res.ok) {
      console.error('anthropic', res.status, await res.text().catch(() => ''));
      throw new HttpError(502, 'A IA não conseguiu analisar agora. Tente de novo mais tarde.');
    }
    const out = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[]; usage?: unknown };
    const call = out.content?.find((c) => c.type === 'tool_use' && c.name === INSIGHT_TOOL.name);
    const insight = parseInsight(call?.input, targets);
    if (!insight) throw new HttpError(502, 'A resposta da IA veio incompleta. Tente de novo mais tarde.');

    const createdAt = Date.now();
    await col.updateOne({ _id: id }, { $setOnInsert: { _id: id, userId: user.id, week: body.week, createdAt, model, insight, usage: out.usage } }, { upsert: true });
    return json({ insight, createdAt });
  } catch (err) {
    return fail(err);
  }
}
