import { describe, expect, it } from 'vitest';
import { COMPUTER_KEYS, parseMidiMessage } from './useNoteInput';

describe('parseMidiMessage', () => {
  it('lê "tecla abaixada" em qualquer canal', () => {
    expect(parseMidiMessage([0x90, 60, 100])).toBe(60);
    expect(parseMidiMessage([0x93, 64, 1])).toBe(64);
  });

  it('ignora tecla solta, força zero e outras mensagens', () => {
    expect(parseMidiMessage([0x80, 60, 64])).toBeNull(); // note off
    expect(parseMidiMessage([0x90, 60, 0])).toBeNull(); // note on com força 0 = note off
    expect(parseMidiMessage([0xb0, 64, 127])).toBeNull(); // pedal
    expect(parseMidiMessage([0xfe])).toBeNull(); // active sensing
  });
});

describe('COMPUTER_KEYS', () => {
  it('cobre uma oitava cromática sem buracos', () => {
    const notes = Object.values(COMPUTER_KEYS).sort((a, b) => a - b);
    expect(notes).toEqual(Array.from({ length: 13 }, (_, i) => 60 + i));
  });
});
