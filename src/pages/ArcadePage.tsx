// Arcade: tocar por diversão. Músicas do app (domínio público) e MIDIs que você importa; três dificuldades.

import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ARCADE_SONGS } from '../arcade/songs';
import { arcadeRunId, parseArcadeRunId } from '../arcade/ArcadeGame';
import { DIFFICULTIES, type Difficulty } from '../arcade/arcade';
import { deleteMidi, importMidi, useArcadeMidis } from '../arcade/midiStore';
import { useRuns } from '../training/runs';
import { StarIcon, TrashIcon, UploadIcon } from '../components/Icons';

interface Best { score: number; stars: number; diff: Difficulty }

function BestLine({ b }: { b: Best | undefined }) {
  if (!b) return <span className="arcadeCard__best">Ainda não jogou</span>;
  const label = DIFFICULTIES.find((d) => d.id === b.diff)?.label.toLowerCase();
  return (
    <span className="arcadeCard__best">
      <span className="arcadeCard__stars" aria-label={`${b.stars} de 3 estrelas`}>
        {[0, 1, 2].map((k) => <StarIcon key={k} className={'arcadeCard__star' + (k < b.stars ? ' arcadeCard__star-on' : '')} />)}
      </span>
      {b.score.toLocaleString('pt-BR')} pontos no {label}
    </span>
  );
}

export default function ArcadePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const runs = useRuns();
  const midis = useArcadeMidis();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Melhor resultado por música, na dificuldade em que ele foi feito (mais estrelas, depois mais pontos).
  const best = useMemo(() => {
    const out = new Map<string, Best>();
    for (const r of runs ?? []) {
      const p = parseArcadeRunId(r.treinoId);
      if (!p) continue;
      const cur: Best = { score: r.score ?? 0, stars: r.stars ?? 0, diff: p.diff };
      const prev = out.get(p.id);
      if (!prev || cur.stars > prev.stars || (cur.stars === prev.stars && cur.score > prev.score)) out.set(p.id, cur);
    }
    return out;
  }, [runs]);

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

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Para quando você só quer tocar</span>
        <h1 className="page__title">Arcade</h1>
        <p className="page__lead">As notas caem sobre as teclas: toque quando chegarem e segure as longas. Três dificuldades, sem nota mínima.</p>
      </header>

      <section className="page__section">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Suas músicas</h2>
          <button className="button button-secondary button-small" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
            <UploadIcon className="button__icon" />
            {busy ? 'Lendo…' : 'Importar MIDI'}
          </button>
          <input ref={fileRef} type="file" accept=".mid,.midi,.kar,audio/midi,audio/x-midi" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {error && <p className="arcadeImport__error" role="alert"><strong>Não deu:</strong> {error}</p>}
        {midis && midis.length > 0 ? (
          <div className="arcadeGrid">
            {midis.map((m) => (
              <div key={m.id} className="arcadeCard arcadeCard-midi">
                <Link className="arcadeCard__link" to={`/arcade/midi/${m.id}`} state={{ background: location }} id={arcadeRunId(m.id)}>
                  <span className="arcadeCard__tag">MIDI</span>
                  <span className="arcadeCard__title">{m.title}</span>
                  <BestLine b={best.get(m.id)} />
                </Link>
                <button className="arcadeCard__delete" type="button" aria-label={`Apagar ${m.title}`} onClick={() => void deleteMidi(m.id)}>
                  <TrashIcon className="arcadeCard__deleteIcon" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="page__lead arcadeImport__lead">Traga o arquivo .mid de qualquer música (no MuseScore, baixe como MIDI). O app monta a fase nas três dificuldades, e o arquivo fica só neste aparelho.</p>
        )}
      </section>

      <section className="page__section">
        <h2 className="page__sectionTitle">Músicas do app</h2>
        <div className="arcadeGrid">
          {ARCADE_SONGS.map((s) => (
            <Link key={s.id} className="arcadeCard" to={`/arcade/${s.id}`} state={{ background: location }} id={arcadeRunId(s.id)}>
              <span className={`arcadeCard__tag arcadeCard__tag-${s.level}`}>{s.tag}</span>
              <span className="arcadeCard__title">{s.title}</span>
              <span className="arcadeCard__origin">{s.origin}</span>
              <BestLine b={best.get(s.id)} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
