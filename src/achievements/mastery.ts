// Gamificação: cada tipo de progresso vira uma trilha de maestria com 7 níveis, nomeados pelas dinâmicas
// (pp, p, mp, mf, f, ff, fff). A soma dos níveis é o seu nível de músico, com um título.
// Puro e testado (mastery.test.ts); os números vêm do banco local (useMastery.ts).

export interface MasteryInput {
  minutesTotal: number;
  bestStreak: number;
  lessonsPassed: number;
  allUnitsComplete: boolean;
  songsLearned: number;
  techAtTarget: number;
  readingLevels: number;
  arcadeStars: number;
  fullDays: number;
}

export type TrackId = 'horas' | 'constancia' | 'curso' | 'repertorio' | 'tecnica' | 'leitura' | 'arcade' | 'treino';

export interface TrackDef {
  id: TrackId;
  name: string;
  /** Como subir: uma frase. */
  how: string;
  /** Valor necessário para cada um dos 7 níveis. */
  tiers: number[];
  value: (i: MasteryInput) => number;
  /** O valor em palavras ("12 h", "8 dias"). */
  show: (v: number) => string;
}

const hours = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h`);

export const TRACKS: TrackDef[] = [
  { id: 'horas', name: 'Horas de piano', how: 'Toque com o piano conectado: cada minuto conta.', tiers: [60, 300, 600, 1500, 3000, 6000, 15000], value: (i) => i.minutesTotal, show: hours },
  { id: 'constancia', name: 'Constância', how: 'Toque em dias seguidos. Vale a sua maior sequência.', tiers: [3, 7, 14, 30, 60, 100, 365], value: (i) => i.bestStreak, show: (v) => `${v} ${v === 1 ? 'dia' : 'dias'}` },
  { id: 'curso', name: 'Curso', how: 'Conclua lições do Estudo. O último nível pede as 12 unidades completas.', tiers: [1, 8, 25, 50, 75, 100, 101], value: (i) => i.lessonsPassed + (i.allUnitsComplete ? 1 : 0), show: (v) => `${Math.min(v, 100)} ${v === 1 ? 'lição' : 'lições'}` },
  { id: 'repertorio', name: 'Repertório', how: 'Aprenda músicas: as do curso, aprovadas no Tocar a música, e as do seu repertório.', tiers: [1, 3, 5, 10, 20, 35, 50], value: (i) => i.songsLearned, show: (v) => `${v} ${v === 1 ? 'música' : 'músicas'}` },
  { id: 'tecnica', name: 'Técnica', how: 'Leve itens de técnica do Treino até o andamento alvo.', tiers: [1, 3, 6, 10, 15, 20, 25], value: (i) => i.techAtTarget, show: (v) => `${v} no alvo` },
  { id: 'leitura', name: 'Leitura de notas', how: 'Passe os níveis da leitura de notas na pauta.', tiers: [1, 2, 3, 5, 7, 9, 10], value: (i) => i.readingLevels, show: (v) => `${v} de 10 níveis` },
  { id: 'arcade', name: 'Arcade', how: 'Ganhe estrelas no arcade (até 3 por música).', tiers: [3, 8, 15, 22, 30, 36, 42], value: (i) => i.arcadeStars, show: (v) => `${v} ${v === 1 ? 'estrela' : 'estrelas'}` },
  { id: 'treino', name: 'Treino do dia', how: 'Complete o Treino de hoje inteiro.', tiers: [1, 5, 15, 30, 60, 100, 200], value: (i) => i.fullDays, show: (v) => `${v} ${v === 1 ? 'dia completo' : 'dias completos'}` },
];

/** Nomes dos níveis: as dinâmicas, do mais leve ao mais forte. */
export const LEVEL_NAMES = ['—', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];

export interface TrackStatus {
  def: TrackDef;
  value: number;
  level: number;
  /** Quanto falta para o próximo nível (0 a 1). */
  progress: number;
  next: number | null;
}

export function trackStatus(def: TrackDef, input: MasteryInput): TrackStatus {
  const value = def.value(input);
  const level = def.tiers.filter((t) => value >= t).length;
  const next = level < def.tiers.length ? def.tiers[level] : null;
  const prev = level > 0 ? def.tiers[level - 1] : 0;
  const progress = next === null ? 1 : Math.max(0, Math.min(1, (value - prev) / (next - prev)));
  return { def, value, level, progress, next };
}

export const allTracks = (input: MasteryInput) => TRACKS.map((d) => trackStatus(d, input));

export interface MusicianLevel {
  /** Soma dos níveis das trilhas (0 a 56). */
  level: number;
  max: number;
  title: string;
  /** Faixa visual do anel do avatar (0 a 4). */
  tier: number;
  /** Próximo título e quantos níveis faltam. */
  nextTitle: string | null;
  toNext: number;
  /** Progresso dentro da faixa do título atual (0 a 1). */
  titleProgress: number;
}

const TITLES: [number, string][] = [
  [0, 'Primeiras notas'],
  [4, 'Aprendiz'],
  [11, 'Pianista em formação'],
  [21, 'Pianista dedicado'],
  [33, 'Pianista avançado'],
  [45, 'Mestre do teclado'],
  [56, 'Lenda do Fermata'],
];

export function musicianLevel(tracks: TrackStatus[]): MusicianLevel {
  const level = tracks.reduce((s, t) => s + t.level, 0);
  const max = tracks.length * 7;
  let k = 0;
  for (let i = 0; i < TITLES.length; i++) if (level >= TITLES[i][0]) k = i;
  const next = TITLES[k + 1] ?? null;
  const titleProgress = next ? (level - TITLES[k][0]) / (next[0] - TITLES[k][0]) : 1;
  return { level, max, title: TITLES[k][1], tier: Math.min(4, Math.floor(k * 4 / (TITLES.length - 1))), nextTitle: next?.[1] ?? null, toNext: next ? next[0] - level : 0, titleProgress };
}

/** Níveis que subiram desde a última vez (para a comemoração). */
export function levelUps(prev: Partial<Record<TrackId, number>>, tracks: TrackStatus[]): TrackStatus[] {
  return tracks.filter((t) => t.level > (prev[t.def.id] ?? 0));
}

/** Maior sequência de dias seguidos com prática, a partir dos minutos por dia ("2026-10-08" → minutos). */
export function longestStreak(byDay: Map<string, number>): number {
  const days = [...byDay.entries()].filter(([, m]) => m > 0).map(([d]) => d).sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const cur = new Date(`${d}T12:00`).getTime();
    run = prev !== null && Math.round((cur - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}
