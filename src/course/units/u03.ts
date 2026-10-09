// Unidade 3 — Primeiros acordes, cifra e acompanhamento (lições 17 a 24). Projeto final: Amazing Grace com acordes.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { choice, harmonize, mix, playChord, primaryChord, resolveCadence, transposeProgression, type ChoiceQuestion } from '../gens';
import { n, pick } from '../music';
import { melodyTask, randomRhythm, twoHandTask } from '../tasks';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

// ---------- escrita: acordes da mão esquerda e transposição de linhas ----------

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Transpõe uma linha escrita ("C4 E4:2 | C3+E3+G3:4") em semitons, grafando com bemóis se pedido. */
function shift(text: string, semis: number, flats = false): string {
  return text.replace(/[A-G](?:#|b)?-?\d/g, (name) => {
    const m = n(name) + semis;
    return `${(flats ? FLAT : SHARP)[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
  });
}

// Mão esquerda em Dó, posição próxima (a mão quase não se move): I, IV, V, V7.
const I = 'C3+E3+G3';
const IV = 'C3+F3+A3';
const V = 'B2+D3+G3';
const V7 = 'B2+F3+G3';

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

// ---------- perguntas ----------

const CHORDS: ChoiceQuestion[] = [
  { q: 'Um acorde maior em estado fundamental é formado por…', options: ['Fundamental, 3ª e 5ª', 'Fundamental, 2ª e 4ª', 'Três notas vizinhas'], answer: 0, why: 'Terças empilhadas: 1, 3 e 5.' },
  { q: 'Quais notas formam o acorde de Fá maior?', options: ['Fá, Lá, Dó', 'Fá, Sol, Lá', 'Fá, Si, Ré'], answer: 0, why: 'Fá, pula Sol, Lá, pula Si, Dó.' },
  { q: 'Quais notas formam o acorde de Sol maior?', options: ['Sol, Si, Ré', 'Sol, Lá, Si', 'Sol, Dó, Mi'], answer: 0, why: 'Sol, Si, Ré: uma tecla branca sim, outra não.' },
  { q: 'No acorde maior, da fundamental até a 3ª há…', options: ['4 semitons', '3 semitons', '2 semitons'], answer: 0, why: 'Maior = 4 semitons até a 3ª, mais 3 até a 5ª.' },
  { q: 'Acorde quebrado (arpejado) é…', options: ['As notas do acorde uma de cada vez', 'Um acorde errado', 'Um acorde sem a 5ª'], answer: 0, why: 'Bloco: todas juntas. Quebrado: uma por vez.' },
  { q: 'Qual é o acorde de Ré maior?', options: ['Ré, Fá♯, Lá', 'Ré, Fá, Lá', 'Ré, Sol, Si'], answer: 0, why: 'De Ré, 4 semitons dão Fá♯; mais 3 dão Lá.' },
];

const DOMINANT: ChoiceQuestion[] = [
  { q: 'Em Dó maior, o acorde do V grau é…', options: ['Sol (G)', 'Fá (F)', 'Ré (D)'], answer: 0, why: 'Conte de Dó: Dó (I), Ré, Mi, Fá (IV), Sol (V).' },
  { q: 'O G7 tem quais notas?', options: ['Sol, Si, Ré, Fá', 'Sol, Si, Ré, Fá♯', 'Sol, Dó, Mi'], answer: 0, why: 'Sol maior mais a 7ª: Fá.' },
  { q: 'O par de notas que dá tensão ao G7 é…', options: ['Si e Fá (o trítono)', 'Sol e Ré', 'Dó e Mi'], answer: 0, why: 'Si e Fá ficam a 3 tons de distância. Eles se resolvem fechando em Dó e Mi.' },
  { q: 'Na posição próxima, de Dó (Dó–Mi–Sol) para G7, a mão esquerda toca…', options: ['Si–Fá–Sol', 'Sol–Si–Ré–Fá', 'Ré–Fá–Si'], answer: 0, why: 'Dó desce para Si, Mi sobe para Fá, Sol fica. A 5ª (Ré) fica de fora.' },
  { q: 'Na cadência V7–I, o Si vai para…', options: ['Dó (sobe um semitom)', 'Lá', 'Sol'], answer: 0, why: 'O Si é a sensível: puxa meio tom para cima, até a casa.' },
];

const FUNCTIONS: ChoiceQuestion[] = [
  { q: 'Em Dó maior, o IV é…', options: ['Fá (F)', 'Sol (G)', 'Lá (A)'], answer: 0, why: 'Dó, Ré, Mi, Fá: 4º grau.' },
  { q: 'Que função tem o I?', options: ['Casa, repouso', 'Tensão', 'Afastamento'], answer: 0, why: 'O I é a tônica: é onde a música descansa.' },
  { q: 'Que função tem o V7?', options: ['Tensão que pede o I', 'Repouso', 'Afastamento suave'], answer: 0, why: 'Dominante: tensão máxima, quer voltar para casa.' },
  { q: 'Que função tem o IV?', options: ['Afastamento suave da casa', 'Tensão máxima', 'Repouso total'], answer: 0, why: 'Subdominante: sai de casa sem pressa, sem a tensão do V7.' },
  { q: 'A cifra F significa…', options: ['Acorde de Fá maior', 'Nota Fá sozinha', 'Fá menor'], answer: 0, why: 'Letra sozinha = acorde maior. Menor leva "m": Fm.' },
  { q: 'A cifra G7 significa…', options: ['Sol com sétima (dominante)', 'Sol, 7 vezes', 'Sétimo grau'], answer: 0, why: 'O 7 acrescenta a 7ª menor ao acorde maior: G, B, D, F.' },
];

// ---------- peças reaproveitadas ----------

const chordsCFG = playChord({ symbols: ['C', 'F', 'G'], low: 48, high: 72, requireBass: true });
const chordsDAE = playChord({ symbols: ['D', 'A', 'E'], low: 48, high: 72, requireBass: true });
const chordsCG7 = playChord({ symbols: ['C', 'G7'], low: 36, high: 72, omitFifth: true });
const chordsCFG7 = playChord({ symbols: ['C', 'F', 'G7'], low: 36, high: 72, omitFifth: true, skill: 'cifra' });
const cadenceC = resolveCadence({ keys: ['C'], before: [['I', 'V7'], ['V7'], ['IV', 'V7']] });

const HARM_C = harmonize({
  key: 'C',
  bars: [
    { notes: [60, 64, 67, 64], degree: 'I' },
    { notes: [64, 64, 67], degree: 'I' },
    { notes: [72, 67, 64], degree: 'I' },
    { notes: [65, 69, 72], degree: 'IV' },
    { notes: [69, 69, 72, 69], degree: 'IV' },
    { notes: [72, 69, 65], degree: 'IV' },
    { notes: [67, 71, 74], degree: 'V7' },
    { notes: [71, 71, 74], degree: 'V7' },
    { notes: [74, 71, 67, 65], degree: 'V7' },
    { notes: [62, 62, 65], degree: 'V7' },
  ],
});

/** Acorde arpejado e em bloco, em compassos de 4/4. */
const BROKEN = [
  'C4 E4 G4 E4 | F4 A4 C5 A4 | G4 B4 D5 B4 | C4 E4 G4:2',
  'C4 E4 G4 C5 | G4 E4 C4:2 | G3 B3 D4 G4 | C4 E4 G4:2',
  'F4 A4 C5 A4 | C4 E4 G4 E4 | G4 B4 D5 B4 | C4:4',
];
const SWITCH_CG = [
  'C4+E4+G4:2 G3+B3+D4:2 | C4+E4+G4:2 G3+B3+D4:2 | C4+E4+G4:2 G3+B3+D4:2 | C4+E4+G4:4',
  'C4+E4+G4:2 F3+A3+C4:2 | C4+E4+G4:2 G3+B3+D4:2 | C4+E4+G4:2 F3+A3+C4:2 | C4+E4+G4:4',
  'G3+B3+D4:2 C4+E4+G4:2 | F3+A3+C4:2 C4+E4+G4:2 | G3+B3+D4:2 C4+E4+G4:2 | C4+E4+G4:4',
];

// ---------- músicas ----------

// Mary Had a Little Lamb (canção tradicional americana, séc. XIX): só I e V7.
const MARY_R = 'E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 | E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4';
const MARY_L = `${I}:4 | ${I}:4 | ${V7}:4 | ${I}:4 | ${I}:4 | ${I}:4 | ${V7}:4 | ${I}:4`;

// Brilha, brilha, estrelinha (melodia folclórica francesa, "Ah! vous dirai-je, maman"): I, IV e V7, um acorde a cada 2 tempos.
const TWINKLE_R = 'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2';
const TW_A = `${I}:4 | ${IV}:2 ${I}:2 | ${IV}:2 ${I}:2 | ${V7}:2 ${I}:2`;
const TW_B = `${I}:2 ${V7}:2 | ${I}:2 ${V7}:2 | ${I}:2 ${V7}:2 | ${I}:2 ${V7}:2`;
const TWINKLE_L = `${TW_A} | ${TW_B} | ${TW_A}`;

const mary: SongSpec = {
  id: 'u03-mary',
  title: 'Mary Had a Little Lamb',
  composer: 'canção tradicional',
  arrangement: 'arranjo do Fermata: melodia na posição de Dó e acordes de Dó e G7 em posição próxima na mão esquerda',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: MARY_R,
  left: MARY_L,
  hands: 'duas',
  pass: { accuracy: 0.9 },
};

const twinkleC: SongSpec = {
  id: 'u03-brilha-c',
  title: 'Brilha, brilha, estrelinha (em Dó)',
  composer: 'melodia folclórica francesa',
  arrangement: 'arranjo do Fermata: I, IV e V7 em bloco na mão esquerda, um acorde a cada 2 tempos',
  bpm: 76,
  beatsPerBar: 4,
  fifths: 0,
  right: TWINKLE_R,
  left: TWINKLE_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Amazing Grace (melodia "New Britain", EUA, 1829): 3/4 com anacruse, I–IV–V7.
const AMAZING_R = 'r:2 G4 | C5:2 E5 | E5:2 D5 | C5:2 A4 | G4:2 G4 | C5:2 E5 | E5:2 D5 | G5:3 | G5:2 E5 | G5:2 E5 | E5:2 D5 | C5:2 A4 | G4:2 G4 | C5:2 E5 | E5:2 D5 | C5:2 r';
const AMAZING_L = `r:3 | ${I}:3 | ${I}:3 | ${IV}:3 | ${I}:3 | ${I}:3 | ${I}:3 | ${V}:3 | ${V7}:3 | ${I}:3 | ${I}:3 | ${IV}:3 | ${I}:3 | ${I}:3 | ${V7}:3 | ${I}:2 r`;

const amazing: SongSpec = {
  id: 'u03-amazing',
  title: 'Amazing Grace',
  composer: 'melodia tradicional "New Britain"',
  arrangement: 'arranjo do Fermata em Dó: melodia uma oitava acima do Dó central, um acorde por compasso (I, IV, V e V7 em posição próxima) na mão esquerda; anacruse escrita com duas pausas',
  bpm: 84,
  beatsPerBar: 3,
  fifths: 0,
  right: AMAZING_R,
  left: AMAZING_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// ---------- lições ----------

const l17: Lesson = {
  n: 17,
  id: 'l17',
  title: 'O acorde maior',
  minutes: 60,
  objectives: [
    'Consigo montar Dó, Fá e Sol maior em estado fundamental, sem olhar.',
    'Consigo tocar um acorde em bloco e quebrado.',
    'Consigo trocar entre Dó e Sol no tempo, sem parar.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Acorde: terças empilhadas',
      body: `Um **acorde** é um grupo de notas tocadas juntas que soa como uma unidade. O acorde mais comum da música ocidental, a **tríade**, é feito de **terças empilhadas**: uma nota de base, a 3ª acima dela e a 5ª acima dela.

- A nota de base se chama **fundamental** (ou 1). Ela dá o nome ao acorde.
- A **3ª** dá a cor: alegre (maior) ou triste (menor).
- A **5ª** dá corpo e estabilidade.

No teclado, a tríade em **estado fundamental** (com a fundamental embaixo) tem um desenho fácil nas teclas brancas: **toca uma, pula uma, toca uma, pula uma, toca uma**. Dó maior = **Dó, Mi, Sol**. Fá maior = **Fá, Lá, Dó**. Sol maior = **Sol, Si, Ré**.

Na mão direita, o dedilhado padrão é **1, 3, 5**: polegar na fundamental, médio na 3ª, mínimo na 5ª. Na esquerda, **5, 3, 1**.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 74,
      lit: [60, 64, 67],
      labels: { 60: '1', 64: '3', 67: '5' },
      caption: 'Dó maior em estado fundamental: Dó, Mi, Sol. Toca uma, pula uma.',
    },
    {
      kind: 'text',
      title: 'Por que soa "maior"',
      body: `O desenho "toca uma, pula uma" funciona para Dó, Fá e Sol, mas não para todo acorde. O que define um acorde **maior** é a medida exata em semitons:

- Da fundamental até a 3ª: **4 semitons** (uma terça maior).
- Da 3ª até a 5ª: **3 semitons** (uma terça menor).

Conte em Dó maior: Dó → Mi passa por Dó♯, Ré, Ré♯, Mi = 4 semitons. Mi → Sol passa por Fá, Fá♯, Sol = 3 semitons.

Agora tente Ré: "toca uma, pula uma" daria Ré, Fá, Lá. Mas de Ré a Fá são só 3 semitons. Para ser maior, a 3ª precisa subir um: **Fá♯**. Ré maior = **Ré, Fá♯, Lá**. É assim que a fórmula 4 + 3 constrói o acorde maior a partir de qualquer nota.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'decorar o desenho em vez da fórmula',
      body: 'Ré, Mi e Lá maior têm uma tecla preta no meio; Si maior tem duas. Se você só decorou "brancas pulando", vai tocar o acorde menor sem perceber. Na dúvida, conte: 4 semitons até a 3ª, mais 3 até a 5ª.',
    },
    {
      kind: 'example',
      title: 'Bloco e quebrado',
      steps: [
        { say: '**Dó maior em bloco**: as três notas juntas.', keys: [60, 64, 67], play: { bpm: 72, steps: [{ midis: [60, 64, 67], beats: 3 }] } },
        { say: '**Dó maior quebrado** (arpejado): uma nota de cada vez, de baixo para cima.', keys: [60, 64, 67], play: { bpm: 96, steps: [60, 64, 67, 72, 67, 64].map((m) => ({ midis: [m], beats: 1 })).concat([{ midis: [60], beats: 2 }]) } },
        { say: '**Fá maior**: Fá, Lá, Dó.', keys: [65, 69, 72], play: { bpm: 72, steps: [{ midis: [65], beats: 1 }, { midis: [69], beats: 1 }, { midis: [72], beats: 1 }, { midis: [65, 69, 72], beats: 3 }] } },
        { say: '**Sol maior**: Sol, Si, Ré.', keys: [67, 71, 74], play: { bpm: 72, steps: [{ midis: [67], beats: 1 }, { midis: [71], beats: 1 }, { midis: [74], beats: 1 }, { midis: [67, 71, 74], beats: 3 }] } },
      ],
    },
    { kind: 'exercise', id: 'l17-cfg', exercise: { kind: 'items', title: 'Dó, Fá e Sol em estado fundamental', how: 'O app mostra a cifra; toque o acorde com a fundamental embaixo, em qualquer oitava.', gen: chordsCFG, count: 20, low: 48, high: 72, labels: 'fade', pass: { accuracy: 0.9 } } },
    { kind: 'exercise', id: 'l17-quebrado', exercise: quickTimed('Acordes quebrados', 'Arpejos de Dó, Fá e Sol na mão direita, a 72 BPM. Duas passadas boas.', (rng) => melodyTask(pick(rng, BROKEN), { bpm: 72 }), { reps: 2 }) },
    {
      kind: 'text',
      title: 'Trocar de acorde sem parar',
      body: `Saber montar um acorde é metade do trabalho. A outra metade é **trocar** de um acorde para outro no tempo, sem buraco. Três hábitos ajudam:

- **Olhe para o próximo acorde antes de sair do atual.** A mão chega mais rápido onde os olhos já estão.
- **Mova a mão inteira como um bloco**, com o formato do acorde já pronto no ar. Não monte nota por nota em cima da tecla.
- **Chegue junto**: as três notas descem ao mesmo tempo. Acorde "escorrido" (uma nota antes das outras) soa como hesitação.

No exercício, o app mede cada nota no tempo, com janela de ±80 ms. Comece devagar: o que conta é a troca limpa.`,
    },
    { kind: 'exercise', id: 'l17-trocas', exercise: quickTimed('Trocas de acorde', 'Dó, Sol e Fá em bloco, mínimas a 60 BPM. Mão direita. Duas passadas boas.', (rng) => melodyTask(pick(rng, SWITCH_CG), { bpm: 60 }), { reps: 2, window: 80 }) },
    { kind: 'exercise', id: 'l17-desafio', exercise: { kind: 'items', title: 'Desafio: Ré, Lá e Mi maior', how: 'Cada um tem uma tecla preta. Use a fórmula: 4 semitons até a 3ª, mais 3 até a 5ª.', gen: chordsDAE, count: 9, low: 48, high: 76, labels: 'fade', pass: { accuracy: 0.75 } } },
    { kind: 'exercise', id: 'l17-quiz', exercise: quiz('O acorde maior', 'Seis perguntas rápidas.', CHORDS) },
  ],
  review: [chordsCFG, chordsDAE, choice(CHORDS, 'acorde-maior')],
  checkpoint: [
    { kind: 'items', title: '20 acordes', how: 'Dó, Fá e Sol em estado fundamental, sem dicas. Meta: 90%.', gen: chordsCFG, count: 20, low: 48, high: 72, labels: 'off', pass: { accuracy: 0.9 } },
    quickTimed('Trocas no tempo', 'Sequência nova de trocas a 72 BPM, sem dicas.', (rng) => melodyTask(pick(rng, SWITCH_CG), { bpm: 72 }), { window: 80 }),
  ],
  exit: [chordsCFG, choice(CHORDS, 'acorde-maior')],
};

const l18: Lesson = {
  n: 18,
  id: 'l18',
  title: 'I–V7–I em Dó',
  minutes: 60,
  objectives: [
    'Consigo tocar Dó e G7 em posição próxima na mão esquerda, movendo o mínimo.',
    'Consigo completar uma cadência V7–I de ouvido.',
    'Consigo acompanhar uma melodia de 8 compassos com I e V7 a 72 BPM.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Graus: o nome do acorde pela posição na escala',
      body: `Numa tonalidade, cada acorde ganha um número romano pela nota da escala em que ele começa. Em Dó maior, conte a partir de Dó: Dó é o **I**, Ré o II, Mi o III, Fá o **IV**, Sol o **V**.

Os graus importam mais do que os nomes, porque eles dizem o **papel** do acorde. O **I** é a casa. O **V** é o acorde que mais puxa de volta para casa. Essa ida e volta, I → V → I, é a menor história que a harmonia sabe contar, e está em quase toda música tonal, de Bach ao sertanejo.`,
    },
    {
      kind: 'text',
      title: 'O V7 e o trítono',
      body: `Acrescente ao acorde de Sol maior mais uma terça: Sol, Si, Ré e **Fá**. Esse acorde de 4 notas é o **G7**, o "Sol com sétima", ou **V7** em Dó maior. O nome técnico é **dominante**.

O segredo da tensão do V7 está em duas notas: **Si e Fá**. A distância entre elas é de 3 tons inteiros, o **trítono**, um intervalo instável que quer se resolver. E ele se resolve de um jeito muito particular:

- O **Si sobe meio tom** para o Dó. Ele é a **sensível**: a nota que "sente" a casa logo acima.
- O **Fá desce meio tom** para o Mi.

Dó e Mi: o acorde de Dó. Por isso o V7 → I soa como um ponto final.`,
    },
    {
      kind: 'text',
      title: 'Posição próxima: mão mínima',
      body: `Na mão esquerda, você poderia saltar de Dó (Dó–Mi–Sol) para G7 em estado fundamental (Sol–Si–Ré–Fá). Mas há um jeito muito melhor: mover o **mínimo possível**.

Parta de **Dó3, Mi3, Sol3** (dedos 5, 3, 1). Para o G7:

- O **Dó desce meio tom** para o **Si2** (dedo 5).
- O **Mi sobe meio tom** para o **Fá3** (dedo 2).
- O **Sol fica** onde está (dedo 1).

**Si2, Fá3, Sol3**: um G7 sem o Ré (a 5ª pode faltar sem problema, porque o trítono Si–Fá continua lá). Essa é a **posição próxima**: a mão quase não sai do lugar, e as vozes andam por semitom, que é o caminho que o ouvido acha mais natural.`,
    },
    {
      kind: 'keys',
      low: 45,
      high: 60,
      lit: [47, 53, 55],
      labels: { 47: 'Si 5', 53: 'Fá 2', 55: 'Sol 1', 48: 'Dó', 52: 'Mi' },
      caption: 'G7 em posição próxima na mão esquerda: Si2 (dedo 5), Fá3 (dedo 2), Sol3 (dedo 1). Vem de Dó–Mi–Sol movendo dois dedos por meio tom.',
    },
    {
      kind: 'example',
      title: 'I – V7 – I na mão esquerda',
      steps: [
        { say: 'Dó: Dó3, Mi3, Sol3.', keys: [48, 52, 55], play: { bpm: 72, steps: [{ midis: [48, 52, 55], beats: 2 }] } },
        { say: 'G7: o Dó desce para Si, o Mi sobe para Fá, o Sol fica.', keys: [47, 53, 55], play: { bpm: 72, steps: [{ midis: [47, 53, 55], beats: 2 }] } },
        { say: 'De volta ao Dó: Si sobe para Dó, Fá desce para Mi. Ouça a resolução.', keys: [48, 52, 55], play: { bpm: 72, steps: [{ midis: [48, 52, 55], beats: 2 }, { midis: [47, 53, 55], beats: 2 }, { midis: [48, 52, 55], beats: 4 }] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'por que o G7 sem Ré ainda é G7',
      body: 'O ouvido reconhece um acorde pelas notas que definem a cor dele. No V7, quem define é o trítono Si–Fá, mais a fundamental Sol. A 5ª (Ré) só reforça. Em posição próxima ela é a primeira a sair, e o app aceita o G7 com ou sem ela.',
    },
    { kind: 'exercise', id: 'l18-acordes', exercise: { kind: 'items', title: 'Dó ou G7', how: 'Toque o acorde da cifra. No G7, a 5ª (Ré) pode faltar.', gen: chordsCG7, count: 16, low: 36, high: 72, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l18-me', exercise: quickTimed('I e V7 na mão esquerda', 'Só a mão esquerda, semibreves a 66 BPM: Dó, G7, G7, Dó. Mova só os dedos que precisam. Duas passadas boas.', () => melodyTask(`${I}:4 | ${V7}:4 | ${V7}:4 | ${I}:4`, { bpm: 66, clef: 'bass' }), { reps: 2 }) },
    { kind: 'exercise', id: 'l18-cadencia', exercise: { kind: 'items', title: 'Complete a cadência', how: 'O app toca o começo; você toca o acorde de Dó que resolve.', gen: cadenceC, count: 8, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'Melodia e acompanhamento',
      body: `Agora as duas coisas juntas: a mão direita na melodia, a esquerda nos acordes. A regra de ouro da lição 14 continua valendo: a esquerda precisa ficar **automática**. Toque a progressão da esquerda sozinha até ela sair sem pensar, e só então junte.

Em "Mary Had a Little Lamb", uma canção tradicional americana do século XIX, a melodia avisa quando trocar: nos compassos que passam pelo **Ré**, a harmonia vai para G7; nos outros, fica em Dó. O Ré está no G7 (é a 5ª), mas não no Dó.`,
    },
    { kind: 'exercise', id: 'l18-mary', exercise: quickTimed('Mary Had a Little Lamb, duas mãos', 'Melodia na direita, Dó e G7 na esquerda. Começa a 60 BPM e sobe até 72.', () => twoHandTask(MARY_R, MARY_L, { bpm: 60, caption: 'Esquerda: Dó nos compassos 1, 2, 4, 5, 6 e 8; G7 nos compassos 3 e 7.' }), { ladder: { from: 60, to: 72, step: 4 } }) },
    { kind: 'song', songId: 'u03-mary', why: 'A mesma música na pauta dupla, com os acordes escritos na clave de Fá.' },
    { kind: 'exercise', id: 'l18-quiz', exercise: quiz('A dominante', 'Cinco perguntas rápidas.', DOMINANT) },
  ],
  review: [chordsCG7, cadenceC, choice(DOMINANT, 'dominante')],
  checkpoint: [
    quickTimed('Mary Had a Little Lamb a 72 BPM', '8 compassos, duas mãos, sem dicas. Meta: 90% das notas, ±80 ms.', () => twoHandTask(MARY_R, MARY_L, { bpm: 72 }), { window: 80, pass: { accuracy: 0.9 } }),
    { kind: 'items', title: 'Acordes e cadências', how: 'Dó, G7 e cadências para completar, misturados com acordes da lição 17.', gen: mix([chordsCG7, cadenceC, chordsCFG]), count: 12, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [chordsCG7, choice(DOMINANT, 'dominante')],
};

const l19: Lesson = {
  n: 19,
  id: 'l19',
  title: 'IV e a cifra básica',
  minutes: 60,
  objectives: [
    'Consigo ler as cifras C, F e G7 e tocar cada acorde em menos de 3 s.',
    'Consigo dizer a função de I, IV e V7: casa, afastamento e tensão.',
    'Consigo escolher o acorde certo para um trecho de melodia.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O terceiro acorde: o IV',
      body: `Com I e V7 dá para acompanhar muitas canções, mas falta uma cor. O terceiro acorde primário é o **IV**: em Dó maior, **Fá maior** (Fá, Lá, Dó).

Os três têm funções diferentes, como personagens de uma história:

- **I (tônica)**: a casa. Repouso.
- **IV (subdominante)**: sair de casa. Um afastamento suave, sem urgência.
- **V7 (dominante)**: a tensão. Quer voltar para casa.

A progressão **I – IV – V7 – I** conta a história inteira: casa, passeio, tensão, volta. Ela é a espinha de milhares de canções folclóricas, do blues ao forró.`,
    },
    {
      kind: 'text',
      title: 'O IV em posição próxima',
      body: `Na mão esquerda, o Fá também não precisa de salto. Parta do Dó (**Dó3, Mi3, Sol3**):

- O **Dó fica**.
- O **Mi sobe meio tom** para **Fá3**.
- O **Sol sobe um tom** para **Lá3**.

**Dó3, Fá3, Lá3**: Fá maior com o Dó no baixo. As três notas são as mesmas do Fá maior em estado fundamental, só reorganizadas: isso é uma **inversão**, assunto da Unidade 6. Por enquanto basta saber que é o mesmo acorde, mais perto da mão.

Com isso, os três acordes cabem quase no mesmo lugar: Dó (Dó–Mi–Sol), Fá (Dó–Fá–Lá) e G7 (Si–Fá–Sol).`,
    },
    {
      kind: 'example',
      title: 'I – IV – V7 – I',
      steps: [
        { say: 'Dó: casa.', keys: [48, 52, 55], play: { bpm: 72, steps: [{ midis: [48, 52, 55], beats: 2 }] } },
        { say: 'Fá: sai de casa. O Dó fica; Mi e Sol sobem.', keys: [48, 53, 57], play: { bpm: 72, steps: [{ midis: [48, 53, 57], beats: 2 }] } },
        { say: 'G7: tensão.', keys: [47, 53, 55], play: { bpm: 72, steps: [{ midis: [47, 53, 55], beats: 2 }] } },
        { say: 'A história inteira: casa, passeio, tensão, volta.', play: { bpm: 72, steps: [[48, 52, 55], [48, 53, 57], [47, 53, 55], [48, 52, 55]].map((m, i) => ({ midis: m, beats: i === 3 ? 4 : 2 })) } },
      ],
    },
    {
      kind: 'text',
      title: 'Ler cifra',
      body: `A **cifra** é a escrita de acordes da música popular: letras em cima da melodia, no ponto em que o acorde entra. Cada letra é uma fundamental (C = Dó, D = Ré, E = Mi, F = Fá, G = Sol, A = Lá, B = Si) e o que vem depois diz a qualidade:

- Letra sozinha: acorde **maior**. **C** = Dó maior. **F** = Fá maior.
- **7**: acrescenta a 7ª da dominante. **G7** = Sol, Si, Ré, Fá.
- Minúsculo **m**: acorde menor (vem na Unidade 5). **Am** = Lá menor.

A cifra diz **qual** acorde, não **como** tocar. A posição, o ritmo e o padrão da mão esquerda são decisão sua. Por isso dá para tocar C–F–G7 em posição próxima e chamar de "C, F, G7".`,
    },
    { kind: 'exercise', id: 'l19-chuva', exercise: { kind: 'items', title: 'Chuva de cifras', how: 'C, F ou G7: toque em qualquer posição. Meta: 90% e menos de 3 s por acorde.', gen: chordsCFG7, count: 20, low: 36, high: 72, labels: 'fade', pass: { accuracy: 0.9, avgMs: 3000 } } },
    {
      kind: 'text',
      title: 'Harmonizar: o acorde que contém a melodia',
      body: `**Harmonizar** é escolher os acordes para uma melodia. Com só três acordes, a regra prática é simples: **escolha o acorde que contém as notas da melodia**, principalmente as do tempo forte e as mais longas.

- Melodia com **Dó, Mi, Sol** → I (C).
- Melodia com **Fá, Lá, Dó** → IV (F).
- Melodia com **Sol, Si, Ré, Fá** → V7 (G7).

Algumas notas pertencem a dois acordes: o Dó está no C e no F; o Sol está no C e no G7. Nesses casos, olhe as vizinhas. **Mi** só está no C, **Lá** só no F, **Si** e **Ré** só no G7: elas decidem.

Uma segunda regra: termine no **I**. E antes dele, o V7 soa melhor do que o IV.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'decidir pela primeira nota',
      body: 'A primeira nota de um trecho pode ser só uma nota de passagem. Decida pelo conjunto: se aparecem Si ou Ré, é G7; se aparece Lá, é F; se aparece Mi, é C.',
    },
    { kind: 'exercise', id: 'l19-harmonizar', exercise: { kind: 'items', title: 'Que acorde cabe aqui?', how: 'A pauta mostra um trecho de melodia em Dó. Toque o acorde (C, F ou G7) que contém essas notas.', gen: HARM_C, count: 12, low: 36, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l19-brilha-me', exercise: quickTimed('Brilha, brilha: só a esquerda', 'Os 4 primeiros compassos da progressão: C, F–C, F–C, G7–C, a 66 BPM. Duas passadas boas.', () => melodyTask(TW_A, { bpm: 66, clef: 'bass' }), { reps: 2 }) },
    { kind: 'exercise', id: 'l19-brilha', exercise: quickTimed('Brilha, brilha, estrelinha', 'Melodia folclórica francesa, 12 compassos, duas mãos. Começa a 56 BPM e sobe até 72.', () => twoHandTask(TWINKLE_R, TWINKLE_L, { bpm: 56, caption: 'Um acorde a cada 2 tempos. Veja a partitura completa no "Tocar a música".' }), { ladder: { from: 56, to: 72, step: 4 } }) },
    { kind: 'song', songId: 'u03-brilha-c', why: 'A partitura completa com os acordes: confira na clave de Fá onde cada um entra.' },
    { kind: 'exercise', id: 'l19-quiz', exercise: quiz('Funções e cifra', 'Seis perguntas rápidas.', FUNCTIONS) },
  ],
  review: [chordsCFG7, HARM_C, choice(FUNCTIONS, 'funcoes')],
  checkpoint: [
    { kind: 'items', title: '20 cifras', how: 'C, F e G7, sem dicas. Meta: 90% e menos de 3 s.', gen: chordsCFG7, count: 20, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.9, avgMs: 3000 } },
    { kind: 'items', title: 'Harmonize', how: 'Trechos novos, misturados com cadências. Meta: 85%.', gen: mix([HARM_C, HARM_C, cadenceC]), count: 12, low: 36, high: 84, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [chordsCFG7, choice(FUNCTIONS, 'funcoes')],
};

const EIGHTHS: ChoiceQuestion[] = [
  { q: 'Quantas colcheias cabem numa semínima?', options: ['1', '2', '4'], answer: 1, why: 'Colcheia = meio tempo.' },
  { q: 'Como se conta "1 e 2 e"?', options: ['Números nos tempos, "e" no meio de cada tempo', 'Um número por colcheia', 'Só os tempos fortes'], answer: 0, why: 'Os números caem no tempo; o "e" divide o tempo ao meio.' },
  { q: 'Duas colcheias seguidas costumam ser escritas…', options: ['Unidas por uma barra (bandeirola)', 'Separadas por pausa', 'Com ponto'], answer: 0, why: 'A barra junta colcheias do mesmo tempo, para ficar fácil ver onde está cada tempo.' },
  { q: 'O padrão "raiz e 5ª" na mão esquerda em Dó toca…', options: ['Dó e Sol alternados', 'Dó e Mi alternados', 'O acorde inteiro'], answer: 0, why: 'Fundamental e 5ª do acorde: no Dó, Dó e Sol; no Fá, Fá e Dó; no Sol, Sol e Ré.' },
  { q: 'Num padrão de mão esquerda, a mão direita…', options: ['Toca a melodia por cima', 'Toca o mesmo padrão', 'Fica parada'], answer: 0, why: 'A esquerda dá a harmonia e o ritmo; a direita canta a melodia.' },
];

const KEY_G: ChoiceQuestion[] = [
  { q: 'Em Sol maior, o IV é…', options: ['Dó (C)', 'Ré (D)', 'Fá (F)'], answer: 0, why: 'Sol, Lá, Si, Dó: 4º grau.' },
  { q: 'Em Sol maior, o V7 é…', options: ['D7', 'C7', 'G7'], answer: 0, why: 'Sol, Lá, Si, Dó, Ré: o 5º grau é Ré.' },
  { q: 'O D7 tem quais notas?', options: ['Ré, Fá♯, Lá, Dó', 'Ré, Fá, Lá, Dó', 'Ré, Fá♯, Lá, Dó♯'], answer: 0, why: 'Ré maior (Ré, Fá♯, Lá) mais a 7ª da dominante, Dó.' },
  { q: 'Transpor I–IV–V7 de Dó para Sol dá…', options: ['G – C – D7', 'G – F – C7', 'C – F – G7'], answer: 0, why: 'Os graus não mudam; mudam os acordes: o I vira G, o IV vira C, o V7 vira D7.' },
  { q: 'A sensível de Sol maior (a nota que puxa para o Sol) é…', options: ['Fá♯', 'Fá', 'Lá'], answer: 0, why: 'Meio tom abaixo da tônica: Fá♯. Ela está no D7.' },
];

const PEDAL: ChoiceQuestion[] = [
  { q: 'O pedal da direita (sustentação)…', options: ['Deixa as notas soando depois de soltar as teclas', 'Deixa o som mais forte', 'Abafa o som'], answer: 0, why: 'Ele levanta os abafadores: as cordas continuam vibrando.' },
  { q: 'Onde fica o pé no pedal?', options: ['Calcanhar no chão, parte da frente do pé no pedal', 'Pé inteiro no ar', 'Ponta do pé, calcanhar levantado'], answer: 0, why: 'O calcanhar é o apoio; o movimento vem do tornozelo.' },
  { q: 'No pedal direto, o pedal desce…', options: ['Junto com o acorde', 'Antes de tocar', 'Só no fim da música'], answer: 0, why: 'Direto (ou rítmico): desce com o acorde e sobe antes do próximo.' },
  { q: 'Pedal preso durante uma pausa…', options: ['É erro: a pausa vira som', 'É o certo', 'Não muda nada'], answer: 0, why: 'A pausa é silêncio. Com o pedal abaixado, o acorde anterior continua soando.' },
  { q: '"Lama" no pedal é…', options: ['Dois acordes diferentes soando misturados', 'Pedal muito leve', 'Tocar sem pedal'], answer: 0, why: 'Se o pedal não sobe entre um acorde e outro, as notas dos dois se misturam.' },
];

const RHY_8 = ['x:0.5 x:0.5 x x x', 'x x:0.5 x:0.5 x:2', 'x:0.5 x:0.5 x:0.5 x:0.5 x:2', 'x:2 x:0.5 x:0.5 x', 'x x x:0.5 x:0.5 x', 'x:0.5 x:0.5 x x:0.5 x:0.5 x', 'x x:2 x:0.5 x:0.5'];

// Padrões da mão esquerda sobre I–IV–V–I em Dó.
const PAT_BLOCK = `${I}:4 | ${IV}:4 | ${V}:4 | ${I}:4`;
const PAT_OCTAVE = 'C2+C3:2 C2+C3:2 | F2+F3:2 F2+F3:2 | G2+G3:2 G2+G3:2 | C2+C3:4';
const PAT_FIFTH = 'C3 G3 C3 G3 | F2 C3 F2 C3 | G2 D3 G2 D3 | C3 G3 C3:2';
const PATTERNS = [PAT_BLOCK, PAT_OCTAVE, PAT_FIFTH];

// Mão esquerda em Sol maior, posição próxima: I, IV, V7.
const GI = 'G2+B2+D3';
const GIV = 'G2+C3+E3';
const GV7 = 'F#2+C3+D3';
const gChords = primaryChord({ keys: ['G'], degrees: ['I', 'IV', 'V7'], low: 36, high: 72 });
const cgChords = primaryChord({ keys: ['C', 'G'], degrees: ['I', 'IV', 'V7'], low: 36, high: 72 });
const toG = transposeProgression({ from: 'C', to: ['G'], progressions: [['I', 'IV', 'V7', 'I'], ['I', 'V7', 'I'], ['I', 'IV', 'I', 'V7'], ['IV', 'V7', 'I']] });

const TWINKLE_G_R = shift(TWINKLE_R, 7);
const TWINKLE_G_L = shift(TWINKLE_L, -5);

const twinkleG: SongSpec = {
  id: 'u03-brilha-g',
  title: 'Brilha, brilha, estrelinha (em Sol)',
  composer: 'melodia folclórica francesa',
  arrangement: 'arranjo do Fermata: a versão em Dó transposta para Sol, com G, C e D7 em posição próxima',
  bpm: 76,
  beatsPerBar: 4,
  fifths: 1,
  right: TWINKLE_G_R,
  left: TWINKLE_G_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const l20: Lesson = {
  n: 20,
  id: 'l20',
  title: 'Colcheias e padrões de mão esquerda',
  minutes: 60,
  objectives: [
    'Consigo contar e tocar colcheias a 80 BPM, dentro de ±60 ms.',
    'Consigo tocar três padrões de mão esquerda sobre I–IV–V–I: bloco, raiz com oitava e raiz com 5ª.',
    'Consigo manter um padrão na esquerda enquanto a direita toca a melodia.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A colcheia: meio tempo',
      body: `Até aqui a menor figura era a semínima, de 1 tempo. A **colcheia** vale **meio tempo**: duas colcheias cabem numa semínima. Ela tem cabeça cheia, haste e uma **bandeirola**; duas ou mais colcheias seguidas são unidas por uma **barra**.

Para contar, divida cada tempo em dois: "**1** e **2** e **3** e **4** e". Os números caem nos tempos (onde o metrônomo bate) e o "e" cai exatamente no meio. Uma semínima ocupa "1 e"; uma colcheia ocupa só o "1" ou só o "e".

Conte em voz alta, de novo. A colcheia é a primeira figura em que o ouvido sozinho engana: sem contar, a tendência é correr no par de colcheias e encurtar a nota seguinte.`,
    },
    {
      kind: 'example',
      title: 'Ouvir as colcheias com o pulso',
      steps: [
        { say: 'Semínimas: uma por tempo.', play: { bpm: 80, steps: [60, 60, 60, 60].map((m) => ({ midis: [m], beats: 1 })) } },
        { say: 'Colcheias: duas por tempo. "1 e 2 e 3 e 4 e".', play: { bpm: 80, steps: Array.from({ length: 8 }, () => ({ midis: [60], beats: 0.5 })) } },
        { say: 'Misturando: "1 e", 2, 3, 4.', play: { bpm: 80, steps: [0.5, 0.5, 1, 1, 1].map((b) => ({ midis: [60], beats: b })) } },
      ],
    },
    { kind: 'exercise', id: 'l20-colcheias', exercise: quickTimed('Ritmo com colcheias', 'Dois compassos sorteados a 66 BPM, em qualquer tecla. Duas passadas boas.', randomRhythm(RHY_8, 2, 66), { reps: 2, window: 80 }) },
    { kind: 'exercise', id: 'l20-escada', exercise: quickTimed('Colcheias até 80 BPM', 'Quatro compassos, janela de ±60 ms. Cada passada boa sobe 4 BPM.', randomRhythm(RHY_8, 4, 64), { window: 60, ladder: { from: 64, to: 80, step: 4 } }) },
    {
      kind: 'text',
      title: 'Três padrões de mão esquerda',
      body: `A cifra diz qual acorde; o **padrão** diz como tocá-lo. Os três primeiros, do mais simples ao mais movimentado:

- **Bloco**: o acorde inteiro, segurado. Em posição próxima, C (Dó–Mi–Sol), F (Dó–Fá–Lá), G (Si–Ré–Sol).
- **Raiz com oitava**: só a fundamental, dobrada na oitava (Dó2 + Dó3). Soa cheio e grave, como um baixo. A mão salta de raiz em raiz: Dó, Fá, Sol, Dó.
- **Raiz e 5ª**: a fundamental e a 5ª, alternadas em semínimas. Em Dó: Dó, Sol, Dó, Sol. Em Fá: Fá, Dó. Em Sol: Sol, Ré. É o padrão mais "andado" dos três, base de muita música folclórica.

Toque cada padrão sobre **I–IV–V–I** até ele sair sem olhar. Os três trocam de acorde no tempo 1: prepare a mão no tempo 4 do compasso anterior.`,
    },
    {
      kind: 'example',
      title: 'Os três padrões',
      steps: [
        { say: '**Bloco**: I, IV, V, I.', play: { bpm: 80, steps: [[48, 52, 55], [48, 53, 57], [47, 50, 55], [48, 52, 55]].map((m) => ({ midis: m, beats: 4 })) } },
        { say: '**Raiz com oitava**: Dó, Fá, Sol, Dó, em mínimas.', play: { bpm: 80, steps: [[36, 48], [41, 53], [43, 55], [36, 48]].flatMap((m) => [{ midis: m, beats: 2 }, { midis: m, beats: 2 }]) } },
        { say: '**Raiz e 5ª**: Dó–Sol, Fá–Dó, Sol–Ré, Dó–Sol.', play: { bpm: 80, steps: [48, 55, 48, 55, 41, 48, 41, 48, 43, 50, 43, 50, 48, 55, 48].map((m, i) => ({ midis: [m], beats: i === 14 ? 2 : 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l20-bloco', exercise: quickTimed('Padrão 1: bloco', 'I–IV–V–I em posição próxima, a 72 BPM. Dois ciclos sem erro.', () => melodyTask(PAT_BLOCK, { bpm: 72, clef: 'bass' }), { reps: 2, pass: { accuracy: 0.9 } }) },
    { kind: 'exercise', id: 'l20-oitava', exercise: quickTimed('Padrão 2: raiz com oitava', 'Dó, Fá, Sol, Dó, com a oitava, a 72 BPM. Dois ciclos sem erro.', () => melodyTask(PAT_OCTAVE, { bpm: 72, clef: 'bass' }), { reps: 2, pass: { accuracy: 0.9 } }) },
    { kind: 'exercise', id: 'l20-quinta', exercise: quickTimed('Padrão 3: raiz e 5ª', 'Fundamental e 5ª em semínimas, a 72 BPM. Dois ciclos sem erro.', () => melodyTask(PAT_FIFTH, { bpm: 72, clef: 'bass' }), { reps: 2, pass: { accuracy: 0.9 } }) },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'o salto da mão esquerda',
      body: 'Nos padrões de raiz, a mão salta (Dó → Fá → Sol). Olhe para a próxima raiz um tempo antes e deixe o braço levar a mão, com o pulso solto. O dedo 5 chega primeiro; os outros vêm junto.',
    },
    { kind: 'exercise', id: 'l20-junto', exercise: quickTimed('Raiz e 5ª com a melodia', 'Brilha, brilha (4 compassos) na direita; raiz e 5ª na esquerda, a 60 BPM. Duas passadas boas.', () => twoHandTask('C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2', 'C3 G3 C3 G3 | F2 C3 C3 G3 | F2 C3 C3 G3 | G2 D3 C3 G3', { bpm: 60, caption: 'Esquerda: Dó–Sol, Fá–Dó + Dó–Sol, Fá–Dó + Dó–Sol, Sol–Ré + Dó–Sol.' }), { reps: 2 }) },
    { kind: 'exercise', id: 'l20-quiz', exercise: quiz('Colcheias e padrões', 'Cinco perguntas rápidas.', EIGHTHS) },
  ],
  review: [choice(EIGHTHS, 'colcheias'), chordsCFG7],
  checkpoint: [
    quickTimed('Colcheias a 80 BPM', '4 compassos sorteados, janela de ±60 ms, sem dicas.', randomRhythm(RHY_8, 4, 80), { window: 60 }),
    quickTimed('Padrão sorteado', 'Um dos três padrões sobre I–IV–V–I, a 76 BPM.', (rng) => melodyTask(pick(rng, PATTERNS), { bpm: 76, clef: 'bass' }), { pass: { accuracy: 0.9 } }),
  ],
  exit: [choice(EIGHTHS, 'colcheias'), chordsCFG7],
};

const l21: Lesson = {
  n: 21,
  id: 'l21',
  title: 'Tonalidade de Sol: G, C e D7',
  minutes: 60,
  objectives: [
    'Consigo tocar I, IV e V7 de Sol maior pelo grau.',
    'Consigo transpor uma progressão de Dó para Sol pensando nos graus.',
    'Consigo tocar Brilha, brilha em Sol com acompanhamento.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Os mesmos graus em outra casa',
      body: `Mude a casa para **Sol**. Contando a partir de Sol: Sol (I), Lá, Si, **Dó (IV)**, **Ré (V)**. Os acordes primários de Sol maior são:

- **I = G** (Sol, Si, Ré): a casa.
- **IV = C** (Dó, Mi, Sol): o afastamento.
- **V7 = D7** (Ré, **Fá♯**, Lá, Dó): a tensão.

O D7 traz o **Fá♯**, que você conheceu na posição de Sol. Ele é a **sensível** de Sol: meio tom abaixo da casa, puxando para cima, como o Si em Dó. E o trítono do D7 é **Fá♯–Dó**, que resolve em Sol–Si.

Repare: o acorde de **Dó** era o I em Dó maior e agora é o IV em Sol maior. O acorde é o mesmo; o **papel** mudou porque a casa mudou.`,
    },
    {
      kind: 'text',
      title: 'Posição próxima em Sol',
      body: `As mesmas regras de movimento mínimo valem aqui. Na mão esquerda:

- **G**: Sol2, Si2, Ré3 (dedos 5, 3, 1).
- **C**: Sol2, Dó3, Mi3. O Sol fica; Si e Ré sobem.
- **D7**: Fá♯2, Dó3, Ré3. O Sol desce meio tom para Fá♯; Si sobe para Dó; Ré fica. A 5ª (Lá) fica de fora.

É exatamente o mesmo desenho de Dó maior, cinco teclas brancas mais grave: o Fá♯ faz em Sol o que o Si fazia em Dó.`,
    },
    {
      kind: 'keys',
      low: 41,
      high: 55,
      lit: [43, 47, 50],
      labels: { 42: 'Fá♯', 43: 'Sol', 47: 'Si', 48: 'Dó', 50: 'Ré', 52: 'Mi' },
      caption: 'G em posição próxima: Sol2, Si2, Ré3. Para o C, Si e Ré sobem para Dó e Mi; para o D7, Sol desce para Fá♯ e Si sobe para Dó.',
    },
    {
      kind: 'example',
      title: 'I – IV – V7 – I em Sol',
      steps: [
        { say: 'G – C – D7 – G na mão esquerda.', play: { bpm: 72, steps: [[43, 47, 50], [43, 48, 52], [42, 48, 50], [43, 47, 50]].map((m, i) => ({ midis: m, beats: i === 3 ? 4 : 2 })) } },
        { say: 'D7 → G: o Fá♯ sobe para Sol, o Dó desce para Si.', keys: [42, 48, 43, 47], play: { bpm: 60, steps: [{ midis: [42, 48, 50], beats: 2 }, { midis: [43, 47, 50], beats: 4 }] } },
      ],
    },
    { kind: 'exercise', id: 'l21-graus', exercise: { kind: 'items', title: 'Graus em Sol', how: 'O app pede I, IV ou V7 de Sol maior. Toque em qualquer posição.', gen: gChords, count: 15, low: 36, high: 72, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l21-me', exercise: quickTimed('G – C – D7 – G na esquerda', 'Semibreves a 66 BPM, posição próxima. Duas passadas boas.', () => melodyTask(`${GI}:4 | ${GIV}:4 | ${GV7}:4 | ${GI}:4`, { bpm: 66, clef: 'bass' }), { reps: 2 }) },
    {
      kind: 'text',
      title: 'Transpor uma progressão',
      body: `Na Unidade 2 você transpôs uma melodia mantendo o desenho. Para acordes é a mesma ideia: **mantenha os graus**, troque a casa.

C – F – G7 – C em Dó é **I – IV – V7 – I**. Em Sol, I – IV – V7 – I vira **G – C – D7 – G**. Para transpor sem errar, nunca traduza letra por letra ("C vira G, F vira…"): traduza para **graus** e depois para o tom novo.

É assim que músicos acompanham cantores: se a música está alta demais para a voz, eles tocam os mesmos graus noutra casa.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer o Fá♯ do D7',
      body: 'O D7 com Fá natural é outro acorde (Ré menor com sétima) e soa sem direção. Em Sol maior, todo Fá é Fá♯. Se o acorde de tensão soar triste, confira o Fá.',
    },
    { kind: 'exercise', id: 'l21-transpor', exercise: { kind: 'items', title: 'Transponha para Sol', how: 'A cifra vem em Dó. Pense nos graus e toque os acordes de Sol maior, em ordem.', gen: toG, count: 8, low: 36, high: 72, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l21-brilha', exercise: quickTimed('Brilha, brilha em Sol', '12 compassos, duas mãos: melodia a partir do Sol4, G, C e D7 na esquerda. De 56 a 72 BPM.', () => twoHandTask(TWINKLE_G_R, TWINKLE_G_L, { bpm: 56 }), { ladder: { from: 56, to: 72, step: 4 } }) },
    { kind: 'song', songId: 'u03-brilha-g', why: 'A versão em Sol na pauta dupla. Repare no sustenido da armadura: todo Fá é Fá♯.' },
    { kind: 'exercise', id: 'l21-quiz', exercise: quiz('Sol maior', 'Cinco perguntas rápidas.', KEY_G) },
  ],
  review: [gChords, toG, choice(KEY_G, 'tom-sol')],
  checkpoint: [
    { kind: 'items', title: 'Graus em Dó e em Sol', how: 'I, IV ou V7, numa das duas tonalidades, sem dicas. Meta: 85%.', gen: cgChords, count: 16, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } },
    { kind: 'items', title: 'Transposição de progressões', how: 'Progressões novas de Dó para Sol. Meta: 85%.', gen: toG, count: 6, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [gChords, choice(KEY_G, 'tom-sol')],
};

/** Acordes em bloco para o pedal direto: com pausas (o pedal sobe na pausa) e sem pausas (sobe antes do próximo). */
const PEDAL_RESTS = [
  'C4+E4+G4:2 r:2 | F4+A4+C5:2 r:2 | G4+B4+D5:2 r:2 | C4+E4+G4:2 r:2',
  'C4+E4+G4:2 r:2 | G4+B4+D5:2 r:2 | F4+A4+C5:2 r:2 | C4+E4+G4:2 r:2',
  'F4+A4+C5:2 r:2 | C4+E4+G4:2 r:2 | G4+B4+D5:2 r:2 | C4+E4+G4:2 r:2',
];
const PEDAL_FLOW = [
  'C4+E4+G4:2 F4+A4+C5:2 | G4+B4+D5:2 C4+E4+G4:2 | F4+A4+C5:2 G4+B4+D5:2 | C4+E4+G4:4',
  'C4+E4+G4:2 G4+B4+D5:2 | F4+A4+C5:2 C4+E4+G4:2 | F4+A4+C5:2 G4+B4+D5:2 | C4+E4+G4:4',
];

const l22: Lesson = {
  n: 22,
  id: 'l22',
  title: 'Pedal direto',
  minutes: 60,
  objectives: [
    'Consigo apoiar o pé no pedal com o calcanhar no chão e mover só o tornozelo.',
    'Consigo descer o pedal junto com o acorde e subir antes do próximo, sem misturar acordes.',
    'Consigo deixar as pausas em silêncio, sem pedal preso.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que o pedal faz',
      body: `O piano tem um **abafador** (um feltro) em cima de cada corda. Quando você solta a tecla, o abafador desce e o som para. O **pedal da direita**, o de **sustentação**, levanta todos os abafadores de uma vez: as notas continuam soando mesmo depois de você soltar as teclas, e as cordas vizinhas vibram junto, deixando o som mais cheio.

No piano digital, o pedal manda essa informação pelo MIDI (o controle 64). O Fermata lê esse sinal e mede quando você desce e sobe o pedal.

O pedal é poderoso e perigoso: com ele abaixado, **tudo** se mistura. Um acorde de Dó seguido de um G7 com o pedal preso vira uma massa de notas, a **lama**. A arte do pedal é trocar na hora certa.`,
    },
    {
      kind: 'text',
      title: 'O pé no pedal',
      body: `- **Calcanhar no chão**, sempre. Ele é o apoio e o ponto de giro.
- A **parte da frente do pé** (onde começam os dedos) fica sobre o pedal, encostada nele, sem pisar.
- O movimento vem do **tornozelo**: desce e sobe, como quem marca o ritmo com a ponta do pé.
- Não tire o pé do pedal entre um movimento e outro, e não bata. O pedal desce até o fim e sobe até o fim.

Pratique alguns minutos só o pé, sem tocar nada: desce no 1, sobe no 3, desce no 1… Depois junte com as mãos.`,
    },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'perna solta',
      body: 'O pedal é leve. Se a coxa ou a panturrilha ficam tensas, o banco pode estar longe ou alto demais. Ajuste até o pé alcançar o pedal com o joelho em ângulo confortável.',
    },
    {
      kind: 'text',
      title: 'Pedal direto: desce com o acorde',
      body: `A primeira técnica é o **pedal direto** (ou rítmico): o pé **desce junto com o acorde** e **sobe antes do próximo**.

- Nas músicas com **pausas** entre os acordes, o pedal sobe na pausa. A pausa é silêncio: pedal preso numa pausa transforma silêncio em som, e esse é o erro mais comum de quem começa.
- Quando os acordes vêm **colados**, o pedal sobe no fim de cada acorde, um instante antes do próximo, e desce de novo com ele. Fica um pequeno respiro entre os acordes.

Na Unidade 4 você aprende o **pedal legato** (sincopado), em que o pedal troca um instante **depois** do novo acorde, ligando tudo sem buraco. Ele é mais difícil, e o pedal direto é a base dele.`,
    },
    {
      kind: 'example',
      title: 'Com pausa e sem pausa',
      steps: [
        { say: 'Acorde, pausa, acorde, pausa: o pedal desce com o acorde e sobe na pausa. A pausa fica em silêncio.', play: { bpm: 66, steps: [{ midis: [60, 64, 67], beats: 2 }, { midis: [], beats: 2 }, { midis: [65, 69, 72], beats: 2 }, { midis: [], beats: 2 }] } },
        { say: 'Assim soa a **lama**: o pedal ficou preso e o Fá se misturou com o Dó.', play: { bpm: 66, steps: [{ midis: [60, 64, 67], beats: 2 }, { midis: [60, 64, 65, 67, 69, 72], beats: 4 }] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'sem MIDI, sem pedal medido',
      body: 'O pedal só é medido com o piano conectado por MIDI (no Safari e no iPad não há MIDI) e o pedal ligado no piano. Sem ele, os exercícios contam só as notas: faça mesmo assim, ouvindo com atenção, e volte com o piano conectado.',
    },
    { kind: 'exercise', id: 'l22-pausas', exercise: quickTimed('Pedal com pausas', 'Acordes de mínima e pausas de mínima, mão direita, a 60 BPM. Pedal desce com o acorde e sobe na pausa. Duas passadas boas.', (rng) => melodyTask(pick(rng, PEDAL_RESTS), { bpm: 60 }), { reps: 2, pedal: 'direto' }) },
    { kind: 'exercise', id: 'l22-colado', exercise: quickTimed('Pedal com acordes colados', 'Agora sem pausas: suba o pedal no fim de cada acorde e desça com o próximo. 60 BPM, duas passadas boas.', (rng) => melodyTask(pick(rng, PEDAL_FLOW), { bpm: 60 }), { reps: 2, pedal: 'direto' }) },
    { kind: 'exercise', id: 'l22-quiz', exercise: quiz('O pedal', 'Cinco perguntas rápidas.', PEDAL) },
  ],
  review: [choice(PEDAL, 'pedal'), cgChords],
  checkpoint: [
    quickTimed('Pedal direto', 'Acordes com pausas, ordem nova, a 66 BPM. Meta: 85% das trocas sem lama e nenhuma pausa com pedal preso.', (rng) => melodyTask(pick(rng, PEDAL_RESTS), { bpm: 66 }), { pedal: 'direto' }),
    quickTimed('Pedal com acordes colados', 'A 66 BPM.', (rng) => melodyTask(pick(rng, PEDAL_FLOW), { bpm: 66 }), { pedal: 'direto' }),
  ],
  exit: [choice(PEDAL, 'pedal'), gChords],
};

const unit: Unit = {
  n: 3,
  id: 'u03',
  title: 'Primeiros acordes e cifra',
  goal: 'Montar acordes maiores, acompanhar melodias com I, IV e V7 lendo cifra, em Dó, Sol e Fá, e usar o pedal.',
  technique: 'Trocas de acorde (C–F–G7) em posição próxima, acordes quebrados e padrões de mão esquerda em semínimas e colcheias, de 60 rumo a 96 BPM (referência: RCM Preparatory B). Nos dias sem lição nova, 5 minutos de chuva de cifras.',
  lessons: [l17, l18, l19, l20, l21, l22],
  songs: [mary, twinkleC, twinkleG, amazing],
  final: {
    songId: 'u03-amazing',
    brief: 'Amazing Grace em Dó, 3/4 com anacruse: a melodia na mão direita, uma oitava acima do Dó central, e um acorde por compasso na esquerda (I, IV, V e V7 em posição próxima). Junta o que a unidade ensinou: acordes primários, cifra, trocas no tempo e a anacruse da Unidade 2. No compasso 8 a mão direita sobe até o Sol5: prepare o salto no compasso anterior.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [chordsCFG, chordsDAE, chordsCG7, chordsCFG7, cadenceC, HARM_C, gChords, cgChords, toG];
