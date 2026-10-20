// Análise semanal: o prompt, o formato da resposta e a validação. Puro e testado (src/insight/insight.test.ts).
// A IA recebe o resumo já calculado pelo app e só interpreta; não inventa número.

export interface InsightAction {
  titulo: string;
  como: string;
  minutos: number;
  /** id de um dos alvos do resumo (música, leitura, treino…) */
  alvo: string;
  compassos?: { de: number; ate: number };
  /** o que conta como feito: andamento mínimo e acerto (0 a 1) em 3 passadas seguidas */
  criterio?: { bpm?: number; acerto?: number };
}

export interface Insight {
  titulo: string;
  resumo: string;
  melhorou: string[];
  atencao: string[];
  acoes: InsightAction[];
  foco: string;
}

export const INSIGHT_SYSTEM = `Você é um professor de piano experiente e direto. Analisa, uma vez por semana, os dados de prática de Rafael, um adulto que aprende piano sozinho com o app Fermata, num piano digital conectado por MIDI.

Você recebe um JSON com a semana, já calculado pelo app: minutos e dias, cada música e exercício com o acerto de cada passada, o acerto por andamento, se ele adiantou ou atrasou, passadas que aceleraram, os compassos com mais erro (tipo de erro, trocas de tecla, número das passadas), os erros por dedo, a leitura, o ouvido e os marcos gravados. Em "musicasSemDetalhe" estão músicas tocadas antes de o app registrar nota a nota: ali só há acerto por passada, andamento, trechos tocados e o trecho mais fraco de cada passada.

O mais importante são os "blocos": cada bloco é uma sequência de passadas da mesma música, no mesmo trecho, mão e andamento (por exemplo 30 passadas dos compassos 1 a 8 a 60 BPM). Mudou o trecho ou o andamento, é outro bloco. Cada bloco traz o acerto da primeira, da última e da melhor passada, a partir de qual passada ficou firme (3 seguidas acima de 85%), as notas com mais erro (nota, compasso, tipo de erro, em quantas passadas), o tempo (adiantado ou atrasado, em ms) e quantas vezes parou no meio. Use os blocos para contar a história da semana: como ele praticou, em que andamento ficou firme, onde travou e se subiu de andamento cedo demais ou tarde demais. "padroes" são erros que se repetem em várias músicas, já calculados. "estudar" são voltas no modo em que a partitura espera cada nota (sem tempo).

Regras:
- Use só os números do JSON. Cite os números que sustentam cada conclusão (compasso, passada, BPM, porcentagem). Nunca invente dado.
- O MIDI não diz com qual dedo ele tocou. "Dedo" no JSON é o do dedilhado sugerido para aquela nota. Escreva "nas notas do dedo 5" ou "onde o dedilhado pede o mínimo", nunca "você usou o dedo 5".
- Procure a causa provável e ligue os sinais: erro que cresce acima de um andamento indica velocidade acima do que a mão já tem; passadas que aceleram indicam pressa; trocas entre teclas vizinhas indicam mão fora de posição; erros concentrados num dedo ou na passagem do polegar indicam técnica daquele movimento.
- Compare blocos: o mesmo trecho em andamentos diferentes, ou o mesmo andamento em dias diferentes. Diga se a estratégia de prática funcionou (por exemplo: muitas passadas sem melhora indicam que precisa mudar o método, não repetir mais).
- Seja honesto. Se a semana foi fraca, diga sem drama. Elogio só quando há número que o justifique.
- Ações concretas, cada uma com no máximo 15 minutos: o quê, onde (música e compassos), em qual andamento e como (devagar, mãos separadas, ritmos pontuados, metrônomo que some, parar antes do erro). Cada ação aponta para um "alvo" da lista "alvos" do JSON (use o id exato). Para músicas, informe os compassos.
- Português do Brasil, "você", frases curtas, sem emoji, vírgula decimal, números sempre com unidade, sem Title Case.
- Se uma área não tem dados, não fale dela.
- "musicasSoExploradas" são músicas que ele só abriu para ver como eram, sem estudar: não analise, não cite como problema, não proponha ação nem foco sobre elas.
- O foco e as ações são sobre o que ele está estudando. Cada ação de música traz em "criterio" o que conta como feito (andamento e acerto), para o app marcar sozinho quando ele conseguir.`;

/** Ferramenta que força a resposta no formato certo. */
export const INSIGHT_TOOL = {
  name: 'registrar_analise',
  description: 'Registra a análise da semana de prática.',
  input_schema: {
    type: 'object',
    properties: {
      titulo: { type: 'string', description: 'Uma frase curta que resume a semana (até 60 caracteres).' },
      resumo: { type: 'string', description: 'De 3 a 6 frases: o que aconteceu, o principal padrão e a causa provável, com números.' },
      melhorou: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'O que melhorou, com número.' },
      atencao: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'O que precisa de atenção, com onde e quanto.' },
      acoes: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string', description: 'Ação em poucas palavras.' },
            como: { type: 'string', description: 'Como fazer: andamento, compassos, método. 1 a 3 frases.' },
            minutos: { type: 'integer', minimum: 3, maximum: 15 },
            alvo: { type: 'string', description: 'id de um item de "alvos".' },
            compassos: { type: 'object', properties: { de: { type: 'integer' }, ate: { type: 'integer' } } },
            criterio: {
              type: 'object',
              description: 'Só para música: o que conta como feito, para o app marcar sozinho (andamento mínimo em BPM e acerto em %, em 3 passadas seguidas).',
              properties: { bpm: { type: 'integer' }, acerto: { type: 'integer', minimum: 50, maximum: 100 } },
            },
          },
          required: ['titulo', 'como', 'minutos', 'alvo'],
        },
      },
      foco: { type: 'string', description: 'O foco da semana numa frase curta, para a tela Hoje (até 90 caracteres).' },
    },
    required: ['titulo', 'resumo', 'melhorou', 'atencao', 'acoes', 'foco'],
  },
} as const;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v: unknown, max: number) => (Array.isArray(v) ? v.map((x) => str(x, 400)).filter(Boolean).slice(0, max) : []);

/** Confere e limpa o que a IA devolveu. Ação com alvo desconhecido vai para o treino do dia. */
export function parseInsight(input: unknown, targets: string[]): Insight | null {
  if (typeof input !== 'object' || input === null) return null;
  const o = input as Record<string, unknown>;
  const resumo = str(o.resumo, 1500);
  if (!resumo) return null;
  const acoes: InsightAction[] = (Array.isArray(o.acoes) ? o.acoes : []).slice(0, 3).flatMap((a): InsightAction[] => {
    if (typeof a !== 'object' || a === null) return [];
    const x = a as Record<string, unknown>;
    const titulo = str(x.titulo, 120);
    const como = str(x.como, 500);
    if (!titulo || !como) return [];
    const c = x.compassos as Record<string, unknown> | undefined;
    const de = typeof c?.de === 'number' ? Math.max(1, Math.round(c.de)) : null;
    const ate = typeof c?.ate === 'number' ? Math.max(de ?? 1, Math.round(c.ate)) : null;
    const alvo = typeof x.alvo === 'string' && targets.includes(x.alvo) ? x.alvo : 'treino';
    const k = x.criterio as Record<string, unknown> | undefined;
    const bpm = typeof k?.bpm === 'number' && k.bpm >= 20 && k.bpm <= 240 ? Math.round(k.bpm) : undefined;
    const acc = typeof k?.acerto === 'number' ? (k.acerto > 1 ? k.acerto / 100 : k.acerto) : undefined;
    const criterio = bpm || acc ? { ...(bpm ? { bpm } : {}), ...(acc ? { acerto: Math.min(1, Math.max(0.5, acc)) } : {}) } : undefined;
    return [{ titulo, como, minutos: Math.min(15, Math.max(3, Math.round(Number(x.minutos) || 10))), alvo, ...(de && ate ? { compassos: { de, ate } } : {}), ...(criterio ? { criterio } : {}) }];
  });
  return {
    titulo: str(o.titulo, 80) || 'Sua semana no piano',
    resumo,
    melhorou: strList(o.melhorou, 3),
    atencao: strList(o.atencao, 3),
    acoes,
    foco: str(o.foco, 140),
  };
}

/** Semana no formato AAAA-MM-DD (segunda-feira). */
export function isWeekId(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
