// Leitura de notas em tela de foco: barra de progresso da rodada no topo, a pauta grande no meio.

import { useCallback, useState } from 'react';
import { CloseIcon } from '../components/Icons';
import NoteReadingTrainer from '../reading/NoteReadingTrainer';

export default function NoteReadingPage({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const onProgress = useCallback((done: number, total: number) => setProgress({ done, total }), []);
  return (
    <div className="focus">
      <header className="focus__top">
        <button className="focus__icon" type="button" onClick={onClose} aria-label="Fechar a leitura de notas">
          <CloseIcon className="focus__glyph" />
        </button>
        <span className="reading__title">Leitura de notas</span>
        {progress && (
          <div className="focus__progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={`${progress.done} de ${progress.total} notas`}>
            {Array.from({ length: progress.total }, (_, k) => (
              <span key={k} className={'focus__seg' + (k < progress.done ? ' focus__seg-done' : k === progress.done ? ' focus__seg-current' : '')} />
            ))}
          </div>
        )}
      </header>
      <div className="focus__body">
        <div className="focus__step">
          <NoteReadingTrainer onProgress={onProgress} />
        </div>
      </div>
    </div>
  );
}
