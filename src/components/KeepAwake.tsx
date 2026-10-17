// Pede ao navegador para não apagar a tela enquanto você estuda (Screen Wake Lock). Regra em hooks/keepAwake.ts.
// Navegador sem suporte: não faz nada (o notebook segue a configuração de energia do sistema).

import { useEffect } from 'react';
import { useNoteInput } from '../input/useNoteInput';
import { shouldKeepAwake } from '../hooks/keepAwake';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', cb: () => void) => void;
}

export default function KeepAwake() {
  const { subscribe } = useNoteInput();

  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wakeLock) return;
    let last = Date.now();
    let lock: WakeLockSentinelLike | null = null;
    let asking = false;

    const update = async () => {
      const want = shouldKeepAwake(last, Date.now(), document.visibilityState === 'visible');
      if (want && (!lock || lock.released) && !asking) {
        asking = true;
        try {
          lock = await wakeLock.request('screen');
          lock.addEventListener('release', () => {
            lock = null;
          });
        } catch {
          // recusado (economia de bateria, aba escondida): tenta de novo na próxima atividade
        } finally {
          asking = false;
        }
      } else if (!want && lock && !lock.released) {
        const l = lock;
        lock = null;
        await l.release().catch(() => undefined);
      }
    };

    const activity = () => {
      last = Date.now();
      if (!lock || lock.released) void update();
    };
    const offNotes = subscribe(activity);
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const ev of events) window.addEventListener(ev, activity, { passive: true, capture: true });
    // A aba escondida perde o pedido; ao voltar, pede de novo.
    const onVisible = () => void update();
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void update(), 30_000);
    void update();
    return () => {
      offNotes();
      for (const ev of events) window.removeEventListener(ev, activity, { capture: true });
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      void lock?.release().catch(() => undefined);
    };
  }, [subscribe]);

  return null;
}
