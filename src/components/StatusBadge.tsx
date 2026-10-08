import type { LearnStatus } from '../db/db';
import { STATUS_LABEL } from '../repertoire/catalog';

/** O glifo enche conforme o estado avança, então dá para ler sem depender da cor. */
export default function StatusBadge({ status }: { status: LearnStatus }) {
  return (
    <span className={`statusBadge statusBadge-${status}`}>
      <span className="statusBadge__glyph" aria-hidden>
        {status === 'repertoire' ? '𝄐' : ''}
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}
