// Importar MIDI: lê um arquivo .mid (Standard MIDI File, formatos 0 e 1) e vira uma fase do arcade.
// O arquivo é do usuário e fica só no aparelho (tabela arcadeMidi, fora da sincronização).
// Puro e testado (midi.test.ts).

import { easyPick, mergeHands, type ArcadeTune, type ChartNote, type Difficulty } from './arcade';

export interface MidiNote {
  midi: number;
  tick: number;
  durTicks: number;
  vel: number;
}

/** Uma "parte": as notas de uma faixa num canal (a bateria, canal 10, fica de fora). */
export interface MidiPart {
  index: number;
  name: string;
  channel: number;
  program: number | null;
  notes: MidiNote[];
}

export interface MidiFile {
  ppq: number;
  parts: MidiPart[];
  /** Mudanças de andamento: microssegundos por semínima a partir de `tick`. */
  tempos: { tick: number; us: number }[];
  beatsPerBar: number;
  /** Nome da música (o da primeira faixa, se houver). */
  title: string | null;
}

export class MidiError extends Error {}

const GM_FAMILIES = ['Piano', 'Percussão', 'Órgão', 'Violão/guitarra', 'Baixo', 'Cordas', 'Conjunto', 'Metais', 'Palhetas', 'Sopros', 'Synth', 'Synth', 'Synth', 'Étnico', 'Percussão', 'Efeitos'];

/** Família do instrumento General MIDI, em português. */
export const programFamily = (p: number | null) => (p === null ? null : GM_FAMILIES[Math.floor(p / 8)] ?? null);

export function parseMidi(input: ArrayBuffer | Uint8Array): MidiFile {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  let pos = 0;
  const need = (n: number) => {
    if (pos + n > b.length) throw new MidiError('O arquivo terminou antes do esperado.');
  };
  const u8 = () => {
    need(1);
    return b[pos++];
  };
  const u16 = () => (u8() << 8) | u8();
  const u32 = () => ((u8() << 24) >>> 0) + (u8() << 16) + (u8() << 8) + u8();
  const str = (n: number) => {
    need(n);
    const s = String.fromCharCode(...b.subarray(pos, pos + n));
    pos += n;
    return s;
  };
  const vlq = () => {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const c = u8();
      v = (v << 7) | (c & 0x7f);
      if (!(c & 0x80)) return v;
    }
    throw new MidiError('Número inválido no arquivo.');
  };

  if (b.length < 14 || str(4) !== 'MThd') throw new MidiError('Este arquivo não é um MIDI (.mid).');
  const hlen = u32();
  const format = u16();
  const ntrks = u16();
  const division = u16();
  pos += hlen - 6;
  if (format > 1) throw new MidiError('Este MIDI usa o formato 2, que o app ainda não lê.');
  if (division & 0x8000) throw new MidiError('Este MIDI marca o tempo em SMPTE, que o app ainda não lê.');
  const ppq = division || 480;

  const tempos: { tick: number; us: number }[] = [];
  let beatsPerBar = 4;
  let title: string | null = null;
  const parts = new Map<string, MidiPart>();

  for (let t = 0; t < ntrks && pos < b.length; t++) {
    const id = str(4);
    const len = u32();
    const end = pos + len;
    if (id !== 'MTrk') {
      pos = end;
      continue;
    }
    let tick = 0;
    let status = 0;
    let trackName = '';
    const programs = new Map<number, number>();
    const open = new Map<number, { tick: number; vel: number }[]>();
    const local: { channel: number; note: MidiNote }[] = [];
    while (pos < end) {
      tick += vlq();
      let s = b[pos];
      if (s & 0x80) pos++;
      else s = status;
      if (s === 0xff) {
        const type = u8();
        const l = vlq();
        need(l);
        if (type === 0x51 && l === 3) tempos.push({ tick, us: (b[pos] << 16) | (b[pos + 1] << 8) | b[pos + 2] });
        else if (type === 0x58 && l >= 2) {
          const bpb = (b[pos] * 4) / 2 ** b[pos + 1];
          beatsPerBar = Number.isInteger(bpb) && bpb > 0 ? bpb : b[pos];
        } else if (type === 0x03) trackName = new TextDecoder('latin1').decode(b.subarray(pos, pos + l)).trim();
        pos += l;
        continue;
      }
      if (s === 0xf0 || s === 0xf7) {
        pos += vlq();
        continue;
      }
      if (!(s & 0x80)) throw new MidiError('Evento inválido no arquivo.');
      status = s;
      const kind = s & 0xf0;
      const ch = s & 0x0f;
      const d1 = u8();
      const d2 = kind === 0xc0 || kind === 0xd0 ? 0 : u8();
      if (kind === 0xc0) programs.set(ch, d1);
      const key = ch * 128 + d1;
      if (kind === 0x90 && d2 > 0) {
        const list = open.get(key) ?? [];
        list.push({ tick, vel: d2 });
        open.set(key, list);
      } else if (kind === 0x80 || (kind === 0x90 && d2 === 0)) {
        const on = open.get(key)?.shift();
        if (on) local.push({ channel: ch, note: { midi: d1, tick: on.tick, durTicks: Math.max(1, tick - on.tick), vel: on.vel } });
      }
    }
    pos = end;
    // Notas sem "soltar": duram até o fim da faixa.
    for (const [key, list] of open) for (const on of list) local.push({ channel: Math.floor(key / 128), note: { midi: key % 128, tick: on.tick, durTicks: Math.max(1, tick - on.tick), vel: on.vel } });
    if (t === 0 && trackName && !local.length) title = trackName;
    for (const { channel, note } of local) {
      if (channel === 9) continue;
      const k = `${t}:${channel}`;
      let p = parts.get(k);
      if (!p) {
        p = { index: 0, name: trackName, channel, program: programs.get(channel) ?? null, notes: [] };
        parts.set(k, p);
      }
      p.notes.push(note);
    }
  }

  const list = [...parts.values()].filter((p) => p.notes.length);
  list.forEach((p, i) => {
    p.index = i;
    p.notes.sort((a, c) => a.tick - c.tick || c.midi - a.midi);
  });
  if (!list.length) throw new MidiError('Não achei notas neste MIDI (fora a bateria).');
  tempos.sort((a, c) => a.tick - c.tick);
  if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, us: 500000 });
  return { ppq, parts: list, tempos, beatsPerBar, title };
}

/** Tick → ms, seguindo as mudanças de andamento. */
export function tickToMs(tick: number, file: Pick<MidiFile, 'ppq' | 'tempos'>): number {
  let ms = 0;
  const ts = file.tempos;
  for (let i = 0; i < ts.length; i++) {
    const from = ts[i].tick;
    const to = i + 1 < ts.length ? Math.min(ts[i + 1].tick, tick) : tick;
    if (to <= from) break;
    ms += ((to - from) / file.ppq) * (ts[i].us / 1000);
  }
  return ms;
}

/** Andamento único do arquivo (para o clique), ou null se ele muda de verdade. */
export function steadyBpm(file: Pick<MidiFile, 'tempos'>): number | null {
  const us = file.tempos.map((t) => t.us);
  const lo = Math.min(...us);
  const hi = Math.max(...us);
  return hi / lo > 1.02 ? null : Math.round(60e6 / file.tempos[0].us);
}

const avgPitch = (p: MidiPart) => p.notes.reduce((s, n) => s + n.midi, 0) / p.notes.length;

export function partLabel(p: MidiPart): string {
  const fam = programFamily(p.program);
  const name = p.name || fam || `Canal ${p.channel + 1}`;
  return `${name}${fam && p.name && !p.name.toLowerCase().includes(fam.toLowerCase().split('/')[0]) ? ` (${fam.toLowerCase()})` : ''} · ${p.notes.length} notas`;
}

/** Palpite de qual parte é a melodia e qual é o baixo. */
export function guessParts(file: MidiFile): { melody: number; bass: number | null } {
  const ps = file.parts;
  const max = Math.max(...ps.map((p) => p.notes.length));
  const named = (re: RegExp) => ps.find((p) => re.test(p.name) && p.notes.length >= 8);
  const melodyByName = named(/vocal|voice|voz|canto|melod|lead|solo|sing/i);
  const candidates = ps.filter((p) => p.notes.length >= Math.max(8, max * 0.15) && !/bass|baixo/i.test(p.name));
  const melody = melodyByName ?? [...(candidates.length ? candidates : ps)].sort((a, c) => avgPitch(c) - avgPitch(a))[0];
  const bassByName = ps.find((p) => p !== melody && (/bass|baixo/i.test(p.name) || programFamily(p.program) === 'Baixo'));
  const low = ps.filter((p) => p !== melody && p.notes.length >= 8 && avgPitch(p) < 55).sort((a, c) => avgPitch(a) - avgPitch(c))[0];
  const bass = bassByName ?? low ?? null;
  return { melody: melody.index, bass: bass ? bass.index : null };
}

interface TimedNote { midi: number; tick: number; durTicks: number }

/** Uma nota por instante: a mais aguda (melodia) ou a mais grave (baixo). */
export function voice(notes: TimedNote[], which: 'top' | 'bottom', ppq: number): TimedNote[] {
  const tol = ppq / 16;
  const out: TimedNote[] = [];
  for (const n of notes) {
    const prev = out[out.length - 1];
    if (prev && n.tick - prev.tick <= tol) {
      if (which === 'top' ? n.midi > prev.midi : n.midi < prev.midi) out[out.length - 1] = n;
      continue;
    }
    out.push(n);
  }
  return out;
}

/** Tira notas coladas demais para uma mão de verdade (menos de `minMs` depois da anterior). */
function playable(ns: ChartNote[], minMs: number): ChartNote[] {
  const out: ChartNote[] = [];
  for (const n of ns) {
    const prev = out[out.length - 1];
    if (prev && n.t - prev.t < minMs) continue;
    out.push(n);
  }
  return out;
}

/** Desloca por oitavas para caber no teclado (Dó2 a Dó7); o baixo sobe para perto da melodia. */
function fit(ns: TimedNote[], lo: number, hi: number): TimedNote[] {
  if (!ns.length) return ns;
  const min = Math.min(...ns.map((n) => n.midi));
  const max = Math.max(...ns.map((n) => n.midi));
  let shift = 0;
  while (max + shift > hi && min + shift - 12 >= lo) shift -= 12;
  while (min + shift < lo) shift += 12;
  return shift ? ns.map((n) => ({ ...n, midi: n.midi + shift })) : ns;
}

export interface MidiChoice {
  melody: number;
  bass: number | null;
}

/** Fase do arcade a partir do MIDI e das partes escolhidas. */
export function midiTune(file: MidiFile, choice: MidiChoice, meta: { id: string; title: string }): ArcadeTune {
  const mPart = file.parts[choice.melody] ?? file.parts[0];
  const bPart = choice.bass !== null && choice.bass !== mPart.index ? file.parts[choice.bass] : undefined;
  const top = fit(voice(mPart.notes, 'top', file.ppq), 48, 96);
  const melMin = top.length ? Math.min(...top.map((n) => n.midi)) : 60;
  // Baixo: a parte escolhida, ou a voz de baixo da própria melodia quando ela tem acordes.
  let bottom: TimedNote[] = bPart ? voice(bPart.notes, 'bottom', file.ppq) : voice(mPart.notes, 'bottom', file.ppq).filter((n) => !top.some((m) => m.tick === n.tick && m.midi === n.midi));
  if (!bPart && bottom.length < top.length * 0.2) bottom = [];
  bottom = fit(bottom, 36, Math.max(48, melMin - 1));
  const hasBass = bottom.length > 0;

  const bpm = steadyBpm(file);
  const first = Math.min(...[...top, ...bottom].map((n) => n.tick));
  // Com clique, começa num tempo inteiro, para o clique cair no lugar.
  const start = bpm ? Math.floor(first / file.ppq) * file.ppq : first;
  const t0 = tickToMs(start, file);
  const toChart = (ns: TimedNote[], hand: 'r' | 'l'): ChartNote[] =>
    ns.map((n) => {
      const t = tickToMs(n.tick, file) - t0;
      return { midi: n.midi, t, dur: Math.max(60, tickToMs(n.tick + n.durTicks, file) - t0 - t), hand };
    });

  const cache = new Map<Difficulty, ChartNote[]>();
  const chart = (d: Difficulty): ChartNote[] => {
    const hit = cache.get(d);
    if (hit) return hit;
    let out: ChartNote[];
    if (d === 'facil') {
      // Posição no tempo arredondada à semicolcheia, para o "cair no tempo" valer em MIDI tocado ao vivo.
      const withBeats = top.map((n) => ({ n, beat: Math.round(((n.tick - start) / file.ppq) * 4) / 4, beats: n.durTicks / file.ppq }));
      out = playable(toChart(easyPick(withBeats).map((x) => x.n), 'r'), 250);
    } else if (d === 'medio' || !hasBass) {
      out = playable(toChart(top, 'r'), 90);
    } else {
      out = mergeHands(playable(toChart(top, 'r'), 90), playable(toChart(bottom, 'l'), 140));
    }
    cache.set(d, out);
    return out;
  };

  return { id: meta.id, title: meta.title, origin: `MIDI importado · ${partLabel(mPart).split(' · ')[0]}`, bpm, beatsPerBar: file.beatsPerBar, hasBass, chart };
}
