// Em que área do app você está, pelo endereço. Serve para o rastreador de visitas e para "onde foi o tempo".
// Puro e testado (areas.test.ts).

export type Area = 'musicas' | 'tecnica' | 'leitura' | 'ouvido' | 'curso' | 'livre' | 'arcade' | 'treino' | 'consulta' | 'navegacao';

const RULES: [RegExp, Area][] = [
  [/^\/peca\/[^/]+\/estudar\/?$/, 'musicas'],
  [/^\/curso\/musica\//, 'musicas'],
  [/^\/partitura\//, 'musicas'],
  [/^\/tocar\/?$/, 'livre'],
  [/^\/treino\/notas\/?$/, 'leitura'],
  [/^\/treino\/eco\/?$/, 'ouvido'],
  [/^\/treino\/(sessao|foco)\/?$/, 'tecnica'],
  [/^\/treino\/?$/, 'treino'],
  [/^\/arcade\/.+/, 'arcade'],
  [/^\/curso\/foco\//, 'curso'],
  [/^\/estudo\/unidade\/[^/]+\/[^/]+\/?$/, 'curso'],
  [/^\/consulta(\/|$)/, 'consulta'],
];

export function viewArea(pathname: string): Area {
  for (const [re, area] of RULES) if (re.test(pathname)) return area;
  return 'navegacao';
}

export const AREA_LABEL: Record<Area, string> = {
  musicas: 'Músicas',
  tecnica: 'Técnica e exercícios',
  leitura: 'Leitura',
  ouvido: 'Ouvido',
  curso: 'Lições do curso',
  livre: 'Tocar livre',
  arcade: 'Arcade',
  treino: 'Treino (página)',
  consulta: 'Consulta',
  navegacao: 'Navegando no app',
};

/** Nome curto da página, para a linha do tempo ("Abriu Leitura de notas e saiu sem tocar"). */
export function viewName(pathname: string): string {
  if (/^\/peca\/[^/]+\/estudar/.test(pathname) || /^\/curso\/musica\//.test(pathname)) return 'Tocar a música';
  if (/^\/partitura\//.test(pathname)) return 'Partitura';
  if (/^\/tocar/.test(pathname)) return 'Tocar livre';
  if (/^\/treino\/notas/.test(pathname)) return 'Leitura de notas';
  if (/^\/treino\/eco/.test(pathname)) return 'Ouvir e tocar de volta';
  if (/^\/treino\/(sessao|foco)/.test(pathname)) return 'Treino';
  if (/^\/treino/.test(pathname)) return 'Página do treino';
  if (/^\/arcade\/./.test(pathname)) return 'Arcade';
  if (/^\/arcade/.test(pathname)) return 'Lista do arcade';
  if (/^\/curso\/foco|^\/estudo\/unidade\/[^/]+\/[^/]+/.test(pathname)) return 'Lição';
  if (/^\/estudo/.test(pathname)) return 'Estudo';
  if (/^\/consulta/.test(pathname)) return 'Consulta';
  if (/^\/repertorio/.test(pathname)) return 'Repertório';
  if (/^\/progresso/.test(pathname)) return 'Progresso';
  if (/^\/estatisticas/.test(pathname)) return 'Estatísticas';
  if (/^\/conta/.test(pathname)) return 'Conta';
  if (pathname === '/' || pathname === '') return 'Hoje';
  return 'Outra página';
}
