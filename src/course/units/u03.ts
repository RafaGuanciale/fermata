// Unidade 3 — Primeiros acordes, cifra e acompanhamento (lições 17 a 24). Projeto final: Amazing Grace com acordes.
// Músicas: Jingle Bells, Eine kleine Nachtmusik (em Dó e em Sol), Silent Night e Amazing Grace no app; Love Me Do e
// Love Me Tender para importar (src/course/pieces.ts).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { choice, harmonize, mix, playChord, primaryChord, progressionByEar, resolveCadence, scaleDegreeNote, tonicByEar, transposeProgression, type ChoiceQuestion } from '../gens';
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
  { q: '"Tom de Dó maior" quer dizer…', options: ['As notas vêm da escala de Dó maior e a casa é o Dó', 'Tocar o acorde de Dó o tempo todo', 'Começar a música na nota Dó'], answer: 0, why: 'O tom diz a escala e a casa. Dentro dele aparecem vários acordes: Dó, Fá, Sol…' },
  { q: 'Num exercício, "o primeiro acorde é o I" quer dizer…', options: ['O primeiro acorde tocado é o do 1º grau (a casa)', 'É o acorde número 1 da lista', 'É um acorde de uma nota só'], answer: 0, why: 'O número romano é o grau do acorde na escala, não a ordem em que ele aparece.' },
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

// ---------- músicas reaproveitadas ----------

const chordsCFG = playChord({ symbols: ['C', 'F', 'G'], low: 48, high: 72, requireBass: true });
const chordsDAE = playChord({ symbols: ['D', 'A', 'E'], low: 48, high: 72, requireBass: true });
const chordsCG7 = playChord({ symbols: ['C', 'G7'], low: 36, high: 72, omitFifth: true });
const chordsCFG7 = playChord({ symbols: ['C', 'F', 'G7'], low: 36, high: 72, omitFifth: true, skill: 'cifra' });
const cadenceC = resolveCadence({ keys: ['C'], before: [['I', 'V7'], ['V7'], ['IV', 'V7']] });
const SEVEN = [1, 2, 3, 4, 5, 6, 7];
const degreesC = scaleDegreeNote({ keys: ['C'], degrees: SEVEN, byNumber: true });
const degreesG = scaleDegreeNote({ keys: ['G'], degrees: SEVEN, byNumber: true });
const degreesCG = scaleDegreeNote({ keys: ['C', 'G'], degrees: SEVEN, byNumber: true });

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
  'C4 E4 G4 C5 | G4 E4 C4:2 | G4 B4 D5 B4 | C4 E4 G4:2',
  'F4 A4 C5 A4 | C4 E4 G4 E4 | G4 B4 D5 B4 | C4:4',
];
const SWITCH_CG = [
  'C4+E4+G4:2 G4+B4+D5:2 | C4+E4+G4:2 G4+B4+D5:2 | C4+E4+G4:2 G4+B4+D5:2 | C4+E4+G4:4',
  'C4+E4+G4:2 F4+A4+C5:2 | C4+E4+G4:2 G4+B4+D5:2 | C4+E4+G4:2 F4+A4+C5:2 | C4+E4+G4:4',
  'G4+B4+D5:2 C4+E4+G4:2 | F4+A4+C5:2 C4+E4+G4:2 | G4+B4+D5:2 C4+E4+G4:2 | C4+E4+G4:4',
];

// ---------- músicas ----------

/** Uma linha de acordes da mão esquerda: um acorde por compasso, a partir dos graus. */
const chordBars = (degs: string[], map: Record<string, string>, beats = 4) => degs.map((d) => `${map[d]}:${beats}`).join(' | ');
const NEAR = { I, IV, V7 };
/** Raiz e 5ª em mínimas, em Dó (C: Dó–Sol, F: Fá–Dó, G7: Sol–Ré). */
const FIFTHS: Record<string, string> = { I: 'C3:2 G3:2', IV: 'F2:2 C3:2', V7: 'G2:2 D3:2' };

// Jingle Bells (James Lord Pierpont, 1857). Notas e ritmo conferidos com a transcrição em ABC de B. Stephenson
// (Universidade de Calgary), em Dó. Ritmo original: a pontuada de "jingle all the way" e as colcheias ficam, porque é
// isso que faz a música ser reconhecível (o curso ensina a contar colcheia na lição 20 e a pontuada na 29).
const JB_VERSE_R = 'G4 E5 D5 C5 | G4:3 G4:0.5 G4:0.5 | G4 E5 D5 C5 | A4:4 | A4 F5 E5 D5 | B4:4 | G5 G5 F5 D5 | E5:4 | G4 E5 D5 C5 | G4:4 | G4 E5 D5 C5 | A4:3 A4 | A4 F5 E5 D5 | G5 G5 G5:1.5 G5:0.5 | A5 G5 F5 D5 | C5:2 r:2';
const JB_CHORUS_R = 'E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:0.5 | E5:4 | F5 F5 F5:1.5 F5:0.5 | F5 E5 E5 E5:0.5 E5:0.5 | E5 D5 D5 E5 | D5:2 G5:2 | E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:0.5 | E5:4 | F5 F5 F5:1.5 F5:0.5 | F5 E5 E5 E5:0.5 E5:0.5 | G5 G5 F5 D5 | C5:4';
const JB_VERSE_DEG = ['I', 'I', 'I', 'IV', 'IV', 'V7', 'V7', 'I', 'I', 'I', 'I', 'IV', 'IV', 'V7', 'V7', 'I'];
const JB_CHORUS_DEG = ['I', 'I', 'I', 'I', 'IV', 'I', 'V7', 'V7', 'I', 'I', 'I', 'I', 'IV', 'I', 'V7', 'I'];
const JB_CHORUS_L = chordBars(JB_CHORUS_DEG, NEAR);
const JB_CHORUS_FIFTH = JB_CHORUS_DEG.map((d) => FIFTHS[d]).join(' | ');

const jingle: SongSpec = {
  id: 'u03-jingle',
  title: 'Jingle Bells',
  composer: 'James Lord Pierpont (1857)',
  arrangement: 'arranjo do Fermata em Dó: verso e refrão com o ritmo original na mão direita, um acorde por compasso (C, F e G7 em posição próxima) na esquerda',
  bpm: 120,
  beatsPerBar: 4,
  fifths: 0,
  right: `${JB_VERSE_R} | ${JB_CHORUS_R}`,
  left: `${chordBars(JB_VERSE_DEG, NEAR)} | ${JB_CHORUS_L}`,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Eine kleine Nachtmusik (Mozart, K. 525, 1787), abertura do 1º movimento. Notas e ritmo do 1º violino da edição do
// Mutopia Project (compassos 1 a 4, em Sol), transpostos para Dó; no tom original, Sol, na lição 21. O último compasso (o
// acorde de chegada) é do arranjo. Nunca dobrar os valores: a 84 BPM com valores dobrados ela fica irreconhecível.
const EK_C_R = 'C5 r:0.5 G4:0.5 C5 r:0.5 G4:0.5 | C5:0.5 G4:0.5 C5:0.5 E5:0.5 G5 r | F5 r:0.5 D5:0.5 F5 r:0.5 D5:0.5 | F5:0.5 D5:0.5 B4:0.5 D5:0.5 G4 r | C5:4';
const EK_C_L = `${I}:4 | ${I}:4 | ${V7}:4 | ${V7}:4 | ${I}:4`;

const eineDo: SongSpec = {
  id: 'u03-eine-do',
  title: 'Eine kleine Nachtmusik',
  composer: 'Wolfgang Amadeus Mozart (K. 525)',
  arrangement: 'arranjo do Fermata: abertura do 1º movimento em Dó, no ritmo de Mozart; Dó e G7 em posição próxima na esquerda. O alvo é perto do andamento das gravações (Allegro)',
  bpm: 132,
  beatsPerBar: 4,
  fifths: 0,
  right: EK_C_R,
  left: EK_C_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Amazing Grace (melodia "New Britain", EUA, 1829): 3/4 com anacruse, I–IV–V7. Notas conferidas com a edição do Mutopia
// Project (hinário, em Sol), transpostas para Dó, com o ritmo original.
const AMAZING_R = 'r:2 G4 | C5:2 E5:0.5 C5:0.5 | E5:2 D5 | C5:2 A4 | G4:2 G4 | C5:2 E5:0.5 C5:0.5 | E5:2 D5 | G5:3 | E5 G5:1.5 E5:0.5 | G5:0.5 E5:0.5 C5:2 | G4 A4:1.5 C5:0.5 | C5:0.5 A4:0.5 G4:2 | G4 C5:2 | E5:0.5 C5:0.5 E5:2 | D5 C5:2 | C5:2 r';
const AMAZING_L = `r:3 | ${I}:3 | ${I}:3 | ${IV}:3 | ${I}:3 | ${I}:3 | ${I}:3 | ${V}:3 | ${I}:3 | ${I}:3 | ${IV}:3 | ${I}:3 | ${I}:3 | ${I}:3 | ${V7}:3 | ${I}:2 r`;

const amazing: SongSpec = {
  id: 'u03-amazing',
  title: 'Amazing Grace',
  composer: 'melodia tradicional "New Britain"',
  arrangement: 'arranjo do Fermata em Dó: a melodia que o Elvis gravou, uma oitava acima do Dó central; um acorde por compasso (I, IV, V e V7 em posição próxima) na mão esquerda; anacruse escrita com uma pausa de mínima',
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
  music: [
    { song: 'u03-jingle', why: 'O refrão inteiro cabe na posição de Dó, uma oitava acima do Dó central, e os acordes dele são exatamente os três desta lição: C, F e G. Hoje toque a melodia com a direita; na lição 19 a esquerda entra com os acordes.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Acorde: terças empilhadas',
      body: `Um **acorde** é um grupo de notas tocadas juntas que soa como uma unidade. O acorde mais comum da música ocidental, a **tríade**, é feito de **terças empilhadas**: uma nota de base, a 3ª acima dela e a 5ª acima dela.

- A nota de base se chama **fundamental** (ou 1). Ela dá o nome ao acorde.
- A **3ª** dá a cor: mais clara (maior) ou mais escura (menor).
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
  title: 'Graus e I–V7–I em Dó',
  minutes: 60,
  objectives: [
    'Consigo dizer o que é o tom de Dó maior e tocar qualquer grau da escala (1 a 7).',
    'Consigo tocar Dó e G7 em posição próxima na mão esquerda, movendo o mínimo.',
    'Consigo completar uma cadência V7–I de ouvido.',
    'Consigo acompanhar a abertura de Eine kleine Nachtmusik com I e V7, devagar.',
  ],
  music: [
    { song: 'u03-eine-do', why: 'A abertura mais famosa de Mozart é literalmente um acorde de Dó quebrado e, depois, um G7 quebrado: o I–V7 desta lição, tocado por uma orquestra. Ela vem no ritmo de Mozart. O alvo (132 BPM) é perto das gravações; comece bem mais devagar e suba aos poucos.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Escala, tom e graus',
      body: `Antes do acorde novo, três palavras que vão aparecer em toda a harmonia daqui para a frente.

- **Escala de Dó maior**: as sete notas **Dó, Ré, Mi, Fá, Sol, Lá, Si** (as teclas brancas), subindo até o próximo Dó. As cinco primeiras você já conhece: são o pentacorde da posição de Dó.
- **Tom** (ou tonalidade): diz qual escala a música usa e qual nota é a **casa**. "Em Dó maior" quer dizer que as notas vêm da escala de Dó maior e que a música descansa no Dó. Tom não é um acorde: dentro do tom de Dó aparecem vários acordes (Dó, Fá, Sol…).
- **Graus**: os números das notas da escala, contando a partir da casa. Dó é o **1**, Ré o 2, Mi o 3, Fá o **4**, Sol o **5**, Lá o 6, Si o 7.

Os acordes ganham o número da nota em que começam, em algarismo romano: o acorde de Dó é o **I**, o de Fá é o **IV**, o de Sol é o **V**. O número importa mais do que o nome, porque diz o **papel** do acorde. O **I** é a casa. O **V** é o acorde que mais puxa de volta para ela. Essa ida e volta, I → V → I, é a menor história que a harmonia sabe contar, e está em quase toda música tonal, de Bach ao sertanejo.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 72,
      lit: [60, 62, 64, 65, 67, 69, 71],
      labels: { 60: '1', 62: '2', 64: '3', 65: '4', 67: '5', 69: '6', 71: '7', 72: '1' },
      caption: 'Escala de Dó maior com os graus: Dó (1), Ré (2), Mi (3), Fá (4), Sol (5), Lá (6), Si (7). Depois do Si, a casa de novo.',
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'achar que o número romano é a ordem',
      body: 'O I não quer dizer "o primeiro acorde que aparece": quer dizer "o acorde do 1º grau", o da casa. Uma música pode começar no V e terminar no I. Quando um exercício diz "o primeiro acorde é o I", ele avisa que a música começa no acorde da casa (em Dó maior, o de Dó).',
    },
    { kind: 'exercise', id: 'l18-graus', exercise: { kind: 'items', title: 'Graus de Dó maior', how: 'O app pede um número de 1 a 7; toque essa nota da escala de Dó, em qualquer oitava. Conte a partir do Dó.', gen: degreesC, count: 10, low: 48, high: 84, labels: 'fade', pass: { accuracy: 0.8 } } },
    {
      kind: 'text',
      title: 'O V7 e o trítono',
      body: `Monte o acorde do 5º grau com a fórmula da lição 17: **Sol**, 4 semitons acima **Si**, mais 3 **Ré**. Agora empilhe mais uma terça, de 3 semitons: **Fá**. Sol, Si, Ré, Fá. Esse acorde de 4 notas (4 + 3 + 3 semitons) é o **G7**, o "Sol com sétima", ou **V7** em Dó maior. O nome técnico é **dominante**.

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
    {
      kind: 'callout',
      tone: 'erro',
      title: 'mover a mão inteira no V7',
      body: 'Do Dó para o G7 em posição próxima, só duas notas andam (Dó → Si, Mi → Fá) e o Sol fica. Quem salta com a mão inteira perde o tempo.',
    },
    { kind: 'exercise', id: 'l18-acordes', exercise: { kind: 'items', title: 'Dó ou G7', how: 'Toque o acorde da cifra. No G7, a 5ª (Ré) pode faltar.', gen: chordsCG7, count: 16, low: 36, high: 72, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l18-me', exercise: quickTimed('I e V7 na mão esquerda', 'Só a mão esquerda, semibreves a 66 BPM: Dó, G7, G7, Dó. Mova só os dedos que precisam. Duas passadas boas.', () => melodyTask(`${I}:4 | ${V7}:4 | ${V7}:4 | ${I}:4`, { bpm: 66, clef: 'bass' }), { reps: 2 }) },
    { kind: 'exercise', id: 'l18-cadencia', exercise: { kind: 'items', title: 'Complete a cadência', how: 'O app toca o começo; você toca o acorde de Dó que resolve.', gen: cadenceC, count: 8, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'Melodia e acompanhamento',
      body: `Agora as duas coisas juntas: a mão direita na melodia, a esquerda nos acordes. A regra de ouro da lição 14 continua valendo: a esquerda precisa ficar **automática**. Toque a progressão da esquerda sozinha até ela sair sem pensar, e só então junte.

Em **Eine kleine Nachtmusik** a melodia avisa quando trocar. Nos quatro primeiros compassos ela desenha **Dó, Sol, Mi**: o acorde de Dó, quebrado. Nos quatro seguintes desenha **Fá, Ré, Si, Sol**: o G7, quebrado. A esquerda só confirma o que a direita já está dizendo: Dó embaixo do Dó, G7 embaixo do G7. No último compasso, as duas mãos chegam juntas em casa.

Ela tem **colcheias**, notas de meio tempo, que você aprende a contar na lição 20. Por enquanto, toque ouvindo: o app toca o trecho antes, e o desenho rápido do 2º compasso (Dó, Sol, Dó, Mi) é o "pa-ra-pa-ra" que todo mundo canta. Comece devagar: o andamento sobe a cada passada boa.`,
    },
    { kind: 'exercise', id: 'l18-eine', exercise: quickTimed('Eine kleine Nachtmusik, duas mãos', 'Melodia na direita, Dó e G7 na esquerda. Começa a 56 BPM e sobe até 80 BPM; o resto do caminho até o alvo fica no "Tocar a música".', () => twoHandTask(EK_C_R, EK_C_L, { bpm: 56, caption: 'Esquerda: Dó nos compassos 1 e 2, G7 no 3 e no 4, Dó no último.' }), { ladder: { from: 56, to: 80, step: 4 } }) },
    { kind: 'song', songId: 'u03-eine-do', why: 'A mesma abertura na pauta dupla, com os acordes escritos na clave de Fá.' },
    { kind: 'exercise', id: 'l18-quiz', exercise: quiz('Tom, graus e dominante', 'Sete perguntas rápidas.', DOMINANT) },
  ],
  review: [degreesC, chordsCG7, cadenceC, choice(DOMINANT, 'dominante')],
  checkpoint: [
    quickTimed('Eine kleine Nachtmusik a 72 BPM', '5 compassos, duas mãos, sem dicas. Meta: 90% das notas, ±80 ms.', () => twoHandTask(EK_C_R, EK_C_L, { bpm: 72, caption: 'Esquerda: Dó nos compassos 1 e 2, G7 no 3 e no 4, Dó no último.' }), { window: 80, pass: { accuracy: 0.9 } }),
    { kind: 'items', title: 'Graus, acordes e cadências', how: 'Graus de Dó, os acordes Dó e G7 e cadências para completar, misturados com acordes da lição 17.', gen: mix([degreesC, chordsCG7, cadenceC, chordsCFG]), count: 12, low: 36, high: 84, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [degreesC, chordsCG7, choice(DOMINANT, 'dominante')],
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
    'Consigo tocar o refrão de Jingle Bells com C, F e G7 na esquerda.',
  ],
  music: [
    { song: 'u03-jingle', why: 'Jingle Bells inteira, verso e refrão, usa só os três acordes desta lição: C, F e G7. É a cifra básica numa das músicas mais tocadas do mundo, e é dezembro.' },
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

A progressão **I – IV – V7 – I** conta a história inteira: casa, passeio, tensão, volta. Ela é a espinha de milhares de canções folclóricas, do blues e do forró.`,
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
    { kind: 'exercise', id: 'l19-jingle-me', exercise: quickTimed('Jingle Bells: só a esquerda', 'Os acordes do refrão, um por compasso: C, C, C, C, F, C, G7, G7, a 66 BPM. Duas passadas boas.', () => melodyTask(JB_CHORUS_DEG.slice(0, 8).map((d) => `${NEAR[d as keyof typeof NEAR]}:4`).join(' | '), { bpm: 66, clef: 'bass' }), { reps: 2 }) },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'dedilhado de Jingle Bells',
      body: 'O refrão cabe inteiro na posição de Dó, uma oitava acima do Dó central: polegar no Dó5, e cada dedo numa nota (Dó 1, Ré 2, Mi 3, Fá 4, Sol 5). A mão não sai do lugar. "Jin-gle bells" é 3 3 3, e o "jin-gle all the way" é 3 5 1 2 3. No verso a mão abre um pouco mais: ele começa no Sol4 e sobe até o Lá5.',
    },
    { kind: 'exercise', id: 'l19-jingle', exercise: quickTimed('Jingle Bells, o refrão', 'O refrão inteiro, 16 compassos, duas mãos. Começa a 56 BPM e sobe até 72 BPM.', () => twoHandTask(JB_CHORUS_R, JB_CHORUS_L, { bpm: 56, caption: 'Esquerda: C, F e G7 em posição próxima, um acorde por compasso, como no exercício anterior.' }), { ladder: { from: 56, to: 72, step: 4 } }) },
    { kind: 'song', songId: 'u03-jingle', why: 'A música inteira, verso e refrão, com os acordes: confira na clave de Fá onde cada um entra.' },
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
  { q: 'Duas colcheias seguidas costumam ser escritas…', options: ['Unidas por uma barra, no lugar da bandeirola', 'Separadas por pausa', 'Com ponto'], answer: 0, why: 'A barra junta colcheias do mesmo tempo, para ficar fácil ver onde está cada tempo.' },
  { q: 'O padrão "raiz e 5ª" na mão esquerda em Dó toca…', options: ['Dó e Sol alternados', 'Dó e Mi alternados', 'O acorde inteiro'], answer: 0, why: 'Fundamental e 5ª do acorde: no Dó, Dó e Sol; no Fá, Fá e Dó; no Sol, Sol e Ré.' },
  { q: 'Num padrão de mão esquerda, a mão direita…', options: ['Toca a melodia por cima', 'Toca o mesmo padrão', 'Fica parada'], answer: 0, why: 'A esquerda dá a harmonia e o ritmo; a direita canta a melodia.' },
];

const KEY_G: ChoiceQuestion[] = [
  { q: 'Em Sol maior, o IV é…', options: ['Dó (C)', 'Ré (D)', 'Fá (F)'], answer: 0, why: 'Sol, Lá, Si, Dó: 4º grau.' },
  { q: 'Em Sol maior, o V7 é…', options: ['D7', 'C7', 'G7'], answer: 0, why: 'Sol, Lá, Si, Dó, Ré: o 5º grau é Ré.' },
  { q: 'O D7 tem quais notas?', options: ['Ré, Fá♯, Lá, Dó', 'Ré, Fá, Lá, Dó', 'Ré, Fá♯, Lá, Dó♯'], answer: 0, why: 'Ré maior (Ré, Fá♯, Lá) mais a 7ª da dominante, Dó.' },
  { q: 'Transpor I–IV–V7 de Dó para Sol dá…', options: ['G – C – D7', 'G – F – C7', 'C – F – G7'], answer: 0, why: 'Os graus não mudam; mudam os acordes: o I vira G, o IV vira C, o V7 vira D7.' },
  { q: 'A sensível de Sol maior (a nota que puxa para o Sol) é…', options: ['Fá♯', 'Fá', 'Lá'], answer: 0, why: 'Meio tom abaixo da tônica: Fá♯. Ela está no D7.' },
  { q: 'Por que a escala de Sol maior tem Fá♯?', options: ['Para copiar o desenho da escala de Dó: do 6º para o 7º grau é um tom', 'Porque toda escala tem uma tecla preta', 'Para soar mais forte'], answer: 0, why: 'De Mi para Fá é só semitom; o desenho pede tom ali. Com Fá♯, o semitom fica entre o 7º grau e a casa, como Si–Dó em Dó.' },
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

// Eine kleine Nachtmusik no tom original (Sol), uma oitava abaixo do 1º violino da edição do Mutopia Project.
const EK_G_R = 'G4 r:0.5 D4:0.5 G4 r:0.5 D4:0.5 | G4:0.5 D4:0.5 G4:0.5 B4:0.5 D5 r | C5 r:0.5 A4:0.5 C5 r:0.5 A4:0.5 | C5:0.5 A4:0.5 F#4:0.5 A4:0.5 D4 r | G4:4';
const EK_G_L = `${GI}:4 | ${GI}:4 | ${GV7}:4 | ${GV7}:4 | ${GI}:4`;

const eineSol: SongSpec = {
  id: 'u03-eine-sol',
  title: 'Eine kleine Nachtmusik, em Sol',
  composer: 'Wolfgang Amadeus Mozart (K. 525)',
  arrangement: 'arranjo do Fermata: abertura do 1º movimento no tom original, Sol maior, no ritmo de Mozart; G e D7 em posição próxima na esquerda. O alvo é perto do andamento das gravações (Allegro)',
  bpm: 132,
  beatsPerBar: 4,
  fifths: 1,
  right: EK_G_R,
  left: EK_G_L,
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
    'Consigo contar as colcheias de Eine kleine Nachtmusik e tocar a abertura a 100 BPM.',
  ],
  music: [
    { song: 'u03-eine-do', why: 'A abertura da lição 18, agora contada: as colcheias que você aprende hoje são as notas rápidas do "pa-ra-pa-ra-pam" do segundo compasso. Suba o andamento rumo ao alvo de 132 BPM.' },
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
    {
      kind: 'callout',
      tone: 'erro',
      title: 'colcheias desiguais',
      body: 'A segunda colcheia de cada par tende a sair curta e atrasada. Conte "um e dois e" em voz alta e dê o mesmo espaço às duas.',
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
    { kind: 'exercise', id: 'l20-bloco', exercise: quickTimed('Padrão 1: bloco', 'I–IV–V–I em posição próxima, a 72 BPM. Dois ciclos limpos.', () => melodyTask(PAT_BLOCK, { bpm: 72, clef: 'bass' }), { reps: 2, pass: { accuracy: 0.9 } }) },
    { kind: 'exercise', id: 'l20-oitava', exercise: quickTimed('Padrão 2: raiz com oitava', 'Dó, Fá, Sol, Dó, com a oitava, a 72 BPM. Dois ciclos limpos.', () => melodyTask(PAT_OCTAVE, { bpm: 72, clef: 'bass' }), { reps: 2, pass: { accuracy: 0.9 } }) },
    { kind: 'exercise', id: 'l20-quinta', exercise: quickTimed('Padrão 3: raiz e 5ª', 'Fundamental e 5ª em semínimas, a 72 BPM. Dois ciclos limpos.', () => melodyTask(PAT_FIFTH, { bpm: 72, clef: 'bass' }), { reps: 2, pass: { accuracy: 0.9 } }) },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'o salto da mão esquerda',
      body: 'Nos padrões de raiz, a mão salta (Dó → Fá → Sol). Olhe para a próxima raiz um tempo antes e deixe o braço levar a mão, com o pulso solto. O dedo 5 chega primeiro; os outros vêm junto.',
    },
    { kind: 'exercise', id: 'l20-junto', exercise: quickTimed('Raiz e 5ª com a melodia', 'A primeira metade do refrão de Jingle Bells na direita; raiz e 5ª em mínimas na esquerda, a 60 BPM. Duas passadas boas.', () => twoHandTask(JB_CHORUS_R.split(' | ').slice(0, 8).join(' | '), JB_CHORUS_FIFTH.split(' | ').slice(0, 8).join(' | '), { bpm: 60, caption: 'Esquerda: Dó–Sol nos compassos 1 a 4 e 6, Fá–Dó no 5, Sol–Ré no 7 e no 8.' }), { reps: 2 }) },
    {
      kind: 'text',
      title: 'As colcheias de Eine kleine Nachtmusik',
      body: `Na lição 18 você tocou a abertura de Mozart de ouvido. Agora dá para contar cada colcheia:

- No 1º compasso: **Dó** (semínima), uma pausa de colcheia e **Sol** (colcheia), duas vezes. A pausa é curta: conte "**1** e **2** e", com o Sol no "e".
- No 2º: quatro colcheias seguidas, **Dó, Sol, Dó, Mi**, e o **Sol** agudo em semínima. É o trecho que todo mundo canta.
- Os compassos 3 e 4 repetem o desenho sobre o G7.

A esquerda segura um acorde por compasso, como antes. Conte em voz alta antes de juntar as mãos.`,
    },
    { kind: 'exercise', id: 'l20-eine', exercise: quickTimed('Eine kleine Nachtmusik contada', '5 compassos, duas mãos, contando "1 e 2 e". Começa a 72 BPM e sobe até 100 BPM.', () => twoHandTask(EK_C_R, EK_C_L, { bpm: 72, caption: 'Esquerda: Dó nos compassos 1 e 2, G7 no 3 e no 4, Dó no último.' }), { ladder: { from: 72, to: 100, step: 4 } }) },
    { kind: 'song', songId: 'u03-eine-do', why: 'A abertura para tocar junto com a partitura, rumo ao alvo de 132 BPM.' },
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
    'Consigo dizer as notas da escala de Sol maior e por que ela tem Fá♯.',
    'Consigo tocar I, IV e V7 de Sol maior pelo grau.',
    'Consigo transpor uma progressão de Dó para Sol pensando nos graus.',
    'Consigo tocar Eine kleine Nachtmusik em Sol, o tom original, com acompanhamento.',
  ],
  music: [
    { song: 'u03-eine-sol', why: 'Mozart escreveu a Eine kleine Nachtmusik em Sol maior: o G quebrado e, depois, o D7 quebrado, com o Fá♯ desta lição. É a mesma música que você já toca, agora no tom de verdade.' },
    { piece: 'love-me-do', why: 'Love Me Do é G, C e D: o I, o IV e o V de Sol, os três acordes desta lição, do começo ao fim. Primeiro single dos Beatles (1962).' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A escala de Sol e o Fá♯',
      body: `Os degraus da escala de Dó não são todos iguais. Lembre da lição 13: entre **Mi e Fá** e entre **Si e Dó** não há tecla preta, então esses passos são **semitons**; todos os outros são **tons**. Subindo de Dó: tom, tom, **semitom**, tom, tom, tom, **semitom**. Repare onde cai o último semitom: entre o 7º grau (Si) e a casa. É por isso que o Si puxa para o Dó.

Agora comece no **Sol** e copie o mesmo desenho. Sol, Lá, Si, Dó, Ré e Mi encaixam: tom, tom, semitom, tom, tom. Do 6º para o 7º grau o desenho pede **tom**, mas de Mi para Fá só há um semitom. Então o Fá sobe: **Fá♯**. E de Fá♯ para Sol fica o semitom final, meio tom abaixo da casa, como o Si em Dó.

**Escala de Sol maior: Sol, Lá, Si, Dó, Ré, Mi, Fá♯.** Por isso, em Sol, todo Fá é Fá♯. Na lição 25 você usa esse desenho para montar a escala maior a partir de qualquer nota.`,
    },
    {
      kind: 'keys',
      low: 67,
      high: 79,
      lit: [67, 69, 71, 72, 74, 76, 78],
      labels: { 67: '1', 69: '2', 71: '3', 72: '4', 74: '5', 76: '6', 78: '7', 79: '1' },
      caption: 'Escala de Sol maior com os graus: Sol (1), Lá (2), Si (3), Dó (4), Ré (5), Mi (6), Fá♯ (7).',
    },
    { kind: 'exercise', id: 'l21-escala', exercise: { kind: 'items', title: 'Graus de Sol maior', how: 'O app pede um número de 1 a 7; toque essa nota da escala de Sol, em qualquer oitava. O 7 é o Fá♯.', gen: degreesG, count: 10, low: 48, high: 84, labels: 'fade', pass: { accuracy: 0.8 } } },
    {
      kind: 'text',
      title: 'Os mesmos graus em outra casa',
      body: `Com a escala de Sol, os acordes saem do mesmo jeito que em Dó: Sol (I), Lá, Si, **Dó (IV)**, **Ré (V)**. Os acordes primários de Sol maior são:

- **I = G** (Sol, Si, Ré): a casa.
- **IV = C** (Dó, Mi, Sol): o afastamento.
- **V7 = D7** (Ré, **Fá♯**, Lá, Dó): a tensão.

O D7 traz o **Fá♯**, o 7º grau da escala de Sol. Ele é a **sensível** de Sol: meio tom abaixo da casa, puxando para cima, como o Si em Dó. E o trítono do D7 é **Fá♯–Dó**, que resolve em Sol–Si.

Repare: o acorde de **Dó** era o I em Dó maior e agora é o IV em Sol maior. O acorde é o mesmo; o **papel** mudou porque a casa mudou.`,
    },
    {
      kind: 'text',
      title: 'Posição próxima em Sol',
      body: `As mesmas regras de movimento mínimo valem aqui. Na mão esquerda:

- **G**: Sol2, Si2, Ré3 (dedos 5, 3, 1).
- **C**: Sol2, Dó3, Mi3. O Sol fica; Si e Ré sobem.
- **D7**: Fá♯2, Dó3, Ré3. O Sol desce meio tom para Fá♯; Si sobe para Dó; Ré fica. A 5ª (Lá) fica de fora.

É exatamente o mesmo desenho de Dó maior, uma 4ª mais grave (5 semitons): o Fá♯ faz em Sol o que o Si fazia em Dó.`,
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
    { kind: 'exercise', id: 'l21-eine', exercise: quickTimed('Eine kleine Nachtmusik em Sol', '5 compassos, duas mãos: a melodia a partir do Sol4, G e D7 na esquerda. De 56 a 72 BPM.', () => twoHandTask(EK_G_R, EK_G_L, { bpm: 56, fifths: 1, caption: 'Esquerda: G nos compassos 1 e 2, D7 no 3 e no 4, G no último. O Fá♯ do compasso 4 é a sensível.' }), { ladder: { from: 56, to: 72, step: 4 } }) },
    { kind: 'song', songId: 'u03-eine-sol', why: 'A versão em Sol na pauta dupla. O sustenido no começo de cada linha é a armadura: vale para todos os Fá da música. Você estuda armaduras a fundo na Unidade 4.' },
    { kind: 'exercise', id: 'l21-quiz', exercise: quiz('Sol maior', 'Seis perguntas rápidas.', KEY_G) },
  ],
  review: [degreesG, gChords, toG, choice(KEY_G, 'tom-sol')],
  checkpoint: [
    { kind: 'items', title: 'Graus em Dó e em Sol', how: 'Notas da escala (1 a 7) e acordes I, IV ou V7, numa das duas tonalidades, sem dicas. Meta: 85%.', gen: mix([cgChords, cgChords, degreesCG]), count: 16, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } },
    { kind: 'items', title: 'Transposição de progressões', how: 'Progressões novas de Dó para Sol. Meta: 85%.', gen: toG, count: 6, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [degreesG, gChords, choice(KEY_G, 'tom-sol')],
};

// Silent Night ("Stille Nacht", Franz Xaver Gruber, 1818). Notas da edição do Mutopia Project (Daniel Widyanto, a partir
// do manuscrito de Gruber, em Sol), transpostas para Dó, com o ritmo original (a semínima pontuada do "Si-lent" fica:
// sem ela a música perde o balanço). A esquerda toca um acorde por compasso, em mínima pontuada.
const SN_R = 'G4:1.5 A4:0.5 G4 | E4:3 | G4:1.5 A4:0.5 G4 | E4:3 | D5:2 D5 | B4:3 | C5:2 C5 | G4:3 | A4:2 A4 | C5:1.5 B4:0.5 A4 | G4:1.5 A4:0.5 G4 | E4:3 | A4:2 A4 | C5:1.5 B4:0.5 A4 | G4:1.5 A4:0.5 G4 | E4:3 | D5:2 D5 | F5:1.5 D5:0.5 B4 | C5:2 C5 | E5:3 | C5 G4 E4 | G4:1.5 F4:0.5 D4 | C4:3';
const SN_DEG = ['I', 'I', 'I', 'I', 'V7', 'V7', 'I', 'I', 'IV', 'IV', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V7', 'V7', 'I', 'I', 'I', 'V7', 'I'];
const SN_L = chordBars(SN_DEG, NEAR, 3);

const noite: SongSpec = {
  id: 'u03-noite',
  title: 'Silent Night',
  composer: 'Franz Xaver Gruber (1818)',
  arrangement: 'arranjo do Fermata em Dó, 3/4: a melodia com o ritmo original na direita, um acorde por compasso (C, F e G7 em posição próxima) na esquerda',
  bpm: 84,
  beatsPerBar: 3,
  fifths: 0,
  right: SN_R,
  left: SN_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
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
  music: [
    { song: 'u03-noite', why: 'Silent Night tem um acorde por compasso e nenhuma pressa: o lugar perfeito para o pedal direto. O pé desce no 1 de cada compasso, com o acorde, e sobe no fim.' },
    { piece: 'love-me-tender', why: 'Love Me Tender é uma balada lenta de acordes longos, ótima para o pedal. Ela traz um acorde que você ainda não viu, o D7 (em Dó), que é só um G7 um tom acima: na Unidade 10 você entende por que ele soa tão bem ali.' },
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
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer de subir o pedal',
      body: 'No pedal direto, o pé desce com o acorde e sobe antes do próximo (ou na pausa). Esquecer de subir mistura os acordes num som embolado.',
    },
    { kind: 'exercise', id: 'l22-pausas', exercise: quickTimed('Pedal com pausas', 'Acordes de mínima e pausas de mínima, mão direita, a 60 BPM. Pedal desce com o acorde e sobe na pausa. Duas passadas boas.', (rng) => melodyTask(pick(rng, PEDAL_RESTS), { bpm: 60 }), { reps: 2, pedal: 'direto' }) },
    { kind: 'exercise', id: 'l22-colado', exercise: quickTimed('Pedal com acordes colados', 'Agora sem pausas: suba o pedal no fim de cada acorde e desça com o próximo. 60 BPM, duas passadas boas.', (rng) => melodyTask(pick(rng, PEDAL_FLOW), { bpm: 60 }), { reps: 2, pedal: 'direto' }) },
    {
      kind: 'text',
      title: 'Silent Night com pedal',
      body: `**Silent Night** (Franz Xaver Gruber, 1818) é uma valsa lenta em 3/4, com **um acorde por compasso** na esquerda: C, G7 e F, os acordes da unidade. Toque com o pedal direto: o pé desce **junto** com o acorde, no 1 de cada compasso, e sobe no fim do compasso, um instante antes do próximo acorde.

Onde a harmonia não muda de um compasso para o outro (os quatro primeiros são todos Dó), troque o pedal assim mesmo: é a melodia que pede, porque as notas da direita também ficam presas no pedal.`,
    },
    { kind: 'exercise', id: 'l22-noite', exercise: quickTimed('Silent Night, duas mãos', 'Os 8 primeiros compassos, com o pedal direto a cada compasso. Começa a 60 BPM e sobe até 76 BPM.', () => twoHandTask(SN_R.split(' | ').slice(0, 8).join(' | '), SN_L.split(' | ').slice(0, 8).join(' | '), { bpm: 60, beatsPerBar: 3, caption: 'Esquerda: Dó nos compassos 1 a 4, G7 no 5 e no 6, Dó no 7 e no 8. Pedal: desce no 1, sobe no fim do compasso.' }), { ladder: { from: 60, to: 76, step: 4 } }) },
    { kind: 'song', songId: 'u03-noite', why: 'A música inteira, 23 compassos. Use o pedal direto em cada compasso.' },
    { kind: 'exercise', id: 'l22-quiz', exercise: quiz('O pedal', 'Cinco perguntas rápidas.', PEDAL) },
  ],
  review: [choice(PEDAL, 'pedal'), cgChords],
  checkpoint: [
    quickTimed('Pedal direto', 'Acordes com pausas, ordem nova, a 66 BPM. Meta: 85% das trocas sem lama, soltando o pedal nas pausas.', (rng) => melodyTask(pick(rng, PEDAL_RESTS), { bpm: 66 }), { pedal: 'direto' }),
    quickTimed('Pedal com acordes colados', 'A 66 BPM.', (rng) => melodyTask(pick(rng, PEDAL_FLOW), { bpm: 66 }), { pedal: 'direto' }),
  ],
  exit: [choice(PEDAL, 'pedal'), gChords],
};

const EAR2: ChoiceQuestion[] = [
  { q: 'De I para IV em Dó, o baixo vai de Dó para…', options: ['Fá (sobe uma 4ª)', 'Sol (sobe uma 5ª)', 'Mi'], answer: 0, why: 'I → IV: Dó → Fá.' },
  { q: 'O movimento de baixo que soa mais como "fim" é…', options: ['Sol → Dó (V → I)', 'Dó → Fá (I → IV)', 'Fá → Sol (IV → V)'], answer: 0, why: 'A cadência autêntica: baixo do V para o I.' },
  { q: 'Para achar a tônica de ouvido, o melhor é…', options: ['Cantar a nota em que a música quer parar', 'Contar as notas', 'Ouvir só a primeira nota'], answer: 0, why: 'A tônica é o repouso: a nota que encerraria a música.' },
  { q: 'O IV soa como…', options: ['Afastamento suave, um passeio', 'Tensão máxima', 'Fim'], answer: 0, why: 'Subdominante: sai de casa sem urgência.' },
  { q: 'No ditado de progressão, por onde começar?', options: ['Pelo baixo', 'Pela nota mais aguda', 'Pelo ritmo'], answer: 0, why: 'O baixo mostra a fundamental de cada acorde; com ele, o acorde quase se resolve sozinho.' },
];

const KEY_F: ChoiceQuestion[] = [
  { q: 'Em Fá maior, o IV é…', options: ['Si♭ (B♭)', 'Si (B)', 'Dó (C)'], answer: 0, why: 'Fá, Sol, Lá, Si♭: em Fá maior o Si é bemol.' },
  { q: 'Em Fá maior, o V7 é…', options: ['C7', 'G7', 'B♭7'], answer: 0, why: 'Fá, Sol, Lá, Si♭, Dó: o 5º grau é Dó.' },
  { q: 'O C7 tem quais notas?', options: ['Dó, Mi, Sol, Si♭', 'Dó, Mi, Sol, Si', 'Dó, Mi♭, Sol, Si♭'], answer: 0, why: 'Dó maior mais a 7ª da dominante: Si♭.' },
  { q: 'A sensível de Fá maior é…', options: ['Mi', 'Mi♭', 'Sol'], answer: 0, why: 'Meio tom abaixo do Fá: Mi. Ela está no C7.' },
];

const bassC = progressionByEar({ keys: ['C'], progressions: [['I', 'IV', 'V7', 'I'], ['I', 'V7', 'V7', 'I'], ['I', 'I', 'IV', 'I'], ['I', 'IV', 'I', 'V7'], ['I', 'IV', 'IV', 'V7']], answer: 'bass' });
const chordsByEar = progressionByEar({ keys: ['C'], progressions: [['I', 'IV', 'I'], ['I', 'V7', 'I'], ['I', 'IV', 'V7'], ['I', 'IV', 'V7', 'I']], answer: 'chords' });
// Tônica só nos tons já vistos: Dó e Sol na lição 23; Fá entra na 24.
const tonic = tonicByEar({ keys: ['C', 'G'] });
const tonic3 = tonicByEar({ keys: ['C', 'G', 'F'] });
const fChords = primaryChord({ keys: ['F'], degrees: ['I', 'IV', 'V7'], low: 36, high: 72 });
const allKeys = primaryChord({ keys: ['C', 'G', 'F'], degrees: ['I', 'IV', 'V7'], low: 36, high: 72 });

// O refrão de Jingle Bells em Sol e em Fá, para o projeto dos três tons (bloco e raiz com 5ª).
const JB_G_R = shift(JB_CHORUS_R, -5);
const JB_G_L = shift(JB_CHORUS_L, -5);
const JB_F_R = shift(JB_CHORUS_R, -7, true);
const JB_F_L = shift(JB_CHORUS_L, -7, true);
const JB_F_FIFTH = shift(JB_CHORUS_FIFTH, 5, true);

const jingleG: SongSpec = {
  id: 'u03-jingle-sol',
  title: 'Jingle Bells, refrão em Sol',
  composer: 'James Lord Pierpont (1857)',
  arrangement: 'arranjo do Fermata: o refrão em Sol maior, com G, C e D7 em posição próxima',
  bpm: 120,
  beatsPerBar: 4,
  fifths: 1,
  right: JB_G_R,
  left: JB_G_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const jingleF: SongSpec = {
  id: 'u03-jingle-fa',
  title: 'Jingle Bells, refrão em Fá',
  composer: 'James Lord Pierpont (1857)',
  arrangement: 'arranjo do Fermata: o refrão em Fá maior, com F, B♭ e C7 em posição próxima',
  bpm: 120,
  beatsPerBar: 4,
  fifths: -1,
  right: JB_F_R,
  left: JB_F_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const l23: Lesson = {
  n: 23,
  id: 'l23',
  title: 'Ouvido 2: baixo e função',
  minutes: 60,
  objectives: [
    'Consigo achar a tônica de uma progressão em Dó ou Sol.',
    'Consigo tocar o baixo de uma progressão de 4 acordes com I, IV e V7.',
    'Consigo tocar de ouvido progressões curtas com I, IV e V7.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Primeiro passo: achar a casa',
      body: `Tocar de ouvido segue sempre a mesma ordem: **tônica**, depois **baixo**, depois **acordes**. O primeiro passo é o mais importante: sem saber onde é a casa, nenhum grau faz sentido.

Para achar a tônica, ouça o trecho e **cante a nota em que ele quer parar**. Depois procure essa nota no teclado. Em geral é a nota com que as frases terminam. Quando a música termina em repouso, é também a nota mais grave do último acorde. No exercício abaixo o app para no V7, sem resolver: cante a resolução, ou lembre que o primeiro acorde é a casa.

Uma dica que ajuda muito: progressões que acabam no V7 deixam a casa "no ar". O ouvido completa sozinho a resolução. Cante essa resolução: é a tônica.`,
    },
    { kind: 'exercise', id: 'l23-tonica', exercise: { kind: 'items', title: 'Ache a casa', how: 'O app toca I–IV–V7 em Dó ou em Sol, sorteado, sem resolver. Toque a tônica, em qualquer oitava.', gen: tonic, count: 10, low: 48, high: 72, labels: 'off', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'O baixo conta a história',
      body: `Num acompanhamento simples, a nota mais grave de cada acorde é a **fundamental**. Por isso o **baixo** é o atalho para os acordes: se você sabe o baixo, já sabe o acorde.

Em Dó maior, o baixo dos três acordes primários é **Dó (I)**, **Fá (IV)** e **Sol (V7)**. Cada movimento tem uma cara:

- **I → IV** (Dó → Fá): o baixo sobe uma 4ª. Soa como abrir uma porta, sair de casa.
- **I → V** (Dó → Sol): sobe uma 5ª (ou desce uma 4ª). Soa como tensão chegando.
- **V → I** (Sol → Dó): o movimento mais forte da harmonia, o ponto final.
- **IV → V** (Fá → Sol): um passo, a subida para a tensão.

Para ouvir o baixo, tente cantar só a nota mais grave de cada acorde, ignorando o resto. No começo parece impossível; com algumas repetições, o ouvido aprende a "descer".`,
    },
    {
      kind: 'example',
      title: 'Ouvir o baixo',
      steps: [
        { say: 'Só o baixo: Dó, Fá, Sol, Dó.', play: { bpm: 72, steps: [36, 41, 43, 36].map((m, i) => ({ midis: [m], beats: i === 3 ? 4 : 2 })) } },
        { say: 'O mesmo baixo com os acordes por cima. Cante só a nota de baixo.', play: { bpm: 72, steps: [[36, 52, 55, 60], [41, 53, 57, 60], [43, 53, 55, 59], [36, 52, 55, 60]].map((m, i) => ({ midis: m, beats: i === 3 ? 4 : 2 })) } },
        { say: 'Outra ordem: Dó, Sol, Sol, Dó.', play: { bpm: 72, steps: [[36, 52, 55, 60], [43, 53, 55, 59], [43, 53, 55, 59], [36, 52, 55, 60]].map((m, i) => ({ midis: m, beats: i === 3 ? 4 : 2 })) } },
      ],
    },
    { kind: 'exercise', id: 'l23-baixo', exercise: { kind: 'items', title: 'Ditado do baixo', how: 'O app toca 4 acordes em Dó maior. Toque o baixo de cada um (Dó, Fá ou Sol), em ordem, em qualquer oitava.', gen: bassC, count: 8, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'Do baixo ao acorde',
      body: `Com o baixo certo, o acorde vem quase de graça: Dó no baixo → C; Fá → F; Sol → G7. Agora o desafio é tocar os acordes inteiros, em ordem, logo depois de ouvir.

Use a posição próxima da lição 19: C (Dó–Mi–Sol), F (Dó–Fá–Lá), G7 (Si–Fá–Sol). A mão quase não sai do lugar, e você pode prestar atenção no som em vez de procurar teclas.

Se errar, ouça de novo e cante o baixo antes de tocar. A regra do curso vale aqui também: errar e corrigir fixa mais do que acertar de primeira por sorte.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'confundir IV e V7',
      body: 'Os dois saem de casa, mas de jeitos diferentes. O IV soa como um passeio tranquilo; o V7 soa como uma pergunta que exige resposta. Se depois do acorde você sente vontade urgente de voltar ao I, é o V7.',
    },
    { kind: 'exercise', id: 'l23-acordes', exercise: { kind: 'items', title: 'Ditado de progressão', how: 'O app toca 3 ou 4 acordes em Dó maior. Toque os acordes, em ordem. O primeiro é sempre o C.', gen: chordsByEar, count: 8, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.8 } } },
    { kind: 'exercise', id: 'l23-quiz', exercise: quiz('Baixo e função', 'Cinco perguntas rápidas.', EAR2) },
  ],
  review: [tonic, bassC, chordsByEar, choice(EAR2, 'ouvido-funcao')],
  checkpoint: [
    { kind: 'items', title: 'Ouvido misturado', how: '15 perguntas: tônica, baixo e progressões, sem dicas. Meta: 85%.', gen: mix([tonic, bassC, bassC, chordsByEar]), count: 15, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [tonic, bassC, choice(EAR2, 'ouvido-funcao')],
};

const l24: Lesson = {
  n: 24,
  id: 'l24',
  title: 'Checkpoint da unidade e projeto "Folclore em três tons"',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint misto da unidade 3, sem dicas.',
    'Consigo tocar I, IV e V7 em Dó, Sol e Fá.',
    'Consigo acompanhar uma canção folclórica em três tons, com dois padrões de mão esquerda.',
    'Consigo tocar Amazing Grace com acordes, em 3/4 e com anacruse.',
  ],
  music: [
    { song: 'u03-amazing', why: 'O projeto final da unidade. Amazing Grace é um hino de 1829 que virou de todo mundo: o Elvis gravou, e a melodia cabe em C, F e G7, os acordes que você já tem.' },
    { song: 'u03-jingle-sol', why: 'O refrão de Jingle Bells em Sol e em Fá, para o mini-projeto dos três tons.' },
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que você já sabe',
      body: `Nesta unidade você montou o acorde maior pela fórmula 4 + 3, aprendeu as três funções (casa, afastamento e tensão) com I, IV e V7, leu cifra, encadeou acordes em posição próxima, tocou colcheias e três padrões de mão esquerda, mudou de tonalidade para Sol, usou o pedal direto e começou a tirar baixo e acordes de ouvido.

O checkpoint de hoje mistura tudo isso, com perguntas novas e sem dicas. O projeto junta tudo numa coisa só: acompanhar uma canção em três tons.`,
    },
    {
      kind: 'text',
      title: 'O terceiro tom: Fá maior',
      body: `Copie o desenho da escala a partir de Fá, como fez em Sol na lição 21: Fá, Sol, Lá, e do 3º para o 4º grau o desenho pede **semitom**. De Lá para Si é tom, então o Si desce: **Si♭**. **Escala de Fá maior: Fá, Sol, Lá, Si♭, Dó, Ré, Mi.** Em Fá maior o Si é sempre Si♭, assim como em Sol o Fá era sempre Fá♯.

Contando os graus: Fá (I), Sol, Lá, **Si♭ (IV)**, **Dó (V)**. Os acordes primários:

- **I = F** (Fá, Lá, Dó).
- **IV = B♭** (Si♭, Ré, Fá).
- **V7 = C7** (Dó, Mi, Sol, **Si♭**). A sensível é o **Mi**, meio tom abaixo do Fá.

Em posição próxima na mão esquerda: **F** = Fá2, Lá2, Dó3; **B♭** = Fá2, Si♭2, Ré3; **C7** = Mi2, Si♭2, Dó3. O desenho é o mesmo de Dó e de Sol, de novo: o que muda é a casa.`,
    },
    {
      kind: 'example',
      title: 'I – IV – V7 – I em Fá',
      steps: [{ say: 'F – B♭ – C7 – F na mão esquerda.', play: { bpm: 72, steps: [[41, 45, 48], [41, 46, 50], [40, 46, 48], [41, 45, 48]].map((m, i) => ({ midis: m, beats: i === 3 ? 4 : 2 })) } }],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer o Si♭',
      body: 'Em Fá maior o Si é sempre Si♭, inclusive no acorde de B♭ e no C7. Antes de tocar, diga em voz alta: Fá maior, um bemol, Si♭.',
    },
    { kind: 'exercise', id: 'l24-fa', exercise: { kind: 'items', title: 'Graus em Fá', how: 'I, IV ou V7 de Fá maior. Lembre do Si♭.', gen: fChords, count: 12, low: 36, high: 72, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l24-jingle-fa', exercise: quickTimed('Jingle Bells em Fá', 'O refrão, duas mãos, F, B♭ e C7 em bloco. De 56 a 72 BPM.', () => twoHandTask(JB_F_R, JB_F_L, { bpm: 56, fifths: -1, caption: 'Um acorde por compasso: F, B♭ e C7 na esquerda. Todo Si é Si♭.' }), { ladder: { from: 56, to: 72, step: 4 } }) },
    { kind: 'song', songId: 'u03-jingle-fa', why: 'O refrão em Fá na pauta dupla, com o bemol na armadura.' },
    { kind: 'song', songId: 'u03-jingle-sol', why: 'E em Sol, com o sustenido na armadura: as três casas da unidade.' },
    { kind: 'exercise', id: 'l24-quiz', exercise: quiz('Fá maior', 'Quatro perguntas rápidas.', KEY_F, 0.75) },
    {
      kind: 'text',
      title: 'Antes do projeto final: Amazing Grace',
      body: `A última música da unidade junta três coisas novas numa só: o **3/4**, a **anacruse** (a melodia entra no 3º tempo, antes do primeiro compasso cheio) e o **acorde de mínima pontuada**, que a esquerda toca no 1 e segura o compasso inteiro.

A mão direita vai do Sol4 ao Sol5, então ela muda de posição no meio da frase: no salto para o Sol5 ("me"), leve a mão inteira, não estique os dedos. A esquerda usa os acordes que você já conhece: C, F, G e G7, em posição próxima. No compasso 8 ela toca G (sem a 7ª) e, no penúltimo, G7: do G para o G7 só um dedo se move.

Estude primeiro a esquerda sozinha, no exercício abaixo. Depois a direita, e só então as duas juntas.`,
    },
    { kind: 'exercise', id: 'l24-amazing-me', exercise: quickTimed('Amazing Grace: só a esquerda', 'Um acorde por compasso, em mínima pontuada, a 72 BPM. O primeiro compasso é a espera da anacruse. Duas passadas boas.', () => melodyTask(AMAZING_L, { bpm: 72, beatsPerBar: 3, clef: 'bass' }), { reps: 2 }) },
    { kind: 'song', songId: 'u03-amazing', why: 'O projeto final da unidade: Amazing Grace com acordes, em 3/4 e com anacruse.' },
  ],
  review: [allKeys, HARM_C, bassC, choice([...CHORDS, ...DOMINANT, ...FUNCTIONS, ...EIGHTHS, ...KEY_G, ...PEDAL, ...EAR2, ...KEY_F])],
  checkpoint: [
    {
      kind: 'items',
      title: 'Acordes, cifra e ouvido',
      how: '20 perguntas misturadas das lições 17 a 23, com algumas da Unidade 2. Meta: 85%.',
      gen: mix([allKeys, allKeys, chordsCFG7, HARM_C, cadenceC, toG, degreesCG, bassC, tonic3, choice([...CHORDS, ...DOMINANT, ...FUNCTIONS, ...KEY_G, ...PEDAL, ...EAR2])]),
      count: 20,
      low: 36,
      high: 84,
      labels: 'off',
      pass: { accuracy: 0.85 },
    },
    quickTimed('Colcheias', '4 compassos sorteados a 80 BPM, ±60 ms.', randomRhythm(RHY_8, 4, 80), { window: 60 }),
    quickTimed('Raiz e 5ª com a melodia', 'O refrão de Jingle Bells em Dó, 16 compassos, a 72 BPM. Meta: 90%.', () => twoHandTask(JB_CHORUS_R, JB_CHORUS_FIFTH, { bpm: 72, caption: 'Esquerda, raiz e 5ª em mínimas: Dó–Sol no C, Fá–Dó no F, Sol–Ré no G7.' }), { pass: { accuracy: 0.9 } }),
  ],
  project: {
    title: 'Jingle Bells em três tons',
    brief: `Acompanhe o refrão de **Jingle Bells** em **Dó, Sol e Fá**, usando **dois padrões** de mão esquerda: bloco e raiz com 5ª. A mesma progressão (I, IV e V7) em três casas, com a melodia por cima. Se quiser, faça o mesmo com outra música que você conheça, descobrindo os acordes pelo ouvido.`,
    steps: [
      'Escreva a progressão da música em graus (I, IV, V7), compasso por compasso.',
      'Toque em Dó com o padrão de bloco e depois com raiz e 5ª.',
      'Transponha para Sol: mesmos graus, acordes G, C e D7.',
      'Transponha para Fá: F, B♭ e C7. Cuidado com o Si♭.',
      'Toque a versão em Fá com raiz e 5ª no exercício abaixo. Grave as três versões, se quiser comparar depois.',
    ],
    rubric: [
      'Os acordes estavam certos em 95% ou mais dos compassos, nos três tons.',
      'O pulso ficou estável, sem parar nas trocas de acorde.',
      'A mão esquerda ficou mais leve que a melodia.',
      'Os dois padrões foram usados.',
    ],
    exercise: { kind: 'timed', title: 'Em Fá, raiz e 5ª', how: 'O refrão em Fá na direita; raiz e 5ª (Fá–Dó, Si♭–Fá, Dó–Sol) na esquerda, a 72 BPM.', gen: () => twoHandTask(JB_F_R, JB_F_FIFTH, { bpm: 72, fifths: -1, caption: 'Esquerda: raiz e 5ª de F, B♭ e C7.' }), reps: 1, window: 100, pass: { accuracy: 0.9 } },
  },
  exit: [allKeys, bassC, choice(KEY_F, 'tom-fa')],
};

const unit: Unit = {
  n: 3,
  id: 'u03',
  title: 'Primeiros acordes e cifra',
  goal: 'Montar acordes maiores, acompanhar melodias com I, IV e V7 lendo cifra, em Dó, Sol e Fá, e usar o pedal.',
  technique: 'Trocas de acorde (C–F–G7) em posição próxima, acordes quebrados e padrões de mão esquerda em semínimas e colcheias, de 60 rumo a 96 BPM (referência: RCM Preparatory B). Nos dias sem lição nova, 5 minutos de chuva de cifras.',
  lessons: [l17, l18, l19, l20, l21, l22, l23, l24],
  songs: [jingle, eineDo, eineSol, noite, jingleG, jingleF, amazing],
  final: {
    songId: 'u03-amazing',
    brief: 'Amazing Grace em Dó, 3/4 com anacruse: a melodia na mão direita, uma oitava acima do Dó central, e um acorde por compasso na esquerda (I, IV, V e V7 em posição próxima). Junta o que a unidade ensinou: acordes primários, cifra, trocas no tempo e a anacruse da Unidade 2. No compasso 8 a mão direita sobe até o Sol5: prepare o salto no compasso anterior.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [chordsCFG, chordsDAE, chordsCG7, chordsCFG7, cadenceC, degreesC, degreesG, degreesCG, HARM_C, gChords, cgChords, toG, bassC, chordsByEar, tonic, tonic3, fChords, allKeys];
