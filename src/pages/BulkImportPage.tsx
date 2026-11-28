// Importar várias músicas de uma vez (/repertorio/importar). A lógica de juntar arquivos está em
// src/repertoire/bulkImport.ts; aqui só se escolhe os arquivos, confere a lista e grava pelo repo.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Piece } from '../db/db';
import { LEVEL_LABEL } from '../repertoire/catalog';
import { isScoreFile, isSheetFile, planImport, sheetMime, type ImportRow } from '../repertoire/bulkImport';
import { MAX_FILE_BYTES, savePiece, scoreType, type PieceInput } from '../repertoire/repo';
import { BackIcon, UploadIcon } from '../components/Icons';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.mxl,.musicxml,.xml';
const ACTION_LABEL: Record<ImportRow['action'], string> = {
  nova: 'Música nova',
  completar: 'Completa a que você já tem',
  nada: 'Já tem tudo',
};

function folderOf(f: File): string | undefined {
  const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel ? rel.split('/').slice(0, -1).join('/') : undefined;
}

export default function BulkImportPage() {
  const pieces = useLiveQuery(() => db.pieces.toArray(), []) ?? [];
  const [files, setFiles] = useState<File[]>([]);
  const [manifest, setManifest] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () => planImport(files.map((f) => ({ name: f.name, size: f.size, folder: folderOf(f) })), pieces, manifest),
    [files, pieces, manifest],
  );
  const todo = rows.filter((r) => r.action !== 'nada');
  const ignored = files.filter((f) => !isSheetFile(f.name) && !isScoreFile(f.name));

  const add = (list: FileList | null) => {
    if (!list) return;
    setDone(null);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}|${f.size}`));
      return [...prev, ...[...list].filter((f) => !seen.has(`${f.name}|${f.size}`))];
    });
  };

  const fileFor = (i: number | undefined, kind: 'sheet' | 'score') => {
    if (i === undefined) return undefined;
    const f = files[i];
    const type = kind === 'score' ? scoreType(f.name) ?? 'application/vnd.recordare.musicxml+xml' : sheetMime(f.name);
    return new File([f], f.name, { type });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    let count = 0;
    try {
      for (const row of todo) {
        const sheet = fileFor(row.sheet, 'sheet');
        if (sheet && sheet.size > MAX_FILE_BYTES) continue;
        const score = fileFor(row.score, 'score');
        const existing: Piece | undefined = row.existingId ? pieces.find((p) => p.id === row.existingId) : undefined;
        const input: PieceInput = existing
          ? { title: existing.title, people: existing.people, arrangement: existing.arrangement, categories: existing.categories, level: existing.level, status: existing.status, bpm: existing.bpm ?? null, pathId: existing.pathId }
          : { title: row.title, people: row.people, arrangement: row.arrangement, categories: row.categories, level: row.level, status: 'wish', bpm: null };
        await savePiece(input, { ...(sheet ? { sheet } : {}), ...(score ? { score } : {}) }, row.existingId);
        count += 1;
      }
      setFiles([]);
      setManifest('');
      setDone(count === 1 ? '1 música importada.' : `${count} músicas importadas.`);
    } catch {
      setError(`Parou no meio: ${count} músicas foram importadas. Tente de novo com o resto.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="page__header">
        <Link className="linkButton" to="/repertorio">
          <BackIcon className="button__icon" />
          Repertório
        </Link>
        <h1 className="page__title">Importar várias músicas</h1>
      </header>

      <div className="form">
        <label className="dropZone" htmlFor="importar-arquivos" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
          <UploadIcon className="dropZone__icon" />
          <span className="dropZone__title">Escolha os PDFs, fotos e MusicXML</span>
          <span className="form__help">Ou arraste para cá. Pode escolher mais de uma vez: os arquivos vão se somando. O PDF e o MusicXML da mesma música viram uma música só.</span>
          <input id="importar-arquivos" className="dropZone__input" type="file" multiple accept={ACCEPT} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        </label>

        <details className="form__fieldset">
          <summary className="form__label">Lista com os nomes (opcional)</summary>
          <span className="form__help">Uma linha por arquivo: arquivo ; título ; músicos ; nível ; categorias ; arranjo. Sem a lista, o título sai do nome do arquivo.</span>
          <textarea id="importar-lista" className="form__input" rows={6} value={manifest} onChange={(e) => setManifest(e.target.value)} aria-label="Lista com os nomes" />
        </details>

        {rows.length > 0 && (
          <section className="page__section">
            <h2 className="page__sectionTitle">{files.length} arquivos, {rows.length} músicas</h2>
            <ul className="importList">
              {rows.map((r) => (
                <li key={r.key} className={`importList__item${r.action === 'nada' ? ' importList__item-off' : ''}`}>
                  <span className="importList__title">{r.title}</span>
                  <span className="importList__meta">
                    {[r.people.join(', '), LEVEL_LABEL[r.level], r.arrangement].filter(Boolean).join(' · ')}
                  </span>
                  <span className="importList__files">
                    {[r.sheet !== undefined && files[r.sheet].name, r.score !== undefined && files[r.score].name].filter(Boolean).join(' + ')}
                    {r.extra.length > 0 && ` (fica de fora: ${r.extra.map((i) => files[i].name).join(', ')})`}
                  </span>
                  <span className="importList__action">{ACTION_LABEL[r.action]}</span>
                </li>
              ))}
            </ul>
            {ignored.length > 0 && <p className="form__help">Ignorados (não são partitura): {ignored.map((f) => f.name).join(', ')}.</p>}
          </section>
        )}

        {error && <p className="form__error" role="alert">{error}</p>}
        {done && <p className="form__help" role="status">{done} <Link to="/repertorio">Ver o repertório</Link></p>}

        <div className="form__row">
          <button className="button button-primary" type="button" disabled={saving || todo.length === 0} onClick={() => void save()}>
            {saving ? 'Importando…' : todo.length === 1 ? 'Importar 1 música' : `Importar ${todo.length} músicas`}
          </button>
          {files.length > 0 && (
            <button className="button button-ghost" type="button" disabled={saving} onClick={() => setFiles([])}>
              Limpar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
