// Fase do arcade a partir de um MIDI importado: escolhe a parte da melodia e a do baixo no menu do jogo.

import { useMemo } from 'react';
import ArcadeGame from './ArcadeGame';
import { midiTune, parseMidi, partLabel, type MidiFile } from './midi';
import { updateMidi, useArcadeMidi } from './midiStore';

function safeParse(data: ArrayBuffer): MidiFile | null {
  try {
    return parseMidi(data);
  } catch {
    return null;
  }
}

export default function MidiArcade({ id, onClose }: { id: string; onClose: () => void }) {
  const m = useArcadeMidi(id);
  const parsed = useMemo(() => (m ? safeParse(m.data) : null), [m]);
  const tune = useMemo(() => (m && parsed ? midiTune(parsed, { melody: m.melody, bass: m.bass }, { id: m.id, title: m.title }) : null), [m, parsed]);

  if (m === undefined) return <div className="arcade" />;
  if (!m || !parsed || !tune) {
    return (
      <div className="arcade arcade-empty">
        <div className="arcade__overlay">
          <h2 className="arcade__overlayTitle">Não achei este MIDI</h2>
          <p className="arcade__overlayLead">Ele pode ter sido apagado, ou foi importado em outro aparelho (os MIDIs ficam só onde você importou).</p>
          <button className="button button-primary" type="button" onClick={onClose}>Voltar ao arcade</button>
        </div>
      </div>
    );
  }

  const extra = parsed.parts.length > 1 && (
    <div className="arcadeParts">
      <label className="arcadeParts__field">
        <span className="arcadeParts__label">Melodia</span>
        <select className="arcadeParts__select" value={m.melody} onChange={(e) => void updateMidi(m.id, { melody: Number(e.target.value) })}>
          {parsed.parts.map((p) => <option key={p.index} value={p.index}>{partLabel(p)}</option>)}
        </select>
      </label>
      <label className="arcadeParts__field">
        <span className="arcadeParts__label">Baixo do difícil</span>
        <select className="arcadeParts__select" value={m.bass ?? ''} onChange={(e) => void updateMidi(m.id, { bass: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Voz grave da própria melodia</option>
          {parsed.parts.filter((p) => p.index !== m.melody).map((p) => <option key={p.index} value={p.index}>{partLabel(p)}</option>)}
        </select>
      </label>
    </div>
  );

  return <ArcadeGame tune={tune} onClose={onClose} extraMenu={extra || undefined} />;
}
