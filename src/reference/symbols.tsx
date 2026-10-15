// Símbolos da partitura: cada um desenhado num pedaço de pauta, com o que é e o que fazer no piano.
// Desenho em SVG (não fonte), para o staccato, a fermata e as ligaduras ficarem no lugar certo em qualquer tela.

import type { ReactNode } from 'react';
import type { Listen } from '../course/types';

// ---------- medidas ----------

const S = 8; // distância entre linhas
const BOT = 52; // linha de baixo (Mi4 na clave de sol)
export const ART_W = 150;
export const ART_H = 84;
const Y = (step: number) => BOT - (step * S) / 2;
const RX = 5.2;
const RY = 3.8;

// ---------- peças ----------

function Staff({ from = 6, to = ART_W - 6 }: { from?: number; to?: number }) {
  return <>{[0, 2, 4, 6, 8].map((s) => <line key={s} className="sym__line" x1={from} x2={to} y1={Y(s)} y2={Y(s)} />)}</>;
}

function Treble({ x = 8 }: { x?: number }) {
  return <text className="sym__music" x={x} y={BOT + 0.95 * S} fontSize={6.4 * S}>𝄞</text>;
}

function Bass({ x = 10 }: { x?: number }) {
  return <text className="sym__music" x={x} y={Y(8) + 2.95 * S} fontSize={4 * S}>𝄢</text>;
}

function ledgers(x: number, step: number, rx = RX) {
  const out: ReactNode[] = [];
  for (let s = -2; s >= step; s -= 2) out.push(<line key={`l${s}`} className="sym__line" x1={x - rx - 3.5} x2={x + rx + 3.5} y1={Y(s)} y2={Y(s)} />);
  for (let s = 10; s <= step; s += 2) out.push(<line key={`l${s}`} className="sym__line" x1={x - rx - 3.5} x2={x + rx + 3.5} y1={Y(s)} y2={Y(s)} />);
  return out;
}

function Head({ x, step, open = false, whole = false, scale = 1 }: { x: number; step: number; open?: boolean; whole?: boolean; scale?: number }) {
  const rx = RX * scale * (whole ? 1.15 : 1);
  const ry = RY * scale;
  return (
    <>
      {ledgers(x, step, rx)}
      <ellipse
        className={open || whole ? 'sym__headOpen' : 'sym__head'}
        cx={x}
        cy={Y(step)}
        rx={open || whole ? rx - 0.8 : rx}
        ry={open || whole ? ry - 0.8 : ry}
        strokeWidth={whole ? 2.2 : open ? 1.6 : 0}
        transform={`rotate(-20 ${x} ${Y(step)})`}
      />
    </>
  );
}

type Dur = 'w' | 'h' | 'q' | '8' | '16';

/** Uma nota com haste (e bandeirola). `up` por padrão quando a nota está abaixo da 3ª linha. */
function Note({ x, step, dur = 'q', up, scale = 1, flag = true }: { x: number; step: number; dur?: Dur; up?: boolean; scale?: number; flag?: boolean }) {
  const goesUp = up ?? step < 4;
  const len = 26 * scale;
  const sx = goesUp ? x + RX * scale - 0.7 : x - RX * scale + 0.7;
  const y0 = Y(step);
  const y1 = goesUp ? y0 - len : y0 + len;
  const flags = dur === '8' ? 1 : dur === '16' ? 2 : 0;
  return (
    <>
      <Head x={x} step={step} open={dur === 'h'} whole={dur === 'w'} scale={scale} />
      {dur !== 'w' && <line className="sym__stem" x1={sx} x2={sx} y1={y0} y2={y1} />}
      {flag &&
        Array.from({ length: flags }, (_, k) => {
          const fy = goesUp ? y1 + k * 6 : y1 - k * 6;
          return <path key={k} className="sym__flag" d={goesUp ? `M${sx} ${fy} q 2 7 8 10 q -3 -3 -8 -5 z` : `M${sx} ${fy} q 2 -7 8 -10 q -3 3 -8 5 z`} />;
        })}
    </>
  );
}

function Dot({ x, step }: { x: number; step: number }) {
  return <circle className="sym__head" cx={x + 9} cy={Y(step) - (step % 2 === 0 ? S / 2 : 0)} r={1.7} />;
}

/** Curva entre duas notas (ligadura). `below`: curva por baixo. */
function Arc({ x1, x2, y, below = false, h = 7 }: { x1: number; x2: number; y: number; below?: boolean; h?: number }) {
  const mid = (x1 + x2) / 2;
  const c = below ? y + h : y - h;
  return <path className="sym__arc" d={`M${x1} ${y} Q ${mid} ${c} ${x2} ${y} Q ${mid} ${c + (below ? 1.6 : -1.6)} ${x1} ${y} z`} />;
}

function Bar({ x, kind = 'single' }: { x: number; kind?: 'single' | 'double' | 'final' }) {
  return (
    <>
      <line className="sym__line" x1={x} x2={x} y1={Y(8)} y2={Y(0)} />
      {kind === 'double' && <line className="sym__line" x1={x + 4} x2={x + 4} y1={Y(8)} y2={Y(0)} />}
      {kind === 'final' && <rect className="sym__head" x={x + 3} y={Y(8)} width={3.6} height={4 * S} />}
    </>
  );
}

function Txt({ x, y, children, cls = 'sym__text', anchor = 'middle', size }: { x: number; y: number; children: ReactNode; cls?: string; anchor?: 'start' | 'middle' | 'end'; size?: number }) {
  return <text className={cls} x={x} y={y} textAnchor={anchor} fontSize={size}>{children}</text>;
}

const WHOLE_REST = (x: number) => <rect className="sym__head" x={x - 6} y={Y(6)} width={12} height={4} />;
const HALF_REST = (x: number) => <rect className="sym__head" x={x - 6} y={Y(4) - 4} width={12} height={4} />;

// ---------- catálogo ----------

export type SymbolGroup =
  | 'Notas juntas'
  | 'Figuras e pausas'
  | 'Duração'
  | 'Acidentes e armadura'
  | 'Clave, compasso e barras'
  | 'Articulação'
  | 'Dinâmica'
  | 'Repetição'
  | 'Oitava e pedal'
  | 'Ornamentos'
  | 'Outras marcas';

export interface MusicSymbol {
  id: string;
  group: SymbolGroup;
  name: string;
  /** O que é, numa frase. */
  what: string;
  /** O que fazer no piano. */
  how: string;
  art: ReactNode;
  listen?: Listen;
  /** Unidade do curso que ensina. */
  unit?: number;
}

const L = (bpm: number, steps: [number[], number, number?][]): Listen => ({ bpm, steps: steps.map(([midis, beats, velocity]) => ({ midis, beats, velocity })) });

export const SYMBOLS: MusicSymbol[] = [
  // Notas juntas
  {
    id: 'acorde', group: 'Notas juntas', name: 'Notas empilhadas (acorde)', unit: 3,
    what: 'Duas ou mais cabeças de nota uma sobre a outra, presas à mesma haste.',
    how: 'Toque todas ao mesmo tempo, como um bloco. Duas notas juntas formam um intervalo; três ou mais, um acorde.',
    art: <><Staff /><Treble /><Head x={70} step={-2} /><Head x={70} step={0} /><Head x={70} step={2} /><line className="sym__stem" x1={74.5} x2={74.5} y1={Y(-2)} y2={Y(2) - 26} /><Head x={112} step={5} /><Head x={112} step={7} /><line className="sym__stem" x1={107.5} x2={107.5} y1={Y(7)} y2={Y(5) + 26} /></>,
    listen: L(70, [[[60, 64, 67], 2], [[72, 76], 2]]),
  },
  {
    id: 'segunda', group: 'Notas juntas', name: 'Notas vizinhas na mesma haste',
    what: 'Duas cabeças lado a lado, uma de cada lado da haste. São notas vizinhas (uma na linha, outra no espaço logo acima), que não cabem empilhadas.',
    how: 'Toque as duas juntas, como no acorde. O deslocamento é só para caber no desenho.',
    art: <><Staff /><Treble /><Head x={70} step={1} /><Head x={79.5} step={2} /><line className="sym__stem" x1={74.6} x2={74.6} y1={Y(1)} y2={Y(2) - 26} /><Head x={110} step={0} /><Head x={119.5} step={1} /><Head x={110} step={3} /><line className="sym__stem" x1={114.6} x2={114.6} y1={Y(0)} y2={Y(3) - 26} /></>,
    listen: L(70, [[[65, 67], 2], [[64, 65, 71], 2]]),
  },
  {
    id: 'vozes', group: 'Notas juntas', name: 'Duas vozes na mesma pauta',
    what: 'Hastes para cima e hastes para baixo ao mesmo tempo: duas linhas melódicas na mesma pauta.',
    how: 'A de haste para cima (geralmente a melodia) e a de haste para baixo têm durações próprias. Segure cada uma pelo tempo da sua figura.',
    art: <><Staff /><Treble /><Note x={60} step={5} dur="q" up /><Note x={90} step={4} dur="q" up /><Note x={120} step={3} dur="q" up /><Note x={60} step={0} dur="h" up={false} /><Note x={120} step={-1} dur="q" up={false} /></>,
  },
  // Figuras e pausas
  {
    id: 'figuras', group: 'Figuras e pausas', name: 'Figuras: quanto dura cada nota', unit: 1,
    what: 'Semibreve (4 tempos), mínima (2), semínima (1), colcheia (meio tempo) e semicolcheia (um quarto de tempo).',
    how: 'O formato diz quanto tempo segurar: oval vazado sem haste dura mais; cheia com bandeirola dura menos. Cada bandeirola corta a duração pela metade.',
    art: <><Staff /><Note x={18} step={2} dur="w" /><Note x={46} step={2} dur="h" /><Note x={72} step={2} dur="q" /><Note x={98} step={2} dur="8" /><Note x={124} step={2} dur="16" /><Txt x={18} y={76}>4</Txt><Txt x={46} y={76}>2</Txt><Txt x={72} y={76}>1</Txt><Txt x={100} y={76}>½</Txt><Txt x={126} y={76}>¼</Txt></>,
    listen: L(80, [[[67], 4], [[67], 2], [[67], 1], [[67], 0.5], [[67], 0.5], [[67], 0.25], [[67], 0.25], [[67], 0.25], [[67], 0.25]]),
  },
  {
    id: 'barra', group: 'Figuras e pausas', name: 'Colcheias ligadas por barra',
    what: 'Em vez de bandeirolas, as colcheias de um mesmo tempo aparecem unidas por uma barra grossa (duas barras: semicolcheias).',
    how: 'Mesma duração das colcheias soltas. A barra só agrupa o que cabe em um tempo, para facilitar a leitura.',
    art: <><Staff /><Treble /><Note x={62} step={2} dur="q" flag={false} up /><Note x={82} step={3} dur="q" flag={false} up /><line className="sym__beam" x1={66.5} x2={86.5} y1={Y(2) - 26} y2={Y(3) - 26} /><Note x={104} step={4} dur="q" flag={false} up /><Note x={116} step={3} dur="q" flag={false} up /><Note x={128} step={2} dur="q" flag={false} up /><Note x={140} step={1} dur="q" flag={false} up /><line className="sym__beam" x1={108.5} x2={144.5} y1={Y(4) - 26} y2={Y(4) - 26} /><line className="sym__beam" x1={108.5} x2={144.5} y1={Y(4) - 21} y2={Y(4) - 21} /></>,
  },
  {
    id: 'pausas', group: 'Figuras e pausas', name: 'Pausas: silêncio medido', unit: 1,
    what: 'Cada figura tem a sua pausa. Semibreve: retângulo pendurado na 4ª linha. Mínima: sentado na 3ª linha. Depois, semínima, colcheia e semicolcheia.',
    how: 'Tire a mão e conte o tempo da pausa sem parar o pulso. Silêncio também é música.',
    art: <><Staff />{WHOLE_REST(20)}{HALF_REST(46)}<Txt x={72} y={Y(4) + 10} cls="sym__music" size={34}>𝄽</Txt><Txt x={98} y={Y(4) + 7} cls="sym__music" size={30}>𝄾</Txt><Txt x={124} y={Y(4) + 9} cls="sym__music" size={30}>𝄿</Txt><Txt x={20} y={76}>4</Txt><Txt x={46} y={76}>2</Txt><Txt x={72} y={76}>1</Txt><Txt x={98} y={76}>½</Txt><Txt x={124} y={76}>¼</Txt></>,
  },
  // Duração
  {
    id: 'ponto', group: 'Duração', name: 'Ponto de aumento', unit: 2,
    what: 'Um ponto logo depois da nota.',
    how: 'A nota dura mais a metade do seu valor: mínima pontuada dura 3 tempos; semínima pontuada, 1 tempo e meio.',
    art: <><Staff /><Treble /><Note x={70} step={2} dur="h" /><Dot x={70} step={2} /><Note x={115} step={3} dur="q" /><Dot x={115} step={3} /><Txt x={72} y={78}>3 tempos</Txt><Txt x={117} y={78}>1½</Txt></>,
    listen: L(80, [[[67], 3], [[65], 1.5], [[64], 0.5], [[60], 2]]),
  },
  {
    id: 'ligadura-prolongamento', group: 'Duração', name: 'Ligadura de prolongamento', unit: 2,
    what: 'Uma curva unindo duas notas iguais (mesma altura).',
    how: 'Toque só a primeira e segure pela soma das duas. Não toque a segunda de novo.',
    art: <><Staff /><Treble /><Note x={62} step={2} dur="h" /><Bar x={90} /><Note x={112} step={2} dur="q" /><Arc x1={64} x2={110} y={Y(2) + 7} below /></>,
    listen: L(80, [[[67], 3], [[64], 1]]),
  },
  {
    id: 'ligadura-expressao', group: 'Duração', name: 'Ligadura de expressão (frase)', unit: 1,
    what: 'Uma curva sobre notas diferentes.',
    how: 'Toque ligado (legato): solte cada tecla só quando a próxima já estiver descendo. A curva também mostra onde a frase respira.',
    art: <><Staff /><Treble /><Note x={56} step={-2} dur="q" /><Note x={78} step={-1} dur="q" /><Note x={100} step={0} dur="q" /><Note x={122} step={1} dur="q" /><Arc x1={56} x2={124} y={Y(-2) + 10} below h={9} /></>,
    listen: L(90, [[[60], 1], [[62], 1], [[64], 1], [[65], 1]]),
  },
  {
    id: 'fermata', group: 'Duração', name: 'Fermata', unit: 1,
    what: 'Um arco com um ponto no meio, sobre (ou sob) a nota ou a pausa.',
    how: 'Segure mais do que o escrito, à vontade, geralmente perto do dobro. O pulso para e recomeça depois.',
    art: <><Staff /><Treble /><Note x={90} step={2} dur="q" /><path className="sym__arc" d={`M78 ${Y(8) - 6} Q 90 ${Y(8) - 20} 102 ${Y(8) - 6} Q 90 ${Y(8) - 17} 78 ${Y(8) - 6} z`} /><circle className="sym__head" cx={90} cy={Y(8) - 8} r={1.8} /></>,
    listen: L(80, [[[60], 1], [[62], 1], [[64], 3.5], [[60], 2]]),
  },
  {
    id: 'tercina', group: 'Duração', name: 'Tercina', unit: 5,
    what: 'Três notas agrupadas com um 3 em cima.',
    how: 'Toque as três no tempo de duas: três notas iguais dentro de um tempo, sem correr nem frear.',
    art: <><Staff /><Treble /><Note x={70} step={0} dur="q" flag={false} up /><Note x={88} step={1} dur="q" flag={false} up /><Note x={106} step={2} dur="q" flag={false} up /><line className="sym__beam" x1={74.5} x2={110.5} y1={Y(0) - 26} y2={Y(2) - 26} /><Txt x={92} y={Y(2) - 31} cls="sym__italic">3</Txt></>,
    listen: L(70, [[[67], 1 / 3], [[69], 1 / 3], [[71], 1 / 3], [[72], 1]]),
  },
  // Acidentes
  {
    id: 'sustenido', group: 'Acidentes e armadura', name: 'Sustenido ♯', unit: 2,
    what: 'Sinal antes da nota.',
    how: 'Toque a tecla meio tom acima, geralmente a preta à direita. Vale até o fim do compasso para a mesma nota.',
    art: <><Staff /><Treble /><Txt x={76} y={Y(1) + 6} cls="sym__music" size={22}>♯</Txt><Note x={92} step={1} dur="q" /></>,
    listen: L(80, [[[65], 1], [[66], 2]]),
  },
  {
    id: 'bemol', group: 'Acidentes e armadura', name: 'Bemol ♭', unit: 2,
    what: 'Sinal antes da nota.',
    how: 'Toque a tecla meio tom abaixo, geralmente a preta à esquerda. Vale até o fim do compasso.',
    art: <><Staff /><Treble /><Txt x={77} y={Y(4) + 5} cls="sym__music" size={22}>♭</Txt><Note x={92} step={4} dur="q" /></>,
    listen: L(80, [[[71], 1], [[70], 2]]),
  },
  {
    id: 'bequadro', group: 'Acidentes e armadura', name: 'Bequadro ♮', unit: 4,
    what: 'Sinal que cancela um sustenido ou bemol (da armadura ou do compasso).',
    how: 'Volte à tecla natural, a branca.',
    art: <><Staff /><Treble /><Txt x={58} y={Y(1) + 6} cls="sym__music" size={22}>♯</Txt><Note x={74} step={1} dur="q" /><Txt x={98} y={Y(1) + 6} cls="sym__music" size={22}>♮</Txt><Note x={114} step={1} dur="q" /></>,
    listen: L(80, [[[66], 1], [[65], 2]]),
  },
  {
    id: 'armadura', group: 'Acidentes e armadura', name: 'Armadura de clave', unit: 4,
    what: 'Sustenidos ou bemóis logo depois da clave, no começo de cada linha.',
    how: 'Valem a música toda, em todas as oitavas. Um sustenido na linha do Fá: todo Fá vira Fá♯ (Sol maior). Um bemol no Si: todo Si vira Si♭ (Fá maior).',
    art: <><Staff /><Treble /><Txt x={46} y={Y(8) + 6} cls="sym__music" size={22}>♯</Txt><Note x={78} step={1} dur="q" /><Txt x={78} y={78}>Fá♯</Txt><Bar x={100} kind="double" /><Txt x={124} y={Y(4) + 5} cls="sym__music" size={22}>♭</Txt></>,
  },
  // Clave e compasso
  {
    id: 'claves', group: 'Clave, compasso e barras', name: 'Clave de sol e clave de fá', unit: 2,
    what: 'O desenho no começo da pauta que diz onde está cada nota.',
    how: 'Clave de sol: a espiral marca a 2ª linha, que é o Sol (mão direita, região aguda). Clave de fá: os dois pontos cercam a 4ª linha, o Fá (mão esquerda, região grave).',
    art: <><Staff to={70} /><Treble /><Head x={52} step={2} /><Txt x={52} y={78}>Sol</Txt><line className="sym__line" x1={80} x2={144} y1={Y(0)} y2={Y(0)} />{[2, 4, 6, 8].map((s) => <line key={s} className="sym__line" x1={80} x2={144} y1={Y(s)} y2={Y(s)} />)}<Bass x={82} /><Head x={128} step={6} /><Txt x={128} y={78}>Fá</Txt></>,
  },
  {
    id: 'compasso', group: 'Clave, compasso e barras', name: 'Fórmula de compasso', unit: 1,
    what: 'Dois números empilhados depois da clave (4/4, 3/4, 6/8). O C equivale a 4/4; o C cortado, a 2/2.',
    how: 'O número de cima diz quantos tempos tem cada compasso; o de baixo, que figura vale um tempo (4 = semínima, 8 = colcheia).',
    art: <><Staff /><Treble /><Txt x={52} y={Y(4) - 1} cls="sym__time">4</Txt><Txt x={52} y={Y(0) - 1} cls="sym__time">4</Txt><Txt x={84} y={Y(4) - 1} cls="sym__time">3</Txt><Txt x={84} y={Y(0) - 1} cls="sym__time">4</Txt><Txt x={114} y={Y(2) + 7} cls="sym__time">C</Txt><Txt x={138} y={Y(2) + 7} cls="sym__time">C</Txt><line className="sym__stem" x1={138} x2={138} y1={Y(8) - 4} y2={Y(0) + 4} /></>,
  },
  {
    id: 'barras', group: 'Clave, compasso e barras', name: 'Barras de compasso',
    what: 'Linhas verticais que dividem a música em compassos. Barra dupla: fim de uma seção. Barra fina e grossa: fim da música.',
    how: 'Não pare na barra: ela só organiza a contagem. O primeiro tempo depois dela é o mais forte.',
    art: <><Staff /><Bar x={40} /><Bar x={80} kind="double" /><Bar x={130} kind="final" /></>,
  },
  // Articulação
  {
    id: 'staccato', group: 'Articulação', name: 'Staccato (ponto)', unit: 1,
    what: 'Um ponto sobre ou sob a cabeça da nota.',
    how: 'Toque curto e solto: solte logo depois de tocar, como se a tecla estivesse quente. A nota perde mais ou menos metade da duração.',
    art: <><Staff /><Treble />{[60, 84, 108].map((x, k) => <g key={x}><Note x={x} step={1 + k} dur="q" /><circle className="sym__head" cx={x} cy={Y(1 + k) + 8} r={1.7} /></g>)}</>,
    listen: L(100, [[[65], 0.4], [[], 0.6], [[67], 0.4], [[], 0.6], [[69], 0.4], [[], 0.6]]),
  },
  {
    id: 'tenuto', group: 'Articulação', name: 'Tenuto (traço)',
    what: 'Um tracinho horizontal junto da cabeça.',
    how: 'Segure a nota pelo valor inteiro, com um leve peso. É o contrário do staccato.',
    art: <><Staff /><Treble />{[70, 104].map((x, k) => <g key={x}><Note x={x} step={1 + k * 2} dur="q" /><line className="sym__stem" x1={x - 5} x2={x + 5} y1={Y(1 + k * 2) + 8} y2={Y(1 + k * 2) + 8} /></g>)}</>,
  },
  {
    id: 'acento', group: 'Articulação', name: 'Acento (>)',
    what: 'Um sinal de "maior que" sobre ou sob a nota.',
    how: 'Toque essa nota mais forte que as vizinhas, com um ataque marcado.',
    art: <><Staff /><Treble />{[60, 84, 108].map((x, k) => <g key={x}><Note x={x} step={2} dur="q" />{k === 0 && <path className="sym__stroke" d={`M${x - 5} ${Y(2) + 9} L${x + 5} ${Y(2) + 12} L${x - 5} ${Y(2) + 15}`} />}</g>)}</>,
    listen: L(100, [[[67], 1, 1], [[67], 1, 0.5], [[67], 1, 0.5]]),
  },
  {
    id: 'marcato', group: 'Articulação', name: 'Marcato (^) e staccatissimo (cunha)',
    what: 'Um "chapéu" (marcato) ou uma cunha estreita (staccatissimo) sobre a nota.',
    how: 'Marcato: mais forte e mais destacado que o acento. Staccatissimo: ainda mais curto que o staccato.',
    art: <><Staff /><Treble /><Note x={74} step={2} dur="q" /><path className="sym__stroke" d={`M${69} ${Y(8) - 2} L${74} ${Y(8) - 10} L${79} ${Y(8) - 2}`} /><Note x={112} step={2} dur="q" /><path className="sym__head" d={`M${110} ${Y(8) - 10} L${114} ${Y(8) - 10} L${112} ${Y(8) - 2} z`} /></>,
  },
  // Dinâmica
  {
    id: 'dinamicas', group: 'Dinâmica', name: 'pp, p, mp, mf, f, ff', unit: 1,
    what: 'Letras em itálico sob a pauta: piano (p) é leve; forte (f) é forte; m é "meio".',
    how: 'Do mais leve ao mais forte: pp, p, mp, mf, f, ff. Vale até aparecer outra marca.',
    art: <><Staff /><Treble /><Note x={70} step={2} dur="h" /><Note x={115} step={2} dur="h" /><Txt x={70} y={76} cls="sym__dyn">p</Txt><Txt x={115} y={76} cls="sym__dyn">ff</Txt></>,
    listen: L(80, [[[67], 2, 0.3], [[67], 2, 1]]),
  },
  {
    id: 'crescendo', group: 'Dinâmica', name: 'Crescendo e diminuendo (os "garfos")',
    what: 'Duas linhas que abrem (crescendo, <) ou fecham (diminuendo, >) sob a pauta. Também aparecem escritos: cresc., dim.',
    how: 'Abrindo: aumente o volume aos poucos, nota a nota. Fechando: diminua aos poucos.',
    art: <><Staff /><Treble /><path className="sym__stroke" d="M48 70 L88 64 M48 70 L88 76" /><path className="sym__stroke" d="M100 64 L140 70 M100 76 L140 70" /></>,
    listen: L(110, [[[60], 1, 0.25], [[62], 1, 0.4], [[64], 1, 0.6], [[65], 1, 0.8], [[67], 2, 1]]),
  },
  {
    id: 'sfz', group: 'Dinâmica', name: 'sfz e fp',
    what: 'sfz (sforzando): ataque súbito e forte numa nota. fp: forte e logo em seguida piano.',
    how: 'sfz: uma nota só bem marcada, e volta ao volume de antes. fp: ataque forte e a mão já relaxa.',
    art: <><Staff /><Treble /><Note x={70} step={2} dur="q" /><Note x={115} step={2} dur="h" /><Txt x={70} y={76} cls="sym__dyn">sfz</Txt><Txt x={115} y={76} cls="sym__dyn">fp</Txt></>,
  },
  // Repetição
  {
    id: 'ritornello', group: 'Repetição', name: 'Sinais de repetição (ritornello)', unit: 2,
    what: 'Barra grossa e fina com dois pontos. Os pontos ficam virados para o trecho que repete.',
    how: 'Ao chegar no sinal com pontos à esquerda, volte ao sinal com pontos à direita (ou ao começo, se não houver) e toque de novo.',
    art: <><Staff /><rect className="sym__head" x={22} y={Y(8)} width={3.6} height={4 * S} /><line className="sym__line" x1={29} x2={29} y1={Y(8)} y2={Y(0)} /><circle className="sym__head" cx={34} cy={Y(5)} r={1.8} /><circle className="sym__head" cx={34} cy={Y(3)} r={1.8} /><Note x={64} step={2} dur="q" /><Note x={92} step={4} dur="q" /><circle className="sym__head" cx={116} cy={Y(5)} r={1.8} /><circle className="sym__head" cx={116} cy={Y(3)} r={1.8} /><line className="sym__line" x1={121} x2={121} y1={Y(8)} y2={Y(0)} /><rect className="sym__head" x={124.5} y={Y(8)} width={3.6} height={4 * S} /></>,
  },
  {
    id: 'casas', group: 'Repetição', name: 'Casa 1 e casa 2',
    what: 'Colchetes numerados (1., 2.) sobre os últimos compassos de um trecho que repete.',
    how: 'Na primeira vez, toque a casa 1 e repita. Na segunda, pule a casa 1 e vá direto para a casa 2.',
    art: <><Staff /><path className="sym__stroke" d={`M20 ${Y(8) - 4} L20 ${Y(8) - 14} L76 ${Y(8) - 14}`} /><Txt x={28} y={Y(8) - 5} cls="sym__italic">1.</Txt><Note x={46} step={2} dur="h" /><circle className="sym__head" cx={72} cy={Y(5)} r={1.8} /><circle className="sym__head" cx={72} cy={Y(3)} r={1.8} /><line className="sym__line" x1={77} x2={77} y1={Y(8)} y2={Y(0)} /><rect className="sym__head" x={80} y={Y(8)} width={3.6} height={4 * S} /><path className="sym__stroke" d={`M90 ${Y(8) - 4} L90 ${Y(8) - 14} L140 ${Y(8) - 14}`} /><Txt x={98} y={Y(8) - 5} cls="sym__italic">2.</Txt><Note x={116} step={0} dur="h" /></>,
  },
  {
    id: 'dc-ds', group: 'Repetição', name: 'D.C., D.S., Segno, Coda e Fine',
    what: 'D.C. (da capo): volte ao começo. D.S. (dal segno): volte ao segno, o S cortado (à esquerda no desenho). Coda, o círculo com a cruz: o final separado. Fine: fim.',
    how: '"D.C. al Fine": volte ao começo e pare no Fine. "D.S. al Coda": volte ao segno, toque até "To Coda" e pule para a coda.',
    art: <><Txt x={34} y={56} cls="sym__music" size={44}>𝄋</Txt><ellipse className="sym__headOpen" cx={80} cy={44} rx={9} ry={11} strokeWidth={2.4} /><line className="sym__stem" x1={80} x2={80} y1={28} y2={60} /><line className="sym__stem" x1={66} x2={94} y1={44} y2={44} /><Txt x={34} y={76}>segno</Txt><Txt x={80} y={76}>coda</Txt><Txt x={124} y={44} cls="sym__italic">D.C.</Txt><Txt x={124} y={60} cls="sym__italic">Fine</Txt></>,
  },
  // Oitava e pedal
  {
    id: 'oitava', group: 'Oitava e pedal', name: '8va e 8vb',
    what: '"8va" com uma linha tracejada sobre as notas (ou "8vb" embaixo).',
    how: 'Toque as notas sob a linha uma oitava acima (8va) ou abaixo (8vb) do escrito. "loco" volta ao normal.',
    art: <><Staff /><Treble /><Txt x={50} y={Y(8) - 12} cls="sym__italic">8va</Txt><line className="sym__dash" x1={64} x2={130} y1={Y(8) - 15} y2={Y(8) - 15} /><line className="sym__stroke" x1={130} x2={130} y1={Y(8) - 15} y2={Y(8) - 9} /><Note x={78} step={6} dur="q" /><Note x={104} step={7} dur="q" /></>,
    listen: L(90, [[[86], 1], [[88], 1]]),
  },
  {
    id: 'pedal', group: 'Oitava e pedal', name: 'Pedal: Ped. e ✱', unit: 3,
    what: '"Ped." sob a pauta (ou uma linha com degraus) marca o pedal de sustentação. O ✱ ou o fim da linha marca soltar.',
    how: 'Abaixe o pedal da direita no "Ped." e solte no ✱. Na linha com degrau (∧), suba e desça o pedal logo depois do acorde novo (pedal legato).',
    art: <><Staff /><Treble /><Note x={62} step={2} dur="h" /><Note x={110} step={3} dur="h" /><Txt x={56} y={78} cls="sym__italic">Ped.</Txt><Txt x={100} y={78} cls="sym__text" size={14}>✱</Txt><path className="sym__stroke" d="M118 64 L118 70 L128 70 L132 64 L136 70 L144 70 L144 64" /></>,
  },
  // Ornamentos
  {
    id: 'trinado', group: 'Ornamentos', name: 'Trinado (tr)',
    what: '"tr" com uma linha ondulada sobre a nota.',
    how: 'Alterne rápido a nota escrita com a nota de cima, pelo tempo da figura.',
    art: <><Staff /><Treble /><Txt x={64} y={Y(8) - 6} cls="sym__italic">tr</Txt><path className="sym__stroke" d={`M74 ${Y(8) - 9} q 3 -4 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0`} /><Note x={72} step={3} dur="h" /></>,
    listen: L(90, [[[69], 0.125], [[71], 0.125], [[69], 0.125], [[71], 0.125], [[69], 0.125], [[71], 0.125], [[69], 0.125], [[71], 0.125], [[69], 1]]),
  },
  {
    id: 'mordente', group: 'Ornamentos', name: 'Mordente e grupeto',
    what: 'Mordente: um zigue-zague curto sobre a nota. Grupeto: um S deitado.',
    how: 'Mordente: nota escrita, a vizinha (de cima, ou de baixo se tiver um traço) e a escrita de novo, bem rápido. Grupeto: nota de cima, a escrita, a de baixo e a escrita.',
    art: <><Staff /><Treble /><path className="sym__stroke" d={`M60 ${Y(8) - 4} l 4 -5 l 4 5 l 4 -5 l 4 5`} /><Note x={68} step={2} dur="q" /><path className="sym__stroke" d={`M104 ${Y(8) - 6} c 2 -6 8 -6 8 0 c 0 6 6 6 8 0 c -2 6 -8 6 -8 0 c 0 -6 -6 -6 -8 0`} /><Note x={112} step={2} dur="q" /></>,
    listen: L(80, [[[67], 0.125], [[69], 0.125], [[67], 1.75]]),
  },
  {
    id: 'apojatura', group: 'Ornamentos', name: 'Apojatura (nota pequena)',
    what: 'Uma nota pequena, muitas vezes cortada por um traço, antes da nota principal.',
    how: 'Toque a pequena bem rápido, quase junto, e caia na principal no tempo.',
    art: <><Staff /><Treble /><Note x={70} step={3} dur="8" up scale={0.65} /><line className="sym__stroke" x1={68} x2={80} y1={Y(3) - 6} y2={Y(3) - 14} /><Note x={96} step={2} dur="q" /></>,
    listen: L(80, [[[69], 0.12], [[67], 1.88]]),
  },
  {
    id: 'arpejo', group: 'Ornamentos', name: 'Acorde arpejado',
    what: 'Uma linha ondulada vertical antes do acorde.',
    how: 'Toque as notas do acorde de baixo para cima, uma logo depois da outra, bem rápido, e segure todas.',
    art: <><Staff /><Treble /><path className="sym__stroke" d={`M80 ${Y(-2) + 4} q -3 -3 0 -6 t 0 -6 t 0 -6 t 0 -6 t 0 -6`} /><Head x={96} step={-2} /><Head x={96} step={0} /><Head x={96} step={2} /><Head x={96} step={4} /><line className="sym__stem" x1={100.5} x2={100.5} y1={Y(-2)} y2={Y(4) - 24} /></>,
    listen: L(80, [[[60], 0.08], [[64], 0.08], [[67], 0.08], [[72], 0.08], [[60, 64, 67, 72], 2]]),
  },
  {
    id: 'glissando', group: 'Ornamentos', name: 'Glissando',
    what: 'Uma linha reta ou ondulada entre duas notas distantes, às vezes escrita "gliss.".',
    how: 'Deslize pelas teclas brancas (com a unha ou o lado do dedo) da primeira até a última nota.',
    art: <><Staff /><Treble /><Note x={52} step={-2} dur="q" /><line className="sym__stroke" x1={60} x2={118} y1={Y(-2) - 2} y2={Y(9) + 2} /><Txt x={88} y={Y(4) + 4} cls="sym__italic">gliss.</Txt><Note x={124} step={10} dur="q" /></>,
  },
  // Outras marcas
  {
    id: 'dedilhado', group: 'Outras marcas', name: 'Dedilhado (números)', unit: 1,
    what: 'Números pequenos sobre ou sob as notas.',
    how: 'Indicam o dedo: 1 é o polegar, 2 o indicador, 3 o médio, 4 o anelar, 5 o mínimo. Vale para as duas mãos.',
    art: <><Staff /><Treble />{[0, 1, 2, 3].map((k) => <g key={k}><Note x={52 + k * 24} step={-2 + k} dur="q" /><Txt x={52 + k * 24} y={Y(8) - 6}>{k + 1}</Txt></g>)}</>,
  },
  {
    id: 'cifra', group: 'Outras marcas', name: 'Cifra (letras sobre a pauta)', unit: 3,
    what: 'Letras como C, Am, G7 acima da pauta.',
    how: 'São os acordes do acompanhamento: C = Dó maior, Am = Lá menor, G7 = Sol com sétima. Veja cada um em Acordes, aqui na Consulta.',
    art: <><Staff /><Treble /><Txt x={56} y={Y(8) - 8} cls="sym__chord">C</Txt><Txt x={96} y={Y(8) - 8} cls="sym__chord">Am</Txt><Txt x={134} y={Y(8) - 8} cls="sym__chord">G7</Txt><Note x={56} step={4} dur="q" /><Note x={96} step={5} dur="q" /><Note x={134} step={3} dur="q" /></>,
  },
  {
    id: 'metronomo', group: 'Outras marcas', name: 'Marca de metrônomo (semínima = 80)',
    what: 'Uma figura igual a um número, no alto da primeira pauta.',
    how: 'O andamento: 80 semínimas por minuto. Ajuste o metrônomo nesse número.',
    art: <><Staff /><Treble /><ellipse className="sym__head" cx={64} cy={15} rx={4.2} ry={3} transform="rotate(-20 64 15)" /><line className="sym__stem" x1={67.6} x2={67.6} y1={15} y2={1} /><Txt x={94} y={19} cls="sym__text" size={14}>= 80</Txt></>,
  },
];

export const SYMBOL_GROUPS: SymbolGroup[] = [...new Set(SYMBOLS.map((s) => s.group))];
