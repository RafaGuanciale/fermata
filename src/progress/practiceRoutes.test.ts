import { describe, expect, it } from 'vitest';
import { practiceKind } from './practiceRoutes';

describe('onde o tempo de piano conta', () => {
  it('conta onde você toca', () => {
    for (const p of ['/treino', '/treino/foco', '/treino/notas', '/arcade/tetris', '/arcade/midi/midi-1', '/partitura/3', '/peca/2/estudar', '/curso/musica/u01-ode'])
      expect(practiceKind(p), p).toBe('tocar');
  });

  it('conta lendo lições e consulta', () => {
    for (const p of ['/estudo/unidade/3/l20', '/consulta', '/consulta/simbolos', '/curso/foco/3/l20']) expect(practiceKind(p), p).toBe('estudar');
  });

  it('tocar livre conta separado', () => {
    expect(practiceKind('/tocar')).toBe('livre');
  });

  it('não conta nas outras páginas', () => {
    for (const p of ['/', '/progresso', '/conta', '/arcade', '/estudo', '/estudo/unidade/3', '/repertorio', '/repertorio/peca/2', '/treino/calibrar'])
      expect(practiceKind(p), p).toBeNull();
  });
});
