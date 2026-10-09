// Unidade 1 — Teclado, pulso e postura (lições 1 a 8). Projeto final: Ode à Alegria.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { choice, degreeByEar, direction, echo, findAll, findExact, findNote, fingerNote, mix, stepOrLeap, type ChoiceQuestion } from '../gens';
import { BLACK_PCS, WHITE_PCS, n, pick } from '../music';
import { melodyTask, randomRhythm, twoHandTask } from '../tasks';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

const LOW = 48; // Dó3
const HIGH = 84; // Dó6

// ---------- peças reaproveitadas ----------

const findWhite = findNote({ pcs: WHITE_PCS, low: LOW, high: HIGH });
const findAllWhite = findAll({ pcs: [0, 5, 4, 11, 7], low: LOW, high: HIGH, seconds: 15 });
const middleC = findExact({ keys: [{ midi: 60, label: 'o Dó central (Dó4)' }, { midi: 48, label: 'o Dó uma oitava abaixo do central (Dó3)' }, { midi: 72, label: 'o Dó uma oitava acima do central (Dó5)' }] });

const FIGURES: ChoiceQuestion[] = [
  { q: 'Quantos tempos dura uma mínima?', options: ['1', '2', '4'], answer: 1, why: 'Mínima = 2 tempos: cabeça vazia com haste.' },
  { q: 'Quantos tempos dura uma semibreve?', options: ['2', '3', '4'], answer: 2, why: 'Semibreve = 4 tempos: só a cabeça vazia, sem haste.' },
  { q: 'Quantas semínimas cabem numa mínima?', options: ['1', '2', '4'], answer: 1, why: 'Cada semínima vale 1 tempo; a mínima vale 2.' },
  { q: 'Qual figura vale 1 tempo?', options: ['Semínima', 'Mínima', 'Semibreve'], answer: 0, why: 'Semínima: cabeça cheia com haste.' },
  { q: 'A 60 BPM, quanto dura um tempo?', options: ['Meio segundo', '1 segundo', '2 segundos'], answer: 1, why: '60 batidas por minuto = 1 por segundo.' },
  { q: 'A 120 BPM, quanto dura um tempo?', options: ['Meio segundo', '1 segundo', '2 segundos'], answer: 0, why: '120 batidas por minuto = 2 por segundo.' },
];

const RESTS: ChoiceQuestion[] = [
  { q: 'Quantos tempos dura a pausa de semínima?', options: ['1', '2', '4'], answer: 0, why: 'Cada figura tem uma pausa com o mesmo valor.' },
  { q: 'A pausa de mínima fica…', options: ['Sentada sobre a 3ª linha', 'Pendurada na 4ª linha', 'Fora da pauta'], answer: 0, why: 'Mínima "senta" (2 tempos); semibreve "pendura" (4 tempos, ou o compasso inteiro).' },
  { q: 'Numa pausa, a mão…', options: ['Continua apertando a tecla', 'Solta a tecla e conta o tempo', 'Toca mais baixo'], answer: 1, why: 'Pausa é silêncio contado: solte a tecla e continue contando.' },
];

const METER: ChoiceQuestion[] = [
  { q: 'Num compasso 4/4, o número de cima diz…', options: ['Quantos tempos tem o compasso', 'O andamento', 'Qual mão toca'], answer: 0, why: '4/4: 4 tempos por compasso, e a semínima vale 1 tempo.' },
  { q: 'Qual é o tempo mais forte do compasso 4/4?', options: ['1', '2', '4'], answer: 0, why: 'O 1 é o tempo forte; o 3 é meio-forte.' },
  { q: 'Quantas semínimas cabem num compasso 4/4?', options: ['2', '3', '4'], answer: 2, why: '4 tempos, cada semínima vale 1.' },
];

const DYNAMICS: ChoiceQuestion[] = [
  { q: 'O que significa p?', options: ['Piano: leve', 'Pausa', 'Pedal'], answer: 0, why: 'Os sinais de dinâmica são em italiano: p = piano (leve).' },
  { q: 'O que significa f?', options: ['Fim', 'Forte', 'Fá'], answer: 1, why: 'f = forte.' },
  { q: 'mf fica…', options: ['Entre p e f', 'Mais forte que f', 'Mais leve que p'], answer: 0, why: 'mf = mezzo forte, meio forte.' },
  { q: 'O sinal que abre (<) pede…', options: ['Crescendo', 'Diminuendo', 'Staccato'], answer: 0, why: 'O sinal abre como o volume: crescendo.' },
  { q: 'Para tocar forte, o que muda?', options: ['Apertar mais o fundo da tecla', 'A velocidade com que a tecla desce, com o peso do braço', 'O dedo que toca'], answer: 1, why: 'O som nasce da velocidade da tecla. Apertar o fundo depois do som só cansa.' },
];

const ARTIC: ChoiceQuestion[] = [
  { q: 'No legato, quando você solta a tecla anterior?', options: ['Antes de tocar a próxima', 'No exato momento em que a próxima desce', 'Um tempo depois da próxima'], answer: 1, why: 'Legato = ligado, sem buraco de silêncio entre as notas.' },
  { q: 'Staccato é…', options: ['Nota curta e solta', 'Nota longa e ligada', 'Nota forte'], answer: 0, why: 'Staccato: toque e solte logo, como se a tecla estivesse quente.' },
];

const PENTA_R = 'C4 D4 E4 F4 | G4 F4 E4 D4 | C4:4';
const PENTA_L = 'C3 D3 E3 F3 | G3 F3 E3 D3 | C3:4';
const PENTA_PATTERNS_R = ['C4 D4 E4 F4 | G4 F4 E4 D4 | C4:4', 'C4 E4 D4 F4 | E4 G4 F4 D4 | C4:4', 'E4 D4 C4 D4 | E4 F4 G4 E4 | C4:4', 'G4 F4 E4 D4 | C4 D4 E4 G4 | C4:4', 'C4 C4 D4 D4 | E4 E4 F4 F4 | G4:4'];

const RHYTHMS_A = ['x x x x', 'x:2 x:2', 'x:4', 'x x x:2', 'x:2 x x', 'x x:2 x'];
const RHYTHMS_REST = ['x x x r', 'x r x r', 'x:2 r:2', 'r x x x', 'x x r:2', 'x:2 x r', 'r:2 x:2'];

const blackMotifs = [
  [n('F#4'), n('G#4'), n('A#4')], [n('A#4'), n('G#4'), n('F#4')], [n('C#4'), n('D#4'), n('F#4')], [n('F#4'), n('D#4'), n('C#4')],
  [n('G#4'), n('A#4'), n('C#5')], [n('D#4'), n('F#4'), n('G#4')], [n('C#5'), n('A#4'), n('F#4')], [n('F#4'), n('A#4'), n('G#4')],
];
const cMotifs = [[60, 64, 67], [67, 64, 60], [60, 62, 64], [64, 62, 60], [60, 67, 64], [64, 65, 67], [67, 65, 64], [62, 64, 60]];

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

// ---------- lições ----------

const l01: Lesson = {
  n: 1,
  id: 'l01',
  title: 'O teclado e o corpo',
  minutes: 60,
  objectives: [
    'Consigo achar qualquer nota branca em menos de 2 segundos, sem rótulo.',
    'Consigo achar o Dó central e as oitavas acima e abaixo.',
    'Consigo sentar e posicionar a mão sem tensão.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O desenho das teclas pretas',
      body: `O teclado parece uma fileira sem fim de teclas iguais, mas ele tem um desenho que se repete: as teclas pretas vêm em **grupos de 2** e **grupos de 3**, alternando. É por esse desenho que você se localiza, nunca contando tecla por tecla.

As teclas brancas têm sete nomes, que se repetem na mesma ordem: **Dó, Ré, Mi, Fá, Sol, Lá, Si**, e de novo Dó. Em cifra (a notação de letras usada em música popular e nos teclados) elas são C, D, E, F, G, A e B. Vale guardar as duas formas desde já: Dó = C.

Seu piano tem 88 teclas: 52 brancas e 36 pretas. Da esquerda para a direita, o som vai do **grave** ao **agudo**.`,
    },
    {
      kind: 'keys',
      low: 48,
      high: 72,
      lit: [48, 60, 72],
      labels: { 60: 'Dó', 62: 'Ré', 64: 'Mi', 65: 'Fá', 67: 'Sol', 69: 'Lá', 71: 'Si', 48: 'Dó', 72: 'Dó' },
      caption: 'O Dó fica sempre logo à esquerda do grupo de 2 pretas. De um Dó ao próximo Dó: uma oitava.',
    },
    {
      kind: 'text',
      title: 'Âncoras: Dó e Fá',
      body: `Duas notas servem de âncora para todas as outras:

- **Dó** fica logo à esquerda do grupo de **2** pretas. Ré fica no meio desse grupo e Mi logo à direita.
- **Fá** fica logo à esquerda do grupo de **3** pretas. Sol e Lá ficam entre as pretas desse grupo, e Si logo à direita.

A distância de um Dó até o próximo Dó se chama **oitava**: são 12 teclas, contando brancas e pretas. O **Dó central** é o Dó mais perto do meio do piano, normalmente embaixo da marca do instrumento. Em notação científica ele se chama **Dó4** (C4). O Dó uma oitava acima é Dó5; uma abaixo, Dó3.`,
    },
    {
      kind: 'example',
      title: 'Achar o Sol sem contar',
      steps: [
        { say: 'Procure um **grupo de 3 pretas** perto do meio do teclado.', keys: [n('F#4'), n('G#4'), n('A#4')] },
        { say: 'O Fá fica logo à esquerda do grupo. O **Sol** fica entre a 1ª e a 2ª preta.', keys: [n('G4')], play: { bpm: 80, steps: [{ midis: [n('F4')], beats: 1 }, { midis: [n('G4')], beats: 2 }] } },
        { say: 'O mesmo desenho existe em todas as oitavas: aqui estão todos os Sol entre Dó3 e Dó6.', keys: [55, 67, 79], play: { bpm: 90, steps: [{ midis: [55], beats: 1 }, { midis: [67], beats: 1 }, { midis: [79], beats: 2 }] } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l01-achar',
      exercise: { kind: 'items', title: 'Toque a nota chamada', how: 'O app pede uma nota branca; toque ela em qualquer oitava. Os nomes nas teclas somem quando você acerta 5 seguidas.', gen: findWhite, count: 20, low: LOW, high: HIGH, labels: 'fade', pass: { accuracy: 0.85 } },
    },
    {
      kind: 'exercise',
      id: 'l01-todas',
      exercise: { kind: 'items', title: 'Todas de uma vez', how: 'Toque todos os exemplares de uma nota em até 15 segundos, em qualquer ordem.', gen: findAllWhite, count: 4, low: LOW, high: HIGH, labels: 'off', pass: { accuracy: 0.75 } },
    },
    {
      kind: 'text',
      title: 'Os números dos dedos',
      body: `Em partitura e nos exercícios, os dedos têm números, iguais nas duas mãos: **1 = polegar**, 2 = indicador, 3 = médio, 4 = anelar, **5 = mínimo**. MD é a mão direita; ME, a esquerda.

Os números deixam o dedilhado escrito. Isso importa porque o dedo certo na hora certa é o que permite tocar sem parar para "procurar" a próxima tecla.`,
    },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'postura antes de tudo',
      body: `Um estudo com 363 estudantes de piano encontrou dor ligada ao instrumento em mais de 80% deles, principalmente no punho e no ombro. Não aquecer e não fazer pausas apareceram junto com mais problemas. Por isso:

- **Banco**: na altura em que o antebraço fica paralelo ao chão, com o cotovelo um pouco à frente do corpo. Pés apoiados.
- **Punho**: alinhado com o antebraço, nem caído nem levantado.
- **Mão**: arredondada, como se segurasse uma laranja pequena; toque com a ponta do dedo.
- **Dedo, mão e antebraço** funcionam como uma unidade: o peso vem do braço, os dedos só transmitem.
- **Pausa** de 2 a 3 minutos a cada 20 a 30 minutos, e sempre um aquecimento curto antes.`,
    },
    {
      kind: 'exercise',
      id: 'l01-postura',
      exercise: {
        kind: 'checklist',
        title: 'Confira sua postura',
        how: 'Sente-se ao piano e confira cada item. Peça para alguém olhar, ou use o celular para se filmar de lado.',
        items: [
          'O antebraço está paralelo ao chão, sem levantar os ombros.',
          'Os pés estão apoiados e as costas retas, sem encostar.',
          'O punho está alinhado com o antebraço.',
          'A mão está arredondada e toca com a ponta dos dedos.',
          'Consigo tocar uma nota deixando o peso do braço cair, sem apertar.',
        ],
      },
    },
    {
      kind: 'text',
      title: 'Calibrar a força do seu piano',
      body: `Cada piano digital mede a força do toque de um jeito. Para o app entender o que é "leve" e "forte" no seu piano, faça a calibração uma vez: toque 6 notas o mais leve que conseguir e depois 6 bem fortes. Isso vai ser usado na lição de dinâmica.`,
    },
    { kind: 'exercise', id: 'l01-calibrar', exercise: { kind: 'calibrate', title: 'Calibração de força', how: 'Precisa do piano conectado. Sem ele, pule e faça depois.' } },
  ],
  review: [findWhite, middleC, findAllWhite],
  checkpoint: [
    { kind: 'items', title: 'Notas chamadas', how: '20 notas, sem nomes no teclado. Meta: 90% de primeira e média abaixo de 2 s.', gen: findWhite, count: 20, low: LOW, high: HIGH, labels: 'off', pass: { accuracy: 0.9, avgMs: 2000 } },
    { kind: 'items', title: 'Dó central e oitavas', how: 'Ache o Dó pedido.', gen: middleC, count: 6, low: LOW, high: HIGH, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [findWhite, middleC, choice([{ q: 'O Fá fica…', options: ['À esquerda do grupo de 3 pretas', 'À esquerda do grupo de 2 pretas', 'Entre duas pretas'], answer: 0 }, { q: 'Qual é o número do polegar?', options: ['1', '5', '0'], answer: 0 }])],
};

const l02: Lesson = {
  n: 2,
  id: 'l02',
  title: 'Pulso e figuras',
  minutes: 60,
  objectives: [
    'Consigo manter o pulso com o metrônomo de 60 a 72 BPM.',
    'Consigo ler semibreve, mínima e semínima e tocar cada uma pelo tempo certo.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Pulso, andamento e BPM',
      body: `Toda música tem um **pulso**: uma batida constante, como o coração, que você sente mesmo quando ninguém está tocando. É o que você marca com o pé sem perceber.

A velocidade do pulso é o **andamento**, medido em **BPM** (batidas por minuto). A 60 BPM, cada batida dura exatamente 1 segundo; a 120 BPM, meio segundo. O metrônomo do app (o ícone no canto) faz essas batidas para você.

Cada batida é um **tempo**. A primeira habilidade de qualquer músico não é velocidade: é tocar exatamente em cima do tempo, sem correr e sem atrasar.`,
    },
    {
      kind: 'text',
      title: 'As três primeiras figuras',
      body: `A partitura diz quanto tempo cada nota dura usando **figuras**:

- **Semínima**: cabeça cheia com haste. Vale **1 tempo**.
- **Mínima**: cabeça vazia com haste. Vale **2 tempos**.
- **Semibreve**: só a cabeça vazia, sem haste. Vale **4 tempos**.

Cada figura vale o dobro da anterior. Ao tocar uma mínima, você aperta a tecla no tempo 1 e **segura** durante o tempo 2; a próxima nota entra no tempo 3.

Conte em voz alta enquanto toca: "**um, dois, três, quatro**". Parece bobo, mas contar em voz alta é o jeito mais rápido de o pulso virar automático.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'encurtar as notas longas',
      body: 'O erro mais comum é soltar a mínima e a semibreve cedo e já correr para a próxima nota. Segure até o tempo seguinte chegar: o silêncio antes da hora também é erro de ritmo.',
    },
    {
      kind: 'example',
      title: 'Ouvir cada figura com o pulso',
      steps: [
        { say: 'Quatro **semínimas**: uma nota em cada tempo. Conte junto: 1, 2, 3, 4.', play: { bpm: 72, steps: [60, 60, 60, 60].map((m) => ({ midis: [m], beats: 1 })) } },
        { say: 'Duas **mínimas**: nota no 1 (segura no 2), nota no 3 (segura no 4).', play: { bpm: 72, steps: [{ midis: [60], beats: 2 }, { midis: [60], beats: 2 }] } },
        { say: 'Uma **semibreve**: toca no 1 e segura os quatro tempos.', play: { bpm: 72, steps: [{ midis: [60], beats: 4 }] } },
        { say: 'Misturando: semínima, semínima, mínima.', play: { bpm: 72, steps: [{ midis: [60], beats: 1 }, { midis: [60], beats: 1 }, { midis: [60], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l02-quiz', exercise: { kind: 'quiz', title: 'Quanto vale cada figura', how: 'Responda antes de tocar.', questions: FIGURES.slice(0, 5).map((f) => ({ q: f.q, options: f.options, answer: f.answer, why: f.why ?? '' })), pass: { accuracy: 0.8 } } },
    {
      kind: 'exercise',
      id: 'l02-ritmo',
      exercise: quickTimed('Ritmo em qualquer tecla', 'Dois compassos sorteados a 60 BPM. Toque qualquer tecla no início de cada figura e segure pela duração dela. Faça 2 passadas boas seguidas.', randomRhythm(RHYTHMS_A, 2, 60), { reps: 2 }),
    },
    {
      kind: 'exercise',
      id: 'l02-escada',
      exercise: quickTimed('Quatro compassos, subindo o andamento', 'Cada passada boa sobe 4 BPM, de 60 até 72.', randomRhythm(RHYTHMS_A, 4, 60), { ladder: { from: 60, to: 72, step: 4 } }),
    },
  ],
  review: [choice(FIGURES, 'figuras')],
  checkpoint: [
    quickTimed('Oito compassos no tempo', 'Ritmo sorteado de 8 compassos a 66 BPM, sem dicas. Meta: 85% das notas na janela de ±100 ms.', randomRhythm(RHYTHMS_A, 8, 66)),
  ],
  exit: [choice(FIGURES, 'figuras')],
};

const l03: Lesson = {
  n: 3,
  id: 'l03',
  title: 'Posição de Dó, legato e staccato',
  minutes: 60,
  objectives: [
    'Consigo colocar as duas mãos na posição de Dó sem olhar a partitura.',
    'Consigo tocar o pentacorde ligado (legato) e solto (staccato).',
    'Consigo tocar o pentacorde da mão direita a 72 BPM.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Posição fixa de cinco dedos',
      body: `Na **posição de Dó**, cada dedo fica sobre uma tecla e não sai dela:

- **Mão direita**: polegar (1) no Dó central. Os dedos 1, 2, 3, 4, 5 ficam sobre Dó, Ré, Mi, Fá, Sol.
- **Mão esquerda**: mínimo (5) no Dó uma oitava abaixo do central (Dó3). Os dedos 5, 4, 3, 2, 1 ficam sobre Dó, Ré, Mi, Fá, Sol.

Cinco notas vizinhas assim formam um **pentacorde**. Com a mão parada, você para de procurar tecla e passa a prestar atenção no som e no ritmo.`,
    },
    {
      kind: 'keys',
      low: 48,
      high: 72,
      lit: [48, 50, 52, 53, 55, 60, 62, 64, 65, 67],
      labels: { 48: '5', 50: '4', 52: '3', 53: '2', 55: '1', 60: '1', 62: '2', 64: '3', 65: '4', 67: '5' },
      caption: 'Posição de Dó: os números são os dedos. Mão esquerda de Dó3 a Sol3, mão direita de Dó4 a Sol4.',
    },
    {
      kind: 'text',
      title: 'Legato e staccato',
      body: `Existem dois jeitos básicos de ligar uma nota à outra:

- **Legato** (ligado): a nota anterior solta **no exato momento** em que a próxima desce. Não sobra buraco de silêncio, e também não ficam duas notas soando juntas por muito tempo. O som é uma linha contínua.
- **Staccato** (destacado): a nota é curta. Toque e solte logo, como se a tecla estivesse quente. Na partitura, staccato é um ponto em cima ou embaixo da nota.

O app mede os dois pelo momento em que você **solta** cada tecla.`,
    },
    {
      kind: 'example',
      title: 'O mesmo pentacorde, ligado e destacado',
      steps: [
        { say: 'Legato: cada nota encosta na próxima.', play: { bpm: 72, steps: [60, 62, 64, 65, 67, 65, 64, 62, 60].map((m, i) => ({ midis: [m], beats: i === 8 ? 2 : 1 })) } },
        { say: 'Staccato: cada nota dura metade do tempo, com silêncio entre elas.', play: { bpm: 72, steps: [60, 62, 64, 65, 67, 65, 64, 62, 60].flatMap((m) => [{ midis: [m], beats: 0.4 }, { midis: [], beats: 0.6 }]) } },
      ],
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'peso, não força',
      body: 'Deixe o braço "pendurado" na ponta do dedo que está tocando, e passe esse peso para o próximo dedo como quem anda: um pé só sai do chão quando o outro já apoiou. É assim que o legato fica natural.',
    },
    { kind: 'exercise', id: 'l03-dedos', exercise: { kind: 'items', title: 'Dedo e nota', how: 'O app diz a mão e o dedo; toque a nota que fica sob ele na posição de Dó.', gen: fingerNote({ hands: ['direita', 'esquerda'] }), count: 12, low: 48, high: 72, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l03-legato-md', exercise: quickTimed('Pentacorde legato, mão direita', 'Sobe e desce a 60 BPM, sem buraco entre as notas. Duas passadas boas.', () => melodyTask(PENTA_R, { bpm: 60 }), { reps: 2, articulation: 'legato' }) },
    { kind: 'exercise', id: 'l03-staccato-md', exercise: quickTimed('Pentacorde staccato, mão direita', 'O mesmo trecho, cada nota curta.', () => melodyTask(PENTA_R, { bpm: 60 }), { reps: 2, articulation: 'staccato' }) },
    { kind: 'exercise', id: 'l03-legato-me', exercise: quickTimed('Pentacorde legato, mão esquerda', 'Agora a mão esquerda, dedo 5 no Dó3.', () => melodyTask(PENTA_L, { bpm: 60, clef: 'bass' }), { reps: 2, articulation: 'legato' }) },
    { kind: 'exercise', id: 'l03-escada', exercise: quickTimed('Escada de andamento', 'Desenhos sorteados na posição de Dó, de 60 a 80 BPM.', (rng) => melodyTask(pick(rng, PENTA_PATTERNS_R), { bpm: 60 }), { ladder: { from: 60, to: 80, step: 4 } }) },
    { kind: 'exercise', id: 'l03-quiz', exercise: { kind: 'quiz', title: 'Legato ou staccato', how: 'Duas perguntas rápidas.', questions: ARTIC.map((q) => ({ ...q, why: q.why ?? '' })), pass: { accuracy: 1 } } },
  ],
  review: [fingerNote({ hands: ['direita', 'esquerda'] }), choice(ARTIC, 'articulacao')],
  checkpoint: [
    quickTimed('Legato a 72 BPM', 'Pentacorde da mão direita, sem dicas. 85% no tempo e 90% das passagens ligadas.', () => melodyTask(PENTA_R, { bpm: 72 }), { articulation: 'legato' }),
    quickTimed('Staccato a 72 BPM', 'O mesmo, com notas curtas.', () => melodyTask(PENTA_R, { bpm: 72 }), { articulation: 'staccato' }),
    quickTimed('Mão esquerda a 66 BPM', 'Pentacorde da mão esquerda, legato.', () => melodyTask(PENTA_L, { bpm: 66, clef: 'bass' }), { articulation: 'legato' }),
  ],
  exit: [fingerNote({ hands: ['direita', 'esquerda'] }), choice(ARTIC, 'articulacao')],
};

const l04: Lesson = {
  n: 4,
  id: 'l04',
  title: 'Pausas e improviso nas pretas',
  minutes: 60,
  objectives: [
    'Consigo contar pausas sem correr.',
    'Consigo repetir de ouvido motivos de 3 notas nas teclas pretas.',
    'Consigo improvisar 16 compassos nas pretas, com frases que respiram e terminam em casa.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O silêncio também se conta',
      body: `Toda figura tem uma **pausa** com o mesmo valor: pausa de semínima (1 tempo), de mínima (2 tempos) e de semibreve (4 tempos, ou o compasso inteiro). Na pausa você **solta a tecla e continua contando**. O pulso não para porque o som parou.

Na partitura, a pausa de mínima fica "sentada" sobre a 3ª linha e a de semibreve fica "pendurada" na 4ª. A de semínima parece um raio vertical.`,
    },
    { kind: 'exercise', id: 'l04-pausas', exercise: quickTimed('Ritmo com pausas', 'Dois compassos sorteados a 66 BPM. Nas pausas, mão para cima e conte.', randomRhythm(RHYTHMS_REST, 2, 66), { reps: 2 }) },
    {
      kind: 'text',
      title: 'Pergunta e resposta',
      body: `Música é feita de **frases**, como a fala. Um jeito simples de criar frases é o de **pergunta e resposta**: uma frase de 2 compassos que termina "suspensa", como se pedisse continuação, e outra que responde e termina "em casa", com sensação de fim.

Entre uma frase e outra, **respire**: deixe uma pausa. Quem toca sem parar soa como quem fala sem pontuação.`,
    },
    {
      kind: 'text',
      title: 'A escala de casa: as cinco pretas',
      body: `As cinco teclas pretas formam uma escala de cinco notas. Qualquer combinação delas soa bem junta (o nome técnico, **pentatônica**, vem mais adiante). Por isso elas são o lugar perfeito para improvisar sem medo de errar.

Neste exercício a "casa" é o **Fá♯**, a preta logo à esquerda do grupo de 3 (a primeira das três). Terminar uma frase nele soa como ponto final; terminar em outra nota soa como vírgula.`,
    },
    {
      kind: 'example',
      title: 'Uma pergunta e uma resposta',
      steps: [
        { say: 'Pergunta: sobe e para no alto, sem resolver.', play: { bpm: 80, steps: [{ midis: [n('F#4')], beats: 1 }, { midis: [n('G#4')], beats: 1 }, { midis: [n('A#4')], beats: 1 }, { midis: [n('C#5')], beats: 3 }, { midis: [], beats: 2 }] } },
        { say: 'Resposta: desce e chega no Fá♯, a casa.', play: { bpm: 80, steps: [{ midis: [n('C#5')], beats: 1 }, { midis: [n('A#4')], beats: 1 }, { midis: [n('G#4')], beats: 1 }, { midis: [n('F#4')], beats: 3 }, { midis: [], beats: 2 }] }, keys: [n('F#4')] },
      ],
    },
    { kind: 'exercise', id: 'l04-eco', exercise: { kind: 'items', title: 'Eco nas pretas', how: 'O app toca 3 notas; repita nas mesmas teclas.', gen: echo({ motifs: blackMotifs }), count: 10, low: 60, high: 76, labels: 'off', pass: { accuracy: 0.8 } } },
    {
      kind: 'exercise',
      id: 'l04-improviso',
      exercise: { kind: 'improv', title: 'Improviso sobre a base', how: '8 compassos a 80 BPM só nas teclas pretas. Faça frases de 2 compassos, deixe pausas e termine no Fá♯.', pcs: BLACK_PCS, bars: 8, bpm: 80, beatsPerBar: 4, backing: [[n('F#2'), n('C#3')], [n('F#2'), n('C#3')], [n('D#2'), n('A#2')], [n('F#2'), n('C#3')]], low: 54, high: 84, pass: { inSet: 0.95, restsPer4: 2, endOn: [6] } },
    },
  ],
  review: [echo({ motifs: blackMotifs }), choice(RESTS, 'pausas')],
  checkpoint: [
    quickTimed('Pausas no tempo', 'Quatro compassos sorteados com pausas, a 66 BPM.', randomRhythm(RHYTHMS_REST, 4, 66)),
    { kind: 'items', title: 'Eco nas pretas', how: '10 motivos novos. Meta: 8 de 10.', gen: echo({ motifs: blackMotifs }), count: 10, low: 60, high: 76, labels: 'off', pass: { accuracy: 0.8 } },
    { kind: 'improv', title: 'Improviso de 16 compassos', how: 'Só pretas, pelo menos 2 pausas a cada 4 compassos, final no Fá♯.', pcs: BLACK_PCS, bars: 16, bpm: 80, beatsPerBar: 4, backing: [[n('F#2'), n('C#3')], [n('F#2'), n('C#3')], [n('D#2'), n('A#2')], [n('F#2'), n('C#3')]], low: 54, high: 84, pass: { inSet: 0.95, restsPer4: 2, endOn: [6] } },
  ],
  exit: [choice(RESTS, 'pausas'), echo({ motifs: blackMotifs.slice(0, 4) })],
};

const l05: Lesson = {
  n: 5,
  id: 'l05',
  title: 'Ouvido 1: direção e casa',
  minutes: 60,
  objectives: [
    'Consigo dizer se uma melodia subiu ou desceu e se andou por grau conjunto ou por salto.',
    'Consigo repetir de ouvido 3 notas na posição de Dó.',
    'Consigo reconhecer a casa (1), o 3 e o 5 depois de uma cadência.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Agudo, grave e o caminho da melodia',
      body: `Ouvir bem começa pelo mais simples: a melodia **subiu** (ficou mais aguda, para a direita do teclado) ou **desceu** (mais grave, para a esquerda)?

Depois, o tamanho do passo. **Grau conjunto** é ir para a nota vizinha (Dó → Ré). **Salto** é pular pelo menos uma (Dó → Mi). Melodias cantáveis andam quase sempre por grau conjunto, com saltos de vez em quando para dar energia.`,
    },
    { kind: 'exercise', id: 'l05-direcao', exercise: { kind: 'items', title: 'Subiu ou desceu', how: 'Ouça as duas notas e escolha.', gen: direction({ low: 55, high: 79 }), count: 10, low: 55, high: 79, labels: 'off', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l05-passo', exercise: { kind: 'items', title: 'Grau conjunto ou salto', how: 'Ouça e escolha.', gen: stepOrLeap({ from: [60, 62, 64, 65, 67, 69] }), count: 10, low: 55, high: 79, labels: 'off', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'A sensação de casa',
      body: `Numa música, uma nota soa como **repouso**: a **tônica**, ou "casa". Em Dó maior, a casa é o Dó. As outras notas parecem puxar de volta para ela.

Para ouvir a casa, o app toca antes uma **cadência**: quatro acordes que deixam claro qual é a tônica. Depois toca uma nota, e você diz qual é pelo papel dela: **1** (a casa), **3** (o Mi, a nota que dá a cor alegre do maior) ou **5** (o Sol, estável mas aberto, pedindo para voltar).

Ouvir pela função, e não pelo nome absoluto, é o jeito que músicos práticos reconhecem notas, e funciona em qualquer tom.`,
    },
    {
      kind: 'example',
      title: 'A cadência e as três notas',
      steps: [
        { say: 'A cadência em Dó maior: depois dela, o Dó soa como casa.', play: { bpm: 96, steps: [{ midis: [48, 60, 64, 67], beats: 1 }, { midis: [53, 60, 65, 69], beats: 1 }, { midis: [55, 59, 62, 67], beats: 1 }, { midis: [48, 60, 64, 67], beats: 2 }] } },
        { say: 'O **1**: Dó. Repouso total.', keys: [60], play: { bpm: 80, steps: [{ midis: [60], beats: 2 }] } },
        { say: 'O **3**: Mi. Repousa, mas com cor.', keys: [64], play: { bpm: 80, steps: [{ midis: [64], beats: 2 }] } },
        { say: 'O **5**: Sol. Estável, mas aberto, como uma pergunta.', keys: [67], play: { bpm: 80, steps: [{ midis: [67], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l05-eco', exercise: { kind: 'items', title: 'Eco em Dó', how: 'O app toca 3 notas da posição de Dó; repita.', gen: echo({ motifs: cMotifs }), count: 10, low: 55, high: 72, labels: 'fade', pass: { accuracy: 0.8 } } },
    { kind: 'exercise', id: 'l05-graus', exercise: { kind: 'items', title: '1, 3 ou 5', how: 'Depois da cadência, toque a nota que você ouviu, em qualquer oitava.', gen: degreeByEar({ tonic: 60, degrees: [1, 3, 5] }), count: 12, low: 55, high: 79, labels: 'off', pass: { accuracy: 0.8 } } },
  ],
  review: [direction({ low: 55, high: 79 }), stepOrLeap({ from: [60, 62, 64, 65, 67] }), degreeByEar({ tonic: 60, degrees: [1, 3, 5] }), echo({ motifs: cMotifs })],
  checkpoint: [
    {
      kind: 'items',
      title: 'Ouvido misturado',
      how: '15 perguntas misturadas: direção, passo, eco e graus. Meta: 85%.',
      gen: mix([direction({ low: 55, high: 79 }), stepOrLeap({ from: [60, 62, 64, 65, 67] }), echo({ motifs: cMotifs }), degreeByEar({ tonic: 60, degrees: [1, 3, 5] })]),
      count: 15,
      low: 55,
      high: 79,
      labels: 'off',
      pass: { accuracy: 0.85 },
    },
  ],
  exit: [degreeByEar({ tonic: 60, degrees: [1, 3, 5] }), direction({ low: 55, high: 79 }), echo({ motifs: cMotifs })],
};

// Ode à Alegria (Beethoven, 9ª sinfonia), versão de método na posição de Dó.
const ODE_A = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4 D4 D4:2';
const ODE_A2 = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4 C4 C4:2';

const l06: Lesson = {
  n: 6,
  id: 'l06',
  title: 'Compasso e mãos alternadas',
  minutes: 60,
  objectives: [
    'Consigo ler o compasso 4/4 e sentir o tempo forte.',
    'Consigo segurar uma nota longa numa mão enquanto a outra toca semínimas.',
    'Consigo tocar os 8 primeiros compassos da Ode à Alegria a 72 BPM.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O compasso 4/4',
      body: `A música se organiza em **compassos**: grupos de tempos separados por **barras** verticais na partitura. A **fórmula de compasso**, no começo da música, diz como contar:

- O número de cima é **quantos tempos** tem cada compasso.
- O de baixo diz **qual figura vale um tempo** (4 = semínima).

No **4/4**, o mais comum de todos, são 4 tempos por compasso e a semínima vale 1. O **tempo 1** é o mais forte, o 3 é meio-forte, o 2 e o 4 são fracos. Sentir o 1 é o que faz a música "andar".`,
    },
    {
      kind: 'text',
      title: 'Uma mão segura, a outra anda',
      body: `Tocar com as duas mãos começa assim: uma mão segura uma nota longa enquanto a outra toca a melodia. Na posição de Dó, a mão esquerda toca um **Dó3 de semibreve** no tempo 1 de cada compasso, e a mão direita toca semínimas.

O truque é **contar antes de tocar**: diga "1, 2, 3, 4" uma vez em voz alta e só entre no próximo 1. As duas mãos descem juntas no tempo 1; depois a esquerda só segura.`,
    },
    { kind: 'exercise', id: 'l06-duas', exercise: quickTimed('Semibreve na esquerda, semínimas na direita', 'A pauta mostra a mão direita. A esquerda toca Dó3 no tempo 1 de cada compasso e segura.', (rng) => twoHandTask(pick(rng, PENTA_PATTERNS_R), 'C3:4 | C3:4 | C3:4', { bpm: 66, caption: 'Mão esquerda: Dó3 de semibreve em cada compasso.' }), { reps: 2 }) },
    {
      kind: 'example',
      title: 'Ode à Alegria, primeira frase',
      steps: [
        { say: 'A melodia mais famosa da 9ª sinfonia de Beethoven cabe inteira na posição de Dó. Ouça a primeira frase (4 compassos). Repare que ela termina no **Ré**: soa como pergunta.', play: { bpm: 80, steps: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64].map((m) => ({ midis: [m], beats: 1 })).concat([{ midis: [64], beats: 1 }, { midis: [62], beats: 1 }, { midis: [62], beats: 2 }]) } },
        { say: 'A segunda frase começa igual e termina no **Dó**: a resposta, em casa.', play: { bpm: 80, steps: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64].map((m) => ({ midis: [m], beats: 1 })).concat([{ midis: [62], beats: 1 }, { midis: [60], beats: 1 }, { midis: [60], beats: 2 }]) } },
      ],
    },
    { kind: 'exercise', id: 'l06-ode', exercise: quickTimed('Ode à Alegria, 8 compassos', 'Mão direita, a 60 BPM. Duas passadas boas.', () => melodyTask(`${ODE_A} | ${ODE_A2}`, { bpm: 60 }), { reps: 2 }) },
    { kind: 'song', songId: 'u01-ode-8', why: 'Os mesmos 8 compassos com a partitura de verdade, a cascata e o modo Estudar (o app espera cada nota). Bom para repetir até soltar.' },
  ],
  review: [choice(METER, 'compasso'), fingerNote({ hands: ['direita'] })],
  checkpoint: [
    quickTimed('Ode à Alegria a 72 BPM', '8 compassos, mão direita, sem dicas. Meta: 90% das notas, ±80 ms.', () => melodyTask(`${ODE_A} | ${ODE_A2}`, { bpm: 72 }), { window: 80, pass: { accuracy: 0.9 } }),
    quickTimed('Duas mãos a 72 BPM', 'Semibreve na esquerda e semínimas na direita.', (rng) => twoHandTask(pick(rng, PENTA_PATTERNS_R), 'C3:4 | C3:4 | C3:4', { bpm: 72, caption: 'Mão esquerda: Dó3 em cada compasso.' })),
  ],
  exit: [choice(METER, 'compasso'), fingerNote({ hands: ['direita', 'esquerda'] })],
};

const dynamicsAsks = (count: number) => (rng: Rng) =>
  Array.from({ length: count }, () => ({ midi: pick(rng, [60, 62, 64, 65, 67]), level: pick(rng, ['p', 'mf', 'f'] as const) }));

const l07: Lesson = {
  n: 7,
  id: 'l07',
  title: 'Dinâmica básica',
  minutes: 60,
  objectives: [
    'Consigo tocar p, mf e f quando pedido.',
    'Consigo fazer um crescendo ao longo do pentacorde.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Leve, médio e forte',
      body: `**Dinâmica** é o volume. Os sinais vêm do italiano:

- **p** (piano): leve.
- **mf** (mezzo forte): médio.
- **f** (forte): forte.

Um **crescendo** (sinal que abre: <) vai aumentando aos poucos; um **diminuendo** (sinal que fecha: >) vai diminuindo.

No piano, o volume nasce da **velocidade com que a tecla desce**, não de quanto você aperta depois. Para o forte, deixe mais peso do braço cair, de um pouco mais alto. Para o leve, chegue perto da tecla e desça devagar. Apertar o fundo da tecla depois do som não muda nada e só cria tensão.`,
    },
    {
      kind: 'example',
      title: 'O mesmo trecho em três volumes',
      steps: [
        { say: '**p**: leve.', play: { bpm: 80, steps: [60, 62, 64, 65, 67].map((m) => ({ midis: [m], beats: 1, velocity: 0.25 })) } },
        { say: '**mf**: médio.', play: { bpm: 80, steps: [60, 62, 64, 65, 67].map((m) => ({ midis: [m], beats: 1, velocity: 0.55 })) } },
        { say: '**f**: forte.', play: { bpm: 80, steps: [60, 62, 64, 65, 67].map((m) => ({ midis: [m], beats: 1, velocity: 0.95 })) } },
        { say: '**Crescendo**: de p até f, de nota em nota.', play: { bpm: 80, steps: [60, 62, 64, 65, 67].map((m, i) => ({ midis: [m], beats: 1, velocity: 0.2 + i * 0.19 })) } },
      ],
    },
    { kind: 'callout', tone: 'saude', title: 'forte sem dor', body: 'Se o forte machuca o punho ou o antebraço, a força está vindo dos dedos. Solte o ombro, deixe o braço cair e o dedo só transmitir o peso. Pare se doer.' },
    { kind: 'exercise', id: 'l07-faixas', exercise: { kind: 'dynamics', title: 'Na faixa pedida', how: 'O app pede uma nota e um volume. Precisa do piano conectado e calibrado (lição 1).', gen: dynamicsAsks(9), low: 48, high: 72, pass: { accuracy: 0.75 } } },
    { kind: 'exercise', id: 'l07-cresc', exercise: quickTimed('Crescendo no pentacorde', 'Suba o pentacorde da mão direita de p até f, cada nota um pouco mais forte.', () => melodyTask('C4 D4 E4 F4 | G4:4', { bpm: 66 }), { reps: 2, dynamics: 'crescendo' }) },
    { kind: 'exercise', id: 'l07-dim', exercise: quickTimed('Diminuendo na descida', 'Desça de f até p.', () => melodyTask('G4 F4 E4 D4 | C4:4', { bpm: 66 }), { reps: 2, dynamics: 'diminuendo' }) },
    { kind: 'exercise', id: 'l07-quiz', exercise: { kind: 'quiz', title: 'Sinais de dinâmica', how: 'Cinco perguntas rápidas.', questions: DYNAMICS.map((q) => ({ ...q, why: q.why ?? '' })), pass: { accuracy: 0.8 } } },
  ],
  review: [choice(DYNAMICS, 'dinamica')],
  checkpoint: [
    { kind: 'dynamics', title: 'Faixas de volume', how: '12 pedidos sorteados. Meta: 85% na faixa.', gen: dynamicsAsks(12), low: 48, high: 72, pass: { accuracy: 0.85 } },
    quickTimed('Crescendo', 'Pentacorde subindo de p até f, a 66 BPM.', () => melodyTask('C4 D4 E4 F4 | G4:4', { bpm: 66 }), { dynamics: 'crescendo' }),
  ],
  exit: [choice(DYNAMICS, 'dinamica')],
};

const ostinato = [[n('F#2'), n('C#3')], [n('F#2'), n('C#3')], [n('F#2'), n('C#3')], [n('F#2'), n('C#3')]];

const l08: Lesson = {
  n: 8,
  id: 'l08',
  title: 'Checkpoint da unidade e projeto nas pretas',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint misto da unidade 1, sem dicas.',
    'Consigo tocar uma peça própria de 8 compassos nas pretas, com ostinato na mão esquerda.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que você já sabe',
      body: `Em sete lições você aprendeu a se localizar no teclado, a manter o pulso, a ler as três primeiras figuras e as pausas, a tocar na posição de Dó com legato e staccato, a reconhecer a casa de ouvido, a contar o 4/4 e a controlar o volume.

Hoje é dia de juntar tudo. O checkpoint mistura as habilidades das lições 1 a 7, com perguntas novas e sem dicas. Misturar é proposital: lembrar de algo no meio de outras coisas é mais difícil, e é exatamente isso que fixa.`,
    },
    {
      kind: 'text',
      title: 'Ostinato: a mão que não para',
      body: `Um **ostinato** é um desenho curto que se repete sem parar, por baixo da melodia. É a base de muita música, do minimalismo às trilhas de cinema.

No projeto, a mão esquerda toca um ostinato de duas notas nas pretas, **Fá♯2 e Dó♯3**, alternando em semínimas ou mínimas. Por cima, a mão direita faz pergunta e resposta nas pretas, como na lição 4, e termina no Fá♯.

Comece só com a esquerda até ela ficar automática. Depois entre com a direita, devagar.`,
    },
    {
      kind: 'exercise',
      id: 'l08-ostinato',
      exercise: quickTimed('Só o ostinato', 'Fá♯2 e Dó♯3 alternando em semínimas, 4 compassos a 72 BPM.', () => melodyTask('F#2 C#3 F#2 C#3 | F#2 C#3 F#2 C#3 | F#2 C#3 F#2 C#3 | F#2:4', { bpm: 72, clef: 'bass' }), { reps: 2 }),
    },
  ],
  review: [findWhite, fingerNote({ hands: ['direita', 'esquerda'] }), degreeByEar({ tonic: 60, degrees: [1, 3, 5] }), choice([...FIGURES, ...RESTS, ...METER, ...DYNAMICS])],
  checkpoint: [
    { kind: 'items', title: 'Teclado e ouvido', how: '16 perguntas misturadas das lições 1 a 7.', gen: mix([findWhite, middleC, fingerNote({ hands: ['direita', 'esquerda'] }), degreeByEar({ tonic: 60, degrees: [1, 3, 5] }), echo({ motifs: cMotifs }), choice([...FIGURES, ...RESTS, ...METER, ...DYNAMICS])]), count: 16, low: LOW, high: HIGH, labels: 'off', pass: { accuracy: 0.85 } },
    quickTimed('Ritmo com pausas', '4 compassos sorteados a 72 BPM.', randomRhythm([...RHYTHMS_A, ...RHYTHMS_REST], 4, 72)),
    quickTimed('Pentacorde legato', 'Desenho sorteado na posição de Dó, a 72 BPM.', (rng) => melodyTask(pick(rng, PENTA_PATTERNS_R), { bpm: 72 }), { articulation: 'legato' }),
  ],
  project: {
    title: 'Pergunta e resposta nas pretas',
    brief: `Crie e toque uma peça de **8 compassos** a 72 BPM: ostinato de Fá♯2 e Dó♯3 na mão esquerda o tempo todo, e quatro frases de 2 compassos na mão direita, só nas pretas, alternando pergunta e resposta. A última frase termina no Fá♯.`,
    steps: [
      'Toque o ostinato sozinho até ele ficar automático.',
      'Invente a primeira pergunta (2 compassos) e a resposta, só com a mão direita.',
      'Junte as mãos devagar, a 60 BPM, e suba para 72 BPM.',
      'Toque a peça inteira no exercício abaixo: a base marca o compasso, você toca as duas mãos.',
      'Se quiser guardar, grave com o celular.',
    ],
    rubric: ['O pulso ficou estável do começo ao fim.', 'Dá para ouvir as perguntas e as respostas.', 'A peça termina no Fá♯, com sensação de fim.', 'Os ombros e os punhos ficaram soltos.'],
    exercise: { kind: 'improv', title: 'Sua peça, 8 compassos', how: 'Duas mãos, só nas pretas. A base toca o Fá♯ grave por baixo.', pcs: BLACK_PCS, bars: 8, bpm: 72, beatsPerBar: 4, backing: ostinato.map(() => [n('F#1')]), low: 36, high: 84, pass: { inSet: 0.95, restsPer4: 0, endOn: [6] } },
  },
  exit: [findWhite, degreeByEar({ tonic: 60, degrees: [1, 3, 5] }), choice([...FIGURES, ...RESTS, ...METER, ...DYNAMICS])],
};

// ---------- músicas ----------

const odeFull: SongSpec = {
  id: 'u01-ode',
  title: 'Ode à Alegria',
  composer: 'Ludwig van Beethoven',
  arrangement: 'versão de método na posição de Dó, com o Sol grave na mão esquerda',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: `${ODE_A} | ${ODE_A2} | D4 D4 E4 C4 | D4 F4 E4 C4 | D4 F4 E4 D4 | C4 D4 r:2 | ${ODE_A2}`,
  left: 'r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:2 G3:2 | r:4 | r:4 | r:4 | r:4',
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const ode8: SongSpec = {
  id: 'u01-ode-8',
  title: 'Ode à Alegria, 8 primeiros compassos',
  composer: 'Ludwig van Beethoven',
  arrangement: 'versão de método, mão direita',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: `${ODE_A} | ${ODE_A2}`,
  hands: 'direita',
  pass: { accuracy: 0.9 },
};

const unit: Unit = {
  n: 1,
  id: 'u01',
  title: 'Teclado, pulso e postura',
  goal: 'Achar qualquer nota sem contar, manter o pulso, tocar na posição de Dó com legato, staccato e dinâmica, e reconhecer a casa de ouvido.',
  technique: 'Pentacordes da posição de Dó, legato e staccato, em semínimas, subindo de 60 rumo a 100 BPM (referência: RCM Preparatory A). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l01, l02, l03, l04, l05, l06, l07, l08],
  songs: [odeFull, ode8],
  final: {
    songId: 'u01-ode',
    brief: 'A melodia inteira (16 compassos) junta o que a unidade ensinou: posição de Dó, legato, pulso estável em 4/4, mínimas no fim das frases e uma pergunta e resposta clara. No compasso 12, a melodia desce até o Sol grave: quem toca é o polegar da mão esquerda, na posição de Dó dela.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [findWhite, findAllWhite, middleC, ...l05.review];
