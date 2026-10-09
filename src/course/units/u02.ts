// Unidade 2 — Pauta dupla, leitura e intervalos (lições 9 a 16). Projeto final: Ode à Alegria com mão esquerda.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { choice, intervalAbove, intervalByEar, mix, readInterval, readNote, toneOrSemitone, type ChoiceQuestion } from '../gens';
import { pick } from '../music';
import { melodyTask, rhythmTask, tiedMelodyTask, twoHandTask } from '../tasks';
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

const RHYTHMS_3 = ['x x x', 'x:2 x', 'x x:2', 'x:3', 'x r x', 'x x r', 'r x x'];
const rhythm3 = (bars: number, bpm: number) => (rng: Rng) =>
  rhythmTask(Array.from({ length: bars }, () => pick(rng, RHYTHMS_3)).join(' | '), { bpm, beatsPerBar: 3, caption: 'Em 3/4: conte "1, 2, 3", com o 1 mais forte. A mínima pontuada dura o compasso inteiro.' });

/** Melodias em 3/4 com ligaduras de prolongamento ("~" liga à próxima nota igual). */
const TIES_3 = [
  'E4 F4 G4 | G4:3~ | G4 F4 E4 | D4:3',
  'C4 D4 E4 | E4:2 D4~ | D4 C4 D4 | C4:3',
  'G4:2 E4~ | E4 D4 C4 | D4:3~ | D4:2 r',
  'C4 E4 G4~ | G4 F4 E4 | D4:3~ | D4:3',
  'E4:2 F4 | G4:3~ | G4:2 E4 | C4:3',
];

const METER_3: ChoiceQuestion[] = [
  { q: 'Num compasso 3/4, quantos tempos tem cada compasso?', options: ['2', '3', '4'], answer: 1, why: 'O número de cima: 3 tempos, cada um de semínima.' },
  { q: 'Quanto vale uma mínima pontuada?', options: ['2 tempos', '3 tempos', '4 tempos'], answer: 1, why: 'O ponto soma metade do valor: 2 + 1 = 3.' },
  { q: 'Quanto vale uma semínima pontuada?', options: ['1 tempo e meio', '2 tempos', '1 tempo'], answer: 0, why: '1 + metade de 1 = 1,5 tempo.' },
  { q: 'A ligadura de prolongamento liga…', options: ['Duas notas iguais: toca a primeira e segura', 'Notas diferentes: toque ligado', 'Duas mãos'], answer: 0, why: 'Mesma nota dos dois lados da curva: os valores se somam e não se toca de novo.' },
  { q: 'A ligadura de expressão (curva sobre notas diferentes) pede…', options: ['Legato: toque ligado, como uma frase', 'Repetir a nota', 'Tocar mais forte'], answer: 0, why: 'Ela marca a frase e pede legato.' },
  { q: 'Anacruse é…', options: ['Uma ou mais notas antes do primeiro tempo forte', 'Uma pausa no fim', 'Um acorde inicial'], answer: 0, why: 'A música começa "antes do 1", e o último compasso costuma compensar os tempos que faltaram.' },
];

const ACCIDENTALS: ChoiceQuestion[] = [
  { q: 'O sustenido (♯)…', options: ['Sobe a nota um semitom', 'Desce a nota um semitom', 'Cancela outro acidente'], answer: 0, why: '♯ = um semitom acima, a tecla vizinha da direita.' },
  { q: 'O bemol (♭)…', options: ['Sobe um semitom', 'Desce um semitom', 'Sobe um tom'], answer: 1, why: '♭ = um semitom abaixo, a tecla vizinha da esquerda.' },
  { q: 'O bequadro (♮)…', options: ['Cancela o sustenido ou bemol e volta à nota natural', 'Desce um tom', 'Dobra o sustenido'], answer: 0, why: 'Bequadro = natural.' },
  { q: 'Entre Mi e Fá há…', options: ['Um semitom (sem tecla preta no meio)', 'Um tom', 'Dois tons'], answer: 0, why: 'Mi–Fá e Si–Dó são os dois pares de brancas sem preta entre elas.' },
  { q: 'Fá♯ e Sol♭ são…', options: ['A mesma tecla com dois nomes (enarmonia)', 'Teclas diferentes', 'Uma oitava de distância'], answer: 0, why: 'Enarmonia: mesmo som, grafias diferentes.' },
  { q: 'Um sustenido escrito no meio do compasso vale…', options: ['Até a barra de compasso', 'Só para aquela nota', 'Até o fim da música'], answer: 0, why: 'O acidente vale para a mesma nota até a próxima barra.' },
  { q: 'Um tom tem quantos semitons?', options: ['1', '2', '3'], answer: 1, why: 'Tom = 2 semitons: Dó → Ré passa por Dó♯.' },
];

const toneSemi = toneOrSemitone({ from: [60, 62, 64, 65, 67, 69, 71, 72], kinds: ['tom', 'semitom'], dirs: ['acima', 'abaixo'] });
const semiUp = toneOrSemitone({ from: [60, 62, 64, 65, 67, 69, 71], kinds: ['semitom'], dirs: ['acima'] });
const readSharps = readNote({ notes: [61, 63, 66, 68, 70, 73, 75, 78], clef: 'treble', skill: 'ler-sustenido' });
const readWithSharps = mix([readSharps, readTreble]);

/** Melodias na posição de Sol da mão direita (polegar no Sol4, alcança o Fá♯4 com o polegar). */
const G_POS = [
  'G4 A4 B4 G4 | A4 F#4 G4:2 | B4 C5 D5 B4 | A4 F#4 G4:2',
  'D5 C5 B4 A4 | G4 F#4 G4:2 | B4 A4 G4 F#4 | G4:4',
  'G4 B4 A4 F#4 | G4 A4 B4:2 | C5 B4 A4 F#4 | G4:4',
  'B4 A4 G4 F#4 | G4 A4 B4:2 | A4 G4 F#4 A4 | G4:4',
  'G4:2 F#4 G4 | A4 B4 C5:2 | B4 A4 G4 F#4 | G4:4',
];

const l12: Lesson = {
  n: 12,
  id: 'l12',
  title: '3/4, pontuada, ligaduras e anacruse',
  minutes: 60,
  objectives: [
    'Consigo contar e tocar ritmos em 3/4 com mínima pontuada.',
    'Consigo segurar uma nota ligada sem tocá-la de novo.',
    'Consigo começar uma música em anacruse, entrando no tempo certo.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O compasso 3/4',
      body: `Você já conhece o 4/4. No **3/4** cada compasso tem **3 tempos**, e a semínima continua valendo 1. O acento cai assim: **forte**, fraco, fraco. Conte "**UM**, dois, três".

O 3/4 é o compasso da **valsa** e de muitos minuetos. Ele tem um balanço circular: o 1 é o passo grande, o 2 e o 3 são a volta. Sentir esse balanço ajuda mais do que contar mecanicamente.

Num 3/4, a mínima (2 tempos) não completa o compasso: sempre sobra um tempo para uma semínima ou uma pausa.`,
    },
    {
      kind: 'text',
      title: 'O ponto de aumento',
      body: `Um **ponto** logo depois da cabeça da nota **soma metade do valor dela**:

- **Mínima pontuada** = 2 + 1 = **3 tempos**. No 3/4, ela enche o compasso inteiro.
- **Semínima pontuada** = 1 + ½ = **1 tempo e meio** (ela aparece de verdade nas próximas unidades, junto com a colcheia).

Ao tocar a mínima pontuada, aperte no "um" e segure durante "dois, três". O erro típico é soltar no "três", com pressa de chegar ao próximo compasso.`,
    },
    {
      kind: 'example',
      title: 'Ouvir o 3/4',
      steps: [
        { say: 'Três semínimas por compasso, o 1 mais forte: UM, dois, três.', play: { bpm: 84, steps: [0.9, 0.5, 0.5, 0.9, 0.5, 0.5].map((v) => ({ midis: [60], beats: 1, velocity: v })) } },
        { say: 'Mínima e semínima: UM (dois), três.', play: { bpm: 84, steps: [{ midis: [60], beats: 2 }, { midis: [60], beats: 1 }, { midis: [60], beats: 2 }, { midis: [60], beats: 1 }] } },
        { say: 'Mínima pontuada: toca no 1 e segura os três tempos.', play: { bpm: 84, steps: [{ midis: [60], beats: 3 }, { midis: [60], beats: 3 }] } },
      ],
    },
    { kind: 'exercise', id: 'l12-ritmo', exercise: quickTimed('Ritmo em 3/4', 'Quatro compassos sorteados a 72 BPM, em qualquer tecla. Duas passadas boas.', rhythm3(4, 72), { reps: 2 }) },
    {
      kind: 'text',
      title: 'Duas ligaduras com a mesma cara',
      body: `Na partitura aparecem curvas ligando notas. Elas são de dois tipos, e confundir os dois é um erro clássico:

- **Ligadura de prolongamento**: liga duas notas **iguais** (mesma linha ou espaço), quase sempre atravessando a barra de compasso. Ela **soma os valores**: você toca a primeira e **segura** pela duração das duas. A segunda não se toca.
- **Ligadura de expressão**: uma curva sobre notas **diferentes**. Ela não soma nada: marca uma **frase** e pede legato, como uma respiração da música.

A ligadura de prolongamento existe porque uma nota não pode atravessar a barra de compasso. Uma nota de 4 tempos que começa no 3º tempo de um 3/4 é escrita como uma semínima ligada a uma mínima pontuada.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'tocar de novo a nota ligada',
      body: 'Quando a ligadura atravessa a barra, a mão tem vontade de tocar de novo no "um" do compasso seguinte. Não toque: segure e conte. No exercício abaixo, uma nota a mais derruba a passada.',
    },
    {
      kind: 'example',
      title: 'Ligada e não ligada',
      steps: [
        { say: 'Sem ligadura: o Sol é tocado duas vezes.', play: { bpm: 72, steps: [{ midis: [64], beats: 1 }, { midis: [65], beats: 1 }, { midis: [67], beats: 1 }, { midis: [67], beats: 3 }] } },
        { say: 'Com ligadura: o mesmo Sol, tocado uma vez e segurado por 4 tempos.', play: { bpm: 72, steps: [{ midis: [64], beats: 1 }, { midis: [65], beats: 1 }, { midis: [67], beats: 4 }] } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l12-ligadura',
      exercise: quickTimed('Ligaduras em 3/4', 'Posição de Dó, a 66 BPM. Nas notas ligadas, segure: não toque de novo. Duas passadas boas.', (rng) => tiedMelodyTask(pick(rng, TIES_3), { bpm: 66, beatsPerBar: 3, caption: 'A pauta mostra as duas figuras da ligadura; toque só a primeira e segure.' }), { reps: 2, noExtras: true }),
    },
    {
      kind: 'text',
      title: 'Anacruse: começar antes do 1',
      body: `Muitas músicas não começam no tempo forte. Elas começam com uma ou mais notas **antes do primeiro "um"**, como quem pega impulso. Isso se chama **anacruse**. "Parabéns a você" começa assim: "Pa-ra" vem antes do tempo forte, que cai em "**béns**".

Na partitura, o compasso da anacruse fica incompleto, e o **último compasso** da música costuma ter só os tempos que faltaram. Para começar no lugar certo, conte o compasso inteiro antes e entre no tempo da anacruse. Numa anacruse de 1 tempo em 3/4: "um, dois, **três**", e a música começa no três.

Nesta unidade, a anacruse aparece escrita com **pausas** no começo do compasso, para você ver os tempos que está contando. Numa partitura comum essas pausas não aparecem.`,
    },
    { kind: 'song', songId: 'u02-valsa', why: 'Uma valsa curta em 3/4 que começa em anacruse: o Sol entra no "três", e a mão esquerda segura mínimas pontuadas. O último compasso tem 2 tempos e uma pausa, compensando a anacruse.' },
    { kind: 'exercise', id: 'l12-quiz', exercise: quiz('3/4, ponto e ligaduras', 'Seis perguntas rápidas.', METER_3) },
  ],
  review: [choice(METER_3, 'compasso-3'), readTreble],
  checkpoint: [
    quickTimed('Oito compassos em 3/4', 'Ritmo sorteado a 72 BPM, sem dicas. Meta: 85% na janela de ±70 ms.', rhythm3(8, 72), { window: 70 }),
    quickTimed('Ligaduras sem reataque', 'Melodia nova com ligaduras, a 72 BPM. Nenhuma nota a mais.', (rng) => tiedMelodyTask(pick(rng, TIES_3), { bpm: 72, beatsPerBar: 3 }), { window: 70, noExtras: true }),
  ],
  exit: [choice(METER_3, 'compasso-3'), readBass],
};

const l13: Lesson = {
  n: 13,
  id: 'l13',
  title: 'Tom, semitom e sustenido; posição de Sol',
  minutes: 60,
  objectives: [
    'Consigo tocar um tom ou um semitom acima ou abaixo de qualquer nota.',
    'Consigo ler sustenido, bemol e bequadro e saber até onde eles valem.',
    'Consigo tocar na posição de Sol lembrando sempre do Fá♯.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Semitom: a menor distância do piano',
      body: `Até aqui você andou só pelas teclas brancas. Agora entram as pretas.

O **semitom** é a menor distância do piano: de uma tecla para a **vizinha**, sem pular nenhuma, seja ela preta ou branca. De Dó para Dó♯ é um semitom; de Dó♯ para Ré, outro.

Dois pares de brancas **não têm preta no meio**: **Mi–Fá** e **Si–Dó**. Por isso, entre eles, a distância é de só um semitom, mesmo sendo duas brancas.

O **tom** é a soma de dois semitons: pule uma tecla. De Dó para Ré é um tom (passando por Dó♯). De Mi para Fá♯ também é um tom. Já de Mi para Fá é só um semitom.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 72,
      lit: [64, 65, 71, 72],
      labels: { 64: 'Mi', 65: 'Fá', 71: 'Si', 72: 'Dó' },
      caption: 'Mi–Fá e Si–Dó: as duas brancas vizinhas sem preta no meio. Entre elas, só um semitom.',
    },
    {
      kind: 'text',
      title: 'Sustenido, bemol e bequadro',
      body: `Os **acidentes** mudam a altura de uma nota:

- **Sustenido (♯)**: sobe um semitom. Fá♯ é a preta logo à direita do Fá.
- **Bemol (♭)**: desce um semitom. Si♭ é a preta logo à esquerda do Si.
- **Bequadro (♮)**: cancela o acidente e volta à nota natural.

Uma tecla preta tem dois nomes: a preta entre Fá e Sol é **Fá♯** e também **Sol♭**. Mesmo som, grafias diferentes: isso se chama **enarmonia**. Qual nome usar depende da tonalidade, assunto da Unidade 4.

Na pauta, o acidente vem **antes** da nota, na mesma linha ou espaço. E ele **vale até a barra de compasso**, para todas as notas iguais naquele compasso. No compasso seguinte, se ninguém escrever de novo, a nota volta a ser natural.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'achar que todo sustenido é uma tecla preta',
      body: 'Quase sempre é, mas não sempre. Mi♯ é a tecla do Fá, e Si♯ é a tecla do Dó; Fá♭ é a tecla do Mi. Pense sempre em "tecla vizinha", não em "tecla preta".',
    },
    {
      kind: 'example',
      title: 'Tom e semitom a partir do Mi',
      steps: [
        { say: 'Semitom acima de Mi: a vizinha é o **Fá**, branca.', keys: [64, 65], play: { bpm: 72, steps: [{ midis: [64], beats: 1 }, { midis: [65], beats: 2 }] } },
        { say: 'Tom acima de Mi: pule uma tecla. **Fá♯**.', keys: [64, 66], play: { bpm: 72, steps: [{ midis: [64], beats: 1 }, { midis: [66], beats: 2 }] } },
        { say: 'Semitom abaixo de Dó: o **Si**. Tom abaixo de Dó: **Si♭** (ou Lá♯).', keys: [59, 58], play: { bpm: 72, steps: [{ midis: [60], beats: 1 }, { midis: [59], beats: 1 }, { midis: [60], beats: 1 }, { midis: [58], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l13-semitom', exercise: { kind: 'items', title: 'Semitom acima', how: 'Toque a nota dada e depois a tecla vizinha da direita. Cuidado com Mi e Si.', gen: semiUp, count: 10, low: 55, high: 79, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l13-tom-semitom', exercise: { kind: 'items', title: 'Tom ou semitom, acima ou abaixo', how: 'Leia com atenção a pergunta. Tom: pule uma tecla. Semitom: a vizinha.', gen: toneSemi, count: 16, low: 55, high: 79, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l13-ler', exercise: { kind: 'items', title: 'Sustenidos na pauta', how: 'Notas com e sem sustenido. O ♯ vem antes da nota.', gen: readWithSharps, count: 16, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'A posição de Sol e o Fá♯',
      body: `Mude a mão direita de lugar: polegar (1) no **Sol4**. Os dedos 1, 2, 3, 4, 5 ficam sobre **Sol, Lá, Si, Dó, Ré**. Essa é a **posição de Sol**.

Nas melodias em Sol maior, o Fá é sempre **Fá♯**. O motivo vem na Unidade 4 (a escala maior); por enquanto, a regra prática basta: nesta posição, o polegar desce um pouquinho para alcançar o Fá♯4, a preta logo abaixo do Sol, e volta.

Nas melodias abaixo o ♯ aparece escrito em cada Fá. Mesmo assim, o erro mais comum é a mão "lembrar" da posição de Dó e tocar o Fá natural. Antes de começar, toque Sol, Fá♯, Sol algumas vezes, para a mão gravar o caminho.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 76,
      lit: [66, 67, 69, 71, 72, 74],
      labels: { 66: '1', 67: '1', 69: '2', 71: '3', 72: '4', 74: '5' },
      caption: 'Posição de Sol, mão direita: polegar no Sol4 (e no Fá♯4 quando ele aparece), mínimo no Ré5.',
    },
    { kind: 'exercise', id: 'l13-sol', exercise: quickTimed('Melodia na posição de Sol', 'Quatro compassos sorteados a 60 BPM. Todo Fá é Fá♯. Duas passadas boas.', (rng) => melodyTask(pick(rng, G_POS), { bpm: 60 }), { reps: 2 }) },
    { kind: 'exercise', id: 'l13-quiz', exercise: quiz('Acidentes', 'Sete perguntas rápidas.', ACCIDENTALS) },
  ],
  review: [toneSemi, readSharps, choice(ACCIDENTALS, 'acidentes')],
  checkpoint: [
    { kind: 'items', title: 'Tom e semitom', how: '16 pedidos, sem dicas, misturados com notas com sustenido na pauta. Meta: 85%.', gen: mix([toneSemi, toneSemi, readSharps]), count: 16, low: 55, high: 84, labels: 'off', pass: { accuracy: 0.85 } },
    quickTimed('Posição de Sol no tempo', 'Melodia nova a 66 BPM. Nenhum Fá natural.', (rng) => melodyTask(pick(rng, G_POS), { bpm: 66 })),
  ],
  exit: [toneSemi, choice(ACCIDENTALS, 'acidentes')],
};

// Ode à Alegria (Beethoven, 9ª sinfonia), versão de método na posição de Dó, agora com a mão esquerda.
const ODE_A = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4 D4 D4:2';
const ODE_A2 = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4 C4 C4:2';
const ODE_B = 'D4 D4 E4 C4 | D4 F4 E4 C4 | D4 F4 E4 D4 | C4 D4 r:2';
const ODE_L_A = 'C3:4 | G3:4 | C3:4 | G3:4';
const ODE_L_A2 = 'C3:4 | G3:4 | C3:4 | G3:2 C3:2';
const ODE_L_B = 'G3:2 C3:2 | G3:2 C3:2 | G3:4 | C3:2 G3:2';

const odeRight = `${ODE_A} | ${ODE_A2} | ${ODE_B} | ${ODE_A2}`;
const odeLeftLine = `${ODE_L_A} | ${ODE_L_A2} | ${ODE_L_B} | ${ODE_L_A2}`;

const ODE_8_R = `${ODE_A} | ${ODE_A2}`;
const ODE_8_L = `${ODE_L_A} | ${ODE_L_A2}`;

const l14: Lesson = {
  n: 14,
  id: 'l14',
  title: 'Mãos juntas I',
  minutes: 60,
  objectives: [
    'Consigo tocar um bordão na mão esquerda enquanto a direita lê uma melodia.',
    'Consigo trocar o bordão de Dó para Sol no tempo certo.',
    'Consigo tocar a Ode à Alegria com as duas mãos a 80 BPM.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Por que juntar as mãos é difícil',
      body: `Tocar com as duas mãos não é tocar duas coisas ao mesmo tempo: é tocar **uma coisa só**, feita de duas partes. O cérebro não consegue prestar atenção total nas duas mãos; o que funciona é deixar uma delas **automática** e dar a atenção para a outra.

Por isso a ordem de estudo é sempre a mesma:

- Cada mão sozinha, até ficar fácil.
- Mãos juntas **bem devagar**, mais devagar do que parece necessário.
- Subir o andamento aos poucos.

A mão que fica automática é quase sempre a esquerda, porque ela faz a parte mais simples e repetitiva: o **bordão**, uma nota longa que se repete por baixo da melodia.`,
    },
    {
      kind: 'text',
      title: 'O bordão e onde as mãos se encontram',
      body: `Nesta lição a mão esquerda fica na posição de Dó (dedo 5 no Dó3, dedo 1 no Sol3) e toca **semibreves**: uma nota no tempo 1 de cada compasso, segurada até o próximo.

O momento crítico é o **tempo 1**: as duas mãos descem **juntas**. Nos tempos 2, 3 e 4 só a direita trabalha. Por isso, na leitura, olhe primeiro o 1 de cada compasso, nas duas pautas: é ali que mora a coordenação.

**Conte antes de tocar.** Diga "1, 2, 3, 4" em voz alta uma vez antes de começar e continue contando baixinho enquanto toca. Quem conta não corre.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'devagar é mais rápido',
      body: 'Se as mãos se perdem, o andamento está alto demais para agora. Baixe 10 BPM e faça duas passadas limpas. Repetir errado grava o erro; repetir certo, mesmo devagar, grava o certo.',
    },
    {
      kind: 'exercise',
      id: 'l14-bordao',
      exercise: quickTimed('Bordão de Dó e leitura na direita', 'A esquerda toca Dó3 no 1 de cada compasso e segura. A direita lê a melodia sorteada, a 60 BPM. Duas passadas boas.', (rng) => twoHandTask(pick(rng, READ_R), 'C3:4 | C3:4 | C3:4 | C3:4', { bpm: 60, caption: 'Mão esquerda: Dó3 de semibreve em cada compasso.' }), { reps: 2 }),
    },
    {
      kind: 'text',
      title: 'O bordão muda com a harmonia',
      body: `Um bordão parado no Dó funciona por um tempo, mas logo soa estranho quando a melodia "pede" outra base. Na Ode à Alegria, alguns compassos descansam (a melodia gira em torno de Dó, Mi e Sol) e outros pedem continuação (a melodia passa por Ré, Fá e Si). Para os primeiros, o bordão é **Dó**; para os outros, **Sol**.

Na posição de Dó da mão esquerda isso não exige movimento nenhum: o Dó3 é o dedo 5 e o Sol3 é o dedo 1. A mão fica parada e só troca o dedo. Na Unidade 3, esses dois bordões vão virar os acordes de **Dó** e de **Sol**: o I e o V.`,
    },
    {
      kind: 'example',
      title: 'Ode à Alegria com bordão',
      steps: [
        { say: 'A esquerda sozinha: Dó, Sol, Dó, Sol, uma semibreve por compasso.', keys: [48, 55], play: { bpm: 80, steps: [48, 55, 48, 55].map((m) => ({ midis: [m], beats: 4 })) } },
        {
          say: 'As duas mãos juntas, primeira frase. As mãos descem juntas no 1 de cada compasso.',
          play: { bpm: 80, steps: [[64, 48], [64], [65], [67], [67, 55], [65], [64], [62], [60, 48], [60], [62], [64], [64, 55], [62], [62]].map((m, i) => ({ midis: m, beats: i === 14 ? 2 : 1 })) },
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'l14-ode-escada',
      exercise: quickTimed('Ode à Alegria, 8 compassos, duas mãos', 'Bordão de Dó e Sol na esquerda. Começa a 60 BPM e sobe 5 BPM a cada passada boa, até 80.', () => twoHandTask(ODE_8_R, ODE_8_L, { bpm: 60, caption: 'Mão esquerda: Dó3 ou Sol3 no 1 de cada compasso (veja a partitura no "Tocar a música").' }), { ladder: { from: 60, to: 80, step: 5 } }),
    },
    { kind: 'song', songId: 'u02-ode-me-8', why: 'Os mesmos 8 compassos com a pauta dupla de verdade: aqui você vê as duas claves juntas. O modo Estudar espera cada nota das duas mãos.' },
  ],
  review: [readBoth, intervalUp],
  checkpoint: [
    quickTimed('Ode à Alegria completa, duas mãos', '16 compassos a 80 BPM, sem dicas. Meta: 90% das notas, ±80 ms.', () => twoHandTask(odeRight, odeLeftLine, { bpm: 80 }), { window: 80, pass: { accuracy: 0.9 } }),
  ],
  exit: [readBoth, choice([...METER_3, ...ACCIDENTALS])],
};

// ---------- músicas ----------

const odeLeft: SongSpec = {
  id: 'u02-ode-me',
  title: 'Ode à Alegria com mão esquerda',
  composer: 'Ludwig van Beethoven',
  arrangement: 'arranjo do Fermata: melodia de método na posição de Dó e bordão de Dó3 e Sol3 na mão esquerda (I e V)',
  bpm: 80,
  beatsPerBar: 4,
  fifths: 0,
  right: odeRight,
  left: odeLeftLine,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const ode8: SongSpec = {
  id: 'u02-ode-me-8',
  title: 'Ode à Alegria com mão esquerda, 8 primeiros compassos',
  composer: 'Ludwig van Beethoven',
  arrangement: 'arranjo do Fermata: melodia de método e bordão de Dó3 e Sol3',
  bpm: 80,
  beatsPerBar: 4,
  fifths: 0,
  right: ODE_8_R,
  left: ODE_8_L,
  hands: 'duas',
  pass: { accuracy: 0.9 },
};

// Valsa curta original do Fermata, em 3/4, com anacruse (as pausas do 1º compasso marcam os tempos contados).
const valsa: SongSpec = {
  id: 'u02-valsa',
  title: 'Valsinha em Dó',
  composer: 'Fermata (melodia original)',
  arrangement: 'melodia na posição de Dó; mão esquerda em mínimas pontuadas de Dó3 e Sol3. A anacruse aparece com duas pausas antes',
  bpm: 84,
  beatsPerBar: 3,
  fifths: 0,
  right: 'r:2 G4 | E4:2 F4 | G4:2 E4 | D4:3 | D4 E4 F4 | E4:2 D4 | D4 E4 D4 | C4:2 r',
  left: 'r:3 | C3:3 | C3:3 | G3:3 | G3:3 | C3:3 | G3:3 | C3:2 r',
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const unit: Unit = {
  n: 2,
  id: 'u02',
  title: 'Pauta dupla e intervalos',
  goal: 'Ler nas claves de Sol e de Fá, tocar intervalos de 2ª a 5ª e tocar com as duas mãos juntas.',
  technique: 'Pentacordes de Dó e de Sol, mãos separadas e depois juntas, legato, subindo de 60 rumo a 100 BPM em semínimas (referência: RCM Preparatory A). Nos dias sem lição nova, 5 minutos de leitura de notas no treino.',
  lessons: [l09, l10, l11, l12, l13, l14],
  songs: [odeLeft, ode8, valsa],
  final: {
    songId: 'u02-ode-me',
    brief: 'A Ode à Alegria inteira (16 compassos), agora lida na pauta dupla e com as duas mãos: a direita na melodia, a esquerda num bordão que alterna Dó3 (dedo 5) e Sol3 (dedo 1). Repare que o bordão muda junto com a harmonia: Dó quando a melodia descansa, Sol quando ela pede continuação.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [readTreble, readBass, readBoth, intervalUp, intervalEar, intervalStaff, toneSemi, readWithSharps];
