import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { countLabel, initials, musiciansOf, normalize } from '../repertoire/catalog';
import PhotoCard from '../components/PhotoCard';
import PieceList from '../components/PieceList';
import { BackIcon } from '../components/Icons';

export default function MusiciansPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('nome');
  const pieces = useLiveQuery(() => db.pieces.toArray(), []);
  const all = pieces ?? [];
  const musicians = musiciansOf(all);
  const ofSelected = selected ? all.filter((p) => p.people.some((n) => normalize(n) === normalize(selected))) : [];

  return (
    <>
      <Link className="page__back" to="/repertorio">
        <BackIcon className="page__backIcon" />
        Repertório
      </Link>
      <PhotoCard photo="musicos" size="hero" eyebrow="Compositores · Artistas" title="Músicos" sizes="100vw">
        <span className="photoCard__body">Todo nome que você cadastra numa peça vira um músico aqui.</span>
      </PhotoCard>

      {pieces && musicians.length === 0 && <p className="emptyState__body">Os músicos aparecem quando você cadastrar peças com compositor ou artista.</p>}

      <div className="musicianGrid">
        {musicians.map((m) => {
          const on = selected !== null && normalize(selected) === normalize(m.name);
          return (
            <button
              key={m.name}
              type="button"
              className={'musician' + (on ? ' musician-active' : '')}
              aria-pressed={on}
              onClick={() => setParams(on ? {} : { nome: m.name }, { replace: true })}
            >
              <span className="musician__avatar" aria-hidden>{initials(m.name)}</span>
              <span className="musician__name">{m.name}</span>
              <span className="musician__count">{countLabel(m.count, 'peça', 'peças')}</span>
            </button>
          );
        })}
      </div>

      {selected && ofSelected.length > 0 && (
        <section className="page__section">
          <h2 className="page__sectionTitle">Peças de {selected}</h2>
          <PieceList pieces={ofSelected} />
        </section>
      )}
    </>
  );
}
