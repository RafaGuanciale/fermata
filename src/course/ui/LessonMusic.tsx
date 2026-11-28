// As músicas da lição, logo no começo: as do curso abrem no "Tocar a música"; as protegidas mostram o caminho
// para ter a sua partitura (pôr no repertório, importar o MusicXML) e, quando ela existe, o "Tocar junto".

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Piece } from '../../db/db';
import { PlayIcon, PlusIcon, SearchIcon, UploadIcon } from '../../components/Icons';
import { savePiece } from '../../repertoire/repo';
import { findSong } from '..';
import { findCoursePiece, museScoreSearch, pieceInRepertoire, pieceState, type CoursePiece, type PieceState } from '../pieces';
import type { LessonMusic } from '../types';

function SongCard({ id, why, background }: { id: string; why: string; background: unknown }) {
  const song = findSong(id);
  if (!song) return null;
  return (
    <li className="lessonMusic__item">
      <div className="lessonMusic__main">
        <p className="lessonMusic__meta">{song.composer} · partitura no app</p>
        <h3 className="lessonMusic__title">{song.title}</h3>
        <p className="lessonMusic__why">{why}</p>
      </div>
      <div className="lessonMusic__actions">
        <Link className="button button-primary button-small" to={`/curso/musica/${song.id}`} state={{ background }}>
          <PlayIcon className="button__icon" />
          Tocar a música
        </Link>
      </div>
    </li>
  );
}

const STATE_TEXT: Record<PieceState, string> = {
  pronta: 'Sua partitura está no repertório, com MusicXML para tocar junto.',
  'so-pdf': 'Você tem o PDF. Para tocar junto, falta o MusicXML.',
  'sem-partitura': 'Já está no seu repertório, falta a partitura.',
  fora: 'Música protegida: a partitura vem da sua conta. Ache um arranjo fácil e importe.',
};

function PieceCard({ cp, why, pieces, background }: { cp: CoursePiece; why: string; pieces: Piece[]; background: unknown }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const piece = pieceInRepertoire(cp, pieces);
  const state = pieceState(piece);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await savePiece({ title: cp.title, people: cp.people, arrangement: '', categories: cp.categories, level: cp.level, status: 'wish', bpm: null });
    } catch {
      setError('Não deu para pôr no repertório. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="lessonMusic__item">
      <div className="lessonMusic__main">
        <p className="lessonMusic__meta">
          {cp.people.join(', ')} · {cp.kind} · {cp.part}
        </p>
        <h3 className="lessonMusic__title">{cp.title}</h3>
        <p className="lessonMusic__why">{why}</p>
        <p className="lessonMusic__state">
          {STATE_TEXT[state]}
        </p>
        {error && <p className="lessonMusic__error" role="alert">{error}</p>}
      </div>
      <div className="lessonMusic__actions">
        {state === 'pronta' && piece?.id !== undefined && (
          <Link className="button button-primary button-small" to={`/peca/${piece.id}/estudar`} state={{ background }}>
            <PlayIcon className="button__icon" />
            Tocar junto
          </Link>
        )}
        {state === 'so-pdf' && piece?.id !== undefined && (
          <Link className="button button-primary button-small" to={`/repertorio/peca/${piece.id}`}>
            Ver a partitura
          </Link>
        )}
        {(state === 'sem-partitura' || state === 'so-pdf') && piece?.id !== undefined && (
          <Link className="button button-secondary button-small" to={`/repertorio/peca/${piece.id}/editar`}>
            <UploadIcon className="button__icon" />
            {state === 'so-pdf' ? 'Importar o MusicXML' : 'Importar a partitura'}
          </Link>
        )}
        {state === 'fora' && (
          <button className="button button-secondary button-small" type="button" disabled={busy} onClick={() => void add()}>
            <PlusIcon className="button__icon" />
            {busy ? 'Adicionando…' : 'Pôr no repertório'}
          </button>
        )}
        {state !== 'pronta' && (
          <a className="linkButton lessonMusic__search" href={museScoreSearch(cp)} target="_blank" rel="noopener noreferrer">
            <SearchIcon className="button__icon" />
            Procurar no MuseScore
          </a>
        )}
      </div>
    </li>
  );
}

export function LessonMusicList({ music, background }: { music: LessonMusic[]; background: unknown }) {
  const pieces = useLiveQuery(() => db.pieces.toArray(), []) ?? [];
  return (
    <ul className="lessonMusic">
      {music.map((m) => {
        if ('song' in m) return <SongCard key={`s-${m.song}`} id={m.song} why={m.why} background={background} />;
        const cp = findCoursePiece(m.piece);
        return cp ? <PieceCard key={`p-${m.piece}`} cp={cp} why={m.why} pieces={pieces} background={background} /> : null;
      })}
    </ul>
  );
}
