// Unidade 8 — Tétrades, blues e improvisação (lições 58 a 65). Projeto final: The Entertainer (Joplin), simplificado, + blues de 12 compassos.
// A lição 65 é o Marco 2: checkpoint das unidades 5 a 8 e recital.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import {
  buildMinorScale, cadenceChoice, chordQualityByEar, chordSequence, choice, degreeByEar, diatonicByEar, diatonicChord, echo, echoTransposed, inversionChord, minorChord, mix,
  playChord, qualityInterval, shellChord, tonicByEar, FIELD7, type ChoiceQuestion,
} from '../gens';
import { pick } from '../music';
import { melodyTask, swingTask, swingTwoHands } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

// ---------- escrita ----------

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

const items = (title: string, how: string, gen: ItemGen, count: number, low: Midi, high: Midi, accuracy = 0.85, labels: 'on' | 'fade' | 'off' = 'fade', avgMs?: number): Exercise => ({
  kind: 'items', title, how, gen, count, low, high, labels, pass: avgMs ? { accuracy, avgMs } : { accuracy },
});

const SCI = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const sci = (m: Midi) => `${SCI[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

// ---------- acordes ----------

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SEVENTHS = ROOTS.flatMap((r) => [`${r}7M`, `${r}7`, `${r}m7`]);
const HALF_DIM = ['Bm7(b5)', 'C#m7(b5)', 'Em7(b5)', 'F#m7(b5)', 'Am7(b5)', 'Dm7(b5)', 'Gm7(b5)'];
const DIM7 = ['B°7', 'C#°7', 'D°7', 'F#°7', 'G#°7', 'E°7'];

// ---------- perguntas ----------

const TETRADS: ChoiceQuestion[] = [
  { q: 'C7M tem as notas…', options: ['Dó, Mi, Sol, Si', 'Dó, Mi, Sol, Si♭', 'Dó, Mi♭, Sol, Si♭'], answer: 0, why: 'Tríade maior + 7ª maior (meio tom abaixo da oitava).' },
  { q: 'C7 tem as notas…', options: ['Dó, Mi, Sol, Si♭', 'Dó, Mi, Sol, Si', 'Dó, Mi♭, Sol♭, Si♭'], answer: 0, why: 'Tríade maior + 7ª menor: o acorde dominante.' },
  { q: 'Cm7 tem as notas…', options: ['Dó, Mi♭, Sol, Si♭', 'Dó, Mi♭, Sol, Si', 'Dó, Mi, Sol, Si♭'], answer: 0, why: 'Tríade menor + 7ª menor.' },
  { q: 'Cm7(♭5), ou Cø, tem as notas…', options: ['Dó, Mi♭, Sol♭, Si♭', 'Dó, Mi♭, Sol♭, Si𝄫 (Lá)', 'Dó, Mi♭, Sol, Si♭'], answer: 0, why: 'Meio-diminuto: tríade diminuta + 7ª menor.' },
  { q: 'C°7 tem as notas…', options: ['Dó, Mi♭, Sol♭, Si𝄫 (soa Lá)', 'Dó, Mi♭, Sol♭, Si♭', 'Dó, Mi, Sol♯, Si'], answer: 0, why: 'Diminuto: três terças menores empilhadas. Divide a oitava em 4 partes iguais.' },
  { q: 'Na cifra brasileira, C7M é o mesmo que…', options: ['Cmaj7 (ou CΔ)', 'C7', 'Cm7'], answer: 0, why: 'O "M" depois do 7 diz que a 7ª é maior.' },
  { q: 'A diferença entre C7 e C7M é…', options: ['A 7ª: Si♭ no C7, Si no C7M', 'A 3ª', 'A 5ª'], answer: 0, why: 'C7 é tenso (dominante); C7M é repouso com brilho.' },
];

const FIELD7_Q: ChoiceQuestion[] = [
  { q: 'O campo harmônico de Dó em tétrades é…', options: ['C7M Dm7 Em7 F7M G7 Am7 Bm7(♭5)', 'C7 Dm7 Em7 F7 G7 Am7 B°7', 'C7M D7 E7 F7M G7 A7 B7'], answer: 0, why: 'A 7ª de cada acorde também vem da escala.' },
  { q: 'O único acorde dominante (7) do campo maior é o…', options: ['V7', 'I7M', 'IV7M'], answer: 0, why: 'Só sobre o 5º grau a tríade maior ganha 7ª menor.' },
  { q: 'Em Fá maior, o ii7 é…', options: ['Gm7', 'G7', 'Gm7(♭5)'], answer: 0, why: 'Sol, Si♭, Ré, Fá.' },
  { q: 'O viiø de Sol maior é…', options: ['F♯m7(♭5)', 'F♯°7', 'Fm7(♭5)'], answer: 0, why: 'Fá♯, Lá, Dó, Mi.' },
];

const GUIDE_Q: ChoiceQuestion[] = [
  { q: 'As notas que definem uma tétrade são…', options: ['A 3ª e a 7ª', 'A fundamental e a 5ª', 'A 5ª e a 7ª'], answer: 0, why: 'A 3ª diz maior ou menor; a 7ª diz 7M, 7 ou m7. A 5ª quase não muda nada.' },
  { q: 'Um shell 1-3-7 em G7 é…', options: ['Sol, Si, Fá', 'Sol, Ré, Fá', 'Sol, Si, Ré'], answer: 0, why: 'Fundamental, 3ª e 7ª. A 5ª (Ré) fica de fora.' },
  { q: 'No ii–V–I em Dó (Dm7 – G7 – C7M), as notas-guia andam…', options: ['Fá–Dó → Fá–Si → Mi–Si', 'Todas saltando', 'Ré–Lá → Sol–Ré → Dó–Sol'], answer: 0, why: 'A cada troca, uma fica e a outra desce meio tom.' },
  { q: 'Por que a 7ª de um acorde desce para a 3ª do próximo no ciclo de quintas?', options: ['Porque fica a meio tom ou um tom dela', 'Por regra de escrita', 'Não desce'], answer: 0, why: 'Fá (7ª de G7) → Mi (3ª de C). É a resolução do trítono.' },
  { q: 'O "ciclo de quintas" de acordes é…', options: ['Cada fundamental uma 5ª abaixo da anterior', 'Os acordes em ordem de escala', 'Só o ii–V'], answer: 0, why: 'Dm7 → G7 → C7M → F7M → Bm7(♭5) → E7 → Am7...' },
];

const ARP_Q: ChoiceQuestion[] = [
  { q: 'Arpejo é…', options: ['As notas do acorde tocadas uma de cada vez, em sequência', 'Um acorde forte', 'Uma escala rápida'], answer: 0, why: 'Dó, Mi, Sol, Dó, Mi, Sol...' },
  { q: 'Dedilhado do arpejo de Dó maior, 2 oitavas, mão direita:', options: ['1 2 3 1 2 3 5', '1 2 3 4 1 2 3', '1 3 5 1 3 5'], answer: 0, why: 'O polegar passa no Dó do meio; o 5 fica para o Dó de cima.' },
  { q: 'No arpejo, quem leva a mão de uma posição para a outra é…', options: ['O braço, num movimento de onda', 'O polegar esticado', 'O punho subindo'], answer: 0, why: 'Os dedos não esticam: o braço desloca a mão, que chega já na posição.' },
];

// ---------- peças reaproveitadas ----------

const seventhsAll = playChord({ symbols: [...SEVENTHS, ...HALF_DIM, ...DIM7], low: 48, high: 72, requireBass: true });
const seventhsMain = playChord({ symbols: SEVENTHS, low: 48, high: 72, requireBass: true });
const halfDimDim = playChord({ symbols: [...HALF_DIM, ...DIM7], low: 48, high: 72, requireBass: true });
const field7 = diatonicChord({ keys: ['C', 'G', 'D', 'F', 'Bb', 'Eb'], romans: FIELD7, low: 48, high: 72 });
const field7C = diatonicChord({ keys: ['C'], romans: FIELD7, low: 48, high: 72 });
const earTetrads = chordQualityByEar({ qualities: ['7M', '7', 'm7', 'ø'], roots: [57, 60, 62, 64, 65, 67], answerRoots: [55, 57, 60, 62, 64, 65] });
const earMaj7Dom = chordQualityByEar({ qualities: ['7M', '7'], roots: [57, 60, 62, 65, 67], answerRoots: [55, 57, 60, 62, 65] });

const II_V_I: Record<string, string[]> = {
  C: ['Dm7', 'G7', 'C7M'], F: ['Gm7', 'C7', 'F7M'], Bb: ['Cm7', 'F7', 'Bb7M'], G: ['Am7', 'D7', 'G7M'], D: ['Em7', 'A7', 'D7M'], Eb: ['Fm7', 'Bb7', 'Eb7M'],
};
const KEY_PT: Record<string, string> = { C: 'Dó', F: 'Fá', Bb: 'Si♭', G: 'Sol', D: 'Ré', Eb: 'Mi♭' };
const guideIiVI = chordSequence({ sequences: Object.entries(II_V_I).map(([k, s]) => ({ name: `ii–V–I em ${KEY_PT[k]} maior.`, symbols: s })), voicing: 'guide', lead: 1 });
const guideCycle = chordSequence({
  sequences: [
    { name: 'Ciclo diatônico em Dó.', symbols: ['C7M', 'F7M', 'Bm7(b5)', 'E7', 'Am7', 'Dm7', 'G7', 'C7M'] },
    { name: 'Ciclo diatônico em Fá.', symbols: ['F7M', 'Bb7M', 'Em7(b5)', 'A7', 'Dm7', 'Gm7', 'C7', 'F7M'] },
  ],
  voicing: 'guide',
  lead: 1,
});
const shells = shellChord({ symbols: ['C7', 'F7', 'G7', 'Bb7', 'D7', 'Dm7', 'Gm7', 'Am7', 'C7M', 'F7M', 'G7M', 'Bb7M'] });

// ---------- lições ----------

const l58: Lesson = {
  n: 58,
  id: 'l58',
  title: 'As cinco tétrades',
  minutes: 60,
  objectives: [
    'Consigo montar as cinco tétrades (7M, 7, m7, m7(♭5) e °7) sobre qualquer fundamental.',
    'Consigo ler a cifra brasileira de tétrades e não confundir C7 com C7M, nem ø com °.',
    'Consigo tocar tétrades sorteadas nas 12 tônicas com 90% de acerto e menos de 3 s por acorde.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Mais uma terça',
      body: `Uma **tétrade** é uma tríade com mais uma terça em cima: a **7ª**. Dó–Mi–Sol + **Si** = C7M. O som fica mais cheio e mais "colorido": é a base do jazz, da bossa nova, do soul e de muita música pop sofisticada.

Combinando tríade e 7ª, cinco tétrades aparecem o tempo todo:

- **7M** (maior com 7ª maior): tríade maior + 7ª maior. **C7M** = Dó–Mi–Sol–**Si**. Repouso com brilho.
- **7** (dominante): tríade maior + 7ª menor. **C7** = Dó–Mi–Sol–**Si♭**. Tensão que pede resolução.
- **m7** (menor com 7ª): tríade menor + 7ª menor. **Cm7** = Dó–Mi♭–Sol–Si♭. Macio, estável.
- **m7(♭5)** ou **ø** (meio-diminuto): tríade diminuta + 7ª menor. **Cø** = Dó–Mi♭–Sol♭–Si♭. Instável, melancólico.
- **°7** (diminuto): tríade diminuta + 7ª diminuta. **C°7** = Dó–Mi♭–Sol♭–**Si𝄫** (soa como Lá). Três terças menores iguais: tenso, de suspense.`,
    },
    {
      kind: 'example',
      title: 'As cinco sobre Dó',
      steps: [
        { say: 'C7M: Dó, Mi, Sol, Si.', keys: [60, 64, 67, 71], play: { bpm: 66, steps: [{ midis: [48, 60, 64, 67, 71], beats: 2 }] } },
        { say: 'C7: o Si desce para Si♭.', keys: [60, 64, 67, 70], play: { bpm: 66, steps: [{ midis: [48, 60, 64, 67, 70], beats: 2 }] } },
        { say: 'Cm7: agora o Mi também desce.', keys: [60, 63, 67, 70], play: { bpm: 66, steps: [{ midis: [48, 60, 63, 67, 70], beats: 2 }] } },
        { say: 'Cø: e o Sol desce para Sol♭.', keys: [60, 63, 66, 70], play: { bpm: 66, steps: [{ midis: [48, 60, 63, 66, 70], beats: 2 }] } },
        { say: 'C°7: por fim o Si♭ desce mais meio tom (Lá). Quatro notas a 3 semitons uma da outra.', keys: [60, 63, 66, 69], play: { bpm: 66, steps: [{ midis: [48, 60, 63, 66, 69], beats: 2 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'A cifra brasileira',
      body: `No Brasil, a cifra de tétrades tem um jeito próprio, que vale a pena dominar porque é o que aparece em songbooks e cifras da internet:

- **C7M** = maior com 7ª maior (em inglês, Cmaj7 ou CΔ).
- **C7** = dominante. Só o número, sem nada.
- **Cm7** = menor com 7ª.
- **Cm7(♭5)** = meio-diminuto (também Cø).
- **C°** ou **C°7** = diminuto (também Cdim7). Na prática, no Brasil, "C°" quase sempre quer dizer a tétrade diminuta.

As duas confusões mais comuns:

- **C7 × C7M**: o "M" muda tudo. C7 tem Si♭ (tenso, quer resolver); C7M tem Si (repouso).
- **Cø × C°7**: os dois têm Mi♭ e Sol♭; a diferença é a 7ª. No ø é Si♭ (7ª menor); no ° é Lá (7ª diminuta).`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'a 7ª contada da fundamental',
      body: 'A 7ª maior fica meio tom abaixo da oitava (Si, em Dó); a 7ª menor, um tom abaixo (Si♭). Um atalho no teclado: ache a fundamental uma oitava acima e desça meio tom (7M) ou um tom (7). Erro comum é contar a 7ª a partir da 5ª.',
    },
    { kind: 'exercise', id: 'l58-principais', exercise: items('7M, 7 e m7 nas 12 tônicas', 'Toque a tétrade da cifra com a fundamental embaixo, as quatro notas.', seventhsMain, 18, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l58-diminutas', exercise: items('ø e °7', 'Meio-diminutos e diminutos. Confira a 7ª.', halfDimDim, 10, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l58-ouvido', exercise: items('7M ou 7, de ouvido', 'Ouça a tétrade e toque uma da mesma qualidade sobre a nota pedida.', earMaj7Dom, 10, 48, 84, 0.8, 'off') },
    { kind: 'exercise', id: 'l58-quiz', exercise: quiz('As cinco tétrades', 'Sete perguntas rápidas.', TETRADS) },
  ],
  review: [seventhsAll, earMaj7Dom, choice(TETRADS, 'tetrades')],
  checkpoint: [
    items('Tétrades sorteadas', '20 tétrades dos cinco tipos nas 12 tônicas, sem dicas. Meta: 90% e menos de 3 s.', seventhsAll, 20, 48, 72, 0.9, 'off', 3000),
  ],
  exit: [seventhsMain, choice(TETRADS, 'tetrades')],
};

const l59: Lesson = {
  n: 59,
  id: 'l59',
  title: 'Campo harmônico em tétrades',
  minutes: 60,
  objectives: [
    'Consigo montar o campo harmônico em tétrades de 6 tons maiores.',
    'Consigo reconhecer de ouvido 7M, 7, m7 e ø e tocar a mesma qualidade sobre outra nota.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Quatro notas em cada degrau',
      body: `Faça o mesmo que na lição 50, mas empilhando **três** terças da escala sobre cada grau. Em Dó maior:

- **I7M**: C7M (Dó–Mi–Sol–Si)
- **ii7**: Dm7 (Ré–Fá–Lá–Dó)
- **iii7**: Em7 (Mi–Sol–Si–Ré)
- **IV7M**: F7M (Fá–Lá–Dó–Mi)
- **V7**: G7 (Sol–Si–Ré–Fá)
- **vi7**: Am7 (Lá–Dó–Mi–Sol)
- **viiø**: Bm7(♭5) (Si–Ré–Fá–Lá)

O padrão de qualidades, igual em todos os tons: **7M, m7, m7, 7M, 7, m7, ø**. Repare que **só o V7 é dominante**: é o único acorde do campo com o trítono (Si–Fá) e a vontade de resolver. O I7M e o IV7M são maiores e estáveis; ii7, iii7 e vi7 são menores; e o viiø é o meio-diminuto.`,
    },
    {
      kind: 'example',
      title: 'O campo de Dó em tétrades',
      steps: [
        { say: 'Subindo, em posição fundamental. Ouça a 7ª dando cor a cada um.', play: { bpm: 80, steps: [[60, 64, 67, 71], [62, 65, 69, 72], [64, 67, 71, 74], [65, 69, 72, 76], [67, 71, 74, 77], [69, 72, 76, 79], [71, 74, 77, 81], [72, 76, 79, 83]].map((midis, i) => ({ midis, beats: i === 7 ? 3 : 1.5 })) } },
      ],
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'tétrades na mão: posição fechada e 5ª opcional',
      body: 'Quatro notas em posição fundamental cabem na mão (1-2-3-5). Nos exercícios de campo, a 5ª pode ficar de fora (ela é a nota que menos muda o som), como no G7 em posição próxima da Unidade 3. Nos meio-diminutos, porém, a 5ª diminuta é o que define o acorde: toque-a.',
    },
    { kind: 'exercise', id: 'l59-do', exercise: items('O campo de Dó em tétrades', 'Grau pedido em Dó maior.', field7C, 12, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l59-tons', exercise: items('Seis tons', 'Dó, Sol, Ré, Fá, Si♭ ou Mi♭ maior, grau sorteado.', field7, 16, 48, 72, 0.85) },
    {
      kind: 'text',
      title: 'Ouvir a qualidade da tétrade',
      body: `De ouvido, pense em duas perguntas:

1. **A base é maior ou menor?** (a 3ª, como sempre)
2. **A 7ª está colada na oitava ou longe dela?** A 7ª maior (7M) fica meio tom abaixo da oitava e soa doce, "flutuante", às vezes com um leve atrito brilhante. A 7ª menor soa mais "bluesy", tensa no dominante (7) e suave no menor (m7).

Combinando: **7M** = maior + doce; **7** = maior + tenso, pedindo resolução; **m7** = menor e macio; **ø** = menor e escurecido, instável.`,
    },
    { kind: 'exercise', id: 'l59-ouvido', exercise: items('Qualidade da tétrade, em outra raiz', '7M, 7, m7 ou ø. Ouça e toque a mesma qualidade sobre a nota pedida, com a fundamental embaixo.', earTetrads, 12, 48, 84, 0.85, 'off') },
    { kind: 'exercise', id: 'l59-quiz', exercise: quiz('Campo em tétrades', 'Quatro perguntas rápidas.', FIELD7_Q, 0.75) },
  ],
  review: [field7, earTetrads, choice(FIELD7_Q, 'campo-tetrades')],
  checkpoint: [
    items('Campo e ouvido', '16 itens, sem dicas. Meta: 85%.', mix([field7, field7, earTetrads]), 16, 48, 84, 0.85, 'off'),
  ],
  exit: [field7, choice(FIELD7_Q, 'campo-tetrades')],
};

const l60: Lesson = {
  n: 60,
  id: 'l60',
  title: 'Shells e notas-guia',
  minutes: 60,
  objectives: [
    'Consigo tocar shells (1-3-7 e 1-7-3) de qualquer tétrade com a mão esquerda.',
    'Consigo conduzir as notas-guia (3ª e 7ª) num ii–V–I em 6 tons, com no máximo 1 semitom além do caminho mais curto.',
    'Consigo seguir o ciclo diatônico de tétrades só com as notas-guia.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A 3ª e a 7ª dizem tudo',
      body: `Numa tétrade, nem todas as notas pesam igual:

- A **fundamental** diz o nome, mas quem toca ela num grupo é o baixo.
- A **5ª** quase não muda nada (é justa em 7M, 7 e m7).
- A **3ª** diz se é maior ou menor.
- A **7ª** diz se é 7M, 7 ou m7.

Por isso **3ª e 7ª** se chamam **notas-guia** (*guide tones*): sozinhas, elas já fazem o ouvido "entender" o acorde. Pianistas de jazz e de bossa tocam acordes enxutos assim:

- **Shell** na mão esquerda: **fundamental + 3ª + 7ª**, sem a 5ª. Em G7: **Sol–Si–Fá** (1-3-7) ou **Sol–Fá–Si** (1-7-3).
- Notas-guia na mão direita, ou embaixo de uma melodia.`,
    },
    { kind: 'exercise', id: 'l60-shells', exercise: items('Shells', 'Fundamental embaixo; 3ª e 7ª em cima, em qualquer ordem. Use a mão esquerda.', shells, 14, 36, 72, 0.85) },
    {
      kind: 'text',
      title: 'O ii–V–I com notas-guia',
      body: `O **ii–V–I** (Dm7 – G7 – C7M, em Dó) é a progressão mais importante do jazz e da bossa nova. Olhe só as notas-guia:

- **Dm7**: 3ª = **Fá**, 7ª = **Dó**.
- **G7**: 3ª = **Si**, 7ª = **Fá**.
- **C7M**: 3ª = **Mi**, 7ª = **Si**.

Conduzindo: **Fá–Dó → Fá–Si → Mi–Si**. A cada troca, **uma nota fica e a outra desce meio tom**. A 7ª de um acorde vira a 3ª do próximo; a 3ª vira a 7ª. Isso acontece sempre que as fundamentais andam em **5ª descendente** (Ré → Sol → Dó), o chamado **ciclo de quintas**.

É a mesma resolução do trítono que você viu no G7 → C: o Fá desce para o Mi. Só que agora encadeada, acorde após acorde.`,
    },
    {
      kind: 'example',
      title: 'ii–V–I: shells na esquerda, notas-guia ouvidas',
      steps: [
        { say: 'Só as notas-guia: Fá–Dó, Fá–Si, Mi–Si.', keys: [65, 72], play: { bpm: 72, steps: [{ midis: [65, 72], beats: 2 }, { midis: [65, 71], beats: 2 }, { midis: [64, 71], beats: 3 }] } },
        { say: 'Com a fundamental no baixo: Ré, Sol, Dó. O acorde inteiro aparece.', play: { bpm: 72, steps: [{ midis: [38, 65, 72], beats: 2 }, { midis: [43, 65, 71], beats: 2 }, { midis: [36, 64, 71], beats: 3 }] } },
      ],
    },
    { kind: 'exercise', id: 'l60-iivi', exercise: items('ii–V–I com notas-guia', 'Duas notas por acorde (3ª e 7ª), tom sorteado. Uma fica, a outra anda.', guideIiVI, 10, 55, 84, 0.85) },
    {
      kind: 'text',
      title: 'O ciclo diatônico',
      body: `Se você continua descendo de 5ª em 5ª dentro do campo de Dó, passa por todos os graus:

**C7M → F7M → Bm7(♭5) → E7 → Am7 → Dm7 → G7 → C7M**

(Repare no **E7**: no campo de Dó seria Em7, mas aqui ele vira dominante para puxar o Am7. É uma "dominante secundária", assunto da Unidade 10.)

Com notas-guia, o ciclo vira uma **escada descendente** de meios-tons e tons, sempre com uma nota parada. Tocar o ciclo devagar, ouvindo cada resolução, é um dos melhores exercícios de harmonia que existem.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'subir quando devia descer',
      body: 'No ciclo, as notas-guia descem (ou ficam). Se você se pegar subindo uma 6ª para achar a próxima 3ª, procure a mesma nota meio tom ou um tom abaixo: ela está ali.',
    },
    { kind: 'exercise', id: 'l60-ciclo', exercise: items('O ciclo com notas-guia', '8 acordes, só 3ª e 7ª, conduzidas.', guideCycle, 4, 55, 84, 0.75) },
    { kind: 'exercise', id: 'l60-quiz', exercise: quiz('Shells e notas-guia', 'Cinco perguntas rápidas.', GUIDE_Q) },
  ],
  review: [shells, guideIiVI, choice(GUIDE_Q, 'notas-guia')],
  checkpoint: [
    items('ii–V–I em 6 tons', 'Notas-guia conduzidas, sem dicas. Movimento até o ótimo + 1. Meta: 85%.', guideIiVI, 8, 55, 84, 0.85, 'off'),
    items('Shells', '10 shells, sem dicas.', shells, 10, 36, 72, 0.85, 'off'),
  ],
  exit: [shells, choice(GUIDE_Q, 'notas-guia')],
};

/** Arpejo de tríade em 2 oitavas, tercinas: sobe 2 tempos e meio... um compasso sobe e desce, outro termina. */
function arpeggio(root: Midi, third: number): string {
  const t = [0, third, 7];
  const up = [0, 1, 2, 3, 4, 5, 6].map((i) => root + t[i % 3] + 12 * Math.floor(i / 3));
  const down = [...up].reverse().slice(1, 6);
  return `${[...up, ...down].map((m) => `${sci(m)}:1/3`).join(' ')} | ${sci(root)}:4`;
}
const ARPS: Record<string, { r: Midi; l: Midi; third: number; name: string }> = {
  C: { r: 60, l: 48, third: 4, name: 'Dó maior' },
  G: { r: 55, l: 43, third: 4, name: 'Sol maior' },
  F: { r: 53, l: 41, third: 4, name: 'Fá maior' },
  Am: { r: 57, l: 45, third: 3, name: 'Lá menor' },
};

const l61: Lesson = {
  n: 61,
  id: 'l61',
  title: 'Arpejos',
  minutes: 60,
  objectives: [
    'Consigo tocar arpejos de Dó, Sol, Fá e Lá menor em 2 oitavas, mãos separadas, com o dedilhado certo.',
    'Consigo 3 passadas limpas a 54 BPM em tercinas, com variação abaixo de 35 ms.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O acorde, uma nota de cada vez',
      body: `Um **arpejo** é o acorde tocado nota por nota, subindo ou descendo por várias oitavas: Dó, Mi, Sol, Dó, Mi, Sol, Dó. É o "irmão" da escala no trilho técnico, e aparece em toda parte: acompanhamentos, introduções, o Prelúdio de Bach e o meio-arpejo da Für Elise.

Dedilhado de 2 oitavas (tríades com fundamental branca):

- **Mão direita**, subindo: **1 2 3 · 1 2 3 · 5**. O polegar passa no Dó do meio, e o 5 fica para a nota de cima. Descendo, o mesmo ao contrário: 5 3 2 1 · 3 2 1.
- **Mão esquerda**, subindo: **5 4 2 1 · 4 2 1** (ou 5 3 2 1 se a mão for pequena). O 4 (ou 3) cruza por cima do polegar.

Os intervalos do arpejo são maiores que os da escala (3ªs e 4ªs), e a passagem do polegar cobre uma distância bem maior. Por isso a técnica muda.`,
    },
    {
      kind: 'text',
      title: 'Ondas, não esticões',
      body: `O erro clássico no arpejo é **esticar** a mão para alcançar a próxima nota: o polegar se abre ao máximo, o punho torce, a mão fica tensa. Funciona devagar e trava rápido, além de doer.

O jeito certo é deixar o **braço levar a mão**. Pense em **ondas**: a cada grupo (Dó–Mi–Sol), o braço desloca a mão inteira para a próxima posição, que chega pronta, sem abrir. O punho sobe levemente na passagem e desce na nota seguinte, como uma onda suave.

Um teste: grave-se tocando devagar. Se a mão estiver aberta como um leque no momento da passagem, ela está esticando. A mão deve parecer **do mesmo tamanho** o tempo todo.`,
    },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'arpejo e tendão',
      body: 'Esticar o polegar repetidas vezes é uma das causas clássicas de dor no punho em pianistas. Se sentir o lado do polegar ou o punho, pare, solte o braço e reduza o andamento. A escada só sobe com a mão solta.',
    },
    {
      kind: 'example',
      title: 'Arpejo de Dó maior em tercinas',
      steps: [
        { say: 'Duas oitavas, subindo e descendo, uma tríade por tempo.', play: { bpm: 60, steps: [60, 64, 67, 72, 76, 79, 84, 79, 76, 72, 67, 64].map((m) => ({ midis: [m], beats: 1 / 3 })).concat([{ midis: [60], beats: 2 }]) } },
      ],
    },
    { kind: 'exercise', id: 'l61-quiz', exercise: quiz('Arpejos', 'Três perguntas antes de tocar.', ARP_Q, 0.66) },
    { kind: 'exercise', id: 'l61-do-md', exercise: quickTimed('Dó maior, direita', 'Tercinas, de 44 a 60 BPM. Variação até 35 ms.', () => melodyTask(arpeggio(60, 4), { bpm: 44 }), { ladder: { from: 44, to: 60, step: 4 }, evenness: 35, window: 80 }) },
    { kind: 'exercise', id: 'l61-do-me', exercise: quickTimed('Dó maior, esquerda', 'A partir do Dó3, de 44 a 60 BPM.', () => melodyTask(arpeggio(48, 4), { bpm: 44, clef: 'bass' }), { ladder: { from: 44, to: 60, step: 4 }, evenness: 35, window: 80 }) },
    { kind: 'exercise', id: 'l61-sorteado', exercise: quickTimed('Sol, Fá ou Lá menor', 'Mão sorteada, de 44 a 54 BPM.', (rng) => {
      const a = ARPS[pick(rng, ['G', 'F', 'Am'])];
      const right = rng() < 0.5;
      return melodyTask(arpeggio(right ? a.r : a.l, a.third), { bpm: 44, clef: right ? 'treble' : 'bass', caption: `${a.name}, mão ${right ? 'direita' : 'esquerda'}.` });
    }, { ladder: { from: 44, to: 54, step: 5 }, evenness: 35, window: 80 }) },
    {
      kind: 'text',
      title: 'No trilho técnico',
      body: `A meta desta lição é **54 BPM** em tercinas (cerca de 2,7 notas por segundo). A referência de nível pede **72 BPM**: como nas escalas, isso vem com semanas de trilho técnico, 5 minutos por dia, um arpejo por dia em rodízio, subindo 4 BPM a cada 3 passadas limpas.

Junte arpejo e escala do mesmo tom no mesmo dia: Dó maior escala + arpejo, no dia seguinte Sol. É o formato dos exames de piano de todo o mundo, e por um bom motivo: escala e arpejo do mesmo tom são as duas metades da mesma tonalidade debaixo dos dedos.`,
    },
  ],
  review: [choice(ARP_Q, 'arpejos'), field7],
  checkpoint: [
    quickTimed('3 passadas a 54 BPM', 'Dó maior, mão direita, tercinas, sem dicas. Variação até 35 ms.', () => melodyTask(arpeggio(60, 4), { bpm: 54 }), { reps: 3, evenness: 35, window: 80 }),
  ],
  exit: [choice(ARP_Q, 'arpejos'), seventhsMain],
};

const BLUES_Q: ChoiceQuestion[] = [
  { q: 'No blues, os acordes I, IV e V costumam ser…', options: ['Todos dominantes (7)', 'I7M, IV7M e V7', 'Todos menores'], answer: 0, why: 'C7, F7, G7: o blues quebra a regra do campo, e é isso que dá o som dele.' },
  { q: 'A forma do blues de 12 compassos é…', options: ['I I I I · IV IV I I · V IV I V', 'I IV V I · I IV V I · I IV V I', 'I V vi IV × 3'], answer: 0, why: 'A mesma da Unidade 4, agora com tétrades.' },
  { q: 'Colcheias com swing soam…', options: ['Longa-curta, como "tá-a-ta"', 'Exatamente iguais', 'Curta-longa'], answer: 0, why: 'Perto de 2:1, como a 1ª e a 3ª nota de uma tercina.' },
  { q: 'No swing, as colcheias são escritas…', options: ['Retas, iguais; o estilo diz para tocar com swing', 'Pontuadas sempre', 'Como tercinas sempre'], answer: 0, why: 'A partitura de jazz escreve reto e avisa "swing" no começo.' },
  { q: 'Um shell de F7 na esquerda é…', options: ['Fá, Mi♭, Lá (1-7-3)', 'Fá, Lá, Dó', 'Fá, Mi, Lá'], answer: 0, why: 'Fundamental, 7ª menor (Mi♭) e 3ª (Lá), sem a 5ª.' },
];

const IMPROV_Q: ChoiceQuestion[] = [
  { q: 'A pentatônica maior de Dó é…', options: ['Dó, Ré, Mi, Sol, Lá', 'Dó, Mi♭, Fá, Sol, Si♭', 'Dó, Ré, Mi, Fá, Sol'], answer: 0, why: 'A escala maior sem o 4º e o 7º graus (os que fazem semitom).' },
  { q: 'A pentatônica menor de Lá é…', options: ['Lá, Dó, Ré, Mi, Sol', 'Lá, Si, Dó, Mi, Fá', 'Lá, Dó♯, Mi, Fá♯, Sol♯'], answer: 0, why: 'As mesmas notas da pentatônica maior de Dó, com a casa no Lá.' },
  { q: 'A escala blues de Dó é…', options: ['Dó, Mi♭, Fá, Fá♯, Sol, Si♭', 'Dó, Ré, Mi, Sol, Lá', 'Dó, Mi, Fá, Sol, Si'], answer: 0, why: 'A pentatônica menor com a "blue note" (Fá♯, a 4ª aumentada).' },
  { q: 'Mirar notas-alvo é…', options: ['Chegar numa nota do acorde quando o acorde muda', 'Tocar só a tônica', 'Tocar mais forte no tempo 1'], answer: 0, why: 'É o que faz o improviso "seguir a harmonia" em vez de só passear pela escala.' },
  { q: 'Na troca de C7 para F7, uma boa nota-alvo é…', options: ['Mi♭, a 7ª do F7, meio tom abaixo do Mi do C7', 'Fá♯', 'Si'], answer: 0, why: 'As notas-guia do acorde novo, chegando por meio tom: Mi (3ª de C7) → Mi♭ (7ª de F7).' },
];

const BLUES_FORM = ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'];
const SHELL_L: Record<string, string> = { C7: 'C3+E3+Bb3', F7: 'F2+Eb3+A3', G7: 'G2+F3+B3' };
const COMP_R: Record<string, string> = { C7: 'Bb3+E4+G4', F7: 'A3+C4+Eb4', G7: 'B3+D4+F4' };
const SHELL_MIDI: Record<string, Midi[]> = { C7: [48, 52, 58], F7: [41, 51, 57], G7: [43, 53, 59] };
const bluesShells = BLUES_FORM.map((c) => `${SHELL_L[c]}:4`).join(' | ');
const bluesComp = BLUES_FORM.map((c) => `r ${COMP_R[c]} r:0.5 ${COMP_R[c]}:0.5 r`).join(' | ');
const bluesBacking = BLUES_FORM.map((c) => SHELL_MIDI[c]);
const shellsBlues = shellChord({ symbols: ['C7', 'F7', 'G7', 'Bb7', 'Eb7', 'D7'] });
const SWING_RIFFS = [
  'C4:0.5 Eb4:0.5 E4:0.5 G4:0.5 A4:0.5 G4:0.5 Eb4:0.5 C4:0.5 | C4:4',
  'G4:0.5 A4:0.5 C5:0.5 A4:0.5 G4:0.5 E4:0.5 G4 | C4:4',
  'E4:0.5 G4:0.5 A4:0.5 Bb4:0.5 A4:0.5 G4:0.5 E4:0.5 C4:0.5 | D4:0.5 C4:0.5 A3:0.5 C4:0.5 r:2',
  'C5:0.5 Bb4:0.5 G4:0.5 F4:0.5 Eb4:0.5 C4:0.5 G3 | C4:4',
];

const l62: Lesson = {
  n: 62,
  id: 'l62',
  title: 'Blues e swing',
  minutes: 60,
  objectives: [
    'Consigo tocar o blues de 12 compassos em Dó com shells na esquerda, 2 ciclos sem errar a forma.',
    'Consigo tocar colcheias com swing (longa-curta, perto de 2:1) no tempo.',
    'Consigo acompanhar o blues com shells na esquerda e comping na direita.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O blues com tétrades',
      body: `Na Unidade 4 você tocou o blues de 12 compassos com tríades: C, F e G. O blues "de verdade" usa **tétrades dominantes em todos os graus**: **C7, F7 e G7**.

Isso quebra a regra do campo harmônico (no campo de Dó, só o G7 é dominante). E é justamente esse "erro" que dá ao blues o som dele: o **Si♭** do C7 e o **Mi♭** do F7 são as **blue notes**, notas que puxam a música para uma cor entre o maior e o menor.

A forma continua a mesma:

**C7 C7 C7 C7 · F7 F7 C7 C7 · G7 F7 C7 G7**

Na mão esquerda, use os **shells** da lição 60, que soam cheios e quase não mexem a mão: **C7** = Dó–Mi–Si♭, **F7** = Fá–Mi♭–Lá, **G7** = Sol–Fá–Si. Repare que do C7 para o F7 o Mi desce meio tom para Mi♭ e o Si♭ desce para Lá: notas-guia de novo.`,
    },
    { kind: 'exercise', id: 'l62-shells', exercise: items('Shells de dominante', 'C7, F7, G7, B♭7, E♭7 e D7: fundamental, 3ª e 7ª.', shellsBlues, 12, 36, 72, 0.85) },
    { kind: 'exercise', id: 'l62-forma', exercise: quickTimed('A forma com shells', 'Só a esquerda, um shell por compasso, os 12 compassos a 80 BPM. Dois ciclos sem errar a forma.', () => melodyTask(bluesShells, { bpm: 80, clef: 'bass' }), { reps: 2 }) },
    {
      kind: 'text',
      title: 'Swing',
      body: `No blues e no jazz, as colcheias não são iguais. Elas são tocadas **longa-curta**: a do tempo dura mais, a do contratempo menos, numa proporção perto de **2 para 1**. É como tocar a 1ª e a 3ª nota de uma **tercina** (lição 39): "**tá**-a-ta, **tá**-a-ta". Isso se chama **swing**.

A partitura escreve as colcheias **retas**, iguais, e avisa no começo: "swing". Quem toca sabe que deve balançar.

A proporção exata varia com o estilo e o andamento (de uns 1,5:1 até 3:1). O app espera o contratempo no último terço do tempo (2:1) e aceita uma janela em volta: se você tocar reto, o contratempo chega cedo demais e conta como fora do tempo.

Duas dicas: acentue levemente o **contratempo** (a colcheia curta), e mantenha o pulso nos tempos 2 e 4, onde o blues "bate palma".`,
    },
    {
      kind: 'example',
      title: 'Reto e com swing',
      steps: [
        { say: 'Colcheias retas: iguais.', play: { bpm: 100, steps: [60, 63, 64, 67, 69, 67, 63, 60].map((m) => ({ midis: [m], beats: 0.5 })) } },
        { say: 'Com swing: longa-curta, 2 para 1.', play: { bpm: 100, steps: [60, 63, 64, 67, 69, 67, 63, 60].map((m, i) => ({ midis: [m], beats: i % 2 === 0 ? 2 / 3 : 1 / 3, velocity: i % 2 === 0 ? 0.6 : 0.75 })) } },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'swing pontuado',
      body: 'Tocar o swing como colcheia pontuada + semicolcheia (3:1) deixa o som "saltitante", de marcha. O swing é mais solto: pense em tercina, não em pontuado.',
    },
    { kind: 'exercise', id: 'l62-swing', exercise: quickTimed('Riffs com swing', 'Frases de blues em Dó, sorteadas, de 76 a 92 BPM. Longa-curta.', (rng) => swingTask(pick(rng, SWING_RIFFS), { bpm: 76 }), { window: 60, ladder: { from: 76, to: 92, step: 8 } }) },
    {
      kind: 'text',
      title: 'Shell e comping',
      body: `**Comping** (de *accompanying*) é o jeito de acompanhar do jazz: a mão direita toca acordes curtos em pontos rítmicos variados, conversando com o solista, em vez de segurar notas longas.

O padrão mais simples para começar: a esquerda segura o **shell** o compasso inteiro, e a direita toca o acorde **no tempo 2** e **no contratempo do 3** (com swing). Na direita, use as notas que faltam no shell (a 5ª, por exemplo) e as notas-guia numa oitava acima.

Comece a 72 BPM e só suba quando os dois ataques da direita estiverem seguros no lugar.`,
    },
    { kind: 'exercise', id: 'l62-comping', exercise: quickTimed('Blues com shell e comping', 'Shell em semibreve na esquerda; acorde no 2 e no "e" do 3 na direita, com swing. Os 12 compassos a 72 BPM.', () => swingTwoHands(bluesComp, bluesShells, { bpm: 72, caption: 'C7 C7 C7 C7 · F7 F7 C7 C7 · G7 F7 C7 G7. A pauta mostra a nota mais grave da direita.' }), { window: 70 }) },
    { kind: 'song', songId: 'u08-blues', why: 'Um blues em Fá com melodia: o riff na direita e shells na esquerda. Toque com swing (a partitura escreve reto, como no jazz).' },
    { kind: 'exercise', id: 'l62-quiz', exercise: quiz('Blues e swing', 'Cinco perguntas rápidas.', BLUES_Q) },
  ],
  review: [shellsBlues, choice(BLUES_Q, 'blues-swing')],
  checkpoint: [
    quickTimed('Dois ciclos de blues', 'Shells na esquerda, os 12 compassos duas vezes a 84 BPM, sem errar a forma.', () => melodyTask(`${bluesShells} | ${bluesShells}`, { bpm: 84, clef: 'bass' })),
    quickTimed('Swing a 92 BPM', 'Dois riffs sorteados, sem dicas.', (rng) => swingTask(`${pick(rng, SWING_RIFFS)} | ${pick(rng, SWING_RIFFS)}`, { bpm: 92 }), { window: 60 }),
  ],
  exit: [shellsBlues, choice(BLUES_Q, 'blues-swing')],
};

const C_BLUES = [0, 3, 5, 6, 7, 10];
const C_MIN_PENTA = [0, 3, 5, 7, 10];
const C_MAJ_PENTA = [0, 2, 4, 7, 9];
const BLUES_LICKS = [
  [60, 63, 65, 66, 67], [67, 66, 65, 63, 60], [72, 70, 67, 65, 63, 60], [60, 63, 64, 67], [67, 70, 72, 70, 67], [63, 64, 67, 69, 67],
];
const echoBlues = echo({ motifs: BLUES_LICKS, bpm: 100, skill: 'eco-blues' });
const POP_BACK: Midi[][] = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];

const l63: Lesson = {
  n: 63,
  id: 'l63',
  title: 'Pentatônica, escala blues e notas-alvo',
  minutes: 60,
  objectives: [
    'Consigo tocar as pentatônicas maior e menor e a escala blues de Dó.',
    'Consigo improvisar sobre o blues com 90% das notas na escala.',
    'Consigo chegar numa nota do acorde em pelo menos metade das trocas de acorde.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Cinco notas sem atrito',
      body: `Na lição 4 você improvisou nas teclas pretas: aquilo era uma **pentatônica**, uma escala de **5 notas** sem nenhum semitom entre elas. Por isso tudo soava bem.

- **Pentatônica maior de Dó**: **Dó, Ré, Mi, Sol, Lá**. É a escala maior sem o 4º e o 7º graus (Fá e Si), justamente os que fazem semitom.
- **Pentatônica menor de Lá**: **Lá, Dó, Ré, Mi, Sol**. As mesmas notas, com a casa no Lá (relativas, como na lição 34).
- **Pentatônica menor de Dó**: **Dó, Mi♭, Fá, Sol, Si♭**.

A pentatônica maior soa aberta, de música folclórica e pop. A menor é a base do rock e do blues.`,
    },
    {
      kind: 'text',
      title: 'A escala blues',
      body: `Acrescente à pentatônica menor de Dó uma nota entre o Fá e o Sol: o **Fá♯** (ou Sol♭). Ela é a **blue note** por excelência, a 4ª aumentada (o trítono a partir da tônica). O resultado é a **escala blues**:

**Dó, Mi♭, Fá, Fá♯, Sol, Si♭**

Sobre o blues em Dó (C7, F7, G7), essa escala funciona do começo ao fim. O Mi♭ contra o Mi do C7 cria o atrito típico; o truque dos pianistas é **escorregar** do Mi♭ para o Mi (de uma preta para a branca vizinha), como um cantor que "dobra" a nota.

O Fá♯ é nota de passagem: use-o entre Fá e Sol, subindo ou descendo, e não pare nele.`,
    },
    {
      kind: 'example',
      title: 'Pentatônicas e escala blues',
      steps: [
        { say: 'Pentatônica maior de Dó.', play: { bpm: 110, steps: [60, 62, 64, 67, 69, 72].map((m, i) => ({ midis: [m], beats: i === 5 ? 2 : 1 })) } },
        { say: 'Pentatônica menor de Dó.', play: { bpm: 110, steps: [60, 63, 65, 67, 70, 72].map((m, i) => ({ midis: [m], beats: i === 5 ? 2 : 1 })) } },
        { say: 'Escala blues de Dó, com o Fá♯.', keys: [66], play: { bpm: 110, steps: [60, 63, 65, 66, 67, 70, 72].map((m, i) => ({ midis: [m], beats: i === 6 ? 2 : 1 })) } },
        { say: 'O escorregão Mi♭ → Mi sobre o C7.', keys: [63, 64], play: { bpm: 90, steps: [{ midis: [48, 52, 58, 63], beats: 0.25 }, { midis: [48, 52, 58, 64], beats: 1.75 }, { midis: [48, 52, 58, 60], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l63-menor', exercise: { kind: 'improv', title: 'Pentatônica menor sobre o blues', how: '12 compassos a 80 BPM, só Dó, Mi♭, Fá, Sol e Si♭, sobre a base de blues. Frases curtas, final no Dó.', pcs: C_MIN_PENTA, bars: 12, bpm: 80, beatsPerBar: 4, backing: bluesBacking, low: 55, high: 84, pass: { inSet: 0.9, restsPer4: 1, endOn: [0] } } },
    { kind: 'exercise', id: 'l63-escala', exercise: quickTimed('Escala blues de Dó', 'Sobe e desce uma oitava em colcheias, de 60 a 80 BPM.', () => melodyTask('C4:0.5 Eb4:0.5 F4:0.5 F#4:0.5 G4:0.5 Bb4:0.5 C5:0.5 Bb4:0.5 | G4:0.5 F#4:0.5 F4:0.5 Eb4:0.5 C4:2 | C4:4', { bpm: 60 }), { ladder: { from: 60, to: 80, step: 5 } }) },
    { kind: 'exercise', id: 'l63-eco', exercise: items('Licks de blues de ouvido', 'O app toca uma frase curta da escala blues; repita.', echoBlues, 8, 55, 79, 0.8, 'off') },
    { kind: 'exercise', id: 'l63-penta', exercise: { kind: 'improv', title: 'Pentatônica maior sobre C – Am – F – G', how: '8 compassos a 80 BPM, só com Dó, Ré, Mi, Sol e Lá. Frases curtas, pausas, final no Dó.', pcs: C_MAJ_PENTA, bars: 8, bpm: 80, beatsPerBar: 4, backing: POP_BACK, low: 60, high: 84, pass: { inSet: 0.9, restsPer4: 1, endOn: [0] } } },
    {
      kind: 'text',
      title: 'Notas-alvo',
      body: `Improvisar só "dentro da escala" já soa bem, mas soa genérico: as frases passeiam sem ligar para a harmonia. O passo seguinte é **mirar notas-alvo**: quando o acorde muda, chegar numa **nota do acorde novo**, de preferência uma nota-guia (3ª ou 7ª).

No blues em Dó:

- Na chegada do **F7** (compasso 5): mire o **Lá** (3ª) ou o **Mi♭** (7ª). Do Mi do C7, o Mi♭ fica a meio tom: escorregue para baixo.
- Na chegada do **G7** (compasso 9): mire o **Si** (3ª) ou o **Fá** (7ª).
- De volta ao **C7**: **Mi** (3ª) ou **Si♭** (7ª), ou o próprio **Dó**.

O app confere a primeira nota que você toca perto do tempo 1 de cada troca: ela é do acorde? A meta é acertar **pelo menos metade** das chegadas. O resto do compasso continua livre na escala.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'planeje o fim da frase',
      body: 'Em vez de pensar na primeira nota da frase, pense na última: decida onde quer chegar no compasso 5 (Lá, por exemplo) e construa a frase do compasso 4 para terminar ali. Improvisar é compor rápido, de trás para frente.',
    },
    { kind: 'exercise', id: 'l63-blues', exercise: { kind: 'improv', title: 'Improviso no blues com notas-alvo', how: '12 compassos a 80 BPM com a escala blues de Dó. Mire uma nota do acorde em cada troca (compassos 5, 7, 9, 10, 11 e 12). Pausas entre as frases.', pcs: C_BLUES, bars: 12, bpm: 80, beatsPerBar: 4, backing: bluesBacking, low: 55, high: 84, pass: { inSet: 0.9, restsPer4: 1, endOn: [0], targets: 0.5 } } },
    { kind: 'exercise', id: 'l63-quiz', exercise: quiz('Escalas e notas-alvo', 'Cinco perguntas rápidas.', IMPROV_Q) },
  ],
  review: [echoBlues, choice(IMPROV_Q, 'improviso')],
  checkpoint: [
    { kind: 'improv', title: 'Dois chorus de blues', how: '24 compassos (dois ciclos) a 84 BPM, escala blues, sem dicas. 90% na escala e metade das trocas numa nota do acorde.', pcs: C_BLUES, bars: 24, bpm: 84, beatsPerBar: 4, backing: bluesBacking, low: 55, high: 84, pass: { inSet: 0.9, restsPer4: 1, endOn: [0], targets: 0.5 } },
    items('Licks de ouvido', '6 frases da escala blues.', echoBlues, 6, 55, 79, 0.8, 'off'),
  ],
  exit: [echoBlues, choice(IMPROV_Q, 'improviso')],
};

const EAR4_Q: ChoiceQuestion[] = [
  { q: 'Ao tirar uma música de ouvido, o primeiro passo é…', options: ['Achar a tônica (a casa)', 'Achar o primeiro acorde', 'Tocar a melodia'], answer: 0, why: 'Com a casa, todo o resto vira grau: melodia, baixo e acordes.' },
  { q: 'Depois da tônica, você decide…', options: ['Se a música é maior ou menor', 'O andamento', 'O dedilhado'], answer: 0, why: 'A qualidade diz qual campo harmônico usar.' },
  { q: 'Para achar os acordes, o mais eficiente é…', options: ['Ouvir o baixo primeiro e usar o campo', 'Testar todos os acordes', 'Ouvir só a melodia'], answer: 0, why: 'Cada nota do baixo, no campo, já sugere o acorde.' },
  { q: 'Para transpor uma melodia tirada em Dó para Mi♭, você…', options: ['Sobe tudo 3 semitons, mantendo os graus', 'Troca as notas brancas por pretas', 'Toca uma oitava acima'], answer: 0, why: 'Os graus ficam; as notas sobem 3 semitons.' },
];

const earBass = echo({ motifs: [[48, 47, 45, 43], [48, 45, 41, 43], [48, 53, 55, 48], [45, 41, 48, 43], [48, 47, 45, 41], [41, 43, 45, 48]], bpm: 72, skill: 'ditado-baixo' });
const earTetradProg = diatonicByEar({ keys: ['C', 'F'], progressions: [['I7M', 'vi7', 'ii7', 'V7'], ['ii7', 'V7', 'I7M', 'I7M'], ['I7M', 'IV7M', 'iii7', 'vi7']], answer: 'chords' });
const transposeEar = echoTransposed({ motifs: [[60, 62, 64, 67, 64], [67, 65, 64, 62, 60], [60, 64, 67, 72, 67], [64, 62, 60, 62, 64]], shifts: [3, 5, 7, -3, 2] });
const tonic = tonicByEar({ keys: ['C', 'G', 'F', 'D', 'Bb', 'Eb', 'A'] });

const l64: Lesson = {
  n: 64,
  id: 'l64',
  title: 'Ouvido 4: tirar uma música',
  minutes: 60,
  objectives: [
    'Consigo achar a tônica, a qualidade e os acordes de uma progressão em tétrades, de ouvido.',
    'Consigo ditar uma linha de baixo de 4 notas.',
    'Consigo ouvir uma melodia em Dó e tocá-la em outro tom.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O método em quatro passos',
      body: `Tirar música de ouvido parece mágica, mas é um método. Os músicos que fazem isso todo dia seguem quase sempre a mesma ordem:

1. **Tônica**: qual nota soa como casa? Cante a nota em que a música "quer" terminar e ache no teclado.
2. **Qualidade**: maior ou menor? Toque o acorde da tônica nas duas versões junto com a música; uma vai casar.
3. **Campo**: agora você sabe quais acordes são prováveis (o campo harmônico daquele tom, mais o V7 nas menores).
4. **Baixo**: ouça a nota mais grave de cada acorde. Com o baixo e o campo, o acorde quase sempre se resolve sozinho.

A melodia vem depois: com a tônica e os graus na cabeça (lição 40), cada nota é um grau.`,
    },
    { kind: 'exercise', id: 'l64-tonica', exercise: items('1. Ache a casa', 'O app toca I – IV – V7 em tom sorteado. Toque a tônica.', tonic, 8, 48, 84, 0.85, 'off') },
    { kind: 'exercise', id: 'l64-baixo', exercise: items('4. O baixo', 'O app toca 4 notas graves. Repita nas mesmas teclas.', earBass, 8, 36, 60, 0.8, 'off') },
    { kind: 'exercise', id: 'l64-tetrades', exercise: items('Progressões em tétrades', 'Tom de Dó ou Fá. Ouça e toque os 4 acordes (a 5ª pode faltar).', earTetradProg, 6, 48, 72, 0.8, 'off') },
    {
      kind: 'text',
      title: 'Tirar e transpor',
      body: `Uma vez tirada, a música pode ir para qualquer tom, porque você pensa em **graus**, não em teclas. É assim que se acompanha um cantor que pede "um tom abaixo".

No exercício a seguir, o app toca uma frase em Dó e você toca **o mesmo desenho a partir de outra nota**. Pense nos graus (1, 2, 3, 5...) e reconstrua no tom novo, em vez de transportar tecla por tecla.

Depois, faça o mesmo com uma música de verdade: escolha o refrão de uma canção que você goste, tire a melodia e os acordes com o método acima, e toque em outro tom. Não precisa escrever partitura: uma lista de graus e cifras basta.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'comece curto e devagar',
      body: 'Escolha um trecho de 4 a 8 compassos e um aplicativo que diminua a velocidade sem mudar a altura. Tire o baixo primeiro, depois a melodia. Um refrão bem tirado vale mais que uma música inteira pela metade.',
    },
    { kind: 'exercise', id: 'l64-transpor', exercise: items('Ouve em Dó, toca em outro tom', 'O app toca 5 notas em Dó. Toque o mesmo desenho a partir da nota pedida.', transposeEar, 8, 48, 84, 0.8, 'off') },
    {
      kind: 'exercise',
      id: 'l64-refrao',
      exercise: {
        kind: 'checklist',
        title: 'O seu refrão',
        how: 'Escolha uma canção e siga os quatro passos. Marque o que conseguiu.',
        items: [
          'Achei a tônica e a qualidade (maior ou menor).',
          'Tirei o baixo do refrão.',
          'Escrevi os acordes em cifra e em graus.',
          'Tirei a melodia do refrão.',
          'Toquei o refrão (melodia e acordes) no tom original e em outro tom.',
        ],
      },
    },
    { kind: 'exercise', id: 'l64-quiz', exercise: quiz('Tirar de ouvido', 'Quatro perguntas rápidas.', EAR4_Q, 0.75) },
  ],
  review: [tonic, earBass, transposeEar],
  checkpoint: [
    items('Ditado misto', '12 itens: tônica, baixo, tétrades e transposição, sem dicas. Meta: 80%.', mix([tonic, earBass, earTetradProg, transposeEar]), 12, 36, 84, 0.8, 'off'),
  ],
  exit: [transposeEar, choice(EAR4_Q, 'ouvido-4')],
};

// Marco 2: revisão das unidades 5 a 8.
const m2Minor = buildMinorScale({ keys: ['A', 'E', 'D'], forms: ['natural', 'harmonica', 'melodica'] });
const m2Iv = qualityInterval({ from: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'], intervals: ['3m', '3M', '4J', '4A', '5J', '6m', '6M', '7m', '7M'] });
const m2MinorChords = minorChord({ keys: ['A', 'D', 'E'], degrees: ['i', 'iv', 'V7'], low: 48, high: 72 });
const m2Inv = inversionChord({ chords: ['C', 'F', 'G', 'D', 'Am', 'Dm', 'Em', 'Bb'], inversions: [0, 1, 2] });
const m2Field = diatonicChord({ keys: ['C', 'G', 'D', 'F', 'Bb'], romans: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'], low: 48, high: 72 });
const m2Cad = cadenceChoice({ keys: ['C', 'G', 'F'], kinds: ['perfeita', 'plagal', 'meia', 'deceptiva'] });
const m2Ear = degreeByEar({ tonic: 57, degrees: [1, 2, 3, 4, 5, 6, 8], mode: 'menor' });

const l65: Lesson = {
  n: 65,
  id: 'l65',
  title: 'Marco 2: checkpoint das unidades 5 a 8 e recital',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint cumulativo das unidades 5 a 8, sem dicas.',
    'Consigo improvisar dois chorus de blues com 90% das notas na escala.',
    'Consigo apresentar um recital de 4 peças com análise harmônica escrita.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Dois terços do caminho',
      body: `Desde o Marco 1, você aprendeu o modo menor e os intervalos com nome completo, os quatro tipos de tríade e as inversões, a condução de vozes, o campo harmônico com as funções e as cadências, as tétrades, os shells e as notas-guia, o blues com swing e o improviso com notas-alvo.

O Marco 2 tem as mesmas duas partes do primeiro:

- Um **checkpoint cumulativo** das unidades 5 a 8, sem dicas.
- Um **recital**, agora com improviso e análise.`,
    },
    {
      kind: 'text',
      title: 'O recital',
      body: `Quatro peças, em sequência, como numa apresentação:

1. **Blues de 12 compassos**: shells na esquerda, **dois chorus** (duas voltas) de improviso na direita com a escala blues e notas-alvo. Exercício abaixo.
2. **Canção pop pela cifra**: a **Canção em quatro acordes** (Unidade 6), com o seu arranjo.
3. **Peça clássica**: o **Prelúdio em Dó** de Bach (Unidade 7), com pedal a cada compasso.
4. **Ragtime**: **The Entertainer**, o projeto final desta unidade.

Depois, a **análise escrita**: escolha uma das peças e escreva os graus de cada compasso, as cadências e as funções (T, S, D). Para o Prelúdio, por exemplo: I – ii7 – V7 – I – vi – ... Compare a gravação com a do Marco 1.`,
    },
    { kind: 'song', songId: 'u08-entertainer', why: 'O ragtime do recital e o projeto final da unidade. Comece em 56 BPM no modo Estudar.' },
    { kind: 'song', songId: 'u08-blues', why: 'Um blues escrito, para aquecer a forma antes do improviso.' },
  ],
  review: [m2Minor, m2Iv, m2MinorChords, m2Inv, m2Field, seventhsMain, guideIiVI, m2Cad, m2Ear],
  checkpoint: [
    {
      kind: 'items',
      title: 'Checkpoint cumulativo',
      how: '30 perguntas misturadas das unidades 5 a 8: escalas menores, intervalos, acordes em menor, inversões, campo harmônico, tétrades, notas-guia, cadências e ouvido. Meta: 85%.',
      gen: mix([m2Minor, m2Iv, m2MinorChords, m2Inv, m2Field, seventhsMain, field7, guideIiVI, shells, m2Cad, m2Ear, earTetrads, choice([...TETRADS, ...FIELD7_Q, ...GUIDE_Q, ...BLUES_Q, ...IMPROV_Q])]),
      count: 30,
      low: 36,
      high: 84,
      labels: 'off',
      pass: { accuracy: 0.85 },
    },
    { kind: 'improv', title: 'Dois chorus de blues', how: '24 compassos a 84 BPM com a escala blues de Dó. 90% na escala, metade das trocas numa nota do acorde.', pcs: C_BLUES, bars: 24, bpm: 84, beatsPerBar: 4, backing: bluesBacking, low: 55, high: 84, pass: { inSet: 0.9, restsPer4: 1, endOn: [0], targets: 0.5 } },
  ],
  project: {
    title: 'Recital nº 2: blues e canção',
    brief: `Toque em sequência, sem recomeçar: o **blues** com dois chorus improvisados (exercício abaixo), a **Canção em quatro acordes** pelo seu arranjo, o **Prelúdio em Dó** e **The Entertainer**. Grave tudo e escreva a análise harmônica de uma das peças.`,
    steps: [
      'Passe The Entertainer e o Prelúdio no "Tocar a música" com 85% ou mais no andamento.',
      'Ensaie o blues: dois ciclos de shells sem errar a forma, depois com o improviso.',
      'Faça 5 minutos de aquecimento (escala e arpejo do dia) e grave as quatro peças seguidas.',
      'Escreva a análise de uma peça: graus, funções e cadências.',
      'Ouça e compare com o Marco 1: o que mudou no pulso, no som e na segurança?',
    ],
    rubric: [
      'As peças escritas passaram com 90% das notas.',
      'No improviso, 90% das notas na escala e as chegadas mirando o acorde.',
      'O blues manteve a forma e o swing.',
      'O pedal ficou limpo no Prelúdio.',
      'A análise escrita está correta (graus, funções e cadências).',
    ],
    exercise: { kind: 'improv', title: 'Blues do recital', how: 'Dois chorus a 84 BPM, escala blues, notas-alvo nas trocas.', pcs: C_BLUES, bars: 24, bpm: 84, beatsPerBar: 4, backing: bluesBacking, low: 55, high: 84, pass: { inSet: 0.9, restsPer4: 1, endOn: [0], targets: 0.5 } },
  },
  exit: [seventhsMain, guideIiVI, choice([...TETRADS, ...GUIDE_Q, ...BLUES_Q, ...IMPROV_Q])],
};

// ---------- músicas ----------

// The Entertainer (Scott Joplin, 1902), tema A simplificado. Arranjo do Fermata: uma oitava abaixo, ritmo em colcheias retas, 13 compassos.
const ENT_R = [
  'r:3 D4:0.5 D#4:0.5',
  'E4:0.5 C5 E4:0.5 C5 E4:0.5 C5:0.5',
  'C5:2 r:0.5 C5:0.5 D5:0.5 D#5:0.5',
  'E5:0.5 C5:0.5 D5:0.5 E5 B4:0.5 D5',
  'C5:3 D4:0.5 D#4:0.5',
  'E4:0.5 C5 E4:0.5 C5 E4:0.5 C5:0.5',
  'C5 r:0.5 A4:0.5 G4:0.5 F#4:0.5 A4:0.5 C5:0.5',
  'E5:0.5 D5:0.5 C5:0.5 A4:0.5 D5:2',
  'r:3 D4:0.5 D#4:0.5',
  'E4:0.5 C5 E4:0.5 C5 E4:0.5 C5:0.5',
  'C5:2 r:0.5 C5:0.5 D5:0.5 D#5:0.5',
  'E5:0.5 C5:0.5 D5:0.5 E5 B4:0.5 D5',
  'C5:4',
].join(' | ');
const OOM = { C: 'C3 E3+G3', G7: 'G2 F3+B3', D7: 'D3 F#3+C4', G: 'G2 G3+B3' };
const ENT_L = [
  'r:4',
  `${OOM.C} ${OOM.C}`, `${OOM.C} ${OOM.C}`, `${OOM.C} ${OOM.G7}`, `${OOM.C} r:2`,
  `${OOM.C} ${OOM.C}`, `${OOM.C} ${OOM.D7}`, `${OOM.G} ${OOM.G}`, `${OOM.G7} r:2`,
  `${OOM.C} ${OOM.C}`, `${OOM.C} ${OOM.C}`, `${OOM.C} ${OOM.G7}`, 'C2+C3:4',
].join(' | ');

const entertainer: SongSpec = {
  id: 'u08-entertainer',
  title: 'The Entertainer, tema A',
  composer: 'Scott Joplin',
  arrangement: 'arranjo do Fermata: uma oitava abaixo do original, colcheias retas no lugar das semicolcheias sincopadas, 12 compassos e anacruse; mão esquerda em baixo e acorde ("oom-pah")',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: ENT_R,
  left: ENT_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Blues em Fá do Fermata: riff original na direita (com swing), shells na esquerda.
const RIFF_F = 'r:0.5 F4:0.5 Ab4:0.5 A4:0.5 C5 F4';
const RIFF_BB = 'r:0.5 Bb4:0.5 Db5:0.5 D5:0.5 F5 Bb4';
const RIFF_C = 'r:0.5 C5:0.5 Eb5:0.5 E5:0.5 G5 C5';
const BF_FORM = ['F7', 'F7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'F7', 'C7', 'Bb7', 'F7', 'C7'];
const BF_R = [RIFF_F, 'r:4', RIFF_F, 'Eb5:0.5 C5:0.5 Ab4:0.5 F4:0.5 r:2', RIFF_BB, 'r:4', RIFF_F, 'r:4', RIFF_C, 'Bb4 Ab4 F4:2', RIFF_F, 'C4 E4 G4 Bb4'].join(' | ');
const BF_SHELL: Record<string, string> = { F7: 'F2+Eb3+A3', Bb7: 'Bb2+D3+Ab3', C7: 'C3+E3+Bb3' };
const BF_L = BF_FORM.map((c) => `${BF_SHELL[c]}:4`).join(' | ');

const bluesF: SongSpec = {
  id: 'u08-blues',
  title: 'Blues em Fá',
  composer: 'melodia original do Fermata, forma tradicional de 12 compassos',
  arrangement: 'riff na direita, shells (1-7-3 e 1-3-7) na esquerda; toque as colcheias com swing',
  bpm: 84,
  beatsPerBar: 4,
  fifths: -1,
  right: BF_R,
  left: BF_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const unit: Unit = {
  n: 8,
  id: 'u08',
  title: 'Tétrades, blues e improviso',
  goal: 'Montar e ouvir as cinco tétrades, usar shells e notas-guia no ii–V–I, tocar blues com swing e improvisar com a pentatônica mirando as notas do acorde.',
  technique: 'Arpejos de Dó, Sol, Fá e Lá menor em 2 oitavas, mãos separadas, em tercinas de 44 rumo a 72 BPM, variação abaixo de 35 ms (referência: RCM Level 2). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l58, l59, l60, l61, l62, l63, l64, l65],
  songs: [entertainer, bluesF],
  final: {
    songId: 'u08-entertainer',
    brief: 'O tema A de The Entertainer, o ragtime de Scott Joplin (1902): melodia saltitante na direita e o "oom-pah" da esquerda (baixo no 1 e no 3, acorde no 2 e no 4). Junto com ele, o projeto pede um blues de 12 compassos com shells na esquerda e improviso na direita.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [seventhsAll, seventhsMain, halfDimDim, field7, field7C, earTetrads, earMaj7Dom, guideIiVI, guideCycle, shells, shellsBlues, echoBlues, earBass, earTetradProg, transposeEar, tonic, m2Minor, m2Iv, m2MinorChords, m2Inv, m2Field, m2Cad, m2Ear];
