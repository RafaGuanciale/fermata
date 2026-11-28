import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LearnStatus } from '../db/db';
import { CATEGORIES, STATUS_LABEL, STATUS_ORDER, countLabel, matchesQuery, musiciansOf } from '../repertoire/catalog';
import PhotoCard from '../components/PhotoCard';
import { nextOnPath, pathItems } from '../repertoire/path';
import { syncPath } from '../repertoire/repo';
import { UNITS } from '../course';
import { coursePieceRows } from '../course/pieces';
import PieceList from '../components/PieceList';
import { PlusIcon, SearchIcon, UploadIcon } from '../components/Icons';

export default function RepertoirePage() {
  const pieces = useLiveQuery(() => db.pieces.orderBy('updatedAt').reverse().toArray(), []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LearnStatus | 'all'>('all');
  // As músicas do caminho entram no repertório sozinhas (uma vez), como se você tivesse importado.
  useEffect(() => {
    void syncPath();
  }, []);

  const all = pieces ?? [];
  const searching = query.trim().length > 0;
  const shown = all.filter((p) => (status === 'all' || p.status === status) && matchesQuery(p, query));
  const musicians = musiciansOf(all);
  const count = (slug: string) => all.filter((p) => p.categories.includes(slug)).length;
  const items = pathItems(all);
  const next = nextOnPath(items);
  const done = items.filter((i) => i.state === 'aprendida').length;
  const courseRows = coursePieceRows(UNITS, all);
  const toGet = courseRows.filter((r) => r.state === 'fora' || r.state === 'sem-partitura').length;
  const noXml = courseRows.filter((r) => r.state === 'so-pdf').length;

  return (
    <>
      <header className="page__sectionHead">
        <div className="page__header">
          <span className="page__eyebrow">O que você aprendeu e quer aprender</span>
          <h1 className="page__title">Repertório</h1>
        </div>
        <div className="page__actions">
          <Link className="button button-secondary" to="/repertorio/importar">
            <UploadIcon className="button__icon" />
            Importar várias
          </Link>
          <Link className="button button-primary" to="/repertorio/nova">
            <PlusIcon className="button__icon" />
            Adicionar música
          </Link>
        </div>
      </header>

      <label className="field" htmlFor="busca-repertorio">
        <SearchIcon className="field__icon" />
        <input
          id="busca-repertorio"
          type="search"
          placeholder="Ode to Joy, Gonzaga, filmes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar por título, músico ou categoria"
        />
      </label>

      {!searching && next && (
        <Link className="pathBanner" to="/repertorio/caminho">
          <span className="pathBanner__eyebrow">Seu caminho · {done} de {items.length} aprendidas</span>
          <span className="pathBanner__title">Agora: {next.song.title}</span>
          <span className="pathBanner__meta">Dez músicas da primeira semana até Clair de lune. Ver o caminho</span>
        </Link>
      )}

      {!searching && (
        <Link className="pathBanner pathBanner-quiet" to="/repertorio/curso">
          <span className="pathBanner__eyebrow">Músicas do curso · {courseRows.length - toGet - noXml} de {courseRows.length} prontas</span>
          <span className="pathBanner__title">{toGet} para pegar, {noXml} sem MusicXML</span>
          <span className="pathBanner__meta">As partituras que as lições usam e o que falta em cada uma. Ver a lista</span>
        </Link>
      )}

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

      <section className="page__section" aria-label="Suas músicas">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">{searching ? `Resultados para “${query.trim()}”` : 'Suas músicas'}</h2>
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
            <h3 className="emptyState__title">Comece pela música que você está estudando</h3>
            <p className="emptyState__body">Cadastre o título, quem compôs, as categorias e, se tiver, o PDF da partitura. Ela aparece aqui e na categoria certa.</p>
            <Link className="button button-primary" to="/repertorio/nova">
              <PlusIcon className="button__icon" />
              Adicionar música
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <p className="emptyState__body">Nenhuma música com esse filtro.</p>
        ) : (
          <PieceList pieces={shown} />
        )}
      </section>
    </>
  );
}
