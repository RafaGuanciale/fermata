// Porta de entrada: o Fermata só abre para quem tem conta. Depois de entrar uma vez, o aparelho lembra
// e o app funciona sem internet (o token fica guardado; a sincronização volta quando a conexão voltar).

import { useState, type FormEvent } from 'react';
import Logo from '../brand/Logo';
import { login, takeSignOutReason } from '../sync/account';
import { photoUrl } from '../media/photos';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(() => takeSignOutReason());
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para entrar agora.');
      setBusy(false);
    }
  };

  return (
    <main className="login" style={{ ['--login-photo' as string]: `url(${photoUrl('todayHero', 1400)})` }}>
      <div className="login__photo" aria-hidden />
      <section className="login__panel" aria-labelledby="login-title">
        <div className="login__brand">
          <Logo />
          <span className="login__endorse">um projeto Permana</span>
        </div>
        <h1 className="login__title" id="login-title">Entre para estudar</h1>
        <p className="login__lead">Use o email e a senha da sua conta Permana. Depois de entrar, este aparelho lembra de você e o app funciona até sem internet.</p>
        <form className="form login__form" onSubmit={submit}>
          {error && <p className="form__error" role="alert">{error}</p>}
          <label className="form__field" htmlFor="login-email">
            <span className="form__label">Email</span>
            <input id="login-email" className="form__input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="form__field" htmlFor="login-senha">
            <span className="form__label">Senha</span>
            <input id="login-senha" className="form__input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="button button-primary login__submit" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
