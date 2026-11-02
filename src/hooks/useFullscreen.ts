// Tela cheia de verdade onde o navegador deixa (notebook, Android, iPad recente).
// No iPhone a API não existe: o modo imersivo continua, só sem esconder a barra do navegador.

import { useEffect, useState } from 'react';

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
/**
 * Largura de um elemento, atualizada quando ele muda de tamanho. Usa um ref de função: funciona também quando o
 * elemento só aparece depois (a pauta de um exercício que surge ao começar), o que um ref de objeto lido uma vez
 * no primeiro desenho não pegava.
 */
export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width];
}
