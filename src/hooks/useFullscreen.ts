// Tela cheia de verdade onde o navegador deixa (notebook, Android, iPad recente).
// No iPhone a API não existe: o modo imersivo continua, só sem esconder a barra do navegador.

import { useEffect, useRef, useState } from 'react';
import type React from 'react';

export function canFullscreen(): boolean {
  return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
}

/** Chame dentro de um clique (o navegador só libera tela cheia a partir de um gesto). */
export function enterFullscreen(): void {
  if (!canFullscreen() || document.fullscreenElement) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
    // recusado (ex.: sem gesto): segue sem tela cheia
  });
}

export function exitFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

/** Estado da tela cheia; sai dela quando o componente desmonta. */
export function useFullscreenState(): boolean {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      exitFullscreen();
    };
  }, []);
  return on;
}

/** Largura de um elemento, atualizada quando ele muda de tamanho. */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
