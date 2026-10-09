// Unidade 7 — Campo harmônico, funções e cadências (lições 50 a 57). Projeto final: Prelúdio em Dó, BWV 846 (Bach), 8 primeiros compassos simplificados.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import {
  choice, diatonicByEar, diatonicChord, fieldSequence, harmonizeAny, mix, substituteChoice, transposeDiatonic, type ChoiceQuestion, type Roman,
} from '../gens';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, SongSpec, Unit } from '../types';

// ---------- escrita ----------

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

const items = (title: string, how: string, gen: ItemGen, count: number, low: Midi, high: Midi, accuracy = 0.85, labels: 'on' | 'fade' | 'off' = 'fade', avgMs?: number): Exercise => ({
  kind: 'items', title, how, gen, count, low, high, labels, pass: avgMs ? { accuracy, avgMs } : { accuracy },
});

const KEYS5 = ['C', 'G', 'D', 'F', 'Bb'];

// ---------- perguntas ----------

const FIELD_Q: ChoiceQuestion[] = [
  { q: 'No campo harmônico maior, os acordes maiores são…', options: ['I, IV e V', 'ii, iii e vi', 'I, ii e iii'], answer: 0, why: 'Os três primários. ii, iii e vi são menores; vii° é diminuto.' },
  { q: 'O acorde diminuto do campo maior está no…', options: ['vii°', 'ii', 'iv'], answer: 0, why: 'Em Dó: Si–Ré–Fá.' },
  { q: 'Em Sol maior, o vi é…', options: ['Em', 'E', 'Am'], answer: 0, why: 'Mi, Sol, Si: menor, e é a relativa menor de Sol.' },
  { q: 'Por que as qualidades se repetem em todos os tons?', options: ['A fórmula da escala é a mesma, então as terças empilhadas também', 'Por convenção', 'Só se repetem em Dó'], answer: 0, why: 'T T S T T T S em qualquer tônica: o 2º grau sempre terá 3ª menor em cima, etc.' },
  { q: 'Em Fá maior, o IV é…', options: ['B♭', 'B', 'Bm'], answer: 0, why: 'Si♭, Ré, Fá: o Si♭ é da armadura.' },
  { q: 'Em Ré maior, o vii° é…', options: ['C♯°', 'C°', 'D°'], answer: 0, why: 'Dó♯, Mi, Sol: a sensível de Ré.' },
];

const ROMAN_Q: ChoiceQuestion[] = [
  { q: 'Cifra (C, Am) e grau (I, vi): qual muda quando se transpõe?', options: ['A cifra; o grau fica igual', 'O grau; a cifra fica igual', 'Os dois'], answer: 0, why: 'Graus são relativos à tônica; cifras são nomes absolutos.' },
  { q: 'Em algarismos romanos, letra minúscula indica…', options: ['Acorde menor', 'Acorde mais grave', 'Acorde com 7ª'], answer: 0, why: 'ii, iii, vi minúsculos (menores); I, IV, V maiúsculos (maiores).' },
  { q: 'G – Em – C – D em Sol maior é…', options: ['I – vi – IV – V', 'I – iii – IV – V', 'V – iii – I – ii'], answer: 0, why: 'Sol = I, Mi menor = vi, Dó = IV, Ré = V.' },
  { q: 'Dm – G7 – C em Dó maior é…', options: ['ii – V7 – I', 'iv – V – I', 'ii – IV – I'], answer: 0, why: 'A cadência mais comum do jazz e da bossa.' },
  { q: 'I – vi – ii – V em Fá maior é…', options: ['F – Dm – Gm – C', 'F – D – G – C', 'F – Am – Gm – C'], answer: 0, why: 'Fá, Ré menor, Sol menor, Dó.' },
];

const FUNCTION_Q: ChoiceQuestion[] = [
  { q: 'Quais graus têm função de tônica?', options: ['I, vi e iii', 'IV e ii', 'V e vii°'], answer: 0, why: 'Repouso. O vi e o iii dividem duas notas com o I.' },
  { q: 'Quais graus têm função de subdominante?', options: ['IV e ii', 'I e vi', 'V e vii°'], answer: 0, why: 'Afastamento: saem de casa e preparam a dominante.' },
  { q: 'Quais graus têm função de dominante?', options: ['V e vii°', 'IV e ii', 'I e iii'], answer: 0, why: 'Tensão: têm a sensível e pedem a tônica.' },
  { q: 'Trocar o IV pelo ii mantém…', options: ['A função (subdominante)', 'A cifra', 'A tônica'], answer: 0, why: 'IV (Fá–Lá–Dó) e ii (Ré–Fá–Lá) dividem Fá e Lá.' },
  { q: 'O caminho típico das funções é…', options: ['T → S → D → T', 'D → S → T → D', 'T → D → S → T'], answer: 0, why: 'Casa, sai, tensão, volta. Ex.: I – IV – V – I, ou I – ii – V – I.' },
  { q: 'Para harmonizar um compasso de melodia, o acorde precisa…', options: ['Conter a nota do tempo forte', 'Conter todas as notas do compasso', 'Ser sempre o I'], answer: 0, why: 'As outras notas podem ser de passagem, nos tempos fracos.' },
];

// ---------- peças reaproveitadas ----------

const fieldRandom = diatonicChord({ keys: KEYS5, romans: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'], low: 48, high: 72 });
const fieldC = diatonicChord({ keys: ['C'], romans: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'], low: 48, high: 72 });
const fieldSeq = fieldSequence({ keys: KEYS5, dirs: ['subindo', 'descendo'] });
const fieldSeqC = fieldSequence({ keys: ['C', 'G'], dirs: ['subindo'] });

const PROGS: Roman[][] = [['I', 'vi', 'IV', 'V'], ['I', 'IV', 'ii', 'V'], ['I', 'vi', 'ii', 'V'], ['I', 'V', 'vi', 'IV'], ['I', 'iii', 'IV', 'V'], ['I', 'ii', 'V', 'I']];
const transpose = transposeDiatonic({ from: 'C', to: ['G', 'F', 'D', 'Bb'], progressions: PROGS });
const earBass = diatonicByEar({ keys: ['C', 'G', 'F'], progressions: [['I', 'vi', 'IV', 'V'], ['I', 'ii', 'V', 'I'], ['I', 'vi', 'ii', 'V'], ['I', 'IV', 'V', 'vi']], answer: 'bass' });
const earChords = diatonicByEar({ keys: ['C', 'G'], progressions: [['I', 'vi', 'IV', 'V'], ['I', 'ii', 'V', 'I'], ['I', 'vi', 'ii', 'V']], answer: 'chords' });

// Compassos de melodia em Dó (semínimas): a 1ª nota é o tempo forte.
const HARM_BARS: { notes: Midi[]; cadence?: Roman }[] = [
  { notes: [64, 65, 67, 64] }, { notes: [65, 64, 62, 60] }, { notes: [67, 69, 67, 65] }, { notes: [69, 67, 65, 64] },
  { notes: [62, 64, 65, 62] }, { notes: [60, 62, 64, 60] }, { notes: [71, 72, 74, 71] }, { notes: [72, 71, 69, 67] },
  { notes: [72, 67, 64, 60], cadence: 'I' },
];
const harmC = harmonizeAny({ key: 'C', bars: HARM_BARS });
const subIVii = substituteChoice({ keys: ['C', 'G', 'F'], pairs: [['IV', 'ii']] });
const subIvi = substituteChoice({ keys: ['C', 'G', 'F'], pairs: [['I', 'vi']] });

// ---------- lições ----------

const l50: Lesson = {
  n: 50,
  id: 'l50',
  title: 'Campo harmônico maior em tríades',
  minutes: 60,
  objectives: [
    'Consigo montar as 7 tríades do campo harmônico de qualquer tom maior até 2 acidentes.',
    'Consigo dizer a qualidade de cada grau sem pensar: I, IV e V maiores; ii, iii e vi menores; vii° diminuto.',
    'Consigo tocar qualquer grau pedido em Dó, Sol, Ré, Fá e Si♭ com 90% de acerto e menos de 2 s.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Uma tríade em cada degrau',
      body: `Pegue a escala de Dó maior e, sobre cada nota, empilhe duas terças **usando só notas da escala** (uma tecla branca sim, outra não). O resultado são sete tríades, uma por grau:

- **I**: Dó–Mi–Sol = **C**
- **ii**: Ré–Fá–Lá = **Dm**
- **iii**: Mi–Sol–Si = **Em**
- **IV**: Fá–Lá–Dó = **F**
- **V**: Sol–Si–Ré = **G**
- **vi**: Lá–Dó–Mi = **Am**
- **vii°**: Si–Ré–Fá = **B°**

Esse conjunto se chama **campo harmônico** de Dó maior: os acordes "da casa", que soam naturais juntos porque usam as mesmas sete notas. Quase toda música tonal simples usa só eles.

Repare no padrão de qualidades: **maior, menor, menor, maior, maior, menor, diminuto**. Os graus com letra maiúscula (I, IV, V) são maiores; os minúsculos (ii, iii, vi) são menores; o vii° é o único diminuto.`,
    },
    {
      kind: 'example',
      title: 'O campo de Dó, subindo',
      steps: [
        { say: 'I ii iii IV V vi vii° I. Ouça a cor de cada um: maior, menor, menor, maior, maior, menor, diminuto, maior.', play: { bpm: 80, steps: [[60, 64, 67], [62, 65, 69], [64, 67, 71], [65, 69, 72], [67, 71, 74], [69, 72, 76], [71, 74, 77], [72, 76, 79]].map((midis, i) => ({ midis, beats: i === 7 ? 3 : 1.5 })) } },
      ],
    },
    {
      kind: 'text',
      title: 'Por que o padrão é sempre o mesmo',
      body: `A escala maior tem sempre a mesma fórmula (T T S T T T S), qualquer que seja a tônica. As terças empilhadas sobre cada grau dependem só dessa fórmula, então **as qualidades se repetem em todos os tons**.

Em **Sol maior** (com Fá♯): **G – Am – Bm – C – D – Em – F♯°**.
Em **Fá maior** (com Si♭): **F – Gm – Am – B♭ – C – Dm – E°**.

Por isso basta saber duas coisas para montar o campo de qualquer tom: a **escala** (com a armadura) e o **padrão de qualidades**. O resto é consequência.

Um atalho de teclado: monte o I e "suba a mão" pela escala, sempre em posição fundamental, respeitando a armadura. Os dedos 1-3-5 ficam fixos; só o Fá♯ ou o Si♭ mudam a cor dos acordes que passam por eles.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer a armadura no meio do campo',
      body: 'Em Ré maior, o iii é F♯m (Fá♯–Lá–Dó♯), não Fm; e o vii° é C♯° (Dó♯–Mi–Sol). Antes de começar, diga em voz alta os acidentes do tom. No meio do campo, cada Fá e cada Dó precisam do sustenido.',
    },
    { kind: 'exercise', id: 'l50-sequencia', exercise: items('O campo subindo', 'Dó ou Sol maior: os sete graus e o I de novo, em ordem.', fieldSeqC, 4, 48, 84, 0.75) },
    { kind: 'exercise', id: 'l50-do', exercise: items('Graus em Dó, aleatórios', '"Toque o vi!": o grau pedido em Dó maior, qualquer posição.', fieldC, 14, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l50-tons', exercise: items('Graus em cinco tons', 'Dó, Sol, Ré, Fá ou Si♭ maior, grau sorteado.', fieldRandom, 16, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l50-desce', exercise: items('Subindo e descendo em cinco tons', 'O campo inteiro em ordem, tom e direção sorteados.', fieldSeq, 4, 48, 84, 0.75) },
    { kind: 'exercise', id: 'l50-quiz', exercise: quiz('Campo harmônico', 'Seis perguntas rápidas.', FIELD_Q) },
  ],
  review: [fieldRandom, fieldSeq, choice(FIELD_Q, 'campo')],
  checkpoint: [
    items('Graus aleatórios', '20 graus em Dó, Sol, Ré, Fá e Si♭, sem dicas. Meta: 90% e menos de 2 s.', fieldRandom, 20, 48, 72, 0.9, 'off', 2000),
  ],
  exit: [fieldRandom, choice(FIELD_Q, 'campo')],
};

const l51: Lesson = {
  n: 51,
  id: 'l51',
  title: 'Graus romanos e cifragem analítica',
  minutes: 60,
  objectives: [
    'Consigo analisar uma progressão em graus (C – Am – F – G = I – vi – IV – V).',
    'Consigo transpor uma progressão para outro tom pensando nos graus.',
    'Consigo ditar o baixo e os acordes de progressões com vi e ii.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Cifra é absoluta, grau é relativo',
      body: `Uma cifra (C, Am, G7) diz **quais notas** tocar. Um grau (I, vi, V7) diz **qual papel** o acorde tem dentro do tom. Os dois descrevem a mesma coisa de jeitos diferentes:

- Em Dó maior, **C – Am – F – G** é **I – vi – IV – V**.
- Em Sol maior, **G – Em – C – D** é... **I – vi – IV – V** também.

As cifras mudaram, os graus não. Por isso músicos falam de progressões em graus: "é um I–vi–IV–V", "é um ii–V–I". Quem pensa em graus transpõe na hora, toca de ouvido em qualquer tom e reconhece que duas músicas diferentes usam o mesmo esqueleto.

Escrever os graus embaixo das cifras de uma música se chama **cifragem analítica** (ou análise em graus).`,
    },
    {
      kind: 'text',
      title: 'Como analisar',
      body: `Três passos:

1. **Ache o tom**: a armadura e o acorde do fim (quase sempre o I) dão a pista. Uma música que termina em G, com um sustenido, está em Sol maior.
2. **Numere a escala**: Sol = 1, Lá = 2, Si = 3, Dó = 4, Ré = 5, Mi = 6, Fá♯ = 7.
3. **Para cada cifra, ache o número da fundamental** e use maiúscula ou minúscula conforme a qualidade: Em → Mi é 6, menor → **vi**.

Para **transpor**, faça o caminho de volta no tom novo: vi em Fá maior → 6º grau de Fá = Ré, menor → **Dm**.`,
    },
    {
      kind: 'example',
      title: 'Uma progressão em três tons',
      steps: [
        { say: 'Em Dó: C – Am – Dm – G7. Em graus: I – vi – ii – V7.', play: { bpm: 80, steps: [[48, 60, 64, 67], [45, 60, 64, 69], [50, 62, 65, 69], [43, 59, 62, 65, 67]].map((midis) => ({ midis, beats: 2 })) } },
        { say: 'Os mesmos graus em Fá: F – Dm – Gm – C7.', play: { bpm: 80, steps: [[41, 60, 65, 69], [50, 62, 65, 69], [43, 62, 67, 70], [48, 58, 64, 67]].map((midis) => ({ midis, beats: 2 })) } },
        { say: 'E em Sol: G – Em – Am – D7.', play: { bpm: 80, steps: [[43, 59, 62, 67], [40, 59, 64, 67], [45, 60, 64, 69], [50, 60, 62, 66]].map((midis) => ({ midis, beats: 2 })) } },
      ],
    },
    { kind: 'exercise', id: 'l51-transpor', exercise: items('Transponha pelos graus', 'A cifra está em Dó. Analise em graus e toque os mesmos graus no tom pedido.', transpose, 8, 48, 72, 0.85) },
    {
      kind: 'text',
      title: 'Ouvir o vi e o ii',
      body: `No ditado da Unidade 3 você ouvia só I, IV e V. Agora entram dois menores muito comuns:

- O **vi** soa como um "I triste": divide duas notas com o I (em Dó: Dó e Mi), mas o baixo desce para o Lá. Ouça o **baixo descendo uma 3ª** a partir do I.
- O **ii** soa como um "IV mais suave": divide duas notas com o IV (Fá e Lá) e quase sempre vai para o V. O baixo sobe um tom a partir do I.

Comece sempre pelo **baixo**: cante a nota mais grave de cada acorde e procure no teclado. Depois decida a qualidade (maior ou menor) pelo grau: no campo, cada baixo já diz qual acorde é.`,
    },
    { kind: 'exercise', id: 'l51-baixo', exercise: items('Ditado do baixo', 'Ouça 4 acordes e toque a fundamental de cada um, em ordem.', earBass, 8, 36, 72, 0.85, 'off') },
    { kind: 'exercise', id: 'l51-acordes', exercise: items('Ditado dos acordes', 'Agora os acordes inteiros, em ordem.', earChords, 6, 48, 72, 0.8, 'off') },
    { kind: 'exercise', id: 'l51-quiz', exercise: quiz('Graus e cifras', 'Cinco perguntas rápidas.', ROMAN_Q) },
  ],
  review: [transpose, earBass, choice(ROMAN_Q, 'graus')],
  checkpoint: [
    items('Transpor e ditar', '12 itens misturados, sem dicas. Meta: 85%.', mix([transpose, earBass, fieldRandom]), 12, 36, 72, 0.85, 'off'),
  ],
  exit: [transpose, choice(ROMAN_Q, 'graus')],
};

const l52: Lesson = {
  n: 52,
  id: 'l52',
  title: 'Funções harmônicas',
  minutes: 60,
  objectives: [
    'Consigo dizer a função (tônica, subdominante, dominante) de qualquer grau do campo.',
    'Consigo harmonizar um compasso de melodia escolhendo um acorde que contenha a nota do tempo forte.',
    'Consigo ouvir a diferença entre IV e ii, e entre I e vi, na mesma progressão.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Três papéis',
      body: `Os sete acordes do campo fazem só **três papéis**, chamados **funções**:

- **Tônica (T)**: repouso, casa. **I**, e também **vi** e **iii**, que dividem duas notas com o I.
- **Subdominante (S)**: afastamento, "sair de casa". **IV** e **ii** (dividem Fá e Lá, em Dó).
- **Dominante (D)**: tensão que pede a volta. **V** (e V7) e **vii°**, que têm a sensível (Si, em Dó).

O caminho mais comum de uma frase é **T → S → D → T**: sai de casa, prepara, cria tensão, volta. I – IV – V – I é exatamente isso, e também I – ii – V – I, I – vi – IV – V – I...

A grande consequência: **acordes da mesma função podem se substituir**. Onde cabe um IV, quase sempre cabe um ii; onde cabe um I, às vezes cabe um vi. É o primeiro passo para "rearmonizar", deixar uma melodia conhecida com cara nova.`,
    },
    {
      kind: 'example',
      title: 'A mesma frase, trocando dentro da função',
      steps: [
        { say: 'I – IV – V7 – I em Dó.', play: { bpm: 72, steps: [[48, 60, 64, 67], [41, 60, 65, 69], [43, 59, 62, 65], [48, 60, 64, 67]].map((midis, i) => ({ midis, beats: i === 3 ? 3 : 2 })) } },
        { say: 'I – ii – V7 – I: o ii no lugar do IV. Mesma função, cor mais suave.', play: { bpm: 72, steps: [[48, 60, 64, 67], [50, 62, 65, 69], [43, 59, 62, 65], [48, 60, 64, 67]].map((midis, i) => ({ midis, beats: i === 3 ? 3 : 2 })) } },
        { say: 'I – IV – V7 – vi: o vi no lugar do I final. A volta "engana": é tônica, mas não é casa.', play: { bpm: 72, steps: [[48, 60, 64, 67], [41, 60, 65, 69], [43, 59, 62, 65], [45, 60, 64, 69]].map((midis, i) => ({ midis, beats: i === 3 ? 3 : 2 })) } },
      ],
    },
    { kind: 'exercise', id: 'l52-iv-ii', exercise: items('IV ou ii?', 'O app toca I – ? – V7 – I. Diga qual foi o acorde do meio.', subIVii, 8, 48, 72, 0.75, 'off') },
    { kind: 'exercise', id: 'l52-i-vi', exercise: items('I ou vi?', 'Agora a troca na tônica.', subIvi, 8, 48, 72, 0.75, 'off') },
    {
      kind: 'text',
      title: 'Harmonizar pela nota do tempo forte',
      body: `Na Unidade 3 você harmonizou melodias só com I, IV e V7. Com o campo inteiro, as opções crescem, e a regra fica:

1. Olhe a nota do **tempo forte** (o 1º tempo do compasso).
2. Escolha **qualquer acorde do campo que contenha essa nota**.
3. As outras notas do compasso podem ficar fora do acorde, se estiverem em tempo fraco e andando por grau conjunto: são **notas de passagem**.

Exemplo: compasso com **Mi**–Fá–Sol–Mi. O Mi está em **C** (Dó–Mi–Sol), em **Em** (Mi–Sol–Si) e em **Am** (Lá–Dó–Mi). Os três servem; cada um dá uma cor. O Fá, no tempo fraco, é passagem.

Por isso harmonizar não tem uma resposta só. O exercício aceita qualquer acorde válido; depois de acertar, a dica mostra as outras opções.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'escolha pela função',
      body: 'Entre os acordes que servem, escolha pela função: no começo da frase, tônica; no meio, subdominante; perto do fim, dominante; no último compasso, o I. Assim a harmonia anda T → S → D → T mesmo quando cada compasso tem várias opções.',
    },
    { kind: 'exercise', id: 'l52-harmonizar', exercise: items('Harmonize o compasso', 'Toque um acorde do campo de Dó que contenha a nota do tempo forte. Vários servem.', harmC, 12, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l52-quiz', exercise: quiz('Funções', 'Seis perguntas rápidas.', FUNCTION_Q) },
  ],
  review: [harmC, subIVii, choice(FUNCTION_Q, 'funcoes')],
  checkpoint: [
    items('Harmonizar e ouvir funções', '14 itens, sem dicas. Meta: 85%.', mix([harmC, harmC, subIVii, subIvi, fieldRandom]), 14, 48, 72, 0.85, 'off'),
  ],
  exit: [harmC, choice(FUNCTION_Q, 'funcoes')],
};

// ---------- músicas ----------

// Prelúdio em Dó, BWV 846 (J. S. Bach, Cravo Bem Temperado I, 1722): 8 primeiros compassos.
// Arranjo do Fermata: o desenho de cada compasso aparece uma vez (não duas), em colcheias.
const PRELUDE: [string, string, string[]][] = [
  ['C4', 'E4', ['G4', 'C5', 'E5']],
  ['C4', 'D4', ['A4', 'D5', 'F5']],
  ['B3', 'D4', ['G4', 'D5', 'F5']],
  ['C4', 'E4', ['G4', 'C5', 'E5']],
  ['C4', 'E4', ['A4', 'E5', 'A5']],
  ['C4', 'D4', ['F#4', 'A4', 'D5']],
  ['B3', 'D4', ['G4', 'D5', 'G5']],
  ['B3', 'C4', ['E4', 'G4', 'C5']],
];
const PRELUDE_R = PRELUDE.map(([, , up]) => `r:1 ${[...up, ...up].map((x) => `${x}:0.5`).join(' ')}`).join(' | ') + ' | C4+E4+G4+C5:4';
const PRELUDE_L = PRELUDE.map(([a, b]) => `${a}:0.5 ${b}:0.5 r:3`).join(' | ') + ' | C3:4';

const prelude: SongSpec = {
  id: 'u07-preludio',
  title: 'Prelúdio em Dó, BWV 846 (8 compassos)',
  composer: 'Johann Sebastian Bach',
  arrangement: 'arranjo do Fermata: os 8 primeiros compassos, com o desenho de cada compasso uma vez em colcheias (no original ele se repete em semicolcheias) e um acorde final em Dó; pedal a cada compasso',
  bpm: 66,
  beatsPerBar: 4,
  fifths: 0,
  right: PRELUDE_R,
  left: PRELUDE_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const unit: Unit = {
  n: 7,
  id: 'u07',
  title: 'Campo harmônico e funções',
  goal: 'Montar o campo harmônico de qualquer tom maior, analisar e transpor em graus, harmonizar por funções, reconhecer cadências e as progressões mais usadas.',
  technique: 'Escalas maiores em 2 oitavas, mãos juntas em movimento paralelo (Dó, Sol, Fá e Lá menor), em colcheias de 56 rumo a 80 BPM, variação abaixo de 35 ms (referência: RCM Level 2). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l50, l51, l52],
  songs: [prelude],
  final: {
    songId: 'u07-preludio',
    brief: 'Os 8 primeiros compassos do Prelúdio em Dó de Bach: cada compasso é um acorde quebrado, e a harmonia anda pelo campo de Dó (I – ii7 – V7 – I – vi – Ré com Fá♯ – V – I7M) com o baixo quase parado. O Ré com Fá♯ é uma "dominante da dominante", que a Unidade 10 explica. É a peça perfeita para ouvir funções e cadências, e para treinar o pedal a cada compasso.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [fieldRandom, fieldC, fieldSeq, fieldSeqC, transpose, earBass, earChords, harmC, subIVii, subIvi];
