// Treino de leitura de notas: uma nota por vez na pauta, resposta pelo nome (botões ou qualquer oitava no piano)
// ou pela tecla exata. Errou: a dica conta a partir da nota de referência mais perto. O sorteio insiste nas notas
// fracas, e cada nota guarda seu histórico (tabela `notes`, sincronizada).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type NoteReadStat } from '../db/db';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import { useNoteInput, useNoteOn } from '../input/useNoteInput';
import { saveRun, useRuns } from '../training/runs';
import { formatSeconds } from '../format';
import { Combo, PassReward } from '../celebrate/Celebrate';
import { starsFor, streakOf } from '../celebrate/rewards';
import { Verdict } from '../course/ui/shared';
import type { Midi } from '../music/notes';
import ReadingStaff, { MasteryStaff, type ReadState } from './ReadingStaff';
import {
  LEVELS, LEVEL_PASS, answerMatches, drawRound, hintFor, itemKey, levelOf, plainName, roundPassed, suggestedLevel, updateStat, wherePhrase,
  type AnswerMode, type NoteStat, type ReadItem,
} from './noteReading';

const SETTINGS_KEY = 'fermata-reading';
const NAMES: { name: string; pc: number }[] = [
  { name: 'Dó', pc: 0 }, { name: 'Ré', pc: 2 }, { name: 'Mi', pc: 4 }, { name: 'Fá', pc: 5 }, { name: 'Sol', pc: 7 }, { name: 'Lá', pc: 9 }, { name: 'Si', pc: 11 },
];

interface Settings {
  level: number | null;
  mode: AnswerMode;
  refs: boolean;
}

function readSettings(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>;
    return { level: v.level ?? null, mode: v.mode === 'tecla' ? 'tecla' : 'nome', refs: v.refs ?? true };
  } catch {
    return { level: null, mode: 'nome', refs: true };
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // sem armazenamento: vale só agora
  }
}

export const readRunId = (level: number) => `notas-n${level}`;

/** Níveis já passados (rodada com 90% de primeira e média até 2,5 s). */
export function usePassedLevels(): Set<number> | null {
  const runs = useRuns();
  return useMemo(() => (runs ? new Set(runs.filter((r) => r.treinoId.startsWith('notas-n') && r.passed).map((r) => r.level ?? 0)) : null), [runs]);
}

interface Result {
  item: ReadItem;
  firstTry: boolean;
  ms: number;
}

type Phase = 'idle' | 'playing' | 'done';

export default function NoteReadingTrainer({ count = 20, compact = false, onDone, onProgress }: {
  count?: number;
  /** Dentro do Treino do dia: sem a escolha de nível e sem o mapa grande. */
  compact?: boolean;
  onDone?: (r: { firstTry: number; total: number; avgMs: number | null }) => void;
  /** Para a barra de progresso do modo foco. */
  onProgress?: (done: number, total: number) => void;
}) {
  const { held, press, release } = useNoteInput();
  const passed = usePassedLevels();
  const rows = useLiveQuery(() => db.notes.toArray(), []);
  const stats = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r as NoteStat])), [rows]);
  const [settings, setSettingsState] = useState<Settings>(readSettings);
  const setSettings = (s: Settings) => {
    saveSettings(s);
    setSettingsState(s);
  };
  const levelN = settings.level ?? (passed ? suggestedLevel(passed) : 1);
  const level = levelOf(levelN);

  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState<ReadItem[]>([]);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lastWrong, setLastWrong] = useState<Midi | null>(null);
  const [flash, setFlash] = useState<ReadState>('ask');
  const [results, setResults] = useState<Result[]>([]);
  const shownAt = useRef(0);
  const lock = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const item = round[index] as ReadItem | undefined;

  const start = useCallback(() => {
    const r = drawRound(level.items, stats, count, Math.random);
    setRound(r);
    setIndex(0);
    setMisses(0);
    setLastWrong(null);
    setFlash('ask');
    setResults([]);
    setPhase('playing');
    lock.current = false;
    shownAt.current = performance.now();
    onProgress?.(0, r.length);
  }, [level, stats, count, onProgress]);

  const finish = useCallback((all: Result[]) => {
    const firstTry = all.filter((r) => r.firstTry).length;
    const ok = all.filter((r) => r.firstTry);
    const avgMs = ok.length ? ok.reduce((s, r) => s + r.ms, 0) / ok.length : null;
    const summary = { firstTry, total: all.length, avgMs };
    void saveRun({ treinoId: readRunId(levelN), kind: 'names', accuracy: firstTry / Math.max(1, all.length), firstTry, avgMs: avgMs ?? undefined, passed: roundPassed(summary), level: levelN });
    setPhase('done');
    doneRef.current?.(summary);
  }, [levelN]);

  const answer = useCallback((played: Midi, at = performance.now()) => {
    if (phase !== 'playing' || !item || lock.current) return;
    if (!answerMatches(item, played, settings.mode)) {
      setMisses((m) => m + 1);
      setLastWrong(played);
      setFlash('miss');
      return;
    }
    lock.current = true;
    const ms = Math.max(0, at - shownAt.current);
    const firstTry = misses === 0;
    const r: Result = { item, firstTry, ms };
    const all = [...results, r];
    setResults(all);
    setFlash('hit');
    const key = itemKey(item);
    const prev = stats.get(key);
    const next = updateStat(prev, firstTry, ms, Date.now());
    const row: NoteReadStat = { id: key, clef: item.clef, midi: item.midi, ...next };
    void db.notes.put(row).catch((err) => console.error('[Fermata] Não foi possível salvar a nota', err));
    onProgress?.(all.length, round.length);
    window.setTimeout(() => {
      if (index + 1 >= round.length) {
        finish(all);
        return;
      }
      setIndex(index + 1);
      setMisses(0);
      setLastWrong(null);
      setFlash('ask');
      lock.current = false;
      shownAt.current = performance.now();
    }, firstTry ? 420 : 900);
  }, [phase, item, settings.mode, misses, results, stats, index, round.length, finish, onProgress]);

  // Piano: no meio da rodada responde; parado, qualquer tecla começa.
  useNoteOn((m, at) => {
    if (phase === 'playing') answer(m, at);
    else start();
  });

  // Barra de espaço ou Enter começam (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'BUTTON')) return;
      if ((e.key === ' ' || e.key === 'Enter') && phase !== 'playing') {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start]);

  const streak = streakOf(results.map((r) => r.firstTry));
  const firstTry = results.filter((r) => r.firstTry).length;
  const okTimes = results.filter((r) => r.firstTry);
  const avgMs = okTimes.length ? okTimes.reduce((s, r) => s + r.ms, 0) / okTimes.length : null;
  const summary = { firstTry, total: results.length, avgMs };
  const passedNow = phase === 'done' && roundPassed(summary);
  const nextLevel = LEVELS.find((l) => l.n === levelN + 1);

  // Teclado (modo tecla): da menor à maior nota do nível, em oitavas inteiras.
  const midis = level.items.map((i) => i.midi);
  const low = Math.min(...midis) - (Math.min(...midis) % 12);
  const hiRaw = Math.max(...midis);
  const high = hiRaw + ((12 - (hiRaw % 12)) % 12);
  const marks: Partial<Record<Midi, KeyMark>> = {};
  if (item && misses >= 2) marks[item.midi] = 'next';
  if (lastWrong !== null && flash === 'miss') marks[lastWrong] = 'miss';

  const clefs = [...new Set(level.items.map((i) => i.clef))];

  return (
    <div className={'reading' + (compact ? ' reading-compact' : '')}>
      {phase !== 'playing' && !compact && (
        <div className="reading__setup">
          <label className="reading__field">
            <span className="reading__label">Nível</span>
            <select className="reading__select" value={levelN} onChange={(e) => setSettings({ ...settings, level: Number(e.target.value) })}>
              {LEVELS.map((l) => (
                <option key={l.n} value={l.n}>
                  {l.n}. {l.title}{passed?.has(l.n) ? ' (feito)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="chips" role="group" aria-label="Como responder">
            <button type="button" className={'chip' + (settings.mode === 'nome' ? ' chip-active' : '')} aria-pressed={settings.mode === 'nome'} onClick={() => setSettings({ ...settings, mode: 'nome' })}>Pelo nome</button>
            <button type="button" className={'chip' + (settings.mode === 'tecla' ? ' chip-active' : '')} aria-pressed={settings.mode === 'tecla'} onClick={() => setSettings({ ...settings, mode: 'tecla' })}>Na tecla certa</button>
          </div>
          <label className="reading__toggle">
            <input type="checkbox" checked={settings.refs} onChange={(e) => setSettings({ ...settings, refs: e.target.checked })} />
            Mostrar as notas de referência
          </label>
        </div>
      )}

      {phase === 'idle' && (
        <div className="reading__intro">
          <p className="reading__level">Nível {level.n} · {level.title}</p>
          <p className="reading__focus">{level.focus}</p>
          {!compact && clefs.map((c) => <MasteryStaff key={c} items={level.items} stats={stats} clef={c} />)}
          {!compact && <MasteryLegend />}
          <button className="button button-primary" type="button" onClick={start}>Começar</button>
          <p className="reading__hint">Ou toque qualquer tecla do piano, ou aperte espaço.</p>
        </div>
      )}

      {phase === 'playing' && item && (
        <div className="reading__play">
          <div className="reading__head">
            <span className="runner__count">{index + 1} de {round.length}</span>
            <Combo streak={streak} />
          </div>
          <div className={'reading__card reading__card-' + flash}>
            <ReadingStaff item={item} state={flash} refs={settings.refs} label={`Nota na clave de ${item.clef === 'bass' ? 'fá' : 'sol'}`} />
          </div>
          <div className="reading__feedback" aria-live="polite">
            {flash === 'hit' ? (
              <Verdict tone="hit">{plainName(item.midi)}, {wherePhrase(item.midi, item.clef)}</Verdict>
            ) : flash === 'miss' ? (
              <>
                <Verdict tone="miss">
                  {settings.mode === 'tecla' && lastWrong !== null && lastWrong % 12 === item.midi % 12 ? 'Nome certo, oitava errada.' : 'Não é essa.'} Procure de novo.
                </Verdict>
                <p className="reading__tip">{hintFor(item.midi, item.clef)}</p>
              </>
            ) : (
              <p className="reading__ask">{settings.mode === 'nome' ? 'Que nota é essa?' : 'Toque esta nota no piano.'}</p>
            )}
          </div>
          {settings.mode === 'nome' ? (
            <div className="reading__names" role="group" aria-label="Nome da nota">
              {NAMES.map((n) => (
                <button
                  key={n.pc}
                  type="button"
                  className={'reading__name' + (misses >= 2 && item.midi % 12 === n.pc ? ' reading__name-reveal' : '') + (flash === 'miss' && lastWrong !== null && lastWrong % 12 === n.pc ? ' reading__name-wrong' : '') + (flash === 'hit' && item.midi % 12 === n.pc ? ' reading__name-hit' : '')}
                  onClick={() => answer(60 + n.pc)}
                >
                  {n.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="runner__keys">
              <PianoKeyboard low={low} high={high} marks={marks} pressed={held} onPress={press} onRelease={release} label="Teclado" />
            </div>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="reading__done">
          {passedNow ? (
            <PassReward stars={starsFor(firstTry / Math.max(1, results.length), LEVEL_PASS.share) || 1}>
              <p className="passReward__text">
                {firstTry} de {results.length} de primeira{avgMs !== null ? ` · média ${formatSeconds(avgMs)}` : ''}. Nível {level.n} feito.
              </p>
            </PassReward>
          ) : (
            <Verdict tone="miss">
              {firstTry} de {results.length} de primeira{avgMs !== null ? ` · média ${formatSeconds(avgMs)}` : ''}. Para passar: {Math.round(LEVEL_PASS.share * 100)}% de primeira e média até {formatSeconds(LEVEL_PASS.avgMs)}.
            </Verdict>
          )}
          {!compact && clefs.map((c) => <MasteryStaff key={c} items={level.items} stats={stats} clef={c} />)}
          {!compact && <MasteryLegend />}
          <div className="runner__actions">
            <button className="button button-primary" type="button" onClick={start}>De novo</button>
            {passedNow && nextLevel && !compact && (
              <button className="button button-secondary" type="button" onClick={() => { setSettings({ ...settings, level: nextLevel.n }); setPhase('idle'); }}>
                Próximo nível: {nextLevel.title}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MasteryLegend() {
  return (
    <ul className="reading__legend">
      <li><span className="reading__dot reading__dot-forte" />Já sabe</li>
      <li><span className="reading__dot reading__dot-aprendendo" />Aprendendo</li>
      <li><span className="reading__dot reading__dot-fraca" />Precisa de treino</li>
      <li><span className="reading__dot reading__dot-nova" />Ainda não viu</li>
    </ul>
  );
}
