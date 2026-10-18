// Análise da semana (IA) no topo do Progresso: título, resumo, o que melhorou, o que pede atenção e 3 ações.

import { Link, useLocation } from 'react-router-dom';
import { CheckIcon } from '../components/Icons';
import { useWeeklyInsight } from './useWeeklyInsight';

const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

function weekLabel(week: string) {
  const start = new Date(`${week}T12:00`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return `${dayMonth.format(start)} a ${dayMonth.format(end)}`;
}

export default function WeeklyInsight() {
  const location = useLocation();
  const s = useWeeklyInsight();

  if (s.status === 'loading') {
    return (
      <section className="insight insight-loading" aria-busy="true">
        <p className="page__eyebrow">Análise da semana</p>
        <p className="insight__muted">Preparando a análise da semana passada…</p>
      </section>
    );
  }
  if (s.status === 'error') {
    return (
      <section className="insight insight-quiet">
        <p className="page__eyebrow">Análise da semana</p>
        <p className="insight__muted">{s.message}</p>
      </section>
    );
  }
  if (s.status === 'skipped') {
    return (
      <section className="insight insight-quiet">
        <p className="page__eyebrow">Análise da semana · {weekLabel(s.week)}</p>
        <p className="insight__muted">
          Semana com pouco treino ({s.minutes} min em {s.days} {s.days === 1 ? 'dia' : 'dias'}): sem análise, para não gastar à toa. A análise sai toda segunda quando a semana anterior tem pelo menos 60 minutos em 3 dias.
        </p>
      </section>
    );
  }

  const { insight, targets } = s;
  const route = (id: string) => targets.find((t) => t.id === id)?.rota ?? '/treino';
  const immersive = (to: string) => to !== '/treino';
  return (
    <section className="insight" aria-labelledby="insight-title">
      <p className="page__eyebrow">Análise da semana · {weekLabel(s.week)}</p>
      <h2 className="insight__title" id="insight-title">{insight.titulo}</h2>
      <p className="insight__summary">{insight.resumo}</p>
      {(insight.melhorou.length > 0 || insight.atencao.length > 0) && (
        <div className="insight__cols">
          {insight.melhorou.length > 0 && (
            <div>
              <h3 className="insight__head">O que melhorou</h3>
              <ul className="insight__list">
                {insight.melhorou.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}
          {insight.atencao.length > 0 && (
            <div>
              <h3 className="insight__head">Pede atenção</h3>
              <ul className="insight__list">
                {insight.atencao.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {insight.acoes.length > 0 && (
        <>
          <h3 className="insight__head">Para esta semana</h3>
          <ol className="insight__actions">
            {insight.acoes.map((a, i) => {
              const to = route(a.alvo);
              return (
                <li key={i} className="insight__action">
                  <span className="insight__actionN" aria-hidden>{i + 1}</span>
                  <span className="insight__actionBody">
                    <span className="insight__actionTitle">{a.titulo}</span>
                    <span className="insight__actionHow">{a.como}</span>
                    <span className="insight__actionMeta">
                      {a.minutos} min ·{' '}
                      <Link to={to} state={immersive(to) ? { background: location, ...(a.compassos ? { from: a.compassos.de, to: a.compassos.ate } : {}) } : undefined}>
                        Abrir{a.compassos ? ` nos compassos ${a.compassos.de} a ${a.compassos.ate}` : ''}
                      </Link>
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <p className="insight__note">
        <CheckIcon className="insight__noteIcon" />
        Feita pela IA a partir dos números do app. "Dedo" é o do dedilhado sugerido: o piano não diz qual dedo você usou.
      </p>
    </section>
  );
}
