// O jogo: notas caindo até a linha, teclado embaixo, partículas no acerto e um brilho que cresce com o combo.
// Desenho em canvas (60 quadros por segundo sem pesar o React); placar e telas por cima, em HTML.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { CloseIcon } from '../components/Icons';
import { useNoteInput } from '../input/useNoteInput';
import { getLatency, scheduleTrack, type ScheduledTrack } from '../training/clickTrack';
import { saveRun, useRuns } from '../training/runs';
import { noteInfo, whiteKeysBetween, type Midi } from '../music/notes';
import { Burst, Stars } from '../celebrate/Celebrate';
import { playReward } from '../celebrate/sound';
import {
  buildChart, chartRange, comboMilestone, expire, hit, multiplier, startState, summarize, waitingAt,
  type ArcadeGrade, type ArcadeState, type ArcadeSummary,
} from './arcade';
import type { ArcadeSong } from './songs';

const SETTINGS_KEY = 'fermata-arcade';
/** Tempo que a nota leva do alto da tela até a linha. */
const LEAD = 2600;

interface Settings {
  wait: boolean;
  slow: boolean;
  names: boolean;
}

function readSettings(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>;
    return { wait: !!v.wait, slow: v.slow ?? true, names: v.names ?? true };
  } catch {
    return { wait: false, slow: true, names: true };
  }
}

type Phase = 'menu' | 'playing' | 'done';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
interface Floater { x: number; y: number; text: string; life: number; color: string }

export const arcadeRunId = (id: string) => `arcade-${id}`;

export default function ArcadeGame({ song, onClose }: { song: ArcadeSong; onClose: () => void }) {
  const { subscribe, press, release } = useNoteInput();
  const runs = useRuns();
  const best = useMemo(() => {
    const mine = (runs ?? []).filter((r) => r.treinoId === arcadeRunId(song.id));
    return mine.length ? Math.max(...mine.map((r) => r.score ?? 0)) : null;
  }, [runs, song.id]);
  const [settings, setSettingsState] = useState<Settings>(readSettings);
  const setSettings = (s: Settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      // vale só agora
    }
    setSettingsState(s);
  };
  const speed = settings.slow ? 0.75 : 1;
  const chart = useMemo(() => buildChart(song, speed), [song, speed]);
  const [low, high] = useMemo(() => chartRange(chart), [chart]);

  const [phase, setPhaseState] = useState<Phase>('menu');
  const phaseRef = useRef<Phase>('menu');
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const [hud, setHud] = useState({ score: 0, combo: 0, mult: 1, progress: 0 });
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
  const glowRef = useRef(0);
  const endedAt = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const bestRef = useRef(best);
  bestRef.current = best;

  // ---------- geometria do teclado ----------
  const whites = useMemo(() => whiteKeysBetween(low, high), [low, high]);
  const geom = useCallback((w: number, h: number) => {
    const kbH = Math.min(150, Math.max(90, h * 0.2));
    const ww = w / whites.length;
    const hitY = h - kbH - 4;
    const laneX = (m: Midi): { x: number; width: number; black: boolean } => {
      const black = noteInfo(m).isBlack;
      if (!black) {
        const i = whites.indexOf(m);
        return { x: (i + 0.5) * ww, width: ww * 0.72, black };
      }
      const i = whites.indexOf(m - 1);
      return { x: (i + 1) * ww, width: ww * 0.5, black };
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
    offsetRef.current = 0;
    glowRef.current = 0;
    setSummary(null);
    setRecord(false);
    setMilestone(null);
    setHud({ score: 0, combo: 0, mult: 1, progress: 0 });
    const beatMs = 60000 / (song.bpm * speed);
    const leadBeats = Math.ceil((LEAD + 400) / beatMs);
    const total = chart.length ? Math.ceil((chart[chart.length - 1].t + chart[chart.length - 1].dur) / beatMs) : 0;
    // No ritmo: o clique do metrônomo marca o pulso e é o relógio. Sem pressa: sem clique (a música para e espera).
    const track = settingsRef.current.wait ? null : scheduleTrack({ bpm: song.bpm * speed, countIn: leadBeats, beats: total, beatsPerBar: song.beatsPerBar, volume: 0.35 });
    trackRef.current = track;
    startRef.current = track ? track.firstBeat : performance.now() + LEAD + 400;
    setPhase('playing');
  }, [chart, song, speed]);

  const finish = useCallback(() => {
    trackRef.current?.cancel();
    trackRef.current = null;
    const s = summarize(stateRef.current);
    setSummary(s);
    const isRecord = bestRef.current === null || s.score > bestRef.current;
    setRecord(isRecord && s.score > 0);
    void saveRun({ treinoId: arcadeRunId(song.id), kind: 'timed', accuracy: s.hits, score: s.score, passed: s.stars > 0, bpm: Math.round(song.bpm * speed) });
    if (s.stars >= 2) playReward(s.stars === 3 ? 'great' : 'pass');
    endedAt.current = performance.now();
    setPhase('done');
  }, [song, speed]);

  useEffect(() => () => trackRef.current?.cancel(), []);

  /** Tempo da música agora (ms desde a primeira nota), já com as esperas do modo sem pressa. */
  const songTime = (now: number) => now - startRef.current - offsetRef.current;

  // ---------- entrada ----------
  const onKeyHit = useCallback((midi: Midi, at: number) => {
    const t = songTime(at) - (getLatency() ?? 0);
    const prev = stateRef.current;
    const r = hit(chart, prev, midi, t);
    stateRef.current = r.state;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { hitY, laneX } = geom(canvas.clientWidth, canvas.clientHeight);
    const lane = laneX(midi);
    if (r.index !== null && r.grade) {
      flashRef.current.set(r.index, performance.now());
      spark(lane.x, hitY, r.grade);
      const m = comboMilestone(prev.combo, r.state.combo);
      if (m) {
        setMilestone(m);
        glowRef.current = 1;
        window.setTimeout(() => setMilestone((cur) => (cur === m ? null : cur)), 1400);
      }
    }
    setHud((h) => ({ ...h, score: r.state.score, combo: r.state.combo, mult: multiplier(r.state.combo) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, geom]);

  const colorsRef = useRef<Record<string, string>>({});
  const readColors = useCallback(() => {
    const cs = getComputedStyle(document.documentElement);
    const get = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
    colorsRef.current = {
      petrol: get('--color-petrol', '#2f6a73'),
      champagne: get('--color-champagne', '#f1e2c8'),
      blush: get('--color-blush', '#e07a8f'),
      khaki: get('--color-khaki', '#c3b091'),
      ebony: get('--color-ebony', '#1c1d21'),
      offwhite: get('--color-off-white', '#f8f5ee'),
      light: document.documentElement.dataset.theme === 'light' ? '1' : '0',
    };
  }, []);

  function spark(x: number, y: number, grade: ArcadeGrade) {
    const c = colorsRef.current;
    const light = c.light === '1';
    const color = grade === 'perfeito' ? (light ? c.petrol : c.champagne) : grade === 'bom' ? (light ? c.khaki : c.petrol) : c.khaki;
    const n = grade === 'perfeito' ? 18 : 10;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const v = 1.5 + Math.random() * (grade === 'perfeito' ? 4.5 : 3);
      particles.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color, size: 1.5 + Math.random() * 2.5 });
    }
    floaters.current.push({ x, y: y - 18, text: grade === 'perfeito' ? 'Perfeito!' : grade === 'bom' ? 'Bom' : 'Ok', life: 1, color });
  }

  useEffect(() => subscribe((e) => {
    if (e.type === 'off') {
      heldRef.current.delete(e.midi);
      return;
    }
    heldRef.current.add(e.midi);
    if (phaseRef.current === 'playing') onKeyHit(e.midi, e.at);
    else if (performance.now() - endedAt.current > 1500) start();
  }), [subscribe, onKeyHit, start]);

  // Espaço: começa (no menu e no resultado) ou para (no meio). Esc fecha (pela moldura).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'BUTTON')) return;
      if (e.key !== ' ') return;
      e.preventDefault();
      if (phaseRef.current === 'playing') {
        trackRef.current?.cancel();
        setPhase('menu');
      } else start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start]);

  // ---------- desenho ----------
  useEffect(() => {
    readColors();
    const obs = new MutationObserver(readColors);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [readColors]);

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

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
    };

    const frame = () => {
      const now = performance.now();
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const c = colorsRef.current;
      const light = c.light === '1';
      const { kbH, ww, hitY, laneX } = geom(w, h);
      ctx.clearRect(0, 0, w, h);

      let t = -Infinity;
      if (phaseRef.current === 'playing') {
        t = songTime(now);
        if (settingsRef.current.wait) {
          const waitT = waitingAt(chart, stateRef.current, t);
          if (waitT !== null && t > waitT) {
            offsetRef.current += t - waitT;
            t = waitT;
          }
        } else {
          stateRef.current = expire(chart, stateRef.current, t - (getLatency() ?? 0));
        }
        const last = chart[chart.length - 1];
        if (last && t > last.t + last.dur + 900 && stateRef.current.results.every((r) => r !== null)) {
          finish();
        } else if (last && !settingsRef.current.wait && t > last.t + last.dur + 1500) {
          finish();
        }
      }

      // Fundo: faixas de cada Dó e o brilho do combo.
      const mult = multiplier(stateRef.current.combo);
      glowRef.current = Math.max(0, glowRef.current - 0.012);
      const glow = Math.min(1, (mult - 1) / 3 * 0.6 + glowRef.current * 0.5);
      if (glow > 0.01) {
        const g = ctx.createLinearGradient(0, hitY, 0, 0);
        g.addColorStop(0, c.petrol);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = glow * (light ? 0.25 : 0.35);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, hitY);
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = light ? 0.08 : 0.07;
      ctx.fillStyle = light ? c.ebony : c.offwhite;
      whites.forEach((m, i) => {
        if (m % 12 === 0) ctx.fillRect(i * ww, 0, 1, hitY);
      });
      ctx.globalAlpha = 1;

      // Notas caindo.
      chart.forEach((n, i) => {
        if (t === -Infinity) return;
        const yBottom = hitY - ((n.t - t) / LEAD) * hitY;
        const len = Math.max(12, (n.dur / LEAD) * hitY - 4);
        const yTop = yBottom - len;
        if (yTop > hitY + 40 || yBottom < -10) return;
        const lane = laneX(n.midi);
        const res = stateRef.current.results[i];
        const flash = flashRef.current.get(i);
        if (res === 'perdeu') ctx.globalAlpha = 0.25;
        else if (res && flash) ctx.globalAlpha = Math.max(0, 1 - (now - flash) / 260);
        if (ctx.globalAlpha <= 0) {
          ctx.globalAlpha = 1;
          return;
        }
        const color = res === 'perdeu' ? c.blush : lane.black ? c.khaki : c.petrol;
        ctx.shadowColor = color;
        ctx.shadowBlur = res ? 0 : 14;
        ctx.fillStyle = color;
        roundRect(lane.x - lane.width / 2, yTop, lane.width, len, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Brilho no topo da nota.
        ctx.globalAlpha *= 0.35;
        ctx.fillStyle = c.offwhite;
        roundRect(lane.x - lane.width / 2 + 3, yTop + 3, lane.width - 6, Math.min(6, len - 6), 4);
        ctx.fill();
        ctx.globalAlpha = res === 'perdeu' ? 0.25 : 1;
        if (settingsRef.current.names && len > 22 && lane.width > 18) {
          ctx.fillStyle = c.offwhite;
          ctx.font = '600 12px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(noteInfo(n.midi).name, lane.x, yBottom - 8);
        }
        ctx.globalAlpha = 1;
      });

      // Linha de acerto.
      const lineColor = light ? c.petrol : c.champagne;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 8 + glow * 18;
      ctx.fillStyle = lineColor;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, hitY - 1.5, w, 3);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Teclado.
      const kbTop = h - kbH;
      ctx.fillStyle = c.ebony;
      ctx.fillRect(0, kbTop - 2, w, kbH + 2);
      // Teclas que têm nota chegando agora (na linha): acendem de leve.
      const due = new Set<Midi>();
      chart.forEach((n, i) => {
        if (stateRef.current.results[i] === null && Math.abs(n.t - t) < 260) due.add(n.midi);
      });
      whites.forEach((m, i) => {
        const pressedKey = heldRef.current.has(m);
        ctx.fillStyle = pressedKey ? c.petrol : c.champagne;
        roundRect(i * ww + 1, kbTop, ww - 2, kbH - 4, 5);
        ctx.fill();
        if (due.has(m) && !pressedKey) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = c.petrol;
          roundRect(i * ww + 1, kbTop, ww - 2, kbH - 4, 5);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (m % 12 === 0) {
          ctx.fillStyle = pressedKey ? c.offwhite : c.ebony;
          ctx.globalAlpha = 0.55;
          ctx.font = '600 10px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(noteInfo(m).sci, (i + 0.5) * ww, kbTop + kbH - 12);
          ctx.globalAlpha = 1;
        }
      });
      for (let m = low; m <= high; m++) {
        if (!noteInfo(m).isBlack) continue;
        const lane = laneX(m);
        const bw = ww * 0.6;
        const pressedKey = heldRef.current.has(m);
        ctx.fillStyle = pressedKey ? c.petrol : due.has(m) ? c.khaki : c.ebony;
        roundRect(lane.x - bw / 2, kbTop, bw, kbH * 0.6, 4);
        ctx.fill();
      }

      // Partículas e textos.
      particles.current = particles.current.filter((p) => p.life > 0);
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= 0.022;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      floaters.current = floaters.current.filter((f) => f.life > 0);
      for (const f of floaters.current) {
        f.y -= 0.6;
        f.life -= 0.02;
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.fillStyle = f.color;
        ctx.font = '700 14px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;

      if (phaseRef.current === 'playing' && now - lastHud > 120) {
        lastHud = now;
        const last = chart[chart.length - 1];
        const s = stateRef.current;
        setHud({ score: s.score, combo: s.combo, mult: multiplier(s.combo), progress: last ? Math.max(0, Math.min(1, t / (last.t + last.dur))) : 0 });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, geom, whites, low, high, finish]);

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
    if (y < kbTop + kbH * 0.6) {
      for (let m = low; m <= high; m++) {
        if (!noteInfo(m).isBlack) continue;
        const i = whites.indexOf(m - 1);
        if (Math.abs(x - (i + 1) * ww) < ww * 0.3) return m;
      }
    }
    return whites[Math.max(0, Math.min(whites.length - 1, Math.floor(x / ww)))];
  };
  const downKey = useRef<Midi | null>(null);

  return (
    <div className="arcade">
      <header className="arcade__top">
        <button className="focus__icon" type="button" onClick={onClose} aria-label="Fechar o arcade">
          <CloseIcon className="focus__glyph" />
        </button>
        <div className="arcade__titles">
          <span className="arcade__song">{song.title}</span>
          <span className="arcade__origin">{song.origin}</span>
        </div>
        <div className="arcade__hud" aria-live="off">
          <span className="arcade__score">{hud.score.toLocaleString('pt-BR')}</span>
          <span className={'arcade__combo' + (hud.mult > 1 ? ' arcade__combo-hot' : '')}>
            {hud.combo > 1 ? `${hud.combo} seguidas` : ' '}{hud.mult > 1 ? ` · ×${hud.mult}` : ''}
          </span>
        </div>
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
            if (downKey.current !== null) release(downKey.current);
            downKey.current = null;
          }}
          onPointerLeave={() => {
            if (downKey.current !== null) release(downKey.current);
            downKey.current = null;
          }}
        />
        {milestone && <div className="arcade__milestone" key={milestone}><Burst big />{milestone}!</div>}

        {phase === 'menu' && (
          <div className="arcade__overlay">
            <h2 className="arcade__overlayTitle">{song.title}</h2>
            <p className="arcade__overlayLead">As notas caem até a linha: toque quando chegarem. Sem nota mínima, é só para se divertir.</p>
            <div className="chips" role="group" aria-label="Modo">
              <button type="button" className={'chip' + (!settings.wait ? ' chip-active' : '')} aria-pressed={!settings.wait} onClick={() => setSettings({ ...settings, wait: false })}>No ritmo</button>
              <button type="button" className={'chip' + (settings.wait ? ' chip-active' : '')} aria-pressed={settings.wait} onClick={() => setSettings({ ...settings, wait: true })}>Sem pressa (a música espera você)</button>
            </div>
            <div className="chips" role="group" aria-label="Andamento">
              <button type="button" className={'chip' + (settings.slow ? ' chip-active' : '')} aria-pressed={settings.slow} onClick={() => setSettings({ ...settings, slow: true })}>Devagar</button>
              <button type="button" className={'chip' + (!settings.slow ? ' chip-active' : '')} aria-pressed={!settings.slow} onClick={() => setSettings({ ...settings, slow: false })}>Andamento normal</button>
            </div>
            <label className="reading__toggle">
              <input type="checkbox" checked={settings.names} onChange={(e) => setSettings({ ...settings, names: e.target.checked })} />
              Nomes nas notas
            </label>
            <button className="button button-primary" type="button" onClick={start}>Jogar</button>
            <p className="arcade__hint">Ou toque qualquer tecla do piano, ou aperte espaço.{best !== null ? ` Seu recorde: ${best.toLocaleString('pt-BR')} pontos.` : ''}</p>
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
            </ul>
            <div className="runner__actions">
              <button className="button button-primary" type="button" onClick={start}>Jogar de novo</button>
              <button className="button button-secondary" type="button" onClick={onClose}>Outra música</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
