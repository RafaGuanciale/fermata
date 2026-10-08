import { describe, expect, it } from 'vitest';
import { COMPUTER_KEYS, parseMidiMessage } from './useNoteInput';

describe('parseMidiMessage', () => {
  it('lê tecla abaixada em qualquer canal', () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({ type: 'on', midi: 60 });
    expect(parseMidiMessage([0x93, 64, 1])).toEqual({ type: 'on', midi: 64 });
  });

  it('lê tecla solta, inclusive note on com força zero', () => {
    expect(parseMidiMessage([0x80, 60, 64])).toEqual({ type: 'off', midi: 60 });
    expect(parseMidiMessage([0x90, 60, 0])).toEqual({ type: 'off', midi: 60 });
  });

  it('ignora outras mensagens', () => {
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
