// Músicas do curso: a melodia escrita em texto (SongSpec) vira MusicXML na hora,
// e o "Tocar a música" abre como se fosse um arquivo do MuseScore. Puro e testado (course.test.ts).

import { parseLine, type ParsedNote } from './music';
import type { SongSpec } from './types';

const DIV = 4; // divisões por semínima: resolução de semicolcheia

const TYPES: [number, string, boolean][] = [
  [4, 'whole', false],
  [3, 'half', true],
  [2, 'half', false],
  [1.5, 'quarter', true],
  [1, 'quarter', false],
  [0.75, 'eighth', true],
  [0.5, 'eighth', false],
  [0.25, '16th', false],
];

function typeOf(beats: number): { type: string; dot: boolean } {
  const t = TYPES.find(([b]) => Math.abs(b - beats) < 1e-6);
  if (!t) throw new Error(`Duração sem figura: ${beats} tempos`);
  return { type: t[1], dot: t[2] };
}

function pitchXml(spelled: string): string {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(spelled);
  if (!m) throw new Error(`Nota inválida: ${spelled}`);
  const alter = m[2] ? (m[2][0] === '#' ? m[2].length : -m[2].length) : 0;
  return `<pitch><step>${m[1]}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${m[3]}</octave></pitch>`;
}

function noteXml(p: ParsedNote, staff: number, voice: number, wholeBar: boolean): string {
  const duration = Math.round(p.beats * DIV);
  if (!p.midis.length) {
    if (wholeBar) return `<note><rest measure="yes"/><duration>${duration}</duration><voice>${voice}</voice><staff>${staff}</staff></note>`;
    const { type, dot } = typeOf(p.beats);
    return `<note><rest/><duration>${duration}</duration><voice>${voice}</voice><type>${type}</type>${dot ? '<dot/>' : ''}<staff>${staff}</staff></note>`;
  }
  const { type, dot } = typeOf(p.beats);
  return p.spelled
    .map((s, i) => `<note>${i > 0 ? '<chord/>' : ''}${pitchXml(s)}<duration>${duration}</duration><voice>${voice}</voice><type>${type}</type>${dot ? '<dot/>' : ''}<staff>${staff}</staff></note>`)
    .join('');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Confere a escrita (compassos fechados, mãos com o mesmo número de compassos). Lança erro explicando o que está errado. */
export function checkSong(song: SongSpec): { bars: number } {
  const right = parseLine(song.right, song.beatsPerBar);
  const bars = right.length ? right[right.length - 1].bar : 0;
  if (song.left) {
    const left = parseLine(song.left, song.beatsPerBar);
    const lb = left.length ? left[left.length - 1].bar : 0;
    if (lb !== bars) throw new Error(`${song.id}: mão direita tem ${bars} compassos e a esquerda ${lb}`);
  }
  return { bars };
}

export function songXml(song: SongSpec): string {
  const { bars } = checkSong(song);
  const right = parseLine(song.right, song.beatsPerBar);
  const left = song.left ? parseLine(song.left, song.beatsPerBar) : null;
  const staves = left ? 2 : 1;
  const barDur = song.beatsPerBar * DIV;
  const measures: string[] = [];
  for (let b = 1; b <= bars; b++) {
    const r = right.filter((x) => x.bar === b);
    let xml = `<measure number="${b}">`;
    if (b === 1) {
      xml += `<attributes><divisions>${DIV}</divisions><key><fifths>${song.fifths}</fifths></key><time><beats>${song.beatsPerBar}</beats><beat-type>4</beat-type></time>`;
      xml += staves === 2 ? '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>' : '<clef><sign>G</sign><line>2</line></clef>';
      xml += `</attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${song.bpm}</per-minute></metronome></direction-type><sound tempo="${song.bpm}"/></direction>`;
    }
    xml += r.map((p) => noteXml(p, 1, 1, r.length === 1 && p.beats === song.beatsPerBar)).join('');
    if (left) {
      const l = left.filter((x) => x.bar === b);
      xml += `<backup><duration>${barDur}</duration></backup>`;
      xml += l.map((p) => noteXml(p, 2, 5, l.length === 1 && p.beats === song.beatsPerBar)).join('');
    }
    if (b === bars) xml += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
    xml += '</measure>';
    measures.push(xml);
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">' +
    '<score-partwise version="4.0">' +
    `<work><work-title>${esc(song.title)}</work-title></work>` +
    `<identification><creator type="composer">${esc(song.composer)}</creator>${song.arrangement ? `<creator type="arranger">${esc(song.arrangement)}</creator>` : ''}</identification>` +
    '<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>' +
    `<part id="P1">${measures.join('')}</part></score-partwise>`
  );
}
