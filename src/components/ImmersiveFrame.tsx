// Moldura do modo imersivo: um popup arredondado, quase do tamanho da tela,
// com o app desfocado atrás. Esc ou o X fecham e voltam para onde você estava.

import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { exitFullscreen, useFullscreenState } from '../hooks/useFullscreen';

export interface ImmersiveState {
  background?: Location;
}

/** Fecha o popup: volta no histórico se veio de dentro do app, senão vai para `fallback`. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCloseImmersive(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const fromApp = Boolean((location.state as ImmersiveState | null)?.background);
  return () => {
    exitFullscreen();
    if (fromApp) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

export default function ImmersiveFrame({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  const isFull = useFullscreenState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className={'immersive' + (isFull ? ' immersive-full' : '')}>
      <div className="immersive__backdrop" onClick={onClose} aria-hidden />
      <div className="immersive__frame" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
