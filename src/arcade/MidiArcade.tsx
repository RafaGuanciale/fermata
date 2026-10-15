// Fase do arcade a partir de um MIDI importado: escolhe a parte da melodia e a do baixo no menu do jogo.

import { useMemo } from 'react';
import ArcadeGame from './ArcadeGame';
import { midiTune, parseMidi, partLabel, type MidiFile } from './midi';
import { deleteMidi, updateMidi, useArcadeMidi } from './midiStore';

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
  const tune = useMemo(() => (m && parsed ? midiTune(parsed, { melody: m.melody, bass: m.bass }, { id: m.id, title: m.title, artist: m.artist ?? '' }) : null), [m, parsed]);

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

  const save = (patch: { title?: string; artist?: string }) => {
    const title = patch.title?.trim();
    if (title !== undefined && (!title || title === m.title)) return;
    if (patch.artist !== undefined && patch.artist.trim() === (m.artist ?? '')) return;
    void updateMidi(m.id, title !== undefined ? { title } : { artist: patch.artist!.trim() });
  };

  const extra = (
    <div className="arcadeParts">
      <div className="arcadeParts__names">
        <label className="arcadeParts__field">
          <span className="arcadeParts__label">Música</span>
          <input className="arcadeParts__input" defaultValue={m.title} key={`t${m.title}`} onBlur={(e) => save({ title: e.target.value })} />
        </label>
        <label className="arcadeParts__field">
          <span className="arcadeParts__label">Artista</span>
          <input
            className={'arcadeParts__input' + (m.artist ? '' : ' arcadeParts__input-missing')}
            defaultValue={m.artist ?? ''}
            key={`a${m.artist ?? ''}`}
            placeholder="Quem canta ou toca?"
            onBlur={(e) => save({ artist: e.target.value })}
          />
        </label>
      </div>
      {parsed.parts.length > 1 && (
        <>
          <label className="arcadeParts__field">
            <span className="arcadeParts__label">Melodia</span>
            <select className="arcadeParts__select" value={m.melody} onChange={(e) => void updateMidi(m.id, { melody: Number(e.target.value) })}>
              {parsed.parts.map((p) => <option key={p.index} value={p.index}>{partLabel(p, parsed.parts)}</option>)}
            </select>
          </label>
          <label className="arcadeParts__field">
            <span className="arcadeParts__label">Baixo do difícil</span>
            <select className="arcadeParts__select" value={m.bass ?? ''} onChange={(e) => void updateMidi(m.id, { bass: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">Voz grave da própria melodia</option>
              {parsed.parts.filter((p) => p.index !== m.melody).map((p) => <option key={p.index} value={p.index}>{partLabel(p, parsed.parts)}</option>)}
            </select>
          </label>
        </>
      )}
      <button className="linkButton arcadeParts__delete" type="button" onClick={() => void deleteMidi(m.id).then(onClose)}>
        Apagar este MIDI do arcade
      </button>
    </div>
  );

  return <ArcadeGame tune={tune} onClose={onClose} extraMenu={extra} />;
}
