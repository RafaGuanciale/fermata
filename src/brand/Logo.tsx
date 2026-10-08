// Logotipo no mesmo desenho do Permana: a moeda com a inicial faz o papel da primeira letra
// e o resto do nome segue em Cinzel. Lê-se FERMATA.

// F com serifas, desenhado em caminho para não depender da fonte carregar (favicon, ícone do app).
export const F_PATH =
  'M34 30H66V42H64Q63 37 58 37H49V47H56Q59 47 59.5 44H61V56H59.5Q59 53 56 53H49V68H55V70H34V68H39V32H34Z';

export function FermataMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <circle className="logo__coin" cx="50" cy="50" r="48" />
      <circle className="logo__ring" cx="50" cy="50" r="41.5" fill="none" />
      <path className="logo__letter" d={F_PATH} />
    </svg>
  );
}

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={'logo' + (compact ? ' logo-compact' : '')}>
      <FermataMark className="logo__mark" title={compact ? 'Fermata' : undefined} />
      {!compact && (
        <span className="logo__word" aria-label="Fermata">
          <span aria-hidden>ERMATA</span>
        </span>
      )}
    </span>
  );
}
