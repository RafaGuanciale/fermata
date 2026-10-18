// Grava cada visita a uma página: quanto tempo com a aba visível e quantas notas você tocou nela.
// "Abriu a música e fechou sem tocar" também é dado. Sai uma visita nova quando você troca de página ou
// volta para a aba depois de sair dela.

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNoteInput } from '../input/useNoteInput';
import { countViewNote, endView, startView } from './activity';
import { viewArea } from './areas';

export default function ActivityTracker() {
  const { pathname } = useLocation();
  const { subscribe } = useNoteInput();
  const pathRef = useRef(pathname);

  useEffect(() => subscribe((e) => { if (e.type === 'on') countViewNote(); }), [subscribe]);

  useEffect(() => {
    pathRef.current = pathname;
    if (document.visibilityState === 'visible') startView(pathname);
    return () => endView(viewArea(pathname));
  }, [pathname]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') endView(viewArea(pathRef.current));
      else startView(pathRef.current);
    };
    // Fechou a aba ou recarregou: grava a visita aberta.
    const onHide = () => endView(viewArea(pathRef.current));
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  return null;
}
