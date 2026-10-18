// Grava cada visita a uma página: quanto tempo com a aba visível, quanto disso foi útil e quantas notas você
// tocou. Útil segue as regras do relógio de prática (practiceRoutes.ts): onde se toca, o pedaço de 30 s com nota
// (ou com o app tocando o trecho para você ouvir); em lições e consulta, o pedaço em que você mexeu na página.
// Hoje, Progresso, listas e conta nunca contam. "Abriu a música e fechou sem tocar" também é dado.
// Sai uma visita nova quando você troca de página ou volta para a aba depois de sair dela.

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNoteInput } from '../input/useNoteInput';
import { countViewNote, endView, markViewActive, startView } from './activity';
import { practiceKind } from '../progress/practiceRoutes';
import { viewArea } from './areas';

export default function ActivityTracker() {
  const { pathname } = useLocation();
  const { subscribe } = useNoteInput();
  const pathRef = useRef(pathname);

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== 'on') return;
        countViewNote();
        const kind = practiceKind(pathRef.current);
        if (kind === 'tocar' || kind === 'livre') markViewActive();
      }),
    [subscribe],
  );

  // Lendo uma lição ou a consulta: conta o pedaço em que você mexeu na página.
  useEffect(() => {
    const onActivity = () => {
      if (document.visibilityState === 'visible' && practiceKind(pathRef.current) === 'estudar') markViewActive();
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchmove'] as const;
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true, capture: true });
    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity, { capture: true });
    };
  }, []);

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
