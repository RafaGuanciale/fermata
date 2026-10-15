// Dedilhado automático: qual dedo (1 = polegar … 5 = mínimo) toca cada nota.
// Programação dinâmica sobre a linha de cada mão, com as regras de abertura entre pares de dedos
// do modelo de Parncutt (1997): abertura confortável e relaxada para cada par, dedos fracos,
// polegar em tecla preta, passagem do polegar e mesmo dedo em notas diferentes.
// A mão esquerda usa a mesma tabela, espelhada (intervalos com o sinal trocado).
// Puro e testado (fingering.test.ts). É uma sugestão: o que um professor escreveria na maioria das vezes.

import { isWhite, type Midi } from './notes';

export type Hand = 'r' | 'l';
export type Finger = 1 | 2 | 3 | 4 | 5;

/**
 * Abertura entre dois dedos da mão direita, em semitons, da nota do dedo menor para a do maior:
 * [mínimo praticável, mínimo confortável, mínimo relaxado, máximo relaxado, máximo confortável, máximo praticável].
 * Negativo = o dedo maior está abaixo (passagem do polegar).
 */
const SPAN: Record<string, readonly [number, number, number, number, number, number]> = {
  '12': [-5, -3, 1, 5, 8, 10],
  '13': [-4, -2, 3, 7, 10, 12],
  '14': [-3, -1, 5, 9, 12, 14],
  '15': [-1, 1, 7, 10, 13, 15],
  '23': [1, 1, 1, 2, 3, 5],
  '24': [1, 1, 3, 4, 5, 7],
  '25': [2, 2, 5, 6, 8, 10],
  '34': [1, 1, 1, 2, 2, 4],
  '35': [1, 1, 3, 4, 5, 7],
  '45': [1, 1, 1, 2, 3, 5],
};

/** Onde cada dedo cai com a mão parada nas teclas brancas (semitons acima do polegar). */
const NATURAL = [0, 0, 2, 4, 5, 7];

const black = (m: Midi) => !isWhite(m);

/** Custo de dois dedos diferentes tocarem estas duas notas, uma depois da outra ou juntas. */
function spanCost(fa: Finger, pa: Midi, fb: Finger, pb: Midi, hand: Hand): number {
  const [f1, p1, f2, p2] = fa < fb ? [fa, pa, fb, pb] : [fb, pb, fa, pa];
  const d = (p2 - p1) * (hand === 'r' ? 1 : -1);
  const [minP, minC, minR, maxR, maxC, maxP] = SPAN[`${f1}${f2}`];
  const thumb = f1 === 1;
  let c = 0;
  if (d < minC) c += 2 * (minC - d);
  if (d > maxC) c += 2 * (d - maxC);
  if (d < minR) c += (thumb ? 1 : 2) * (minR - d);
  if (d > maxR) c += (thumb ? 1 : 2) * (d - maxR);
  if (d < minP) c += 10 * (minP - d);
  if (d > maxP) c += 10 * (d - maxP);
  return c;
}

/** Custo de passar de uma nota para a seguinte (duas notas soltas). */
function stepCost(fa: Finger, pa: Midi, fb: Finger, pb: Midi, hand: Hand): number {
  if (fa === fb) return pa === pb ? 0 : 15 + Math.abs(pb - pa) * 0.5;
  // Nota repetida com outro dedo: possível, mas para quem está aprendendo o mesmo dedo é mais simples.
  let c = spanCost(fa, pa, fb, pb, hand) + (pa === pb ? 2 : 0);
  // Desempate: a mão "em posição" (cada dedo na sua tecla) é a mais natural.
  c += 0.1 * Math.abs((pb - pa) * (hand === 'r' ? 1 : -1) - (NATURAL[fb] - NATURAL[fa]));
  // Polegar em tecla preta vindo de (ou indo para) uma branca: a mão precisa avançar.
  if (fb === 1 && black(pb) && !black(pa)) c += 3;
  if (fa === 1 && black(pa) && !black(pb)) c += 3;
  // Mínimo na preta entre brancas.
  if (fb === 5 && black(pb) && !black(pa)) c += 1;
  if (fa === 5 && black(pa) && !black(pb)) c += 1;
  // 3 seguido de 4: os dois dedos menos independentes.
  if (fa === 3 && fb === 4) c += 0.5;
  // 3 e 4 juntos com o 3 na branca e o 4 na preta.
  if ((fa === 3 && fb === 4 && !black(pa) && black(pb)) || (fa === 4 && fb === 3 && !black(pb) && black(pa))) c += 1;
  // Passagem do polegar (por baixo de outro dedo, ou outro dedo por cima dele).
  if (fa === 1 || fb === 1) {
    const [thumbPitch, other] = fa === 1 ? [pa, pb] : [pb, pa];
    const under = (other - thumbPitch) * (hand === 'r' ? 1 : -1) < 0;
    if (under) c += 3 + (black(thumbPitch) && !black(other) ? 3 : black(thumbPitch) === black(other) ? 1 : 0);
  }
  return c;
}

/** Custo de cada nota por si: dedos fracos e polegar na preta. */
function noteCost(f: Finger, p: Midi): number {
  return (f >= 4 ? 0.5 : 0) + (f === 1 && black(p) ? 2 : 0);
}

/** Onde estaria o polegar com este dedo nesta nota (para medir o quanto a mão anda entre acordes). */
const thumbAt = (f: Finger, p: Midi, hand: Hand) => (hand === 'r' ? p - NATURAL[f] : p + NATURAL[f]);

export interface FingerEvent {
  /** Notas tocadas juntas (acorde) ou uma só. */
  midis: Midi[];
  /** Início, em ms. */
  t: number;
  /** Fim da nota mais longa, em ms. */
  end: number;
}

/** Todas as formas de pôr dedos num acorde de k notas (graves para agudas): na direita os dedos sobem, na esquerda descem. */
function chordShapes(k: number, hand: Hand): Finger[][] {
  const out: Finger[][] = [];
  const pick = (from: number, acc: Finger[]) => {
    if (acc.length === k) {
      out.push(hand === 'r' ? [...acc] : [...acc].reverse());
      return;
    }
    for (let f = from; f <= 5; f++) pick(f + 1, [...acc, f as Finger]);
  };
  pick(1, []);
  return out;
}

const SHAPES: Record<string, Finger[][]> = {};
const shapes = (k: number, hand: Hand) => (SHAPES[`${k}${hand}`] ??= chordShapes(k, hand));

/** Custo interno do acorde: aberturas entre vizinhos, e dedos espaçados como as notas. */
function chordCost(fs: Finger[], ps: Midi[], hand: Hand): number {
  if (fs.length === 1) return noteCost(fs[0], ps[0]);
  let c = 0;
  for (let i = 0; i < fs.length; i++) c += fs[i] === 1 && black(ps[i]) ? 1 : 0;
  for (let i = 1; i < fs.length; i++) c += spanCost(fs[i - 1], ps[i - 1], fs[i], ps[i], hand);
  // Cada dedo perto da sua tecla natural, contando a partir de onde o polegar estaria.
  const at = fs.map((f, i) => thumbAt(f, ps[i], hand));
  const mean = at.reduce((a, b) => a + b, 0) / at.length;
  return c + 0.4 * at.reduce((sum, x) => sum + Math.abs(x - mean), 0);
}

const relaxOf = (gap: number) => (gap <= 150 ? 1 : Math.max(0.1, 1 - (gap - 150) / 1000));

/** Custo de ir de um evento ao seguinte. Depois de uma pausa a mão pode se reposicionar, então pesa menos. */
function moveCost(a: Shape, b: Shape, hand: Hand, gap: number): number {
  let c: number;
  if (a.fs.length === 1 && b.fs.length === 1) c = stepCost(a.fs[0], a.ps[0], b.fs[0], b.ps[0], hand);
  else {
    // Com acorde, o que pesa é o quanto a mão anda: a forma de cada acorde já foi julgada sozinha.
    const pos = (x: Shape) => x.fs.reduce((sum, f, i) => sum + thumbAt(f, x.ps[i], hand), 0) / x.fs.length;
    c = 0.1 * Math.abs(pos(b) - pos(a));
  }
  return c * relaxOf(gap);
}

/**
 * Três notas seguidas: a primeira e a terceira mostram se a mão mudou de posição (regras 4 e 5 de Parncutt).
 * É o que impede o "zigue-zague" de polegar passando o tempo todo.
 */
function tripleCost(a: Shape, b: Shape, c: Shape, hand: Hand, gap: number): number {
  if (a.fs.length !== 1 || b.fs.length !== 1 || c.fs.length !== 1) return 0;
  const [f1, f2, f3] = [a.fs[0], b.fs[0], c.fs[0]];
  const [p1, p2, p3] = [a.ps[0], b.ps[0], c.ps[0]];
  let cost = 0;
  if (f1 !== f3) {
    const [lo, plo, hi, phi] = f1 < f3 ? [f1, p1, f3, p3] : [f3, p3, f1, p1];
    const d = (phi - plo) * (hand === 'r' ? 1 : -1);
    const [minP, minC, , , maxC, maxP] = SPAN[`${lo}${hi}`];
    if (d < minC || d > maxC) {
      const between = (p2 - p1) * (p3 - p2) > 0;
      cost += f2 === 1 && between && (d < minP || d > maxP) ? 2 : 1;
      cost += d < minC ? minC - d : d - maxC;
    }
  } else if (p1 !== p3) {
    // O mesmo dedo volta numa nota diferente: a mão andou (polegar passando para lá e para cá).
    cost += 1 + Math.abs(p3 - p1);
  }
  // 3, 4 e 5 em sequência.
  if (new Set([f1, f2, f3]).size === 3 && [f1, f2, f3].every((f) => f >= 3)) cost += 0.5;
  return cost * relaxOf(gap);
}

interface Shape {
  fs: Finger[];
  ps: Midi[];
}

/** Até 5 notas por mão num acorde: as de fora e as do meio mais espalhadas. */
function keepFive(sorted: Midi[]): number[] {
  if (sorted.length <= 5) return sorted.map((_, i) => i);
  const n = sorted.length - 1;
  return [0, Math.round(n / 4), Math.round(n / 2), Math.round((3 * n) / 4), n];
}

/**
 * Dedos de cada evento de uma mão. Devolve, para cada evento, o dedo de cada nota na ordem de `midis`
 * (null para notas além da quinta num acorde enorme).
 */
export function fingerEvents(events: FingerEvent[], hand: Hand): (Finger | null)[][] {
  if (!events.length) return [];
  const prepared = events.map((e) => {
    const order = e.midis.map((m, i) => ({ m, i })).sort((a, b) => a.m - b.m);
    const keep = keepFive(order.map((o) => o.m));
    const ps = keep.map((k) => order[k].m);
    return { ps, idx: keep.map((k) => order[k].i), states: shapes(ps.length, hand) };
  });
  // Viterbi de segunda ordem: estado = forma do evento anterior e forma do atual.
  const n = prepared.length;
  const shapeOf = (k: number, i: number): Shape => ({ fs: prepared[k].states[i], ps: prepared[k].ps });
  const own = prepared.map((ev) => ev.states.map((fs) => chordCost(fs, ev.ps, hand)));
  const gapAt = (k: number) => events[k].t - events[k - 1].end;
  if (n === 1) {
    const best = own[0].indexOf(Math.min(...own[0]));
    return [placeFingers(events[0].midis, prepared[0], best)];
  }
  // cost[k][a * S_k + b]: menor custo terminando com a forma a no evento k-1 e b no evento k.
  const cost: Float64Array[] = [];
  const back: Int32Array[] = [];
  {
    const S0 = prepared[0].states.length;
    const S1 = prepared[1].states.length;
    const c = new Float64Array(S0 * S1);
    for (let a = 0; a < S0; a++) for (let b = 0; b < S1; b++) c[a * S1 + b] = own[0][a] + own[1][b] + moveCost(shapeOf(0, a), shapeOf(1, b), hand, gapAt(1));
    cost[1] = c;
  }
  for (let k = 2; k < n; k++) {
    const Sz = prepared[k - 2].states.length;
    const Sa = prepared[k - 1].states.length;
    const Sb = prepared[k].states.length;
    const prev = cost[k - 1];
    const c = new Float64Array(Sa * Sb).fill(Infinity);
    const bk = new Int32Array(Sa * Sb);
    const gap = gapAt(k);
    const gap3 = Math.max(gap, gapAt(k - 1));
    for (let a = 0; a < Sa; a++) {
      const A = shapeOf(k - 1, a);
      for (let b = 0; b < Sb; b++) {
        const B = shapeOf(k, b);
        const base = moveCost(A, B, hand, gap) + own[k][b];
        let best = Infinity;
        let arg = 0;
        for (let z = 0; z < Sz; z++) {
          const v = prev[z * Sa + a] + tripleCost(shapeOf(k - 2, z), A, B, hand, gap3);
          if (v < best) {
            best = v;
            arg = z;
          }
        }
        c[a * Sb + b] = best + base;
        bk[a * Sb + b] = arg;
      }
    }
    cost[k] = c;
    back[k] = bk;
  }
  const lastC = cost[n - 1];
  const Sb = prepared[n - 1].states.length;
  let bestI = 0;
  for (let i = 1; i < lastC.length; i++) if (lastC[i] < lastC[bestI]) bestI = i;
  const chosen: number[] = [];
  chosen[n - 1] = bestI % Sb;
  chosen[n - 2] = Math.floor(bestI / Sb);
  for (let k = n - 1; k >= 2; k--) chosen[k - 2] = back[k][chosen[k - 1] * prepared[k].states.length + chosen[k]];
  return prepared.map((ev, k) => placeFingers(events[k].midis, ev, chosen[k]));
}

function placeFingers(midis: Midi[], ev: { idx: number[]; states: Finger[][] }, state: number): (Finger | null)[] {
  const out: (Finger | null)[] = midis.map(() => null);
  ev.states[state].forEach((f, j) => (out[ev.idx[j]] = f));
  return out;
}

export interface FingerNote {
  midi: Midi;
  /** Início, em ms. */
  t: number;
  /** Duração, em ms. */
  dur: number;
}

/** Notas de uma mão (em qualquer ordem) → dedo de cada uma, na mesma ordem. Notas que começam a menos de `together` ms viram acorde. */
export function fingerNotes(notes: FingerNote[], hand: Hand, together = 40): (Finger | null)[] {
  const order = notes.map((_, i) => i).sort((a, b) => notes[a].t - notes[b].t || notes[a].midi - notes[b].midi);
  const groups: number[][] = [];
  for (const i of order) {
    const g = groups[groups.length - 1];
    if (g && notes[i].t - notes[g[0]].t < together && !g.some((j) => notes[j].midi === notes[i].midi)) g.push(i);
    else groups.push([i]);
  }
  const events = groups.map((g) => ({ midis: g.map((i) => notes[i].midi), t: notes[g[0]].t, end: Math.max(...g.map((i) => notes[i].t + notes[i].dur)) }));
  const fingers = fingerEvents(events, hand);
  const out: (Finger | null)[] = notes.map(() => null);
  groups.forEach((g, k) => g.forEach((i, j) => (out[i] = fingers[k][j])));
  return out;
}

