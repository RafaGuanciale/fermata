// Caminho de repertório: dez músicas em cinco fases (src/repertoire/path.ts). Cada uma diz o que ensina; as de
// domínio público entram no repertório com a partitura para tocar junto, as outras entram como meta.

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { PATH_PHASES, nextOnPath, pathItems, type PathItem } from '../repertoire/path';
import { addPathSong, syncPath } from '../repertoire/repo';
import { STATUS_LABEL } from '../repertoire/catalog';
import { BackIcon, CheckIcon, PlayIcon, PlusIcon } from '../components/Icons';

export default function PathPage() {
  const location = useLocation();
  const pieces = useLiveQuery(() => db.pieces.toArray(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void syncPath();
  }, []);
  if (!pieces) return null;

  const items = pathItems(pieces);
  const next = nextOnPath(items);
  const missing = items.filter((i) => !i.piece);

  const add = async (list: PathItem[]) => {
    setError(null);
    for (const i of list) {
      setBusy(i.song.id);
      try {
        await addPathSong(i.song);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não deu para adicionar agora.');
        break;
      }
    }
    setBusy(null);
  };

  return (
    <>
      <Link className="page__back" to="/repertorio">
        <BackIcon className="page__backIcon" />
        Repertório
      </Link>
      <header className="page__sectionHead">
        <div className="page__header">
          <span className="page__eyebrow">Dez músicas, da primeira semana à meta</span>
          <h1 className="page__title">Seu caminho</h1>
        </div>
        {missing.length > 0 && (
          <button className="button button-primary" type="button" disabled={busy !== null} onClick={() => void add(missing)}>
            <PlusIcon className="button__icon" />
            {busy ? 'Adicionando…' : missing.length === items.length ? 'Pôr as dez no repertório' : `Pôr as ${missing.length} que faltam`}
          </button>
        )}
      </header>
      <p className="page__lead songPath__lead">
        Cada música ensina uma ou duas coisas novas sobre as anteriores. Avance quando a atual estiver firme no andamento ideal, não pela data.
        As de domínio público já vêm com a partitura para tocar junto; nas outras, importe a partitura em Editar.
      </p>
      {error && <p className="songPath__error" role="alert">{error}</p>}

      <div className="songPath">
        {PATH_PHASES.map((phase) => (
          <section key={phase.n} className="songPath__phase" aria-labelledby={`fase-${phase.n}`}>
            <h2 className="songPath__phaseTitle" id={`fase-${phase.n}`}>
              <span className="songPath__phaseN">Fase {phase.n} · {phase.when}</span>
              {phase.title}
            </h2>
            <ol className="songPath__list">
              {items.filter((i) => i.song.phase === phase.n).map((i) => {
                const n = items.indexOf(i) + 1;
                const isNext = next?.song.id === i.song.id;
                const playTo = i.piece?.id && i.playable ? `/peca/${i.piece.id}/estudar` : !i.piece && i.song.courseSong ? `/curso/musica/${i.song.courseSong}` : null;
                return (
                  <li key={i.song.id} className={'songPath__item' + (isNext ? ' songPath__item-next' : '') + (i.state === 'aprendida' ? ' songPath__item-done' : '')}>
                    <span className="songPath__n" aria-hidden>{i.state === 'aprendida' ? <CheckIcon className="songPath__check" /> : n}</span>
                    <div className="songPath__body">
                      <p className="songPath__title">
                        {i.piece ? <Link to={`/repertorio/peca/${i.piece.id}`}>{i.song.title}</Link> : i.song.title}
                        <span className="songPath__by"> · {i.song.people.join(', ')}</span>
                      </p>
                      <p className="songPath__teaches">{i.song.teaches}</p>
                      <p className="songPath__why">{i.song.why}</p>
                      <p className="songPath__state">
                        {isNext && <strong className="songPath__nextTag">Agora</strong>}
                        {i.piece ? STATUS_LABEL[i.piece.status] : 'Fora do repertório'}
                        {i.piece && !i.playable && ' · sem partitura para tocar junto ainda'}
                        {i.song.file && ` · ${i.song.file.source}`}
                      </p>
                    </div>
                    <div className="songPath__actions">
                      {playTo && (
                        <Link className="button button-secondary button-small" to={playTo} state={{ background: location }}>
                          <PlayIcon className="button__icon" />
                          Tocar
                        </Link>
                      )}
                      {!i.piece && (
                        <button className="button button-secondary button-small" type="button" disabled={busy !== null} onClick={() => void add([i])}>
                          <PlusIcon className="button__icon" />
                          {busy === i.song.id ? 'Adicionando…' : i.song.file ? 'Pôr no repertório' : 'Pôr como meta'}
                        </button>
                      )}
                      {i.piece && !i.playable && (
                        <Link className="linkButton" to={`/repertorio/peca/${i.piece.id}/editar`}>Importar partitura</Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
