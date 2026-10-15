// Arcade: a tela de escolha é um palco, como nos jogos de ritmo. No alto, o seu nível e o próximo show;
// embaixo, a turnê em três etapas (aquecimento, palco, arena) e as suas músicas importadas.
// Cada música mostra as estrelas de cada dificuldade.

import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ARCADE_CATALOG, type ArcadeEntry } from '../arcade/songs';
import { parseArcadeRunId, readArcadeSettings, saveArcadeSettings } from '../arcade/settings';
import { DIFFICULTIES, type Difficulty } from '../arcade/arcade';
import { deleteMidi, importMidi, useArcadeMidis } from '../arcade/midiStore';
import { useRuns } from '../training/runs';
import { useMastery } from '../achievements/useMastery';
import Emblem from '../achievements/Emblem';
import { LEVEL_NAMES } from '../achievements/mastery';
import { ArcadeIcon, FlameIcon, NoteIcon, PlayIcon, StarIcon, TrashIcon, UploadIcon } from '../components/Icons';

type Results = Partial<Record<Difficulty, { stars: number; score: number }>>;

const TIERS: { level: 1 | 2 | 3; name: string; lead: string }[] = [
  { level: 1, name: 'Aquecimento', lead: 'Para soltar os dedos.' },
  { level: 2, name: 'Palco', lead: 'Os temas que todo mundo reconhece.' },
  { level: 3, name: 'Arena', lead: 'Para quem quer suar.' },
];

const SHORT: Record<Difficulty, string> = { facil: 'F', medio: 'M', dificil: 'D' };

const starsOf = (r: Results | undefined) => DIFFICULTIES.reduce((s, d) => s + (r?.[d.id]?.stars ?? 0), 0);
const bestScore = (r: Results | undefined) => Math.max(0, ...DIFFICULTIES.map((d) => r?.[d.id]?.score ?? 0));

/** Capa gerada: cor pela etiqueta, a inicial grande e um disco que aparece no passar do mouse. */
function Cover({ title, tag, size = 'row' }: { title: string; tag: string; size?: 'row' | 'hero' }) {
  const kind = /rock/i.test(tag) ? 'rock' : /game/i.test(tag) ? 'games' : /cinema/i.test(tag) ? 'cinema' : /elvis/i.test(tag) ? 'elvis' : /midi/i.test(tag) ? 'midi' : /aquec/i.test(tag) ? 'warm' : 'classic';
  const Icon = kind === 'games' ? ArcadeIcon : kind === 'rock' ? FlameIcon : kind === 'midi' ? UploadIcon : NoteIcon;
  return (
    <span className={`cover cover-${kind} cover-${size} cover-v${[...title].reduce((h, c) => h + c.charCodeAt(0), 0) % 3}`} aria-hidden>
      <span className="cover__disc" />
      <span className="cover__sleeve">
        <span className="cover__initial">{title.replace(/^(O|A|The|Na|Tema do)\s+/i, '').charAt(0)}</span>
        <Icon className="cover__icon" />
      </span>
    </span>
  );
}

function DiffStars({ r }: { r: Results | undefined }) {
  return (
    <span className="diffStars">
      {DIFFICULTIES.map((d) => {
        const n = r?.[d.id]?.stars ?? 0;
        return (
          <span key={d.id} className={'diffStars__item' + (n ? ' diffStars__item-on' : '')} title={`${d.label}: ${n} de 3 estrelas`}>
            <span className="diffStars__label">{SHORT[d.id]}</span>
            {[0, 1, 2].map((k) => <StarIcon key={k} className={'diffStars__star' + (k < n ? ' diffStars__star-on' : '')} />)}
          </span>
        );
      })}
    </span>
  );
}

function Intensity({ level }: { level: number }) {
  return (
    <span className="intensity" title={`Intensidade ${level} de 3`} aria-label={`Intensidade ${level} de 3`}>
      {[1, 2, 3].map((k) => <span key={k} className={'intensity__bar' + (k <= level ? ' intensity__bar-on' : '')} />)}
    </span>
  );
}

export default function ArcadePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const runs = useRuns();
  const midis = useArcadeMidis();
  const mastery = useMastery();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroDiff, setHeroDiff] = useState<Difficulty>(() => readArcadeSettings().diff);

  // Melhor resultado de cada música em cada dificuldade.
  const results = useMemo(() => {
    const out = new Map<string, Results>();
    for (const r of runs ?? []) {
      const p = parseArcadeRunId(r.treinoId);
      if (!p) continue;
      const cur = out.get(p.id) ?? {};
      const prev = cur[p.diff];
      cur[p.diff] = { stars: Math.max(prev?.stars ?? 0, r.stars ?? 0), score: Math.max(prev?.score ?? 0, r.score ?? 0) };
      out.set(p.id, cur);
    }
    return out;
  }, [runs]);

  const all: (ArcadeEntry & { midi?: boolean })[] = useMemo(
    () => [...ARCADE_CATALOG, ...(midis ?? []).map((m) => ({ id: m.id, title: m.title, origin: 'MIDI importado', tag: 'MIDI', level: 2 as const, midi: true }))],
    [midis],
  );
  const totalStars = all.reduce((s, e) => s + starsOf(results.get(e.id)), 0);
  const maxStars = all.length * 9;
  const cleared = all.filter((e) => starsOf(results.get(e.id)) > 0).length;
  const record = Math.max(0, ...all.map((e) => bestScore(results.get(e.id))));
  const arcadeTrack = mastery?.tracks.find((t) => t.def.id === 'arcade');

  // Próximo show: a primeira música da turnê ainda sem estrela; com tudo estrelado, a de menos estrelas.
  const featured = ARCADE_CATALOG.find((e) => !starsOf(results.get(e.id))) ?? [...ARCADE_CATALOG].sort((a, b) => starsOf(results.get(a.id)) - starsOf(results.get(b.id)))[0];
  const hrefOf = (e: { id: string; midi?: boolean }) => (e.midi ? `/arcade/midi/${e.id}` : `/arcade/${e.id}`);

  const play = (e: { id: string; midi?: boolean }, d?: Difficulty) => {
    if (d) saveArcadeSettings({ ...readArcadeSettings(), diff: d });
    navigate(hrefOf(e), { state: { background: location } });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const id = await importMidi(file);
      navigate(`/arcade/midi/${id}`, { state: { background: location } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui ler este arquivo.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const row = (e: ArcadeEntry & { midi?: boolean }) => {
    const r = results.get(e.id);
    const score = bestScore(r);
    return (
      <li key={e.id} className={'setRow' + (e.midi ? ' setRow-midi' : '')}>
        <Link className="setRow__link" to={hrefOf(e)} state={{ background: location }}>
          <Cover title={e.title} tag={e.tag} />
          <span className="setRow__main">
            <span className="setRow__title">{e.title}</span>
            <span className="setRow__origin">{e.origin}</span>
          </span>
          {!e.midi && <Intensity level={e.level} />}
          <DiffStars r={r} />
          <span className="setRow__score">{score ? `${score.toLocaleString('pt-BR')} pts` : 'Novo'}</span>
          <span className="setRow__play" aria-hidden><PlayIcon className="setRow__playIcon" /></span>
        </Link>
        {e.midi && (
          <button className="setRow__delete" type="button" aria-label={`Apagar ${e.title}`} title="Apagar este MIDI" onClick={() => void deleteMidi(e.id)}>
            <TrashIcon className="setRow__deleteIcon" />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="arcadeHub">
      <section className="arcadeStage">
        <div className="arcadeStage__lights" aria-hidden>
          <span /><span /><span />
        </div>
        <div className="arcadeStage__eq" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => <span key={i} style={{ animationDelay: `${(i * 137) % 900}ms`, animationDuration: `${700 + ((i * 251) % 600)}ms` }} />)}
        </div>

        <div className="arcadeStage__intro">
          <span className="arcadeStage__eyebrow">Arcade</span>
          <h1 className="arcadeStage__title">Hora do show</h1>
          <p className="arcadeStage__lead">As notas caem sobre as teclas. Toque no tempo, segure as longas e encha o multiplicador.</p>
          <div className="arcadeStage__stats">
            {arcadeTrack && (
              <span className="arcadeStage__emblem" title={`Maestria do arcade: ${LEVEL_NAMES[arcadeTrack.level]}`}>
                <Emblem track="arcade" level={arcadeTrack.level} size={52} />
              </span>
            )}
            <span className="arcadeStat">
              <strong className="arcadeStat__value"><StarIcon className="arcadeStat__star" />{totalStars}</strong>
              <span className="arcadeStat__label">de {maxStars} estrelas</span>
            </span>
            <span className="arcadeStat">
              <strong className="arcadeStat__value">{cleared}</strong>
              <span className="arcadeStat__label">{cleared === 1 ? 'música com estrela' : 'músicas com estrela'}</span>
            </span>
            <span className="arcadeStat">
              <strong className="arcadeStat__value">{record ? record.toLocaleString('pt-BR') : '—'}</strong>
              <span className="arcadeStat__label">maior pontuação</span>
            </span>
          </div>
        </div>

        {featured && (
          <div className="arcadeNext">
            <span className="arcadeNext__eyebrow">Próximo show</span>
            <Cover title={featured.title} tag={featured.tag} size="hero" />
            <span className="arcadeNext__title">{featured.title}</span>
            <span className="arcadeNext__origin">{featured.origin}</span>
            <div className="chips arcadeNext__chips" role="group" aria-label="Dificuldade">
              {DIFFICULTIES.map((d) => (
                <button key={d.id} type="button" className={'chip' + (heroDiff === d.id ? ' chip-active' : '')} aria-pressed={heroDiff === d.id} onClick={() => setHeroDiff(d.id)}>
                  {d.label}
                </button>
              ))}
            </div>
            <button className="button button-primary arcadeNext__play" type="button" onClick={() => play(featured, heroDiff)}>
              <PlayIcon className="button__icon" />
              Tocar agora
            </button>
          </div>
        )}
      </section>

      {TIERS.map((t) => {
        const songs = ARCADE_CATALOG.filter((e) => e.level === t.level);
        const got = songs.reduce((s, e) => s + starsOf(results.get(e.id)), 0);
        const max = songs.length * 9;
        return (
          <section key={t.level} className={`setTier setTier-${t.level}`}>
            <header className="setTier__head">
              <span className="setTier__step">Etapa {t.level}</span>
              <h2 className="setTier__name">{t.name}</h2>
              <span className="setTier__lead">{t.lead}</span>
              <span className="setTier__progress" title={`${got} de ${max} estrelas`}>
                <span className="setTier__bar"><span style={{ width: `${max ? (got / max) * 100 : 0}%` }} /></span>
                <StarIcon className="setTier__star" />
                {got}/{max}
              </span>
            </header>
            <ul className="setList">
              {songs.map(row)}
            </ul>
          </section>
        );
      })}

      <section className="setTier setTier-midi">
        <header className="setTier__head">
          <span className="setTier__step">Bônus</span>
          <h2 className="setTier__name">Suas músicas</h2>
          <span className="setTier__lead">MIDIs que você importou. Ficam na sua conta, só para você.</span>
          <button className="button button-secondary button-small setTier__import" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
            <UploadIcon className="button__icon" />
            {busy ? 'Lendo…' : 'Importar MIDI'}
          </button>
          <input ref={fileRef} type="file" accept=".mid,.midi,.kar,audio/midi,audio/x-midi" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        </header>
        {error && <p className="arcadeImport__error" role="alert"><strong>Não deu:</strong> {error}</p>}
        {midis && midis.length > 0 ? (
          <ul className="setList">
            {all.filter((e) => e.midi).map(row)}
          </ul>
        ) : (
          <button className="setEmpty" type="button" onClick={() => fileRef.current?.click()}>
            <UploadIcon className="setEmpty__icon" />
            <span className="setEmpty__title">Traga qualquer música em MIDI</span>
            <span className="setEmpty__lead">No MuseScore, baixe como MIDI. O app monta a fase nas três dificuldades.</span>
          </button>
        )}
      </section>
    </div>
  );
}
