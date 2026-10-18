import { describe, expect, it } from 'vitest';
import type { PracticeDay, TakeLog } from '../db/db';
import { packErrors } from '../analysis/takeLog';
import { buildDigest, lastWeek, weekStart } from './digest';

const now = new Date('2026-10-19T10:00').getTime(); // segunda
const day = (s: string) => new Date(`${s}T15:00`).getTime();
const pd = (d: string, minutes: number): PracticeDay => ({ id: `${d}:a`, day: d, minutes, device: 'a' });
const take = (n: number, at: number, p: Partial<TakeLog>): TakeLog => ({
  id: `t${n}`, at, day: '', kind: 'musica', sourceId: 'curso-u05-fur-elise', title: 'Für Elise, tema A', n, bpm: 60, accuracy: 0.8,
  total: 40, errors: [], fingers: [8, 8, 8, 8, 8, 0, 0, 0, 0, 0], extras: 0, meanDelta: -20, drift: null, ...p,
});

describe('resumo da semana', () => {
  it('semana anterior de segunda a domingo', () => {
    expect(new Date(weekStart(day('2026-10-15'))).getDay()).toBe(1);
    const w = lastWeek(now);
    expect(w.id).toBe('2026-10-12');
    expect(w.end - w.start).toBe(7 * 86_400_000);
  });

  it('junta compassos, trocas, dedos e numeração das passadas; só vale com treino suficiente', () => {
    const err = (played: number) => packErrors([{ measure: 6, midi: 76, finger: 5, hand: 'r', outcome: 'trocou', delta: 10, played }]);
    const takes = [
      take(201, day('2026-10-13'), { accuracy: 0.7, bpm: 60, errors: err(75), drift: -150 }),
      take(202, day('2026-10-14'), { accuracy: 0.85, bpm: 60, errors: err(75) }),
      take(203, day('2026-10-16'), { accuracy: 0.6, bpm: 72, errors: err(77) }),
      take(150, day('2026-10-05'), { accuracy: 0.5 }), // semana anterior: fora
    ];
    const r = buildDigest({
      now, takes, runs: [], recordings: [], notes: [], goal: { minutes: 90, days: 3 },
      practice: [pd('2026-10-13', 30), pd('2026-10-14', 25), pd('2026-10-16', 20), pd('2026-10-06', 40)],
      songRoute: (id) => `/curso/musica/${id.slice(6)}`,
    });
    expect(r.qualifies).toBe(true);
    expect(r.digest.constancia).toMatchObject({ minutos: 75, dias: 3, semanaAnterior: { minutos: 40, dias: 1 } });
    const m = r.digest.musicas[0];
    expect(m.passadas).toBe(3);
    expect(m.numeracaoDasPassadas).toBe('201 a 203');
    expect(m.acerto).toEqual({ primeira: 70, ultima: 60, media: 72, melhor: 85 });
    expect(m.acertoPorAndamento).toEqual([{ bpm: 60, passadas: 2, acertoMedio: 77 }, { bpm: 72, passadas: 1, acertoMedio: 60 }]);
    expect(m.tempo.passadasQueAceleraram).toBe(1);
    expect(m.compassosComMaisErro[0]).toMatchObject({ compasso: 6, erros: 3, exemplosDePassadas: [203, 202, 201] });
    expect(m.compassosComMaisErro[0].trocasMaisComuns[0]).toBe('tocou D♯5 no lugar de E5 (2 vezes)');
    expect(m.dedos.maoDireita.find((d) => d.dedo === 'mínimo (5)')).toMatchObject({ notas: 24, erros: 3, taxaErro: 13 });
    expect(r.digest.alvos.some((a) => a.rota === '/curso/musica/u05-fur-elise')).toBe(true);

    const pouco = buildDigest({ now, takes: [], runs: [], recordings: [], notes: [], goal: { minutes: 90, days: 3 }, practice: [pd('2026-10-13', 30)], songRoute: () => null });
    expect(pouco.qualifies).toBe(false);
  });
});
