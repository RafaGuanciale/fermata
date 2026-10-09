// Unidade 9 — Leitura clássica intermediária, textura e polifonia (lições 66 a 73). Projeto final: Minueto em Sol, BWV Anh. 114.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { chordSequence, choice, mix, nonChordTones, type ChoiceQuestion, type StrangeKind } from '../gens';
import { melodyTask, twoHandTask } from '../tasks';
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

const unit: Unit = {
  n: 9,
  id: 'u09',
  title: 'Leitura clássica e textura',
  goal: 'Reconhecer notas estranhas, equilibrar melodia e acompanhamento, conduzir quatro vozes, ler à primeira vista com as duas mãos, tocar ornamentos, duas vozes independentes e 2 contra 3.',
  technique: 'Escalas maiores em 2 oitavas, mãos juntas, de 60 rumo a 92 BPM em colcheias; trinados medidos (6 notas ou mais, variação abaixo de 30 ms) (referência: RCM Level 3). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l66, l67, l68],
  songs: [minuet, sonatina],
  final: {
    songId: 'u09-minueto',
    brief: 'O Minueto em Sol do Caderno de Anna Magdalena Bach (hoje atribuído a Christian Petzold): dança em 3/4, melodia com notas de passagem e bordaduras, frases de 4 compassos, cadência no V no compasso 8 e no I no 16. Toque leve, com o primeiro tempo de cada compasso um pouco mais apoiado, como numa dança.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [strangePlay, strangeName, fourVoices, fourVoicesLong];

