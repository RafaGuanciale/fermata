// Músicas do arcade: trechos fáceis, só melodia (mão direita), todos de domínio público
// (folclore e compositores mortos há mais de 70 anos). Formato das lições: "C4 D4:2", ":0.5" = colcheia, "r" = pausa.
// Com "|", cada compasso é conferido no teste; trechos com anacruse vêm sem barras.

export interface ArcadeSong {
  id: string;
  title: string;
  /** Compositor ou origem. */
  origin: string;
  /** 1 fácil, 2 médio, 3 desafio. */
  level: 1 | 2 | 3;
  bpm: number;
  beatsPerBar: number;
  melody: string;
}

export const ARCADE_SONGS: ArcadeSong[] = [
  {
    id: 'brilha', title: 'Brilha, brilha, estrelinha', origin: 'Canção folclórica', level: 1, bpm: 100, beatsPerBar: 4,
    melody: 'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2',
  },
  {
    id: 'carneirinho', title: 'Maria tinha um carneirinho', origin: 'Canção folclórica', level: 1, bpm: 110, beatsPerBar: 4,
    melody: 'E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 | E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4',
  },
  {
    id: 'frei-martinho', title: 'Frei Martinho', origin: 'Canção folclórica francesa', level: 1, bpm: 100, beatsPerBar: 4,
    melody: 'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | C4 G3 C4:2 | C4 G3 C4:2',
  },
  {
    id: 'ode', title: 'Ode à Alegria', origin: 'Beethoven, 9ª Sinfonia', level: 1, bpm: 100, beatsPerBar: 4,
    melody: 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2 | D4 D4 E4 C4 | D4 E4:0.5 F4:0.5 E4 C4 | D4 E4:0.5 F4:0.5 E4 D4 | C4 D4 G3:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2',
  },
  {
    id: 'canone', title: 'Cânone em Ré', origin: 'Pachelbel', level: 1, bpm: 72, beatsPerBar: 4,
    melody: 'F#5:2 E5:2 | D5:2 C#5:2 | B4:2 A4:2 | B4:2 C#5:2 | D5:2 C#5:2 | B4:2 A4:2 | G4:2 F#4:2 | G4:2 A4:2 | D5:4',
  },
  {
    id: 'parabens', title: 'Parabéns', origin: 'Melodia tradicional (Hill)', level: 2, bpm: 100, beatsPerBar: 3,
    melody: 'G4:0.75 G4:0.25 A4 G4 C5 B4:2 G4:0.75 G4:0.25 A4 G4 D5 C5:2 G4:0.75 G4:0.25 G5 E5 C5 B4 A4 F5:0.75 F5:0.25 E5 C5 D5 C5:3',
  },
  {
    id: 'jingle', title: 'Jingle Bells', origin: 'James Lord Pierpont', level: 2, bpm: 120, beatsPerBar: 4,
    melody: 'E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4:4 | F4 F4 F4:1.5 F4:0.5 | F4 E4 E4 E4:0.5 E4:0.5 | E4 D4 D4 E4 | D4:2 G4:2 | E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4:4 | F4 F4 F4 F4 | F4 E4 E4 E4:0.5 E4:0.5 | G4 G4 F4 D4 | C4:4',
  },
  {
    id: 'susanna', title: 'Oh! Susanna', origin: 'Stephen Foster', level: 2, bpm: 110, beatsPerBar: 4,
    melody: 'C4:0.5 D4:0.5 E4 G4 G4:1.5 A4:0.5 G4 E4 C4:1.5 D4:0.5 E4 E4 D4 C4 D4:3 C4:0.5 D4:0.5 E4 G4 G4:1.5 A4:0.5 G4 E4 C4:1.5 D4:0.5 E4 E4 D4 D4 C4:4',
  },
  {
    id: 'saints', title: 'When the Saints Go Marching In', origin: 'Spiritual tradicional', level: 2, bpm: 120, beatsPerBar: 4,
    melody: 'C4 E4 F4 G4:5 C4 E4 F4 G4:5 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:5 E4 E4 D4 C4:3 C4 E4 G4:2 G4 F4:5 E4 F4 G4:2 E4:2 C4:2 D4:2 C4:4',
  },
  {
    id: 'minueto', title: 'Minueto em Sol', origin: 'Petzold (caderno de Anna Magdalena Bach)', level: 2, bpm: 100, beatsPerBar: 3,
    melody: 'D5 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5 G4 G4 | E5 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | G5 G4 G4 | C5 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | B4 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | F#4 G4:0.5 A4:0.5 B4:0.5 G4:0.5 | A4:3',
  },
  {
    id: 'serenata', title: 'Pequena Serenata Noturna', origin: 'Mozart', level: 2, bpm: 116, beatsPerBar: 4,
    melody: 'G4 r:0.5 D4:0.5 G4 r:0.5 D4:0.5 | G4:0.5 D4:0.5 G4:0.5 B4:0.5 D5:2 | C5 r:0.5 A4:0.5 C5 r:0.5 A4:0.5 | C5:0.5 A4:0.5 F#4:0.5 A4:0.5 D4:2',
  },
  {
    id: 'fur-elise', title: 'Für Elise (tema)', origin: 'Beethoven', level: 3, bpm: 72, beatsPerBar: 3,
    melody: 'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:3',
  },
  {
    id: 'marcha-turca', title: 'Marcha Turca (tema)', origin: 'Mozart', level: 3, bpm: 100, beatsPerBar: 2,
    melody: 'B4:0.25 A4:0.25 G#4:0.25 A4:0.25 C5 D5:0.25 C5:0.25 B4:0.25 C5:0.25 E5 F5:0.25 E5:0.25 D#5:0.25 E5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 C6:2',
  },
  {
    id: 'entertainer', title: 'The Entertainer (tema)', origin: 'Scott Joplin', level: 3, bpm: 90, beatsPerBar: 4,
    melody: 'D4:0.5 D#4:0.5 E4:0.5 C5 E4:0.5 C5 E4:0.5 C5:2.5 C5:0.5 D5:0.5 D#5:0.5 E5:0.5 C5:0.5 D5:0.5 E5 B4:0.5 D5 C5:3',
  },
];

export const findArcadeSong = (id: string) => ARCADE_SONGS.find((s) => s.id === id);
