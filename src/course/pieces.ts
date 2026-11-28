// Músicas protegidas que o curso usa: só título, artista e o trecho que importa. O repositório é público,
// então as notas nunca entram aqui; você importa a partitura (MusicXML) no Repertório e a lição acha a sua
// música pelo título. Puro e testado (pieces.test.ts).

import type { Level, Piece } from '../db/db';
import type { Unit } from './types';
import { normalize } from '../repertoire/catalog';

export interface CoursePiece {
  id: string;
  title: string;
  people: string[];
  /** O pedaço que a lição usa: "Refrão", "Riff", "Tema", "Inteira". */
  part: string;
  /** Rótulo curto do tipo: "Rock and roll", "Filme", "Disney", "Ópera". */
  kind: string;
  categories: string[];
  level: Level;
  /** Texto da busca no MuseScore (arranjo fácil). */
  search: string;
  /** Outros títulos que contam como a mesma música no seu repertório. */
  aliases?: string[];
}

const p = (id: string, title: string, people: string[], part: string, kind: string, categories: string[], search: string, aliases?: string[], level: Level = 'facil'): CoursePiece => ({
  id, title, people, part, kind, categories, level, search, aliases,
});

export const COURSE_PIECES: CoursePiece[] = [
  // Unidade 3
  p('love-me-do', 'Love Me Do', ['The Beatles'], 'Inteira', 'Rock', ['pop-rock'], 'Love Me Do easy piano'),
  p('love-me-tender', 'Love Me Tender', ['Elvis Presley'], 'Verso', 'Rock and roll', ['pop-rock'], 'Love Me Tender Elvis easy piano'),
  // Unidade 4
  p('yesterday', 'Yesterday', ['The Beatles'], 'Inteira', 'Rock', ['pop-rock'], 'Yesterday Beatles easy piano'),
  p('blackbird', 'Blackbird', ['The Beatles'], 'Inteira', 'Rock', ['pop-rock'], 'Blackbird Beatles easy piano'),
  p('my-heart-will-go-on', 'My Heart Will Go On', ['James Horner', 'Celine Dion'], 'Introdução e verso', 'Filme', ['filmes'], 'My Heart Will Go On easy piano', ['titanic']),
  p('let-it-be', 'Let It Be', ['The Beatles'], 'Inteira', 'Rock', ['pop-rock'], 'Let It Be easy piano'),
  p('raiders-march', 'Raiders March', ['John Williams'], 'Tema', 'Filme', ['filmes'], 'Raiders March Indiana Jones easy piano', ['indiana jones']),
  p('under-the-sea', 'Under the Sea', ['Alan Menken'], 'Refrão', 'Disney', ['filmes'], 'Under the Sea Little Mermaid easy piano', ['a pequena sereia']),
  p('hound-dog', 'Hound Dog', ['Elvis Presley'], 'Inteira', 'Rock and roll', ['pop-rock'], 'Hound Dog Elvis easy piano'),
  p('johnny-b-goode', 'Johnny B. Goode', ['Chuck Berry'], 'Refrão', 'Rock and roll', ['pop-rock'], 'Johnny B. Goode easy piano', ['johnny b goode']),
  // Unidade 5
  p('imperial-march', 'Imperial March', ['John Williams'], 'Tema', 'Filme', ['filmes'], 'Imperial March Star Wars easy piano', ['marcha imperial']),
  p('godfather', 'Love Theme from The Godfather', ['Nino Rota'], 'Tema', 'Filme', ['filmes'], 'Godfather Love Theme easy piano', ['godfather', 'speak softly love']),
  p('jaws', 'Jaws Theme', ['John Williams'], 'Motivo', 'Filme', ['filmes'], 'Jaws theme easy piano', ['tubarao', 'jaws']),
  p('smoke-on-the-water', 'Smoke on the Water', ['Deep Purple'], 'Riff', 'Rock', ['pop-rock'], 'Smoke on the Water easy piano'),
  p('zombie', 'Zombie', ['The Cranberries'], 'Refrão', 'Rock', ['pop-rock'], 'Zombie Cranberries easy piano'),
  p('caruso', 'Caruso', ['Lucio Dalla'], 'Refrão', 'Ópera pop', ['pop-rock'], 'Caruso Lucio Dalla easy piano'),
  p('hotel-california', 'Hotel California', ['Eagles'], 'Verso', 'Rock', ['pop-rock'], 'Hotel California easy piano'),
  p('star-wars', 'Star Wars Main Theme', ['John Williams'], 'Fanfarra', 'Filme', ['filmes'], 'Star Wars main theme easy piano', ['star wars']),
  p('game-of-thrones', 'Game of Thrones Theme', ['Ramin Djawadi'], 'Tema', 'Série', ['filmes'], 'Game of Thrones theme easy piano', ['game of thrones']),
  // Unidade 6
  p('oh-darling', 'Oh! Darling', ['The Beatles'], 'Introdução e verso', 'Rock', ['pop-rock'], 'Oh Darling Beatles easy piano', ['oh darling']),
  p('whiter-shade', 'A Whiter Shade of Pale', ['Procol Harum'], 'Introdução', 'Rock', ['pop-rock'], 'A Whiter Shade of Pale easy piano', ['whiter shade of pale']),
  p('can-you-feel', 'Can You Feel the Love Tonight', ['Elton John'], 'Refrão', 'Disney', ['filmes'], 'Can You Feel the Love Tonight easy piano'),
  p('jump', 'Jump', ['Van Halen'], 'Riff', 'Rock', ['pop-rock'], 'Jump Van Halen easy piano'),
  p('cant-help-falling', "Can't Help Falling in Love", ['Elvis Presley'], 'Inteira', 'Rock and roll', ['pop-rock'], "Can't Help Falling in Love easy piano", ['cant help falling in love']),
  p('hes-a-pirate', "He's a Pirate", ['Klaus Badelt', 'Hans Zimmer'], 'Tema', 'Filme', ['filmes'], "He's a Pirate easy piano", ['hes a pirate', 'piratas do caribe']),
  p('nothing-else-matters', 'Nothing Else Matters', ['Metallica'], 'Inteira', 'Rock', ['pop-rock'], 'Nothing Else Matters piano', [], 'intermediario'),
  p('interstellar', 'Interstellar', ['Hans Zimmer'], 'Tema', 'Filme', ['filmes'], 'Interstellar main theme easy piano'),
  p('hallelujah', 'Hallelujah', ['Leonard Cohen'], 'Inteira', 'Pop', ['pop-rock'], 'Hallelujah Leonard Cohen easy piano'),
  p('con-te-partiro', 'Con te partirò', ['Andrea Bocelli'], 'Refrão', 'Ópera pop', ['pop-rock'], 'Con te partiro easy piano', ['time to say goodbye']),
  p('imagine', 'Imagine', ['John Lennon'], 'Inteira', 'Rock', ['pop-rock'], 'Imagine John Lennon easy piano'),
  p('hedwig', "Hedwig's Theme", ['John Williams'], 'Tema', 'Filme', ['filmes'], "Hedwig's Theme easy piano", ['hedwigs theme', 'harry potter']),
  p('stairway', 'Stairway to Heaven', ['Led Zeppelin'], 'Introdução', 'Rock', ['pop-rock'], 'Stairway to Heaven piano', [], 'intermediario'),
  // Unidade 7
  p('stand-by-me', 'Stand By Me', ['Ben E. King'], 'Inteira', 'Rock and roll', ['pop-rock'], 'Stand By Me easy piano'),
  p('beauty-and-the-beast', 'Beauty and the Beast', ['Alan Menken'], 'Refrão', 'Disney', ['filmes'], 'Beauty and the Beast easy piano', ['a bela e a fera', 'tale as old as time']),
  p('once-upon-a-dream', 'Once Upon a Dream', ['Tchaikovsky', 'Sammy Fain'], 'Tema', 'Disney', ['filmes'], 'Once Upon a Dream easy piano'),
  p('heart-and-soul', 'Heart and Soul', ['Hoagy Carmichael'], 'Inteira', 'Clássico pop', ['pop-rock'], 'Heart and Soul piano duet easy'),
  p('hit-the-road-jack', 'Hit the Road Jack', ['Ray Charles'], 'Inteira', 'Soul', ['pop-rock'], 'Hit the Road Jack easy piano'),
  p('numb', 'Numb', ['Linkin Park'], 'Verso e refrão', 'Rock', ['pop-rock'], 'Numb Linkin Park easy piano'),
  // Unidade 8
  p('when-you-wish', 'When You Wish Upon a Star', ['Leigh Harline'], 'Inteira', 'Disney', ['filmes'], 'When You Wish Upon a Star easy piano'),
  p('great-balls', 'Great Balls of Fire', ['Jerry Lee Lewis'], 'Inteira', 'Rock and roll', ['pop-rock'], 'Great Balls of Fire piano'),
  p('new-york', 'New York, New York', ['John Kander', 'Frank Sinatra'], 'Refrão', 'Jazz', ['jazz'], 'New York New York Sinatra easy piano', ['theme from new york new york']),
  p('another-one', 'Another One Bites the Dust', ['Queen'], 'Riff do baixo', 'Rock', ['pop-rock'], 'Another One Bites the Dust piano'),
  // Unidade 9 (Nessun dorma é de domínio público, mas a rodada não achou uma edição aberta para conferir as notas)
  p('nessun-dorma', 'Nessun dorma', ['Giacomo Puccini', 'Luciano Pavarotti'], 'Ária', 'Ópera', ['classico'], 'Nessun dorma easy piano', ['turandot']),
  // Unidade 10
  p('sweet-georgia', 'Sweet Georgia Brown', ['Ben Bernie', 'Maceo Pinkard', 'Kenneth Casey'], 'Tema', 'Jazz', ['pop-rock'], 'Sweet Georgia Brown easy piano', ['harlem globetrotters']),
  p('fly-me', 'Fly Me to the Moon', ['Bart Howard', 'Frank Sinatra'], 'Inteira', 'Jazz', ['pop-rock'], 'Fly Me to the Moon easy piano'),
  p('autumn-leaves', 'Autumn Leaves', ['Joseph Kosma', 'Johnny Mercer'], 'Inteira', 'Jazz', ['pop-rock'], 'Autumn Leaves easy piano', ['les feuilles mortes']),
  p('you-ll-be-in-my-heart', "You'll Be in My Heart", ['Phil Collins'], 'Inteira', 'Disney', ['filmes'], "You'll Be in My Heart easy piano", ['youll be in my heart', 'tarzan']),
  // Domínio público, mas sem notas no código: a do caminho de repertório já vem com a partitura (public/library), e a
  // Toccata é de órgão, com fusas de 64 e fermatas que o motor não escreve.
  p('moonlight-1', 'Moonlight Sonata, 1º movimento', ['Ludwig van Beethoven'], 'Inteira', 'Clássica', ['classico'], 'Moonlight Sonata 1st movement piano', ['sonata ao luar', 'mondscheinsonate'], 'avancado'),
  p('toccata', 'Toccata and Fugue in D minor', ['Johann Sebastian Bach'], 'Abertura', 'Clássica', ['classico'], 'Toccata and Fugue in D minor piano', ['toccata e fuga', 'bwv 565'], 'intermediario'),
  // Unidade 11
  p('someone-like-you', 'Someone Like You', ['Adele'], 'Verso e refrão', 'Pop', ['pop-rock'], 'Someone Like You Adele easy piano'),
  p('pink-panther', 'The Pink Panther Theme', ['Henry Mancini'], 'Tema', 'Filme', ['filmes'], 'Pink Panther theme easy piano', ['pink panther', 'pantera cor-de-rosa']),
  p('so-what', 'So What', ['Miles Davis'], 'Tema', 'Jazz', ['pop-rock'], 'So What Miles Davis piano', ['kind of blue']),
  p('eleanor-rigby', 'Eleanor Rigby', ['The Beatles'], 'Verso e refrão', 'Rock', ['pop-rock'], 'Eleanor Rigby easy piano'),
  p('norwegian-wood', 'Norwegian Wood', ['The Beatles'], 'Verso', 'Rock', ['pop-rock'], 'Norwegian Wood Beatles easy piano', ['this bird has flown']),
  // Unidade 12
  p('always-love-you', 'I Will Always Love You', ['Dolly Parton', 'Whitney Houston'], 'Último refrão', 'Pop', ['pop-rock'], 'I Will Always Love You Whitney Houston easy piano', ['always love you']),
  p('bohemian', 'Bohemian Rhapsody', ['Queen'], 'Balada', 'Rock', ['pop-rock'], 'Bohemian Rhapsody piano ballad', [], 'intermediario'),
  p('comptine', "Comptine d'un autre été", ['Yann Tiersen'], 'Inteira', 'Filme', ['filmes'], "Comptine d'un autre ete easy piano", ['comptine', 'amelie']),
  p('river-flows', 'River Flows in You', ['Yiruma'], 'Inteira', 'Piano', ['pop-rock'], 'River Flows in You easy piano', ['river flows']),
  p('sadness-and-sorrow', 'Sadness and Sorrow', ['Toshio Masuda'], 'Inteira', 'Anime', ['filmes'], 'Sadness and Sorrow Naruto piano', ['naruto']),
  p('nuvole-bianche', 'Nuvole Bianche', ['Ludovico Einaudi'], 'Inteira', 'Piano', ['classico'], 'Nuvole Bianche piano', [], 'intermediario'),
  p('canon-d', 'Canon in D', ['Johann Pachelbel'], 'Inteira', 'Clássica', ['classico'], 'Canon in D piano', ['canon em re', 'canone'], 'intermediario'),
  p('dan-dan', 'Sorriso Resplandecente', ['Field of View'], 'Abertura', 'Anime', ['filmes'], 'DAN DAN Kokoro Hikareteku easy piano', ['dan dan', 'dragon ball gt', 'sorriso resplandecente']),
  // Domínio público, sem notas no código: a partitura completa vem do caminho de repertório (public/library).
  p('clair-de-lune', 'Clair de lune', ['Claude Debussy'], 'Abertura', 'Clássica', ['classico'], 'Clair de lune Debussy piano', ['suite bergamasque'], 'avancado'),
  p('paganini-18', 'Rhapsody on a Theme of Paganini, Variação 18', ['Sergei Rachmaninoff'], 'Inteira', 'Clássica', ['classico'], 'Rachmaninoff Variation 18 piano', ['variation 18', 'variacao 18'], 'avancado'),
];

export function findCoursePiece(id: string): CoursePiece | undefined {
  return COURSE_PIECES.find((c) => c.id === id);
}

/** Tem MusicXML (dá para tocar junto). */
const hasScore = (p: Piece) => Boolean(p.scoreFileId || p.scoreFileUid);
/** Tem PDF ou foto da partitura. */
const hasSheet = (p: Piece) => Boolean(p.fileId || p.fileUid);

/**
 * A música no seu repertório: o título (ou um apelido) aparece no título da sua, sem acento e sem caixa.
 * Com mais de uma (dois arranjos), vale a que tem MusicXML, depois a que tem PDF, depois a de título igual.
 */
export function pieceInRepertoire(cp: CoursePiece, pieces: Piece[]): Piece | null {
  const names = [cp.title, ...(cp.aliases ?? [])].map(normalize).filter(Boolean);
  const found = pieces.filter((pc) => {
    const t = normalize(pc.title);
    return names.some((n) => t.includes(n));
  });
  const rank = (pc: Piece) => (hasScore(pc) ? 4 : 0) + (hasSheet(pc) ? 2 : 0) + (names.includes(normalize(pc.title)) ? 1 : 0);
  return found.reduce<Piece | null>((best, pc) => (!best || rank(pc) > rank(best) ? pc : best), null);
}

/** fora: não está no repertório; sem-partitura: está, sem arquivo; so-pdf: tem PDF, falta o MusicXML; pronta: tem MusicXML. */
export type PieceState = 'fora' | 'sem-partitura' | 'so-pdf' | 'pronta';

export function pieceState(piece: Piece | null): PieceState {
  if (!piece) return 'fora';
  if (hasScore(piece)) return 'pronta';
  return hasSheet(piece) ? 'so-pdf' : 'sem-partitura';
}

/** Link da busca no MuseScore, para achar um arranjo fácil. */
export function museScoreSearch(cp: CoursePiece): string {
  return `https://musescore.com/sheetmusic?text=${encodeURIComponent(cp.search)}`;
}

export interface CoursePieceRow {
  cp: CoursePiece;
  /** Lições que usam a música, em ordem. */
  lessons: { unit: number; n: number; id: string }[];
  piece: Piece | null;
  state: PieceState;
}

/** Todas as músicas protegidas que as lições usam, na ordem em que aparecem no curso, com o que você já tem. */
export function coursePieceRows(units: Unit[], pieces: Piece[]): CoursePieceRow[] {
  const uses = new Map<string, CoursePieceRow['lessons']>();
  for (const u of units) {
    for (const l of u.lessons) {
      for (const m of l.music ?? []) {
        if (!('piece' in m)) continue;
        const list = uses.get(m.piece) ?? [];
        if (!list.some((x) => x.id === l.id)) list.push({ unit: u.n, n: l.n, id: l.id });
        uses.set(m.piece, list);
      }
    }
  }
  const rows: CoursePieceRow[] = [];
  for (const [id, lessons] of uses) {
    const cp = findCoursePiece(id);
    if (!cp) continue;
    const piece = pieceInRepertoire(cp, pieces);
    rows.push({ cp, lessons: lessons.sort((a, b) => a.n - b.n), piece, state: pieceState(piece) });
  }
  return rows.sort((a, b) => a.lessons[0].n - b.lessons[0].n);
}

/** Uma linha da lista do que falta: "Love Me Do (The Beatles) - Partitura - XML"; só "XML" quando o PDF já está lá. */
export function missingLine(row: CoursePieceRow): string | null {
  if (row.state === 'pronta') return null;
  const what = row.state === 'so-pdf' ? 'XML' : 'Partitura - XML';
  return `${row.cp.title} (${row.cp.people.join(', ')}) - ${what}`;
}
