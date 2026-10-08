import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, type LearnStatus, type Level } from '../db/db';
import { CATEGORIES, LEVEL_LABEL, STATUS_LABEL, STATUS_ORDER, parsePeople } from '../repertoire/catalog';
import { ACCEPTED_FILES, ACCEPTED_SCORE, formatBytes, savePiece, validateFile, validateScoreFile } from '../repertoire/repo';
import { BackIcon, FileIcon, UploadIcon } from '../components/Icons';

export default function PieceFormPage() {
  const { id } = useParams();
  const editingId = id ? Number(id) : undefined;
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [people, setPeople] = useState('');
  const [arrangement, setArrangement] = useState('');
  const [categories, setCategories] = useState<string[]>(() => (params.get('categoria') ? [params.get('categoria')!] : []));
  const [level, setLevel] = useState<Level>('facil');
  const [status, setStatus] = useState<LearnStatus>('wish');
  const [file, setFile] = useState<File | null | undefined>(undefined);
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number } | null>(null);
  const [score, setScore] = useState<File | null | undefined>(undefined);
  const [currentScore, setCurrentScore] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    void (async () => {
      const p = await db.pieces.get(editingId);
      if (!p) return navigate('/repertorio', { replace: true });
      setTitle(p.title);
      setPeople(p.people.join(', '));
      setArrangement(p.arrangement);
      setCategories(p.categories);
      setLevel(p.level);
      setStatus(p.status);
      if (p.fileId) {
        const f = await db.files.get(p.fileId);
        if (f) setCurrentFile({ name: f.name, size: f.size });
      }
      if (p.scoreFileId) {
        const sf = await db.files.get(p.scoreFileId);
        if (sf) setCurrentScore({ name: sf.name, size: sf.size });
      }
    })();
  }, [editingId, navigate]);

  const toggleCategory = (slug: string) =>
    setCategories((cs) => (cs.includes(slug) ? cs.filter((c) => c !== slug) : [...cs, slug]));

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    const problem = validateFile(f);
    setError(problem);
    if (!problem) setFile(f);
  };

  const pickScore = (f: File | undefined) => {
    if (!f) return;
    const problem = validateScoreFile(f);
    setError(problem);
    if (!problem) setScore(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Dê um nome para a peça.');
    setSaving(true);
    try {
      const savedId = await savePiece(
        { title: title.trim(), people: parsePeople(people), arrangement: arrangement.trim(), categories, level, status },
        { sheet: file, score },
        editingId,
      );
      navigate(`/repertorio/peca/${savedId}`, { replace: true });
    } catch (err) {
      console.error('[Fermata] Erro ao salvar peça', err);
      setError('Não deu para salvar. O navegador pode estar sem espaço; tente um PDF menor.');
      setSaving(false);
    }
  };

  const shownFile = file ? { name: file.name, size: file.size } : file === null ? null : currentFile;
  const shownScore = score ? { name: score.name, size: score.size } : score === null ? null : currentScore;

  return (
    <>
      <Link className="page__back" to={editingId ? `/repertorio/peca/${editingId}` : '/repertorio'}>
        <BackIcon className="page__backIcon" />
        {editingId ? 'Voltar para a peça' : 'Repertório'}
      </Link>
      <header className="page__header">
        <h1 className="page__title">{editingId ? 'Editar peça' : 'Nova peça'}</h1>
      </header>

      <form className="form" onSubmit={submit} noValidate>
        <div className="form__row">
          <label className="form__field" htmlFor="peca-titulo">
            <span className="form__label">Título</span>
            <input id="peca-titulo" className="form__input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Asa Branca" required />
          </label>
        </div>
        <div className="form__row form__row-2">
          <label className="form__field" htmlFor="peca-pessoas">
            <span className="form__label">Compositor ou artista</span>
            <input id="peca-pessoas" className="form__input" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Luiz Gonzaga, Humberto Teixeira" />
            <span className="form__help">Separe vários nomes com vírgula.</span>
          </label>
          <label className="form__field" htmlFor="peca-arranjo">
            <span className="form__label">Arranjo ou fonte</span>
            <input id="peca-arranjo" className="form__input" value={arrangement} onChange={(e) => setArrangement(e.target.value)} placeholder="arr. Lucas Pinhel" />
          </label>
        </div>

        <fieldset className="form__fieldset">
          <legend className="form__label">Categorias</legend>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c.slug} type="button" className={'chip' + (categories.includes(c.slug) ? ' chip-active' : '')} aria-pressed={categories.includes(c.slug)} onClick={() => toggleCategory(c.slug)}>
                {c.title}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="form__fieldset">
          <legend className="form__label">Nível</legend>
          <div className="choice choice-3" role="radiogroup" aria-label="Nível">
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <button key={l} type="button" role="radio" className={'choice__option' + (level === l ? ' choice__option-active' : '')} aria-checked={level === l} onClick={() => setLevel(l)}>
                {LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="form__fieldset">
          <legend className="form__label">Em que ponto você está</legend>
          <div className="choice choice-4" role="radiogroup" aria-label="Estado">
            {STATUS_ORDER.map((s) => (
              <button key={s} type="button" role="radio" className={'choice__option' + (status === s ? ' choice__option-active' : '')} aria-checked={status === s} onClick={() => setStatus(s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form__fieldset">
          <span className="form__label">Partitura</span>
          {shownFile ? (
            <div className="fileBox">
              <FileIcon className="fileBox__icon" />
              <span className="fileBox__name">{shownFile.name}</span>
              <span className="fileBox__size">{formatBytes(shownFile.size)}</span>
              <button type="button" className="button button-ghost button-small" onClick={() => setFile(null)}>
                Remover
              </button>
            </div>
          ) : (
            <label
              className="dropZone"
              htmlFor="peca-arquivo"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files[0]);
              }}
            >
              <UploadIcon className="dropZone__icon" />
              <span className="dropZone__title">Escolha o PDF ou uma foto da partitura</span>
              <span className="form__help">Ou arraste o arquivo para cá. Fica salvo neste aparelho e, se você entrou com a conta Permana, também na nuvem.</span>
              <input id="peca-arquivo" className="dropZone__input" type="file" accept={ACCEPTED_FILES} onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
          )}
        </div>

        <div className="form__fieldset">
          <span className="form__label">Notas para tocar (opcional)</span>
          {shownScore ? (
            <div className="fileBox">
              <FileIcon className="fileBox__icon" />
              <span className="fileBox__name">{shownScore.name}</span>
              <span className="fileBox__size">{formatBytes(shownScore.size)}</span>
              <button type="button" className="button button-ghost button-small" onClick={() => setScore(null)}>
                Remover
              </button>
            </div>
          ) : (
            <label
              className="dropZone dropZone-small"
              htmlFor="peca-musicxml"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickScore(e.dataTransfer.files[0]);
              }}
            >
              <UploadIcon className="dropZone__icon" />
              <span className="dropZone__title">MusicXML exportado do MuseScore</span>
              <span className="form__help">Com ele, o app sabe as notas e você pode estudar a peça tocando junto. No MuseScore: Arquivo → Exportar → MusicXML.</span>
              <input id="peca-musicxml" className="dropZone__input" type="file" accept={ACCEPTED_SCORE} onChange={(e) => pickScore(e.target.files?.[0])} />
            </label>
          )}
        </div>

        {error && <p className="form__error" role="alert">{error}</p>}

        <div className="form__actions">
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar peça'}
          </button>
          <Link className="button button-secondary" to={editingId ? `/repertorio/peca/${editingId}` : '/repertorio'}>
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
