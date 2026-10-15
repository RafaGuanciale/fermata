// O jogo: as notas caem direto sobre as teclas (como no Synthesia) e a tecla acende na cor da nota que chega.
// Nota longa pede para segurar: ela vai sendo "comida" pela tecla e soma pontos enquanto você segura.
// Desenho em canvas (60 quadros por segundo sem pesar o React); placar e telas por cima, em HTML.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { CloseIcon, RestartIcon } from '../components/Icons';
import { useNoteInput } from '../input/useNoteInput';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../training/clickTrack';
import { saveRun, useRuns } from '../training/runs';
import { noteInfo, whiteKeysBetween, type Midi } from '../music/notes';
import { Burst, Stars } from '../celebrate/Celebrate';
import { playReward } from '../celebrate/sound';
import {
  DIFFICULTIES, WINDOWS_BY, chartRange, comboMilestone, expire, hit, isHold, multiplier, multiplierFill, release, scaleChart, startState,
  summarize, sustain, waitingAt, type ArcadeGrade, type ArcadeState, type ArcadeSummary, type ArcadeTune, type ChartNote, type Difficulty,
} from './arcade';

const SETTINGS_KEY = 'fermata-arcade';
/** Tempo que a nota leva do alto da tela até a tecla. */
const LEAD = 2600;

interface Settings {
  wait: boolean;
  slow: boolean;
  names: boolean;
  diff: Difficulty;
}

function readSettings(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>;
    const diff = DIFFICULTIES.some((d) => d.id === v.diff) ? (v.diff as Difficulty) : 'medio';
    return { wait: !!v.wait, slow: v.slow ?? true, names: v.names ?? true, diff };
  } catch {
    return { wait: false, slow: true, names: true, diff: 'medio' };
  }
}

type Phase = 'menu' | 'playing' | 'done';
type RGB = [number, number, number];

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: RGB; size: number }
interface Floater { x: number; y: number; text: string; life: number; color: RGB }

/** Recorde por música e dificuldade (o médio mantém o id antigo). */
export const arcadeRunId = (id: string, d: Difficulty = 'medio') => (d === 'medio' ? `arcade-${id}` : `arcade-${id}~${d}`);
export function parseArcadeRunId(treinoId: string): { id: string; diff: Difficulty } | null {
  if (!treinoId.startsWith('arcade-')) return null;
  const [id, d] = treinoId.slice(7).split('~');
  return { id, diff: (DIFFICULTIES.some((x) => x.id === d) ? d : 'medio') as Difficulty };
}

// ---------- cores ----------

function toRgb(c: string, fallback: RGB): RGB {
  const s = c.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((x) => x + x).join('') : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) {
    const [r, g, b] = m[1].split(/[ ,/]+/).map(Number);
    if ([r, g, b].every((x) => Number.isFinite(x))) return [r, g, b];
  }
  return fallback;
}
const rgba = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: RGB, b: RGB, p: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * p)) as RGB;

interface Palette {
  light: boolean;
  petrol: RGB;
  champagne: RGB;
  khaki: RGB;
  blush: RGB;
  ebony: RGB;
  white: RGB;
  /** Cor das notas da direita e da esquerda. */
  right: RGB;
  left: RGB;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const get = (n: string, f: RGB) => toRgb(cs.getPropertyValue(n), f);
  const petrol = get('--color-petrol', [44, 90, 100]);
  const champagne = get('--color-champagne', [241, 224, 197]);
  const khaki = get('--color-khaki', [201, 183, 156]);
  const blush = get('--color-blush', [218, 102, 123]);
  const ebony = get('--color-ebony', [27, 29, 33]);
  const white = get('--color-off-white', [250, 250, 248]);
  const light = document.documentElement.dataset.theme === 'light';
  return {
    light, petrol, champagne, khaki, blush, ebony, white,
    right: light ? petrol : mix(petrol, white, 0.28),
    left: light ? mix(khaki, ebony, 0.25) : khaki,
  };
}

/** Primeira nota que ainda pode aparecer no instante `t` (o gráfico está em ordem de tempo). */
function firstVisible(chart: ChartNote[], t: number, maxDur: number): number {
  let lo = 0;
  let hi = chart.length;
  const target = t - maxDur - 1500;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (chart[mid].t < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export default function ArcadeGame({ tune, onClose, extraMenu }: { tune: ArcadeTune; onClose: () => void; extraMenu?: React.ReactNode }) {
  const { subscribe, press, release: releaseKey } = useNoteInput();
  const runs = useRuns();
  const [settings, setSettingsState] = useState<Settings>(readSettings);
  const setSettings = (s: Settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      // vale só agora
    }
    setSettingsState(s);
  };
  const diff = settings.diff;
  const runId = arcadeRunId(tune.id, diff);
  const best = useMemo(() => {
    const mine = (runs ?? []).filter((r) => r.treinoId === runId);
    return mine.length ? Math.max(...mine.map((r) => r.score ?? 0)) : null;
  }, [runs, runId]);
  const speed = settings.slow ? 0.75 : 1;
  const chart = useMemo(() => scaleChart(tune.chart(diff), speed), [tune, diff, speed]);
  const maxDur = useMemo(() => chart.reduce((m, n) => Math.max(m, n.dur), 0), [chart]);
  const windows = WINDOWS_BY[diff];
  const [low, high] = useMemo(() => chartRange(chart), [chart]);
  const diffInfo = DIFFICULTIES.find((d) => d.id === diff)!;

  const [phase, setPhaseState] = useState<Phase>('menu');
  const phaseRef = useRef<Phase>('menu');
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const [hud, setHud] = useState({ score: 0, combo: 0, mult: 1, fill: 0, progress: 0 });
  const [summary, setSummary] = useState<ArcadeSummary | null>(null);
  const [record, setRecord] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ArcadeState>(startState(chart));
  const startRef = useRef(0);
  const offsetRef = useRef(0);
  const trackRef = useRef<ScheduledTrack | null>(null);
  const heldRef = useRef(new Set<Midi>());
  const particles = useRef<Particle[]>([]);
  const floaters = useRef<Floater[]>([]);
  const flashRef = useRef<Map<number, number>>(new Map());
  /** Feixe que sobe da tecla: força (0 a 1) e cor. */
  const beams = useRef<Map<Midi, { s: number; color: RGB }>>(new Map());
  const glowRef = useRef(0);
  const endedAt = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const bestRef = useRef(best);
  bestRef.current = best;
  const paletteRef = useRef<Palette | null>(null);

  // ---------- geometria ----------
  const whites = useMemo(() => whiteKeysBetween(low, high), [low, high]);
  const geom = useCallback((w: number, h: number) => {
    const kbH = Math.round(Math.min(180, Math.max(96, h * 0.24)));
    const ww = w / whites.length;
    const hitY = h - kbH;
    const laneX = (m: Midi): { x: number; width: number; black: boolean } => {
      const black = noteInfo(m).isBlack;
      if (!black) {
        const i = whites.indexOf(m);
        return { x: (i + 0.5) * ww, width: Math.max(6, ww - 6), black };
      }
      const i = whites.indexOf(m - 1);
      return { x: (i + 1) * ww, width: Math.max(5, ww * 0.52), black };
    };
    return { kbH, ww, hitY, laneX };
  }, [whites]);

  // ---------- começar e terminar ----------
  const start = useCallback(() => {
    trackRef.current?.cancel();
    stateRef.current = startState(chart);
    particles.current = [];
    floaters.current = [];
    flashRef.current = new Map();
    beams.current = new Map();
    offsetRef.current = 0;
    glowRef.current = 0;
    setSummary(null);
    setRecord(false);
    setMilestone(null);
    setHud({ score: 0, combo: 0, mult: 1, fill: 0, progress: 0 });
    const last = chart[chart.length - 1];
    const endMs = last ? last.t + last.dur : 0;
    // No ritmo, com andamento fixo: o clique do metrônomo marca o pulso e é o relógio.
    // Sem pressa, ou MIDI com mudança de andamento: sem clique, o relógio é o do aparelho.
    let track: ScheduledTrack | null = null;
    if (!settingsRef.current.wait && tune.bpm) {
      const bpm = tune.bpm * speed;
      const beatMs = 60000 / bpm;
      track = scheduleTrack({ bpm, countIn: Math.ceil((LEAD + 400) / beatMs), beats: Math.ceil(endMs / beatMs), beatsPerBar: tune.beatsPerBar, volume: 0.3 });
    }
    trackRef.current = track;
    startRef.current = track ? track.firstBeat : performance.now() + LEAD + 400;
    setPhase('playing');
  }, [chart, tune, speed]);

  const finish = useCallback(() => {
    trackRef.current?.cancel();
    trackRef.current = null;
    const s = summarize(stateRef.current);
    setSummary(s);
    const isRecord = bestRef.current === null || s.score > bestRef.current;
    setRecord(isRecord && s.score > 0);
    void saveRun({ treinoId: arcadeRunId(tune.id, settingsRef.current.diff), kind: 'timed', accuracy: s.hits, score: s.score, stars: s.stars, passed: s.stars > 0, bpm: tune.bpm ? Math.round(tune.bpm * speed) : 0 });
    if (s.stars >= 2) playReward(s.stars === 3 ? 'great' : 'pass');
    endedAt.current = performance.now();
    setPhase('done');
  }, [tune, speed]);

  const stop = useCallback(() => {
    trackRef.current?.cancel();
    trackRef.current = null;
    setPhase('menu');
  }, []);

  useEffect(() => () => trackRef.current?.cancel(), []);
  // Trocou a dificuldade ou o andamento no menu: o estado novo acompanha o gráfico novo.
  useEffect(() => {
    if (phaseRef.current !== 'playing') stateRef.current = startState(chart);
  }, [chart]);

  /** Tempo da música agora (ms desde a primeira nota), já com as esperas do modo sem pressa. */
  const songTime = (now: number) => now - startRef.current - offsetRef.current;

  // ---------- entrada ----------
  const spark = useCallback((x: number, y: number, grade: ArcadeGrade, color: RGB) => {
    const p = paletteRef.current;
    const bright = p ? mix(color, p.white, p.light ? 0 : 0.35) : color;
    const n = grade === 'perfeito' ? 22 : 12;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const v = 1.5 + Math.random() * (grade === 'perfeito' ? 5 : 3.2);
      particles.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: bright, size: 1.5 + Math.random() * 2.8 });
    }
    floaters.current.push({ x, y: y - 22, text: grade === 'perfeito' ? 'Perfeito!' : grade === 'bom' ? 'Bom' : 'Ok', life: 1, color: bright });
  }, []);

  const onKeyHit = useCallback((midi: Midi, at: number) => {
    const t = songTime(at) - (getLatency() ?? 0);
    const prev = stateRef.current;
    const r = hit(chart, prev, midi, t, windows);
    stateRef.current = r.state;
    const canvas = canvasRef.current;
    const pal = paletteRef.current;
    if (!canvas || !pal) return;
    const { hitY, laneX } = geom(canvas.clientWidth, canvas.clientHeight);
    const lane = laneX(midi);
    if (r.index !== null && r.grade) {
      const color = chart[r.index].hand === 'l' ? pal.left : pal.right;
      flashRef.current.set(r.index, performance.now());
      beams.current.set(midi, { s: 1, color });
      spark(lane.x, hitY, r.grade, color);
      const m = comboMilestone(prev.combo, r.state.combo);
      if (m) {
        setMilestone(m);
        glowRef.current = 1;
        window.setTimeout(() => setMilestone((cur) => (cur === m ? null : cur)), 1500);
      }
    } else {
      beams.current.set(midi, { s: 0.45, color: pal.light ? pal.khaki : pal.champagne });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, geom, windows, spark]);

  const onKeyUp = useCallback((midi: Midi, at: number) => {
    if (phaseRef.current !== 'playing') return;
    stateRef.current = release(chart, stateRef.current, midi, songTime(at) - (getLatency() ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  useEffect(() => subscribe((e) => {
    if (e.type === 'off') {
      heldRef.current.delete(e.midi);
      onKeyUp(e.midi, e.at);
      return;
    }
    heldRef.current.add(e.midi);
    if (phaseRef.current === 'playing') onKeyHit(e.midi, e.at);
    else if (phaseRef.current === 'menu' || performance.now() - endedAt.current > 1500) start();
  }), [subscribe, onKeyHit, onKeyUp, start]);

  // Espaço: começa ou para. R: recomeça. Esc fecha (pela moldura).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      // Os chips do menu não engolem o espaço: depois de escolher a dificuldade, espaço já começa.
      const chip = el?.tagName === 'BUTTON' && el.classList.contains('chip');
      if (el && !chip && (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        start();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (phaseRef.current === 'playing') stop();
        else start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start, stop]);

  // ---------- desenho ----------
  useEffect(() => {
    const read = () => {
      paletteRef.current = readPalette();
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let lastHud = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(wrap.clientWidth * dpr);
      canvas.height = Math.round(wrap.clientHeight * dpr);
      canvas.style.width = `${wrap.clientWidth}px`;
      canvas.style.height = `${wrap.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const rr = (x: number, y: number, w: number, h: number, r: number | number[]) => {
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), r);
    };

    const frame = () => {
      const now = performance.now();
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const p = paletteRef.current ?? readPalette();
      const { kbH, ww, hitY, laneX } = geom(w, h);
      ctx.clearRect(0, 0, w, h);

      // ----- relógio e regras -----
      let t = -Infinity;
      const playing = phaseRef.current === 'playing';
      if (playing) {
        t = songTime(now);
        if (settingsRef.current.wait) {
          const waitT = waitingAt(chart, stateRef.current, t);
          if (waitT !== null && t > waitT) {
            offsetRef.current += t - waitT;
            t = waitT;
          }
        } else {
          stateRef.current = expire(chart, stateRef.current, t - (getLatency() ?? 0), windows);
        }
        stateRef.current = sustain(chart, stateRef.current, t - (getLatency() ?? 0));
        const last = chart[chart.length - 1];
        const st = stateRef.current;
        const holding = st.holds.includes('segurando');
        if (last && t > last.t + last.dur + 900 && !holding && st.results.every((r) => r !== null)) finish();
        else if (last && !settingsRef.current.wait && t > last.t + last.dur + 1500) finish();
      }
      const s = stateRef.current;

      // ----- faixas -----
      const lineInk = p.light ? p.ebony : p.white;
      whites.forEach((m, i) => {
        ctx.fillStyle = rgba(lineInk, (p.light ? 0.035 : 0.035) * (m % 12 === 0 ? 2.4 : 1));
        ctx.fillRect(Math.round(i * ww), 0, 1, hitY);
      });
      for (let m = low; m <= high; m++) {
        if (!noteInfo(m).isBlack) continue;
        const lane = laneX(m);
        ctx.fillStyle = rgba(p.ebony, p.light ? 0.018 : 0.28);
        ctx.fillRect(lane.x - lane.width / 2, 0, lane.width, hitY);
      }

      // Combo alto: o palco ganha um brilho que sobe do teclado.
      const mult = multiplier(s.combo);
      glowRef.current = Math.max(0, glowRef.current - 0.012);
      const glow = Math.min(1, ((mult - 1) / 3) * 0.7 + glowRef.current * 0.5);
      if (glow > 0.01) {
        const g = ctx.createLinearGradient(0, hitY, 0, hitY * 0.2);
        g.addColorStop(0, rgba(p.right, (p.light ? 0.16 : 0.28) * glow));
        g.addColorStop(1, rgba(p.right, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, hitY);
      }

      // ----- notas -----
      const keyLight = new Map<Midi, { color: RGB; a: number }>();
      const from = playing ? firstVisible(chart, t, maxDur) : chart.length;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, hitY);
      ctx.clip();
      for (let i = from; i < chart.length; i++) {
        const n = chart[i];
        if (n.t - t > LEAD + 200) break;
        const yBottom = hitY - ((n.t - t) / LEAD) * hitY;
        const len = Math.max(16, (n.dur / LEAD) * hitY - 3);
        const yTop = yBottom - len;
        const res = s.results[i];
        const hold = s.holds[i];
        const lane = laneX(n.midi);
        const base = n.hand === 'l' ? p.left : p.right;
        const long = isHold(n);

        // A tecla acende na cor da nota que chega (e enquanto ela é segurada).
        const dt = n.t - t;
        if (res === null && dt < 160 && dt > -windows.ok) {
          const a = (1 - Math.max(0, dt) / 160) * 0.6;
          keyLight.set(n.midi, { color: base, a: Math.max(keyLight.get(n.midi)?.a ?? 0, a) });
        }
        if (hold === 'segurando') keyLight.set(n.midi, { color: base, a: 1 });
        // Faixa da nota que vem: um rastro de luz até a tecla.
        if (res === null && dt > 0 && dt < 1100) {
          const a = (1 - dt / 1100) * (p.light ? 0.1 : 0.16);
          const yb = Math.max(0, yBottom);
          const g = ctx.createLinearGradient(0, hitY, 0, yb);
          g.addColorStop(0, rgba(base, a));
          g.addColorStop(1, rgba(base, 0));
          ctx.fillStyle = g;
          ctx.fillRect(lane.x - lane.width / 2, yb, lane.width, hitY - yb);
        }
        if (yTop > hitY || yBottom < -10) continue;

        let alpha = 1;
        let top = mix(base, p.white, 0.3);
        let bottom = base;
        let blur = 14;
        let scaleW = 1;
        if (res === 'perdeu') {
          alpha = 0.3;
          top = p.blush;
          bottom = p.blush;
          blur = 0;
        } else if (res && !long) {
          const f = flashRef.current.get(i) ?? now;
          alpha = Math.max(0, 1 - (now - f) / 220);
          scaleW = 1 + (1 - alpha) * 0.5;
          top = mix(base, p.white, 0.7);
          blur = 24;
          if (alpha <= 0) continue;
        } else if (hold === 'segurando') {
          top = mix(base, p.white, 0.6);
          bottom = mix(base, p.white, 0.25);
          blur = 28;
        } else if (hold === 'soltou') {
          alpha = 0.28;
          top = mix(base, p.light ? p.white : p.ebony, 0.4);
          bottom = top;
          blur = 0;
        }
        const nw = lane.width * scaleW;
        const x = lane.x - nw / 2;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = rgba(base, 0.9);
        ctx.shadowBlur = blur;
        if (long) {
          // Nota longa: o corpo mais estreito (o tempo de segurar) e a cabeça cheia embaixo.
          const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
          g.addColorStop(0, rgba(top, 0.55));
          g.addColorStop(1, rgba(bottom, 0.85));
          ctx.fillStyle = g;
          rr(x + nw * 0.18, yTop, nw * 0.64, len, 6);
          ctx.fill();
          const headH = Math.min(len, 20);
          const gh = ctx.createLinearGradient(0, yBottom - headH, 0, yBottom);
          gh.addColorStop(0, rgba(top));
          gh.addColorStop(1, rgba(bottom));
          ctx.fillStyle = gh;
          rr(x, yBottom - headH, nw, headH, 7);
          ctx.fill();
          if (hold === 'segurando') {
            ctx.shadowBlur = 0;
            ctx.fillStyle = rgba(p.white, 0.75);
            ctx.fillRect(lane.x - 1.5, yTop + 4, 3, Math.max(0, len - 8));
          }
        } else {
          const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
          g.addColorStop(0, rgba(top));
          g.addColorStop(1, rgba(bottom));
          ctx.fillStyle = g;
          rr(x, yTop, nw, len, 7);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Brilho no topo da nota.
        ctx.fillStyle = rgba(p.white, 0.35);
        rr(x + 3, yTop + 3, nw - 6, Math.min(4, len - 6), 3);
        ctx.fill();
        if (settingsRef.current.names && lane.width > 15 && res !== 'perdeu') {
          ctx.fillStyle = n.hand === 'l' && !p.light ? rgba(p.ebony, 0.85) : rgba(p.white, 0.95);
          ctx.font = `700 ${lane.width > 24 ? 12 : 10}px Montserrat, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(noteInfo(n.midi).name, lane.x, yBottom - 7);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // ----- feixes que sobem das teclas -----
      for (const [m, b] of beams.current) {
        const holding = keyLight.get(m)?.a === 1;
        const held = heldRef.current.has(m);
        b.s = holding ? Math.max(b.s, 0.85) : held ? Math.max(b.s * 0.94, 0.3) : b.s * 0.88;
        if (b.s < 0.02) {
          beams.current.delete(m);
          continue;
        }
        const lane = laneX(m);
        const reach = hitY * (0.25 + 0.4 * b.s);
        const g = ctx.createLinearGradient(0, hitY, 0, hitY - reach);
        g.addColorStop(0, rgba(b.color, (p.light ? 0.35 : 0.5) * b.s));
        g.addColorStop(1, rgba(b.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(lane.x - lane.width * 0.6, hitY - reach, lane.width * 1.2, reach);
      }

      // ----- linha de acerto (a borda das teclas) -----
      const lineColor = p.light ? p.petrol : p.champagne;
      const band = ctx.createLinearGradient(0, hitY, 0, hitY - 26);
      band.addColorStop(0, rgba(lineColor, (p.light ? 0.16 : 0.2) + glow * 0.2));
      band.addColorStop(1, rgba(lineColor, 0));
      ctx.fillStyle = band;
      ctx.fillRect(0, hitY - 26, w, 26);
      ctx.shadowColor = rgba(lineColor, 1);
      ctx.shadowBlur = 10 + glow * 16;
      ctx.fillStyle = rgba(lineColor, 0.9);
      ctx.fillRect(0, hitY - 2, w, 2);
      ctx.shadowBlur = 0;

      // ----- teclado -----
      const kbTop = hitY;
      ctx.fillStyle = rgba(p.ebony);
      ctx.fillRect(0, kbTop, w, kbH);
      const keyFill = (m: Midi, x: number, y: number, kw: number, kh: number, black: boolean) => {
        const pressed = heldRef.current.has(m);
        const lit = keyLight.get(m);
        const radius = black ? [0, 0, 4, 4] : [0, 0, 7, 7];
        const g = ctx.createLinearGradient(0, y, 0, y + kh);
        if (pressed && lit) {
          g.addColorStop(0, rgba(mix(lit.color, p.white, 0.45)));
          g.addColorStop(1, rgba(lit.color));
        } else if (pressed) {
          const c = black ? mix(p.ebony, p.khaki, 0.45) : mix(p.champagne, p.khaki, 0.55);
          g.addColorStop(0, rgba(mix(c, p.white, 0.15)));
          g.addColorStop(1, rgba(c));
        } else if (black) {
          g.addColorStop(0, rgba(mix(p.ebony, p.white, 0.2)));
          g.addColorStop(0.85, rgba(p.ebony));
          g.addColorStop(1, rgba(mix(p.ebony, p.white, 0.12)));
        } else {
          g.addColorStop(0, rgba(p.white));
          g.addColorStop(0.8, rgba(mix(p.white, p.champagne, 0.45)));
          g.addColorStop(1, rgba(mix(p.white, p.khaki, 0.5)));
        }
        ctx.fillStyle = g;
        rr(x, y, kw, kh, radius);
        ctx.fill();
        // Nota chegando sem tecla apertada: a tecla já acende na cor dela.
        if (lit && !pressed) {
          const gl = ctx.createLinearGradient(0, y, 0, y + kh);
          gl.addColorStop(0, rgba(lit.color, 0.85 * lit.a));
          gl.addColorStop(1, rgba(lit.color, 0.15 * lit.a));
          ctx.fillStyle = gl;
          rr(x, y, kw, kh, radius);
          ctx.fill();
        }
      };
      whites.forEach((m, i) => {
        const pressed = heldRef.current.has(m);
        keyFill(m, i * ww + 1, kbTop + (pressed ? 3 : 0), ww - 2, kbH - 4 - (pressed ? 3 : 0), false);
        if (m % 12 === 0 && ww > 14) {
          ctx.fillStyle = rgba(p.ebony, 0.45);
          ctx.font = '600 10px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(noteInfo(m).sci, (i + 0.5) * ww, kbTop + kbH - 14);
        }
      });
      // Sombra do feltro sobre as teclas.
      const felt = ctx.createLinearGradient(0, kbTop, 0, kbTop + 12);
      felt.addColorStop(0, 'rgba(0,0,0,0.45)');
      felt.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = felt;
      ctx.fillRect(0, kbTop, w, 12);
      for (let m = low; m <= high; m++) {
        if (!noteInfo(m).isBlack) continue;
        const lane = laneX(m);
        const bw = ww * 0.6;
        const bh = kbH * 0.62;
        const pressed = heldRef.current.has(m);
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = pressed ? 2 : 6;
        ctx.shadowOffsetY = pressed ? 1 : 3;
        keyFill(m, lane.x - bw / 2, kbTop + (pressed ? 2 : 0), bw, bh, true);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        if (!pressed) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(lane.x - bw / 2 + 2, kbTop + 2, 1.5, bh - 10);
        }
      }

      // ----- partículas e textos -----
      particles.current = particles.current.filter((q) => q.life > 0);
      for (const q of particles.current) {
        q.x += q.vx;
        q.y += q.vy;
        q.vy += 0.13;
        q.life -= 0.022;
        ctx.fillStyle = rgba(q.color, Math.max(0, q.life));
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
        ctx.fill();
      }
      floaters.current = floaters.current.filter((f) => f.life > 0);
      for (const f of floaters.current) {
        f.y -= 0.7;
        f.life -= 0.02;
        ctx.fillStyle = rgba(f.color, Math.max(0, f.life));
        ctx.font = '800 16px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
      }

      if (playing && now - lastHud > 100) {
        lastHud = now;
        const last = chart[chart.length - 1];
        setHud({ score: Math.round(s.score), combo: s.combo, mult, fill: multiplierFill(s.combo), progress: last ? Math.max(0, Math.min(1, t / (last.t + last.dur))) : 0 });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, geom, whites, low, high, finish, windows, maxDur]);

  // Clique ou toque no teclado da tela.
  const keyAt = (e: React.PointerEvent<HTMLCanvasElement>): Midi | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const { kbH, ww } = geom(r.width, r.height);
    const kbTop = r.height - kbH;
    if (y < kbTop) return null;
    if (y < kbTop + kbH * 0.62) {
      for (let m = low; m <= high; m++) {
        if (!noteInfo(m).isBlack) continue;
        const i = whites.indexOf(m - 1);
        if (Math.abs(x - (i + 1) * ww) < ww * 0.3) return m;
      }
    }
    return whites[Math.max(0, Math.min(whites.length - 1, Math.floor(x / ww)))];
  };
  const downKey = useRef<Midi | null>(null);

  const ringSegments = useMemo(() => Array.from({ length: 10 }, (_, k) => {
    const a0 = -Math.PI / 2 + (k / 10) * Math.PI * 2 + 0.08;
    const a1 = -Math.PI / 2 + ((k + 1) / 10) * Math.PI * 2 - 0.08;
    const pt = (a: number) => `${(32 + 27 * Math.cos(a)).toFixed(2)} ${(32 + 27 * Math.sin(a)).toFixed(2)}`;
    return `M ${pt(a0)} A 27 27 0 0 1 ${pt(a1)}`;
  }), []);
  const litSegs = hud.mult >= 4 ? 10 : Math.round(hud.fill * 10);

  return (
    <div className="arcade">
      <header className="arcade__top">
        <button className="focus__icon" type="button" onClick={onClose} aria-label="Fechar o arcade">
          <CloseIcon className="focus__glyph" />
        </button>
        <div className="arcade__titles">
          <span className="arcade__song">{tune.title}</span>
          <span className="arcade__origin">{tune.origin}</span>
        </div>
        <span className={`arcade__diff arcade__diff-${diff}`}>{diffInfo.label}</span>
        {phase !== 'menu' && (
          <button className="button button-secondary button-small arcade__restart" type="button" onClick={start} title="Recomeçar (R)">
            <RestartIcon className="button__icon" />
            <span className="arcade__restartLabel">Recomeçar</span>
          </button>
        )}
      </header>
      <div className="arcade__progress" aria-hidden><span style={{ width: `${hud.progress * 100}%` }} /></div>

      <div className="arcade__stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="arcade__canvas"
          onPointerDown={(e) => {
            const m = keyAt(e);
            if (m === null) return;
            downKey.current = m;
            press(m);
          }}
          onPointerUp={() => {
            if (downKey.current !== null) releaseKey(downKey.current);
            downKey.current = null;
          }}
          onPointerLeave={() => {
            if (downKey.current !== null) releaseKey(downKey.current);
            downKey.current = null;
          }}
        />

        {phase === 'playing' && (
          <div className="arcadeHud" aria-live="off">
            <div className="arcadeHud__score">
              <span className="arcadeHud__label">Pontos</span>
              <strong className="arcadeHud__value">{hud.score.toLocaleString('pt-BR')}</strong>
              <span className="arcadeHud__combo">{hud.combo > 1 ? `${hud.combo} seguidas` : ' '}</span>
            </div>
            <div className={`arcadeHud__mult arcadeHud__mult-x${hud.mult}`}>
              <svg viewBox="0 0 64 64" className="arcadeHud__ring" aria-hidden>
                {ringSegments.map((d, k) => <path key={k} d={d} className={'arcadeHud__seg' + (k < litSegs ? ' arcadeHud__seg-on' : '')} />)}
              </svg>
              <span className="arcadeHud__x" key={hud.mult}>×{hud.mult}</span>
            </div>
          </div>
        )}
        {milestone && <div className="arcade__milestone" key={milestone}><Burst big />{milestone}!</div>}

        {phase === 'menu' && (
          <div className="arcade__overlay">
            <h2 className="arcade__overlayTitle">{tune.title}</h2>
            <div className="chips" role="group" aria-label="Dificuldade">
              {DIFFICULTIES.map((d) => (
                <button key={d.id} type="button" className={'chip' + (diff === d.id ? ' chip-active' : '')} aria-pressed={diff === d.id} onClick={() => setSettings({ ...settings, diff: d.id })}>
                  {d.label}
                </button>
              ))}
            </div>
            <p className="arcade__overlayLead">
              {diff === 'dificil' && !tune.hasBass ? 'A melodia inteira, com menos folga (este MIDI não tem baixo separado).' : diffInfo.hint} Nota longa: segure até o fim para somar pontos.
            </p>
            <div className="chips" role="group" aria-label="Modo e andamento">
              <button type="button" className={'chip' + (!settings.wait ? ' chip-active' : '')} aria-pressed={!settings.wait} onClick={() => setSettings({ ...settings, wait: false })}>No ritmo</button>
              <button type="button" className={'chip' + (settings.wait ? ' chip-active' : '')} aria-pressed={settings.wait} onClick={() => setSettings({ ...settings, wait: true })}>Sem pressa</button>
              <button type="button" className={'chip' + (settings.slow ? ' chip-active' : '')} aria-pressed={settings.slow} onClick={() => setSettings({ ...settings, slow: !settings.slow })}>Devagar</button>
            </div>
            <label className="reading__toggle">
              <input type="checkbox" checked={settings.names} onChange={(e) => setSettings({ ...settings, names: e.target.checked })} />
              Nomes nas notas
            </label>
            {extraMenu}
            <button className="button button-primary" type="button" onClick={start}>Jogar</button>
            <p className="arcade__hint">Ou toque qualquer tecla do piano, ou aperte espaço. R recomeça.{best !== null ? ` Recorde no ${diffInfo.label.toLowerCase()}: ${best.toLocaleString('pt-BR')} pontos.` : ''}</p>
          </div>
        )}

        {phase === 'done' && summary && (
          <div className="arcade__overlay arcade__overlay-done">
            {summary.stars >= 2 && <Burst big />}
            <Stars count={summary.stars} />
            <h2 className="arcade__overlayTitle">{summary.title}</h2>
            <p className="arcade__bigScore">{summary.score.toLocaleString('pt-BR')} pontos{record ? <span className="arcade__record">Recorde!</span> : null}</p>
            <ul className="arcade__stats">
              <li><strong>{Math.round(summary.hits * 100)}%</strong> das notas</li>
              <li><strong>{Math.round(summary.perfect * 100)}%</strong> perfeitas</li>
              <li><strong>{summary.maxCombo}</strong> seguidas no máximo</li>
              {summary.held !== null && <li><strong>{Math.round(summary.held * 100)}%</strong> das longas até o fim</li>}
            </ul>
            <div className="runner__actions">
              <button className="button button-primary" type="button" onClick={start}>Jogar de novo</button>
              <button className="button button-secondary" type="button" onClick={() => setPhase('menu')}>Mudar dificuldade</button>
              <button className="button button-secondary" type="button" onClick={onClose}>Outra música</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
