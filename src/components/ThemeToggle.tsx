import { useTheme } from '../theme/ThemeProvider';
import { MoonIcon, SunIcon } from './Icons';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const toLight = theme === 'dark';
  return (
    <button className="pill" type="button" onClick={toggleTheme} style={{ justifySelf: 'start' }}>
      {toLight ? <SunIcon className="pill__icon" /> : <MoonIcon className="pill__icon" />}
      {toLight ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
}
