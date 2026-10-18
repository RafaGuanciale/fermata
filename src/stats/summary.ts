// Painel do período, raio-x de uma música, padrões que se repetem ("onde você vaza") e o que melhorou ou piorou.
// Puro e testado (summary.test.ts).

import type { AppEvent, TrainingRun } from '../db/db';
import type { NoteError } from '../analysis/takeLog';
import { blockStats, buildBlocks, DAY, FIRM, timingOf, topNotes, type Block, type Pass, type NoteSpot } from './model';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const junto = (p: Pass) => p.mode === 'junto';

// ---------- painel ----------

export interface AreaTime {
  area: string;
  ms: number;
}

/** Onde foi o tempo: visitas em que você tocou (ou leu uma lição), por área. */
export function timeByArea(views: AppEvent[]): AreaTime[] {
  const by = new Map<string, number>();
  for (const v of views) {
    if (v.type !== 'view' || !v.area || !v.dur) continue;
    const reading = v.area === 'curso' || v.area === 'consulta';
    if (!v.notes && !reading) continue;
    by.set(v.area, (by.get(v.area) ?? 0) + v.dur);
  }
  return [...by.entries()].map(([area, ms]) => ({ area, ms })).sort((a, b) => b.ms - a.ms);
}

export interface SourceSummary {
  sourceId: string;
  title: string;
  kind: Pass['kind'];
  passes: number;
  mean: number;
  last: number;
  /** configuração do último bloco */
  bpm: number;
  from?: number;
  to?: number;
  mode: Pass['mode'];
}

export function bySource(passes: Pass[]): SourceSummary[] {
  const by = new Map<string, Pass[]>();
  for (const p of passes) by.set(p.sourceId, [...(by.get(p.sourceId) ?? []), p]);
  return [...by.values()]
    .map((ps) => {
      const l = ps[ps.length - 1];
      return { sourceId: l.sourceId, title: l.title, kind: l.kind, passes: ps.length, mean: avg(ps.map((p) => p.accuracy))!, last: l.at, bpm: l.bpm, from: l.from, to: l.to, mode: l.mode };
    })
    .sort((a, b) => b.passes - a.passes);
}

export interface SpotWithSong extends NoteSpot {
  sourceId: string;
  title: string;
}

export function topNotesAcross(passes: Pass[], top = 5): SpotWithSong[] {
  const by = new Map<string, Pass[]>();
  for (const p of passes) if (p.errors?.length) by.set(p.sourceId, [...(by.get(p.sourceId) ?? []), p]);
  return [...by.entries()]
    .flatMap(([sourceId, ps]) => topNotes(ps, top).map((n) => ({ ...n, sourceId, title: ps[0].title })))
    .sort((a, b) => b.passes - a.passes || b.count - a.count)
    .slice(0, top);
}

// ---------- uma música ----------

export interface MeasureHeat {
  measure: number;
  /** passadas que passaram por este compasso */
  played: number;
  /** erros nota a nota neste compasso */
  errors: number;
  /** registros antigos: vezes que foi o trecho mais fraco */
  weak: number;
}

export interface SongDetail {
  measures: MeasureHeat[];
  byBpm: { bpm: number; passes: number; mean: number; best: number; lastAt: number }[];
  /** acerto médio por dia (só Tocar junto) */
  days: { day: string; passes: number; mean: number; bpm: number }[];
  notes: NoteSpot[];
  now: SongNow | null;
  detailed: boolean;
  study: { laps: number; mean: number | null; stepMs: number | null };
}

export interface SongNow {
  bpm: number;
  from?: number;
  to?: number;
  hand?: string;
  /** passadas nessa configuração, as últimas 10 */
  recent: number;
  mean: number;
  last: number;
}

/** Onde você está agora: a configuração do último bloco do Tocar junto e o acerto das últimas 10 passadas nela. */
export function songNow(passes: Pass[]): SongNow | null {
  const j = passes.filter(junto);
  if (!j.length) return null;
  const l = j[j.length - 1];
  const same = j.filter((p) => p.bpm === l.bpm && p.from === l.from && p.to === l.to && (p.hand ?? '') === (l.hand ?? '')).slice(-10);
  return { bpm: l.bpm, from: l.from, to: l.to, hand: l.hand, recent: same.length, mean: avg(same.map((p) => p.accuracy))!, last: l.at };
}

export function songDetail(passes: Pass[]): SongDetail {
  const j = passes.filter(junto);
  const maxM = Math.max(0, ...passes.map((p) => p.to ?? 0), ...passes.flatMap((p) => (p.errors ?? []).map((e) => e.measure)), ...passes.map((p) => p.weak?.to ?? 0));
  const measures: MeasureHeat[] = Array.from({ length: maxM }, (_, i) => ({ measure: i + 1, played: 0, errors: 0, weak: 0 }));
  for (const p of passes) {
    if (p.from && p.to) for (let m = p.from; m <= p.to; m++) measures[m - 1].played++;
    for (const e of p.errors ?? []) if (e.measure >= 1 && e.measure <= maxM) measures[e.measure - 1].errors++;
    if (p.weak) for (let m = p.weak.from; m <= p.weak.to; m++) if (m <= maxM) measures[m - 1].weak++;
  }
  const bpm = new Map<number, Pass[]>();
  for (const p of j) bpm.set(p.bpm, [...(bpm.get(p.bpm) ?? []), p]);
  const days = new Map<string, Pass[]>();
  for (const p of j) days.set(p.day, [...(days.get(p.day) ?? []), p]);
  const study = passes.filter((p) => p.mode === 'estudo');
  const stepMs = study.map((p) => p.stepMs).filter((x): x is number => typeof x === 'number');
  return {
    measures,
    byBpm: [...bpm.entries()].sort((a, b) => a[0] - b[0]).map(([b, ps]) => ({ bpm: b, passes: ps.length, mean: avg(ps.map((p) => p.accuracy))!, best: Math.max(...ps.map((p) => p.accuracy)), lastAt: ps[ps.length - 1].at })),
    days: [...days.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, ps]) => {
      const bpms = new Map<number, number>();
      for (const p of ps) bpms.set(p.bpm, (bpms.get(p.bpm) ?? 0) + 1);
      return { day, passes: ps.length, mean: avg(ps.map((p) => p.accuracy))!, bpm: [...bpms.entries()].sort((a, b) => b[1] - a[1])[0][0] };
    }),
    notes: topNotes(passes, 5),
    now: songNow(passes),
    detailed: passes.some((p) => p.errors !== null),
    study: { laps: study.length, mean: avg(study.map((p) => p.accuracy)), stepMs: stepMs.length ? Math.round(avg(stepMs)!) : null },
  };
}

// ---------- padrões que se repetem ----------

export interface Pattern {
  id: string;
  title: string;
  detail: string;
  /** quanto pesa (para ordenar) */
  weight: number;
}

const FINGER = ['polegar', 'indicador', 'médio', 'anelar', 'mínimo'];
const pctText = (x: number) => `${Math.round(x * 100)} %`;

/**
 * Padrões que aparecem em várias músicas e exercícios (como os "leaks" dos rastreadores de poker):
 * tempo, aceleração, dedo, troca pela tecla vizinha, notas que faltam, onde você demora no Estudar.
 */
export function findPatterns(passes: Pass[]): Pattern[] {
  const detailed = passes.filter((p) => p.errors !== null);
  const j = detailed.filter(junto);
  const out: Pattern[] = [];
  const t = timingOf(j);
  if (t.measured >= 8 && t.mean !== null && Math.abs(t.mean) >= 25) {
    out.push({
      id: 'tempo',
      title: t.mean < 0 ? 'Você entra antes do tempo' : 'Você entra depois do tempo',
      detail: `Em média ${Math.abs(t.mean)} ms ${t.mean < 0 ? 'adiantado' : 'atrasado'} em ${t.measured} passadas${t.early + t.late ? `; ${t.mean < 0 ? t.early : t.late} notas saíram ${t.mean < 0 ? 'cedo' : 'tarde'} demais` : ''}.`,
      weight: Math.abs(t.mean) / 10 + t.measured / 10,
    });
  }
  if (t.measured >= 8 && t.accelerated / t.measured >= 0.3) {
    out.push({ id: 'acelera', title: 'Você acelera ao longo do trecho', detail: `${t.accelerated} de ${t.measured} passadas foram chegando cada vez mais cedo. Metrônomo que some ajuda a segurar.`, weight: (t.accelerated / t.measured) * 10 });
  }
  // dedo sugerido com mais erro, comparado com o geral
  const totals = Array<number>(10).fill(0);
  const errs = Array<number>(10).fill(0);
  for (const p of detailed) for (const e of p.errors!) if (e.finger && e.outcome !== 'hesitou') errs[(e.hand === 'l' ? 5 : 0) + e.finger - 1]++;
  for (const p of detailed) p.fingers?.forEach((n, i) => (totals[i] += n));
  const allNotes = totals.reduce((a, b) => a + b, 0);
  const allErr = errs.reduce((a, b) => a + b, 0);
  if (allNotes >= 80 && allErr >= 8) {
    const overall = allErr / allNotes;
    let best = -1;
    let bestRate = 0;
    totals.forEach((n, i) => {
      if (n < 30) return;
      const r = errs[i] / n;
      if (r > bestRate) {
        bestRate = r;
        best = i;
      }
    });
    if (best >= 0 && bestRate >= overall * 1.5 && errs[best] >= 5) {
      out.push({
        id: 'dedo',
        title: `Notas do ${FINGER[best % 5]} (${(best % 5) + 1}) da mão ${best >= 5 ? 'esquerda' : 'direita'}`,
        detail: `Onde o dedilhado pede esse dedo você erra ${pctText(bestRate)}, contra ${pctText(overall)} no geral (${errs[best]} erros em ${totals[best]} notas).`,
        weight: (bestRate / overall) * 3,
      });
    }
  }
  const swaps = detailed.flatMap((p) => p.errors!.filter((e) => e.outcome === 'trocou'));
  const near = swaps.filter((e) => Math.abs(e.played - e.midi) <= 2).length;
  if (swaps.length >= 6 && near / swaps.length >= 0.6) {
    out.push({ id: 'vizinha', title: 'Quando erra a nota, é a tecla do lado', detail: `${near} de ${swaps.length} trocas foram para uma tecla vizinha: a mão sai da posição. Olhe a posição antes de começar e toque devagar o ponto da troca.`, weight: (near / swaps.length) * 6 });
  }
  const outs: Record<NoteError['outcome'], number> = { trocou: 0, cedo: 0, tarde: 0, faltou: 0, hesitou: 0 };
  for (const p of j) for (const e of p.errors!) outs[e.outcome]++;
  const timedErr = outs.trocou + outs.cedo + outs.tarde + outs.faltou;
  if (timedErr >= 10 && outs.faltou / timedErr >= 0.45) {
    out.push({ id: 'faltou', title: 'Mais nota que fica para trás do que nota errada', detail: `${outs.faltou} de ${timedErr} erros foram notas que não saíram. Costuma ser leitura atrasada: estude o trecho no modo Estudar antes de tocar junto.`, weight: (outs.faltou / timedErr) * 5 });
  }
  const study = detailed.filter((p) => p.mode === 'estudo');
  const hes = new Map<string, { title: string; measure: number; n: number }>();
  for (const p of study) for (const e of p.errors!) if (e.outcome === 'hesitou') {
    const k = `${p.sourceId}:${e.measure}`;
    const cur = hes.get(k) ?? { title: p.title, measure: e.measure, n: 0 };
    cur.n++;
    hes.set(k, cur);
  }
  const topHes = [...hes.values()].sort((a, b) => b.n - a.n)[0];
  if (topHes && topHes.n >= 3) {
    out.push({ id: 'hesita', title: `Você demora para achar as notas do compasso ${topHes.measure}`, detail: `${topHes.title}: ${topHes.n} vezes no modo Estudar você parou bem mais que o normal nesse compasso.`, weight: topHes.n / 2 });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

// ---------- o que melhorou e o que piorou (Progresso) ----------

export interface Change {
  id: string;
  dir: 'melhor' | 'pior';
  area: 'musicas' | 'tecnica' | 'tempo' | 'leitura' | 'ouvido';
  title: string;
  detail: string;
  /** música: para abrir direto */
  sourceId?: string;
  weight: number;
}

const range = (p: { from?: number; to?: number }) => (p.from && p.to ? (p.from === p.to ? `c. ${p.from}` : `c. ${p.from}–${p.to}`) : 'trecho todo');

/**
 * Compara os últimos 7 dias com os 21 dias antes. Músicas: o mesmo trecho no mesmo andamento (acerto) e o
 * andamento em que você está firme (85% em 3 passadas ou mais). Mais o tempo (adiantar/atrasar).
 */
export function progressChanges(passes: Pass[], now: number): Change[] {
  const recentStart = now - 7 * DAY;
  const beforeStart = now - 28 * DAY;
  const isNow = (p: Pass) => p.at > recentStart && p.at <= now;
  const isBefore = (p: Pass) => p.at > beforeStart && p.at <= recentStart;
  const out: Change[] = [];
  const j = passes.filter(junto);

  const configs = new Map<string, Pass[]>();
  for (const p of j) {
    const k = [p.sourceId, p.bpm, p.from ?? '', p.to ?? '', p.hand ?? ''].join('|');
    configs.set(k, [...(configs.get(k) ?? []), p]);
  }
  for (const [k, ps] of configs) {
    const a = ps.filter(isBefore);
    const b = ps.filter(isNow);
    if (a.length < 3 || b.length < 3) continue;
    const ma = avg(a.map((p) => p.accuracy))!;
    const mb = avg(b.map((p) => p.accuracy))!;
    const diff = mb - ma;
    if (Math.abs(diff) < 0.05) continue;
    const l = ps[ps.length - 1];
    out.push({
      id: `cfg:${k}`,
      dir: diff > 0 ? 'melhor' : 'pior',
      area: l.kind === 'musica' ? 'musicas' : 'tecnica',
      title: `${l.title}, ${range(l)} a ${l.bpm} BPM`,
      detail: `Acerto de ${pctText(ma)} para ${pctText(mb)} (${a.length} passadas antes, ${b.length} nesta semana).`,
      sourceId: l.sourceId,
      weight: Math.abs(diff) * 10 + Math.min(b.length, 20) / 10,
    });
  }

  // andamento firme por música
  const bySource = new Map<string, Pass[]>();
  for (const p of j) bySource.set(p.sourceId, [...(bySource.get(p.sourceId) ?? []), p]);
  const firmBpm = (ps: Pass[]) => {
    const by = new Map<number, number[]>();
    for (const p of ps) by.set(p.bpm, [...(by.get(p.bpm) ?? []), p.accuracy]);
    const ok = [...by.entries()].filter(([, a]) => a.length >= 3 && avg(a)! >= FIRM).map(([b]) => b);
    return ok.length ? Math.max(...ok) : null;
  };
  for (const [id, ps] of bySource) {
    const fa = firmBpm(ps.filter((p) => p.at <= recentStart));
    const fb = firmBpm(ps.filter(isNow));
    if (fb === null || (fa !== null && fb <= fa)) continue;
    out.push({
      id: `firme:${id}`,
      dir: 'melhor',
      area: ps[0].kind === 'musica' ? 'musicas' : 'tecnica',
      title: `${ps[ps.length - 1].title}: firme a ${fb} BPM`,
      detail: fa === null ? `Primeira vez com 3 passadas ou mais acima de 85% num andamento.` : `Antes você estava firme a ${fa} BPM.`,
      sourceId: id,
      weight: 3 + (fa ? (fb - fa) / 4 : 1),
    });
  }

  // tempo
  const ta = timingOf(j.filter(isBefore));
  const tb = timingOf(j.filter(isNow));
  if (ta.measured >= 5 && tb.measured >= 5 && ta.mean !== null && tb.mean !== null) {
    const da = Math.abs(ta.mean);
    const db = Math.abs(tb.mean);
    if (Math.abs(da - db) >= 10) {
      out.push({
        id: 'tempo',
        dir: db < da ? 'melhor' : 'pior',
        area: 'tempo',
        title: db < da ? 'Mais no tempo' : 'Mais longe do tempo',
        detail: `Distância média do clique: de ${da} ms para ${db} ms.`,
        weight: Math.abs(da - db) / 10,
      });
    }
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/**
 * Leitura (tempo para tocar a nota da pauta), ouvido (maior frase) e técnica (andamento limpo na escada):
 * últimos 7 dias contra os 21 antes.
 */
export function skillChanges(runs: TrainingRun[], now: number, techTitle: (id: string) => string | null = () => null): Change[] {
  const recentStart = now - 7 * DAY;
  const beforeStart = now - 28 * DAY;
  const isNow = (r: TrainingRun) => r.at > recentStart && r.at <= now;
  const isBefore = (r: TrainingRun) => r.at > beforeStart && r.at <= recentStart;
  const out: Change[] = [];
  const reading = runs.filter((r) => r.avgMs && (r.kind === 'names' || r.kind === 'locate'));
  const ra = reading.filter(isBefore);
  const rb = reading.filter(isNow);
  if (ra.length >= 2 && rb.length >= 2) {
    const ma = avg(ra.map((r) => r.avgMs!))!;
    const mb = avg(rb.map((r) => r.avgMs!))!;
    if (Math.abs(mb - ma) / ma >= 0.08) {
      const sec = (ms: number) => `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
      out.push({ id: 'leitura', dir: mb < ma ? 'melhor' : 'pior', area: 'leitura', title: mb < ma ? 'Leitura mais rápida' : 'Leitura mais lenta', detail: `Tempo para tocar a nota da pauta: de ${sec(ma)} para ${sec(mb)}.`, weight: (Math.abs(mb - ma) / ma) * 10 });
    }
  }
  const eco = runs.filter((r) => r.treinoId === 'eco' && r.level);
  const ea = eco.filter(isBefore);
  const eb = eco.filter(isNow);
  if (ea.length && eb.length) {
    const la = Math.max(...ea.map((r) => r.level!));
    const lb = Math.max(...eb.map((r) => r.level!));
    if (la !== lb) out.push({ id: 'ouvido', dir: lb > la ? 'melhor' : 'pior', area: 'ouvido', title: lb > la ? 'Ouvido: frases maiores' : 'Ouvido: frases menores', detail: `Maior frase repetida de ouvido: de ${la} para ${lb} notas.`, weight: Math.abs(lb - la) * 2 });
  }
  const tec = new Map<string, TrainingRun[]>();
  for (const r of runs) if (r.treinoId.startsWith('tec-') && r.clean && r.bpm) tec.set(r.treinoId, [...(tec.get(r.treinoId) ?? []), r]);
  for (const [id, rs] of tec) {
    const b = rs.filter(isNow);
    if (!b.length) continue;
    const before = rs.filter((r) => r.at <= recentStart);
    const fb = Math.max(...b.map((r) => r.bpm!));
    const fa = before.length ? Math.max(...before.map((r) => r.bpm!)) : null;
    if (fa !== null && fb > fa) out.push({ id: `tec:${id}`, dir: 'melhor', area: 'tecnica', title: `${techTitle(id) ?? 'Técnica'}: limpa a ${fb} BPM`, detail: `Antes o andamento limpo era ${fa} BPM.`, weight: 2 + (fb - fa) / 4 });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

// ---------- utilidades para a tela ----------

/** Blocos de um conjunto de passadas e eventos, com os números de cada um, do mais novo para o mais antigo. */
export function blocksWithStats(passes: Pass[], events: AppEvent[]): { block: Block; stats: ReturnType<typeof blockStats> }[] {
  return buildBlocks(passes, events)
    .map((block) => ({ block, stats: blockStats(block) }))
    .reverse();
}
