import { Link } from 'react-router-dom';
import Staff from '../../components/Staff';
import { useElementWidth } from '../../hooks/useFullscreen';

const LINES = [64, 67, 71, 74, 77];
const SPACES = [65, 69, 72, 76];

export default function ClefLesson() {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const w = Math.min(width, 520);
  return (
    <>
      <p className="lesson__p">
        A pauta tem <strong>cinco linhas</strong> e <strong>quatro espaços</strong>. A clave de sol, o símbolo no começo, enrola na segunda linha de baixo para
        cima e diz que ali mora o <strong>Sol</strong> (Sol4). Daí em diante, cada linha e cada espaço é a nota seguinte.
      </p>

      <div className="lesson__pair" ref={ref}>
        <figure className="lesson__figure">
          <Staff notes={LINES} states={LINES.map(() => 'plain')} current={0} showNames width={w} label="Notas nas linhas: Mi, Sol, Si, Ré, Fá" />
          <figcaption className="lesson__caption">
            Nas linhas, de baixo para cima: <strong>Mi, Sol, Si, Ré, Fá</strong>.
          </figcaption>
        </figure>
        <figure className="lesson__figure">
          <Staff notes={SPACES} states={SPACES.map(() => 'plain')} current={0} showNames width={w} label="Notas nos espaços: Fá, Lá, Dó, Mi" />
          <figcaption className="lesson__caption">
            Nos espaços: <strong>Fá, Lá, Dó, Mi</strong>.
          </figcaption>
        </figure>
      </div>

      <p className="lesson__p">
        Um jeito de lembrar: decore só uma nota de referência por clave (o Sol da segunda linha) e conte a partir dela. Com a prática você para de contar e
        passa a reconhecer a posição, que é o que o Treino de leitura exercita.
      </p>
      <p className="lesson__p">
        O <strong>Dó central</strong> (Dó4) fica numa linha extra logo abaixo da pauta, chamada linha suplementar.
      </p>

      <section className="lesson__try">
        <h2 className="lesson__h2">Experimente</h2>
        <p className="lesson__p">O treino de notas soltas usa exatamente essas posições, de Dó a Sol.</p>
        <Link className="button button-primary" to="/treino">
          Ir para o Treino
        </Link>
      </section>
    </>
  );
}
