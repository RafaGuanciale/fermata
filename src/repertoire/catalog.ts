import type { PhotoKey } from '../media/photos';
import type { LearnStatus, Level, Piece } from '../db/db';

export interface Category {
  slug: string;
  title: string;
  eyebrow: string;
  photo: PhotoKey;
}

/** Temas e gêneros. Uma peça pode estar em várias. */
export const CATEGORIES: Category[] = [
  { slug: 'filmes', title: 'Filmes e séries', eyebrow: 'Trilhas · Cinema', photo: 'filmes' },
  { slug: 'classico', title: 'Clássico', eyebrow: 'Barroco · Romântico', photo: 'classico' },
  { slug: 'jazz', title: 'Jazz', eyebrow: 'Standards · Improviso', photo: 'jazz' },
  { slug: 'mpb', title: 'MPB e brasileira', eyebrow: 'Bossa · Baião · Samba', photo: 'mpb' },
  { slug: 'pop-rock', title: 'Pop e rock', eyebrow: 'Bandas · Hits', photo: 'popRock' },
  { slug: 'jogos', title: 'Jogos', eyebrow: 'Trilhas · Games', photo: 'jogos' },
  { slug: 'infantil', title: 'Infantil', eyebrow: 'Cantigas · Primeiras peças', photo: 'infantil' },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export const STATUS_LABEL: Record<LearnStatus, string> = {
  wish: 'Quero aprender',
  learning: 'Aprendendo',
  learned: 'Aprendi',
  repertoire: 'No repertório',
};

export const STATUS_ORDER: LearnStatus[] = ['learning', 'wish', 'learned', 'repertoire'];

export const LEVEL_LABEL: Record<Level, string> = {
  facil: 'Fácil',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

/** "Luiz Gonzaga, Humberto Teixeira" → ["Luiz Gonzaga", "Humberto Teixeira"] */
export function parsePeople(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(/[,;]| e (?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => {
      const key = s.toLocaleLowerCase('pt-BR');
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Busca sem acento e sem caixa: "beethoven" acha "Beethoven", "ode a alegria" acha "Ode à Alegria". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
}

export function matchesQuery(p: Piece, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const cats = p.categories.map((c) => categoryBySlug(c)?.title ?? c);
  return normalize([p.title, p.arrangement, ...p.people, ...cats].join(' ')).includes(q);
}

export interface Musician {
  name: string;
  count: number;
}

export function musiciansOf(pieces: Piece[]): Musician[] {
  const map = new Map<string, Musician>();
  for (const p of pieces) {
    for (const name of p.people) {
      const key = normalize(name);
      const m = map.get(key) ?? { name, count: 0 };
      m.count += 1;
      map.set(key, m);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
}

export function initials(name: string): string {
  const parts = name.split(' ').filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w));
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
