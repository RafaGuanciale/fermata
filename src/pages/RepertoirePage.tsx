import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LearnStatus } from '../db/db';
import { CATEGORIES, STATUS_LABEL, STATUS_ORDER, countLabel, matchesQuery, musiciansOf } from '../repertoire/catalog';
import PhotoCard from '../components/PhotoCard';
import PieceList from '../components/PieceList';
import { PlusIcon, SearchIcon } from '../components/Icons';

export default function RepertoirePage() {
  const pieces = useLiveQuery(() => db.pieces.orderBy('updatedAt').reverse().toArray(), []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LearnStatus | 'all'>('all');

  const all = pieces ?? [];
  const searching = query.trim().length > 0;
  const shown = all.filter((p) => (status === 'all' || p.status === status) && matchesQuery(p, query));
  const musicians = musiciansOf(all);
  const count = (slug: string) => all.filter((p) => p.categories.includes(slug)).length;

  return (
    <>
      <header className="page__sectionHead">
        <div className="page__header">
          <span className="page__eyebrow">O que você aprendeu e quer aprender</span>
          <h1 className="page__title">Repertório</h1>
        </div>
        <Link className="button button-primary" to="/repertorio/nova">
          <PlusIcon className="button__icon" />
          Adicionar peça
        </Link>
      </header>

      <label className="field" htmlFor="busca-repertorio">
        <SearchIcon className="field__icon" />
        <input
          id="busca-repertorio"
          type="search"
          placeholder="Ode à Alegria, Gonzaga, filmes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar por título, músico ou categoria"
        />
      </label>

      {!searching && (
        <section className="page__section" aria-label="Categorias">
          <div className="photoGrid photoGrid-categories">
            {CATEGORIES.map((c) => (
              <PhotoCard
                key={c.slug}
                photo={c.photo}
                to={`/repertorio/categoria/${c.slug}`}
                eyebrow={c.eyebrow}
                title={c.title}
                badge={`${count(c.slug)} no repertório`}
              />
            ))}
            <PhotoCard
              photo="musicos"
              to="/repertorio/musicos"
              eyebrow="Compositores · Artistas"
              title="Músicos"
              badge={countLabel(musicians.length, 'músico', 'músicos')}
            />
          </div>
        </section>
      )}

      <section className="page__section" aria-label="Suas peças">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">{searching ? `Resultados para “${query.trim()}”` : 'Suas peças'}</h2>
          {all.length > 0 && (
            <div className="chips" role="group" aria-label="Filtrar por estado">
              {(['all', ...STATUS_ORDER] as const).map((s) => (
                <button key={s} type="button" className={'chip' + (status === s ? ' chip-active' : '')} aria-pressed={status === s} onClick={() => setStatus(s)}>
                  {s === 'all' ? 'Todas' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </div>
        {pieces === undefined ? null : all.length === 0 ? (
          <div className="emptyState">
            <h3 className="emptyState__title">Comece pela peça que você está estudando</h3>
            <p className="emptyState__body">Cadastre o título, quem compôs, as categorias e, se tiver, o PDF da partitura. Ela aparece aqui e na categoria certa.</p>
            <Link className="button button-primary" to="/repertorio/nova">
              <PlusIcon className="button__icon" />
              Adicionar peça
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <p className="emptyState__body">Nenhuma peça com esse filtro.</p>
        ) : (
          <PieceList pieces={shown} />
        )}
      </section>
    </>
  );
}
