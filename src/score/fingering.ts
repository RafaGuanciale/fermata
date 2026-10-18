// Dedilhado automático para partituras (música do curso ou MusicXML do repertório).
// A parte pura decide a mão de cada pauta e os dedos; `addScoreFingerings` coloca no modelo do OSMD antes de desenhar.

import { TechnicalInstruction, TechnicalInstructionType, type Note, type OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { fingerNotes, type Finger, type FingerNote, type Hand } from '../music/fingering';

/** Mão de cada pauta: na pauta dupla, a de cima é a direita e a de baixo a esquerda; sozinha, decide pela altura média. */
export function staffHand(staff: number, staffCount: number, notes: FingerNote[]): Hand {
  if (staffCount >= 2 && staff < 2) return staff === 0 ? 'r' : 'l';
  if (!notes.length) return 'r';
  return notes.reduce((s, n) => s + n.midi, 0) / notes.length >= 60 ? 'r' : 'l';
}

/** Dedos de todas as pautas: para cada pauta, um dedo por nota, na ordem recebida. */
export function scoreFingers(staves: FingerNote[][]): (Finger | null)[][] {
  return staves.map((notes, i) => (notes.length ? fingerNotes(notes, staffHand(i, staves.length, notes)) : []));
}

/**
 * Põe o dedilhado sugerido em cada nota do OSMD (depois de `load`, antes de `render`).
 * Se a partitura já traz dedilhado de quem escreveu, não mexe em nada. Devolve quantos dedos colocou.
 */
export function addScoreFingerings(osmd: OpenSheetMusicDisplay): number {
  const sheet = osmd.Sheet;
  const staves = sheet.Staves;
  const bpm = sheet.DefaultStartTempoInBpm > 0 ? sheet.DefaultStartTempoInBpm : 80;
  const wholeMs = (4 * 60000) / bpm;
  const per: { note: Note; fn: FingerNote }[][] = staves.map(() => []);
  let already = false;
  for (const m of sheet.SourceMeasures) {
    const t0 = m.AbsoluteTimestamp.RealValue;
    for (const c of m.VerticalSourceStaffEntryContainers) {
      const t = (t0 + c.Timestamp.RealValue) * wholeMs;
      c.StaffEntries.forEach((se) => {
        if (!se) return;
        const s = Math.max(0, staves.indexOf(se.ParentStaff));
        for (const ve of se.VoiceEntries) {
          for (const n of ve.Notes) {
            if (n.Fingering) already = true;
            if (n.isRest() || n.IsGraceNote || ve.IsGrace || n.PrintObject === false) continue;
            if (n.NoteTie && n.NoteTie.StartNote !== n) continue;
            per[s]?.push({ note: n, fn: { midi: n.halfTone + 12, t, dur: n.Length.RealValue * wholeMs } });
          }
        }
      });
    }
  }
  if (already) return 0;
  const fingers = scoreFingers(per.map((p) => p.map((x) => x.fn)));
  let added = 0;
  per.forEach((list, s) => {
    const hand = staffHand(s, per.length, list.map((x) => x.fn));
    list.forEach(({ note }, k) => {
      const f = fingers[s][k];
      if (!f) return;
      const ti = new TechnicalInstruction();
      ti.type = TechnicalInstructionType.Fingering;
      ti.value = String(f);
      // PlacementEnum do OSMD (não exportado): 0 = acima, 1 = abaixo. Direita em cima, esquerda embaixo.
      ti.placement = (hand === 'r' ? 0 : 1) as TechnicalInstruction['placement'];
      ti.sourceNote = note;
      note.Fingering = ti;
      note.ParentVoiceEntry.TechnicalInstructions.push(ti);
      added++;
    });
  });
  return added;
}

/**
 * Dedo sugerido e mão de cada nota dos passos da partitura (para o registro da passada), pela chave `passo:midi`.
 * Usa o dedilhado automático, mesmo quando o arquivo traz o de quem escreveu.
 */
export function stepFingers(steps: { beat: number; notes: { midi: number; staff: number; beats?: number; tied?: boolean }[] }[], staffCount: number): Map<string, { finger: Finger | null; hand: Hand }> {
  const per: { key: string; fn: FingerNote }[][] = Array.from({ length: Math.max(1, staffCount) }, () => []);
  steps.forEach((s, i) => {
    for (const n of s.notes) {
      if (n.tied) continue;
      per[Math.min(n.staff, per.length - 1)].push({ key: `${i}:${n.midi}`, fn: { midi: n.midi, t: s.beat * 500, dur: (n.beats ?? 1) * 500 } });
    }
  });
  const out = new Map<string, { finger: Finger | null; hand: Hand }>();
  per.forEach((list, staff) => {
    const hand = staffHand(staff, per.length, list.map((x) => x.fn));
    const f = list.length ? fingerNotes(list.map((x) => x.fn), hand) : [];
    list.forEach((x, k) => out.set(x.key, { finger: f[k], hand }));
  });
  return out;
}
