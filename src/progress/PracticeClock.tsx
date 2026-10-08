// Conta os minutos em que você tocou alguma nota, em qualquer tela (treino, música, teclado do rodapé).
// Um minuto conta se teve pelo menos uma tecla. Guarda por dia e por aparelho; o Progresso soma.

import { useEffect } from 'react';
import { useNoteInput } from '../input/useNoteInput';
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

    const unsubscribe = subscribe((e) => {
      if (e.type !== 'on') return;
      const minute = Math.floor(Date.now() / 60000);
      if (minute === lastMinute) return;
      lastMinute = minute;
      pending++;
      if (timer === null) timer = window.setTimeout(() => void flush(), 8000);
    });
    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [subscribe]);

  return null;
}
