// Músicas do arcade: trechos de domínio público (folclore e compositores mortos há mais de 70 anos), escolhidos
// pelo que a cultura pop fez com eles (cinema, games, metal). Músicas protegidas entram pelo "Importar MIDI",
// com o arquivo do próprio usuário. Formato das lições: "C4 D4:2", ":0.5" = colcheia, "r" = pausa.
// Com "|", cada compasso é conferido no teste; trechos com anacruse vêm sem barras.
// `bass` é a mão esquerda do modo difícil: soma os mesmos tempos da melodia (o teste confere).

export interface ArcadeSong {
  id: string;
  title: string;
  /** Compositor ou origem, e de onde você conhece. */
  origin: string;
  /** Etiqueta curta do cartão (Cinema, Games, Clássico…). */
  tag: string;
  /** Tamanho do desafio da música: 1 curta e lenta, 3 mais rápida. */
  level: 1 | 2 | 3;
  bpm: number;
  beatsPerBar: number;
  melody: string;
  bass: string;
}

const MOUNTAIN_A = 'B3:0.5 C#4:0.5 D4:0.5 E4:0.5 F#4:0.5 D4:0.5 F#4:1 | F4:0.5 C#4:0.5 F4:1 E4:0.5 C4:0.5 E4:1 | B3:0.5 C#4:0.5 D4:0.5 E4:0.5 F#4:0.5 D4:0.5 F#4:0.5 B4:0.5 | A4:0.5 F#4:0.5 D4:0.5 F#4:0.5 A4:2';
const MOUNTAIN_BASS = Array.from({ length: 4 }, () => 'B2 F#2 B2 F#2').join(' | ');
const TETRIS_A = 'E5 B4:0.5 C5:0.5 D5 C5:0.5 B4:0.5 | A4 A4:0.5 C5:0.5 E5 D5:0.5 C5:0.5 | B4:1.5 C5:0.5 D5 E5 | C5 A4 A4:2 | D5:1.5 F5:0.5 A5 G5:0.5 F5:0.5 | E5:1.5 C5:0.5 E5 D5:0.5 C5:0.5 | B4 B4:0.5 C5:0.5 D5 E5 | C5 A4 A4:2';
const TETRIS_BASS = 'E3:2 B3:2 | A3:2 E3:2 | E3:2 B3:2 | A3:2 E3:2 | D3:2 A3:2 | C3:2 G3:2 | E3:2 B3:2 | A3:2 E3:2';
const SWAN_A = 'F#5:2 B4:0.5 C#5:0.5 D5:0.5 E5:0.5 | F#5:1.5 D5:0.5 F#5:1.5 D5:0.5 | F#5:1.5 B4:0.5 D5:0.5 B4:0.5 G4:0.5 D5:0.5 | B4:4';
const SWAN_BASS = 'B3:2 F#3:2 | B3:2 F#3:2 | G3:2 E3:2 | B3:4';

export const ARCADE_SONGS: ArcadeSong[] = [
  {
    id: 'rei-montanha', title: 'Na Gruta do Rei da Montanha', origin: 'Grieg, 1876 · o riff que o metal adora regravar', tag: 'Rock', level: 2, bpm: 112, beatsPerBar: 4,
    melody: `${MOUNTAIN_A} | ${MOUNTAIN_A}`,
    bass: `${MOUNTAIN_BASS} | ${MOUNTAIN_BASS}`,
  },
  {
    id: 'tetris', title: 'Tema do Tetris', origin: 'Korobeiniki, canção russa do século XIX', tag: 'Games', level: 2, bpm: 120, beatsPerBar: 4,
    melody: `${TETRIS_A} | ${TETRIS_A}`,
    bass: `${TETRIS_BASS} | ${TETRIS_BASS}`,
  },
  {
    id: 'zaratustra', title: 'Assim Falou Zaratustra', origin: 'Richard Strauss, 1896 · a abertura de 2001', tag: 'Cinema', level: 1, bpm: 66, beatsPerBar: 4,
    melody: 'C4:4 | G4:4 | C5:4 | E5:0.5 Eb5:3.5 | r:4 | C4:4 | G4:4 | C5:4 | Eb5:0.5 E5:3.5 | r:4 | C4:4 | G4:4 | C5:4 | E5 A5:3 | A5:2 B5:2 | C6:4',
    bass: 'r:4 | r:4 | r:4 | r:4 | C3:0.5 G3:0.5 C3:0.5 G3:0.5 C3:0.5 G3:0.5 C3 | r:4 | r:4 | r:4 | r:4 | C3:0.5 G3:0.5 C3:0.5 G3:0.5 C3:0.5 G3:0.5 C3 | r:4 | r:4 | r:4 | r:4 | G3:4 | C3:4',
  },
  {
    id: 'lago-cisnes', title: 'O Lago dos Cisnes', origin: 'Tchaikovsky, 1876 · o tema do Cisne Negro', tag: 'Cinema', level: 2, bpm: 76, beatsPerBar: 4,
    melody: `${SWAN_A} | ${SWAN_A}`,
    bass: `${SWAN_BASS} | ${SWAN_BASS}`,
  },
  {
    id: 'tocata', title: 'Tocata em Ré menor', origin: 'Bach, BWV 565 · a abertura mais dramática do órgão', tag: 'Cinema', level: 3, bpm: 56, beatsPerBar: 4,
    melody: 'A5:0.25 G5:0.25 A5:2.5 r | G5:0.25 F5:0.25 E5:0.25 D5:0.25 C#5 D5:2 | A4:0.25 G4:0.25 A4:2.5 r | E4:0.5 F4:0.5 C#4:0.5 D4:2.5 | A3:0.25 G3:0.25 A3:2.5 r | G3:0.25 F3:0.25 E3:0.25 D3:0.25 C#3 D3:2',
    bass: 'A4:0.25 G4:0.25 A4:2.5 r | G4:0.25 F4:0.25 E4:0.25 D4:0.25 C#4 D4:2 | A3:0.25 G3:0.25 A3:2.5 r | E3:0.5 F3:0.5 C#3:0.5 D3:2.5 | A4:0.25 G4:0.25 A4:2.5 r | G4:0.25 F4:0.25 E4:0.25 D4:0.25 C#4 D4:2',
  },
  {
    id: 'aura-lee', title: 'Aura Lee', origin: 'George Poulton, 1861 · a melodia que virou Love Me Tender', tag: 'Elvis', level: 1, bpm: 84, beatsPerBar: 4,
    melody: 'G4 C5 B4 C5 | D5 A4 D5:2 | C5 B4 A4 B4 | C5:4 | G4 C5 B4 C5 | D5 A4 D5:2 | C5 B4 A4 B4 | C5:4 | E5 E5 E5:2 | E5 E5 E5:2 | E5 D5 C5 D5 | E5:4 | E5 E5 F5 E5 | D5 A4 D5:2 | C5 B4 A4 B4 | C5:4',
    bass: 'C3:4 | D3:4 | G3:4 | C3:4 | C3:4 | D3:4 | G3:4 | C3:4 | E3:4 | A3:4 | D3:4 | G3:4 | C3:4 | F3:4 | G3:4 | C3:4',
  },
  {
    id: 'greensleeves', title: 'Greensleeves', origin: 'Melodia inglesa do século XVI', tag: 'Clássico', level: 2, bpm: 100, beatsPerBar: 3,
    melody: 'A4 C5:2 D5 E5:1.5 F5:0.5 E5 D5:2 B4 G4:1.5 A4:0.5 B4 C5:2 A4 A4:1.5 G#4:0.5 A4 B4:2 G#4 E4:2 A4 C5:2 D5 E5:1.5 F5:0.5 E5 D5:2 B4 G4:1.5 A4:0.5 B4 C5:1.5 B4:0.5 A4 G#4:1.5 F#4:0.5 G#4 A4:3',
    bass: 'r A3:3 C4:3 G3:3 E3:3 A3:3 E3:3 E3:3 A3:3 A3:3 C4:3 G3:3 E3:3 A3:3 E3:3 A3:3',
  },
  {
    id: 'brilha', title: 'Brilha, brilha, estrelinha', origin: 'Canção folclórica', level: 1, bpm: 100, beatsPerBar: 4,
    tag: 'Folclore',
    melody: 'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2',
    bass: 'C3:4 | F3:2 C3:2 | F3:2 C3:2 | G3:2 C3:2 | C3:2 F3:2 | C3:2 G3:2 | C3:2 F3:2 | C3:2 G3:2 | C3:4 | F3:2 C3:2 | F3:2 C3:2 | G3:2 C3:2',
  },
  {
    id: 'carneirinho', title: 'Maria tinha um carneirinho', origin: 'Canção folclórica', level: 1, bpm: 110, beatsPerBar: 4,
    tag: 'Folclore',
    melody: 'E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 | E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4',
    bass: 'C3:4 | C3:4 | G3:4 | C3:4 | C3:4 | C3:4 | G3:4 | C3:4',
  },
  {
    id: 'frei-martinho', title: 'Frei Martinho', origin: 'Canção folclórica francesa', level: 1, bpm: 100, beatsPerBar: 4,
    tag: 'Folclore',
    melody: 'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | C4 G3 C4:2 | C4 G3 C4:2',
    bass: 'C3:4 | C3:4 | C3:2 G3:2 | C3:2 G3:2 | C3:2 G3:2 | C3:2 G3:2 | C3:4 | C3:4',
  },
  {
    id: 'ode', title: 'Ode à Alegria', origin: 'Beethoven, 9ª Sinfonia', level: 1, bpm: 100, beatsPerBar: 4,
    tag: 'Clássico',
    melody: 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2 | D4 D4 E4 C4 | D4 E4:0.5 F4:0.5 E4 C4 | D4 E4:0.5 F4:0.5 E4 D4 | C4 D4 G3:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2',
    bass: 'C3:4 | G3:4 | C3:4 | G3:4 | C3:4 | G3:4 | C3:4 | G3:2 C3:2 | G3:2 C3:2 | G3:2 C3:2 | G3:2 C3:2 | A3:2 D3:2 | C3:4 | G3:4 | C3:4 | G3:2 C3:2',
  },
  {
    id: 'canone', title: 'Cânone em Ré', origin: 'Pachelbel', level: 1, bpm: 72, beatsPerBar: 4,
    tag: 'Clássico',
    melody: 'F#5:2 E5:2 | D5:2 C#5:2 | B4:2 A4:2 | B4:2 C#5:2 | D5:2 C#5:2 | B4:2 A4:2 | G4:2 F#4:2 | G4:2 A4:2 | D5:4',
    bass: 'D3:2 A3:2 | B3:2 F#3:2 | G3:2 D3:2 | G3:2 A3:2 | D3:2 A3:2 | B3:2 F#3:2 | G3:2 D3:2 | G3:2 A3:2 | D3:4',
  },
  {
    id: 'parabens', title: 'Parabéns', origin: 'Melodia tradicional (Hill)', level: 2, bpm: 100, beatsPerBar: 3,
    tag: 'Festa',
    melody: 'G4:0.75 G4:0.25 A4 G4 C5 B4:2 G4:0.75 G4:0.25 A4 G4 D5 C5:2 G4:0.75 G4:0.25 G5 E5 C5 B4 A4 F5:0.75 F5:0.25 E5 C5 D5 C5:3',
    bass: 'r:1 C3:3 G3:3 G3:3 C3:3 C3:3 F3:3 C3:2 G3:1 C3:3',
  },
  {
    id: 'jingle', title: 'Jingle Bells', origin: 'James Lord Pierpont', level: 2, bpm: 120, beatsPerBar: 4,
    tag: 'Festa',
    melody: 'E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4:4 | F4 F4 F4:1.5 F4:0.5 | F4 E4 E4 E4:0.5 E4:0.5 | E4 D4 D4 E4 | D4:2 G4:2 | E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4:4 | F4 F4 F4 F4 | F4 E4 E4 E4:0.5 E4:0.5 | G4 G4 F4 D4 | C4:4',
    bass: 'C3:2 G3:2 | C3:2 G3:2 | C3:2 G3:2 | C3:2 G3:2 | F3:4 | C3:4 | D3:4 | G3:4 | C3:2 G3:2 | C3:2 G3:2 | C3:2 G3:2 | C3:2 G3:2 | F3:4 | C3:4 | G3:4 | C3:4',
  },
  {
    id: 'susanna', title: 'Oh! Susanna', origin: 'Stephen Foster', level: 2, bpm: 110, beatsPerBar: 4,
    tag: 'Folclore',
    melody: 'C4:0.5 D4:0.5 E4 G4 G4:1.5 A4:0.5 G4 E4 C4:1.5 D4:0.5 E4 E4 D4 C4 D4:3 C4:0.5 D4:0.5 E4 G4 G4:1.5 A4:0.5 G4 E4 C4:1.5 D4:0.5 E4 E4 D4 D4 C4:4',
    bass: 'r:1 C3:4 C3:4 C3:4 G3:4 C3:4 C3:4 G3:4 C3:4',
  },
  {
    id: 'saints', title: 'When the Saints Go Marching In', origin: 'Spiritual tradicional', level: 2, bpm: 120, beatsPerBar: 4,
    tag: 'Jazz antigo',
    melody: 'C4 E4 F4 G4:5 C4 E4 F4 G4:5 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:5 E4 E4 D4 C4:3 C4 E4 G4:2 G4 F4:5 E4 F4 G4:2 E4:2 C4:2 D4:2 C4:4',
    bass: 'r:3 C3:4 C3:4 C3:4 C3:4 C3:4 C3:4 G3:5 C3:4 C3:4 C3:3 F3:5 C3:4 C3:4 G3:2 C3:4',
  },
  {
    id: 'minueto', title: 'Minueto em Sol', origin: 'Petzold (caderno de Anna Magdalena Bach)', level: 2, bpm: 100, beatsPerBar: 3,
    tag: 'Clássico',
    melody: 'D5 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5 G4 G4 | E5 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | G5 G4 G4 | C5 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | B4 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | F#4 G4:0.5 A4:0.5 B4:0.5 G4:0.5 | A4:3',
    bass: 'G3:3 | B3:3 | C4:3 | B3:3 | A3:3 | G3:3 | D3:3 | D3:3',
  },
  {
    id: 'serenata', title: 'Pequena Serenata Noturna', origin: 'Mozart', level: 2, bpm: 116, beatsPerBar: 4,
    tag: 'Clássico',
    melody: 'G4 r:0.5 D4:0.5 G4 r:0.5 D4:0.5 | G4:0.5 D4:0.5 G4:0.5 B4:0.5 D5:2 | C5 r:0.5 A4:0.5 C5 r:0.5 A4:0.5 | C5:0.5 A4:0.5 F#4:0.5 A4:0.5 D4:2',
    bass: 'G3:2 B3:2 | G3:2 B3:2 | D3:2 F#3:2 | D3:2 F#3:2',
  },
  {
    id: 'fur-elise', title: 'Für Elise (tema)', origin: 'Beethoven', level: 3, bpm: 72, beatsPerBar: 3,
    tag: 'Clássico',
    melody: 'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:3',
    bass: 'r:1 r:3 A3:1.5 r:1.5 E3:1.5 r:1.5 A3:1.5 r:1.5 r:3 A3:1.5 r:1.5 E3:1.5 r:1.5 A3:3',
  },
  {
    id: 'marcha-turca', title: 'Marcha Turca (tema)', origin: 'Mozart', level: 3, bpm: 100, beatsPerBar: 2,
    tag: 'Clássico',
    melody: 'B4:0.25 A4:0.25 G#4:0.25 A4:0.25 C5 D5:0.25 C5:0.25 B4:0.25 C5:0.25 E5 F5:0.25 E5:0.25 D#5:0.25 E5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 C6:2',
    bass: 'r:1 A3 C4 A3 C4 E3 G#3 A3:2',
  },
  {
    id: 'entertainer', title: 'The Entertainer (tema)', origin: 'Scott Joplin', level: 3, bpm: 90, beatsPerBar: 4,
    tag: 'Ragtime',
    melody: 'D4:0.5 D#4:0.5 E4:0.5 C5 E4:0.5 C5 E4:0.5 C5:2.5 C5:0.5 D5:0.5 D#5:0.5 E5:0.5 C5:0.5 D5:0.5 E5 B4:0.5 D5 C5:3',
    bass: 'r:1 C3:2 G3:2 C3:2 G3:2 C3:2 G3:1.5 C3:3',
  },
];

export const findArcadeSong = (id: string) => ARCADE_SONGS.find((s) => s.id === id);
