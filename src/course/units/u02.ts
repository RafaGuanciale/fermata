// Unidade 2 — Pauta dupla, leitura e intervalos (lições 9 a 16). Projeto final: Ode à Alegria com mão esquerda.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { choice, intervalAbove, intervalByEar, mix, readInterval, readNote, type ChoiceQuestion } from '../gens';
import { pick } from '../music';
import { melodyTask } from '../tasks';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

// ---------- notas e peças reaproveitadas ----------

const TREBLE_ANCHORS = [60, 67, 72, 79]; // Dó4, Sol4, Dó5, Sol5
const TREBLE_WHITE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79]; // Dó4 a Sol5
const BASS_ANCHORS = [53, 48, 43, 60]; // Fá3, Dó3, Sol2, Dó4
const BASS_WHITE = [43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60]; // Sol2 a Dó4

const readTrebleAnchors = readNote({ notes: TREBLE_ANCHORS, clef: 'treble', skill: 'ler-ancora-sol' });
const readTreble = readNote({ notes: TREBLE_WHITE, clef: 'treble' });
const readBassAnchors = readNote({ notes: BASS_ANCHORS, clef: 'bass', skill: 'ler-ancora-fa' });
const readBass = readNote({ notes: BASS_WHITE, clef: 'bass' });
const readBoth = mix([readTreble, readBass]);

const INTERVAL_FROM = [60, 62, 64, 65, 67, 69, 71, 72]; // Dó4 a Dó5
const intervalUp = intervalAbove({ sizes: [2, 3, 4, 5], from: INTERVAL_FROM });
const intervalEar25 = intervalByEar({ sizes: [2, 5], from: [60, 62, 65, 67] });
const intervalEar = intervalByEar({ sizes: [2, 3, 5], from: [60, 62, 64, 65, 67] });
const intervalStaff = mix([
  readInterval({ sizes: [2, 3, 4, 5], from: [64, 65, 67, 69, 71], clef: 'treble' }),
  readInterval({ sizes: [2, 3, 4, 5], from: [43, 45, 47, 48, 50], clef: 'bass' }),
]);

const PAUTA: ChoiceQuestion[] = [
  { q: 'Quantas linhas tem a pauta?', options: ['4', '5', '6'], answer: 1, why: 'Cinco linhas e quatro espaços, contados de baixo para cima.' },
  { q: 'Na clave de Sol, a 2ª linha (de baixo para cima) é…', options: ['Sol4', 'Mi4', 'Si4'], answer: 0, why: 'A clave de Sol abraça a 2ª linha: ali mora o Sol4.' },
  { q: 'Na clave de Sol, o Dó central fica…', options: ['Numa linha suplementar abaixo da pauta', 'No 3º espaço', 'Na linha de baixo'], answer: 0, why: 'Dó4 tem uma linha curta só dele, logo abaixo da pauta.' },
  { q: 'Na clave de Sol, o Dó5 fica…', options: ['No 3º espaço', 'Na 3ª linha', 'Acima da pauta'], answer: 0, why: 'Os espaços, de baixo para cima: Fá, Lá, Dó, Mi.' },
  { q: 'De uma linha para o espaço logo acima, a nota…', options: ['Vai para a vizinha (grau conjunto)', 'Pula uma nota', 'Sobe uma oitava'], answer: 0, why: 'Linha e espaço vizinhos são notas vizinhas: Mi → Fá, Sol → Lá.' },
  { q: 'De uma linha para a linha seguinte, a nota…', options: ['Vai para a vizinha', 'Pula uma nota (uma 3ª)', 'Pula duas notas'], answer: 1, why: 'Linha para linha pula o espaço do meio: Mi → Sol, Sol → Si.' },
];

const CLAVE_FA: ChoiceQuestion[] = [
  { q: 'A clave de Fá marca qual nota na 4ª linha?', options: ['Fá3', 'Fá4', 'Sol3'], answer: 0, why: 'Os dois pontos da clave cercam a 4ª linha: Fá3, o Fá logo abaixo do Dó central.' },
  { q: 'Na clave de Fá, a linha de baixo é…', options: ['Sol2', 'Mi2', 'Fá2'], answer: 0, why: 'Linhas da clave de Fá, de baixo para cima: Sol, Si, Ré, Fá, Lá.' },
  { q: 'Na clave de Fá, o Dó central fica…', options: ['Numa linha suplementar acima da pauta', 'No 2º espaço', 'Na 5ª linha'], answer: 0, why: 'O Dó4 é a ponte: uma linha suplementar acima da clave de Fá e uma abaixo da de Sol.' },
  { q: 'Na clave de Fá, o Dó3 fica…', options: ['No 2º espaço', 'Na 2ª linha', 'No 3º espaço'], answer: 0, why: 'Espaços da clave de Fá, de baixo para cima: Lá, Dó, Mi, Sol.' },
  { q: 'Quem lê a clave de Fá como se fosse a de Sol erra por…', options: ['Duas notas (uma 3ª)', 'Uma oitava', 'Nada, é igual'], answer: 0, why: 'A linha de baixo é Mi na clave de Sol e Sol na de Fá: uma 3ª de diferença em toda a pauta.' },
];

const INTERVALS: ChoiceQuestion[] = [
  { q: 'De Dó a Mi é uma…', options: ['2ª', '3ª', '4ª'], answer: 1, why: 'Conte as duas pontas: Dó, Ré, Mi = 3.' },
  { q: 'De Ré a Sol é uma…', options: ['3ª', '4ª', '5ª'], answer: 1, why: 'Ré, Mi, Fá, Sol = 4.' },
  { q: 'De Mi a Si é uma…', options: ['4ª', '5ª', '6ª'], answer: 1, why: 'Mi, Fá, Sol, Lá, Si = 5.' },
  { q: 'Intervalo harmônico é…', options: ['As duas notas tocadas juntas', 'Uma nota depois da outra', 'Só com teclas pretas'], answer: 0, why: 'Harmônico = juntas; melódico = uma depois da outra.' },
  { q: 'Na pauta, uma 5ª vai de uma linha para…', options: ['A segunda linha acima (pulando uma linha)', 'O espaço vizinho', 'A linha seguinte'], answer: 0, why: 'Linha → linha seguinte é 3ª; pulando mais uma linha, 5ª.' },
  { q: 'Na posição de Dó da mão direita, os dedos 1 e 3 tocam uma…', options: ['2ª', '3ª', '4ª'], answer: 1, why: 'Dedo 1 no Dó, dedo 3 no Mi: Dó, Ré, Mi = 3ª.' },
];

/** Melodias de leitura na posição de Dó da mão direita (4 compassos). */
const READ_R = [
  'C4 D4 E4 C4 | E4 F4 G4:2 | G4 F4 E4 D4 | C4:4',
  'E4 E4 D4 C4 | D4 E4 C4:2 | G4 G4 F4 E4 | D4 C4 C4:2',
  'G4 E4 F4 D4 | E4 C4 D4:2 | E4 F4 G4 E4 | C4:4',
  'C4 E4 G4:2 | F4 D4 E4:2 | D4 E4 F4 G4 | C4:4',
  'E4 F4 G4 G4 | F4 E4 D4:2 | E4 D4 C4 D4 | E4:2 C4:2',
  'G4:2 F4 E4 | D4:2 E4 F4 | E4 D4 C4 D4 | C4:4',
];
/** As mesmas formas uma oitava abaixo: posição de Dó da mão esquerda (Dó3 a Sol3). */
const READ_L = READ_R.map((t) => t.replace(/([A-G])4/g, (_, l: string) => `${l}3`));

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

// ---------- lições ----------

const l09: Lesson = {
  n: 9,
  id: 'l09',
  title: 'Clave de Sol e notas-âncora',
  minutes: 60,
  objectives: [
    'Consigo dizer onde ficam Dó4, Sol4, Dó5 e Sol5 na clave de Sol sem pensar.',
    'Consigo ler qualquer nota de Dó4 a Sol5 e tocar em menos de 2,5 s.',
    'Consigo ler e tocar uma melodia de 4 compassos na mão direita, no tempo.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A pauta: cinco linhas, quatro espaços',
      body: `Até agora você tocou pelo nome das notas. A partir de hoje você vai ler. A música escrita usa a **pauta** (ou pentagrama): **5 linhas** e os **4 espaços** entre elas, sempre contados **de baixo para cima**.

Cada nota mora numa linha (a linha atravessa a bolinha) ou num espaço (a bolinha fica entre duas linhas). Quanto mais alta na pauta, mais aguda a nota, e mais para a direita no teclado.

O ponto mais importante da leitura é este: **cada degrau da pauta é uma tecla branca**. De uma linha para o espaço logo acima, você vai para a tecla branca vizinha. De uma linha para a linha seguinte, você pula uma tecla branca. A pauta é um desenho do teclado de lado.`,
    },
    {
      kind: 'text',
      title: 'A clave de Sol diz onde está o Sol',
      body: `Uma pauta sozinha não diz quais notas são. Quem diz é a **clave**, o símbolo no começo da linha. A **clave de Sol** (𝄞) nasceu de uma letra G estilizada, e a espiral dela abraça a **2ª linha**: ali mora o **Sol4**, o Sol logo acima do Dó central.

A clave de Sol é usada para a região aguda, quase sempre pela mão direita. Com o Sol fixado na 2ª linha, todas as outras notas se deduzem andando de degrau em degrau:

- Linhas, de baixo para cima: **Mi4, Sol4, Si4, Ré5, Fá5**.
- Espaços, de baixo para cima: **Fá4, Lá4, Dó5, Mi5**.
- Abaixo da pauta, numa **linha suplementar** curta só dela, fica o **Dó4**, o Dó central.
- Logo acima da 5ª linha fica o **Sol5**.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 79,
      lit: TREBLE_ANCHORS,
      labels: { 60: 'Dó4', 67: 'Sol4', 72: 'Dó5', 79: 'Sol5' },
      caption: 'As quatro âncoras da clave de Sol: Dó4 (linha suplementar), Sol4 (2ª linha), Dó5 (3º espaço) e Sol5 (logo acima da pauta).',
    },
    {
      kind: 'text',
      title: 'Ler por âncora, não por decoreba',
      body: `Muita gente aprende a pauta decorando frases para as linhas e os espaços. Funciona no começo, mas é lento: para cada nota você recita a frase inteira até achar o nome.

O jeito rápido é usar **âncoras**: poucas notas que você reconhece de olho, como um rosto conhecido. Neste curso as âncoras da clave de Sol são quatro: **Dó4** (linha suplementar), **Sol4** (2ª linha), **Dó5** (3º espaço) e **Sol5** (logo acima da pauta).

Para qualquer outra nota, ache a âncora mais perto e ande: uma linha para o espaço vizinho é um passo; uma linha para a próxima linha são dois passos. O Lá4, por exemplo, é o espaço logo acima do Sol4: um passo acima da âncora. O Si4 é a linha logo acima do Sol4: dois passos.`,
    },
    {
      kind: 'example',
      title: 'Da âncora à nota vizinha',
      steps: [
        { say: 'O **Sol4**, na 2ª linha: a âncora da clave.', keys: [67], play: { bpm: 72, steps: [{ midis: [67], beats: 2 }] } },
        { say: 'Um passo acima (espaço): **Lá4**. Dois passos acima (linha): **Si4**.', keys: [69, 71], play: { bpm: 72, steps: [{ midis: [67], beats: 1 }, { midis: [69], beats: 1 }, { midis: [71], beats: 2 }] } },
        { say: 'O **Dó5**, no 3º espaço, é outra âncora. Um passo abaixo, na 3ª linha, fica o Si4 de novo: as âncoras se encontram.', keys: [72, 71], play: { bpm: 72, steps: [{ midis: [72], beats: 1 }, { midis: [71], beats: 2 }] } },
        { say: 'As quatro âncoras, de baixo para cima: Dó4, Sol4, Dó5, Sol5.', keys: TREBLE_ANCHORS, play: { bpm: 80, steps: TREBLE_ANCHORS.map((m) => ({ midis: [m], beats: 1 })) } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l09-ancoras',
      exercise: { kind: 'items', title: 'As quatro âncoras', how: 'A pauta mostra uma âncora; toque a tecla exata. Os nomes no teclado somem quando você acerta 5 seguidas.', gen: readTrebleAnchors, count: 12, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.9 } },
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'tocar na oitava errada',
      body: 'A nota da pauta é uma tecla exata, não "qualquer Sol". O Sol4 da 2ª linha é o Sol logo acima do Dó central; o Sol5, uma oitava acima, fica fora da pauta. Antes de tocar, pergunte: está perto do Dó4 ou do Dó5?',
    },
    {
      kind: 'exercise',
      id: 'l09-ler',
      exercise: { kind: 'items', title: 'Leitura de Dó4 a Sol5', how: 'Qualquer nota branca da região. Ache a âncora mais perto e ande. Meta: 90% e menos de 2,5 s por nota.', gen: readTreble, count: 20, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.9, avgMs: 2500 } },
    },
    {
      kind: 'text',
      title: 'Ler uma melodia: direção e tamanho do passo',
      body: `Ler uma melodia não é ler nota por nota. Leia a **primeira nota** pelo nome e, daí em diante, leia o **desenho**: a próxima nota sobe ou desce? É vizinha (linha → espaço) ou pula uma (linha → linha)? Seu dedo anda do mesmo jeito.

Na posição de Dó isso fica ainda mais fácil: cada degrau da pauta é o dedo vizinho. Se a nota pula uma linha, o dedo pula um.

Antes de tocar, olhe o trecho inteiro por alguns segundos: onde começa, onde está a nota mais aguda, onde estão as notas longas. Depois toque **sem parar**, mesmo que erre uma nota. Na leitura, manter o pulso vale mais do que acertar tudo.`,
    },
    {
      kind: 'exercise',
      id: 'l09-melodia',
      exercise: quickTimed('Melodia na mão direita', 'Quatro compassos sorteados na posição de Dó, a 60 BPM. Leia o desenho e não pare. Duas passadas boas.', (rng) => melodyTask(pick(rng, READ_R), { bpm: 60 }), { reps: 2 }),
    },
    { kind: 'exercise', id: 'l09-quiz', exercise: quiz('A pauta e a clave de Sol', 'Seis perguntas rápidas.', PAUTA) },
  ],
  review: [readTrebleAnchors, readTreble, choice(PAUTA, 'pauta')],
  checkpoint: [
    { kind: 'items', title: '30 notas na clave de Sol', how: 'Sem nomes no teclado. Meta: 90% de primeira e média abaixo de 2,5 s.', gen: readTreble, count: 30, low: 55, high: 84, labels: 'off', pass: { accuracy: 0.9, avgMs: 2500 } },
    quickTimed('Leitura no tempo', 'Melodia nova de 4 compassos a 66 BPM, sem dicas.', (rng) => melodyTask(pick(rng, READ_R), { bpm: 66 })),
  ],
  exit: [readTreble, choice(PAUTA, 'pauta')],
};

const l10: Lesson = {
  n: 10,
  id: 'l10',
  title: 'Clave de Fá e pauta dupla',
  minutes: 60,
  objectives: [
    'Consigo ler as âncoras da clave de Fá: Sol2, Dó3, Fá3 e Dó4.',
    'Consigo ler notas misturadas nas duas claves com 90% de acerto.',
    'Consigo ler 4 compassos na mão esquerda sem parar.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A clave de Fá diz onde está o Fá',
      body: `A mão esquerda toca na região grave, e as notas graves ficariam cheias de linhas suplementares na clave de Sol. Para elas existe a **clave de Fá** (𝄢). Ela começa na 4ª linha e tem **dois pontos** que cercam essa linha: ali mora o **Fá3**, o Fá logo abaixo do Dó central.

A partir do Fá3 tudo se deduz andando pela pauta:

- Linhas, de baixo para cima: **Sol2, Si2, Ré3, Fá3, Lá3**.
- Espaços, de baixo para cima: **Lá2, Dó3, Mi3, Sol3**.
- Acima da pauta, numa linha suplementar, fica o **Dó4**: o mesmo Dó central.

As âncoras da clave de Fá neste curso: **Sol2** (linha de baixo), **Dó3** (2º espaço, o Dó onde a mão esquerda apoia o dedo 5 na posição de Dó), **Fá3** (4ª linha, a da clave) e **Dó4** (linha suplementar acima).`,
    },
    {
      kind: 'keys',
      low: 43,
      high: 60,
      lit: BASS_ANCHORS,
      labels: { 43: 'Sol2', 48: 'Dó3', 53: 'Fá3', 60: 'Dó4' },
      caption: 'Âncoras da clave de Fá: Sol2 (1ª linha), Dó3 (2º espaço), Fá3 (4ª linha) e o Dó central acima da pauta.',
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'ler a clave de Fá como se fosse a de Sol',
      body: 'É o erro mais comum de quem começa: a linha de baixo vira "Mi" quando é Sol, o 2º espaço vira "Lá" quando é Dó. A diferença é sempre de **duas notas** (uma 3ª). Antes de ler, olhe a clave. Se ela tem dois pontos, a 4ª linha é Fá.',
    },
    {
      kind: 'example',
      title: 'As âncoras da clave de Fá',
      steps: [
        { say: 'O **Fá3**, na linha entre os dois pontos da clave.', keys: [53], play: { bpm: 72, steps: [{ midis: [53], beats: 2 }] } },
        { say: 'O **Dó3**, no 2º espaço: casa do dedo 5 da mão esquerda na posição de Dó.', keys: [48], play: { bpm: 72, steps: [{ midis: [48], beats: 2 }] } },
        { say: 'O **Sol2**, na linha de baixo. Do Sol2 ao Dó3: 4 passos de pauta.', keys: [43], play: { bpm: 72, steps: [{ midis: [43], beats: 1 }, { midis: [48], beats: 2 }] } },
        { say: 'Subindo de Dó3 até Dó4, degrau por degrau: Dó, Ré, Mi, Fá, Sol, Lá, Si, Dó.', keys: [48, 60], play: { bpm: 100, steps: [48, 50, 52, 53, 55, 57, 59, 60].map((m) => ({ midis: [m], beats: 1 })) } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l10-ancoras',
      exercise: { kind: 'items', title: 'Âncoras da clave de Fá', how: 'A pauta mostra uma âncora; toque a tecla exata.', gen: readBassAnchors, count: 12, low: 36, high: 64, labels: 'fade', pass: { accuracy: 0.9 } },
    },
    { kind: 'exercise', id: 'l10-fa', exercise: { kind: 'items', title: 'Leitura de Sol2 a Dó4', how: 'Qualquer nota branca da região. Ache a âncora mais perto e ande.', gen: readBass, count: 20, low: 36, high: 64, labels: 'fade', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'A pauta dupla e o Dó central',
      body: `Na partitura de piano as duas claves vêm juntas, ligadas por uma **chave** à esquerda: a de Sol em cima (normalmente a mão direita) e a de Fá embaixo (normalmente a esquerda). Isso é a **pauta dupla** (ou sistema).

O **Dó central** é a ponte entre elas. Ele aparece numa linha suplementar **abaixo** da clave de Sol ou numa linha suplementar **acima** da clave de Fá, e é a **mesma tecla** nos dois casos. O espaço entre as duas pautas é a região em que as mãos se encontram.

**Linhas suplementares** são linhas curtas que estendem a pauta para cima ou para baixo, só onde há nota. Leia como se a pauta continuasse: cada linha suplementar é mais uma linha, com um espaço entre elas.`,
    },
    {
      kind: 'exercise',
      id: 'l10-misto',
      exercise: { kind: 'items', title: 'Duas claves misturadas', how: 'A clave muda de uma nota para outra. Olhe a clave antes da nota.', gen: readBoth, count: 20, low: 36, high: 84, labels: 'fade', pass: { accuracy: 0.85 } },
    },
    {
      kind: 'exercise',
      id: 'l10-melodia-me',
      exercise: quickTimed('Melodia na mão esquerda', 'Quatro compassos na clave de Fá, posição de Dó da mão esquerda (dedo 5 no Dó3), a 60 BPM. Duas passadas boas.', (rng) => melodyTask(pick(rng, READ_L), { bpm: 60, clef: 'bass' }), { reps: 2 }),
    },
    {
      kind: 'exercise',
      id: 'l10-ms',
      exercise: quickTimed('Mãos separadas, clave sorteada', 'A clave decide a mão: clave de Sol, direita; clave de Fá, esquerda. Duas passadas boas.', (rng) => (rng() < 0.5 ? melodyTask(pick(rng, READ_R), { bpm: 60 }) : melodyTask(pick(rng, READ_L), { bpm: 60, clef: 'bass' })), { reps: 2 }),
    },
    { kind: 'exercise', id: 'l10-quiz', exercise: quiz('A clave de Fá', 'Cinco perguntas rápidas.', CLAVE_FA) },
  ],
  review: [readBassAnchors, readBass, choice(CLAVE_FA, 'clave-fa')],
  checkpoint: [
    { kind: 'items', title: '30 notas nas duas claves', how: 'Clave de Sol e de Fá misturadas, sem nomes no teclado. Meta: 90%.', gen: readBoth, count: 30, low: 36, high: 84, labels: 'off', pass: { accuracy: 0.9 } },
    quickTimed('Mão esquerda no tempo', 'Melodia nova de 4 compassos na clave de Fá, a 60 BPM, sem parar.', (rng) => melodyTask(pick(rng, READ_L), { bpm: 60, clef: 'bass' })),
  ],
  exit: [readBass, readTreble, choice(CLAVE_FA, 'clave-fa')],
};

const l11: Lesson = {
  n: 11,
  id: 'l11',
  title: 'Intervalos de 2ª a 5ª',
  minutes: 60,
  objectives: [
    'Consigo tocar uma 2ª, 3ª, 4ª ou 5ª acima de qualquer nota branca.',
    'Consigo reconhecer um intervalo na pauta pelo desenho, sem ler as duas notas.',
    'Consigo distinguir de ouvido uma 2ª de uma 5ª e tocar o que ouvi.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Intervalo é distância',
      body: `**Intervalo** é a distância entre duas notas. O nome vem de uma contagem simples: conte as teclas brancas (ou os degraus da pauta) **incluindo as duas pontas**.

- De Dó a Ré: Dó, Ré = **2ª** (segunda).
- De Dó a Mi: Dó, Ré, Mi = **3ª** (terça).
- De Dó a Fá: 4 notas = **4ª** (quarta).
- De Dó a Sol: 5 notas = **5ª** (quinta).

A regra vale a partir de qualquer nota: de Mi a Lá é uma 4ª (Mi, Fá, Sol, Lá); de Ré a Lá, uma 5ª. O erro clássico é contar só os passos (Dó → Mi = "2 passos") e chamar de 2ª. Conte as notas, não os passos.

Por enquanto contamos só o **número** do intervalo. Mais adiante, na Unidade 5, cada intervalo ganha uma **qualidade** (maior, menor, justo), que depende das teclas pretas no caminho.`,
    },
    {
      kind: 'text',
      title: 'Melódico e harmônico',
      body: `Um intervalo **melódico** toca uma nota depois da outra, como numa melodia. Um intervalo **harmônico** toca as duas juntas, como num acorde.

Cada intervalo tem um som próprio. A **2ª** é vizinha: na melodia soa como um passo; junta, soa apertada, quase um choque. A **3ª** é doce e cheia; é a base dos acordes. A **4ª** é aberta e soa como um chamado. A **5ª** é ampla e estável, oca, como um sino.`,
    },
    {
      kind: 'example',
      title: 'Os quatro intervalos a partir do Dó',
      steps: [
        { say: '**2ª**: Dó e Ré. Melódico, depois harmônico.', keys: [60, 62], play: { bpm: 72, steps: [{ midis: [60], beats: 1 }, { midis: [62], beats: 1 }, { midis: [60, 62], beats: 2 }] } },
        { say: '**3ª**: Dó e Mi. Doce e cheia.', keys: [60, 64], play: { bpm: 72, steps: [{ midis: [60], beats: 1 }, { midis: [64], beats: 1 }, { midis: [60, 64], beats: 2 }] } },
        { say: '**4ª**: Dó e Fá. Aberta, um chamado.', keys: [60, 65], play: { bpm: 72, steps: [{ midis: [60], beats: 1 }, { midis: [65], beats: 1 }, { midis: [60, 65], beats: 2 }] } },
        { say: '**5ª**: Dó e Sol. Ampla e oca.', keys: [60, 67], play: { bpm: 72, steps: [{ midis: [60], beats: 1 }, { midis: [67], beats: 1 }, { midis: [60, 67], beats: 2 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'Intervalos como formas: na mão e na pauta',
      body: `Ninguém lê intervalos contando nota por nota. Eles viram **formas**, na mão e no olho.

**Na mão**, na posição de cinco dedos: dedos 1 e 2 tocam uma 2ª; 1 e 3, uma 3ª; 1 e 4, uma 4ª; 1 e 5, uma 5ª. Basta pôr o polegar na nota de partida e o intervalo já está embaixo do dedo certo.

**Na pauta**:

- **2ª**: linha → espaço vizinho (ou espaço → linha). As notas quase se encostam.
- **3ª**: linha → linha seguinte, ou espaço → espaço seguinte.
- **4ª**: linha → espaço, pulando uma linha e um espaço.
- **5ª**: linha → linha, pulando uma linha (ou espaço → espaço, pulando um espaço).

Uma regra rápida: **intervalo ímpar** (3ª, 5ª) liga linha com linha ou espaço com espaço; **intervalo par** (2ª, 4ª) liga linha com espaço.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'contar só os passos',
      body: 'Dó → Mi não é uma 2ª: são dois passos, mas três notas. O nome do intervalo conta as duas pontas. Se ficar em dúvida, use a mão: polegar na primeira nota; o dedo que cai na segunda nota é o número do intervalo.',
    },
    { kind: 'exercise', id: 'l11-acima', exercise: { kind: 'items', title: 'Construa o intervalo', how: 'O app pede um intervalo acima de uma nota branca. Toque a nota dada e depois a de cima.', gen: intervalUp, count: 20, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l11-pauta', exercise: { kind: 'items', title: 'Intervalo na pauta', how: 'Leia a primeira nota e reconheça o intervalo pelo desenho. Toque as duas.', gen: intervalStaff, count: 16, low: 36, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'Ouvir 2ª e 5ª',
      body: `Para começar a ouvir intervalos, compare os dois mais contrastantes: a **2ª** (um passo, a nota quase não sai do lugar) e a **5ª** (um salto largo e estável).

Uma ajuda é associar cada intervalo ao começo de uma melodia conhecida. A 2ª subindo é o começo de uma escala: Dó, Ré. A 5ª subindo é o salto do início de "Brilha, brilha, estrelinha" (Dó, Dó, **Sol**, Sol). Cante por dentro antes de responder.

No exercício o app diz a nota de partida e toca o intervalo. Você toca as duas notas. Depois, entra a 3ª na mistura.`,
    },
    { kind: 'exercise', id: 'l11-ouvido25', exercise: { kind: 'items', title: '2ª ou 5ª de ouvido', how: 'Ouça, decida se foi um passo ou um salto largo e toque as duas notas.', gen: intervalEar25, count: 12, low: 55, high: 84, labels: 'off', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l11-ouvido', exercise: { kind: 'items', title: '2ª, 3ª ou 5ª de ouvido', how: 'Agora com a 3ª no meio: doce, menor que a 5ª.', gen: intervalEar, count: 12, low: 55, high: 84, labels: 'off', pass: { accuracy: 0.8 } } },
    { kind: 'exercise', id: 'l11-quiz', exercise: quiz('Contar intervalos', 'Seis perguntas rápidas.', INTERVALS) },
  ],
  review: [intervalUp, intervalStaff, intervalEar25, choice(INTERVALS, 'intervalos')],
  checkpoint: [
    { kind: 'items', title: '20 intervalos construídos', how: '2ª a 5ª acima de notas brancas, sem dicas. Meta: 85%.', gen: intervalUp, count: 20, low: 55, high: 84, labels: 'off', pass: { accuracy: 0.85 } },
    { kind: 'items', title: '20 intervalos de ouvido', how: '2ª ou 5ª, misturados com leitura na pauta. Meta: 85%.', gen: mix([intervalEar25, intervalEar25, intervalStaff, readBoth]), count: 20, low: 36, high: 84, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [intervalUp, intervalEar25, choice(INTERVALS, 'intervalos')],
};

// ---------- músicas ----------

// Ode à Alegria (Beethoven, 9ª sinfonia), versão de método na posição de Dó, agora com a mão esquerda.
const ODE_A = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4 D4 D4:2';
const ODE_A2 = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4 C4 C4:2';
const ODE_B = 'D4 D4 E4 C4 | D4 F4 E4 C4 | D4 F4 E4 D4 | C4 D4 r:2';
const ODE_L_A = 'C3:4 | G3:4 | C3:4 | G3:4';
const ODE_L_A2 = 'C3:4 | G3:4 | C3:4 | G3:2 C3:2';
const ODE_L_B = 'G3:2 C3:2 | G3:2 C3:2 | G3:4 | C3:2 G3:2';

const odeLeft: SongSpec = {
  id: 'u02-ode-me',
  title: 'Ode à Alegria com mão esquerda',
  composer: 'Ludwig van Beethoven',
  arrangement: 'arranjo do Fermata: melodia de método na posição de Dó e bordão de Dó3 e Sol3 na mão esquerda (I e V)',
  bpm: 80,
  beatsPerBar: 4,
  fifths: 0,
  right: `${ODE_A} | ${ODE_A2} | ${ODE_B} | ${ODE_A2}`,
  left: `${ODE_L_A} | ${ODE_L_A2} | ${ODE_L_B} | ${ODE_L_A2}`,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const unit: Unit = {
  n: 2,
  id: 'u02',
  title: 'Pauta dupla e intervalos',
  goal: 'Ler nas claves de Sol e de Fá, tocar intervalos de 2ª a 5ª e tocar com as duas mãos juntas.',
  technique: 'Pentacordes de Dó e de Sol, mãos separadas e depois juntas, legato, subindo de 60 rumo a 100 BPM em semínimas (referência: RCM Preparatory A). Nos dias sem lição nova, 5 minutos de leitura de notas no treino.',
  lessons: [l09, l10, l11],
  songs: [odeLeft],
  final: {
    songId: 'u02-ode-me',
    brief: 'A Ode à Alegria inteira (16 compassos), agora lida na pauta dupla e com as duas mãos: a direita na melodia, a esquerda num bordão que alterna Dó3 (dedo 5) e Sol3 (dedo 1). Repare que o bordão muda junto com a harmonia: Dó quando a melodia descansa, Sol quando ela pede continuação.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [readTreble, readBass, readBoth, intervalUp, intervalEar, intervalStaff];
