import { describe, expect, it } from 'vitest';
import { CIRCLE, ROOTS, chordInfo, harmonicField, identifyChord, intervalName, parseSymbol, scaleInfo, signatureText } from './data';

describe('consulta', () => {
  it('acordes com grafia, graus e inversões', () => {
    const fm7 = chordInfo('F#', 'm7');
    expect(fm7.spelled).toEqual(['F#', 'A', 'C#', 'E']);
    expect(fm7.degrees).toEqual(['1', '♭3', '5', '♭7']);
    expect(fm7.midis).toEqual([66, 69, 73, 76]);
    const ce = chordInfo('C', '', 1);
    expect(ce.symbol).toBe('C/E');
    expect(ce.spelled).toEqual(['E', 'G', 'C']);
    expect(ce.midis).toEqual([64, 67, 72]);
    expect(chordInfo('Bb', '7M').spelled).toEqual(['Bb', 'D', 'F', 'A']);
    expect(chordInfo('B', '°7').spelled).toEqual(['B', 'D', 'F', 'Ab']);
    expect(chordInfo('C', 'add9').midis).toEqual([60, 64, 67, 74]);
    for (const r of ROOTS) for (const s of ['', 'm', 'dim', 'aug', 'sus4', '7', 'm7(b5)']) expect(() => chordInfo(r, s)).not.toThrow();
  });

  it('lê cifras e reconhece o acorde tocado', () => {
    expect(parseSymbol('f#m7')).toEqual({ root: 'F#', suffix: 'm7', inversion: 0 });
    expect(parseSymbol('C/E')).toEqual({ root: 'C', suffix: '', inversion: 1 });
    expect(parseSymbol('Gø')).toEqual({ root: 'G', suffix: 'm7(b5)', inversion: 0 });
    expect(parseSymbol('Xyz')).toBeNull();
    expect(identifyChord([64, 67, 72])?.symbol).toBe('C/E');
    expect(identifyChord([55, 59, 62, 65])?.symbol).toBe('G7');
    expect(identifyChord([57, 60, 64])?.symbol).toBe('Am');
    expect(identifyChord([60, 61, 62])).toBeNull();
  });

  it('escalas, armaduras e campo harmônico', () => {
    expect(scaleInfo('D', 'maior').spelled).toEqual(['Ré', 'Mi', 'Fá♯', 'Sol', 'Lá', 'Si', 'Dó♯', 'Ré']);
    expect(scaleInfo('A', 'harmonica').pattern).toEqual(['T', 'S', 'T', 'T', 'S', 'T+S', 'S']);
    expect(scaleInfo('C', 'pentaMenor').spelled).toEqual(['Dó', 'Mi♭', 'Fá', 'Sol', 'Si♭', 'Dó']);
    expect(signatureText(2)).toBe('2 sustenidos: Fá♯ e Dó♯');
    expect(signatureText(-1)).toBe('1 bemol: Si♭');
    expect(CIRCLE).toHaveLength(12);
    expect(harmonicField('G', 'maior', false).map((c) => c.symbol)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
    expect(harmonicField('C', 'maior', true).map((c) => c.roman)).toEqual(['I7M', 'ii7', 'iii7', 'IV7M', 'V7', 'vi7', 'viiø']);
    expect(harmonicField('A', 'menor', false).map((c) => c.symbol)).toEqual(['Am', 'Bdim', 'C', 'Dm', 'E', 'F', 'G#dim']);
    expect(intervalName(60, 67)).toBe('5ª justa');
    expect(intervalName(60, 76)).toBe('3ª maior + oitava');
  });
});
