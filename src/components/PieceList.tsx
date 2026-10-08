import { Link } from 'react-router-dom';
import type { Piece } from '../db/db';
import { LEVEL_LABEL, categoryBySlug } from '../repertoire/catalog';
import StatusBadge from './StatusBadge';
import { FileIcon } from './Icons';

export default function PieceList({ pieces }: { pieces: Piece[] }) {
  return (
    <ul className="pieceList">
      {pieces.map((p) => (
        <li key={p.id}>
          <Link className="pieceList__item" to={`/repertorio/peca/${p.id}`}>
            <span className="pieceList__main">
              <span className="pieceList__title">{p.title}</span>
              <span className="pieceList__by">
                {[p.people.join(', '), p.arrangement].filter(Boolean).join(' · ') || 'Sem autor'}
              </span>
            </span>
            <span className="pieceList__meta">
              {p.categories.slice(0, 2).map((c) => (
                <span key={c} className="tag">{categoryBySlug(c)?.title ?? c}</span>
              ))}
              <span className="tag">{LEVEL_LABEL[p.level]}</span>
              {p.fileId && <FileIcon className="pieceList__file" />}
            </span>
            <StatusBadge status={p.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
