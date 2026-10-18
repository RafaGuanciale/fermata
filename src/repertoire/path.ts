// O caminho de repertório: dez músicas, da primeira semana até a meta de anos, cada uma ensinando uma ou duas
// habilidades novas sobre as que vieram antes. As de domínio público vêm com a partitura (public/library, com a
// licença de cada edição em LICENSES.md); as protegidas entram como meta e você importa a partitura.
// Puro e testado (path.test.ts).

import type { Level, Piece } from '../db/db';
import { normalize } from './catalog';

export interface PathPhase {
  n: number;
  title: string;
  when: string;
}

export const PATH_PHASES: PathPhase[] = [
  { n: 1, title: 'Primeiros passos', when: 'primeiras semanas' },
  { n: 2, title: 'As duas mãos', when: 'de 2 a 6 meses' },
  { n: 3, title: 'Primeiros clássicos de verdade', when: 'de 6 a 12 meses' },
  { n: 4, title: 'Fluência e som', when: 'de 1 a 2 anos' },
  { n: 5, title: 'A meta', when: 'de 2 a 4 anos' },
];

export interface PathSong {
  id: string;
  phase: number;
  title: string;
  people: string[];
  categories: string[];
  level: Level;
  /** o que esta música ensina */
  teaches: string;
  /** por que vale a pena (motivação) */
  why: string;
  /** partitura que vem com o app (domínio público) */
  file?: { path: string; name: string; source: string };
  /** música do curso que serve enquanto você não tem a sua */
  courseSong?: string;
  /** andamento ideal (semínimas por minuto), quando se sabe */
  bpm?: number;
  /** outros títulos que contam como a mesma música no seu repertório */
  aliases?: string[];
}

export const PATH_SONGS: PathSong[] = [
  {
    id: 'ode',
    phase: 1,
    title: 'Ode to Joy',
    people: ['Ludwig van Beethoven'],
    categories: ['classico'],
    level: 'facil',
    teaches: 'Mão parada nas cinco notas, ler na clave de sol, tempo constante.',
    why: 'É onde você já está. Melodia que todo mundo conhece.',
    courseSong: 'u01-ode-8',
    aliases: ['ode a alegria', 'ode an die freude', 'hino a alegria'],
  },
  {
    id: 'let-it-be',
    phase: 1,
    title: 'Let It Be',
    people: ['The Beatles'],
    categories: ['pop-rock'],
    level: 'facil',
    teaches: 'Melodia na direita e acordes em bloco na esquerda: Dó, Sol, Lá menor e Fá.',
    why: 'Com esses quatro acordes você toca centenas de músicas.',
  },
  {
    id: 'sorriso',
    phase: 2,
    title: 'DAN DAN Kokoro Hikareteku',
    people: ['Field of View'],
    categories: ['filmes'],
    level: 'facil',
    teaches: 'Síncopa (nota que entra antes do tempo), mudar a mão de posição, ritmo mais rápido.',
    why: 'A sua música. Primeiro um arranjo fácil; na fase 4, o arranjo completo.',
    aliases: ['sorriso resplandecente', 'dan dan', 'dragon ball gt'],
  },
  {
    id: 'interstellar',
    phase: 2,
    title: 'Interstellar',
    people: ['Hans Zimmer'],
    categories: ['filmes'],
    level: 'facil',
    teaches: 'Pedal, tocar devagar com controle de volume, notas repetidas na esquerda com melodia por cima.',
    why: 'Repetitiva, então sai rápido, e soa enorme.',
    aliases: ['first step', 'cornfield chase'],
  },
  {
    id: 'gymnopedie',
    phase: 3,
    title: 'Gymnopédie No. 1',
    people: ['Erik Satie'],
    categories: ['classico'],
    level: 'intermediario',
    teaches: 'Saltos da esquerda (baixo grave, acorde no meio), troca de pedal, melodia cantada.',
    why: 'Lenta e fácil de ler, mas pede controle. A primeira peça clássica de verdade.',
    file: { path: '/library/gymnopedie-1.mxl', name: 'gymnopedie-1.mxl', source: 'Edição Mutopia Project, domínio público' },
    bpm: 66,
    aliases: ['gymnopedie 1', 'gymnopedie no 1', 'gymnopedie n 1', 'gymnopedie no. 1'],
  },
  {
    id: 'comptine',
    phase: 3,
    title: "Comptine d'un autre été",
    people: ['Yann Tiersen'],
    categories: ['filmes'],
    level: 'intermediario',
    teaches: 'Esquerda contínua, sem parar (resistência), e o volume crescendo aos poucos.',
    why: 'Do filme Amélie. Você ouve e pensa: eu toco isso.',
    aliases: ['comptine', 'amelie'],
  },
  {
    id: 'fur-elise',
    phase: 3,
    title: 'Für Elise',
    people: ['Ludwig van Beethoven'],
    categories: ['classico'],
    level: 'intermediario',
    teaches: 'A parte do meio traz escalas rápidas, arpejos e mudança de caráter.',
    why: 'A peça que todo mundo reconhece. O tema A já está no curso.',
    file: { path: '/library/fur-elise.mxl', name: 'fur-elise.mxl', source: 'Edição Mutopia Project, domínio público' },
    bpm: 66,
    aliases: ['fur elise', 'pour elise', 'para elisa'],
  },
  {
    id: 'river',
    phase: 4,
    title: 'River Flows in You',
    people: ['Yiruma'],
    categories: [],
    level: 'intermediario',
    teaches: 'Arpejos fluidos nas duas mãos, a direita mais livre, tocar com expressão.',
    why: 'Uma das peças de piano mais tocadas do mundo.',
  },
  {
    id: 'moonlight',
    phase: 4,
    title: 'Moonlight Sonata, 1º movimento',
    people: ['Ludwig van Beethoven'],
    categories: ['classico'],
    level: 'intermediario',
    teaches: 'Tercinas contínuas na direita com a melodia cantada pelo mínimo por cima, oitavas graves, pedal a cada acorde.',
    why: 'A que você mais quer. Lenta: o desafio não é velocidade, é som.',
    file: { path: '/library/moonlight-sonata-1.mxl', name: 'moonlight-sonata-1.mxl', source: 'Edição DCML (EPFL), CC BY-NC-SA 4.0' },
    bpm: 108,
    aliases: ['moonlight sonata', 'sonata ao luar', 'mondscheinsonate', 'sonata 14'],
  },
  {
    id: 'clair',
    phase: 5,
    title: 'Clair de lune',
    people: ['Claude Debussy'],
    categories: ['classico'],
    level: 'avancado',
    teaches: 'Tudo junto: pedal sutil, pianíssimo, mãos cruzadas, arpejos longos, tempo flexível.',
    why: 'O horizonte: você sabe aonde está indo.',
    file: { path: '/library/clair-de-lune.mxl', name: 'clair-de-lune.mxl', source: 'Edição DCML (EPFL), CC BY-NC-SA 4.0' },
    bpm: 66,
    aliases: ['clair de lune', 'suite bergamasque'],
  },
];

/** Títulos antigos (traduzidos) de músicas que já entraram no repertório pelo caminho: viram o original. */
export const OLD_PATH_TITLES: Record<string, string[]> = {
  ode: ['Ode à Alegria'],
  sorriso: ['Sorriso Resplandecente'],
  gymnopedie: ['Gymnopédie nº 1'],
  moonlight: ['Sonata ao Luar, 1º movimento'],
};

export type PathState = 'aprendida' | 'aprendendo' | 'meta' | 'fora';

export interface PathItem {
  song: PathSong;
  piece: Piece | null;
  state: PathState;
  /** tem partitura para tocar junto (a sua ou a do curso) */
  playable: boolean;
}

/** A música do caminho no seu repertório: pela marca do caminho ou pelo título (sem acento e sem caixa). */
export function findPathPiece(song: PathSong, pieces: Piece[]): Piece | null {
  const marked = pieces.find((p) => p.pathId === song.id);
  if (marked) return marked;
  const names = [song.title, ...(song.aliases ?? [])].map(normalize);
  return pieces.find((p) => {
    const t = normalize(p.title);
    return names.some((n) => t.includes(n));
  }) ?? null;
}

export function pathItems(pieces: Piece[]): PathItem[] {
  return PATH_SONGS.map((song) => {
    const piece = findPathPiece(song, pieces);
    const state: PathState = !piece ? 'fora' : piece.status === 'learned' || piece.status === 'repertoire' ? 'aprendida' : piece.status === 'learning' ? 'aprendendo' : 'meta';
    return { song, piece, state, playable: Boolean(piece?.scoreFileId || piece?.scoreFileUid || (!piece && song.courseSong)) };
  });
}

/** A próxima do caminho: a primeira que ainda não foi aprendida. */
export function nextOnPath(items: PathItem[]): PathItem | null {
  return items.find((i) => i.state !== 'aprendida') ?? null;
}
