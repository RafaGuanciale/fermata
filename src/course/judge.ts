// Como o curso julga o que você tocou: itens (nota, acorde, sequência), tarefas no tempo
// (com articulação e dinâmica), improviso e força. Puro e testado (course.test.ts).

import type { Midi } from '../music/notes';
import { judgeExpected, windowsFor, type ExpectedNote, type TakeResult } from '../training/timing';
import { pcOf } from './music';
import type { Accept, Item, Pc, TimedTask } from './types';

// ---------- itens ----------

export interface ItemProgress {
  /** Passo atual dentro do item. */
  step: number;
  /** Teclas já achadas no passo "all". */
  found: Midi[];
  /** Erros neste item. */
  misses: number;
  done: boolean;
  lastWrong: Midi | null;
}

export const startItem = (): ItemProgress => ({ step: 0, found: [], misses: 0, done: false, lastWrong: null });

function fits(accept: Accept, midi: Midi): boolean {
  switch (accept.kind) {
    case 'pc':
    case 'chord':
      return accept.pcs.includes(pcOf(midi));
    case 'exact':
    case 'all':
      return accept.midis.includes(midi);
  }
}

/** O acorde segurado bate com o pedido? */
export function chordMatches(accept: Extract<Accept, { kind: 'chord' }>, held: Midi[]): boolean {
  if (!held.length) return false;
  const pcs = new Set(held.map(pcOf));
  if (pcs.size !== accept.pcs.length || !accept.pcs.every((p) => pcs.has(p))) return false;
  if (accept.bass !== undefined && pcOf(Math.min(...held)) !== accept.bass) return false;
  return true;
}

function advance(p: ItemProgress, item: Item): ItemProgress {
  const step = p.step + 1;
  return { ...p, step, found: [], lastWrong: null, done: step >= item.steps.length };
}

/**
 * Uma tecla abaixada. `held` = teclas seguradas agora, já incluindo esta.
 * Nota fora do pedido conta erro; acorde anda quando todas as notas estão seguradas juntas.
 */
export function pressItem(p: ItemProgress, item: Item, midi: Midi, held: Midi[]): ItemProgress {
  if (p.done || !item.steps.length) return p;
  const accept = item.steps[p.step];
  if (!fits(accept, midi)) return { ...p, misses: p.misses + 1, lastWrong: midi };
  if (accept.kind === 'chord') {
    if (chordMatches(accept, held)) return advance(p, item);
    // Todas as classes, mas baixo errado: é inversão errada.
    const pcs = new Set(held.map(pcOf));
    if (accept.bass !== undefined && accept.pcs.every((x) => pcs.has(x))) return { ...p, misses: p.misses + 1, lastWrong: Math.min(...held) };
    return { ...p, lastWrong: null };
  }
  if (accept.kind === 'all') {
    const found = p.found.includes(midi) ? p.found : [...p.found, midi];
    if (found.length >= accept.midis.length) return advance({ ...p, found }, item);
    return { ...p, found, lastWrong: null };
  }
  return advance(p, item);
}

export interface ItemsScore {
  /** Itens certos de primeira / itens. */
  accuracy: number;
  avgMs: number | null;
}

/** Resumo de uma rodada de itens. Item certo = sem erro e dentro do tempo-limite. */
export function scoreItems(results: { misses: number; ms: number; timedOut?: boolean }[]): ItemsScore {
  if (!results.length) return { accuracy: 0, avgMs: null };
  const ok = results.filter((r) => r.misses === 0 && !r.timedOut);
  return {
    accuracy: ok.length / results.length,
    avgMs: ok.length ? ok.reduce((s, r) => s + r.ms, 0) / ok.length : null,
  };
}

/** Teclado com nomes que somem: some quando as últimas 5 respostas estão certas. */
export function labelsVisible(mode: 'on' | 'fade' | 'off', recent: boolean[]): boolean {
  if (mode !== 'fade') return mode === 'on';
  const last = recent.slice(-5);
  return !(last.length === 5 && last.every(Boolean));
}

// ---------- tarefas no tempo ----------

const ANY = -1;

export interface CourseEvent {
  midi: Midi;
  /** ms desde o primeiro tempo (já com a latência descontada). */
  t: number;
  /** ms em que soltou (null se ainda segurando no fim). */
  off: number | null;
  velocity?: number;
}

export function expectedFor(task: TimedTask, bpm: number): ExpectedNote[] {
  const beatMs = 60000 / bpm;
  return task.events.map((e) => ({ midi: e.midi ?? ANY, t: e.beat * beatMs }));
}

export function taskBeats(task: TimedTask): number {
  return task.events.reduce((m, e) => Math.max(m, e.beat + e.beats), 0);
}

/** Julga uma passada. Tarefas só de ritmo (midi null) aceitam qualquer tecla. */
export function judgeTask(task: TimedTask, bpm: number, events: CourseEvent[], window: number, until = Infinity): TakeResult {
  const anyKey = task.events.some((e) => e.midi === null);
  const played = events.map((e) => ({ midi: anyKey ? ANY : e.midi, t: e.t }));
  const w = { ...windowsFor(1), good: window, off: Math.max(window * 1.5, 150) };
  return judgeExpected(expectedFor(task, bpm), played, w, Math.max(w.off, 60000 / bpm / 2), until);
}

/** Para cada nota esperada, o evento da mesma tecla mais perto do seu tempo (dentro de meio tempo). */
function matchEvents(task: TimedTask, bpm: number, events: CourseEvent[]): (CourseEvent | null)[] {
  const beatMs = 60000 / bpm;
  const used = new Set<number>();
  return task.events.map((e) => {
    const at = e.beat * beatMs;
    let best = -1;
    let dist = beatMs / 2;
    events.forEach((ev, k) => {
      if (used.has(k) || (e.midi !== null && ev.midi !== e.midi)) return;
      const d = Math.abs(ev.t - at);
      if (d <= dist) {
        best = k;
        dist = d;
      }
    });
    if (best < 0) return null;
    used.add(best);
    return events[best];
  });
}

/**
 * Legato: a nota seguinte começa antes (ou até 30 ms depois) de a anterior soltar.
 * Staccato: a nota dura menos da metade do espaço até a próxima.
 * Retorna a fração de transições certas.
 */
export function articulationScore(task: TimedTask, bpm: number, events: CourseEvent[], kind: 'legato' | 'staccato'): number | null {
  const matched = matchEvents(task, bpm, events);
  const pairs: [CourseEvent, CourseEvent][] = [];
  for (let i = 0; i + 1 < matched.length; i++) {
    const a = matched[i];
    const b = matched[i + 1];
    if (a && b && task.events[i + 1].beat > task.events[i].beat) pairs.push([a, b]);
  }
  if (!pairs.length) return null;
  const ok = pairs.filter(([a, b]) => {
    const off = a.off ?? Infinity;
    if (kind === 'legato') return b.t - off <= 30;
    return off - a.t < 0.5 * (b.t - a.t);
  });
  return ok.length / pairs.length;
}

// ---------- força (velocity) ----------

export interface VelocityCalibration {
  soft: number;
  loud: number;
}

export type Level = 'p' | 'mf' | 'f';

/** Divide a faixa calibrada em três partes iguais. */
export function levelOf(velocity: number, cal: VelocityCalibration): Level {
  const span = Math.max(10, cal.loud - cal.soft);
  const x = (velocity - cal.soft) / span;
  return x < 1 / 3 ? 'p' : x < 2 / 3 ? 'mf' : 'f';
}

/** Calibração a partir de notas tocadas o mais leve e o mais forte possível (medianas). */
export function calibrate(soft: number[], loud: number[]): VelocityCalibration | null {
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  };
  const a = med(soft);
  const b = med(loud);
  if (a === null || b === null || b - a < 15) return null;
  return { soft: a, loud: b };
}

/** Força das notas casadas com o esperado, na ordem (para julgar dinâmica). */
export function matchedVelocities(task: TimedTask, bpm: number, events: CourseEvent[]): number[] {
  return matchEvents(task, bpm, events).flatMap((e) => (e && e.velocity !== undefined ? [e.velocity] : []));
}

/** Fração das notas na faixa pedida, ou subindo/descendo de nota em nota (crescendo/diminuendo). */
export function dynamicsScore(velocities: number[], want: Level | 'crescendo' | 'diminuendo', cal: VelocityCalibration): number | null {
  if (!velocities.length) return null;
  if (want === 'crescendo' || want === 'diminuendo') {
    if (velocities.length < 2) return null;
    let ok = 0;
    for (let i = 1; i < velocities.length; i++) {
      const d = velocities[i] - velocities[i - 1];
      if (want === 'crescendo' ? d >= -2 : d <= 2) ok++;
    }
    const total = velocities[velocities.length - 1] - velocities[0];
    const direction = want === 'crescendo' ? total >= 10 : total <= -10;
    return direction ? ok / (velocities.length - 1) : 0;
  }
  return velocities.filter((v) => levelOf(v, cal) === want).length / velocities.length;
}

// ---------- improviso ----------

export interface ImprovScore {
  notes: number;
  inSet: number;
  /** Pausas de pelo menos um tempo (sem tecla segurada). */
  rests: number;
  restsPer4: number;
  lastPc: Pc | null;
}

/** `events` dentro da janela [0, lengthMs). */
export function scoreImprov(events: CourseEvent[], pcs: Pc[], bpm: number, bars: number, beatsPerBar: number): ImprovScore {
  const beatMs = 60000 / bpm;
  const length = bars * beatsPerBar * beatMs;
  const inside = events.filter((e) => e.t >= -beatMs / 2 && e.t < length).sort((a, b) => a.t - b.t);
  const good = inside.filter((e) => pcs.includes(pcOf(e.midi))).length;
  // Silêncio = trecho sem nenhuma tecla segurada.
  let rests = 0;
  let busyUntil = 0;
  for (const e of inside) {
    if (e.t - busyUntil >= beatMs * 0.95 && busyUntil > 0) rests++;
    busyUntil = Math.max(busyUntil, e.off ?? e.t + beatMs / 2);
  }
  if (inside.length && length - busyUntil >= beatMs * 0.95) rests++;
  return {
    notes: inside.length,
    inSet: inside.length ? good / inside.length : 0,
    rests,
    restsPer4: rests / Math.max(1, bars / 4),
    lastPc: inside.length ? pcOf(inside[inside.length - 1].midi) : null,
  };
}
