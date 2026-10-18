// Resumo da semana para a análise com IA. O app faz todas as contas aqui; a IA só lê e escreve.
// Junta as passadas registradas nota a nota (takes), os treinos (runs), os minutos, a leitura, o ouvido e os marcos.
// Puro e testado (digest.test.ts).

import type { NoteReadStat, PracticeDay, Recording, TakeLog, TrainingRun } from '../db/db';
import { noteInfo } from '../music/notes';
import { unpackErrors, type NoteError } from '../analysis/takeLog';

const DAY = 86_400_000;

/** Segunda-feira 00:00 (hora local) da semana de `ts`. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

const key = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A semana que a análise de agora olha: a anterior completa (segunda a domingo). */
export function lastWeek(now: number): { start: number; end: number; id: string } {
  const end = weekStart(now);
  const start = weekStart(end - DAY);
  return { start, end, id: key(start) };
}

const name = (m: number) => noteInfo(m).sci;
const pct = (x: number) => Math.round(x * 100);
const FINGER_NAMES = ['polegar (1)', 'indicador (2)', 'médio (3)', 'anelar (4)', 'mínimo (5)'];

export interface Target {
  /** id para a IA escolher a ação */
  id: string;
  titulo: string;
  rota: string;
}

export interface DigestInput {
  now: number;
  takes: TakeLog[];
  runs: TrainingRun[];
  practice: PracticeDay[];
  recordings: Recording[];
  notes: NoteReadStat[];
  goal: { minutes: number; days: number };
  /** rota de cada música pelo id dos registros (curso ou repertório) */
  songRoute: (sourceId: string) => string | null;
}

function fingerTable(takes: TakeLog[]) {
  const totals = Array<number>(10).fill(0);
  const errs = Array<number>(10).fill(0);
  for (const t of takes) {
    t.fingers.forEach((n, i) => (totals[i] += n));
    for (const e of unpackErrors(t.errors)) if (e.finger) errs[(e.hand === 'l' ? 5 : 0) + e.finger - 1]++;
  }
  const side = (off: number) =>
    FINGER_NAMES.map((dedo, i) => ({ dedo, notas: totals[off + i], erros: errs[off + i], taxaErro: totals[off + i] ? pct(errs[off + i] / totals[off + i]) : 0 })).filter((x) => x.notas >= 10);
  return { maoDireita: side(0), maoEsquerda: side(5) };
}

function measureTable(takes: TakeLog[], top = 4) {
  const by = new Map<number, { errors: NoteError[]; takes: Set<number> }>();
  for (const t of takes)
    for (const e of unpackErrors(t.errors)) {
      const cur = by.get(e.measure) ?? { errors: [], takes: new Set<number>() };
      cur.errors.push(e);
      cur.takes.add(t.n);
      by.set(e.measure, cur);
    }
  return [...by.entries()]
    .sort((a, b) => b[1].errors.length - a[1].errors.length)
    .slice(0, top)
    .map(([compasso, v]) => {
      const tipos = { trocou: 0, cedo: 0, tarde: 0, faltou: 0 };
      const dedos = new Map<string, number>();
      const trocas = new Map<string, number>();
      for (const e of v.errors) {
        tipos[e.outcome]++;
        if (e.finger) dedos.set(`${e.hand === 'l' ? 'esquerda' : 'direita'} ${e.finger}`, (dedos.get(`${e.hand === 'l' ? 'esquerda' : 'direita'} ${e.finger}`) ?? 0) + 1);
        if (e.outcome === 'trocou') trocas.set(`tocou ${name(e.played)} no lugar de ${name(e.midi)}`, (trocas.get(`tocou ${name(e.played)} no lugar de ${name(e.midi)}`) ?? 0) + 1);
      }
      return {
        compasso,
        erros: v.errors.length,
        passadasComErro: v.takes.size,
        exemplosDePassadas: [...v.takes].sort((a, b) => b - a).slice(0, 4),
        tipos,
        dedosSugeridosNosErros: Object.fromEntries([...dedos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)),
        trocasMaisComuns: [...trocas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t} (${n} vezes)`),
      };
    });
}

function groupTakes(takes: TakeLog[]) {
  const by = new Map<string, TakeLog[]>();
  for (const t of takes) by.set(t.sourceId, [...(by.get(t.sourceId) ?? []), t]);
  for (const list of by.values()) list.sort((a, b) => a.at - b.at);
  return by;
}

function takeGroupSummary(list: TakeLog[]) {
  const accs = list.map((t) => t.accuracy);
  const byBpm = new Map<number, number[]>();
  for (const t of list) byBpm.set(t.bpm, [...(byBpm.get(t.bpm) ?? []), t.accuracy]);
  const drifts = list.map((t) => t.drift).filter((d): d is number => d !== null);
  const means = list.map((t) => t.meanDelta).filter((d): d is number => d !== null);
  return {
    titulo: list[0].title,
    passadas: list.length,
    numeracaoDasPassadas: `${list[0].n} a ${list[list.length - 1].n}`,
    acerto: { primeira: pct(accs[0]), ultima: pct(accs[accs.length - 1]), media: pct(accs.reduce((a, b) => a + b, 0) / accs.length), melhor: pct(Math.max(...accs)) },
    acertoPorAndamento: [...byBpm.entries()].sort((a, b) => a[0] - b[0]).map(([bpm, a]) => ({ bpm, passadas: a.length, acertoMedio: pct(a.reduce((x, y) => x + y, 0) / a.length) })),
    tempo: {
      emMediaMs: means.length ? Math.round(means.reduce((a, b) => a + b, 0) / means.length) : null,
      passadasQueAceleraram: drifts.filter((d) => d < -80).length,
      passadasQueAtrasaram: drifts.filter((d) => d > 80).length,
    },
    compassosComMaisErro: measureTable(list),
    dedos: fingerTable(list),
  };
}

export interface WeekDigest {
  semana: { de: string; ate: string };
  constancia: { minutos: number; dias: number; minutosTocandoLivre: number; meta: { minutos: number; dias: number }; semanaAnterior: { minutos: number; dias: number } };
  musicas: ReturnType<typeof takeGroupSummary>[];
  exercicios: (ReturnType<typeof takeGroupSummary> | { titulo: string; bpmInicio: number; bpmFim: number; passadas: number })[];
  arcade: { titulo: string; passadas: number; acertoMedio: number }[];
  dedosEmTudo: ReturnType<typeof fingerTable>;
  leitura: { rodadas: number; tempoMedioMs: number | null; acertoDePrimeira: number | null; notasQueMaisErra: string[] } | null;
  ouvido: { maiorFrase: number } | null;
  marcosGravados: { musica: string; acerto: number | null; bpm: number | null }[];
  alvos: Target[];
}

export function buildDigest(input: DigestInput): { digest: WeekDigest; qualifies: boolean; minutes: number; days: number } {
  const { start, end } = lastWeek(input.now);
  const inWeek = (t: number) => t >= start && t < end;
  const dayIn = (d: string, s: number, e: number) => {
    const t = new Date(`${d}T12:00`).getTime();
    return t >= s && t < e;
  };
  const sumDays = (s: number, e: number) => {
    const by = new Map<string, number>();
    let free = 0;
    for (const p of input.practice) if (dayIn(p.day, s, e)) {
      by.set(p.day, (by.get(p.day) ?? 0) + p.minutes);
      free += p.free ?? 0;
    }
    return { minutos: Math.round([...by.values()].reduce((a, b) => a + b, 0)), dias: [...by.values()].filter((m) => m > 0).length, free };
  };
  const week = sumDays(start, end);
  const prev = sumDays(start - 7 * DAY, start);

  const takes = input.takes.filter((t) => inWeek(t.at));
  const groups = groupTakes(takes);
  const alvos: Target[] = [
    { id: 'treino', titulo: 'Treino do dia (técnica, leitura, ouvido)', rota: '/treino' },
    { id: 'leitura', titulo: 'Leitura de notas', rota: '/treino/notas' },
    { id: 'eco', titulo: 'Ouvir e tocar de volta', rota: '/treino/eco' },
    { id: 'livre', titulo: 'Tocar livre (com metrônomo que some)', rota: '/tocar' },
  ];

  const musicas: WeekDigest['musicas'] = [];
  const exercicios: WeekDigest['exercicios'] = [];
  const arcade: WeekDigest['arcade'] = [];
  for (const [id, list] of groups) {
    const kind = list[0].kind;
    if (kind === 'musica') {
      musicas.push(takeGroupSummary(list));
      const rota = input.songRoute(id);
      if (rota) alvos.push({ id, titulo: list[0].title, rota });
    } else if (kind === 'exercicio') exercicios.push(takeGroupSummary(list));
    else arcade.push({ titulo: list[0].title, passadas: list.length, acertoMedio: pct(list.reduce((a, t) => a + t.accuracy, 0) / list.length) });
  }
  // Escada de técnica (registros tec-*): de onde saiu e aonde chegou o andamento.
  const tech = new Map<string, TrainingRun[]>();
  for (const r of input.runs) if (r.treinoId.startsWith('tec-') && inWeek(r.at) && r.bpm) tech.set(r.treinoId, [...(tech.get(r.treinoId) ?? []), r]);
  for (const [id, list] of tech) {
    list.sort((a, b) => a.at - b.at);
    exercicios.push({ titulo: `técnica ${id.slice(4)}`, bpmInicio: list[0].bpm!, bpmFim: Math.max(...list.filter((r) => r.clean).map((r) => r.bpm!), list[0].bpm!), passadas: list.length });
  }

  const reading = input.runs.filter((r) => inWeek(r.at) && r.avgMs && (r.kind === 'names' || r.kind === 'locate'));
  const weakNotes = input.notes
    .filter((n) => n.seen >= 3 && n.lastAt >= start - 21 * DAY && 1 - n.acc >= 0.2)
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5)
    .map((n) => `${name(n.midi)} na clave de ${n.clef === 'bass' ? 'fá' : 'sol'} (${pct(1 - n.acc)}% de erro)`);
  const eco = input.runs.filter((r) => r.treinoId === 'eco' && inWeek(r.at) && r.level);

  const digest: WeekDigest = {
    semana: { de: key(start), ate: key(end - DAY) },
    constancia: { minutos: week.minutos, dias: week.dias, minutosTocandoLivre: week.free, meta: { minutos: input.goal.minutes, dias: input.goal.days }, semanaAnterior: { minutos: prev.minutos, dias: prev.dias } },
    musicas: musicas.sort((a, b) => b.passadas - a.passadas).slice(0, 6),
    exercicios: exercicios.slice(0, 10),
    arcade: arcade.sort((a, b) => b.passadas - a.passadas).slice(0, 4),
    dedosEmTudo: fingerTable(takes),
    leitura: reading.length || weakNotes.length
      ? {
          rodadas: reading.length,
          tempoMedioMs: reading.length ? Math.round(reading.reduce((s, r) => s + r.avgMs!, 0) / reading.length) : null,
          acertoDePrimeira: reading.length ? pct(reading.reduce((s, r) => s + (r.firstTry ?? 0), 0) / reading.length) : null,
          notasQueMaisErra: weakNotes,
        }
      : null,
    ouvido: eco.length ? { maiorFrase: Math.max(...eco.map((r) => r.level!)) } : null,
    marcosGravados: input.recordings.filter((r) => r.kind === 'marco' && inWeek(r.createdAt)).map((r) => ({ musica: r.sourceTitle ?? r.title, acerto: r.accuracy !== undefined ? pct(r.accuracy) : null, bpm: r.bpm ?? null })),
    alvos,
  };
  // Só vale gastar com a IA se a semana teve treino de verdade.
  const qualifies = (week.dias >= 3 && week.minutos >= 60) || week.minutos >= 150;
  return { digest, qualifies, minutes: week.minutos, days: week.dias };
}
