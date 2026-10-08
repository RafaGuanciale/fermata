import { describe, expect, it } from 'vitest';
import { detectTriad, majorScale, voiceTriad } from './theory';

describe('voiceTriad', () => {
  it('monta Dó maior e suas inversões', () => {
    expect(voiceTriad({ rootLetter: 0, quality: 'major', inversion: 0 })).toEqual({
      name: 'Dó maior', midis: [60, 64, 67], noteNames: ['Dó', 'Mi', 'Sol'], degrees: ['1', '3', '5'],
    });
    expect(voiceTriad({ rootLetter: 0, quality: 'major', inversion: 1 }).midis).toEqual([64, 67, 72]);
    expect(voiceTriad({ rootLetter: 0, quality: 'major', inversion: 2 }).degrees).toEqual(['5', '1', '3']);
  });

  it('soletra acidentes pela letra certa', () => {
    expect(voiceTriad({ rootLetter: 3, quality: 'minor', inversion: 0 }).noteNames).toEqual(['Fá', 'Lá♭', 'Dó']);
    expect(voiceTriad({ rootLetter: 2, quality: 'major', inversion: 0 }).noteNames).toEqual(['Mi', 'Sol♯', 'Si']);
    expect(voiceTriad({ rootLetter: 6, quality: 'major', inversion: 0 }).noteNames).toEqual(['Si', 'Ré♯', 'Fá♯']);
  });
});

describe('detectTriad', () => {
  it('reconhece em qualquer inversão e oitava', () => {
    expect(detectTriad([60, 64, 67])?.name).toBe('Dó maior');
    expect(detectTriad([64, 67, 72])?.name).toBe('Dó maior');
    expect(detectTriad([45, 60, 64, 69])?.name).toBe('Lá menor');
    expect(detectTriad([62, 65, 69])?.name).toBe('Ré menor');
  });

  it('recusa o que não é tríade maior ou menor', () => {
    expect(detectTriad([60, 64])).toBeNull();
    expect(detectTriad([60, 63, 66])).toBeNull(); // diminuta
    expect(detectTriad([60, 64, 67, 71])).toBeNull(); // sétima maior
  });
});

describe('majorScale', () => {
  it('gera Dó e Sol maior com o Fá♯', () => {
    expect(majorScale(0).names).toEqual(['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si', 'Dó']);
    expect(majorScale(4).names).toEqual(['Sol', 'Lá', 'Si', 'Dó', 'Ré', 'Mi', 'Fá♯', 'Sol']);
    expect(majorScale(3).midis).toEqual([65, 67, 69, 70, 72, 74, 76, 77]);
  });
});
