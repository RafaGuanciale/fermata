// Lista de gravações: ouvir, renomear, baixar o .mid, apagar e comparar duas.
// Sem `sourceId`: todas (Tocar livre). Com `sourceId`: só os marcos daquela música.

import { useMemo, useState } from 'react';
import type { Recording } from '../db/db';
import { CheckIcon, CrossIcon, DownloadIcon, PlayIcon, StopIcon, TrashIcon } from '../components/Icons';
import { deleteRecording, factsOf, renameRecording, useRecordings } from './repo';
import { usePlayback } from './playback';
import { compareTakes, midiFileName, recordingStats, toMidiFile } from './take';
import Roll from './Roll';

const when = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function duration(ms: number) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}

function download(r: Recording) {
  const f = factsOf(r);
  const bytes = toMidiFile(f.notes, f.pedal, r.title);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = midiFileName(r.title, r.createdAt);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function RecordingsPanel({ sourceId, empty }: { sourceId?: string; empty: string }) {
  const list = useRecordings(sourceId);
  const pb = usePlayback();
  const [picked, setPicked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);

  const pair = useMemo(() => {
    if (!list || picked.length !== 2) return null;
    const rs = picked.map((id) => list.find((r) => r.id === id)).filter((r): r is Recording => !!r);
    return rs.length === 2 ? rs.sort((a, b) => a.createdAt - b.createdAt) : null;
  }, [list, picked]);

  if (!list) return null;
  if (!list.length) return <p className="recList__empty">{empty}</p>;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  const play = (r: Recording) => {
    if (pb.playing === r.id) return pb.stop();
    const f = factsOf(r);
    void pb.play(r.id, f.notes, f.pedal, r.durationMs);
  };

  return (
    <div className="recList">
      {pair ? (
        <Compare a={pair[0]} b={pair[1]} pb={pb} onPlay={play} onClose={() => setPicked([])} />
      ) : (
        <p className="recList__hint">{list.length > 1 ? 'Marque duas gravações para comparar.' : 'Grave de novo daqui a uns dias para comparar.'}</p>
      )}
      <ul className="recList__items">
        {list.map((r) => {
          const f = factsOf(r);
          const s = recordingStats(f.notes, r.durationMs);
          const on = picked.includes(r.id);
          return (
            <li key={r.id} className={'recItem' + (on ? ' recItem-picked' : '')}>
              <div className="recItem__top">
                <label className="recItem__pick" title="Comparar">
                  <input type="checkbox" checked={on} onChange={() => toggle(r.id)} aria-label={`Comparar ${r.title}`} />
                </label>
                <input className="recItem__title" defaultValue={r.title} key={r.title} aria-label="Nome da gravação" onBlur={(e) => e.target.value !== r.title && void renameRecording(r.id, e.target.value)} />
                <button className="button button-secondary button-small" type="button" onClick={() => play(r)}>
                  {pb.playing === r.id ? <StopIcon className="button__icon" /> : <PlayIcon className="button__icon" />}
                  {pb.playing === r.id ? 'Parar' : 'Ouvir'}
                </button>
              </div>
              <p className="recItem__meta">
                {when.format(r.createdAt)} · {duration(r.durationMs)} · {s.notes} notas
                {r.accuracy !== undefined && ` · ${Math.round(r.accuracy * 100)}% no tempo`}
                {r.bpm ? ` a ${r.bpm} BPM` : ''}
                {r.kind === 'marco' && !sourceId && r.sourceTitle ? ` · ${r.sourceTitle}` : ''}
              </p>
              <Roll notes={f.notes} durationMs={r.durationMs} progress={pb.playing === r.id ? pb.progress : undefined} height={44} label={`Rolo de ${r.title}`} />
              <div className="recItem__actions">
                <button className="linkButton recItem__action" type="button" onClick={() => download(r)}>
                  <DownloadIcon className="recItem__icon" />
                  Baixar .mid
                </button>
                {confirm === r.id ? (
                  <>
                    <button className="linkButton recItem__action recItem__action-danger" type="button" onClick={() => void deleteRecording(r.id).then(() => setConfirm(null))}>
                      Apagar mesmo
                    </button>
                    <button className="linkButton recItem__action" type="button" onClick={() => setConfirm(null)}>Manter</button>
                  </>
                ) : (
                  <button className="linkButton recItem__action" type="button" onClick={() => setConfirm(r.id)}>
                    <TrashIcon className="recItem__icon" />
                    Apagar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Compare({ a, b, pb, onPlay, onClose }: { a: Recording; b: Recording; pb: ReturnType<typeof usePlayback>; onPlay: (r: Recording) => void; onClose: () => void }) {
  const fa = factsOf(a);
  const fb = factsOf(b);
  const rows = compareTakes(fa, fb);
  const scale = Math.max(a.durationMs, b.durationMs);
  const better = rows.filter((r) => r.verdict === 'melhor').length;
  const worse = rows.filter((r) => r.verdict === 'pior').length;
  return (
    <section className="recCompare" aria-label="Comparação">
      <div className="recCompare__head">
        <h3 className="recCompare__title">
          {better > worse ? 'Você evoluiu' : worse > better ? 'Desta vez ficou abaixo' : 'Parecidas'}
        </h3>
        <button className="linkButton" type="button" onClick={onClose}>Fechar comparação</button>
      </div>
      <table className="recCompare__table">
        <thead>
          <tr>
            <th scope="col" aria-label="Medida" />
            <th scope="col">{when.format(a.createdAt)}</th>
            <th scope="col">{when.format(b.createdAt)}</th>
            <th scope="col" aria-label="Resultado" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.a}</td>
              <td>{r.b}</td>
              <td>
                {r.verdict === 'melhor' && <span className="recVerdict recVerdict-up"><CheckIcon className="recVerdict__icon" />melhor</span>}
                {r.verdict === 'pior' && <span className="recVerdict recVerdict-down"><CrossIcon className="recVerdict__icon" />pior</span>}
                {r.verdict === 'igual' && <span className="recVerdict">igual</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {[{ r: a, f: fa, tone: 'a' as const }, { r: b, f: fb, tone: 'b' as const }].map(({ r, f, tone }) => (
        <div key={r.id} className="recCompare__roll">
          <button className="button button-secondary button-small" type="button" onClick={() => onPlay(r)}>
            {pb.playing === r.id ? <StopIcon className="button__icon" /> : <PlayIcon className="button__icon" />}
            {when.format(r.createdAt)}
          </button>
          <Roll notes={f.notes} durationMs={r.durationMs} scaleMs={scale} progress={pb.playing === r.id ? pb.progress : undefined} height={60} tone={tone} label={`Rolo de ${when.format(r.createdAt)}`} />
        </div>
      ))}
    </section>
  );
}
