import { describe, expect, it } from 'vitest';
import { bpmFromTaps, clampBpm, secondsPerBeat, tempoName } from './tempo';

describe('metrônomo', () => {
  it('limita o BPM', () => {
    expect(clampBpm(10)).toBe(30);
    expect(clampBpm(300)).toBe(240);
    expect(clampBpm(72.4)).toBe(72);
    expect(clampBpm(NaN)).toBe(80);
    expect(secondsPerBeat(60)).toBe(1);
  });

  it('calcula o tap tempo e recomeça depois de pausa longa', () => {
    expect(bpmFromTaps([0])).toBeNull();
    expect(bpmFromTaps([0, 500, 1000, 1500])).toBe(120);
    expect(bpmFromTaps([0, 1000, 5000, 5750, 6500])).toBe(80);
  });

  it('dá o nome do andamento', () => {
    expect(tempoName(50)).toBe('Largo');
    expect(tempoName(90)).toBe('Andante');
    expect(tempoName(140)).toBe('Allegro');
  });
});
