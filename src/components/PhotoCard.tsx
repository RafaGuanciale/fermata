// Cartão com foto ao fundo e título por cima, no estilo das categorias do Permana.
// Se a foto não carregar, o fundo vira um degradê da paleta e o cartão continua legível.

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { photoSrcSet, photoUrl, type PhotoKey } from '../media/photos';

interface PhotoCardProps {
  photo: PhotoKey;
  title: string;
  eyebrow?: string;
  /** Selo no canto superior: "3 no repertório" */
  badge?: string;
  to?: string;
  onClick?: () => void;
  children?: ReactNode;
  size?: 'tall' | 'wide' | 'hero';
  sizes?: string;
}

export default function PhotoCard({ photo, title, eyebrow, badge, to, onClick, children, size = 'tall', sizes = '(max-width: 720px) 50vw, 25vw' }: PhotoCardProps) {
  const [failed, setFailed] = useState(false);
  const body = (
    <>
      {!failed && (
        <img
          className="photoCard__img"
          src={photoUrl(photo, 700)}
          srcSet={photoSrcSet(photo)}
          sizes={sizes}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <span className="photoCard__scrim" aria-hidden />
      {badge && (
        <span className="photoCard__badge">
          <span className="photoCard__dot" aria-hidden />
          {badge}
        </span>
      )}
      <span className="photoCard__text">
        {eyebrow && <span className="photoCard__eyebrow">{eyebrow}</span>}
        <span className="photoCard__title">{title}</span>
        {children}
      </span>
    </>
  );
  const cls = `photoCard photoCard-${size}` + (failed ? ' photoCard-fallback' : '');
  if (to) return <Link className={cls} to={to} onClick={onClick}>{body}</Link>;
  if (onClick) return <button className={cls} type="button" onClick={onClick}>{body}</button>;
  return <div className={cls}>{body}</div>;
}
