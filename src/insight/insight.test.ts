import { describe, expect, it } from 'vitest';
import { isWeekId, parseInsight } from '../../api/_lib/insight';

describe('resposta da IA', () => {
  it('limpa, limita e manda ação com alvo desconhecido para o treino', () => {
    const r = parseInsight(
      {
        titulo: 'Semana de pressa',
        resumo: 'Você tocou 4 dias.',
        melhorou: ['a', 'b', 'c', 'd'],
        atencao: ['Compasso 6'],
        acoes: [
          { titulo: 'Compasso 6 devagar', como: 'A 50 BPM, mão direita.', minutos: 40, alvo: 'curso-u05-fur-elise', compassos: { de: 6, ate: 7 } },
          { titulo: 'Leitura', como: 'Duas rodadas.', minutos: 5, alvo: 'inventado' },
          { titulo: '', como: 'sem título' },
        ],
        foco: 'Compasso 6 da Für Elise, devagar.',
      },
      ['treino', 'curso-u05-fur-elise'],
    )!;
    expect(r.melhorou).toHaveLength(3);
    expect(r.acoes).toHaveLength(2);
    expect(r.acoes[0]).toEqual({ titulo: 'Compasso 6 devagar', como: 'A 50 BPM, mão direita.', minutos: 15, alvo: 'curso-u05-fur-elise', compassos: { de: 6, ate: 7 } });
    expect(r.acoes[1].alvo).toBe('treino');
    expect(parseInsight({ titulo: 'x' }, [])).toBeNull();
    expect(isWeekId('2026-10-12')).toBe(true);
    expect(isWeekId('12/10')).toBe(false);
  });
});
