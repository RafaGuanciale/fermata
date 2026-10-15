import { NavLink } from 'react-router-dom';
import { useAccount } from '../sync/account';
import { useSyncStatus } from '../sync/status';
import { initials } from '../repertoire/catalog';
import { UserIcon } from './Icons';
import { useMastery } from '../achievements/useMastery';
import { useFeatured } from '../achievements/Profile';
import Emblem from '../achievements/Emblem';

/** Atalho para a conta: avatar e estado da sincronização, ou "Entrar". */
export default function AccountChip({ compact = false }: { compact?: boolean }) {
  const account = useAccount();
  const status = useSyncStatus();
  const dot = !account ? null : status.phase === 'error' || status.phase === 'offline' ? 'accountChip__dot-warn' : status.phase === 'syncing' ? 'accountChip__dot-busy' : 'accountChip__dot-ok';
  const mastery = useMastery();
  const featured = useFeatured();
  const tier = mastery?.musician.tier ?? 0;
  const featuredLevel = featured ? mastery?.tracks.find((t) => t.def.id === featured)?.level ?? 0 : 0;
  const label = account ? `Perfil de ${account.user.name}${mastery ? `, ${mastery.musician.title}` : ''}` : 'Entrar com a conta Permana';

  return (
    <NavLink to="/conta" className={({ isActive }) => 'accountChip' + (compact ? ' accountChip-compact' : '') + (isActive ? ' accountChip-active' : '')} aria-label={label} title={label}>
      <span className={`accountChip__avatar avatarRing-t${tier}`}>
        {account?.user.avatar ? <img src={account.user.avatar} alt="" referrerPolicy="no-referrer" /> : account ? initials(account.user.name) : <UserIcon className="accountChip__icon" />}
        {dot && <span className={'accountChip__dot ' + dot} />}
      </span>
      {!compact && (
        <span className="accountChip__who">
          <span className="accountChip__name">{account ? account.user.name.split(' ')[0] : 'Entrar'}</span>
          {mastery && <span className="accountChip__title">{mastery.musician.title}</span>}
        </span>
      )}
      {!compact && featured && featuredLevel > 0 && <Emblem track={featured} level={featuredLevel} size={22} label={false} />}
    </NavLink>
  );
}
