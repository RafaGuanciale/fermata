import { Link } from 'react-router-dom';
import PhotoCard from '../components/PhotoCard';
import { PlayIcon } from '../components/Icons';
import { enterFullscreen } from '../hooks/useFullscreen';

export default function PracticeHubPage() {
  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">Leitura com resposta na hora</span>
        <h1 className="page__title">Treino</h1>
        <p className="page__lead">Escolha um treino. Ele abre em tela cheia, só com a pauta e o teclado.</p>
      </header>

      <div className="hub__grid">
        <PhotoCard photo="practiceLocate" size="wide" eyebrow="Clave de sol · cerca de 3 min" title="Notas soltas de Dó a Sol" sizes="(max-width: 900px) 100vw, 50vw">
          <span className="photoCard__body">Doze notas em sequência, como numa melodia. O foco é achar a tecla certa.</span>
          <span className="photoCard__actions">
            <Link className="button button-primary" to="/treino/sessao?modo=notas" onClick={enterFullscreen}>
              <PlayIcon className="button__icon" />
              Praticar
            </Link>
          </span>
        </PhotoCard>
        <PhotoCard photo="practiceSong" size="wide" eyebrow="Beethoven · posição de Dó" title="Ode à Alegria" sizes="(max-width: 900px) 100vw, 50vw">
          <span className="photoCard__body">Os primeiros quatro compassos, nota por nota, no seu tempo.</span>
          <span className="photoCard__actions">
            <Link className="button button-primary" to="/treino/sessao?modo=musica" onClick={enterFullscreen}>
              <PlayIcon className="button__icon" />
              Tocar
            </Link>
          </span>
        </PhotoCard>
      </div>

      <section className="page__section">
        <h2 className="page__sectionTitle">Chegando depois</h2>
        <p className="page__lead">Treino com metrônomo (nota certa no tempo certo), clave de fá e mãos juntas.</p>
      </section>
    </>
  );
}
