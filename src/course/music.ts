// Ferramentas de escrita do curso: nomes de nota, melodias em texto, sorteio. Puro e testado (course.test.ts).

import { noteInfo, type Midi } from '../music/notes';
import type { Pc, Rng } from './types';

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const PC_NAMES = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
const LETTER_NAMES: Record<string, string> = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };

/** "C4" → 60, "F#4" → 66, "Bb3" → 58. */
export function n(name: string): Midi {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`Nota inválida: ${name}`);
  const acc = m[2] ? (m[2][0] === '#' ? m[2].length : -m[2].length) : 0;
  return (Number(m[3]) + 1) * 12 + LETTER_PC[m[1]] + acc;
}

/** Nome em português de uma grafia: "F#4" → "Fá♯", "Bb3" → "Si♭". */
export function ptName(name: string): string {
  const m = /^([A-G])(#{1,2}|b{1,2})?/.exec(name.trim());
  if (!m) return name;
  const acc = m[2] ? m[2].replace(/#/g, '♯').replace(/b/g, '♭') : '';
  return LETTER_NAMES[m[1]] + acc;
}

export const pcOf = (midi: Midi): Pc => ((midi % 12) + 12) % 12;

/** Nome em português de uma tecla (sustenido nas pretas). */
export const nameOf = (midi: Midi): string => noteInfo(midi).name;

/** Todas as teclas entre `low` e `high` com estas classes. */
export function keysOf(pcs: Pc[], low: Midi, high: Midi): Midi[] {
  const out: Midi[] = [];
  for (let m = low; m <= high; m++) if (pcs.includes(pcOf(m))) out.push(m);
  return out;
}

export const BLACK_PCS: Pc[] = [1, 3, 6, 8, 10];
export const WHITE_PCS: Pc[] = [0, 2, 4, 5, 7, 9, 11];

// ---------- melodias em texto ----------

export interface ParsedNote {
  /** Vazio = pausa. Acorde = várias notas. */
  midis: Midi[];
  /** Grafia original de cada nota (para a partitura escolher sustenido ou bemol). */
  spelled: string[];
  beats: number;
  /** Início em tempos. */
  beat: number;
  /** Compasso, começando em 1. */
  bar: number;
}

/** "2" → 2, "0.5" → 0,5, "1/3" → um terço (colcheia de tercina). */
function parseBeats(dur: string): number {
  const f = /^(\d+)\/(\d+)$/.exec(dur);
  return f ? Number(f[1]) / Number(f[2]) : Number(dur);
}

/**
 * "E4 E4 F4 G4 | G4:2 r:2" → notas com início e compasso.
 * Duração depois de ":" em tempos (semínima = 1; aceita 0.5, 1.5… e frações: "1/3" é a colcheia de tercina). "r" = pausa. Acorde: "C3+E3+G3:4".
 * Se `beatsPerBar` vier, confere se cada compasso soma certo (erro de escrita vira exceção nos testes).
 */
export function parseLine(text: string, beatsPerBar?: number): ParsedNote[] {
  const out: ParsedNote[] = [];
  let beat = 0;
  const bars = text.split('|').map((b) => b.trim()).filter(Boolean);
  bars.forEach((bar, i) => {
    let inBar = 0;
    for (const tok of bar.split(/\s+/)) {
      const [body, dur] = tok.split(':');
      const beats = dur ? parseBeats(dur) : 1;
      if (!(beats > 0)) throw new Error(`Duração inválida: ${tok}`);
      const spelled = body === 'r' ? [] : body.split('+');
      out.push({ midis: spelled.map(n), spelled, beats, beat, bar: i + 1 });
      beat += beats;
      inBar += beats;
    }
    if (beatsPerBar !== undefined && Math.abs(inBar - beatsPerBar) > 1e-6) {
      throw new Error(`Compasso ${i + 1} soma ${inBar} tempos, esperado ${beatsPerBar}: "${bar}"`);
    }
  });
  return out;
}

// ---------- sorteio ----------

/** Gerador com semente, para testes e para repetir uma instância. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length) % xs.length];
}

export function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia `count` valores evitando repetir o anterior. */
export function pickRun<T>(rng: Rng, xs: readonly T[], count: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    let v = pick(rng, xs);
    if (xs.length > 1) while (out.length && v === out[out.length - 1]) v = pick(rng, xs);
    out.push(v);
  }
  return out;
}
