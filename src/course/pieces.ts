// Músicas protegidas que o curso usa: só título, artista e o trecho que importa. O repositório é público,
// então as notas nunca entram aqui; você importa a partitura (MusicXML) no Repertório e a lição acha a sua
// música pelo título. Puro e testado (pieces.test.ts).

import type { Level, Piece } from '../db/db';
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
  p('hey-jude', 'Hey Jude', ['The Beatles'], 'Verso e coda', 'Rock', ['pop-rock'], 'Hey Jude easy piano'),
  p('let-it-be', 'Let It Be', ['The Beatles'], 'Inteira', 'Rock', ['pop-rock'], 'Let It Be easy piano'),
  p('raiders-march', 'Raiders March', ['John Williams'], 'Tema', 'Filme', ['filmes'], 'Raiders March Indiana Jones easy piano', ['indiana jones']),
  p('seven-nation-army', 'Seven Nation Army', ['The White Stripes'], 'Riff', 'Rock', ['pop-rock'], 'Seven Nation Army easy piano'),
  p('under-the-sea', 'Under the Sea', ['Alan Menken'], 'Refrão', 'Disney', ['filmes'], 'Under the Sea Little Mermaid easy piano', ['a pequena sereia']),
  p('jurassic-park', 'Jurassic Park Theme', ['John Williams'], 'Tema', 'Filme', ['filmes'], 'Jurassic Park theme easy piano', ['jurassic park']),
  p('hound-dog', 'Hound Dog', ['Elvis Presley'], 'Inteira', 'Rock and roll', ['pop-rock'], 'Hound Dog Elvis easy piano'),
  p('johnny-b-goode', 'Johnny B. Goode', ['Chuck Berry'], 'Refrão', 'Rock and roll', ['pop-rock'], 'Johnny B. Goode easy piano', ['johnny b goode']),
  // Unidade 5
  p('imperial-march', 'Imperial March', ['John Williams'], 'Tema', 'Filme', ['filmes'], 'Imperial March Star Wars easy piano', ['marcha imperial']),
  p('godfather', 'Love Theme from The Godfather', ['Nino Rota'], 'Tema', 'Filme', ['filmes'], 'Godfather Love Theme easy piano', ['godfather', 'speak softly love']),
  p('star-wars-jaws', 'Star Wars e Jaws (motivos)', ['John Williams'], 'Motivo', 'Filme', ['filmes'], 'Jaws theme easy piano'),
  p('smoke-on-the-water', 'Smoke on the Water', ['Deep Purple'], 'Riff', 'Rock', ['pop-rock'], 'Smoke on the Water easy piano'),
  p('zombie', 'Zombie', ['The Cranberries'], 'Refrão', 'Rock', ['pop-rock'], 'Zombie Cranberries easy piano'),
  p('caruso', 'Caruso', ['Lucio Dalla'], 'Refrão', 'Ópera pop', ['pop-rock'], 'Caruso Lucio Dalla easy piano'),
  p('final-countdown', 'The Final Countdown', ['Europe'], 'Riff', 'Rock', ['pop-rock'], 'The Final Countdown easy piano', ['final countdown']),
  p('star-wars', 'Star Wars Main Theme', ['John Williams'], 'Fanfarra', 'Filme', ['filmes'], 'Star Wars main theme easy piano', ['star wars']),
  p('game-of-thrones', 'Game of Thrones Theme', ['Ramin Djawadi'], 'Tema', 'Série', ['filmes'], 'Game of Thrones theme easy piano', ['game of thrones']),
  // Unidade 6
  p('can-you-feel', 'Can You Feel the Love Tonight', ['Elton John'], 'Refrão', 'Disney', ['filmes'], 'Can You Feel the Love Tonight easy piano'),
  p('jump', 'Jump', ['Van Halen'], 'Riff', 'Rock', ['pop-rock'], 'Jump Van Halen easy piano'),
  p('cant-help-falling', "Can't Help Falling in Love", ['Elvis Presley'], 'Inteira', 'Rock and roll', ['pop-rock'], "Can't Help Falling in Love easy piano", ['cant help falling in love']),
  p('hes-a-pirate', "He's a Pirate", ['Klaus Badelt', 'Hans Zimmer'], 'Tema', 'Filme', ['filmes'], "He's a Pirate easy piano", ['hes a pirate', 'piratas do caribe']),
  p('interstellar', 'Interstellar', ['Hans Zimmer'], 'Tema', 'Filme', ['filmes'], 'Interstellar main theme easy piano'),
  p('hallelujah', 'Hallelujah', ['Leonard Cohen'], 'Inteira', 'Pop', ['pop-rock'], 'Hallelujah Leonard Cohen easy piano'),
  p('con-te-partiro', 'Con te partirò', ['Andrea Bocelli'], 'Refrão', 'Ópera pop', ['pop-rock'], 'Con te partiro easy piano', ['time to say goodbye']),
  p('imagine', 'Imagine', ['John Lennon'], 'Inteira', 'Rock', ['pop-rock'], 'Imagine John Lennon easy piano'),
  p('hedwig', "Hedwig's Theme", ['John Williams'], 'Tema', 'Filme', ['filmes'], "Hedwig's Theme easy piano", ['hedwigs theme', 'harry potter']),
  // Unidade 7
  p('stand-by-me', 'Stand By Me', ['Ben E. King'], 'Inteira', 'Rock and roll', ['pop-rock'], 'Stand By Me easy piano'),
  p('beauty-and-the-beast', 'Beauty and the Beast', ['Alan Menken'], 'Refrão', 'Disney', ['filmes'], 'Beauty and the Beast easy piano', ['a bela e a fera', 'tale as old as time']),
  p('once-upon-a-dream', 'Once Upon a Dream', ['Tchaikovsky', 'Sammy Fain'], 'Tema', 'Disney', ['filmes'], 'Once Upon a Dream easy piano'),
  // Unidade 8
  p('when-you-wish', 'When You Wish Upon a Star', ['Leigh Harline'], 'Inteira', 'Disney', ['filmes'], 'When You Wish Upon a Star easy piano'),
  p('sweet-child', "Sweet Child O' Mine", ["Guns N' Roses"], 'Intro', 'Rock', ['pop-rock'], "Sweet Child O' Mine intro piano", ['sweet child o mine']),
  p('great-balls', 'Great Balls of Fire', ['Jerry Lee Lewis'], 'Inteira', 'Rock and roll', ['pop-rock'], 'Great Balls of Fire piano'),
  p('friend-in-me', "You've Got a Friend in Me", ['Randy Newman'], 'Refrão', 'Disney', ['filmes'], "You've Got a Friend in Me easy piano", ['youve got a friend in me', 'toy story']),
  p('another-one', 'Another One Bites the Dust', ['Queen'], 'Riff do baixo', 'Rock', ['pop-rock'], 'Another One Bites the Dust piano'),
  // Unidade 10
  p('whole-new-world', 'A Whole New World', ['Alan Menken'], 'Inteira', 'Disney', ['filmes'], 'A Whole New World easy piano', ['aladdin']),
  // Unidade 12
  p('bohemian', 'Bohemian Rhapsody', ['Queen'], 'Balada', 'Rock', ['pop-rock'], 'Bohemian Rhapsody piano ballad', [], 'intermediario'),
  p('paganini-18', 'Rhapsody on a Theme of Paganini, Variação 18', ['Sergei Rachmaninoff'], 'Inteira', 'Clássica', ['classico'], 'Rachmaninoff Variation 18 piano', ['variation 18', 'variacao 18'], 'avancado'),
];

export function findCoursePiece(id: string): CoursePiece | undefined {
  return COURSE_PIECES.find((c) => c.id === id);
}

/** A música no seu repertório: o título (ou um apelido) aparece no título da sua, sem acento e sem caixa. */
export function pieceInRepertoire(cp: CoursePiece, pieces: Piece[]): Piece | null {
  const names = [cp.title, ...(cp.aliases ?? [])].map(normalize).filter(Boolean);
  return pieces.find((pc) => {
    const t = normalize(pc.title);
    return names.some((n) => t.includes(n));
  }) ?? null;
}

export type PieceState = 'fora' | 'sem-partitura' | 'pronta';

export function pieceState(piece: Piece | null): PieceState {
  if (!piece) return 'fora';
  return piece.scoreFileId || piece.scoreFileUid ? 'pronta' : 'sem-partitura';
}

/** Link da busca no MuseScore, para achar um arranjo fácil. */
export function museScoreSearch(cp: CoursePiece): string {
  return `https://musescore.com/sheetmusic?text=${encodeURIComponent(cp.search)}`;
}
