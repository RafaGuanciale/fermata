import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { login, logout, takeSignOutReason, useAccount } from '../sync/account';
import { syncLabel, useSyncStatus } from '../sync/status';
import { syncNow } from '../sync/engine';
import { initials } from '../repertoire/catalog';
import { CloudIcon, SyncIcon } from '../components/Icons';

export default function AccountPage() {
  const account = useAccount();
  return account ? <SignedIn /> : <SignIn />;
}

function SignIn() {
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
    <>
      <header className="page__header">
        <span className="page__eyebrow">Conta</span>
        <h1 className="page__title">Entrar com o Permana</h1>
        <p className="page__lead">Use o mesmo email e senha do Permana. Seus PDFs, o repertório e o progresso passam a aparecer em todos os seus aparelhos.</p>
      </header>

      <form className="form account__form" onSubmit={submit}>
        {error && <p className="form__error" role="alert">{error}</p>}
        <label className="form__field" htmlFor="conta-email">
          <span className="form__label">Email</span>
          <input id="conta-email" className="form__input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="form__field" htmlFor="conta-senha">
          <span className="form__label">Senha</span>
          <input id="conta-senha" className="form__input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <div className="form__actions">
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
        <p className="form__help">Sem login, tudo continua funcionando, só que fica salvo apenas neste aparelho.</p>
      </form>
    </>
  );
}

function SignedIn() {
  const account = useAccount()!;
  const status = useSyncStatus();
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;
  const files = useLiveQuery(async () => {
    const all = await db.files.toArray();
    return { total: all.length, local: all.filter((f) => f.blob).length, cloud: all.filter((f) => f.pathname).length };
  }, []);

  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Conta</span>
        <h1 className="page__title">Sua conta</h1>
      </header>

      <section className="account__card">
        <span className="account__avatar">
          {account.user.avatar ? <img src={account.user.avatar} alt="" referrerPolicy="no-referrer" /> : initials(account.user.name)}
        </span>
        <span className="account__who">
          <strong className="account__name">{account.user.name}</strong>
          <span className="account__user">@{account.user.username} · conta Permana</span>
        </span>
      </section>

      <section className="page__section">
        <h2 className="page__sectionTitle">Sincronização</h2>
        <div className={'account__status account__status-' + status.phase}>
          <CloudIcon className="account__statusIcon" />
          <span>
            <strong>{syncLabel(status)}</strong>
            <span className="account__statusSub">
              {pending > 0 ? `${pending} ${pending === 1 ? 'alteração esperando' : 'alterações esperando'} para subir` : 'Nada esperando para subir'}
              {files && files.total > 0 && ` · ${files.cloud} de ${files.total} partituras na nuvem`}
            </span>
          </span>
          <button className="button button-secondary button-small" type="button" onClick={() => void syncNow()} disabled={status.phase === 'syncing'}>
            <SyncIcon className="button__icon" />
            Sincronizar agora
          </button>
        </div>
        <p className="page__lead account__note">
          Vão para a nuvem: repertório e partituras, progresso no Estudo e o histórico dos treinos. Nos outros aparelhos, cada partitura baixa na primeira vez que você abre.
        </p>
      </section>

      <div className="dangerZone">
        <button className="button button-ghost button-small" type="button" onClick={() => logout()}>
          Sair da conta
        </button>
        <span className="form__help">Ao sair, o que já está neste aparelho continua aqui.</span>
      </div>
    </>
  );
}
