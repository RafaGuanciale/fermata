// Na Conta: testar se a análise com IA está configurada (a chave na Vercel e o modelo).

import { useState } from 'react';
import { authHeaders } from '../sync/account';

export default function InsightCheck() {
  const [state, setState] = useState<{ ok: boolean; message: string; model?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/insight?check=1', { headers: authHeaders() });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; model?: string } | null;
      setState(res.ok && data ? { ok: !!data.ok, message: data.message ?? '', model: data.model } : { ok: false, message: data?.message ?? 'Não deu para testar agora.' });
    } catch {
      setState({ ok: false, message: 'Sem conexão.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="page__section">
      <h2 className="page__sectionTitle">Análise com IA</h2>
      <p className="page__lead">Toda segunda, a análise da semana anterior aparece no Progresso. Aqui você confere se a chave da Anthropic está funcionando.</p>
      <div className="insightCheck">
        <button className="button button-secondary button-small" type="button" onClick={() => void run()} disabled={busy}>
          {busy ? 'Testando…' : 'Testar a conexão'}
        </button>
        {state && (
          <p className={'insightCheck__result' + (state.ok ? ' insightCheck__result-ok' : ' insightCheck__result-bad')} role="status">
            {state.ok ? 'Funcionando' : 'Com problema'}: {state.message}
            {state.model ? ` (modelo ${state.model})` : ''}
          </p>
        )}
      </div>
    </section>
  );
}
