// Sem tirar as mãos do piano: começar a passada tocando uma tecla, o pedal ou a barra de espaço.
// Com vários exercícios na mesma página, só o "ativo" responde: o último em que você mexeu, ou, no modo foco,
// o que está na tela (ele se ativa sozinho). Um só ativo por vez em todo o app.

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react';

let active: string | null = null;
const listeners = new Set<() => void>();

function setActive(id: string | null) {
  if (active === id) return;
  active = id;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** No modo foco (lição, Treino em tela cheia), o exercício na tela se ativa ao aparecer. */
export const HandsFreeAuto = createContext(false);

let seq = 0;

/** Registra um exercício. `isActive`: este responde ao piano agora. `claim`: tornar este o ativo. */
export function useHandsFree() {
  const auto = useContext(HandsFreeAuto);
  const idRef = useRef<string>('');
  if (!idRef.current) idRef.current = `hf-${++seq}`;
  const id = idRef.current;
  const isActive = useSyncExternalStore(subscribe, () => active === id, () => false);
  const claim = useCallback(() => setActive(id), [id]);
  useEffect(() => {
    if (auto) setActive(id);
    return () => {
      if (active === id) setActive(null);
    };
  }, [auto, id]);
  return { isActive, claim };
}

const AUTO_KEY = 'fermata-auto-next';

/** "Seguir sozinho": a próxima passada começa sem clique. Ligado por padrão. */
export function getAutoNext(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setAutoNext(on: boolean) {
  try {
    localStorage.setItem(AUTO_KEY, on ? '1' : '0');
  } catch {
    // sem armazenamento: vale só agora
  }
}

/** Teclas de atalho valem fora de campos de texto e de botões (o botão já reage ao espaço sozinho). */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'BUTTON' || el.isContentEditable);
}
