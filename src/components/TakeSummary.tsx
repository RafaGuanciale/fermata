// Resumo de uma passada no tempo: acerto, notas no tempo, fora do tempo, erradas e a mais.

import type { TakeResult } from '../training/timing';

export function TakeSummary({ result }: { result: TakeResult }) {
  const count = (g: string) => result.notes.filter((n) => n?.grade === g).length;
  return (
    <span className="takeSummary">
      <strong>{Math.round(result.accuracy * 100)}% de acerto</strong>
      <span>{count('perfect') + count('good')} no tempo</span>
      {count('off') > 0 && <span>{count('off')} fora do tempo</span>}
      {count('miss') > 0 && <span>{count('miss')} erradas ou faltando</span>}
      {result.extras > 0 && <span>{result.extras} a mais</span>}
    </span>
  );
}
