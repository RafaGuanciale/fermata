// Gravações: o que você tocou (notas com tempo, duração e força, e o pedal), guardado em MIDI, não em áudio.
// Ocupa pouco, sincroniza com a conta, toca de volta com o som de piano do app e dá para medir e comparar.
// Puro e testado (take.test.ts).

import type { Midi } from '../music/notes';

export interface RecNote {
  midi: Midi;
  /** ms desde o começo da gravação */
  t: number;
  dur: number;
  /** força 1–127; null quando veio do teclado da tela ou do computador */
  vel: number | null;
}

export interface RecPedal {
  t: number;
  down: boolean;
}

export interface RawNoteEvent {
  type: 'on' | 'off';
  midi: Midi;
  /** relógio do aparelho (performance.now) */
  at: number;
  velocity?: number;
}

/** Junta "aperta" e "solta" em notas. Tecla ainda abaixada no fim fecha no fim da gravação. */
export function captureNotes(events: RawNoteEvent[], start: number, end: number): RecNote[] {
  const open = new Map<Midi, { at: number; vel: number | null }>();
  const out: RecNote[] = [];
  const close = (midi: Midi, at: number) => {
    const o = open.get(midi);
    if (!o) return;
    open.delete(midi);
    out.push({ midi, t: Math.max(0, Math.round(o.at - start)), dur: Math.max(30, Math.round(at - o.at)), vel: o.vel });
  };
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    if (e.at < start || e.at > end) continue;
    if (e.type === 'on') {
      close(e.midi, e.at);
      open.set(e.midi, { at: e.at, vel: e.velocity ?? null });
    } else close(e.midi, e.at);
  }
  for (const midi of [...open.keys()]) close(midi, end);
  return out.sort((a, b) => a.t - b.t || a.midi - b.midi);
}

/** Notas em números lado a lado (midi, início, duração, força; 0 = sem força): compacto para guardar e sincronizar. */
export function packNotes(notes: RecNote[]): number[] {
  return notes.flatMap((n) => [n.midi, Math.round(n.t), Math.round(n.dur), n.vel ?? 0]);
}

export function unpackNotes(a: number[]): RecNote[] {
  const out: RecNote[] = [];
  for (let i = 0; i + 3 < a.length; i += 4) out.push({ midi: a[i], t: a[i + 1], dur: a[i + 2], vel: a[i + 3] || null });
  return out;
}

export function packPedal(p: RecPedal[]): number[] {
  return p.flatMap((x) => [Math.round(x.t), x.down ? 1 : 0]);
}

export function unpackPedal(a: number[]): RecPedal[] {
  const out: RecPedal[] = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push({ t: a[i], down: a[i + 1] === 1 });
  return out;
}

/** Com o pedal abaixado a nota continua soando depois de solta, até o pedal subir (para ouvir como foi tocado). */
export function soundingNotes(notes: RecNote[], pedal: RecPedal[]): RecNote[] {
  if (!pedal.length) return notes;
  const ups = pedal.filter((p) => !p.down).map((p) => p.t);
  const downAt = (t: number) => {
    let down = false;
    for (const p of pedal) {
      if (p.t > t) break;
      down = p.down;
    }
    return down;
  };
  return notes.map((n) => {
    const off = n.t + n.dur;
    if (!downAt(off)) return n;
    const up = ups.find((u) => u > off);
    return { ...n, dur: (up ?? off + 2000) - n.t };
  });
}

export interface RecStats {
  durationMs: number;
  notes: number;
  /** notas por minuto */
  perMinute: number;
  /** força: menor, maior e média (só com piano MIDI) */
  velocity: { min: number; max: number; mean: number } | null;
  /** nota mais grave e mais aguda */
  range: [Midi, Midi] | null;
}

export function recordingStats(notes: RecNote[], durationMs?: number): RecStats {
  const dur = durationMs ?? (notes.length ? Math.max(...notes.map((n) => n.t + n.dur)) : 0);
  const vels = notes.map((n) => n.vel).filter((v): v is number => v !== null);
  return {
    durationMs: dur,
    notes: notes.length,
    perMinute: dur > 0 ? Math.round((notes.length / dur) * 60000) : 0,
    velocity: vels.length ? { min: Math.min(...vels), max: Math.max(...vels), mean: Math.round(vels.reduce((a, b) => a + b, 0) / vels.length) } : null,
    range: notes.length ? [Math.min(...notes.map((n) => n.midi)), Math.max(...notes.map((n) => n.midi))] : null,
  };
}

/** Diferenças de tempo de cada nota tocada (ms, negativo = adiantado) → média e espalhamento (desvio padrão). */
export function timingStats(deltas: (number | null | undefined)[]): { mean: number; spread: number } | null {
  const d = deltas.filter((x): x is number => typeof x === 'number');
  if (d.length < 3) return null;
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  const spread = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length);
  return { mean: Math.round(mean), spread: Math.round(spread) };
}

/** O que uma gravação guarda para comparar (além das notas). */
export interface TakeFacts {
  createdAt: number;
  durationMs: number;
  notes: RecNote[];
  bpm?: number;
  accuracy?: number;
  timing?: { mean: number; spread: number } | null;
}

export type Verdict = 'melhor' | 'pior' | 'igual';

export interface CompareRow {
  label: string;
  a: string;
  b: string;
  /** como a segunda (a mais nova) ficou em relação à primeira; null = não dá para dizer */
  verdict: Verdict | null;
}

const ms = (x: number) => `${x.toLocaleString('pt-BR')} ms`;
const pctTxt = (x: number) => `${Math.round(x * 100)}%`;
const minSec = (d: number) => {
  const s = Math.round(d / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
};

function verdictOf(a: number, b: number, betterWhen: 'maior' | 'menor', tolerance: number): Verdict {
  if (Math.abs(b - a) <= tolerance) return 'igual';
  return (b > a) === (betterWhen === 'maior') ? 'melhor' : 'pior';
}

/**
 * Linhas da comparação entre duas gravações (a mais antiga primeiro). Só entra o que existe nas duas.
 * Melhor = mais precisão, mais andamento, mais perto do tempo, mais regular, mais variação de força.
 */
export function compareTakes(first: TakeFacts, second: TakeFacts): CompareRow[] {
  const rows: CompareRow[] = [];
  if (first.accuracy !== undefined && second.accuracy !== undefined)
    rows.push({ label: 'Precisão', a: pctTxt(first.accuracy), b: pctTxt(second.accuracy), verdict: verdictOf(first.accuracy, second.accuracy, 'maior', 0.01) });
  if (first.bpm && second.bpm) rows.push({ label: 'Andamento', a: `${first.bpm} BPM`, b: `${second.bpm} BPM`, verdict: verdictOf(first.bpm, second.bpm, 'maior', 0) });
  if (first.timing && second.timing) {
    const side = (m: number) => (Math.abs(m) < 10 ? 'no tempo' : m < 0 ? `${ms(-m)} adiantado` : `${ms(m)} atrasado`);
    rows.push({ label: 'Em média', a: side(first.timing.mean), b: side(second.timing.mean), verdict: verdictOf(Math.abs(first.timing.mean), Math.abs(second.timing.mean), 'menor', 5) });
    rows.push({ label: 'Regularidade (variação)', a: ms(first.timing.spread), b: ms(second.timing.spread), verdict: verdictOf(first.timing.spread, second.timing.spread, 'menor', 5) });
  }
  const sa = recordingStats(first.notes, first.durationMs);
  const sb = recordingStats(second.notes, second.durationMs);
  if (sa.velocity && sb.velocity) {
    const span = (v: NonNullable<RecStats['velocity']>) => v.max - v.min;
    rows.push({ label: 'Dinâmica (faixa de força)', a: `${sa.velocity.min} a ${sa.velocity.max}`, b: `${sb.velocity.min} a ${sb.velocity.max}`, verdict: verdictOf(span(sa.velocity), span(sb.velocity), 'maior', 4) });
  }
  rows.push({ label: 'Duração', a: minSec(sa.durationMs), b: minSec(sb.durationMs), verdict: null });
  if (first.accuracy === undefined) rows.push({ label: 'Notas por minuto', a: `${sa.perMinute}`, b: `${sb.perMinute}`, verdict: null });
  rows.push({ label: 'Notas', a: `${sa.notes}`, b: `${sb.notes}`, verdict: null });
  return rows;
}

// ---------- arquivo .mid ----------

const vlq = (n: number): number[] => {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
};
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0) & 0x7f);

/**
 * Arquivo MIDI (formato 0) com as notas e o pedal: abre no MuseScore, no GarageBand ou volta para o arcade.
 * Andamento fixo de 120 BPM, 480 divisões por semínima: 1 ms = 0,96 tick.
 */
export function toMidiFile(notes: RecNote[], pedal: RecPedal[] = [], title = 'Fermata'): Uint8Array {
  const PPQ = 480;
  const tick = (t: number) => Math.max(0, Math.round((t * PPQ) / 500));
  const evs: { tick: number; order: number; bytes: number[] }[] = [];
  for (const n of notes) {
    evs.push({ tick: tick(n.t), order: 1, bytes: [0x90, n.midi & 0x7f, Math.max(1, Math.min(127, n.vel ?? 80))] });
    evs.push({ tick: tick(n.t + n.dur), order: 0, bytes: [0x80, n.midi & 0x7f, 0] });
  }
  for (const p of pedal) evs.push({ tick: tick(p.t), order: 0, bytes: [0xb0, 64, p.down ? 127 : 0] });
  evs.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const name = ascii(title).slice(0, 100);
  const body: number[] = [0, 0xff, 0x03, ...vlq(name.length), ...name, 0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20, 0, 0xff, 0x58, 4, 4, 2, 24, 8, 0, 0xc0, 0];
  let last = 0;
  for (const e of evs) {
    body.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  body.push(0, 0xff, 0x2f, 0);
  return new Uint8Array([...ascii('MThd'), ...u32(6), 0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255, ...ascii('MTrk'), ...u32(body.length), ...body]);
}

/** Nome de arquivo seguro a partir do título. */
export function midiFileName(title: string, at: number): string {
  const d = new Date(at);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const base = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'gravacao';
  return `${base}-${date}.mid`;
}
