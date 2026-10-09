// Unidade 8 — Tétrades, blues e improvisação (lições 58 a 65). Projeto final: The Entertainer (Joplin), simplificado, + blues de 12 compassos.
// A lição 65 é o Marco 2: checkpoint das unidades 5 a 8 e recital.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import {
  chordQualityByEar, chordSequence, choice, diatonicChord, mix, playChord, shellChord, FIELD7, type ChoiceQuestion,
} from '../gens';
import { pick } from '../music';
import { melodyTask } from '../tasks';
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

const unit: Unit = {
  n: 8,
  id: 'u08',
  title: 'Tétrades, blues e improviso',
  goal: 'Montar e ouvir as cinco tétrades, usar shells e notas-guia no ii–V–I, tocar blues com swing e improvisar com a pentatônica mirando as notas do acorde.',
  technique: 'Arpejos de Dó, Sol, Fá e Lá menor em 2 oitavas, mãos separadas, em tercinas de 44 rumo a 72 BPM, variação abaixo de 35 ms (referência: RCM Level 2). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l58, l59, l60, l61],
  songs: [entertainer],
  final: {
    songId: 'u08-entertainer',
    brief: 'O tema A de The Entertainer, o ragtime de Scott Joplin (1902): melodia saltitante na direita e o "oom-pah" da esquerda (baixo no 1 e no 3, acorde no 2 e no 4). Junto com ele, o projeto pede um blues de 12 compassos com shells na esquerda e improviso na direita.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [seventhsAll, seventhsMain, halfDimDim, field7, field7C, earTetrads, earMaj7Dom, guideIiVI, guideCycle, shells];
