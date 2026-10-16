// Onde o tempo de piano conta. "Livre": o Tocar livre, conta igual a "tocar" e fica separado no Progresso.
// "Tocar": telas em que você toca (treino, arcade, partitura, músicas e lições);
// lá conta cada minuto com pelo menos uma nota. "Estudar": lições e consulta; lá conta também o minuto em que
// você está lendo (com a página visível e algum movimento: rolar, clicar, teclar). No resto (Hoje, Progresso,
// listas, conta), nada conta, nem as notas tocadas no teclado do rodapé.

export type PracticeKind = 'tocar' | 'estudar' | 'livre';

const RULES: [RegExp, PracticeKind][] = [
  [/^\/tocar\/?$/, 'livre'],
  [/^\/estudo\/unidade\/[^/]+\/[^/]+\/?$/, 'estudar'],
  [/^\/consulta(\/|$)/, 'estudar'],
  [/^\/curso\/foco\//, 'estudar'],
  [/^\/treino(\/|$)/, 'tocar'],
  [/^\/arcade\/.+/, 'tocar'],
  [/^\/partitura\//, 'tocar'],
  [/^\/peca\/[^/]+\/estudar\/?$/, 'tocar'],
  [/^\/curso\/musica\//, 'tocar'],
];

export function practiceKind(pathname: string): PracticeKind | null {
  // A calibração do atraso não é prática.
  if (/^\/treino\/calibrar\/?$/.test(pathname)) return null;
  for (const [re, kind] of RULES) if (re.test(pathname)) return kind;
  return null;
}
