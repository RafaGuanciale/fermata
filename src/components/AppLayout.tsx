import { NavLink, Outlet } from 'react-router-dom';
import Logo from '../brand/Logo';
import { ProgressIcon, PracticeIcon, RepertoireIcon, StudyIcon, TodayIcon } from './Icons';
import ThemeToggle from './ThemeToggle';
import KeyboardDock from './KeyboardDock';
import AccountChip from './AccountChip';

const LINKS = [
  { to: '/', label: 'Hoje', Icon: TodayIcon, end: true },
  { to: '/treino', label: 'Treino', Icon: PracticeIcon, end: false },
  { to: '/repertorio', label: 'Repertório', Icon: RepertoireIcon, end: false },
  { to: '/estudo', label: 'Estudo', Icon: StudyIcon, end: false },
  { to: '/progresso', label: 'Progresso', Icon: ProgressIcon, end: false },
];

/**
 * Notebook: barra lateral completa. Tablet: barra de ícones. Celular: barra inferior.
 * O teclado fixo fica sempre embaixo do conteúdo.
 */
export default function AppLayout() {
  return (
    <div className="page">
      <nav className="sideNav" aria-label="Principal">
        <NavLink to="/" className="sideNav__brand" aria-label="Fermata, início">
          <span className="sideNav__logoFull"><Logo /></span>
          <span className="sideNav__logoMark"><Logo compact /></span>
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
                <span className="sideNav__label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sideNav__foot">
          <AccountChip />
          <ThemeToggle />
        </div>
      </nav>
      <div className="page__column">
        <div className="page__topBar">
          <NavLink to="/" aria-label="Fermata, início"><Logo compact /></NavLink>
          <div className="page__topBarActions">
            <AccountChip compact />
            <ThemeToggle iconOnly />
          </div>
        </div>
        <main className="page__main">
          <div className="page__inner">
            <Outlet />
          </div>
        </main>
      </div>
      <KeyboardDock />
    </div>
  );
}
