import { useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { LEVEL_LABEL, STATUS_LABEL, STATUS_ORDER, categoryBySlug } from '../repertoire/catalog';
import { deletePiece, fileWhere, formatBytes, setStatus } from '../repertoire/repo';
import PhotoCard from '../components/PhotoCard';
import StatusBadge from '../components/StatusBadge';
import { BackIcon, ExpandIcon, FileIcon, PlayIcon, TrashIcon } from '../components/Icons';

export default function PiecePage() {
  const location = useLocation();
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const piece = useLiveQuery(() => db.pieces.get(id), [id]);
  const file = useLiveQuery(async () => (piece?.fileId ? db.files.get(piece.fileId) : null), [piece?.fileId]);
  const scoreFile = useLiveQuery(async () => (piece?.scoreFileId ? db.files.get(piece.scoreFileId) : null), [piece?.scoreFileId]);
  const [confirming, setConfirming] = useState(false);

  if (piece === undefined) return null;
  if (!piece) return <p className="emptyState__body">Essa peça não existe mais. <Link to="/repertorio">Voltar ao repertório</Link></p>;

  const mainCategory = piece.categories.map((c) => categoryBySlug(c)).find(Boolean);

  return (
    <>
      <Link className="page__back" to="/repertorio">
        <BackIcon className="page__backIcon" />
        Repertório
      </Link>

      <PhotoCard
        photo={mainCategory?.photo ?? 'repertoireHero'}
        size="hero"
        eyebrow={[piece.people.join(', '), piece.arrangement].filter(Boolean).join(' · ') || 'Peça'}
        title={piece.title}
        sizes="100vw"
      >
        <span className="photoCard__actions">
          {piece.fileId ? (
            <Link className={'button ' + (piece.scoreFileId ? 'button-secondary' : 'button-primary')} to={`/partitura/${piece.id}`} state={{ background: location }}>
              <ExpandIcon className="button__icon" />
              Abrir partitura
            </Link>
          ) : (
            <Link className="button button-primary" to={`/repertorio/peca/${piece.id}/editar`}>
              Adicionar partitura
            </Link>
          )}
          {piece.scoreFileId ? (
            <Link className="button button-primary" to={`/peca/${piece.id}/estudar`} state={{ background: location }}>
              <PlayIcon className="button__icon" />
              Estudar esta peça
            </Link>
          ) : null}
          <Link className="button button-secondary" to={`/repertorio/peca/${piece.id}/editar`}>
            Editar
          </Link>
        </span>
      </PhotoCard>

      <section className="page__section">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Em que ponto você está</h2>
          <StatusBadge status={piece.status} />
        </div>
        <div className="chips" role="group" aria-label="Estado da peça">
          {STATUS_ORDER.map((s) => (
            <button key={s} type="button" className={'chip chip-large' + (piece.status === s ? ' chip-active' : '')} aria-pressed={piece.status === s} onClick={() => setStatus(piece.id!, s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </section>

      <section className="detailList">
        <div className="detailList__row">
          <span className="page__eyebrow">Categorias</span>
          <span className="chips">
            {piece.categories.length ? piece.categories.map((c) => (
              <Link key={c} className="tag tag-link" to={`/repertorio/categoria/${c}`}>{categoryBySlug(c)?.title ?? c}</Link>
            )) : '—'}
          </span>
        </div>
        <div className="detailList__row">
          <span className="page__eyebrow">Músicos</span>
          <span className="chips">
            {piece.people.length ? piece.people.map((n) => (
              <Link key={n} className="tag tag-link" to={`/repertorio/musicos?nome=${encodeURIComponent(n)}`}>{n}</Link>
            )) : '—'}
          </span>
        </div>
        <div className="detailList__row">
          <span className="page__eyebrow">Nível</span>
          <span>{LEVEL_LABEL[piece.level]}</span>
        </div>
        <div className="detailList__row">
          <span className="page__eyebrow">Partitura</span>
          {file ? (
            <span className="fileBox fileBox-inline">
              <FileIcon className="fileBox__icon" />
              <span className="fileBox__name">{file.name}</span>
              <span className="fileBox__size">{formatBytes(file.size)} · {fileWhere(file)}</span>
            </span>
          ) : (
            <span>Nenhuma</span>
          )}
        </div>
        <div className="detailList__row">
          <span className="page__eyebrow">Notas para tocar</span>
          {scoreFile ? (
            <span className="fileBox fileBox-inline">
              <FileIcon className="fileBox__icon" />
              <span className="fileBox__name">{scoreFile.name}</span>
              <span className="fileBox__size">{formatBytes(scoreFile.size)} · {fileWhere(scoreFile)}</span>
            </span>
          ) : (
            <span>
              Nenhuma. <Link to={`/repertorio/peca/${piece.id}/editar`}>Adicionar o MusicXML do MuseScore</Link>
            </span>
          )}
        </div>
      </section>

      <div className="dangerZone">
        {confirming ? (
          <>
            <span>Apagar “{piece.title}” e a partitura? Isso não tem volta.</span>
            <button className="button button-danger button-small" type="button" onClick={async () => { await deletePiece(piece.id!); navigate('/repertorio', { replace: true }); }}>
              Apagar
            </button>
            <button className="button button-ghost button-small" type="button" onClick={() => setConfirming(false)}>
              Manter
            </button>
          </>
        ) : (
          <button className="button button-ghost button-small" type="button" onClick={() => setConfirming(true)}>
            <TrashIcon className="button__icon" />
            Apagar peça
          </button>
        )}
      </div>
    </>
  );
}
