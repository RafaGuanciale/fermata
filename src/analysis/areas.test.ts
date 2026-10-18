import { describe, expect, it } from 'vitest';
import { viewArea, viewName } from './areas';

describe('áreas do app', () => {
  it('classifica pelo endereço', () => {
    expect(viewArea('/peca/3/estudar')).toBe('musicas');
    expect(viewArea('/curso/musica/ode')).toBe('musicas');
    expect(viewArea('/treino/notas')).toBe('leitura');
    expect(viewArea('/treino/eco')).toBe('ouvido');
    expect(viewArea('/treino/sessao')).toBe('tecnica');
    expect(viewArea('/tocar')).toBe('livre');
    expect(viewArea('/arcade/ode')).toBe('arcade');
    expect(viewArea('/arcade')).toBe('navegacao');
    expect(viewArea('/estudo/unidade/1/l01')).toBe('curso');
    expect(viewArea('/')).toBe('navegacao');
    expect(viewName('/')).toBe('Hoje');
    expect(viewName('/treino/notas')).toBe('Leitura de notas');
  });
});
