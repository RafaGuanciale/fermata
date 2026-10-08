import { useEffect, useRef, useState } from 'react';
import { useMetronome } from '../metronome/MetronomeProvider';
import { BEAT_OPTIONS, MAX_BPM, MIN_BPM, tempoName } from '../metronome/tempo';
import { MetronomeIcon, MinusIcon, PlusIcon } from './Icons';

/**
 * Botão do metrônomo com o painel de ajuste. Fica no rodapé do teclado e no topo dos popups
 * de treino e partitura. `placement` diz para onde o painel abre.
 */
export default function MetronomeButton({ placement = 'up', className = '' }: { placement?: 'up' | 'down'; className?: string }) {
  const m = useMetronome();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    <div className={'metronome ' + className} ref={wrapRef}>
      <button
        className={'pill metronome__trigger' + (m.running ? ' metronome__trigger-on' : '')}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        title="Metrônomo"
      >
        <MetronomeIcon className="pill__icon" />
        <span className="metronome__triggerBpm">{m.bpm}</span>
        {m.running && <span className={'metronome__pulse' + (m.beat === 0 && m.accent ? ' metronome__pulse-strong' : '')} key={m.beat} aria-hidden />}
      </button>

      {open && (
        <div className={'metronome__panel metronome__panel-' + placement} role="dialog" aria-label="Metrônomo">
          <div className="metronome__head">
            <span className="page__eyebrow">Metrônomo · {tempoName(m.bpm)}</span>
          </div>

          <div className="metronome__bpmRow">
            <button className="metronome__step" type="button" onClick={() => m.setBpm(m.bpm - 5)} aria-label="Menos 5 BPM">−5</button>
            <button className="metronome__step metronome__step-round" type="button" onClick={() => m.setBpm(m.bpm - 1)} aria-label="Menos 1 BPM">
              <MinusIcon className="metronome__stepIcon" />
            </button>
            <label className="metronome__bpm">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_BPM}
                max={MAX_BPM}
                value={m.bpm}
                onChange={(e) => e.target.value && m.setBpm(Number(e.target.value))}
                aria-label="Batidas por minuto"
              />
              <span>BPM</span>
            </label>
            <button className="metronome__step metronome__step-round" type="button" onClick={() => m.setBpm(m.bpm + 1)} aria-label="Mais 1 BPM">
              <PlusIcon className="metronome__stepIcon" />
            </button>
            <button className="metronome__step" type="button" onClick={() => m.setBpm(m.bpm + 5)} aria-label="Mais 5 BPM">+5</button>
          </div>

          <input
            className="metronome__slider"
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={m.bpm}
            onChange={(e) => m.setBpm(Number(e.target.value))}
            aria-label="Ajustar BPM"
          />

          <div className="metronome__beats" aria-hidden>
            {Array.from({ length: m.beats }, (_, i) => (
              <span key={i} className={'metronome__dot' + (i === 0 && m.accent ? ' metronome__dot-accent' : '') + (m.beat === i ? ' metronome__dot-on' : '')} />
            ))}
          </div>

          <div className="metronome__row">
            <span className="metronome__label">Tempos</span>
            <div className="segmented" role="group" aria-label="Tempos por compasso">
              {BEAT_OPTIONS.map((b) => (
                <button key={b} type="button" className={'segmented__option' + (m.beats === b ? ' segmented__option-active' : '')} aria-pressed={m.beats === b} onClick={() => m.setBeats(b)}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="metronome__row">
            <label className="metronome__check">
              <input type="checkbox" checked={m.accent} onChange={(e) => m.setAccent(e.target.checked)} />
              Acentuar o primeiro tempo
            </label>
          </div>

          <div className="metronome__row">
            <span className="metronome__label">Volume</span>
            <input className="metronome__slider metronome__slider-small" type="range" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} aria-label="Volume" />
          </div>

          <div className="metronome__actions">
            <button className="button button-secondary" type="button" onClick={m.tap}>
              Bater o tempo
            </button>
            <button className={'button ' + (m.running ? 'button-secondary' : 'button-primary')} type="button" onClick={m.toggle}>
              {m.running ? 'Parar' : 'Começar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
