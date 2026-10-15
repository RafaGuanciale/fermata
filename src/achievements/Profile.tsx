// Perfil: avatar com o anel do seu nível de músico, título, e as maestrias com emblemas.
// O emblema em destaque aparece ao lado do seu nome na barra lateral.

import { useState, useSyncExternalStore } from 'react';
import { initials } from '../repertoire/catalog';
import type { Account } from '../sync/account';
import Emblem from './Emblem';
import { LEVEL_NAMES, type TrackId } from './mastery';
import { useMastery } from './useMastery';

const FEATURED_KEY = 'fermata-featured-badge';
const listeners = new Set<() => void>();

export function getFeatured(): TrackId | null {
  try {
    return (localStorage.getItem(FEATURED_KEY) as TrackId | null) ?? null;
  } catch {
    return null;
  }
}

function setFeatured(id: TrackId | null) {
  try {
    if (id) localStorage.setItem(FEATURED_KEY, id);
    else localStorage.removeItem(FEATURED_KEY);
  } catch {
    // vale só agora
  }
  listeners.forEach((l) => l());
}

export function useFeatured(): TrackId | null {
  return useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, getFeatured, () => null);
}

export function Avatar({ account, tier, size = 'large' }: { account: Account; tier: number; size?: 'large' | 'small' }) {
  return (
    <span className={`avatarRing avatarRing-t${tier} avatarRing-${size}`}>
      <span className="avatarRing__img">
        {account.user.avatar ? <img src={account.user.avatar} alt="" referrerPolicy="no-referrer" /> : initials(account.user.name)}
      </span>
    </span>
  );
}

export default function Profile({ account }: { account: Account }) {
  const m = useMastery();
  const featured = useFeatured();
  const [picking, setPicking] = useState(false);
  if (!m) return null;
  const { musician, tracks } = m;

  return (
    <>
      <section className={`profile profile-t${musician.tier}`}>
        <Avatar account={account} tier={musician.tier} />
        <div className="profile__who">
          <strong className="profile__name">{account.user.name}</strong>
          <span className="profile__title">{musician.title}</span>
          <span className="profile__level">Nível de músico {musician.level} de {musician.max}</span>
          {musician.nextTitle && (
            <span className="profile__next">
              <span className="profile__bar" aria-hidden><span style={{ width: `${Math.round(musician.titleProgress * 100)}%` }} /></span>
              Faltam {musician.toNext} {musician.toNext === 1 ? 'nível' : 'níveis'} para "{musician.nextTitle}"
            </span>
          )}
        </div>
        {featured && (
          <div className="profile__featured">
            <Emblem track={featured} level={tracks.find((t) => t.def.id === featured)?.level ?? 0} size={64} />
          </div>
        )}
      </section>

      <section className="page__section">
        <div className="page__sectionHead">
          <h2 className="page__sectionTitle">Maestrias</h2>
          <button className="linkButton" type="button" onClick={() => setPicking(!picking)}>
            {picking ? 'Pronto' : 'Escolher o emblema em destaque'}
          </button>
        </div>
        <p className="page__lead">Cada maestria tem 7 níveis, com os nomes das dinâmicas: pp, p, mp, mf, f, ff e fff. A soma é o seu nível de músico.</p>
        <div className="masteryGrid">
          {tracks.map((t) => (
            <article
              key={t.def.id}
              className={'masteryCard' + (featured === t.def.id ? ' masteryCard-featured' : '') + (t.level === 0 ? ' masteryCard-locked' : '')}
            >
              <Emblem track={t.def.id} level={t.level} size={68} />
              <div className="masteryCard__text">
                <h3 className="masteryCard__name">{t.def.name}</h3>
                <p className="masteryCard__value">{t.def.show(t.value)}</p>
                <span className="profile__bar" aria-hidden><span style={{ width: `${Math.round(t.progress * 100)}%` }} /></span>
                <p className="masteryCard__next">
                  {t.next === null ? 'Nível máximo. Lendário.' : `Próximo: ${LEVEL_NAMES[t.level + 1]} com ${t.def.show(t.next)}`}
                </p>
                <p className="masteryCard__how">{t.def.how}</p>
                {picking && t.level > 0 && (
                  <button className="button button-secondary button-small" type="button" onClick={() => { setFeatured(featured === t.def.id ? null : t.def.id); setPicking(false); }}>
                    {featured === t.def.id ? 'Tirar do destaque' : 'Pôr em destaque'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
