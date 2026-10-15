// Arcade: tocar por diversão. Trechos fáceis de músicas conhecidas, notas caindo, sem nota mínima.

import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ARCADE_SONGS } from '../arcade/songs';
import { arcadeRunId } from '../arcade/ArcadeGame';
import { useRuns } from '../training/runs';
import { StarIcon } from '../components/Icons';

const LEVEL = { 1: 'Fácil', 2: 'Médio', 3: 'Desafio' } as const;

export default function ArcadePage() {
  const location = useLocation();
  const runs = useRuns();
  const best = useMemo(() => {
    const out = new Map<string, { score: number; stars: number }>();
    for (const r of runs ?? []) {
      if (!r.treinoId.startsWith('arcade-')) continue;
      const id = r.treinoId.slice(7);
      const stars = r.stars ?? 0;
      const prev = out.get(id);
      out.set(id, { score: Math.max(prev?.score ?? 0, r.score ?? 0), stars: Math.max(prev?.stars ?? 0, stars) });
    }
    return out;
  }, [runs]);

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Para quando você só quer tocar</span>
        <h1 className="page__title">Arcade</h1>
        <p className="page__lead">Trechos fáceis de músicas conhecidas. As notas caem até o teclado e você toca quando elas chegam. Sem nota mínima: pontos, sequências e estrelas, só pela diversão.</p>
      </header>
      <section className="page__section">
        <div className="arcadeGrid">
          {ARCADE_SONGS.map((s) => {
            const b = best.get(s.id);
            return (
              <Link key={s.id} className="arcadeCard" to={`/arcade/${s.id}`} state={{ background: location }} id={arcadeRunId(s.id)}>
                <span className={`arcadeCard__level arcadeCard__level-${s.level}`}>{LEVEL[s.level]}</span>
                <span className="arcadeCard__title">{s.title}</span>
                <span className="arcadeCard__origin">{s.origin}</span>
                <span className="arcadeCard__best">
                  {b ? (
                    <>
                      <span className="arcadeCard__stars" aria-label={`${b.stars} de 3 estrelas`}>
                        {[0, 1, 2].map((k) => <StarIcon key={k} className={'arcadeCard__star' + (k < b.stars ? ' arcadeCard__star-on' : '')} />)}
                      </span>
                      {b.score.toLocaleString('pt-BR')} pontos
                    </>
                  ) : 'Ainda não jogou'}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
