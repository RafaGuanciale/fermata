import { NavLink, Outlet } from 'react-router-dom';
import { ProgressIcon, PracticeIcon, RepertoireIcon, StudyIcon, TodayIcon } from './Icons';
import ThemeToggle from './ThemeToggle';

const LINKS = [
  { to: '/', label: 'Hoje', Icon: TodayIcon, end: true },
  { to: '/treino', label: 'Treino', Icon: PracticeIcon, end: false },
  { to: '/repertorio', label: 'Repertório', Icon: RepertoireIcon, end: false },
  { to: '/estudo', label: 'Estudo', Icon: StudyIcon, end: false },
  { to: '/progresso', label: 'Progresso', Icon: ProgressIcon, end: false },
];

export default function AppLayout() {
  return (
    <div className="page">
      <nav className="sideNav" aria-label="Principal">
        <NavLink to="/" className="sideNav__brand">
          <span className="sideNav__wordmark">FERMATA</span>
          <span className="sideNav__endorse">um projeto Permana</span>
        </NavLink>
        <ul className="sideNav__list">
          {LINKS.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => 'sideNav__link' + (isActive ? ' sideNav__link-active' : '')}
              >
                <Icon className="sideNav__icon" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sideNav__foot">
          <ThemeToggle />
          <span>Fermata · um projeto Permana</span>
        </div>
      </nav>
      <main className="page__main">
        <div className="page__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
