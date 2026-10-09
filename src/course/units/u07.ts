// Unidade 7 — Campo harmônico, funções e cadências (lições 50 a 57). Projeto final: Prelúdio em Dó, BWV 846 (Bach), 8 primeiros compassos simplificados.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import {
  cadenceChoice, chordSequence, completePhrase, playCadence, choice, diatonicByEar, diatonicChord, fieldSequence, harmonizeAny, mix, substituteChoice, transposeDiatonic, type ChoiceQuestion, type Roman,
} from '../gens';
import { pick } from '../music';
import { melodyTask, sci, twoHandTask } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

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

const CADENCE_Q: ChoiceQuestion[] = [
  { q: 'A cadência perfeita é…', options: ['V (ou V7) → I, os dois na posição fundamental', 'IV → I', 'Qualquer coisa → V'], answer: 0, why: 'É o ponto final: a mais conclusiva de todas.' },
  { q: 'A cadência plagal é…', options: ['IV → I', 'V → vi', 'I → V'], answer: 0, why: 'O "amém" dos hinos: repouso sem a tensão da sensível.' },
  { q: 'A meia cadência (semicadência) termina…', options: ['No V', 'No I', 'No vi'], answer: 0, why: 'É uma vírgula, ou um ponto de interrogação: a frase pede continuação.' },
  { q: 'A cadência deceptiva (interrompida) é…', options: ['V → vi', 'V → I', 'IV → V'], answer: 0, why: 'A dominante promete o I e entrega o vi: a frase continua.' },
  { q: 'A cadência imperfeita é…', options: ['V → I com inversão, ou com a melodia fora da tônica', 'IV → I', 'V → IV'], answer: 0, why: 'Conclui, mas menos que a perfeita: um ponto e vírgula.' },
  { q: 'Que cadência fecha bem o final de uma música?', options: ['Perfeita', 'Meia cadência', 'Deceptiva'], answer: 0, why: 'As outras deixam a frase aberta ou adiam o fim.' },
];

const PROG_Q: ChoiceQuestion[] = [
  { q: 'I – V – vi – IV em Dó é…', options: ['C – G – Am – F', 'C – F – G – Am', 'C – Am – F – G'], answer: 0, why: 'A progressão do pop dos últimos 50 anos.' },
  { q: 'I – vi – IV – V é a progressão…', options: ['Dos anos 50 (doo-wop)', 'Do blues', 'Andaluza'], answer: 0, why: 'C – Am – F – G: baladas e rock dos anos 50 e 60.' },
  { q: 'A "Royal Road" (progressão do J-pop e do anime) é…', options: ['IV – V – iii – vi', 'I – V – vi – IV', 'ii – V – I'], answer: 0, why: 'Em Dó: F – G – Em – Am. Começa fora de casa e termina no vi, sem resolver.' },
  { q: 'A cadência andaluza, em Lá menor, é…', options: ['Am – G – F – E', 'Am – Dm – E – Am', 'A – D – E'], answer: 0, why: 'i – ♭VII – ♭VI – V: o baixo desce Lá, Sol, Fá, Mi. Flamenco, rock, trilha.' },
  { q: 'vi – IV – I – V é…', options: ['Uma rotação de I – V – vi – IV', 'Uma progressão em menor sem relação', 'A Royal Road'], answer: 0, why: 'Os mesmos 4 acordes começando do vi: soa mais melancólico.' },
];

const cadenceEar = cadenceChoice({ keys: ['C', 'G', 'F'], kinds: ['perfeita', 'plagal', 'meia', 'deceptiva'] });
const cadencePlay = playCadence({ keys: ['C', 'G', 'F', 'D', 'Bb'], kinds: ['perfeita', 'plagal', 'meia', 'deceptiva'] });

const l53: Lesson = {
  n: 53,
  id: 'l53',
  title: 'Cadências',
  minutes: 60,
  objectives: [
    'Consigo tocar cadência perfeita, plagal, meia e deceptiva em qualquer tom maior até 2 acidentes.',
    'Consigo reconhecer de ouvido qual cadência fecha uma frase, com 85% de acerto.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A pontuação da música',
      body: `Uma frase musical termina como uma frase falada: com ponto final, vírgula, ponto de interrogação ou reticências. Quem faz essa pontuação são os **dois últimos acordes** da frase, a **cadência**.

- **Perfeita** (V ou V7 → I, ambos na posição fundamental, de preferência com a tônica na melodia): **ponto final**. Em Dó: G7 → C.
- **Imperfeita** (V → I, mas com um dos acordes invertido ou a melodia na 3ª ou na 5ª): conclui, mas menos. **Ponto e vírgula**.
- **Plagal** (IV → I): o "**amém**" do fim dos hinos. Conclui sem a tensão da sensível, com um repouso suave. Em Dó: F → C.
- **Meia cadência**, ou semicadência (qualquer acorde → **V**): a frase para na dominante. **Vírgula**, ou **pergunta**. Em Dó: F → G, ou Dm → G.
- **Deceptiva**, ou interrompida (V → **vi**): a dominante promete o I e entrega o vi. **Reticências**: a música engana o ouvido e segue. Em Dó: G7 → Am.`,
    },
    {
      kind: 'example',
      title: 'Quatro finais para a mesma frase',
      steps: [
        { say: 'Perfeita: I – IV – V7 – I.', play: { bpm: 72, steps: [[48, 60, 64, 67], [41, 60, 65, 69], [43, 59, 62, 65], [48, 60, 64, 67]].map((midis, i) => ({ midis, beats: i === 3 ? 3 : 2 })) } },
        { say: 'Plagal: I – vi – IV – I.', play: { bpm: 72, steps: [[48, 60, 64, 67], [45, 60, 64, 69], [41, 60, 65, 69], [48, 60, 64, 67]].map((midis, i) => ({ midis, beats: i === 3 ? 3 : 2 })) } },
        { say: 'Meia cadência: I – vi – ii – V. Fica no ar.', play: { bpm: 72, steps: [[48, 60, 64, 67], [45, 60, 64, 69], [50, 62, 65, 69], [43, 59, 62, 67]].map((midis, i) => ({ midis, beats: i === 3 ? 3 : 2 })) } },
        { say: 'Deceptiva: I – IV – V7 – vi. Repare no baixo subindo Sol → Lá em vez de cair no Dó.', play: { bpm: 72, steps: [[48, 60, 64, 67], [41, 60, 65, 69], [43, 59, 62, 65], [45, 60, 64, 69]].map((midis, i) => ({ midis, beats: i === 3 ? 3 : 2 })) } },
      ],
    },
    { kind: 'exercise', id: 'l53-tocar', exercise: items('Toque a cadência pedida', 'Os dois acordes da cadência, em ordem, no tom pedido.', cadencePlay, 12, 48, 72, 0.85) },
    {
      kind: 'text',
      title: 'Ouvir a cadência',
      body: `Para reconhecer de ouvido, pergunte nesta ordem:

1. **O último acorde soa como casa?** Se não: é **meia cadência** (parou no V, tenso) ou **deceptiva** (parou num acorde menor, "triste", que não é a casa).
2. Se soa como casa: o penúltimo tinha **tensão** puxando (a sensível subindo, o trítono resolvendo)? Então é **perfeita**. Se a chegada foi suave, sem puxão, é **plagal**.

Entre meia e deceptiva, ouça o baixo: na meia, ele termina **uma 5ª acima** da tônica (o V); na deceptiva, ele **sobe um passo** a partir do V (Sol → Lá, em Dó).`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'confundir plagal e perfeita',
      body: 'As duas terminam no I. A diferença está no penúltimo acorde: V7 tem o Si (a sensível) e o Fá (a 7ª), que puxam com força; IV não tem sensível e chega "de lado". Se tiver dúvida, cante o Si: se ele estava lá, é perfeita.',
    },
    { kind: 'exercise', id: 'l53-ouvido', exercise: items('Que cadência foi?', 'Ouça a frase de 4 acordes e escolha a cadência do fim.', cadenceEar, 12, 48, 72, 0.85, 'off') },
    { kind: 'exercise', id: 'l53-quiz', exercise: quiz('Cadências', 'Seis perguntas rápidas.', CADENCE_Q) },
  ],
  review: [cadencePlay, cadenceEar, choice(CADENCE_Q, 'cadencias')],
  checkpoint: [
    items('Cadências tocadas e ouvidas', '14 itens, sem dicas. Meta: 85%.', mix([cadencePlay, cadenceEar]), 14, 48, 72, 0.85, 'off'),
  ],
  exit: [cadenceEar, choice(CADENCE_Q, 'cadencias')],
};

const ROYAL: Record<string, string[]> = { C: ['F', 'G', 'Em', 'Am'], G: ['C', 'D', 'Bm', 'Em'], D: ['G', 'A', 'F#m', 'Bm'], F: ['Bb', 'C', 'Am', 'Dm'] };
const ANDALUZA: Record<string, string[]> = { Am: ['Am', 'G', 'F', 'E'], Dm: ['Dm', 'C', 'Bb', 'A'], Em: ['Em', 'D', 'C', 'B'] };
const KEY_NAME: Record<string, string> = { C: 'Dó maior', G: 'Sol maior', D: 'Ré maior', F: 'Fá maior', Am: 'Lá menor', Dm: 'Ré menor', Em: 'Mi menor' };
const royalLead = chordSequence({ sequences: Object.entries(ROYAL).map(([k, s]) => ({ name: `Royal Road em ${KEY_NAME[k]}.`, symbols: s })), lead: 2 });
const royalTwice = chordSequence({ sequences: Object.entries(ROYAL).map(([k, s]) => ({ name: `Royal Road em ${KEY_NAME[k]}, duas vezes.`, symbols: [...s, ...s] })), lead: 2 });
const andaluzaLead = chordSequence({ sequences: Object.entries(ANDALUZA).map(([k, s]) => ({ name: `Andaluza em ${KEY_NAME[k]}.`, symbols: s })), lead: 2 });
const popEar = diatonicByEar({ keys: ['C', 'G'], progressions: [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['IV', 'V', 'iii', 'vi']], answer: 'chords' });
const popEarBass = diatonicByEar({ keys: ['C', 'G', 'F'], progressions: [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['IV', 'V', 'iii', 'vi']], answer: 'bass' });

const l54: Lesson = {
  n: 54,
  id: 'l54',
  title: 'As progressões do pop, do anime e do cinema',
  minutes: 60,
  objectives: [
    'Consigo reconhecer e tocar I–V–vi–IV e suas rotações, I–vi–IV–V, a Royal Road (IV–V–iii–vi) e a andaluza.',
    'Consigo ditar essas progressões tocando, com 85% de acerto.',
    'Consigo tocar a Royal Road conduzida em dois tons sorteados.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Quatro acordes, mil canções',
      body: `Boa parte da música popular é construída sobre poucas progressões de quatro acordes, repetidas em loop. Conhecê-las em graus é como conhecer as palavras mais comuns de uma língua: você passa a ouvi-las em todo lugar.

- **I – V – vi – IV** (C – G – Am – F): a do pop. Suas **rotações** são os mesmos acordes começando em outro ponto: **vi – IV – I – V** (Am – F – C – G) soa mais melancólica; **IV – I – V – vi** soa como quem está sempre chegando.
- **I – vi – IV – V** (C – Am – F – G): a dos anos 50, das baladas de doo-wop e do rock antigo. Também aparece como **I – vi – ii – V**, a base dos "standards".
- **IV – V – iii – vi** (F – G – Em – Am): a **Royal Road** (王道進行, "caminho real"), espinha de muitas canções de J-pop e aberturas de anime. Começa **fora de casa** (no IV), sobe para o V e, em vez de resolver no I, cai no iii e no vi. A sensação é de saudade e de impulso ao mesmo tempo.
- **i – ♭VII – ♭VI – V** (Am – G – F – E): a **cadência andaluza**, do flamenco ao rock e às trilhas de cinema. O baixo desce Lá, Sol, Fá, Mi, e o V maior (com Sol♯) chega tenso, pedindo para recomeçar.`,
    },
    {
      kind: 'example',
      title: 'As quatro, em Dó (e Lá menor)',
      steps: [
        { say: 'I – V – vi – IV.', play: { bpm: 88, steps: [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]].map((midis) => ({ midis, beats: 2 })) } },
        { say: 'I – vi – IV – V.', play: { bpm: 88, steps: [[48, 60, 64, 67], [45, 60, 64, 69], [41, 60, 65, 69], [43, 59, 62, 67]].map((midis) => ({ midis, beats: 2 })) } },
        { say: 'Royal Road: IV – V – iii – vi.', play: { bpm: 88, steps: [[41, 60, 65, 69], [43, 59, 62, 67], [40, 59, 64, 67], [45, 60, 64, 69]].map((midis) => ({ midis, beats: 2 })) } },
        { say: 'Andaluza: Am – G – F – E.', play: { bpm: 88, steps: [[45, 60, 64, 69], [43, 59, 62, 67], [41, 57, 60, 65], [40, 56, 59, 64]].map((midis) => ({ midis, beats: 2 })) } },
      ],
    },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'por que a Royal Road não cansa',
      body: 'Ela evita o I. O IV e o V preparam uma chegada em casa, mas o iii (que divide duas notas com o I) desvia para o vi. O ouvido fica sempre esperando a resolução, e o loop recomeça antes dela vir. É a mesma ideia da cadência deceptiva, estendida a uma progressão inteira.',
    },
    { kind: 'exercise', id: 'l54-baixo', exercise: items('Ditado do baixo', 'Ouça e toque a fundamental de cada acorde. O primeiro acorde pode não ser o I.', popEarBass, 8, 36, 72, 0.85, 'off') },
    { kind: 'exercise', id: 'l54-acordes', exercise: items('Ditado dos acordes', 'Ouça e toque os 4 acordes, em ordem.', popEar, 8, 48, 72, 0.85, 'off') },
    {
      kind: 'text',
      title: 'Royal Road e andaluza conduzidas',
      body: `Na Royal Road, a condução fica bonita. Em Dó, a partir de **Dó–Fá–Lá** (F):

- **G**: **Si–Ré–Sol**. O IV e o V não têm nota comum, então as três vozes andam (6 semitons ao todo, o mínimo possível aqui).
- **Em**: **Si–Mi–Sol**. Si e Sol ficam; só o Ré sobe para Mi.
- **Am**: **Dó–Mi–Lá**. O Mi fica; Si sobe para Dó, Sol sobe para Lá.

Na andaluza, a direita pode descer em paralelo com o baixo, tudo junto: Lá–Dó–Mi, Sol–Si–Ré, Fá–Lá–Dó, Mi–Sol♯–Si. Mas conduzida é mais elegante: Dó–Mi–Lá → Si–Ré–Sol → Dó–Fá–Lá → Si–Mi–Sol♯.

O exercício mede a condução como na lição 44: no máximo 2 semitons além do caminho mais curto em cada troca.`,
    },
    { kind: 'exercise', id: 'l54-royal', exercise: items('Royal Road conduzida', 'Tom sorteado. Três notas por acorde; notas comuns ficam.', royalLead, 6, 48, 84, 0.85) },
    { kind: 'exercise', id: 'l54-andaluza', exercise: items('Andaluza conduzida', 'Lá, Ré ou Mi menor. O último acorde é maior (com a sensível).', andaluzaLead, 6, 48, 84, 0.85) },
    { kind: 'exercise', id: 'l54-quiz', exercise: quiz('Progressões', 'Cinco perguntas rápidas.', PROG_Q) },
  ],
  review: [popEar, royalLead, choice(PROG_Q, 'progressoes')],
  checkpoint: [
    items('Ditado', '8 progressões, sem dicas. Meta: 85%.', mix([popEar, popEarBass]), 8, 36, 72, 0.85, 'off'),
    items('Royal Road em 2 tons', 'Dois ciclos seguidos, tom sorteado, conduzidos. Duas progressões.', royalTwice, 2, 48, 84, 1, 'off'),
  ],
  exit: [popEarBass, choice(PROG_Q, 'progressoes')],
};

/** Escala de 2 oitavas em colcheias: sobe 2 compassos (15 notas e uma pausa), desce 2, termina na tônica. */
function twoOctaves(tonic: Midi, steps: number[]): string {
  const up = [...steps.slice(0, 7), ...steps.slice(0, 7).map((x) => x + 12), 24];
  const down = [...up].reverse();
  const u = up.map((x) => `${sci(tonic + x)}:0.5`);
  const d = down.map((x) => `${sci(tonic + x)}:0.5`);
  return `${u.slice(0, 8).join(' ')} | ${u.slice(8).join(' ')} r:0.5 | ${d.slice(0, 8).join(' ')} | ${d.slice(8).join(' ')} r:0.5 | ${sci(tonic)}:4`;
}
const MAJ_ST = [0, 2, 4, 5, 7, 9, 11];
const HMIN_ST = [0, 2, 3, 5, 7, 8, 11];
const SCALES2: Record<string, { r: Midi; l: Midi; st: number[]; fifths: number; name: string }> = {
  C: { r: 60, l: 48, st: MAJ_ST, fifths: 0, name: 'Dó maior' },
  G: { r: 55, l: 43, st: MAJ_ST, fifths: 1, name: 'Sol maior' },
  F: { r: 53, l: 41, st: MAJ_ST, fifths: -1, name: 'Fá maior' },
  Am: { r: 57, l: 45, st: HMIN_ST, fifths: 0, name: 'Lá menor harmônica' },
};
const parallel = (key: string, bpm: number) => {
  const s = SCALES2[key];
  return twoHandTask(twoOctaves(s.r, s.st), twoOctaves(s.l, s.st), { bpm, fifths: s.fifths, caption: `${s.name}, 2 oitavas, mãos juntas em movimento paralelo. A pauta mostra a direita.` });
};

const SCALE2_Q: ChoiceQuestion[] = [
  { q: 'Dó maior, 2 oitavas, mão direita, subindo:', options: ['1 2 3 1 2 3 4 1 2 3 1 2 3 4 5', '1 2 3 4 5 1 2 3 4 5 1 2 3 4 5', '1 2 3 1 2 3 1 2 3 1 2 3 4 5'], answer: 0, why: 'Polegar no Dó, Fá, Dó, Fá; o 4 no Si do meio.' },
  { q: 'Dó maior, 2 oitavas, mão esquerda, subindo:', options: ['5 4 3 2 1 3 2 1 4 3 2 1 3 2 1', '5 4 3 2 1 4 3 2 1 3 2 1 3 2 1', '1 2 3 1 2 3 4 1 2 3 1 2 3 4 5'], answer: 0, why: 'O 3 cruza no Lá, o 4 cruza no Sol do meio, o 3 cruza no Lá de cima.' },
  { q: 'Fá maior, mão direita, subindo:', options: ['1 2 3 4 1 2 3 1 2 3 4 1 2 3 4', '1 2 3 1 2 3 4 1 2 3 1 2 3 4 5', '2 1 2 3 1 2 3 4'], answer: 0, why: 'O 4 fica no Si♭ (preta) e o polegar passa no Dó.' },
  { q: 'Em movimento paralelo, os polegares…', options: ['Passam em momentos diferentes nas duas mãos', 'Passam juntos', 'Não passam'], answer: 0, why: 'Por isso o paralelo é mais difícil que o contrário: cada mão tem seu momento.' },
];

const l55: Lesson = {
  n: 55,
  id: 'l55',
  title: 'Escalas em 2 oitavas, mãos juntas',
  minutes: 60,
  objectives: [
    'Consigo tocar Dó, Sol e Fá maior e Lá menor harmônica em 2 oitavas, mãos juntas em movimento paralelo.',
    'Consigo 3 passadas limpas seguidas a 60 BPM em colcheias, com variação abaixo de 35 ms e as mãos juntas em ±40 ms.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Duas oitavas, duas mãos',
      body: `Até aqui as escalas foram de uma oitava, e mãos juntas só em movimento contrário (lição 31). Agora: **2 oitavas**, **movimento paralelo**, as duas mãos subindo e descendo juntas, uma oitava de distância.

Os dedilhados de 2 oitavas repetem o de uma oitava, com o 4 no lugar do 5 no meio (para o polegar poder continuar):

- **Dó, Sol e Lá menor**, direita: **1 2 3 · 1 2 3 4 · 1 2 3 · 1 2 3 4 5**.
- **Dó, Sol e Lá menor**, esquerda: **5 4 3 2 1 · 3 2 1 · 4 3 2 1 · 3 2 1**.
- **Fá maior**, direita: **1 2 3 4 · 1 2 3 · 1 2 3 4 · 1 2 3 4** (o 4 no Si♭). Esquerda: igual a Dó.

O desafio do paralelo é que **os polegares não passam ao mesmo tempo**. Subindo em Dó, a direita passa o polegar no Fá enquanto a esquerda cruza o 3 no Lá. Cada mão tem seu momento, e as duas precisam continuar soando como uma só.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'onde as mãos se encontram',
      body: 'Ache os pontos em que as duas usam o mesmo dedo: em Dó maior subindo, os dois polegares coincidem no Dó do meio e o 3 das duas no Mi. Use esses pontos como "âncoras": toque devagar parando neles, depois ligue.',
    },
    { kind: 'exercise', id: 'l55-quiz', exercise: quiz('Dedilhados de 2 oitavas', 'Quatro perguntas, antes de tocar.', SCALE2_Q, 0.75) },
    { kind: 'exercise', id: 'l55-do-md', exercise: quickTimed('Dó maior, 2 oitavas, direita', 'Só a direita, colcheias, de 56 a 72 BPM. Variação até 35 ms.', () => melodyTask(twoOctaves(60, MAJ_ST), { bpm: 56 }), { ladder: { from: 56, to: 72, step: 4 }, evenness: 35 }) },
    { kind: 'exercise', id: 'l55-do-mj', exercise: quickTimed('Dó maior, mãos juntas', 'Paralelo, de 50 a 66 BPM. Mãos juntas em ±40 ms, variação até 35 ms.', () => parallel('C', 50), { ladder: { from: 50, to: 66, step: 4 }, window: 40, evenness: 35 }) },
    { kind: 'exercise', id: 'l55-sorteada', exercise: quickTimed('Sol, Fá ou Lá menor, mãos juntas', 'Tom sorteado, de 50 a 60 BPM.', (rng) => parallel(pick(rng, ['G', 'F', 'Am']), 50), { ladder: { from: 50, to: 60, step: 5 }, window: 40, evenness: 35 }) },
    {
      kind: 'text',
      title: 'O trilho técnico daqui em diante',
      body: `A meta desta lição é **60 BPM** em colcheias. A referência de nível (RCM Level 2) pede **80 BPM**, e isso é trabalho de semanas, não de uma lição: entra no **trilho técnico**, nos dias sem lição nova.

Um roteiro que funciona: 5 minutos por dia, uma escala por dia (Dó, Sol, Fá, Lá menor em rodízio), começando 8 BPM abaixo do último andamento limpo e subindo 4 BPM a cada 3 passadas limpas. Quando travar, use **ritmos variados**: pontuado (longa-curta) e o contrário (curta-longa). Depois de alguns dias, a escala reta volta mais igual.

Lembre do limite de saúde: se o polegar ou o antebraço doer, o andamento não sobe.`,
    },
  ],
  review: [choice(SCALE2_Q, 'escalas-2-oitavas'), cadencePlay],
  checkpoint: [
    quickTimed('3 passadas a 60 BPM', 'Dó maior, mãos juntas, paralelo, sem dicas. 3 passadas limpas seguidas, ±40 ms, variação até 35 ms.', () => parallel('C', 60), { reps: 3, window: 40, evenness: 35 }),
  ],
  exit: [choice(SCALE2_Q, 'escalas-2-oitavas')],
};

const PERIOD_Q: ChoiceQuestion[] = [
  { q: 'Um período tem…', options: ['Antecedente e consequente', 'Introdução e refrão', 'Só uma frase'], answer: 0, why: 'Pergunta e resposta, geralmente 4 + 4 compassos.' },
  { q: 'O antecedente costuma terminar…', options: ['No V (meia cadência)', 'No I (cadência perfeita)', 'No vi'], answer: 0, why: 'Ele pergunta: para na dominante, em suspenso.' },
  { q: 'O consequente costuma terminar…', options: ['No I (cadência perfeita)', 'No V', 'No IV'], answer: 0, why: 'Ele responde: volta para casa.' },
  { q: 'Nota de passagem é…', options: ['Nota fora do acorde, em tempo fraco, entre duas notas por grau conjunto', 'Qualquer nota errada', 'A nota do tempo forte'], answer: 0, why: 'Mi–Fá–Sol sobre C: o Fá passa entre duas notas do acorde.' },
  { q: 'Período duplo é…', options: ['Dois períodos seguidos: 16 compassos', 'Um período tocado duas vezes mais rápido', 'Duas mãos'], answer: 0, why: 'Quatro frases: as três primeiras abertas ou parciais, a última fecha.' },
];

// Período de 8 compassos em Dó: antecedente termina no V, consequente no I.
const PERIOD_R = 'E4 G4 C5 G4 | A4 F4 A4 C5 | G4 E4 C4 E4 | F4 E4 D4:2 | E4 G4 C5 G4 | A4 F4 A4 C5 | D5 B4 G4 F4 | E4 D4 C4:2';
const PERIOD_L = 'C3+E3+G3:4 | C3+F3+A3:4 | C3+E3+G3:4 | B2+D3+G3:4 | C3+E3+G3:4 | C3+F3+A3:4 | B2+F3+G3:4 | C3+E3+G3:4';
const PERIOD_BARS: { notes: Midi[]; cadence?: Roman }[] = [
  { notes: [64, 67, 72, 67] }, { notes: [69, 65, 69, 72] }, { notes: [67, 64, 60, 64] }, { notes: [65, 64, 62], cadence: 'V' },
  { notes: [74, 71, 67, 65] }, { notes: [64, 62, 60], cadence: 'I' },
];
const harmPeriod = harmonizeAny({ key: 'C', bars: PERIOD_BARS });
const complete = completePhrase({
  phrases: [
    { notes: [64, 67, 72, 67, 69, 65, 69, 72, 67, 64, 60, 64, 65, 64], accept: [7, 11, 2], say: 'Antecedente em Dó: a frase pede uma vírgula.', why: 'Termine numa nota do V (Sol, Si ou Ré): meia cadência, a frase fica em suspenso.' },
    { notes: [64, 67, 72, 67, 69, 65, 69, 72, 74, 71, 67, 65, 64, 62], accept: [0, 4], say: 'Consequente em Dó: ponto final.', why: 'Termine na tônica (Dó) ou no Mi: cadência perfeita.' },
    { notes: [67, 71, 74, 71, 72, 69, 66], accept: [2, 6, 9], say: 'Antecedente em Sol maior.', why: 'Uma nota do V (Ré, Fá♯ ou Lá): a frase para na dominante.' },
    { notes: [74, 72, 71, 69, 67, 69, 71, 69], accept: [7, 11], say: 'Consequente em Sol maior.', why: 'Sol (a tônica) ou Si: a frase volta para casa.' },
  ],
});

const l56: Lesson = {
  n: 56,
  id: 'l56',
  title: 'Frase, período e harmonização',
  minutes: 60,
  objectives: [
    'Consigo reconhecer antecedente e consequente num período de 8 compassos.',
    'Consigo harmonizar 8 compassos com acordes do campo, cadências no lugar certo e notas de passagem nos tempos fracos.',
    'Consigo completar o fim de uma frase de acordo com a cadência que ela pede.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Pergunta e resposta, de novo',
      body: `Na lição 4 você improvisou pergunta e resposta nas teclas pretas. Na música tonal essa ideia tem nome e forma: o **período**.

- Uma **frase** tem, em geral, **4 compassos** e termina numa cadência.
- Um **período** são **duas frases** (8 compassos) que se completam:
  - o **antecedente** começa a ideia e termina **aberto**, quase sempre numa **meia cadência** (no V): é a pergunta;
  - o **consequente** começa igual (ou parecido) e termina **fechado**, numa **cadência perfeita** (V–I): é a resposta.

A Ode à Alegria, que você tocou na primeira unidade, é exatamente isso: a primeira frase termina no Ré (suspensa), a segunda começa igual e termina no Dó.

Dois períodos seguidos formam um **período duplo** (16 compassos), a forma do projeto desta unidade.`,
    },
    {
      kind: 'example',
      title: 'Um período de 8 compassos',
      steps: [
        { say: 'Antecedente (4 compassos): C, F, C, G. Termina no V: pergunta.', play: { bpm: 96, steps: [[64, 48, 52, 55], [67], [72], [67], [69, 48, 53, 57], [65], [69], [72], [67, 48, 52, 55], [64], [60], [64], [65, 43, 47, 50], [64], [62]].map((midis, i) => ({ midis, beats: i === 14 ? 2 : 1 })) } },
        { say: 'Consequente: começa igual e termina em casa, com G7 → C.', play: { bpm: 96, steps: [[64, 48, 52, 55], [67], [72], [67], [69, 48, 53, 57], [65], [69], [72], [74, 43, 47, 53], [71], [67], [65], [64, 48, 52, 55], [62], [60]].map((midis, i) => ({ midis, beats: i === 14 ? 2 : 1 })) } },
      ],
    },
    {
      kind: 'text',
      title: 'Notas de passagem',
      body: `Ao harmonizar, a regra da lição 52 continua: o acorde precisa conter a nota do **tempo forte**. E as outras?

Elas podem ser **notas de passagem**: notas fora do acorde, nos **tempos fracos**, que **passam por grau conjunto** de uma nota do acorde para outra. No compasso 4 do exemplo (Fá–Mi–Ré sobre G), o Fá é a 7ª do acorde e o Mi passa entre o Fá e o Ré. No compasso 2 (Lá–Fá–Lá–Dó sobre F), todas são do acorde.

O que não pode: nota fora do acorde no **tempo forte** sem resolver logo depois. Isso soa como erro, não como passagem.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'cadência no lugar errado',
      body: 'Harmonizar cada compasso certo e esquecer a forma é o erro mais comum: o compasso 4 termina no V (meia cadência) e o 8 no I (cadência perfeita). Se o compasso 4 cai no I, a pergunta vira resposta antes da hora e o período perde o sentido.',
    },
    { kind: 'exercise', id: 'l56-harmonizar', exercise: items('Harmonize o período', 'Compassos do período do exemplo. Nos compassos de cadência, toque o acorde da cadência.', harmPeriod, 12, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l56-completar', exercise: items('Complete a frase', 'Ouça e veja a frase sem a última nota. Antecedente para no V; consequente volta ao I.', complete, 8, 55, 84, 0.85, 'off') },
    { kind: 'exercise', id: 'l56-periodo', exercise: quickTimed('O período, no tempo', 'Melodia na direita, acordes em semibreve na esquerda, de 60 a 72 BPM. Pedal legato a cada compasso, se tiver.', () => twoHandTask(PERIOD_R, PERIOD_L, { bpm: 60, caption: 'Antecedente: C F C G · Consequente: C F G7 C.' }), { ladder: { from: 60, to: 72, step: 6 } }) },
    { kind: 'exercise', id: 'l56-quiz', exercise: quiz('Frase e período', 'Cinco perguntas rápidas.', PERIOD_Q) },
  ],
  review: [harmPeriod, complete, choice(PERIOD_Q, 'periodo')],
  checkpoint: [
    items('Harmonizar e completar', '12 itens, sem dicas. Meta: 85%.', mix([harmPeriod, harmC, complete]), 12, 48, 84, 0.85, 'off'),
  ],
  exit: [complete, choice(PERIOD_Q, 'periodo')],
};

// Base do projeto: período duplo em Dó, um acorde por compasso.
const DOUBLE_PERIOD: Roman[] = ['I', 'IV', 'I', 'V', 'I', 'IV', 'V', 'I', 'vi', 'IV', 'I', 'V', 'I', 'ii', 'V', 'I'];
const backing = DOUBLE_PERIOD.map((r) => {
  const c = { I: [48, 52, 55], ii: [50, 53, 57], IV: [53, 57, 60], V: [43, 47, 50], vi: [45, 48, 52], iii: [52, 55, 59], 'vii°': [47, 50, 53], V7: [43, 47, 53] } as Record<Roman, Midi[]>;
  return c[r];
});

const l57: Lesson = {
  n: 57,
  id: 'l57',
  title: 'Checkpoint da unidade 7 e projeto: minha primeira canção',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint misto da unidade 7, sem dicas.',
    'Consigo compor uma melodia de 16 compassos (período duplo) no campo de Dó, com cadências no lugar certo, e analisá-la em graus.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que a unidade juntou',
      body: `Você agora enxerga a harmonia de dentro: o **campo harmônico** de qualquer tom maior, os **graus** que valem em todos os tons, as **funções** (tônica, subdominante, dominante) e as substituições que elas permitem, as **cadências** que pontuam as frases, as **progressões** que movem o pop, o anime e o cinema, e a **forma** do período.

O projeto junta tudo numa coisa nova: a sua primeira canção.`,
    },
    {
      kind: 'text',
      title: 'Compor 16 compassos',
      body: `A base é um **período duplo** em Dó, um acorde por compasso:

- Frase 1: **I – IV – I – V** (termina aberta)
- Frase 2: **I – IV – V – I** (fecha)
- Frase 3: **vi – IV – I – V** (contraste: começa no vi, termina aberta)
- Frase 4: **I – ii – V – I** (fecha de vez)

Um método simples para a melodia:

1. Em cada compasso, ponha no **tempo 1** uma nota do acorde.
2. Ligue essas notas por **grau conjunto**, com notas de passagem nos tempos fracos.
3. Termine as frases 1 e 3 numa nota do **V** (Sol, Si, Ré) e as frases 2 e 4 no **Dó**.
4. Deixe **respirar**: uma pausa ou nota longa no fim de cada frase.
5. Repita ideias: a frase 2 pode começar igual à 1; a 4 pode lembrar a 2.

Depois de pronta, **analise**: escreva os graus embaixo de cada compasso e as cadências no fim de cada frase.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'comece pelo ritmo',
      body: 'Se a página em branco travar, escolha primeiro um ritmo de 2 compassos (por exemplo, semínima, semínima, mínima | quatro semínimas) e use o mesmo ritmo em todas as frases. Com o ritmo fixo, escolher as notas fica muito mais fácil.',
    },
    { kind: 'song', songId: 'u07-preludio', why: 'O projeto final da unidade: Bach construiu uma peça inteira só com acordes quebrados. Ouça a harmonia andar de compasso em compasso, e use o pedal a cada compasso.' },
  ],
  review: [fieldRandom, transpose, harmC, cadenceEar, royalLead, complete],
  checkpoint: [
    {
      kind: 'items',
      title: 'Checkpoint da unidade 7',
      how: '24 perguntas misturadas: campo harmônico, transposição, harmonização, cadências, progressões e ouvido. Meta: 85%.',
      gen: mix([fieldRandom, transpose, earBass, harmC, harmPeriod, subIVii, cadencePlay, cadenceEar, popEarBass, complete, choice([...FIELD_Q, ...ROMAN_Q, ...FUNCTION_Q, ...CADENCE_Q, ...PROG_Q, ...PERIOD_Q])]),
      count: 24,
      low: 36,
      high: 84,
      labels: 'off',
      pass: { accuracy: 0.85 },
    },
    quickTimed('Escala em 2 oitavas', 'Sol, Fá ou Lá menor, mãos juntas, a 60 BPM. ±40 ms, variação até 35 ms.', (rng) => parallel(pick(rng, ['G', 'F', 'Am']), 60), { window: 40, evenness: 35 }),
  ],
  project: {
    title: 'Minha primeira canção',
    brief: `Componha e toque uma melodia de **16 compassos** sobre o período duplo da base (I IV I V · I IV V I · vi IV I V · I ii V I), em Dó maior, a 72 BPM. Toque no exercício abaixo (a base toca os acordes), grave, e escreva a análise em graus com as cadências.`,
    steps: [
      'Toque a base sozinha no exercício e cante por cima, só para sentir a forma.',
      'Escreva (ou memorize) a melodia das frases 1 e 2, nota do acorde no tempo 1 de cada compasso.',
      'Faça as frases 3 e 4, com o contraste no vi.',
      'Toque a melodia inteira sobre a base e grave.',
      'Escreva a análise: graus de cada compasso e o nome da cadência no fim de cada frase.',
    ],
    rubric: [
      'As frases 1 e 3 terminam abertas (no V) e as frases 2 e 4 em casa.',
      'O tempo 1 de cada compasso tem uma nota do acorde; as notas fora do acorde estão em tempo fraco e andam por grau conjunto.',
      'Cada frase respira no fim.',
      'Há repetição de ideias (a canção tem identidade, não 16 compassos diferentes).',
      'A análise em graus e as cadências estão corretas.',
    ],
    exercise: { kind: 'improv', title: 'Sua canção sobre a base', how: '16 compassos a 72 BPM, só com notas de Dó maior (brancas). Respire no fim de cada frase e termine no Dó.', pcs: [0, 2, 4, 5, 7, 9, 11], bars: 16, bpm: 72, beatsPerBar: 4, backing, low: 60, high: 84, pass: { inSet: 0.95, restsPer4: 1, endOn: [0] } },
  },
  exit: [fieldRandom, cadenceEar, choice([...FIELD_Q, ...FUNCTION_Q, ...CADENCE_Q, ...PERIOD_Q])],
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
  lessons: [l50, l51, l52, l53, l54, l55, l56, l57],
  songs: [prelude],
  final: {
    songId: 'u07-preludio',
    brief: 'Os 8 primeiros compassos do Prelúdio em Dó de Bach: cada compasso é um acorde quebrado, e a harmonia anda pelo campo de Dó (I – ii7 – V7 – I – vi – Ré com Fá♯ – V – I7M) com o baixo quase parado. O Ré com Fá♯ é uma "dominante da dominante", que a Unidade 10 explica. É a peça perfeita para ouvir funções e cadências, e para treinar o pedal a cada compasso.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [fieldRandom, fieldC, fieldSeq, fieldSeqC, transpose, earBass, earChords, harmC, subIVii, subIvi, cadenceEar, cadencePlay, royalLead, royalTwice, andaluzaLead, popEar, popEarBass, harmPeriod, complete];
