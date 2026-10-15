// Conta os minutos de piano, só onde vale (practiceRoutes.ts): onde você toca, um minuto conta se teve pelo
// menos uma nota; em lições e consulta, conta também o minuto lendo (página visível e algum movimento).
// Guarda por dia e por aparelho; o Progresso e as metas somam.

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNoteInput } from '../input/useNoteInput';
import { practiceKind, type PracticeKind } from './practiceRoutes';
import { db } from '../db/db';
import { dayKey } from '../training/progress';

const DEVICE_KEY = 'fermata-device-id';

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID().slice(0, 8);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'aparelho';
  }
}

export default function PracticeClock() {
  const { subscribe } = useNoteInput();
  const { pathname } = useLocation();
  const kindRef = useRef<PracticeKind | null>(practiceKind(pathname));
  kindRef.current = practiceKind(pathname);

  useEffect(() => {
    const device = deviceId();
    let lastMinute = -1;
    let pending = 0;
    let timer: number | null = null;

    const flush = async () => {
      timer = null;
      if (!pending) return;
      const add = pending;
      pending = 0;
      const day = dayKey(Date.now());
      const id = `${day}:${device}`;
      try {
        await db.transaction('rw', db.practice, async () => {
          const cur = await db.practice.get(id);
          await db.practice.put({ ...(cur ?? {}), id, day, device, minutes: (cur?.minutes ?? 0) + add });
        });
      } catch (err) {
        pending += add;
        console.error('[Fermata] Não foi possível salvar o tempo de prática', err);
      }
    };

    const count = () => {
      const minute = Math.floor(Date.now() / 60000);
      if (minute === lastMinute) return;
      lastMinute = minute;
      pending++;
      if (timer === null) timer = window.setTimeout(() => void flush(), 8000);
    };

    const unsubscribe = subscribe((e) => {
      if (e.type === 'on' && kindRef.current) count();
    });
    // Lendo uma lição ou a consulta: o minuto conta se houve algum movimento com a página visível.
    const onActivity = () => {
      if (kindRef.current === 'estudar' && document.visibilityState === 'visible') count();
    };
    const activity = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchmove'] as const;
    for (const ev of activity) window.addEventListener(ev, onActivity, { passive: true, capture: true });
    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      unsubscribe();
      for (const ev of activity) window.removeEventListener(ev, onActivity, { capture: true });
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [subscribe]);

  return null;
}
