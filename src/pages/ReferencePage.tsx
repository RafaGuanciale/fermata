// Consulta: tudo o que o curso ensina, para olhar e tentar no piano a qualquer hora.
// Cada seção guarda a escolha na URL (/consulta/acordes?raiz=F%23&tipo=m7), então dá para linkar de uma lição.

import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PianoKeyboard, { type KeyMark } from '../components/PianoKeyboard';
import Staff from '../components/Staff';
import { PlayIcon, SearchIcon } from '../components/Icons';
import { useElementWidth } from '../hooks/useFullscreen';
import { useNoteInput } from '../input/useNoteInput';
import { noteInfo, type Midi } from '../music/notes';
import { UNITS } from '../course';
import { playListen, Verdict } from '../course/ui/shared';
import type { Listen } from '../course/types';
import {
  CHORD_TYPES, CIRCLE, CLEF_TIPS, FIGURES, INTERVALS, MAJOR_FINGERING, METERS, PROGRESSIONS, ROOTS, SCALE_TYPES, TERMS,
  chordInfo, harmonicField, identifyChord, intervalName, parseSymbol, pretty, rootPt, scaleInfo, signatureText, type Root,
} from '../reference/data';

const SECTIONS = [
  { id: 'acordes', label: 'Acordes' },
  { id: 'escalas', label: 'Escalas' },
  { id: 'campo', label: 'Campo harmônico' },
  { id: 'intervalos', label: 'Intervalos' },
  { id: 'notas', label: 'Notas e claves' },
  { id: 'ritmo', label: 'Ritmo' },
  { id: 'circulo', label: 'Círculo de quintas' },
  { id: 'termos', label: 'Termos' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

/** Em que unidade do curso cada assunto é ensinado (para o link "Onde estudar"). */
const WHERE: Record<SectionId, number> = { acordes: 3, escalas: 4, campo: 7, intervalos: 2, notas: 2, ritmo: 1, circulo: 4, termos: 1 };

function useSound() {
  const [stop, setStop] = useState<(() => void) | null>(null);
  return (l: Listen) => {
    stop?.();
    setStop(() => playListen(l).stop);
  };
}

const block = (midis: Midi[], beats = 3): Listen => ({ bpm: 80, steps: [{ midis, beats }] });
const arpeg = (midis: Midi[]): Listen => ({ bpm: 132, steps: [...midis.map((m) => ({ midis: [m], beats: 1 })), { midis, beats: 3 }] });
const updown = (midis: Midi[]): Listen => ({ bpm: 120, steps: [...midis, ...midis.slice(0, -1).reverse()].map((m, i, a) => ({ midis: [m], beats: i === a.length - 1 ? 2 : 1 })) });

function rangeFor(midis: Midi[]): [Midi, Midi] {
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  let low = lo - (lo % 12);
  let high = hi + ((12 - (hi % 12)) % 12);
  if (high - low < 24) high = low + 24;
  if (high > 108) {
    high = 108;
    low = Math.min(low, 84);
  }
  return [low, high];
}

export default function ReferencePage() {
  const { secao = 'acordes' } = useParams();
  const section = (SECTIONS.find((s) => s.id === secao)?.id ?? 'acordes') as SectionId;
  const unit = UNITS.find((u) => u.n === WHERE[section]);

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Para olhar e tentar no piano</span>
        <h1 className="page__title">Consulta</h1>
      </header>

      <Search />

      <nav className="refTabs" aria-label="Seções da consulta">
        {SECTIONS.map((s) => (
          <NavLink key={s.id} to={`/consulta/${s.id}`} className={({ isActive }) => 'chip' + (isActive || (s.id === 'acordes' && !secao) ? ' chip-active' : '')}>
            {s.label}
          </NavLink>
        ))}
      </nav>

      <section className="ref">
        {section === 'acordes' && <Chords />}
        {section === 'escalas' && <Scales />}
        {section === 'campo' && <Field />}
        {section === 'intervalos' && <Intervals />}
        {section === 'notas' && <Notes />}
        {section === 'ritmo' && <Rhythm />}
        {section === 'circulo' && <Circle />}
        {section === 'termos' && <Terms />}
      </section>

      {unit && (
        <p className="page__link">
          Onde estudar com calma: <Link to={`/estudo/unidade/${unit.n}`}>Unidade {unit.n}, {unit.title}</Link>
        </p>
      )}
    </>
  );
}

// ---------- busca ----------

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PT_ROOT: Record<string, string> = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' };

/** "ré maior", "fa# menor", "sol" → "D", "F#"… */
function ptRoot(q: string): string | null {
  const m = /^(do|re|mi|fa|sol|la|si)\s*(#|sustenido|b|bemol)?\b/.exec(fold(q).replace('♯', '#').replace('♭', 'b'));
  if (!m) return null;
  return PT_ROOT[m[1]] + (m[2] === '#' || m[2] === 'sustenido' ? '#' : m[2] === 'b' || m[2] === 'bemol' ? 'b' : '');
}

function Search() {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const query = q.trim();
    if (query.length < 2) return [];
    const out: { label: string; to: string; kind: string }[] = [];
    const chord = parseSymbol(query);
    if (chord) out.push({ kind: 'Acorde', label: pretty(chordInfo(chord.root, chord.suffix, chord.inversion).symbol), to: `/consulta/acordes?raiz=${encodeURIComponent(chord.root)}&tipo=${encodeURIComponent(chord.suffix)}&inv=${chord.inversion}` });
    const root = ptRoot(query);
    const f = fold(query);
    if (root) {
      const minor = f.includes('menor');
      out.push({ kind: 'Escala', label: `${rootPt(root)} ${minor ? 'menor' : 'maior'}`, to: `/consulta/escalas?raiz=${encodeURIComponent(root)}&tipo=${minor ? 'menor' : 'maior'}` });
      out.push({ kind: 'Acorde', label: `${rootPt(root)} ${minor ? 'menor' : 'maior'}`, to: `/consulta/acordes?raiz=${encodeURIComponent(root)}&tipo=${minor ? 'm' : ''}` });
      out.push({ kind: 'Campo harmônico', label: `${rootPt(root)} ${minor ? 'menor' : 'maior'}`, to: `/consulta/campo?raiz=${encodeURIComponent(root)}&modo=${minor ? 'menor' : 'maior'}` });
    }
    for (const s of SCALE_TYPES) if (fold(s.name).includes(f)) out.push({ kind: 'Escala', label: `${s.name} (em Dó)`, to: `/consulta/escalas?raiz=C&tipo=${s.id}` });
    for (const c of CHORD_TYPES) if (fold(c.name).includes(f)) out.push({ kind: 'Acorde', label: `${c.name} (em Dó)`, to: `/consulta/acordes?raiz=C&tipo=${encodeURIComponent(c.suffix)}` });
    for (const t of TERMS) if (fold(t.term).includes(f) || fold(t.meaning).includes(f)) out.push({ kind: 'Termo', label: t.term, to: `/consulta/termos?q=${encodeURIComponent(t.term)}` });
    for (const s of SECTIONS) if (fold(s.label).includes(f)) out.push({ kind: 'Seção', label: s.label, to: `/consulta/${s.id}` });
    for (const u of UNITS) for (const l of u.lessons) if (fold(l.title).includes(f)) out.push({ kind: `Lição ${l.n}`, label: l.title, to: `/estudo/unidade/${u.n}/${l.id}` });
    const seen = new Set<string>();
    return out.filter((r) => (seen.has(r.to) ? false : (seen.add(r.to), true))).slice(0, 10);
  }, [q]);

  return (
    <div className="refSearch">
      <label className="refSearch__box">
        <SearchIcon className="refSearch__icon" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque uma cifra (F#m7, C/E), um tom (ré maior) ou um termo (staccato)" aria-label="Buscar na consulta" />
      </label>
      {results.length > 0 && (
        <ul className="refSearch__results">
          {results.map((r) => (
            <li key={r.to}>
              <Link to={r.to} onClick={() => setQ('')}>
                <span className="refSearch__kind">{r.kind}</span>
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && results.length === 0 && <p className="runner__note">Nada encontrado para "{q}".</p>}
    </div>
  );
}

// ---------- peças comuns ----------

function RootChips({ value, onChange }: { value: string; onChange: (r: Root) => void }) {
  return (
    <div className="chips refChips" role="group" aria-label="Fundamental">
      {ROOTS.map((r) => (
        <button key={r} type="button" className={'chip' + (r === value ? ' chip-active' : '')} aria-pressed={r === value} onClick={() => onChange(r)}>
          {rootPt(r)}
        </button>
      ))}
    </div>
  );
}

function Keys({ lit, labels, live = true }: { lit: Midi[]; labels?: Partial<Record<Midi, string>>; live?: boolean }) {
  const { held, press, release } = useNoteInput();
  const [low, high] = rangeFor(lit.length ? lit : [60, 72]);
  const marks: Partial<Record<Midi, KeyMark>> = {};
  lit.forEach((m) => (marks[m] = 'lit'));
  if (live) held.forEach((m) => { if (!lit.includes(m)) marks[m] = 'miss'; });
  return (
    <div className="refKeys">
      <PianoKeyboard low={low} high={high} marks={marks} labels={labels} showNames={!labels} onPress={press} onRelease={release} label="Teclado da consulta" size="small" />
    </div>
  );
}

function useParam(name: string, fallback: string): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? fallback;
  return [value, (v) => setParams((p) => { const next = new URLSearchParams(p); next.set(name, v); return next; }, { replace: true })];
}

// ---------- acordes ----------

function Chords() {
  const [root, setRoot] = useParam('raiz', 'C');
  const [suffix, setSuffix] = useParam('tipo', '');
  const [invS, setInv] = useParam('inv', '0');
  const [typed, setTyped] = useState('');
  const play = useSound();
  const { held } = useNoteInput();
  const info = chordInfo(root, suffix, Number(invS) || 0);
  const labels: Partial<Record<Midi, string>> = {};
  info.midis.forEach((m, i) => (labels[m] = info.degrees[i]));
  const heldList = [...held];
  const playing = heldList.length >= 3 ? identifyChord(heldList) : null;
  const pcsOf = (ms: Midi[]) => [...new Set(ms.map((m) => m % 12))].sort((a, b) => a - b).join(',');
  const playingSame = !!playing && pcsOf(heldList) === pcsOf(info.midis) && Math.min(...heldList) % 12 === info.midis[0] % 12;

  const applyTyped = (text: string) => {
    const p = parseSymbol(text);
    if (!p) return;
    setRoot(p.root);
    setSuffix(p.suffix);
    setInv(String(p.inversion));
  };

  return (
    <div className="refSection">
      <form className="refInline" onSubmit={(e) => { e.preventDefault(); applyTyped(typed); }}>
        <input className="refInput" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Digite a cifra: Am7, F/A, Bb7M" aria-label="Cifra" />
        <button className="button button-secondary button-small" type="submit" disabled={!parseSymbol(typed)}>Ver</button>
        {typed && !parseSymbol(typed) && <span className="runner__note">Cifra não reconhecida.</span>}
      </form>
      <RootChips value={root} onChange={(r) => { setRoot(r); setInv('0'); }} />
      <div className="chips refChips" role="group" aria-label="Tipo de acorde">
        {CHORD_TYPES.map((t) => (
          <button key={t.suffix} type="button" className={'chip' + (t.suffix === suffix ? ' chip-active' : '')} aria-pressed={t.suffix === suffix} onClick={() => { setSuffix(t.suffix); setInv('0'); }}>
            {t.name}
          </button>
        ))}
      </div>
      <div className="chips refChips" role="group" aria-label="Inversão">
        {info.midis.map((_, i) => (
          <button key={i} type="button" className={'chip' + (i === info.inversion ? ' chip-active' : '')} aria-pressed={i === info.inversion} onClick={() => setInv(String(i))}>
            {i === 0 ? 'Estado fundamental' : `${i}ª inversão`}
          </button>
        ))}
      </div>

      <div className="refCard">
        <div className="refCard__head">
          <p className="refCard__symbol">{pretty(info.symbol)}</p>
          <div>
            <p className="refCard__name">{info.name}</p>
            <p className="runner__note">{info.type.use}</p>
          </div>
        </div>
        <ul className="refNotes">
          {info.spelled.map((s, i) => (
            <li key={i} className="refNotes__item">
              <span className="refNotes__note">{rootPt(s)}</span>
              <span className="refNotes__deg">{info.degrees[i]}</span>
            </li>
          ))}
        </ul>
        <p className="runner__note">Distância entre as notas, de baixo para cima: {info.steps.join(' + ')} semitons.</p>
        <Keys lit={info.midis} labels={labels} />
        <div className="runner__actions">
          <button className="button button-secondary button-small" type="button" onClick={() => play(block(info.midis))}><PlayIcon className="button__icon" />Ouvir</button>
          <button className="button button-secondary button-small" type="button" onClick={() => play(arpeg(info.midis))}>Arpejado</button>
        </div>
      </div>

      <div className="refLive">
        <p className="page__eyebrow">Toque no piano</p>
        {playing ? (
          <Verdict tone={playingSame ? 'hit' : 'neutral'}>{playingSame ? `Isso: ${pretty(playing.symbol)}` : `Você está tocando ${pretty(playing.symbol)} (${playing.name})`}</Verdict>
        ) : (
          <p className="runner__note">Segure três ou mais notas e o app diz que acorde é. Funciona com qualquer acorde, não só o da tela.</p>
        )}
      </div>
    </div>
  );
}

// ---------- escalas ----------

function Scales() {
  const [root, setRoot] = useParam('raiz', 'C');
  const [id, setId] = useParam('tipo', 'maior');
  const play = useSound();
  const [staffRef, staffWidth] = useElementWidth<HTMLDivElement>();
  const info = scaleInfo(root, id);
  const labels: Partial<Record<Midi, string>> = {};
  info.midis.forEach((m, i) => (labels[m] = i === info.midis.length - 1 ? '1' : String(i + 1)));
  const circle = CIRCLE.find((c) => (id === 'maior' ? c.major === root : id === 'menor' ? rootPt(c.minor) === rootPt(root) : false));
  const fingering = id === 'maior' ? MAJOR_FINGERING[root as Root] : undefined;

  return (
    <div className="refSection">
      <RootChips value={root} onChange={setRoot} />
      <div className="chips refChips" role="group" aria-label="Tipo de escala">
        {SCALE_TYPES.map((t) => (
          <button key={t.id} type="button" className={'chip' + (t.id === id ? ' chip-active' : '')} aria-pressed={t.id === id} onClick={() => setId(t.id)}>
            {t.name}
          </button>
        ))}
      </div>
      <div className="refCard">
        <div className="refCard__head">
          <div>
            <p className="refCard__name">{info.name}</p>
            <p className="runner__note">{info.type.use}</p>
            {circle && <p className="runner__note">Armadura: {signatureText(circle.fifths)}.</p>}
          </div>
        </div>
        <ul className="refNotes">
          {info.spelled.map((s, i) => (
            <li key={i} className="refNotes__item">
              <span className="refNotes__note">{s}</span>
              <span className="refNotes__deg">{i + 1 === info.spelled.length ? '' : info.pattern[i]}</span>
            </li>
          ))}
        </ul>
        <div className="runner__staff" ref={staffRef}>
          <Staff notes={info.midis} states={info.midis.map(() => 'plain')} current={-1} showNames={false} width={staffWidth} fifths={circle?.fifths ?? 0} label={`Pauta da escala de ${info.name}`} />
        </div>
        <Keys lit={info.midis} labels={labels} />
        {fingering && (
          <p className="runner__note">
            Dedilhado subindo (1 oitava): mão direita <strong>{fingering.right}</strong> · mão esquerda <strong>{fingering.left}</strong>.
          </p>
        )}
        <div className="runner__actions">
          <button className="button button-secondary button-small" type="button" onClick={() => play(updown(info.midis))}><PlayIcon className="button__icon" />Ouvir subindo e descendo</button>
        </div>
      </div>
    </div>
  );
}

// ---------- campo harmônico ----------

function Field() {
  const [root, setRoot] = useParam('raiz', 'C');
  const [mode, setMode] = useParam('modo', 'maior');
  const [sev, setSev] = useParam('tetrades', '0');
  const [pick, setPick] = useState(0);
  const play = useSound();
  const field = harmonicField(root, mode === 'menor' ? 'menor' : 'maior', sev === '1');
  const chosen = field[Math.min(pick, field.length - 1)];
  const info = chordInfo(chosen.root, chosen.suffix);
  const progressionsHere = PROGRESSIONS.filter((p) => p.mode === (mode === 'menor' ? 'menor' : 'maior'));
  const voiced = (i: number) => chordInfo(field[i].root, field[i].suffix).midis;

  return (
    <div className="refSection">
      <RootChips value={root} onChange={setRoot} />
      <div className="chips refChips">
        <button type="button" className={'chip' + (mode !== 'menor' ? ' chip-active' : '')} onClick={() => setMode('maior')}>Maior</button>
        <button type="button" className={'chip' + (mode === 'menor' ? ' chip-active' : '')} onClick={() => setMode('menor')}>Menor</button>
        <button type="button" className={'chip' + (sev !== '1' ? ' chip-active' : '')} onClick={() => setSev('0')}>Tríades</button>
        <button type="button" className={'chip' + (sev === '1' ? ' chip-active' : '')} onClick={() => setSev('1')}>Tétrades</button>
      </div>
      <p className="runner__note">
        {mode === 'menor' ? 'Em menor, o V e o vii° vêm da escala harmônica (com a sensível): é o que se usa na prática.' : 'As qualidades se repetem em todo tom maior: I, IV e V maiores; ii, iii e vi menores; vii° diminuto.'}
      </p>
      <ol className="refField">
        {field.map((c, i) => (
          <li key={c.roman}>
            <button type="button" className={'refField__chord refField__chord-' + c.fn.toLowerCase() + (i === pick ? ' refField__chord-on' : '')} onClick={() => { setPick(i); play(block(voiced(i), 2)); }}>
              <span className="refField__roman">{c.roman}</span>
              <span className="refField__symbol">{pretty(c.symbol)}</span>
              <span className="refField__fn">{c.fn}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="refCard">
        <p className="refCard__name">{chosen.roman}: {info.name}</p>
        <Keys lit={info.midis} labels={Object.fromEntries(info.midis.map((m, i) => [m, info.degrees[i]]))} />
      </div>
      <h3 className="exerciseCard__title">Progressões para conhecer</h3>
      <ul className="refProgressions">
        {progressionsHere.map((p) => (
          <li key={p.name} className="refProgressions__item">
            <span>
              <strong>{p.name}</strong>: {p.degrees.map((d) => pretty(field[d].symbol)).join(' – ')}
              <span className="runner__note"> · {p.where}</span>
            </span>
            <button className="button button-secondary button-small" type="button" onClick={() => play({ bpm: 70, steps: p.degrees.map((d) => ({ midis: voiced(d), beats: 2 })) })}>
              <PlayIcon className="button__icon" />Ouvir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- intervalos ----------

function Intervals() {
  const [root, setRoot] = useParam('raiz', 'C');
  const [semisS, setSemis] = useParam('semitons', '7');
  const play = useSound();
  const { held } = useNoteInput();
  const base = chordInfo(root, '').midis[0];
  const semis = Number(semisS) || 7;
  const iv = INTERVALS.find((i) => i.semis === semis) ?? INTERVALS[6];
  const pair = [base, base + semis];
  const h = [...held].sort((a, b) => a - b);

  return (
    <div className="refSection">
      <RootChips value={root} onChange={setRoot} />
      <ul className="refIntervals">
        {INTERVALS.map((i) => (
          <li key={i.code}>
            <button type="button" className={'refIntervals__item' + (i.semis === semis ? ' refIntervals__item-on' : '')} onClick={() => { setSemis(String(i.semis)); play({ bpm: 90, steps: [{ midis: [base], beats: 1 }, { midis: [base + i.semis], beats: 1 }, { midis: [base, base + i.semis], beats: 2 }] }); }}>
              <span className="refIntervals__name">{i.name}</span>
              <span className="refIntervals__semis">{i.semis} {i.semis === 1 ? 'semitom' : 'semitons'}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="refCard">
        <p className="refCard__name">{iv.name} acima de {rootPt(root)}: {noteInfo(pair[1]).name}</p>
        <p className="runner__note">{iv.feel}</p>
        <Keys lit={pair} />
        <div className="runner__actions">
          <button className="button button-secondary button-small" type="button" onClick={() => play({ bpm: 90, steps: [{ midis: [pair[0]], beats: 1 }, { midis: [pair[1]], beats: 2 }] })}><PlayIcon className="button__icon" />Melódico</button>
          <button className="button button-secondary button-small" type="button" onClick={() => play(block(pair, 2))}>Harmônico</button>
        </div>
      </div>
      <div className="refLive">
        <p className="page__eyebrow">Toque no piano</p>
        {h.length === 2 ? <Verdict tone="neutral">{noteInfo(h[0]).name} e {noteInfo(h[1]).name}: {intervalName(h[0], h[1])}</Verdict> : <p className="runner__note">Segure duas notas e o app diz o intervalo.</p>}
      </div>
    </div>
  );
}

// ---------- notas e claves ----------

function Notes() {
  const { held } = useNoteInput();
  const [refT, wT] = useElementWidth<HTMLDivElement>();
  const [refB, wB] = useElementWidth<HTMLDivElement>();
  const [refL, wL] = useElementWidth<HTMLDivElement>();
  const last = [...held].sort((a, b) => a - b).pop();
  const treble = [64, 67, 71, 74, 77, 65, 69, 72, 76];
  const bass = [43, 47, 50, 53, 57, 45, 48, 52, 55];
  return (
    <div className="refSection">
      <div className="refTwo">
        {(['treble', 'bass'] as const).map((clef) => (
          <div key={clef} className="refCard">
            <p className="refCard__name">{CLEF_TIPS[clef].title}</p>
            <div className="runner__staff" ref={clef === 'treble' ? refT : refB}>
              <Staff notes={clef === 'treble' ? treble : bass} states={(clef === 'treble' ? treble : bass).map(() => 'plain')} current={-1} showNames width={clef === 'treble' ? wT : wB} clef={clef} label={CLEF_TIPS[clef].title} />
            </div>
            <p className="runner__note">{CLEF_TIPS[clef].lines}</p>
            <p className="runner__note">{CLEF_TIPS[clef].spaces}</p>
            <p className="runner__note">{CLEF_TIPS[clef].anchor}</p>
          </div>
        ))}
      </div>
      <div className="refCard">
        <p className="refCard__name">Espelho: toque uma tecla e veja onde ela fica na pauta</p>
        <div className="runner__staff" ref={refL}>
          {last !== undefined ? (
            <Staff notes={[last]} states={['current']} current={0} showNames width={Math.min(wL, 280)} clef={last >= 60 ? 'treble' : 'bass'} label="Nota tocada" />
          ) : (
            <p className="runner__note refEmpty">Toque qualquer tecla no piano ou no teclado de baixo.</p>
          )}
        </div>
        {last !== undefined && <p className="refCard__name">{noteInfo(last).name} ({noteInfo(last).sci}) · clave de {last >= 60 ? 'sol' : 'fá'}</p>}
        <p className="runner__note">Linhas suplementares: pequenas linhas acima ou abaixo da pauta para as notas que não cabem nela. O Dó central fica numa delas nas duas claves.</p>
      </div>
    </div>
  );
}

// ---------- ritmo ----------

function Rhythm() {
  const play = useSound();
  const [ref, w] = useElementWidth<HTMLDivElement>();
  return (
    <div className="refSection">
      <div className="refCard" ref={ref}>
        <p className="refCard__name">Figuras: cada uma vale metade da anterior</p>
        <ul className="refFigures">
          {FIGURES.map((f) => (
            <li key={f.name} className="refFigures__item">
              <div className="refFigures__glyph">
                <Staff notes={[71]} states={['plain']} current={-1} showNames={false} width={Math.min(140, w / 3)} durations={[f.beats]} label={f.name} />
              </div>
              <span>
                <strong>{f.name}</strong>: {f.beats >= 1 ? `${f.beats} ${f.beats === 1 ? 'tempo' : 'tempos'}` : `${f.beats === 0.5 ? 'meio tempo' : 'um quarto de tempo'}`}
                <span className="runner__note"> · pausa {f.rest}</span>
              </span>
              <button className="button button-secondary button-small" type="button" onClick={() => play({ bpm: 80, steps: Array.from({ length: Math.max(1, Math.round(4 / f.beats)) }, () => ({ midis: [72], beats: f.beats })) })}>
                <PlayIcon className="button__icon" />
              </button>
            </li>
          ))}
        </ul>
        <p className="runner__note"><strong>Ponto de aumento</strong>: soma metade do valor (semínima pontuada = 1,5 tempo). <strong>Ligadura</strong> entre notas iguais: soma os valores, toca uma vez. <strong>Tercina</strong>: três notas no lugar de duas (três colcheias num tempo).</p>
      </div>
      <div className="refCard">
        <p className="refCard__name">Fórmulas de compasso</p>
        <ul className="lesson__list">
          {METERS.map((m) => <li key={m.sig}><strong>{m.sig}</strong>: {m.text}</li>)}
        </ul>
      </div>
    </div>
  );
}

// ---------- círculo de quintas ----------

function Circle() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const k = CIRCLE[i];
  const R = 130;
  const r = 88;
  return (
    <div className="refSection refTwo">
      <svg className="refCircle" viewBox="-170 -170 340 340" role="img" aria-label="Círculo de quintas">
        <circle r={R + 26} className="refCircle__ring" />
        <circle r={r - 24} className="refCircle__inner" />
        {CIRCLE.map((c, idx) => {
          const a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
          const on = idx === i;
          return (
            <g key={c.major} className={'refCircle__key' + (on ? ' refCircle__key-on' : '')} onClick={() => setI(idx)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setI(idx)}>
              <circle cx={Math.cos(a) * R} cy={Math.sin(a) * R} r={22} />
              <text x={Math.cos(a) * R} y={Math.sin(a) * R + 5} textAnchor="middle">{pretty(c.major)}</text>
              <text className="refCircle__minor" x={Math.cos(a) * r} y={Math.sin(a) * r + 4} textAnchor="middle">{pretty(c.minor)}m</text>
            </g>
          );
        })}
      </svg>
      <div className="refCard">
        <p className="refCard__name">{rootPt(k.major)} maior · relativa: {rootPt(k.minor)} menor</p>
        <p className="runner__note">{signatureText(k.fifths)}.</p>
        <p className="runner__note">No sentido horário, cada tom fica uma 5ª acima do anterior e ganha um sustenido (ou perde um bemol). Vizinhos no círculo são tons próximos: trocar de um para o outro soa natural.</p>
        <div className="runner__actions">
          <button className="button button-secondary button-small" type="button" onClick={() => navigate(`/consulta/escalas?raiz=${encodeURIComponent(k.major)}&tipo=maior`)}>Ver a escala</button>
          <button className="button button-secondary button-small" type="button" onClick={() => navigate(`/consulta/campo?raiz=${encodeURIComponent(k.major)}&modo=maior`)}>Ver o campo harmônico</button>
        </div>
      </div>
    </div>
  );
}

// ---------- termos ----------

function Terms() {
  const [q, setQ] = useParam('q', '');
  const f = fold(q);
  const list = TERMS.filter((t) => !f || fold(t.term).includes(f) || fold(t.meaning).includes(f));
  const groups = [...new Set(list.map((t) => t.group))];
  return (
    <div className="refSection">
      <input className="refInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar termos" aria-label="Filtrar termos" />
      {groups.map((g) => (
        <div key={g} className="refCard">
          <p className="refCard__name">{g}</p>
          <dl className="refTerms">
            {list.filter((t) => t.group === g).map((t) => (
              <div key={t.term} className="refTerms__row">
                <dt>{t.term}</dt>
                <dd>{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      {!list.length && <p className="runner__note">Nenhum termo com "{q}".</p>}
    </div>
  );
}
