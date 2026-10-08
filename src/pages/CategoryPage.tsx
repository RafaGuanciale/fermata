import { Link, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { categoryBySlug, countLabel } from '../repertoire/catalog';
import PhotoCard from '../components/PhotoCard';
import PieceList from '../components/PieceList';
import { BackIcon, PlusIcon } from '../components/Icons';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const category = categoryBySlug(slug);
  const pieces = useLiveQuery(() => db.pieces.where('categories').equals(slug).toArray(), [slug]);
  if (!category) return <Navigate to="/repertorio" replace />;

  return (
    <>
      <Link className="page__back" to="/repertorio">
        <BackIcon className="page__backIcon" />
        Repertório
      </Link>
      <PhotoCard photo={category.photo} size="hero" eyebrow={category.eyebrow} title={category.title} sizes="100vw">
        <span className="photoCard__body">{pieces ? countLabel(pieces.length, 'peça no seu repertório', 'peças no seu repertório') : ' '}</span>
        <span className="photoCard__actions">
          <Link className="button button-primary" to={`/repertorio/nova?categoria=${slug}`}>
            <PlusIcon className="button__icon" />
            Adicionar peça aqui
          </Link>
        </span>
      </PhotoCard>
      {pieces && pieces.length > 0 ? (
        <PieceList pieces={pieces.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))} />
      ) : pieces ? (
        <p className="emptyState__body">Nenhuma peça em {category.title} ainda.</p>
      ) : null}
    </>
  );
}
