// Estatísticas: transforma os registros (passadas nota a nota em `takes`, os resumos antigos em `runs` e os
// eventos em `events`) em passadas, blocos de prática e sessões. Puro e testado (model.test.ts).
//
// Bloco de prática = a mesma música (ou exercício), no mesmo modo, mão, trecho e andamento, em sequência.
// Mudou qualquer um deles, começa outro bloco. É o "pratiquei 30 vezes do compasso 1 ao 8 a 60 BPM".

import type { AppEvent, TakeLog, TrainingRun } from '../db/db';
import { unpackErrors, type NoteError } from '../analysis/takeLog';

export const MIN = 60_000;
export const DAY = 86_400_000;
/** Mais que isso parado entre duas passadas iguais: outro bloco. */
export const BLOCK_GAP = 20 * MIN;
/** Mais que isso sem nada: outra sessão. */
export const SESSION_GAP = 30 * MIN;
/** Acerto que conta como "firme". */
export const FIRM = 0.85;

export type PassKind = 'musica' | 'exercicio' | 'arcade' | 'tecnica';

export interface Pass {
  id: string;
  at: number;
  day: string;
  sourceId: string;
  title: string;
  kind: PassKind;
  mode: 'junto' | 'estudo';
  /** 0 no modo Estudar (sem tempo) */
  bpm: number;
  hand?: string;
  from?: number;
  to?: number;
  accuracy: number;
  clean: boolean;
  /** null: registro antigo, só com o resumo (sem nota a nota) */
  errors: NoteError[] | null;
  meanDelta: number | null;
  drift: number | null;
  /** registro antigo: trecho mais fraco da passada */
  weak?: { from: number; to: number };
  /** Estudar: volta inteira? tempo típico para achar a nota */
  complete?: boolean;
  stepMs?: number | null;
  /** notas por dedo sugerido (direita 1–5, esquerda 1–5) */
  fingers?: number[];
}

const isSongRun = (id: string) => id.startsWith('peca-') || id.startsWith('curso-');

/**
 * Junta as passadas nota a nota com os registros resumidos antigos. Um registro resumido que tem a passada nota a
 * nota correspondente (mesma hora) fica de fora, para não contar duas vezes.
 */
export function buildPasses(takes: TakeLog[], runs: TrainingRun[], titleOf: (sourceId: string) => string | null): Pass[] {
  const out: Pass[] = takes.map((t) => {
    const errors = unpackErrors(t.errors);
    return {
      id: t.id,
      at: t.at,
      day: t.day,
      sourceId: t.sourceId,
      title: titleOf(t.sourceId) ?? t.title,
      kind: t.kind,
      mode: t.mode ?? 'junto',
      bpm: t.bpm,
      hand: t.hand,
      from: t.from,
      to: t.to,
      accuracy: t.accuracy,
      clean: errors.length === 0,
      errors,
      meanDelta: t.meanDelta,
      drift: t.drift,
      complete: t.complete,
      stepMs: t.stepMs,
      fingers: t.fingers,
    };
  });
  const byTime = [...takes].sort((a, b) => a.at - b.at);
  const hasTake = (r: TrainingRun) => {
    // busca binária pela hora
    let lo = 0;
    let hi = byTime.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (byTime[mid].at < r.at - 5000) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < byTime.length && byTime[i].at <= r.at + 5000; i++) {
      const t = byTime[i];
      if (t.sourceId === r.treinoId || (t.kind === 'exercicio' && !isSongRun(r.treinoId))) return true;
    }
    return false;
  };
  for (const r of runs) {
    if (r.kind !== 'timed' || r.accuracy === undefined || !r.bpm) continue;
    const song = isSongRun(r.treinoId);
    if (!song && !r.treinoId.startsWith('tec-')) continue;
    if (hasTake(r)) continue;
    out.push({
      id: `run-${r.uid ?? r.id}`,
      at: r.at,
      day: r.day,
      sourceId: r.treinoId,
      title: titleOf(r.treinoId) ?? r.treinoId,
      kind: song ? 'musica' : 'tecnica',
      mode: 'junto',
      bpm: r.bpm,
      from: r.from,
      to: r.to,
      accuracy: r.accuracy,
      clean: Boolean(r.clean),
      errors: null,
      meanDelta: null,
      drift: null,
      ...(r.weakFrom ? { weak: { from: r.weakFrom, to: r.weakTo ?? r.weakFrom } } : {}),
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

// ---------- blocos ----------

export interface Block {
  key: string;
  sourceId: string;
  title: string;
  kind: PassKind;
  mode: 'junto' | 'estudo';
  bpm: number;
  hand?: string;
  from?: number;
  to?: number;
  passes: Pass[];
  /** passadas que você parou no meio */
  aborts: AppEvent[];
  /** vezes que ouviu o trecho */
  listens: number;
  start: number;
  end: number;
}

const blockKey = (x: { sourceId?: string; mode?: string; bpm?: number; hand?: string; from?: number; to?: number }) =>
  [x.sourceId, x.mode ?? 'junto', x.mode === 'estudo' ? 0 : (x.bpm ?? 0), x.hand ?? '', x.from ?? '', x.to ?? ''].join('|');

/** Agrupa passadas (e as que você parou no meio) em blocos, na ordem em que aconteceram. */
export function buildBlocks(passes: Pass[], events: AppEvent[] = []): Block[] {
  type Item = { at: number; pass?: Pass; abort?: AppEvent; key: string; src: Pass | AppEvent };
  const items: Item[] = [
    ...passes.map((p) => ({ at: p.at, pass: p, key: blockKey(p), src: p })),
    ...events.filter((e) => e.type === 'abort' && e.sourceId).map((e) => ({ at: e.at, abort: e, key: blockKey(e), src: e })),
  ].sort((a, b) => a.at - b.at);
  const blocks: Block[] = [];
  let cur: Block | null = null;
  for (const it of items) {
    if (!cur || cur.key !== it.key || it.at - cur.end > BLOCK_GAP) {
      const s = it.src as Pass & AppEvent;
      cur = {
        key: it.key,
        sourceId: s.sourceId!,
        title: it.pass?.title ?? it.abort?.title ?? s.sourceId!,
        kind: it.pass?.kind ?? 'musica',
        mode: s.mode ?? 'junto',
        bpm: s.mode === 'estudo' ? 0 : (s.bpm ?? 0),
        hand: s.hand,
        from: s.from,
        to: s.to,
        passes: [],
        aborts: [],
        listens: 0,
        start: it.at,
        end: it.at,
      };
      blocks.push(cur);
    }
    if (it.pass) {
      cur.passes.push(it.pass);
      if (cur.title === cur.sourceId) cur.title = it.pass.title;
    } else if (it.abort) cur.aborts.push(it.abort);
    cur.end = it.at;
  }
  // "Ouvir o trecho" conta no bloco do mesmo trecho que vem logo depois (ou em que estava).
  for (const e of events) {
    if (e.type !== 'listen' || !e.sourceId) continue;
    const b = blocks.find((x) => x.sourceId === e.sourceId && x.from === e.from && x.to === e.to && e.at >= x.start - 5 * MIN && e.at <= x.end + MIN);
    if (b) b.listens++;
  }
  return blocks;
}

// ---------- números de um bloco ----------

export interface NoteSpot {
  measure: number;
  midi: number;
  /** erros nessa nota */
  count: number;
  /** em quantas passadas */
  passes: number;
  /** tipo de erro mais comum */
  outcome: NoteError['outcome'];
  /** tecla mais tocada no lugar (trocas) */
  played: number | null;
}

/** Notas (compasso + tecla) que mais deram erro. */
export function topNotes(passes: Pass[], top = 3): NoteSpot[] {
  const by = new Map<string, { measure: number; midi: number; count: number; passes: Set<string>; outcomes: Map<string, number>; played: Map<number, number> }>();
  for (const p of passes)
    for (const e of p.errors ?? []) {
      const k = `${e.measure}:${e.midi}`;
      const cur = by.get(k) ?? { measure: e.measure, midi: e.midi, count: 0, passes: new Set<string>(), outcomes: new Map(), played: new Map() };
      cur.count++;
      cur.passes.add(p.id);
      cur.outcomes.set(e.outcome, (cur.outcomes.get(e.outcome) ?? 0) + 1);
      if (e.outcome === 'trocou') cur.played.set(e.played, (cur.played.get(e.played) ?? 0) + 1);
      by.set(k, cur);
    }
  const most = <K,>(m: Map<K, number>): K | null => ([...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
  return [...by.values()]
    .sort((a, b) => b.passes.size - a.passes.size || b.count - a.count || a.measure - b.measure)
    .slice(0, top)
    .map((x) => ({ measure: x.measure, midi: x.midi, count: x.count, passes: x.passes.size, outcome: most(x.outcomes) as NoteError['outcome'], played: most(x.played) }));
}

export type Tendency = 'adiantado' | 'atrasado' | 'no tempo';

export interface TimingSummary {
  /** ms em média (negativo = adiantado) */
  mean: number | null;
  tendency: Tendency | null;
  /** passadas que foram acelerando / atrasando */
  accelerated: number;
  slowed: number;
  /** erros de tempo */
  early: number;
  late: number;
  /** passadas com medida de tempo */
  measured: number;
}

export function timingOf(passes: Pass[]): TimingSummary {
  const means = passes.map((p) => p.meanDelta).filter((d): d is number => d !== null);
  const mean = means.length ? Math.round(means.reduce((a, b) => a + b, 0) / means.length) : null;
  let early = 0;
  let late = 0;
  for (const p of passes) for (const e of p.errors ?? []) {
    if (e.outcome === 'cedo') early++;
    else if (e.outcome === 'tarde') late++;
  }
  return {
    mean,
    tendency: mean === null ? null : mean <= -20 ? 'adiantado' : mean >= 20 ? 'atrasado' : 'no tempo',
    accelerated: passes.filter((p) => p.drift !== null && p.drift < -80).length,
    slowed: passes.filter((p) => p.drift !== null && p.drift > 80).length,
    early,
    late,
    measured: means.length,
  };
}

export interface BlockStats {
  n: number;
  aborts: number;
  durationMs: number;
  first: number | null;
  last: number | null;
  best: number | null;
  mean: number | null;
  /** média das últimas 5 */
  recent: number | null;
  clean: number;
  /** maior sequência de passadas limpas */
  cleanStreak: number;
  /** a partir de qual passada ficou firme (3 seguidas acima de 85%) */
  stableAt: number | null;
  curve: number[];
  notes: NoteSpot[];
  timing: TimingSummary;
  /** registros antigos: trecho mais fraco mais frequente */
  weak: { from: number; to: number; count: number } | null;
  /** errors por tipo */
  outcomes: Record<NoteError['outcome'], number>;
  detailed: boolean;
  suggestion: Suggestion | null;
}

export type Suggestion =
  | { kind: 'subir'; bpm: number }
  | { kind: 'baixar'; bpm: number }
  | { kind: 'tocar junto' }
  | { kind: 'continuar' };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Andamento seguinte quando o bloco está firme: uns 6% a mais, pelo menos 2 BPM, número par. */
export const nextBpm = (bpm: number) => Math.max(bpm + 2, Math.round((bpm * 1.06) / 2) * 2);
export const lowerBpm = (bpm: number) => Math.max(30, Math.round((bpm * 0.9) / 2) * 2);

export function suggestFor(b: Pick<Block, 'mode' | 'bpm'>, passes: Pass[]): Suggestion | null {
  const n = passes.length;
  if (!n) return null;
  const recent = avg(passes.slice(-5).map((p) => p.accuracy))!;
  if (b.mode === 'estudo') return recent >= 0.9 && passes.slice(-2).every((p) => p.complete !== false) ? { kind: 'tocar junto' } : { kind: 'continuar' };
  if (n >= 5 && recent >= 0.9) return { kind: 'subir', bpm: nextBpm(b.bpm) };
  if (n >= 5 && recent < 0.6) return { kind: 'baixar', bpm: lowerBpm(b.bpm) };
  return { kind: 'continuar' };
}

export function blockStats(b: Block): BlockStats {
  const ps = b.passes;
  const accs = ps.map((p) => p.accuracy);
  let streak = 0;
  let cleanStreak = 0;
  for (const p of ps) {
    streak = p.clean ? streak + 1 : 0;
    cleanStreak = Math.max(cleanStreak, streak);
  }
  let stableAt: number | null = null;
  for (let i = 0; i + 2 < accs.length; i++) if (accs[i] >= FIRM && accs[i + 1] >= FIRM && accs[i + 2] >= FIRM) {
    stableAt = i + 1;
    break;
  }
  const weakBy = new Map<string, { from: number; to: number; count: number }>();
  for (const p of ps) if (p.weak) {
    const k = `${p.weak.from}-${p.weak.to}`;
    const cur = weakBy.get(k) ?? { ...p.weak, count: 0 };
    cur.count++;
    weakBy.set(k, cur);
  }
  const outcomes: BlockStats['outcomes'] = { trocou: 0, cedo: 0, tarde: 0, faltou: 0, hesitou: 0 };
  for (const p of ps) for (const e of p.errors ?? []) outcomes[e.outcome]++;
  const gaps = ps.slice(1).map((p, i) => p.at - ps[i].at).filter((g) => g < 5 * MIN);
  const typical = gaps.length ? [...gaps].sort((a, c) => a - c)[Math.floor(gaps.length / 2)] : 0;
  return {
    n: ps.length,
    aborts: b.aborts.length,
    durationMs: b.end - b.start + typical,
    first: accs.length ? accs[0] : null,
    last: accs.length ? accs[accs.length - 1] : null,
    best: accs.length ? Math.max(...accs) : null,
    mean: avg(accs),
    recent: avg(accs.slice(-5)),
    clean: ps.filter((p) => p.clean).length,
    cleanStreak,
    stableAt,
    curve: accs,
    notes: topNotes(ps),
    timing: timingOf(ps),
    weak: [...weakBy.values()].sort((a, c) => c.count - a.count)[0] ?? null,
    outcomes,
    detailed: ps.some((p) => p.errors !== null),
    suggestion: suggestFor(b, ps),
  };
}

// ---------- sessões e o dia ----------

export type TimelineItem =
  | { type: 'block'; at: number; end: number; block: Block }
  | { type: 'activity'; at: number; end: number; label: string; detail: string; count: number }
  | { type: 'view'; at: number; end: number; label: string; notes: number; dur: number; area: string };

export interface Session {
  start: number;
  end: number;
  items: TimelineItem[];
  /** minutos com a aba visível nas páginas visitadas (quando há registro de visitas) */
  visibleMs: number;
  notes: number;
}

/** Nome e detalhe dos treinos que não são passadas de música (leitura, ouvido, aquecimento…). */
export interface ActivityNamer {
  (run: TrainingRun): { label: string; detail: string } | null;
}

/**
 * Linha do tempo de um período, em sessões: blocos, treinos de leitura e ouvido (seguidos viram um item só) e as
 * visitas que dizem algo sozinhas (abriu e saiu sem tocar, tocou livre, leu uma lição).
 */
export function buildTimeline(blocks: Block[], runs: TrainingRun[], views: AppEvent[], nameRun: ActivityNamer, viewLabel: (v: AppEvent) => string | null): Session[] {
  const items: TimelineItem[] = blocks.map((b) => ({ type: 'block', at: b.start, end: b.end, block: b }));
  const sorted = [...runs].sort((a, b) => a.at - b.at);
  let last: Extract<TimelineItem, { type: 'activity' }> | null = null;
  let lastId = '';
  for (const r of sorted) {
    const n = nameRun(r);
    if (!n) continue;
    if (last && lastId === r.treinoId && r.at - last.end < BLOCK_GAP) {
      last.count++;
      last.end = r.at;
      last.detail = n.detail;
      continue;
    }
    last = { type: 'activity', at: r.at, end: r.at, label: n.label, detail: n.detail, count: 1 };
    lastId = r.treinoId;
    items.push(last);
  }
  for (const v of views) {
    const label = viewLabel(v);
    if (label) items.push({ type: 'view', at: v.at, end: v.at + (v.dur ?? 0), label, notes: v.notes ?? 0, dur: v.dur ?? 0, area: v.area ?? '' });
  }
  items.sort((a, b) => a.at - b.at);

  const sessions: Session[] = [];
  const all = [...items.map((i) => ({ at: i.at, end: i.end })), ...views.map((v) => ({ at: v.at, end: v.at + (v.dur ?? 0) }))].sort((a, b) => a.at - b.at);
  for (const x of all) {
    const s = sessions[sessions.length - 1];
    if (s && x.at - s.end <= SESSION_GAP) s.end = Math.max(s.end, x.end);
    else sessions.push({ start: x.at, end: x.end, items: [], visibleMs: 0, notes: 0 });
  }
  const find = (at: number) => sessions.find((s) => at >= s.start && at <= s.end) ?? sessions[sessions.length - 1];
  for (const it of items) find(it.at)?.items.push(it);
  for (const v of views) {
    const s = find(v.at);
    if (!s) continue;
    s.visibleMs += v.dur ?? 0;
    s.notes += v.notes ?? 0;
  }
  return sessions;
}
