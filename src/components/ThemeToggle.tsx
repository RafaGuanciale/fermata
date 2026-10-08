import { useTheme } from '../theme/ThemeProvider';
import { MoonIcon, SunIcon } from './Icons';

export default function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const toLight = theme === 'dark';
  const label = toLight ? 'Tema claro' : 'Tema escuro';
  return (
    <button className={'pill themeToggle' + (iconOnly ? ' pill-icon' : '')} type="button" onClick={toggleTheme} aria-label={label} title={label}>
      {toLight ? <SunIcon className="pill__icon" /> : <MoonIcon className="pill__icon" />}
      {!iconOnly && <span className="themeToggle__label">{label}</span>}
    </button>
  );
}
