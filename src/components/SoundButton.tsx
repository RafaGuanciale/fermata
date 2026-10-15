// Som das notas: o botão mostra o volume e abre um painel com o controle. Fica no rodapé do teclado e no arcade.

import { useEffect, useRef, useState } from 'react';
import { useLiveSound } from '../audio/LiveSound';
import { SpeakerIcon } from './Icons';

export default function SoundButton({ placement = 'up', className = '' }: { placement?: 'up' | 'down'; className?: string }) {
  const sound = useLiveSound();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pct = Math.round(sound.volume * 100);
  const audible = sound.on && pct > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div className={'metronome soundButton ' + className} ref={wrapRef}>
      <button
        className={'pill metronome__trigger' + (audible ? ' soundButton__trigger-on' : '')}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        title="Som das notas que você toca"
      >
        <SpeakerIcon className="pill__icon" />
        <span className="soundButton__value">{audible ? `${pct}%` : 'Mudo'}</span>
      </button>

      {open && (
        <div className={'metronome__panel metronome__panel-' + placement + ' soundButton__panel'} role="dialog" aria-label="Som das notas">
          <div className="metronome__head">
            <span className="page__eyebrow">Som das notas</span>
          </div>
          <p className="soundButton__lead">O app toca baixinho cada nota que você toca, em todas as telas. Com o piano desligado, é o som que você ouve.</p>
          <label className="soundButton__row">
            <span className="soundButton__label">Volume</span>
            <input
              className="metronome__slider soundButton__slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={sound.on ? pct : 0}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                if (!sound.on && v > 0) sound.setOn(true);
                sound.setVolume(v);
              }}
              aria-label="Volume das notas"
            />
            <span className="soundButton__pct">{sound.on ? pct : 0}%</span>
          </label>
          <button className="button button-secondary button-small" type="button" onClick={() => sound.setOn(!sound.on)}>
            {sound.on ? 'Desligar o som das notas' : 'Ligar o som das notas'}
          </button>
          {sound.on && !sound.ready && <p className="soundButton__lead">Clique em qualquer lugar da página para o navegador liberar o som.</p>}
        </div>
      )}
    </div>
  );
}
