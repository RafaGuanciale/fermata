// Unidade 9 — Leitura clássica intermediária, textura e polifonia (lições 66 a 73). Projeto final: Minueto em Sol, BWV Anh. 114.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { chordSequence, choice, mix, nonChordTones, type ChoiceQuestion, type StrangeKind } from '../gens';
import { pick } from '../music';
import { melodyTask, sightReadingTwoHands, twoHandTask } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

// ---------- escrita ----------

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

const items = (title: string, how: string, gen: ItemGen, count: number, low: Midi, high: Midi, accuracy = 0.85, labels: 'on' | 'fade' | 'off' = 'fade'): Exercise => ({
  kind: 'items', title, how, gen, count, low, high, labels, pass: { accuracy },
});

// ---------- perguntas ----------

const STRANGE_Q: ChoiceQuestion[] = [
  { q: 'Nota de passagem é…', options: ['Uma nota fora do acorde entre duas notas do acorde, por grau conjunto, na mesma direção', 'Uma nota que sai e volta para a mesma nota', 'Uma nota que chega antes do acorde'], answer: 0, why: 'Mi–Fá–Sol sobre C: o Fá passa.' },
  { q: 'Bordadura é…', options: ['Sai de uma nota do acorde por grau conjunto e volta para ela', 'Uma nota longa no baixo', 'Uma nota que salta'], answer: 0, why: 'Mi–Fá–Mi sobre C: o Fá "borda" o Mi.' },
  { q: 'Apojatura é…', options: ['Nota estranha no tempo forte, que resolve por grau conjunto', 'Nota estranha no tempo fraco', 'Uma nota do acorde repetida'], answer: 0, why: 'O choque cai no tempo forte e se resolve logo: um "suspiro".' },
  { q: 'Retardo é…', options: ['Uma nota do acorde anterior que fica presa no novo e resolve descendo', 'Uma nota que chega antes do acorde', 'Um acorde lento'], answer: 0, why: 'Preparação, choque, resolução: como o sus4 → 3.' },
  { q: 'Antecipação é…', options: ['A nota do próximo acorde tocada um pouco antes dele', 'Uma nota atrasada', 'Uma bordadura dupla'], answer: 0, why: 'Muito comum no fim das frases: o Dó chega antes do acorde de Dó.' },
  { q: 'Nota pedal é…', options: ['Uma nota longa (em geral no baixo) que fica enquanto os acordes mudam por cima', 'O pedal de sustentação', 'A nota mais aguda'], answer: 0, why: 'Como o Dó repetido no baixo do Prelúdio de Bach.' },
];

const ALBERTI_Q: ChoiceQuestion[] = [
  { q: 'O baixo de Alberti em Dó é…', options: ['Dó, Sol, Mi, Sol', 'Dó, Mi, Sol, Dó', 'Dó, Sol, Dó, Sol'], answer: 0, why: 'Grave, agudo, meio, agudo: 1-5-3-5.' },
  { q: 'Na melodia acompanhada, a mão que deve soar mais é…', options: ['A da melodia', 'A do acompanhamento', 'As duas iguais'], answer: 0, why: 'O acompanhamento tem mais notas: precisa ser mais leve para a melodia aparecer.' },
  { q: 'Para o Alberti soar leve, o mais importante é…', options: ['Dedos perto das teclas e o polegar sem bater', 'Levantar bem os dedos', 'Usar o pedal o tempo todo'], answer: 0, why: 'A mão fica parada; os dedos só transmitem o peso, leve.' },
];

const FOUR_Q: ChoiceQuestion[] = [
  { q: 'Quintas paralelas acontecem quando…', options: ['Duas vozes a uma 5ª justa se movem para outra 5ª justa', 'Duas vozes ficam paradas', 'Uma voz salta uma 5ª'], answer: 0, why: 'Dó–Sol → Ré–Lá: as duas vozes "grudam" e perdem a independência.' },
  { q: 'Movimento contrário é…', options: ['Uma voz sobe e a outra desce', 'As duas sobem', 'Uma fica parada'], answer: 0, why: 'É o melhor remédio contra paralelas.' },
  { q: 'Movimento oblíquo é…', options: ['Uma voz fica e a outra se move', 'As duas se movem na mesma direção', 'As duas se cruzam'], answer: 0, why: 'Notas comuns parados = movimento oblíquo.' },
  { q: 'No "estilo teclado" a quatro vozes…', options: ['O baixo fica na esquerda e as três outras vozes na direita', 'Cada mão toca duas vozes', 'Só a direita toca'], answer: 0, why: 'A direita conduz como na lição 44; a esquerda faz o baixo.' },
  { q: 'Qual nota se dobra (aparece duas vezes) num acorde de 4 vozes em posição fundamental?', options: ['De preferência a fundamental', 'A 3ª', 'A sensível'], answer: 0, why: 'A sensível nunca se dobra: ela tem um caminho só (subir para a tônica).' },
];

// ---------- notas estranhas ----------

const STRANGE: { chord: string; notes: Midi[]; strange: Midi[]; kind: StrangeKind }[] = [
  { chord: 'C', notes: [64, 65, 67, 64], strange: [65], kind: 'passagem' },
  { chord: 'C', notes: [67, 65, 64, 60], strange: [65], kind: 'passagem' },
  { chord: 'F', notes: [69, 70, 69, 65], strange: [70], kind: 'bordadura' },
  { chord: 'C', notes: [64, 62, 64, 67], strange: [62], kind: 'bordadura' },
  { chord: 'C', notes: [74, 72, 67, 64], strange: [74], kind: 'apojatura' },
  { chord: 'G', notes: [69, 67, 71, 74], strange: [69], kind: 'apojatura' },
  { chord: 'C', notes: [65, 64, 67, 72], strange: [65], kind: 'retardo' },
  { chord: 'G', notes: [62, 67, 71, 72], strange: [72], kind: 'antecipação' },
  { chord: 'C', notes: [64, 65, 60, 64], strange: [65], kind: 'escapada' },
  { chord: 'Am', notes: [69, 71, 72, 74, 76], strange: [71, 74], kind: 'passagem' },
];
const strangePlay = nonChordTones({ examples: STRANGE, ask: 'play' });
const strangeName = nonChordTones({ examples: STRANGE, ask: 'name' });

// ---------- lições ----------

const l66: Lesson = {
  n: 66,
  id: 'l66',
  title: 'Notas estranhas à harmonia',
  minutes: 60,
  objectives: [
    'Consigo achar, numa melodia sobre um acorde, as notas que ficam fora dele.',
    'Consigo dar nome a passagem, bordadura, apojatura, retardo, antecipação e escapada.',
    'Consigo ornamentar uma melodia simples com passagens e bordaduras.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Nem toda nota é do acorde',
      body: `Numa melodia, a maior parte das notas importantes pertence ao acorde de baixo. As outras se chamam **notas estranhas à harmonia** (ou notas melódicas). Elas não são erros: são o que dá movimento e expressão à melodia. O que as diferencia é **como chegam** e **como saem**.

Em tempo fraco, as mais comuns:

- **Passagem**: liga duas notas do acorde por grau conjunto, na mesma direção. Sobre C: Mi–**Fá**–Sol.
- **Bordadura**: sai de uma nota do acorde por grau conjunto e **volta** para ela. Sobre C: Mi–**Fá**–Mi, ou Mi–**Ré**–Mi.
- **Escapada**: sai por grau conjunto e volta por **salto** na direção contrária. Sobre C: Mi–**Fá**–Dó.
- **Antecipação**: a nota do **próximo** acorde chega um pouco antes dele. Sobre G, antes do C: Si–**Dó** (e o acorde de Dó vem logo depois).`,
    },
    {
      kind: 'text',
      title: 'No tempo forte: o choque expressivo',
      body: `Quando a nota estranha cai no **tempo forte**, o ouvido sente o choque, e é aí que a música "suspira":

- **Apojatura**: a nota estranha **chega por salto** (ou direto) no tempo forte e **resolve por grau conjunto**. Sobre C: **Ré**–Dó. É o gesto clássico de "lamento" em Mozart e Chopin.
- **Retardo**: uma nota do acorde **anterior** fica presa enquanto o acorde muda, cria o choque no tempo forte e **resolve descendo**. É o sus4 → 3 da lição 45, com nome antigo: preparação, choque, resolução.

E uma especial:

- **Nota pedal**: uma nota longa ou repetida (quase sempre no **baixo**) que fica parada enquanto os acordes mudam por cima. O Dó grave repetido nos primeiros compassos do Prelúdio de Bach funciona como um pedal.`,
    },
    {
      kind: 'example',
      title: 'Cinco notas estranhas sobre Dó',
      steps: [
        { say: 'Passagem: Mi–Fá–Sol. O Fá liga duas notas do acorde.', keys: [65], play: { bpm: 80, steps: [{ midis: [48, 55, 64], beats: 1 }, { midis: [65], beats: 1 }, { midis: [67], beats: 2 }] } },
        { say: 'Bordadura: Mi–Fá–Mi.', keys: [65], play: { bpm: 80, steps: [{ midis: [48, 55, 64], beats: 1 }, { midis: [65], beats: 1 }, { midis: [64], beats: 2 }] } },
        { say: 'Apojatura: Ré no tempo forte, resolvendo em Dó.', keys: [74], play: { bpm: 72, steps: [{ midis: [48, 55, 64, 74], beats: 2 }, { midis: [72], beats: 2 }] } },
        { say: 'Retardo: o Fá do acorde de G7 fica preso sobre o Dó e desce para Mi.', keys: [65], play: { bpm: 72, steps: [{ midis: [43, 59, 65], beats: 2 }, { midis: [48, 55, 65], beats: 2 }, { midis: [48, 55, 64], beats: 2 }] } },
        { say: 'Antecipação: sobre G, o Dó chega antes do acorde de Dó.', keys: [72], play: { bpm: 80, steps: [{ midis: [43, 59, 71], beats: 1.5 }, { midis: [72], beats: 0.5 }, { midis: [48, 55, 64, 72], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l66-tocar', exercise: items('Toque só as estranhas', 'A pauta mostra a melodia e a cifra mostra o acorde. Toque, em ordem, só as notas que ficam fora do acorde.', strangePlay, 10, 55, 84, 0.85) },
    { kind: 'exercise', id: 'l66-nomear', exercise: items('Que nota estranha é essa?', 'Veja como a nota estranha chega e sai, e escolha o nome.', strangeName, 10, 55, 84, 0.8, 'off') },
    {
      kind: 'text',
      title: 'Ornamentar uma melodia',
      body: `Agora o caminho inverso: pegar uma melodia "seca", só com notas do acorde, e enfeitá-la com notas estranhas, como fazem os compositores e os improvisadores.

Melodia seca sobre C – F – G – C: **Mi** (2 tempos) **Mi** | **Fá** (2) **Lá** | **Sol** (2) **Ré** | **Dó** (4).

Ornamentada: Mi–**Fá**–Sol–Mi | Fá–**Sol**–Lá–Fá | Sol–**Lá**–Sol–**Fá** | Mi... As notas em negrito são passagens e bordaduras, todas em **tempo fraco**: o desenho de cada compasso continua apoiado na nota do acorde no tempo 1.

Toque a versão ornamentada no exercício e depois invente a sua, com a regra: nota do acorde no tempo forte, estranhas só nos tempos fracos e por grau conjunto.`,
    },
    { kind: 'exercise', id: 'l66-ornamentar', exercise: quickTimed('A melodia ornamentada', 'Mão direita, semínimas, de 66 a 80 BPM.', () => melodyTask('E4 F4 G4 E4 | F4 G4 A4 F4 | G4 A4 G4 F4 | E4:4', { bpm: 66 }), { ladder: { from: 66, to: 80, step: 7 } }) },
    { kind: 'exercise', id: 'l66-quiz', exercise: quiz('Notas estranhas', 'Seis perguntas rápidas.', STRANGE_Q) },
  ],
  review: [strangePlay, strangeName, choice(STRANGE_Q, 'notas-estranhas')],
  checkpoint: [
    items('Identificação', '12 itens, tocando e nomeando, sem dicas. Meta: 85%.', mix([strangePlay, strangeName]), 12, 55, 84, 0.85, 'off'),
  ],
  exit: [strangeName, choice(STRANGE_Q, 'notas-estranhas')],
};

// Alberti em Dó, Fá e Sol (colcheias) e uma sonatina original sobre ele.
const ALB: Record<string, string> = { C: 'C3:0.5 G3:0.5 E3:0.5 G3:0.5', F: 'C3:0.5 A3:0.5 F3:0.5 A3:0.5', G: 'B2:0.5 G3:0.5 D3:0.5 G3:0.5', G7: 'B2:0.5 G3:0.5 F3:0.5 G3:0.5', Am: 'C3:0.5 A3:0.5 E3:0.5 A3:0.5', Dm: 'D3:0.5 A3:0.5 F3:0.5 A3:0.5' };
const albBar = (c: string) => `${ALB[c]} ${ALB[c]}`;
const SONATINA_R = 'C5:2 E5 C5 | G4:2 G4:2 | A4 F4 C5 A4 | G4:4 | C5:2 E5 C5 | D5 B4 G4 B4 | C5 E5 D5 B4 | C5:4';
const SONATINA_L = ['C', 'C', 'F', 'C', 'C', 'G', 'C', 'C'].map((c, i) => (i === 3 ? `${ALB.C} ${ALB.G7}` : i === 6 ? `${ALB.C} ${ALB.G7}` : albBar(c))).join(' | ');

const l67: Lesson = {
  n: 67,
  id: 'l67',
  title: 'Baixo de Alberti e equilíbrio entre as mãos',
  minutes: 60,
  objectives: [
    'Consigo tocar o baixo de Alberti em colcheias, leve e igual, em Dó, Fá e Sol.',
    'Consigo tocar a melodia mais forte que o acompanhamento em pelo menos 80% dos compassos.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Melodia acompanhada',
      body: `A música do período clássico (Haydn, Mozart, Clementi, o jovem Beethoven) é quase toda **melodia acompanhada**: a mão direita canta, a esquerda dá a harmonia num desenho repetido.

O desenho mais famoso tem nome de pessoa: o **baixo de Alberti** (de Domenico Alberti, que o usou muito por volta de 1730). É o acorde quebrado na ordem **grave – agudo – meio – agudo**: em Dó, **Dó–Sol–Mi–Sol**, em colcheias.

- Dedilhado na esquerda: **5–1–3–1**.
- Em F (Fá maior) na posição perto de Dó: Dó–Lá–Fá–Lá (o acorde em 2ª inversão, para a mão não pular).
- Em G (ou G7): Si–Sol–Ré–Sol (ou Si–Sol–Fá–Sol).

A mão fica **parada** e os dedos só giram, como uma roda. O polegar, que toca a nota repetida (Sol), precisa ser o **mais leve** de todos.`,
    },
    {
      kind: 'example',
      title: 'Alberti em Dó, Fá e Sol',
      steps: [
        { say: 'Dó–Sol–Mi–Sol, duas vezes.', play: { bpm: 80, steps: [48, 55, 52, 55, 48, 55, 52, 55].map((m) => ({ midis: [m], beats: 0.5, velocity: 0.45 })) } },
        { say: 'C – F – G7 – C, com a mão quase parada.', play: { bpm: 80, steps: [48, 55, 52, 55, 48, 57, 53, 57, 47, 55, 53, 55, 48, 55, 52, 55].map((m) => ({ midis: [m], beats: 0.5, velocity: 0.45 })) } },
      ],
    },
    { kind: 'exercise', id: 'l67-alberti', exercise: quickTimed('Alberti sozinho', 'Esquerda, C – F – G7 – C, colcheias de 66 a 88 BPM. Notas iguais, polegar leve.', () => melodyTask(`${albBar('C')} | ${albBar('F')} | ${ALB.G7} ${ALB.G7} | ${albBar('C')}`, { bpm: 66, clef: 'bass' }), { ladder: { from: 66, to: 88, step: 8 }, evenness: 40 }) },
    {
      kind: 'text',
      title: 'A melodia por cima',
      body: `Com as duas mãos, aparece o desafio central do piano clássico: **equilíbrio**. A esquerda toca quatro notas para cada nota da direita; se as duas mãos tocarem com a mesma força, o acompanhamento engole a melodia.

A solução é tocar as mãos em **dinâmicas diferentes ao mesmo tempo**: a direita em **mf**, cantando, com o peso do braço; a esquerda em **p**, com os dedos perto das teclas. No começo isso parece impossível. Treine assim:

1. Só a esquerda, o mais leve que conseguir, sem perder nenhuma nota.
2. Só a direita, cantando.
3. Juntas, devagar, ouvindo **só a melodia**.

O app mede o equilíbrio pela força (velocity) de cada mão, compasso por compasso: a melodia precisa ficar acima do acompanhamento em pelo menos 80% deles. Precisa do piano conectado.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'o polegar batendo',
      body: 'No Alberti, o polegar toca a nota repetida a cada duas colcheias, e ele é o dedo mais pesado. Se o Sol "pula" para fora do desenho, deixe o polegar quase parado sobre a tecla e toque com a ponta, sem bater.',
    },
    { kind: 'exercise', id: 'l67-sonatina', exercise: quickTimed('Sonatina em Dó, com equilíbrio', 'Melodia na direita, Alberti na esquerda, de 60 a 72 BPM. A melodia precisa soar acima do acompanhamento.', () => twoHandTask(SONATINA_R, SONATINA_L, { bpm: 60, caption: 'Melodia mf, Alberti p.' }), { ladder: { from: 60, to: 72, step: 6 }, balance: 8 }) },
    { kind: 'song', songId: 'u09-sonatina', why: 'A sonatina inteira na partitura. Toque devagar ouvindo só a melodia.' },
    { kind: 'exercise', id: 'l67-quiz', exercise: quiz('Alberti e equilíbrio', 'Três perguntas rápidas.', ALBERTI_Q, 0.66) },
  ],
  review: [choice(ALBERTI_Q, 'alberti'), strangeName],
  checkpoint: [
    quickTimed('Sonatina a 72 BPM', 'Duas mãos, sem dicas, com a melodia acima do acompanhamento em 80% dos compassos.', () => twoHandTask(SONATINA_R, SONATINA_L, { bpm: 72 }), { balance: 8 }),
  ],
  exit: [choice(ALBERTI_Q, 'alberti')],
};

const KEYS_FOUR: Record<string, string> = { C: 'Dó', G: 'Sol', F: 'Fá', D: 'Ré', Bb: 'Si♭' };
const FOUR_PROG: Record<string, string[]> = {
  C: ['C', 'F', 'G', 'C'], G: ['G', 'C', 'D', 'G'], F: ['F', 'Bb', 'C', 'F'], D: ['D', 'G', 'A', 'D'], Bb: ['Bb', 'Eb', 'F', 'Bb'],
};
const fourVoices = chordSequence({ sequences: Object.entries(FOUR_PROG).map(([k, s]) => ({ name: `I–IV–V–I em ${KEYS_FOUR[k]} maior.`, symbols: s })), lead: 2, bass: true });
const fourVoicesLong = chordSequence({
  sequences: [
    { name: 'I–vi–IV–V–I em Dó.', symbols: ['C', 'Am', 'F', 'G', 'C'] },
    { name: 'I–ii–V–I em Sol.', symbols: ['G', 'Am', 'D', 'G'] },
    { name: 'I–IV–ii–V–I em Fá.', symbols: ['F', 'Bb', 'Gm', 'C', 'F'] },
  ],
  lead: 2,
  bass: true,
});
const PARALLELS: ChoiceQuestion[] = [
  { q: 'Baixo Dó → Ré e soprano Sol → Lá (C → Dm). O que há de errado?', options: ['Quintas paralelas entre baixo e soprano', 'Nada', 'Oitavas paralelas'], answer: 0, why: 'Dó–Sol e Ré–Lá: duas 5ªs seguidas na mesma direção. Leve o soprano para Fá (movimento contrário).' },
  { q: 'Baixo Fá → Sol e soprano Fá → Sol (F → G). O que há de errado?', options: ['Oitavas paralelas', 'Quintas paralelas', 'Nada'], answer: 0, why: 'As duas vozes andam juntas em oitava. Faça o soprano descer (Fá → Ré, ou Lá → Sol).' },
  { q: 'C → F com soprano Mi → Fá e baixo Dó → Fá. Está certo?', options: ['Sim: o baixo salta e o soprano anda por grau', 'Não: oitavas paralelas', 'Não: quintas paralelas'], answer: 0, why: 'Mi–Dó (3ª) para Fá–Fá (uníssono/8ª) chega por movimento direto, mas o soprano anda por grau: aceitável.' },
  { q: 'G → C com a sensível (Si) no soprano indo para Sol. O problema é…', options: ['A sensível não resolveu na tônica', 'Quintas paralelas', 'Nenhum'], answer: 0, why: 'No soprano, o Si quer subir para o Dó. Deixá-lo cair soa como frase inacabada.' },
];

const l68: Lesson = {
  n: 68,
  id: 'l68',
  title: 'Quatro vozes no estilo teclado',
  minutes: 60,
  objectives: [
    'Consigo dizer os quatro tipos de movimento entre vozes e reconhecer quintas e oitavas paralelas.',
    'Consigo tocar I–IV–V–I a quatro vozes (baixo na esquerda, três vozes conduzidas na direita) em tom sorteado.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Quatro vozes, duas mãos',
      body: `A harmonia clássica se escreve a **quatro vozes**, como um coral: **soprano**, **contralto**, **tenor** e **baixo**. No piano, o jeito mais prático é o **estilo teclado**: o **baixo** na mão esquerda e as **três vozes de cima** na direita, em posição fechada.

Você já sabe metade disso: a direita conduzindo as vozes (lição 44) e a esquerda no baixo. Agora com as regras do jogo clássico:

- O **baixo** toca a **fundamental** (por enquanto).
- A direita tem **uma nota de cada** do acorde. Somando o baixo, a fundamental aparece **dobrada**: é a nota que se dobra de preferência.
- A direita anda **o mínimo**, como antes.
- A **sensível** (Si, em Dó) não se dobra e, no V → I, sobe para a tônica.`,
    },
    {
      kind: 'text',
      title: 'Os movimentos e as paralelas',
      body: `Entre duas vozes, há quatro movimentos possíveis:

- **Direto** (ou similar): as duas andam na mesma direção.
- **Paralelo**: na mesma direção e mantendo o mesmo intervalo.
- **Contrário**: uma sobe, a outra desce.
- **Oblíquo**: uma fica, a outra anda.

A regra mais famosa da harmonia tradicional: **nada de 5ªs nem 8ªs paralelas**. Se duas vozes estão a uma 5ª justa (ou oitava) e andam juntas para outra 5ª (ou oitava), elas soam como uma voz só, "engrossada", e a textura perde a independência. É por isso que o pop está cheio de 5ªs paralelas (o "power chord" do rock) e Bach evita todas.

O remédio é o **movimento contrário**: quando o baixo sobe, a direita desce, e vice-versa. No I–IV–V–I com a direita conduzida, isso já acontece quase sozinho.`,
    },
    {
      kind: 'example',
      title: 'I–IV–V–I a quatro vozes, em Dó',
      steps: [
        { say: 'C: Dó no baixo; Mi–Sol–Dó na direita.', keys: [48, 64, 67, 72], play: { bpm: 66, steps: [{ midis: [48, 64, 67, 72], beats: 2 }] } },
        { say: 'F: Fá no baixo; Fá–Lá–Dó (o Dó fica, Mi→Fá, Sol→Lá).', keys: [41, 65, 69, 72], play: { bpm: 66, steps: [{ midis: [41, 65, 69, 72], beats: 2 }] } },
        { say: 'G: Sol no baixo; Ré–Sol–Si. Repare: o baixo sobe (Fá→Sol) e as vozes de cima descem. Movimento contrário, sem paralelas.', keys: [43, 62, 67, 71], play: { bpm: 66, steps: [{ midis: [43, 62, 67, 71], beats: 2 }] } },
        { say: 'C: o Si (sensível) sobe para Dó. A cadência inteira.', play: { bpm: 72, steps: [{ midis: [48, 64, 67, 72], beats: 2 }, { midis: [41, 65, 69, 72], beats: 2 }, { midis: [43, 62, 67, 71], beats: 2 }, { midis: [48, 64, 67, 72], beats: 3 }] } },
      ],
    },
    { kind: 'exercise', id: 'l68-consertar', exercise: quiz('Conserte a condução', 'Quatro situações: ache o problema.', PARALLELS, 0.75) },
    { kind: 'exercise', id: 'l68-quatro', exercise: items('I–IV–V–I a quatro vozes', 'Tom sorteado. Baixo na esquerda (a fundamental); três notas na direita, conduzidas (até 2 semitons além do caminho mais curto).', fourVoices, 8, 36, 84, 0.85) },
    { kind: 'exercise', id: 'l68-longas', exercise: items('Progressões mais longas', 'Com vi e ii. Mesmas regras.', fourVoicesLong, 6, 36, 84, 0.8) },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'o que o app mede e o que não mede',
      body: 'O app confere o baixo, as notas do acorde e o movimento total da direita. As paralelas ele ainda não procura sozinho: com a direita conduzida pelo caminho mais curto e o baixo andando ao contrário, elas quase nunca aparecem. Se quiser conferir, toque devagar e olhe a voz de cima contra o baixo.',
    },
    { kind: 'exercise', id: 'l68-quiz', exercise: quiz('Quatro vozes', 'Cinco perguntas rápidas.', FOUR_Q) },
  ],
  review: [fourVoices, choice([...FOUR_Q, ...PARALLELS], 'quatro-vozes')],
  checkpoint: [
    items('Quatro vozes em tom sorteado', '8 cadências, sem dicas. Meta: 85%.', fourVoices, 8, 36, 84, 0.85, 'off'),
  ],
  exit: [fourVoices, choice(FOUR_Q, 'quatro-vozes')],
};

// ---------- músicas ----------

const sonatina: SongSpec = {
  id: 'u09-sonatina',
  title: 'Sonatina em Dó',
  composer: 'melodia original do Fermata, no estilo clássico',
  arrangement: 'melodia na direita, baixo de Alberti em colcheias na esquerda',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: SONATINA_R,
  left: SONATINA_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Minueto em Sol, BWV Anh. 114 (Christian Petzold, atribuído; do Caderno de Anna Magdalena Bach, 1725).
const MINUET_R = [
  'D5 G4:0.5 A4:0.5 B4:0.5 C5:0.5', 'D5 G4 G4', 'E5 C5:0.5 D5:0.5 E5:0.5 F#5:0.5', 'G5 G4 G4',
  'C5 D5:0.5 C5:0.5 B4:0.5 A4:0.5', 'B4 C5:0.5 B4:0.5 A4:0.5 G4:0.5', 'F#4 G4:0.5 A4:0.5 B4:0.5 G4:0.5', 'A4:3',
  'D5 G4:0.5 A4:0.5 B4:0.5 C5:0.5', 'D5 G4 G4', 'E5 C5:0.5 D5:0.5 E5:0.5 F#5:0.5', 'G5 G4 G4',
  'C5 D5:0.5 C5:0.5 B4:0.5 A4:0.5', 'B4 C5:0.5 B4:0.5 A4:0.5 G4:0.5', 'A4 B4:0.5 A4:0.5 G4:0.5 F#4:0.5', 'G4:3',
].join(' | ');
const MINUET_L = [
  'G3:2 A3', 'B3:3', 'C4:3', 'B3:3', 'A3:3', 'G3:3', 'D4 B3 G3', 'D4 D3 C4',
  'G3:2 A3', 'B3:3', 'C4:3', 'B3:3', 'C4:3', 'B3:3', 'D4:2 D3', 'G3:2 G2',
].join(' | ');

const minuet: SongSpec = {
  id: 'u09-minueto',
  title: 'Minueto em Sol, BWV Anh. 114',
  composer: 'Christian Petzold (atribuído; Caderno de Anna Magdalena Bach)',
  arrangement: 'arranjo do Fermata: só a primeira parte (16 compassos), sem repetição; mão esquerda simplificada em notas longas, com o desenho do original nos compassos 7, 8 e 15',
  bpm: 96,
  beatsPerBar: 3,
  fifths: 1,
  right: MINUET_R,
  left: MINUET_L,
  hands: 'duas',
  pass: { accuracy: 0.9 },
};

const SIGHT_KEYS = [
  { tonic: 60, fifths: 0 }, { tonic: 67, fifths: 1 }, { tonic: 62, fifths: 2 }, { tonic: 69, fifths: 3 },
  { tonic: 65, fifths: -1 }, { tonic: 70, fifths: -2 }, { tonic: 63, fifths: -3 },
];
const sight2 = (bpm: number) => (rng: Rng) => {
  const k = pick(rng, SIGHT_KEYS);
  return sightReadingTwoHands(rng, { tonic: k.tonic, bars: 8, bpm, fifths: k.fifths });
};

const SIGHT_Q: ChoiceQuestion[] = [
  { q: 'Nos 30 segundos antes de ler, o que olhar primeiro?', options: ['Armadura, compasso e a primeira nota de cada mão', 'Só a primeira nota da direita', 'O título'], answer: 0, why: 'É o que os examinadores da ABRSM sugerem: o mapa antes da viagem.' },
  { q: 'Errou uma nota na primeira vista. O que fazer?', options: ['Seguir em frente no tempo', 'Voltar e corrigir', 'Parar e recomeçar'], answer: 0, why: 'Na leitura, o pulso vale mais que a nota. Quem para perde o lugar.' },
  { q: 'Para não parar, os olhos devem estar…', options: ['Um pouco à frente do que as mãos tocam', 'Nas mãos', 'Exatamente na nota tocada'], answer: 0, why: 'Ler adiante dá tempo de preparar a próxima posição.' },
  { q: 'Num trecho com armadura de 3 bemóis, as notas alteradas são…', options: ['Si♭, Mi♭ e Lá♭', 'Fá♯, Dó♯ e Sol♯', 'Si♭, Mi♭ e Ré♭'], answer: 0, why: 'A ordem dos bemóis: Si, Mi, Lá...' },
];

const l69: Lesson = {
  n: 69,
  id: 'l69',
  title: 'Primeira vista com as duas mãos',
  minutes: 60,
  objectives: [
    'Consigo preparar uma leitura em 30 segundos: armadura, compasso, posição das mãos e ritmo.',
    'Consigo ler à primeira vista 8 compassos com as duas mãos, armaduras até 3 acidentes, sem parar, com 80% das notas no tempo.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Os 30 segundos',
      body: `Nos exames de piano (ABRSM, por exemplo), o aluno recebe o trecho de primeira vista e tem **30 segundos** para olhar antes de tocar. Bem usados, esses segundos valem mais que a leitura em si. Uma ordem que funciona:

1. **Armadura e tom**: quantos acidentes, que tonalidade? Diga em voz alta as notas alteradas ("Fá♯ e Dó♯").
2. **Compasso** e **andamento**: conte um compasso mentalmente no andamento em que vai tocar (mais devagar do que acha que consegue).
3. **Posição das mãos**: a primeira nota de cada mão e o desenho geral (posição de cinco dedos? desce? sobe?).
4. **Ritmo**: os pontos difíceis (pontuadas, pausas). Bata o ritmo de um compasso difícil na perna.
5. **Fim**: onde a música termina? Saber o destino ajuda a não se perder.`,
    },
    {
      kind: 'text',
      title: 'Não parar',
      body: `A regra de ouro da primeira vista é **não parar**. Errou uma nota? Siga. Perdeu um tempo? Entre de novo no próximo. Um ouvinte perdoa uma nota errada; não perdoa o pulso quebrado.

Duas técnicas ajudam:

- **Olhe adiante**: os olhos ficam meio compasso ou um compasso à frente das mãos. Assim, quando a mão chega, ela já sabe para onde ir.
- **Simplifique**: se as duas mãos ficarem pesadas, mantenha a **direita** inteira e toque na esquerda só a **primeira nota** de cada compasso. É o que pianistas fazem em ensaios: o essencial primeiro.

Nesta lição, a esquerda toca notas longas (tônica e dominante) e a direita uma melodia nova em posição de cinco dedos. A melodia é gerada na hora: cada passada é uma leitura nova.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'olhar para as mãos',
      body: 'Cada vez que os olhos descem para o teclado, eles perdem o lugar na pauta. Na posição de cinco dedos, confie no tato: os dedos sabem onde estão. Olhe para baixo só nas mudanças de posição, e rápido.',
    },
    { kind: 'exercise', id: 'l69-quiz', exercise: quiz('Antes de ler', 'Quatro perguntas rápidas.', SIGHT_Q, 0.75) },
    { kind: 'exercise', id: 'l69-leitura', exercise: quickTimed('Primeira vista, mãos juntas', '8 compassos novos a cada passada, armaduras até 3 acidentes, a 52 BPM. Olhe 30 s antes. Três passadas boas.', sight2(52), { reps: 3, pass: { accuracy: 0.8 } }) },
    { kind: 'exercise', id: 'l69-mais', exercise: quickTimed('Um pouco mais rápido', 'O mesmo, a 60 BPM.', sight2(60), { reps: 2, pass: { accuracy: 0.8 } }) },
  ],
  review: [choice(SIGHT_Q, 'primeira-vista'), strangeName],
  checkpoint: [
    quickTimed('Primeira vista a 56 BPM', '8 compassos novos, duas mãos, sem dicas. Meta: 85% das notas no tempo.', sight2(56)),
  ],
  exit: [choice(SIGHT_Q, 'primeira-vista')],
};

const ORN_Q: ChoiceQuestion[] = [
  { q: 'O trinado é…', options: ['Alternar rápido a nota escrita com a vizinha de cima', 'Uma nota longa', 'Um arpejo'], answer: 0, why: 'No barroco, costuma começar pela nota de cima.' },
  { q: 'O mordente superior é…', options: ['Nota, vizinha de cima, nota, bem rápido', 'Nota, vizinha de baixo, nota', 'Duas notas juntas'], answer: 0, why: 'Um "trinado curto" de três notas.' },
  { q: 'O grupeto (turn) em Dó é…', options: ['Ré–Dó–Si–Dó', 'Dó–Ré–Dó', 'Dó–Mi–Sol'], answer: 0, why: 'Vizinha de cima, nota, vizinha de baixo, nota.' },
  { q: 'Acciaccatura é…', options: ['Nota bem curta "esmagada" antes da principal', 'Nota longa que ocupa metade do tempo da principal', 'Um trinado longo'], answer: 0, why: 'Escrita como notinha com um risco na haste.' },
  { q: 'A apojatura (ornamento) dura…', options: ['Uma boa parte do valor da nota principal, no tempo', 'Quase nada', 'O dobro da nota'], answer: 0, why: 'Ao contrário da acciaccatura, ela "pesa" no tempo forte.' },
];

const TRILL = 'D5:0.25 C5:0.25 D5:0.25 C5:0.25 D5:0.25 C5:0.25 D5:0.25 C5:0.25 B4:0.25 C5:0.25 D5:0.5 C5:1 | C5:4';
const MORDENT = 'C5:0.25 D5:0.25 C5:1.5 G4:2 | E5:0.25 F5:0.25 E5:1.5 C5:2 | D5:0.25 C5:0.25 B4:0.25 C5:0.25 D5:1 G4:2 | C5:4';

const l70: Lesson = {
  n: 70,
  id: 'l70',
  title: 'Ornamentos',
  minutes: 60,
  objectives: [
    'Consigo ler e tocar mordente, trinado, grupeto, apojatura e acciaccatura.',
    'Consigo tocar um trinado de pelo menos 6 notas com variação abaixo de 30 ms.',
    'Consigo tocar a primeira parte do Minueto em Sol com 90% das notas.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Os enfeites da música antiga',
      body: `Na música barroca e clássica, os compositores escreviam pequenos sinais sobre as notas para pedir **ornamentos**: enfeites rápidos que o intérprete toca a partir da nota escrita. Os cinco mais comuns:

- **Trinado** (tr): alternar rápido a nota com a **vizinha de cima**. No barroco (Bach), começa pela nota de cima; no clássico e depois, em geral, pela própria nota.
- **Mordente** (um zigue-zague curto): nota, **vizinha de cima**, nota, bem rápido, no tempo. É um "trinado de três notas". Com um risco vertical, é o mordente **inferior** (vizinha de baixo).
- **Grupeto** (um S deitado, ∽): vizinha de cima, nota, vizinha de baixo, nota. Em Dó: Ré–Dó–Si–Dó.
- **Apojatura** (notinha sem risco): uma nota "de apoio" que **ocupa uma parte do tempo** da principal, no tempo forte, e resolve nela (como a apojatura da lição 66).
- **Acciaccatura** (notinha com risco na haste): uma nota **esmagada**, curtíssima, quase junto com a principal.

O app mede o resultado escrito por extenso: as notas rápidas aparecem como semicolcheias na pauta.`,
    },
    {
      kind: 'example',
      title: 'Os ornamentos sobre Dó',
      steps: [
        { say: 'Mordente: Dó–Ré–Dó, rápido, no tempo.', play: { bpm: 72, steps: [{ midis: [72], beats: 0.2 }, { midis: [74], beats: 0.2 }, { midis: [72], beats: 1.6 }] } },
        { say: 'Trinado barroco: começa no Ré e termina com um pequeno giro.', play: { bpm: 72, steps: [74, 72, 74, 72, 74, 72, 74, 72, 71, 72].map((m) => ({ midis: [m], beats: 0.2 })).concat([{ midis: [72], beats: 1 }]) } },
        { say: 'Grupeto: Ré–Dó–Si–Dó.', play: { bpm: 72, steps: [74, 72, 71].map((m) => ({ midis: [m], beats: 0.25 })).concat([{ midis: [72], beats: 1.25 }]) } },
        { say: 'Apojatura (Ré pesando no tempo, resolvendo em Dó) e acciaccatura (Ré esmagado).', play: { bpm: 72, steps: [{ midis: [74], beats: 1 }, { midis: [72], beats: 1 }, { midis: [74], beats: 0.08 }, { midis: [72], beats: 1.92 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'Trinado igual',
      body: `O trinado bom é **igual**: as notas do mesmo tamanho, como um zumbido regular. O desigual soa como um tropeço repetido.

Use dois dedos **não vizinhos de força parecida**: **2–3** ou **1–3** na direita costumam funcionar melhor que 3–4. Movimento pequeno, dedos perto da tecla, e a rotação do antebraço ajudando (um leve balanço de um lado para o outro, como girar uma maçaneta).

Comece devagar, em semicolcheias medidas, e só acelere quando ficar igual. O exercício mede a variação entre as notas: a meta é ficar abaixo de **30 ms**, com pelo menos 6 notas seguidas.`,
    },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'trinado sem aperto',
      body: 'Trinado tenso cansa o antebraço em segundos. Se a mão travar, pare, sacuda o braço e recomece mais devagar. Velocidade no trinado vem de relaxamento, não de força.',
    },
    { kind: 'exercise', id: 'l70-trinado', exercise: quickTimed('Trinado medido', 'Ré–Dó em semicolcheias com giro final, de 48 a 66 BPM. Variação até 30 ms.', () => melodyTask(TRILL, { bpm: 48 }), { ladder: { from: 48, to: 66, step: 6 }, evenness: 30, window: 70 }) },
    { kind: 'exercise', id: 'l70-mordentes', exercise: quickTimed('Mordentes e grupeto', 'Escritos por extenso, a 60 BPM. Os enfeites rápidos e leves, a nota principal cantando.', () => melodyTask(MORDENT, { bpm: 60 }), { reps: 2, window: 80 }) },
    {
      kind: 'text',
      title: 'O Minueto em Sol',
      body: `O **Minueto em Sol** é provavelmente a peça mais tocada por estudantes de piano no mundo. Ele está no **Caderno de Anna Magdalena Bach** (1725), uma coleção doméstica da família Bach, e por muito tempo foi atribuído a Johann Sebastian. Hoje se sabe que é de **Christian Petzold**, organista de Dresden.

O minueto é uma **dança em 3/4**, elegante, com o primeiro tempo apoiado. A forma é de período: o compasso 8 termina no **V** (Ré, meia cadência) e o 16 no **I** (Sol, cadência perfeita). Repare nas notas estranhas da lição 66: passagens em quase todo compasso, e as bordaduras do compasso 6.

O arranjo do curso tem só a primeira parte, com a esquerda em notas longas. No original, a peça pede alguns ornamentos (como um trinado no compasso 15): acrescente-os quando a peça estiver segura.`,
    },
    { kind: 'exercise', id: 'l70-minueto-md', exercise: quickTimed('Minueto, mão direita', 'Os 16 compassos da direita, de 72 a 96 BPM.', () => melodyTask(MINUET_R, { bpm: 72, beatsPerBar: 3, fifths: 1 }), { ladder: { from: 72, to: 96, step: 8 }, pass: { accuracy: 0.9 } }) },
    { kind: 'song', songId: 'u09-minueto', why: 'O projeto final da unidade: o minueto com as duas mãos.' },
    { kind: 'exercise', id: 'l70-quiz', exercise: quiz('Ornamentos', 'Cinco perguntas rápidas.', ORN_Q) },
  ],
  review: [choice(ORN_Q, 'ornamentos')],
  checkpoint: [
    quickTimed('Trinado a 66 BPM', 'Sem dicas. Variação até 30 ms.', () => melodyTask(TRILL, { bpm: 66 }), { evenness: 30, window: 70 }),
    quickTimed('Minueto a 96 BPM', 'Mão direita, 16 compassos. Meta: 90%.', () => melodyTask(MINUET_R, { bpm: 96, beatsPerBar: 3, fifths: 1 }), { pass: { accuracy: 0.9 } }),
  ],
  exit: [choice(ORN_Q, 'ornamentos')],
};

// Frère Jacques (canção folclórica francesa) em cânone entre as mãos: a esquerda entra 2 compassos depois, uma oitava abaixo.
const FJ = ['C4 D4 E4 C4', 'C4 D4 E4 C4', 'E4 F4 G4:2', 'E4 F4 G4:2', 'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4', 'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4', 'C4 G3 C4:2', 'C4 G3 C4:2'];
const down = (bar: string) => bar.replace(/([A-G]#?b?)(\d)/g, (_, l: string, o: string) => `${l}${Number(o) - 1}`);
const CANON_R = [...FJ, 'C4:4', 'C4:4'].join(' | ');
const CANON_L = ['r:4', 'r:4', ...FJ.map(down)].join(' | ');

const POLY_Q: ChoiceQuestion[] = [
  { q: 'Num cânone, a segunda voz…', options: ['Repete a primeira, entrando depois', 'Toca outra melodia', 'Toca só acordes'], answer: 0, why: 'Como numa ronda cantada: "Frère Jacques" é um cânone.' },
  { q: 'Imitação é…', options: ['Uma voz repetir o motivo da outra, às vezes em outra altura', 'Tocar igual ao professor', 'Duas vozes juntas em oitava'], answer: 0, why: 'É a base do contraponto de Bach.' },
  { q: '2 contra 3 cabe numa grade de…', options: ['6 partes por tempo', '5 partes', '4 partes'], answer: 0, why: 'O menor múltiplo comum de 2 e 3.' },
  { q: 'Na grade de 6, as 3 notas caem em…', options: ['1, 3 e 5', '1, 4', '1, 2 e 3'], answer: 0, why: 'E as 2 notas em 1 e 4. Juntas: 1 (as duas), 3, 4, 5.' },
  { q: 'Para acertar um salto grande no tempo, o mais importante é…', options: ['Olhar e mover o braço antes, com a mão já em forma', 'Esticar o dedo', 'Tocar mais forte'], answer: 0, why: 'Os olhos chegam primeiro, o braço leva a mão pronta.' },
];

const l71: Lesson = {
  n: 71,
  id: 'l71',
  title: 'Duas vozes independentes',
  minutes: 60,
  objectives: [
    'Consigo tocar duas melodias independentes, uma em cada mão, com ritmos diferentes.',
    'Consigo tocar um cânone entre as mãos com 85% das notas certas em cada mão.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Contraponto: duas melodias ao mesmo tempo',
      body: `Até aqui, quase sempre uma mão cantava e a outra acompanhava. No **contraponto**, as duas mãos tocam **melodias**, cada uma com seu próprio ritmo e desenho, e a harmonia nasce do encontro entre elas. É a escrita de Bach, das Invenções, das fugas, e de muita música antiga.

O jeito mais simples de começar é a **imitação**: uma voz apresenta um motivo, e a outra repete o mesmo motivo, depois, às vezes em outra altura. Quando a imitação é inteira e contínua, chama-se **cânone**: a mesma melodia em duas vozes defasadas, como uma ronda cantada.

**Frère Jacques** é um cânone perfeito: qualquer compasso dela soa bem junto com qualquer outro, porque tudo cabe no acorde de Dó.`,
    },
    {
      kind: 'text',
      title: 'Como estudar duas vozes',
      body: `A dificuldade do contraponto não é a velocidade: é a **independência**. Uma mão quer copiar o ritmo da outra. O método clássico:

1. Cada mão sozinha, até ficar automática e **cantável**: cante a melodia enquanto toca.
2. Juntas, **muito devagar**, compasso a compasso, ouvindo as duas linhas.
3. Toque uma mão e **cante** a outra. Depois troque.
4. Junte de novo, prestando atenção nos pontos em que as duas mãos atacam **juntas**: eles são o "esqueleto" que segura a coordenação.

No cânone desta lição, a esquerda entra **2 compassos depois**, uma oitava abaixo. Nos compassos 5 e 6, a direita está nas colcheias enquanto a esquerda está nas mínimas: é o trecho mais difícil.`,
    },
    {
      kind: 'example',
      title: 'O cânone',
      steps: [
        { say: 'Primeiro a direita sozinha, depois a esquerda entrando no compasso 3, uma oitava abaixo.', play: { bpm: 100, steps: [[60], [62], [64], [60], [60], [62], [64], [60], [64, 48], [65, 50], [67, 52], [], [64, 48], [65, 50], [67, 52], []].map((midis) => ({ midis, beats: 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l71-me', exercise: quickTimed('A esquerda sozinha', 'A melodia uma oitava abaixo, de 72 a 88 BPM.', () => melodyTask(FJ.map(down).join(' | '), { bpm: 72, clef: 'bass' }), { ladder: { from: 72, to: 88, step: 8 } }) },
    { kind: 'exercise', id: 'l71-canone', exercise: quickTimed('O cânone, duas mãos', '10 compassos, de 66 a 84 BPM. Ouça as duas melodias.', () => twoHandTask(CANON_R, CANON_L, { bpm: 66, caption: 'A pauta mostra a direita. A esquerda entra no compasso 3 com a mesma melodia, uma oitava abaixo.' }), { ladder: { from: 66, to: 84, step: 6 }, window: 80 }) },
    { kind: 'song', songId: 'u09-canone', why: 'O cânone na pauta dupla: dá para ver a imitação.' },
    { kind: 'exercise', id: 'l71-quiz', exercise: quiz('Contraponto e polirritmia', 'Cinco perguntas rápidas.', POLY_Q) },
  ],
  review: [choice(POLY_Q, 'contraponto')],
  checkpoint: [
    quickTimed('Cânone a 84 BPM', 'Duas mãos, sem dicas. Meta: 85%.', () => twoHandTask(CANON_R, CANON_L, { bpm: 84 }), { window: 80 }),
  ],
  exit: [choice(POLY_Q, 'contraponto')],
};

// 2 contra 3: direita em tercinas, esquerda em colcheias, sobre Dó e Sol.
const POLY_R = 'C5:1/3 E5:1/3 G5:1/3 C5:1/3 E5:1/3 G5:1/3 B4:1/3 D5:1/3 G5:1/3 B4:1/3 D5:1/3 G5:1/3';
const POLY_L = 'C3:0.5 G3:0.5 C3:0.5 G3:0.5 G2:0.5 D3:0.5 G2:0.5 D3:0.5';
const polyTask = (cycles: number, bpm: number) => twoHandTask(Array(cycles).fill(POLY_R).join(' | '), Array(cycles).fill(POLY_L).join(' | '), { bpm, caption: '3 na direita (tercinas), 2 na esquerda (colcheias). Conte "1-2-3-4-5-6": direita no 1, 3, 5; esquerda no 1 e 4.' });
// Saltos: baixo grave no tempo, acorde no meio do teclado no contratempo do tempo.
const JUMPS = 'C2 C3+E3+G3 G1 B2+D3+G3 | A1 A2+C3+E3 F1 A2+C3+F3 | C2 C3+E3+G3 G1 B2+D3+F3 | C2:2 C3+E3+G3:2';

const l72: Lesson = {
  n: 72,
  id: 'l72',
  title: 'Polirritmia 2 contra 3 e saltos',
  minutes: 60,
  objectives: [
    'Consigo tocar 2 contra 3 (uma mão em tercinas, a outra em colcheias) por 8 tempos, em ±50 ms.',
    'Consigo tocar saltos de registro na mão esquerda no tempo, com 85% de acerto.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Três numa mão, dois na outra',
      body: `Na lição 39 você alternou colcheias e tercinas **em sequência**. Agora elas acontecem **ao mesmo tempo**: a direita toca 3 notas por tempo e a esquerda 2. Isso é uma **polirritmia**, o famoso **2 contra 3**, que aparece em Chopin, Debussy, Brahms e em muita música brasileira e africana.

O segredo é a **grade de 6**. Divida o tempo em 6 partes iguais e conte "1-2-3-4-5-6":

- As **3 notas** (tercina) caem em **1, 3 e 5**.
- As **2 notas** (colcheias) caem em **1 e 4**.

Juntando as duas mãos, o desenho é: **1** (as duas juntas), **3** (direita), **4** (esquerda), **5** (direita). Fale devagar: "**JUN**-ta, di-**REI**-ta, es-**QUER**-da, di-**REI**-ta". Toque com as mãos na tampa do piano até o desenho ficar natural; depois no teclado.`,
    },
    {
      kind: 'example',
      title: '2 contra 3 devagar',
      steps: [
        { say: 'Só a grade de 6, com os acentos: 1 (juntas), 3 (direita), 4 (esquerda), 5 (direita).', play: { bpm: 40, steps: [{ midis: [48, 72], beats: 1 / 3 }, { midis: [76], beats: 1 / 6 }, { midis: [55], beats: 1 / 6 }, { midis: [79], beats: 1 / 3 }, { midis: [48, 72], beats: 1 / 3 }, { midis: [76], beats: 1 / 6 }, { midis: [55], beats: 1 / 6 }, { midis: [79], beats: 1 / 3 }] } },
        { say: 'No andamento: o 3 contra 2 vira um balanço contínuo.', play: { bpm: 72, steps: Array.from({ length: 4 }, () => [{ midis: [48, 72], beats: 1 / 3 }, { midis: [76], beats: 1 / 6 }, { midis: [55], beats: 1 / 6 }, { midis: [79], beats: 1 / 3 }]).flat() } },
      ],
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'pense na mão de três',
      body: 'Pianistas costumam pensar na mão das tercinas como a "melodia" e deixar a de colcheias cair sozinha entre a 2ª e a 3ª nota da tercina. Se tentar contar as duas mãos ao mesmo tempo, o cérebro trava; deixe uma conduzir.',
    },
    { kind: 'exercise', id: 'l72-poli', exercise: quickTimed('2 contra 3', 'Tercinas na direita, colcheias na esquerda, 8 tempos, de 40 a 56 BPM. Janela de ±50 ms.', () => polyTask(2, 40), { window: 50, ladder: { from: 40, to: 56, step: 4 } }) },
    {
      kind: 'text',
      title: 'Saltos no tempo',
      body: `O outro desafio desta lição é o **salto**: a mão esquerda que vai do baixo grave ao meio do teclado e volta, a cada tempo, como no ragtime (lição 65) e no "stride". Errar o salto é quase sempre um problema de **preparação**, não de pontaria:

1. **Os olhos chegam antes**: olhe para o destino um instante antes de a mão sair.
2. **O braço leva a mão**, já na forma do acorde. A mão não "procura" a tecla no ar: ela chega pronta.
3. **Saia cedo**: solte a nota grave um pouquinho antes e use o tempo do deslocamento. O pedal pode segurar o som do baixo.
4. **Movimento curvo**, rente ao teclado, não um arco alto.

Comece devagar, a ponto de não errar nenhum salto; a velocidade vem da segurança.`,
    },
    { kind: 'exercise', id: 'l72-saltos', exercise: quickTimed('Saltos na esquerda', 'Baixo grave no tempo, acorde no meio do teclado no tempo seguinte. De 56 a 76 BPM.', () => melodyTask(JUMPS, { bpm: 56, clef: 'bass' }), { ladder: { from: 56, to: 76, step: 5 }, window: 80 }) },
  ],
  review: [choice(POLY_Q, 'contraponto')],
  checkpoint: [
    quickTimed('8 ciclos de 2 contra 3', 'A 56 BPM, sem dicas, ±50 ms.', () => polyTask(2, 56), { window: 50 }),
    quickTimed('Saltos a 76 BPM', 'Sem dicas. Meta: 85%.', () => melodyTask(JUMPS, { bpm: 76, clef: 'bass' }), { window: 80 }),
  ],
  exit: [choice(POLY_Q, 'contraponto')],
};

const l73: Lesson = {
  n: 73,
  id: 'l73',
  title: 'Checkpoint da unidade 9 e projeto: peça clássica com análise',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint misto da unidade 9, sem dicas.',
    'Consigo tocar o Minueto em Sol com 95% das notas no andamento escolhido e escrever sua análise de forma e harmonia.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Tocar e entender',
      body: `Esta unidade foi sobre ler e tocar como um pianista clássico: as notas estranhas que dão vida à melodia, o equilíbrio entre melodia e acompanhamento, a condução a quatro vozes, a primeira vista com as duas mãos, os ornamentos, o contraponto e as polirritmias.

O projeto é o **Minueto em Sol**, tocado e **analisado**. Analisar uma peça é responder:

- **Forma**: quantas frases? Onde estão as cadências e de que tipo são? Há repetição?
- **Harmonia**: que acorde está embaixo de cada compasso (em graus)?
- **Melodia**: quais notas são estranhas à harmonia, e de que tipo?
- **Expressão**: onde a música cresce, onde respira?`,
    },
    {
      kind: 'text',
      title: 'Um roteiro para a análise do minueto',
      body: `Uma pista para começar (confira tudo no teclado):

- **Compassos 1 a 4**: I (Sol) – I – IV (Dó) – I. A melodia desce e sobe por graus, com passagens.
- **Compassos 5 a 8**: ii (Lá menor) – I – V (Ré) – V. Termina em **meia cadência**: a pergunta.
- **Compassos 9 a 12**: repetem os compassos 1 a 4.
- **Compassos 13 a 16**: IV – I – V – I. Termina em **cadência perfeita**: a resposta.

É um **período** (lição 56) de 16 compassos, com antecedente e consequente de 8. Escreva os graus embaixo de cada compasso, circule as notas de passagem e as bordaduras, e marque as duas cadências. Na parte técnica, mantenha o trilho de escalas: a meta da unidade é **92 BPM** em colcheias, mãos juntas.`,
    },
    { kind: 'song', songId: 'u09-minueto', why: 'O projeto final: toque com as duas mãos até 95% das notas no andamento que escolher (a referência é 96 BPM).' },
  ],
  review: [strangePlay, fourVoices, choice([...STRANGE_Q, ...ORN_Q, ...POLY_Q])],
  checkpoint: [
    items('Checkpoint da unidade 9', '20 perguntas: notas estranhas, quatro vozes, ornamentos, contraponto e primeira vista. Meta: 85%.', mix([strangePlay, strangeName, fourVoices, choice([...STRANGE_Q, ...ALBERTI_Q, ...FOUR_Q, ...SIGHT_Q, ...ORN_Q, ...POLY_Q])]), 20, 36, 84, 0.85, 'off'),
    quickTimed('Primeira vista', '8 compassos novos a 56 BPM, duas mãos.', sight2(56)),
  ],
  project: {
    title: 'Peça clássica com análise',
    brief: `Toque o **Minueto em Sol** inteiro (16 compassos, duas mãos) com 95% das notas, no andamento que você escolher (a referência é 96 BPM). Grave, e escreva a análise: forma, graus, cadências e notas estranhas.`,
    steps: [
      'Estude mãos separadas no modo Estudar até não errar.',
      'Junte as mãos devagar (72 BPM) e suba até o seu andamento.',
      'Acrescente a expressão: primeiro tempo apoiado, frases que respiram nos compassos 4, 8, 12 e 16.',
      'Grave e passe o exercício abaixo.',
      'Escreva a análise: graus de cada compasso, as duas cadências, três notas estranhas com o nome.',
    ],
    rubric: [
      '95% das notas no andamento escolhido.',
      'Dinâmica: frases com começo, meio e fim; a melodia acima da esquerda.',
      'Articulação: colcheias ligadas, semínimas levemente destacadas, como numa dança.',
      'A análise de forma e de harmonia está correta.',
    ],
    exercise: { kind: 'timed', title: 'Minueto, duas mãos', how: 'Os 16 compassos a 84 BPM.', gen: () => twoHandTask(MINUET_R, MINUET_L, { bpm: 84, beatsPerBar: 3, fifths: 1 }), reps: 1, window: 90, pass: { accuracy: 0.95 } },
  },
  exit: [strangeName, choice([...STRANGE_Q, ...ORN_Q])],
};

const canon: SongSpec = {
  id: 'u09-canone',
  title: 'Cânone de Frère Jacques',
  composer: 'canção folclórica francesa',
  arrangement: 'arranjo do Fermata: cânone entre as mãos, a esquerda entra 2 compassos depois, uma oitava abaixo',
  bpm: 84,
  beatsPerBar: 4,
  fifths: 0,
  right: CANON_R,
  left: CANON_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const unit: Unit = {
  n: 9,
  id: 'u09',
  title: 'Leitura clássica e textura',
  goal: 'Reconhecer notas estranhas, equilibrar melodia e acompanhamento, conduzir quatro vozes, ler à primeira vista com as duas mãos, tocar ornamentos, duas vozes independentes e 2 contra 3.',
  technique: 'Escalas maiores em 2 oitavas, mãos juntas, de 60 rumo a 92 BPM em colcheias; trinados medidos (6 notas ou mais, variação abaixo de 30 ms) (referência: RCM Level 3). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l66, l67, l68, l69, l70, l71, l72, l73],
  songs: [minuet, sonatina, canon],
  final: {
    songId: 'u09-minueto',
    brief: 'O Minueto em Sol do Caderno de Anna Magdalena Bach (hoje atribuído a Christian Petzold): dança em 3/4, melodia com notas de passagem e bordaduras, frases de 4 compassos, cadência no V no compasso 8 e no I no 16. Toque leve, com o primeiro tempo de cada compasso um pouco mais apoiado, como numa dança.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [strangePlay, strangeName, fourVoices, fourVoicesLong];

