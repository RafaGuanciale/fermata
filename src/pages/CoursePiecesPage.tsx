// Músicas do curso: as protegidas que as lições usam, na ordem do curso, separadas pelo que falta (pegar a
// partitura, falta o MusicXML, prontas). A lógica fica em coursePieceRows e missingLine (src/course/pieces.ts).

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { UNITS } from '../course';
import { coursePieceRows, missingLine, museScoreSearch, type CoursePieceRow } from '../course/pieces';
import { BackIcon, PlayIcon, SearchIcon, UploadIcon } from '../components/Icons';

const lessonLabel = (row: CoursePieceRow) => {
  const [first, ...rest] = row.lessons;
  return rest.length === 0 ? `Lição ${first.n}` : `Lições ${first.n} e mais ${rest.length}`;
};

function Row({ row, background }: { row: CoursePieceRow; background: unknown }) {
  const first = row.lessons[0];
  const id = row.piece?.id;
  return (
    <li className="courseNeeds__item">
      <div className="courseNeeds__main">
        <h3 className="courseNeeds__title">{row.cp.title}</h3>
        <p className="courseNeeds__meta">
          {row.cp.people.join(', ')} · {row.cp.part} ·{' '}
          <Link className="courseNeeds__lesson" to={`/estudo/unidade/${first.unit}/${first.id}#musica`}>
            {lessonLabel(row)}
          </Link>
        </p>
      </div>
      <div className="courseNeeds__actions">
        {row.state === 'pronta' && id !== undefined && (
          <Link className="button button-secondary button-small" to={`/peca/${id}/estudar`} state={{ background }}>
            <PlayIcon className="button__icon" />
            Tocar junto
          </Link>
        )}
        {(row.state === 'so-pdf' || row.state === 'sem-partitura') && id !== undefined && (
          <Link className="button button-secondary button-small" to={`/repertorio/peca/${id}/editar`}>
            <UploadIcon className="button__icon" />
            {row.state === 'so-pdf' ? 'Importar o MusicXML' : 'Importar a partitura'}
          </Link>
        )}
        {row.state !== 'pronta' && (
          <a className="linkButton" href={museScoreSearch(row.cp)} target="_blank" rel="noopener noreferrer">
            <SearchIcon className="button__icon" />
            MuseScore
          </a>
        )}
      </div>
    </li>
  );
}

function Group({ title, hint, rows, background }: { title: string; hint: string; rows: CoursePieceRow[]; background: unknown }) {
  if (rows.length === 0) return null;
  return (
    <section className="page__section" aria-label={title}>
      <div className="courseNeeds__head">
        <h2 className="page__sectionTitle">
          {title} <span className="courseNeeds__count">{rows.length}</span>
        </h2>
        <p className="courseNeeds__hint">{hint}</p>
      </div>
      <ul className="courseNeeds">
        {rows.map((r) => (
          <Row key={r.cp.id} row={r} background={background} />
        ))}
      </ul>
    </section>
  );
}

export default function CoursePiecesPage() {
  const location = useLocation();
  const pieces = useLiveQuery(() => db.pieces.toArray(), []);
  const [copied, setCopied] = useState<string | null>(null);
  if (!pieces) return null;

  const rows = coursePieceRows(UNITS, pieces);
  const toGet = rows.filter((r) => r.state === 'fora' || r.state === 'sem-partitura');
  const onlyPdf = rows.filter((r) => r.state === 'so-pdf');
  const ready = rows.filter((r) => r.state === 'pronta');
  const lines = rows.map(missingLine).filter((l): l is string => l !== null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied('Lista copiada.');
    } catch {
      setCopied('Não deu para copiar. Selecione a lista no fim da página.');
    }
  };

  return (
    <>
      <Link className="page__back" to="/repertorio">
        <BackIcon className="page__backIcon" />
        Repertório
      </Link>
      <header className="page__sectionHead">
        <div className="page__header">
          <span className="page__eyebrow">Partituras que as lições usam</span>
          <h1 className="page__title">Músicas do curso</h1>
        </div>
        {lines.length > 0 && (
          <button className="button button-secondary" type="button" onClick={() => void copy()}>
            Copiar a lista
          </button>
        )}
      </header>
      <p className="page__lead">
        {rows.length} músicas: {ready.length} prontas para tocar junto, {onlyPdf.length} só com PDF e {toGet.length} para pegar. Música protegida não vem com o app:
        com o PDF você lê a partitura; com o MusicXML o app toca junto e mostra onde você errou.
      </p>
      <p className="courseNeeds__status" role="status">
        {copied}
      </p>

      <Group title="Para pegar" hint="Ache um arranjo e importe a partitura e o MusicXML." rows={toGet} background={location} />
      <Group title="Falta o MusicXML" hint="Você já tem o PDF. Exporte o MusicXML no MuseScore e importe na música." rows={onlyPdf} background={location} />
      <Group title="Prontas para tocar junto" hint="Partitura e MusicXML na sua conta." rows={ready} background={location} />

      {lines.length > 0 && (
        <section className="page__section" aria-label="Lista em texto">
          <h2 className="page__sectionTitle">Lista em texto</h2>
          <pre className="courseNeeds__text">{lines.join('\n')}</pre>
        </section>
      )}
    </>
  );
}
