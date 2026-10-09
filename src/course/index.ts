// Lista das unidades do curso. Cada arquivo src/course/units/uNN.ts exporta `default` uma Unit;
// esta lista pega todos sozinha (não precisa editar nada aqui ao criar uma unidade nova).

import type { SongSpec, Unit } from './types';

const files = import.meta.glob<{ default: Unit }>('./units/u*.ts', { eager: true });

export const UNITS: Unit[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => a.n - b.n);

/** Títulos das 12 unidades do plano (as que ainda não foram escritas aparecem como "em construção"). */
export const PLAN: { n: number; title: string; goal: string }[] = [
  { n: 1, title: 'Teclado, pulso e postura', goal: 'Achar qualquer nota, manter o pulso e tocar na posição de Dó.' },
  { n: 2, title: 'Pauta dupla e intervalos', goal: 'Ler nas claves de sol e fá e tocar com as duas mãos.' },
  { n: 3, title: 'Primeiros acordes e cifra', goal: 'Acompanhar uma melodia com I, IV e V7 lendo cifra.' },
  { n: 4, title: 'Escala maior e armaduras', goal: 'Tocar escalas maiores com passagem do polegar e usar o pedal.' },
  { n: 5, title: 'Modo menor e intervalos', goal: 'Tocar e reconhecer o modo menor e intervalos com qualidade.' },
  { n: 6, title: 'Tríades, inversões e condução', goal: 'Encadear acordes com inversões e tocar pop pela cifra.' },
  { n: 7, title: 'Campo harmônico e funções', goal: 'Entender e tocar progressões em qualquer tom.' },
  { n: 8, title: 'Tétrades, blues e improviso', goal: 'Tocar tétrades e improvisar sobre um blues.' },
  { n: 9, title: 'Leitura clássica e textura', goal: 'Ler e tocar peças clássicas com duas vozes.' },
  { n: 10, title: 'Harmonia cromática', goal: 'Usar dominantes secundárias, ii–V, subV e empréstimo.' },
  { n: 11, title: 'Brasil ao piano', goal: 'Tocar baião, bossa e voicings modernos.' },
  { n: 12, title: 'Arranjo, forma e repertório', goal: 'Arranjar e apresentar um recital próprio.' },
];

export function findUnit(n: number): Unit | undefined {
  return UNITS.find((u) => u.n === n);
}

export function findSong(id: string): SongSpec | undefined {
  for (const u of UNITS) {
    const s = u.songs.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
}
