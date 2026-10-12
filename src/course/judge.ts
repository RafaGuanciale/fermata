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
  /** Último acorde aceito (para medir a condução de vozes do próximo). */
  lastChord?: Midi[];
  /** Explicação do último erro, quando não é só uma tecla errada (condução de vozes). */
  why?: string;
}

export const startItem = (): ItemProgress => ({ step: 0, found: [], misses: 0, done: false, lastWrong: null });

/** Movimento real entre dois acordes com o mesmo número de notas: pareia de baixo para cima e soma os semitons. */
export function voiceMove(from: Midi[], to: Midi[]): number {
  const a = [...from].sort((x, y) => x - y);
  const b = [...to].sort((x, y) => x - y);
  return a.reduce((s, m, i) => s + Math.abs(m - b[i]), 0);
}

/**
 * 5ª ou 8ª paralela entre o baixo e alguma voz de cima: a voz e o baixo andam na mesma direção e o intervalo
 * entre eles (5ª justa ou oitava) se repete. Acordes ordenados do grave para o agudo, o baixo primeiro.
 */
export function hasParallels(prev: Midi[], next: Midi[]): boolean {
  if (prev.length !== next.length || prev.length < 2) return false;
  const a = [...prev].sort((x, y) => x - y);
  const b = [...next].sort((x, y) => x - y);
  const db = b[0] - a[0];
  if (db === 0) return false;
  for (let k = 1; k < a.length; k++) {
    const dv = b[k] - a[k];
    if (dv === 0 || Math.sign(dv) !== Math.sign(db)) continue;
    const i1 = (((a[k] - a[0]) % 12) + 12) % 12;
    const i2 = (((b[k] - b[0]) % 12) + 12) % 12;
    if (i1 === i2 && (i1 === 0 || i1 === 7)) return true;
  }
  return false;
}

/** Menor movimento possível de `from` até um acorde com estas classes (uma nota por classe, cada voz vai para a oitava mais perto). */
export function optimalMove(from: Midi[], pcs: Pc[]): number {
  const voices = [...from].sort((x, y) => x - y);
  let best = Infinity;
  const perm = (rest: Pc[], i: number, acc: number, used: Midi[]) => {
    if (acc >= best) return;
    if (i === voices.length) {
      if (new Set(used).size === used.length) best = acc;
      return;
    }
    rest.forEach((pc, k) => {
      const v = voices[i];
      const up = v + ((pc - pcOf(v) + 12) % 12);
      const cand = [up, up - 12];
      for (const t of cand) perm([...rest.slice(0, k), ...rest.slice(k + 1)], i + 1, acc + Math.abs(t - v), [...used, t]);
    });
  };
  perm(pcs, 0, 0, []);
  return best;
}

function fits(accept: Accept, midi: Midi): boolean {
  switch (accept.kind) {
    case 'pc':
      return accept.pcs.includes(pcOf(midi));
    case 'chord':
      // O baixo de uma cifra com barra pode ser nota de fora do acorde (Em/D).
      return accept.pcs.includes(pcOf(midi)) || accept.bass === pcOf(midi);
    case 'exact':
      return accept.midis.includes(midi);
    case 'all':
      // "Todos os Dó": vale qualquer Dó do piano, não só os do trecho mostrado na tela.
      return accept.midis.some((m) => pcOf(m) === pcOf(midi));
    case 'anyChord':
      return accept.options.some((o) => o.pcs.includes(pcOf(midi)));
  }
}

/** O acorde segurado bate com o pedido? */
export function chordMatches(accept: Extract<Accept, { kind: 'chord' }>, held: Midi[]): boolean {
  if (!held.length) return false;
  const pcs = new Set(held.map(pcOf));
  const required = accept.pcs.filter((p) => !accept.optional?.includes(p));
  const allowed = accept.bass === undefined ? accept.pcs : [...accept.pcs, accept.bass];
  if (![...pcs].every((p) => allowed.includes(p)) || !required.every((p) => pcs.has(p))) return false;
  if (accept.bass !== undefined && pcOf(Math.min(...held)) !== accept.bass) return false;
  return true;
}

function advance(p: ItemProgress, item: Item, chord?: Midi[]): ItemProgress {
  const step = p.step + 1;
  return { ...p, step, found: [], lastWrong: null, why: undefined, lastChord: chord ?? p.lastChord, done: step >= item.steps.length };
}

/**
 * Uma tecla abaixada. `held` = teclas seguradas agora, já incluindo esta.
 * Nota fora do pedido conta erro; acorde anda quando todas as notas estão seguradas juntas.
 */
export function pressItem(p: ItemProgress, item: Item, midi: Midi, held: Midi[]): ItemProgress {
  if (p.done || !item.steps.length) return p;
  const accept = item.steps[p.step];
  if (!fits(accept, midi)) return { ...p, misses: p.misses + 1, lastWrong: midi, why: undefined };
  if (accept.kind === 'chord') {
    // Condução com baixo: espera o baixo e as vozes de cima (uma por classe) antes de julgar,
    // senão um acorde com a fundamental dobrada seria julgado na terceira nota.
    if (accept.lead !== undefined && accept.bass !== undefined && held.length < accept.pcs.length + 1) return { ...p, lastWrong: null, why: undefined };
    if (chordMatches(accept, held)) {
      const chord = [...held].sort((a, b) => a - b);
      if (accept.lead !== undefined && p.lastChord?.length) {
        // Com baixo pedido, a nota mais grave (o baixo, na esquerda) fica fora da medida: conduzem-se as vozes de cima.
        const withBass = accept.bass !== undefined && chord.length === accept.pcs.length + 1;
        const upper = withBass ? chord.slice(1) : chord;
        const prevUpper = withBass && p.lastChord.length === accept.pcs.length + 1 ? p.lastChord.slice(1) : p.lastChord;
        if (upper.length !== accept.pcs.length || prevUpper.length !== upper.length) {
          return { ...p, misses: p.misses + 1, lastWrong: null, why: `Use ${accept.pcs.length} notas em cima, uma de cada${accept.bass !== undefined ? ', e o baixo embaixo' : ', sem dobrar'}.` };
        }
        const moved = voiceMove(prevUpper, upper);
        const best = optimalMove(prevUpper, accept.pcs);
        if (moved > best + accept.lead) {
          return { ...p, misses: p.misses + 1, lastWrong: null, why: `Acorde certo, mas a mão andou ${moved} semitons (o mais curto é ${best}). Segure as notas comuns e ande por grau conjunto.` };
        }
        // Paralelas só no estilo coral (baixo na fundamental); na cifra com barra a nota do baixo aparece também em cima.
        if (withBass && accept.bass === accept.pcs[0] && p.lastChord.length === chord.length && hasParallels(p.lastChord, chord)) {
          return { ...p, misses: p.misses + 1, lastWrong: null, why: 'Acorde certo, mas deu 5ª ou oitava paralela com o baixo. Quando o baixo sobe, leve as vozes de cima para baixo (e vice-versa).' };
        }
      }
      return advance(p, item, chord);
    }
    // Todas as classes, mas baixo errado: é inversão errada.
    const pcs = new Set(held.map(pcOf));
    if (accept.bass !== undefined && accept.pcs.filter((x) => !accept.optional?.includes(x)).every((x) => pcs.has(x))) return { ...p, misses: p.misses + 1, lastWrong: Math.min(...held) };
    return { ...p, lastWrong: null, why: undefined };
  }
  if (accept.kind === 'anyChord') {
    const hit = accept.options.find((o) => chordMatches({ kind: 'chord', pcs: o.pcs, bass: o.bass }, held));
    if (hit) return advance(p, item, [...held].sort((a, b) => a - b));
    return { ...p, lastWrong: null, why: undefined };
  }
  if (accept.kind === 'all') {
    // Conta teclas diferentes; as da tela acendem, as de outras oitavas (piano de 88 teclas) contam igual.
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
 * Uniformidade (IOI-SD): desvio-padrão, em ms, da diferença entre o intervalo tocado e o escrito
 * entre notas vizinhas casadas. Para escalas em figuras iguais, é o IOI-SD clássico. Null com menos de 3 notas casadas.
 */
export function ioiSd(task: TimedTask, bpm: number, events: CourseEvent[]): number | null {
  const beatMs = 60000 / bpm;
  const matched = matchEvents(task, bpm, events);
  const d: number[] = [];
  for (let i = 0; i + 1 < matched.length; i++) {
    const a = matched[i];
    const b = matched[i + 1];
    const gap = task.events[i + 1].beat - task.events[i].beat;
    if (a && b && gap > 0) d.push(b.t - a.t - gap * beatMs);
  }
  if (d.length < 2) return null;
  const mean = d.reduce((s, x) => s + x, 0) / d.length;
  return Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / d.length);
}

/**
 * Folga do legato, em ms. No piano digital a nota anterior "solta" (note-off) quando a tecla começa a subir, e a
 * seguinte só "toca" (note-on) quando chega ao fundo: uma troca ligada de verdade costuma chegar com 20 a 60 ms
 * de diferença. Até 80 ms o abafador ainda não cortou o som, e o ouvido percebe ligado.
 */
export const LEGATO_GAP_MS = 80;

function articPairs(task: TimedTask, bpm: number, events: CourseEvent[]): [CourseEvent, CourseEvent][] {
  const matched = matchEvents(task, bpm, events);
  const pairs: [CourseEvent, CourseEvent][] = [];
  for (let i = 0; i + 1 < matched.length; i++) {
    const a = matched[i];
    const b = matched[i + 1];
    if (a && b && task.events[i + 1].beat > task.events[i].beat) pairs.push([a, b]);
  }
  return pairs;
}

/**
 * Legato: a nota seguinte começa antes (ou até LEGATO_GAP_MS depois) de a anterior soltar.
 * Staccato: a nota dura menos da metade do espaço até a próxima.
 * Retorna a fração de transições certas.
 */
export function articulationScore(task: TimedTask, bpm: number, events: CourseEvent[], kind: 'legato' | 'staccato'): number | null {
  const pairs = articPairs(task, bpm, events);
  if (!pairs.length) return null;
  const ok = pairs.filter(([a, b]) => {
    const off = a.off ?? Infinity;
    if (kind === 'legato') return b.t - off <= LEGATO_GAP_MS;
    return off - a.t < 0.5 * (b.t - a.t);
  });
  return ok.length / pairs.length;
}

/**
 * Silêncio típico (mediana, em ms) entre soltar uma nota e tocar a seguinte. Negativo = as notas se encostaram
 * (legato). Null sem pares com o soltar medido.
 */
export function releaseGap(task: TimedTask, bpm: number, events: CourseEvent[]): number | null {
  const gaps = articPairs(task, bpm, events)
    .filter(([a]) => a.off !== null)
    .map(([a, b]) => b.t - (a.off as number))
    .sort((x, y) => x - y);
  if (!gaps.length) return null;
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

/**
 * Teclas da próxima nota ainda não tocada, na ordem da música: o guia do teclado acompanha quem toca, em vez de
 * andar sozinho com o relógio. `notes` é o julgamento ao vivo (null = ainda não julgada).
 */
export function nextToPlay(task: TimedTask, notes: readonly (unknown | null)[]): number[] {
  let beat: number | null = null;
  task.events.forEach((e, i) => {
    if (e.midi === null || notes[i] != null) return;
    if (beat === null || e.beat < beat - 1e-6) beat = e.beat;
  });
  if (beat === null) return [];
  const at = beat;
  return task.events.filter((e, i) => e.midi !== null && notes[i] == null && Math.abs(e.beat - at) < 1e-6).map((e) => e.midi as number);
}

// ---------- pedal (CC64) ----------

export interface PedalEvent {
  down: boolean;
  /** ms desde o primeiro tempo. */
  t: number;
}

export interface PedalScore {
  /** Acertos / (acordes + pausas). */
  score: number;
  /** Acordes em que o pedal não subiu antes do próximo (som misturado). */
  muddy: number;
  /** Pausas com o pedal abaixado. */
  stuck: number;
  /** Acordes em que o pedal não desceu junto. */
  missed: number;
  /** Pedal legato: trocas antecipadas (o pedal subiu antes do acorde novo, deixando um buraco). */
  early: number;
}

/** Onde o pedal troca: a cada ataque, ou, com duas mãos, só nos ataques da esquerda (a harmonia), não a cada nota da melodia. */
export function pedalOnsets(task: TimedTask): number[] {
  const left = task.events.filter((e) => e.hand === 'l');
  return [...new Set((left.length ? left : task.events).map((e) => e.beat))].sort((a, b) => a - b);
}

/**
 * Pedal direto: desce junto com cada acorde (de 100 ms antes a 400 ms depois do ataque) e sobe antes do próximo
 * (até 30 ms depois do ataque seguinte). Nas pausas de pelo menos 1 tempo, o pedal tem de estar em cima no meio da pausa.
 * Sem nenhum evento de pedal, retorna null (piano sem pedal ou sem MIDI).
 */
export function pedalScore(task: TimedTask, bpm: number, pedal: PedalEvent[], kind: 'direto' | 'legato' = 'direto'): PedalScore | null {
  if (!pedal.length) return null;
  if (kind === 'legato') return legatoPedal(task, bpm, pedal);
  const beatMs = 60000 / bpm;
  const ev = [...pedal].sort((a, b) => a.t - b.t);
  const isDown = (t: number) => {
    let d = false;
    for (const e of ev) {
      if (e.t > t) break;
      d = e.down;
    }
    return d;
  };
  const onsets = pedalOnsets(task).map((b) => b * beatMs);
  let ok = 0;
  let muddy = 0;
  let missed = 0;
  onsets.forEach((at, i) => {
    const press = ev.find((e) => e.down && e.t >= at - 100 && e.t <= at + 400);
    if (!press) {
      missed++;
      return;
    }
    const next = onsets[i + 1];
    if (next !== undefined && !ev.some((e) => !e.down && e.t > press.t && e.t <= next + 30)) {
      muddy++;
      return;
    }
    ok++;
  });
  // Pausas: trechos sem nenhuma nota soando, de pelo menos 1 tempo.
  const spans = task.events.map((e) => [e.beat, e.beat + e.beats] as const).sort((a, b) => a[0] - b[0]);
  const rests: number[] = [];
  let until = 0;
  for (const [a, b] of spans) {
    if (a - until >= 1 - 1e-6) rests.push(((until + a) / 2) * beatMs);
    until = Math.max(until, b);
  }
  const stuck = rests.filter((mid) => isDown(mid)).length;
  const total = onsets.length + rests.length;
  return { score: total ? (ok + rests.length - stuck) / total : 0, muddy, stuck, missed, early: 0 };
}

/**
 * Pedal legato (sincopado): no 1º acorde o pedal desce depois do ataque (até 400 ms). Em cada acorde seguinte,
 * o pedal sobe e desce de novo logo DEPOIS do ataque (subida de 40 ms antes a 250 ms depois; descida até 400 ms depois).
 * Subir antes disso deixa um buraco no som: troca antecipada. Não trocar: lama.
 */
function legatoPedal(task: TimedTask, bpm: number, pedal: PedalEvent[]): PedalScore {
  const beatMs = 60000 / bpm;
  const ev = [...pedal].sort((a, b) => a.t - b.t);
  const onsets = pedalOnsets(task).map((b) => b * beatMs);
  let ok = 0;
  let muddy = 0;
  let missed = 0;
  let early = 0;
  onsets.forEach((at, i) => {
    if (i === 0) {
      if (ev.some((e) => e.down && e.t >= at - 40 && e.t <= at + 400)) ok++;
      else missed++;
      return;
    }
    const prev = onsets[i - 1];
    if (ev.some((e) => !e.down && e.t > prev + 250 && e.t < at - 40)) {
      early++;
      return;
    }
    const up = ev.find((e) => !e.down && e.t >= at - 40 && e.t <= at + 250);
    if (!up) {
      muddy++;
      return;
    }
    if (ev.some((e) => e.down && e.t > up.t && e.t <= at + 400)) ok++;
    else missed++;
  });
  return { score: onsets.length ? ok / onsets.length : 0, muddy, stuck: 0, missed, early };
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

/**
 * Equilíbrio entre as mãos: por compasso, média de velocity da direita menos a da esquerda (notas casadas).
 * Devolve a fração dos compassos (com as duas mãos) em que a diferença chega a `minDiff`, ou null sem velocity.
 */
export function balanceScore(task: TimedTask, bpm: number, events: CourseEvent[], minDiff: number): number | null {
  const matched = matchEvents(task, bpm, events);
  const bars = new Map<number, { r: number[]; l: number[] }>();
  task.events.forEach((e, i) => {
    const m = matched[i];
    if (!m || m.velocity === undefined || !e.hand) return;
    const b = Math.floor(e.beat / task.beatsPerBar + 1e-9);
    const slot = bars.get(b) ?? { r: [], l: [] };
    slot[e.hand].push(m.velocity);
    bars.set(b, slot);
  });
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const both = [...bars.values()].filter((x) => x.r.length && x.l.length);
  if (!both.length) return null;
  return both.filter((x) => avg(x.r) - avg(x.l) >= minDiff).length / both.length;
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
/**
 * Notas-alvo: em cada troca de acorde da base, a primeira nota tocada perto do tempo 1 (de meio tempo antes até um tempo depois)
 * caiu numa nota do acorde? Devolve chegadas e acertos.
 */
export function chordTargets(events: CourseEvent[], backing: Midi[][], bpm: number, bars: number, beatsPerBar: number): { arrivals: number; hits: number; ratio: number } {
  const beatMs = 60000 / bpm;
  const sorted = [...events].sort((a, b) => a.t - b.t);
  let arrivals = 0;
  let hits = 0;
  for (let b = 1; b < bars; b++) {
    const chord = backing[b % backing.length];
    const prev = backing[(b - 1) % backing.length];
    const pcs = new Set(chord.map(pcOf));
    const prevPcs = new Set(prev.map(pcOf));
    if (pcs.size === prevPcs.size && [...pcs].every((p) => prevPcs.has(p))) continue;
    const at = b * beatsPerBar * beatMs;
    const first = sorted.find((e) => e.t >= at - beatMs / 2 && e.t < at + beatMs);
    if (!first) continue;
    arrivals++;
    if (pcs.has(pcOf(first.midi))) hits++;
  }
  return { arrivals, hits, ratio: arrivals ? hits / arrivals : 0 };
}

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

// ---------- veredito da passada ----------

export interface TakeChecks {
  accuracy: number;
  need: number;
  articulation?: 'legato' | 'staccato';
  artic: number | null;
  dyn: number | null;
  extras: number;
  noExtras?: boolean;
  ped: number | null;
  even: number | null;
  evenness?: number;
  bal: number | null;
}

/** O que faltou, além do tempo, para a passada valer. Vazio = só o tempo decide. */
export function takeShortfalls(c: TakeChecks): string[] {
  const out: string[] = [];
  if (c.artic !== null && c.artic < 0.9) out.push(c.articulation === 'staccato' ? 'o staccato' : 'o legato');
  if (c.dyn !== null && c.dyn < c.need) out.push('a dinâmica');
  if (c.noExtras && c.extras > 0) out.push('tocar sem notas a mais');
  if (c.ped !== null && c.ped < 0.85) out.push('o pedal');
  if (c.even !== null && c.evenness !== undefined && c.even > c.evenness) out.push('a uniformidade');
  if (c.bal !== null && c.bal < 0.8) out.push('o equilíbrio entre as mãos');
  return out;
}

export function takePassed(c: TakeChecks): boolean {
  return c.accuracy >= c.need && takeShortfalls(c).length === 0;
}

/** Frase do resultado: diz o motivo de verdade quando o tempo passou mas outra coisa não. */
export function takeHeadline(c: TakeChecks, pct: (x: number) => string): string {
  if (c.accuracy < c.need) return `${pct(c.accuracy)} no tempo (precisa de ${pct(c.need)})`;
  const miss = takeShortfalls(c);
  if (!miss.length) return `${pct(c.accuracy)} no tempo: passada boa`;
  return `${pct(c.accuracy)} no tempo, mas faltou ${miss.join(' e ')}`;
}

/**
 * O que mudou depois da passada, para o aviso que fica na tela até a próxima: o andamento subiu ou desceu,
 * ou falta quanto para concluir. Null quando nada muda (o próprio resultado da passada já diz tudo).
 */
export function takeAftermath(o: { ok: boolean; bpm: number; nextBpm: number; streak: number; reps: number; newTask: boolean }): string | null {
  if (o.nextBpm > o.bpm) return `Subiu para ${o.nextBpm} BPM.`;
  if (o.nextBpm < o.bpm) return `Voltou para ${o.nextBpm} BPM: firme o tempo antes de subir de novo.`;
  if (o.ok && o.streak < o.reps) {
    const left = o.reps - o.streak;
    return `Falta${left > 1 ? 'm' : ''} ${left} para concluir${o.newTask ? ', com um desenho novo' : ''}.`;
  }
  return null;
}
