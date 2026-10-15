// Arcade: a tela de escolha é um festival. No alto, o seu nível e o próximo show; embaixo, os palcos
// (Descoberta, Alternativo e Principal), do mais leve ao mais pesado. Toda música, do app ou importada,
// cai no palco pela dificuldade calculada (arcade.ts: difficultyScore). Cada uma mostra nome, artista e as
// estrelas de cada dificuldade.

import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { parseArcadeRunId, readArcadeSettings, saveArcadeSettings } from '../arcade/settings';
import { DIFFICULTIES, STAGES, type Difficulty } from '../arcade/arcade';
import { importMidi, useArcadeMidis } from '../arcade/midiStore';
import { useArcadeLibrary, type LibraryEntry } from '../arcade/library';
import { useRuns } from '../training/runs';
import { useMastery } from '../achievements/useMastery';
import Emblem from '../achievements/Emblem';
import { LEVEL_NAMES } from '../achievements/mastery';
import { ArcadeIcon, FlameIcon, NoteIcon, PlayIcon, StarIcon, UploadIcon } from '../components/Icons';

type Results = Partial<Record<Difficulty, { stars: number; score: number }>>;

const SHORT: Record<Difficulty, string> = { facil: 'F', medio: 'M', dificil: 'D' };

const starsOf = (r: Results | undefined) => DIFFICULTIES.reduce((s, d) => s + (r?.[d.id]?.stars ?? 0), 0);
const bestScore = (r: Results | undefined) => Math.max(0, ...DIFFICULTIES.map((d) => r?.[d.id]?.score ?? 0));

/** Capa gerada: cor pela etiqueta, a inicial grande e um disco que aparece no passar do mouse. */
function Cover({ title, tag, size = 'row' }: { title: string; tag: string; size?: 'row' | 'hero' }) {
  const kind = /rock/i.test(tag) ? 'rock' : /game/i.test(tag) ? 'games' : /cinema/i.test(tag) ? 'cinema' : /elvis/i.test(tag) ? 'elvis' : /sua/i.test(tag) ? 'midi' : /aquec/i.test(tag) ? 'warm' : 'classic';
  const Icon = kind === 'games' ? ArcadeIcon : kind === 'rock' ? FlameIcon : kind === 'midi' ? UploadIcon : NoteIcon;
  const variant = [...title].reduce((h, c) => h + c.charCodeAt(0), 0) % 3;
  return (
    <span className={`cover cover-${kind} cover-${size} cover-v${variant}`} aria-hidden>
      <span className="cover__disc" />
      <span className="cover__sleeve">
        <span className="cover__initial">{title.replace(/^(O|A|The|Na|Tema do)\s+/i, '').charAt(0)}</span>
        <Icon className="cover__icon" />
      </span>
    </span>
  );
}

function DiffStars({ r, easy }: { r: Results | undefined; easy: boolean }) {
  return (
    <span className="diffStars">
      {DIFFICULTIES.map((d) => {
        const off = d.id === 'facil' && !easy;
        const n = r?.[d.id]?.stars ?? 0;
        return (
          <span
            key={d.id}
            className={'diffStars__item' + (n ? ' diffStars__item-on' : '') + (off ? ' diffStars__item-off' : '')}
            title={off ? 'Sem modo fácil: simplificada, ela ficaria irreconhecível' : `${d.label}: ${n} de 3 estrelas`}
          >
            <span className="diffStars__label">{SHORT[d.id]}</span>
            {off ? <span className="diffStars__none">—</span> : [0, 1, 2].map((k) => <StarIcon key={k} className={'diffStars__star' + (k < n ? ' diffStars__star-on' : '')} />)}
          </span>
        );
      })}
    </span>
  );
}

function Intensity({ level }: { level: number }) {
  return (
    <span className="intensity" title={`Intensidade ${level} de 5`} aria-label={`Intensidade ${level} de 5`}>
      {[1, 2, 3, 4, 5].map((k) => <span key={k} className={'intensity__bar' + (k <= level ? ' intensity__bar-on' : '')} />)}
    </span>
  );
}

export default function ArcadePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const runs = useRuns();
  const midis = useArcadeMidis();
  const library = useArcadeLibrary(midis);
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

  const all = useMemo(() => [...(library ?? [])].sort((a, b) => a.score - b.score), [library]);
  const totalStars = all.reduce((s, e) => s + starsOf(results.get(e.id)), 0);
  const maxStars = all.reduce((s, e) => s + (e.easy ? 9 : 6), 0);
  const cleared = all.filter((e) => starsOf(results.get(e.id)) > 0).length;
  const record = Math.max(0, ...all.map((e) => bestScore(results.get(e.id))));
  const arcadeTrack = mastery?.tracks.find((t) => t.def.id === 'arcade');

  // Próximo show: a música mais leve ainda sem estrela; com tudo estrelado, a de menos estrelas.
  const featured = all.find((e) => !starsOf(results.get(e.id))) ?? [...all].sort((a, b) => starsOf(results.get(a.id)) - starsOf(results.get(b.id)))[0];
  const heroPick: Difficulty = featured && !featured.easy && heroDiff === 'facil' ? 'medio' : heroDiff;
  const hrefOf = (e: LibraryEntry) => (e.midi ? `/arcade/midi/${e.id}` : `/arcade/${e.id}`);

  const play = (e: LibraryEntry, d: Difficulty) => {
    saveArcadeSettings({ ...readArcadeSettings(), diff: d });
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

  const row = (e: LibraryEntry) => {
    const r = results.get(e.id);
    const score = bestScore(r);
    return (
      <li key={e.id} className="setRow">
        <Link className="setRow__link" to={hrefOf(e)} state={{ background: location }}>
          <Cover title={e.title} tag={e.tag} />
          <span className="setRow__main">
            <span className="setRow__title">
              {e.title}
              {e.midi && <span className="setRow__badge">Sua</span>}
            </span>
            <span className={'setRow__origin' + (e.artist ? '' : ' setRow__origin-missing')}>{e.artist || 'Falta o artista: toque para completar'}</span>
          </span>
          <Intensity level={e.intensity} />
          <DiffStars r={r} easy={e.easy} />
          <span className="setRow__score">{score ? `${score.toLocaleString('pt-BR')} pts` : 'Novo'}</span>
          <span className="setRow__play" aria-hidden><PlayIcon className="setRow__playIcon" /></span>
        </Link>
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
          <span className="arcadeStage__eyebrow">Arcade · o festival</span>
          <h1 className="arcadeStage__title">Hora do show</h1>
          <p className="arcadeStage__lead">Três palcos, do mais leve ao mais pesado. Toque no tempo, segure as longas e encha o multiplicador.</p>
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
            <span className="arcadeNext__eyebrow">Próximo show · {STAGES.find((s) => s.id === featured.stage)?.name}</span>
            <Cover title={featured.title} tag={featured.tag} size="hero" />
            <span className="arcadeNext__title">{featured.title}</span>
            <span className="arcadeNext__origin">{featured.artist || 'Artista não informado'}</span>
            <div className="chips arcadeNext__chips" role="group" aria-label="Dificuldade">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={'chip' + (heroPick === d.id ? ' chip-active' : '')}
                  aria-pressed={heroPick === d.id}
                  disabled={d.id === 'facil' && !featured.easy}
                  onClick={() => setHeroDiff(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button className="button button-primary arcadeNext__play" type="button" onClick={() => play(featured, heroPick)}>
              <PlayIcon className="button__icon" />
              Tocar agora
            </button>
          </div>
        )}
      </section>

      <section className="setImport">
        <div className="setImport__text">
          <strong className="setImport__title">Traga as suas músicas</strong>
          <span className="setImport__lead">Importe um MIDI (no MuseScore, baixe como MIDI). O app calcula a dificuldade e coloca a música no palco certo. Fica na sua conta, só para você.</span>
        </div>
        <button className="button button-secondary setImport__button" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
          <UploadIcon className="button__icon" />
          {busy ? 'Lendo…' : 'Importar MIDI'}
        </button>
        <input ref={fileRef} type="file" accept=".mid,.midi,.kar,audio/midi,audio/x-midi" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        {error && <p className="arcadeImport__error setImport__error" role="alert"><strong>Não deu:</strong> {error}</p>}
      </section>

      {!library && <p className="page__lead">Montando os palcos…</p>}

      {library &&
        STAGES.map((st, i) => {
          const songs = all.filter((e) => e.stage === st.id);
          if (!songs.length) return null;
          const got = songs.reduce((s, e) => s + starsOf(results.get(e.id)), 0);
          const max = songs.reduce((s, e) => s + (e.easy ? 9 : 6), 0);
          return (
            <section key={st.id} className={`setTier setTier-${i + 1} setTier-${st.id}`}>
              <header className="setTier__head">
                <span className="setTier__step">{i === STAGES.length - 1 ? 'Atração principal' : `Palco ${i + 1}`}</span>
                <h2 className="setTier__name">{st.name}</h2>
                <span className="setTier__lead">{st.lead}</span>
                <span className="setTier__progress" title={`${got} de ${max} estrelas`}>
                  <span className="setTier__bar"><span style={{ width: `${max ? (got / max) * 100 : 0}%` }} /></span>
                  <StarIcon className="setTier__star" />
                  {got}/{max}
                </span>
              </header>
              <ul className="setList">{songs.map(row)}</ul>
            </section>
          );
        })}
    </div>
  );
}
