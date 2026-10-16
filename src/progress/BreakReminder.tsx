// Aviso de pausa (breaks.ts): aparece por cima de tudo, discreto, e some quando você toca em "Ok".

import { useEffect, useRef, useState } from 'react';
import { useNoteInput } from '../input/useNoteInput';
import { BREAK_AFTER_MIN, breakDue } from './breaks';

const OFF_KEY = 'fermata-break-off';

export default function BreakReminder() {
  const { subscribe } = useNoteInput();
  const minutes = useRef<number[]>([]);
  const lastNudge = useRef<number | null>(null);
  const [show, setShow] = useState(false);
  const [off, setOff] = useState(() => {
    try {
      return localStorage.getItem(OFF_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (off) return;
    return subscribe((e) => {
      if (e.type !== 'on') return;
      const m = Math.floor(Date.now() / 60000);
      const list = minutes.current;
      if (list[list.length - 1] !== m) list.push(m);
      if (list.length > 600) list.splice(0, 300);
      if (breakDue(list, Date.now(), lastNudge.current)) {
        lastNudge.current = Date.now();
        setShow(true);
      }
    });
  }, [subscribe, off]);

  if (!show || off) return null;
  return (
    <div className="breakNote" role="status">
      <p className="breakNote__text">
        <strong>{BREAK_AFTER_MIN} minutos tocando.</strong> Faça uma pausa de 3 minutos: solte os ombros, gire os punhos, abra e feche as mãos e beba água.
      </p>
      <div className="breakNote__actions">
        <button className="button button-primary button-small" type="button" onClick={() => setShow(false)}>Ok</button>
        <button
          className="linkButton breakNote__off"
          type="button"
          onClick={() => {
            setOff(true);
            try {
              localStorage.setItem(OFF_KEY, '1');
            } catch {
              // vale só agora
            }
          }}
        >
          Não lembrar mais
        </button>
      </div>
    </div>
  );
}
