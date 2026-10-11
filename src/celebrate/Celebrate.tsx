// Peças visuais das recompensas: estrelas, faíscas, sequência de acertos e a faixa de "passou".

import { useEffect, useState } from 'react';
import { CheckIcon, StarIcon } from '../components/Icons';
import { isComboMilestone } from './rewards';
import { playReward } from './sound';

/** Faíscas que saem do centro. Só enfeite: some sozinho e respeita "reduzir movimento". */
export function Burst({ big = false }: { big?: boolean }) {
  const n = big ? 18 : 10;
  return (
    <span className={'burst' + (big ? ' burst-big' : '')} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={'burst__spark' + (i % 3 === 0 ? ' burst__spark-alt' : '')} style={{ ['--a' as string]: `${(360 / n) * i}deg`, ['--d' as string]: `${(i % 4) * 40}ms` }} />
      ))}
    </span>
  );
}

/** Três estrelas; as ganhas acendem uma por uma. */
export function Stars({ count, label = true }: { count: 0 | 1 | 2 | 3; label?: boolean }) {
  return (
    <span className="stars" role="img" aria-label={`${count} de 3 estrelas`}>
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} className={'stars__star' + (i < count ? ' stars__star-on' : '')} />
      ))}
      {label && <span className="stars__label">{count === 3 ? 'Perfeito' : count === 2 ? 'Muito bom' : count === 1 ? 'Passou' : 'Ainda não'}</span>}
    </span>
  );
}

/** "6 seguidas": aparece a partir de 3 acertos de primeira em sequência; nos marcos (5, 10…) dá um pulo a mais. */
export function Combo({ streak, label = 'seguidas' }: { streak: number; label?: string }) {
  if (streak < 3) return null;
  return (
    <span key={streak} className={'combo' + (isComboMilestone(streak) ? ' combo-milestone' : '')} role="status">
      <CheckIcon className="combo__icon" />
      {streak} {label}
      {isComboMilestone(streak) && <Burst />}
    </span>
  );
}

/** Faixa de resultado de uma passada que passou: estrelas, faíscas e o arpejo de recompensa (uma vez). */
export function PassReward({ stars, children }: { stars: 0 | 1 | 2 | 3; children?: React.ReactNode }) {
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (played || stars === 0) return;
    setPlayed(true);
    playReward(stars === 3 ? 'great' : 'pass');
  }, [played, stars]);
  return (
    <div className={'passReward' + (stars === 0 ? ' passReward-miss' : '')}>
      {stars > 0 && <Burst big={stars === 3} />}
      <Stars count={stars} />
      {children}
    </div>
  );
}
