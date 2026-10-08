// Leitor de partitura em tela cheia. PDF renderizado com PDF.js (funciona igual no notebook,
// tablet e celular, inclusive no Android, onde o navegador não mostra PDF sozinho).

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { db } from '../db/db';
import { getFile, markOpened } from '../repertoire/repo';
import { CloseIcon, ExpandIcon, MinusIcon, PlusIcon } from '../components/Icons';
import ThemeToggle from '../components/ThemeToggle';
import { canFullscreen, enterFullscreen, exitFullscreen, useElementWidth, useFullscreenState } from '../hooks/useFullscreen';

GlobalWorkerOptions.workerSrc = workerSrc;

const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2];

function PdfPage({ pdf, pageNumber, width }: { pdf: PDFDocumentProxy; pageNumber: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, viewport });
      await task.promise.catch(() => {});
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, width]);
  return <canvas className="viewer__page" ref={canvasRef} aria-label={`Página ${pageNumber}`} />;
}

export default function SheetViewerPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const isFull = useFullscreenState();
  const [areaRef, areaWidth] = useElementWidth<HTMLDivElement>();
  const [title, setTitle] = useState('');
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    let url: string | null = null;
    let doc: PDFDocumentProxy | null = null;
    void (async () => {
      const piece = await db.pieces.get(id);
      if (!piece?.fileId) return setError('Esta peça não tem partitura.');
      setTitle(piece.title);
      void markOpened(id);
      const file = await getFile(piece.fileId);
      if (!file) return setError('O arquivo não está neste aparelho.');
      if (file.type.startsWith('image/')) {
        url = URL.createObjectURL(file.blob);
        setImageUrl(url);
        return;
      }
      try {
        doc = await getDocument({ data: new Uint8Array(await file.blob.arrayBuffer()) }).promise;
        setPdf(doc);
      } catch {
        setError('Não deu para abrir este PDF. Ele pode estar protegido ou corrompido.');
      }
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
      void doc?.destroy();
    };
  }, [id]);

  const leave = () => {
    exitFullscreen();
    navigate(`/repertorio/peca/${id}`);
  };

  // Largura da página: cabe na tela no zoom 100%; tablets em pé ficam com a página inteira na largura.
  const fitWidth = Math.min(areaWidth - 16, 1100);
  const pageWidth = Math.max(240, Math.round(fitWidth * ZOOMS[zoom]));

  return (
    <div className="viewer">
      <header className="session__bar viewer__bar">
        <button className="session__icon" type="button" onClick={leave} aria-label="Fechar partitura" title="Fechar partitura">
          <CloseIcon className="session__iconSvg" />
        </button>
        <div className="session__title">
          <p className="page__eyebrow">Partitura</p>
          <h1 className="session__name">{title}</h1>
        </div>
        <div className="session__controls">
          <div className="segmented" role="group" aria-label="Zoom">
            <button type="button" className="segmented__option" onClick={() => setZoom((z) => Math.max(0, z - 1))} aria-label="Diminuir" disabled={zoom === 0}>
              <MinusIcon className="pill__icon" />
            </button>
            <span className="viewer__zoom">{Math.round(ZOOMS[zoom] * 100)} %</span>
            <button type="button" className="segmented__option" onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} aria-label="Aumentar" disabled={zoom === ZOOMS.length - 1}>
              <PlusIcon className="pill__icon" />
            </button>
          </div>
          {canFullscreen() && !isFull && (
            <button className="pill pill-icon" type="button" onClick={enterFullscreen} aria-label="Tela cheia" title="Tela cheia">
              <ExpandIcon className="pill__icon" />
            </button>
          )}
          <ThemeToggle iconOnly />
        </div>
      </header>
      <div className="viewer__area" ref={areaRef}>
        {error && <p className="emptyState__body viewer__msg">{error}</p>}
        {!error && !pdf && !imageUrl && <p className="emptyState__body viewer__msg">Abrindo a partitura…</p>}
        {imageUrl && <img className="viewer__page" src={imageUrl} alt={`Partitura de ${title}`} style={{ width: pageWidth }} />}
        {pdf && areaWidth > 0 &&
          Array.from({ length: pdf.numPages }, (_, i) => <PdfPage key={i} pdf={pdf} pageNumber={i + 1} width={pageWidth} />)}
      </div>
    </div>
  );
}
