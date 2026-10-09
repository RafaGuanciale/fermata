// Unidade 4 — Escala maior, armaduras e pedal legato (lições 25 a 33). Projeto final: Cânone em Ré (Pachelbel), simplificado.
// A lição 33 é o Marco 1: checkpoint das unidades 1 a 4 e mini-recital.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { buildScale, choice, degreeByEar, keyFromSignature, mix, primaryChord, readNote, scaleDegreeNote, type ChoiceQuestion } from '../gens';
import { pick } from '../music';
import { melodyTask, randomRhythm, sci, twoHandTask } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

// ---------- escrita ----------

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];

/** Escala maior de uma oitava em colcheias, subindo e descendo, terminando numa semibreve. */
function scaleLine(tonic: Midi): string {
  const up = MAJOR.map((x) => `${sci(tonic + x)}:0.5`).join(' ');
  const down = [...MAJOR].reverse().map((x) => `${sci(tonic + x)}:0.5`).join(' ');
  return `${up} | ${down} | ${sci(tonic)}:4`;
}

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

// ---------- perguntas ----------

const SCALE: ChoiceQuestion[] = [
  { q: 'A fórmula da escala maior é…', options: ['T T S T T T S', 'T S T T S T T', 'T T T S T T S'], answer: 0, why: 'Tom, tom, semitom, tom, tom, tom, semitom.' },
  { q: 'Um tetracorde maior tem…', options: ['4 notas: tom, tom, semitom', '4 notas: tom, semitom, tom', '5 notas'], answer: 0, why: 'Dó, Ré, Mi, Fá: T, T, S.' },
  { q: 'A escala maior é feita de…', options: ['Dois tetracordes separados por um tom', 'Dois tetracordes colados', 'Três tetracordes'], answer: 0, why: 'Dó–Fá, um tom, Sol–Dó.' },
  { q: 'Por que Sol maior precisa de Fá♯?', options: ['Para o 2º tetracorde ser T, T, S (Ré, Mi, Fá♯, Sol)', 'Por tradição', 'Para soar mais forte'], answer: 0, why: 'De Mi para Fá é só um semitom; a fórmula pede um tom ali.' },
  { q: 'Em Dó maior, onde estão os semitons?', options: ['Mi–Fá e Si–Dó', 'Ré–Mi e Lá–Si', 'Não há semitons'], answer: 0, why: 'Entre o 3º e o 4º grau, e entre o 7º e o 8º.' },
];

const THUMB: ChoiceQuestion[] = [
  { q: 'Dedilhado de Dó maior, mão direita, subindo:', options: ['1 2 3 1 2 3 4 5', '1 2 3 4 5 1 2 3', '1 2 3 4 1 2 3 4'], answer: 0, why: 'Três dedos, passa o polegar, cinco dedos.' },
  { q: 'Dedilhado de Dó maior, mão esquerda, subindo:', options: ['5 4 3 2 1 3 2 1', '1 2 3 1 2 3 4 5', '5 4 3 2 1 2 3 4'], answer: 0, why: 'Subindo, a esquerda faz o caminho espelhado: o 3 cruza por cima do polegar.' },
  { q: 'Na passagem do polegar, o que se move?', options: ['O polegar passa por baixo e o antebraço acompanha de lado', 'Só o polegar, com força', 'O punho sobe'], answer: 0, why: 'Movimento lateral do braço e leve rotação do antebraço; o polegar só se prepara.' },
  { q: 'Um bom jeito de estudar a passagem é…', options: ['Tocar os grupos de dedos como blocos, depois ligar', 'Tocar rápido até sair', 'Pular a passagem'], answer: 0, why: 'Primeiro sem passagem (as posições em bloco), depois com passagem.' },
];

const SIGNATURES: ChoiceQuestion[] = [
  { q: 'A ordem dos sustenidos na armadura é…', options: ['Fá, Dó, Sol, Ré, Lá, Mi, Si', 'Si, Mi, Lá, Ré, Sol, Dó, Fá', 'Dó, Ré, Mi, Fá, Sol, Lá, Si'], answer: 0, why: 'Cada sustenido novo fica uma 5ª acima do anterior.' },
  { q: 'A ordem dos bemóis na armadura é…', options: ['Si, Mi, Lá, Ré, Sol, Dó, Fá', 'Fá, Dó, Sol, Ré, Lá, Mi, Si', 'Mi, Lá, Si, Ré'], answer: 0, why: 'É a ordem dos sustenidos de trás para frente.' },
  { q: 'Um sustenido na armadura (Fá♯) vale…', options: ['Para todos os Fá, em todas as oitavas, a música inteira', 'Só para o próximo Fá', 'Só até a barra de compasso'], answer: 0, why: 'A armadura vale sempre; o acidente avulso é que vale até a barra.' },
  { q: 'Qual tonalidade maior tem 1 bemol?', options: ['Fá maior', 'Si♭ maior', 'Ré maior'], answer: 0, why: 'Fá maior: Si♭.' },
  { q: 'Qual tonalidade maior tem 1 sustenido?', options: ['Sol maior', 'Ré maior', 'Fá maior'], answer: 0, why: 'Sol maior: Fá♯.' },
];

// ---------- peças reaproveitadas ----------

const tetra = buildScale({ keys: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'], notes: 4 });
const scalesWhite = buildScale({ keys: ['C', 'G', 'F', 'D'], notes: 8 });
const scalesAll = buildScale({ keys: ['C', 'G', 'F', 'D', 'A', 'Bb', 'E', 'Eb'], notes: 8 });
const sigs12 = keyFromSignature({ fifths: [0, 1, -1] });
const readG = readNote({ notes: [62, 64, 66, 67, 69, 71, 72, 74, 76, 77, 78, 79], clef: 'treble', fifths: 1, skill: 'ler-armadura' });
const readF = readNote({ notes: [60, 62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 82], clef: 'treble', fifths: -1, skill: 'ler-armadura' });

/** Melodias com armadura (sem acidentes avulsos): posição de Sol (1♯) e de Fá (1♭). */
const READ_G = [
  'G4 A4 B4 C5 | D5 B4 G4:2 | A4 B4 C5 A4 | B4 A4 G4:2',
  'B4 A4 G4 F#4 | G4 A4 B4:2 | C5 B4 A4 F#4 | G4:4',
  'D5 C5 B4 A4 | B4 G4 A4:2 | F#4 G4 A4 B4 | G4:4',
];
const READ_F = [
  'F4 G4 A4 Bb4 | C5 A4 F4:2 | G4 A4 Bb4 G4 | A4 G4 F4:2',
  'C5 Bb4 A4 G4 | A4 F4 G4:2 | A4 Bb4 C5 E4 | F4:4',
  'A4 G4 F4 G4 | A4 Bb4 C5:2 | Bb4 A4 G4 E4 | F4:4',
];

// ---------- lições ----------

const l25: Lesson = {
  n: 25,
  id: 'l25',
  title: 'Tetracordes e a fórmula da escala maior',
  minutes: 60,
  objectives: [
    'Consigo dizer a fórmula da escala maior: tom, tom, semitom, tom, tom, tom, semitom.',
    'Consigo construir um tetracorde maior a partir de qualquer nota.',
    'Consigo tocar a escala maior de Dó, Sol, Fá e Ré, uma nota por vez, sem errar.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Uma escada com degraus de dois tamanhos',
      body: `Toque todas as brancas de Dó4 a Dó5: **Dó, Ré, Mi, Fá, Sol, Lá, Si, Dó**. Isso é a **escala de Dó maior**, e ela tem um segredo: os degraus não são todos iguais.

Lembre da lição 13: entre Mi e Fá, e entre Si e Dó, não há tecla preta. Esses degraus são **semitons**. Todos os outros são **tons**. Em ordem:

**Dó–Ré** tom, **Ré–Mi** tom, **Mi–Fá** semitom, **Fá–Sol** tom, **Sol–Lá** tom, **Lá–Si** tom, **Si–Dó** semitom.

A fórmula **T T S T T T S** é o que faz uma escala soar "maior". Ela vale para qualquer tônica: comece em qualquer tecla, siga a fórmula, e o resultado é uma escala maior.`,
    },
    {
      kind: 'text',
      title: 'Dois tetracordes',
      body: `Um jeito fácil de guardar a fórmula: a escala maior é feita de **dois pedaços iguais** de 4 notas, os **tetracordes**, separados por um tom.

- Cada tetracorde maior é **tom, tom, semitom**. Em Dó: **Dó, Ré, Mi, Fá**.
- Entre os dois, **um tom**: Fá → Sol.
- O segundo tetracorde é igual ao primeiro: **Sol, Lá, Si, Dó**.

Para montar a escala de qualquer tônica no teclado: toque um tetracorde com os dedos 4, 3, 2, 1 da mão esquerda e continue com o segundo tetracorde nos dedos 1, 2, 3, 4 da direita. Cada mão faz o mesmo desenho.`,
    },
    {
      kind: 'example',
      title: 'Dó maior em dois tetracordes',
      steps: [
        { say: '1º tetracorde: Dó, Ré, Mi, Fá. Tom, tom, semitom.', keys: [60, 62, 64, 65], play: { bpm: 96, steps: [60, 62, 64, 65].map((m) => ({ midis: [m], beats: 1 })) } },
        { say: 'Um tom de Fá para Sol, e o 2º tetracorde: Sol, Lá, Si, Dó.', keys: [67, 69, 71, 72], play: { bpm: 96, steps: [67, 69, 71, 72].map((m) => ({ midis: [m], beats: 1 })) } },
        { say: 'A escala inteira.', play: { bpm: 112, steps: MAJOR.map((x) => ({ midis: [60 + x], beats: x === 12 ? 2 : 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l25-tetra', exercise: { kind: 'items', title: 'Tetracordes', how: 'Construa tom, tom, semitom a partir da nota pedida. Algumas pedem tecla preta.', gen: tetra, count: 10, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.8 } } },
    {
      kind: 'text',
      title: 'Por que Sol maior precisa de Fá♯',
      body: `Aplique a fórmula a partir do Sol. O primeiro tetracorde é **Sol, Lá, Si, Dó**: tom, tom, semitom. Perfeito, só brancas. Um tom acima, o segundo tetracorde começa no **Ré**: Ré, Mi, ... e aqui aparece o problema. De Mi para Fá é um semitom, mas a fórmula pede **tom**. Então o Fá precisa subir: **Fá♯**. E de Fá♯ para Sol é o semitom que fecha a escala.

**Sol maior = Sol, Lá, Si, Dó, Ré, Mi, Fá♯, Sol.** Esse é o motivo do Fá♯ que você já usava na posição de Sol e no acorde de D7.

O mesmo raciocínio, a partir do Fá: Fá, Sol, Lá e... de Lá para Si seria um tom, mas a fórmula pede semitom. O Si desce: **Si♭**. **Fá maior = Fá, Sol, Lá, Si♭, Dó, Ré, Mi, Fá.**`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'nomes repetidos ou pulados',
      body: 'Uma escala usa cada letra uma vez só, em ordem. Por isso a 4ª nota de Fá maior é Si♭ (letra Si) e não Lá♯ (letra Lá repetida). O som é o mesmo; o nome certo deixa a escala legível.',
    },
    {
      kind: 'example',
      title: 'Sol maior e Fá maior',
      steps: [
        { say: 'Sol maior: o Fá♯ aparece no fim, meio tom abaixo da tônica.', keys: [66], play: { bpm: 112, steps: MAJOR.map((x) => ({ midis: [67 + x], beats: x === 12 ? 2 : 1 })) } },
        { say: 'Fá maior: o Si♭ aparece no meio, meio tom acima do Lá.', keys: [70], play: { bpm: 112, steps: MAJOR.map((x) => ({ midis: [65 + x], beats: x === 12 ? 2 : 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l25-escalas', exercise: { kind: 'items', title: 'Construa a escala', how: 'Dó, Sol, Fá ou Ré maior, subindo uma oitava a partir da oitava 4. Siga a fórmula.', gen: scalesWhite, count: 8, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l25-quiz', exercise: quiz('A escala maior', 'Cinco perguntas rápidas.', SCALE) },
  ],
  review: [tetra, scalesWhite, choice(SCALE, 'escala-maior')],
  checkpoint: [
    { kind: 'items', title: '8 escalas', how: 'Escalas maiores sorteadas, inclusive com pretas, sem dicas. Meta: 85%.', gen: scalesAll, count: 8, low: 55, high: 84, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [tetra, choice(SCALE, 'escala-maior')],
};

const blocksC = 'C4+D4+E4:2 F4+G4+A4+B4+C5:2 | C4+D4+E4:2 F4+G4+A4+B4+C5:2 | C4+D4+E4:4';

const l26: Lesson = {
  n: 26,
  id: 'l26',
  title: 'Passagem do polegar',
  minutes: 60,
  objectives: [
    'Consigo tocar Dó maior com o dedilhado certo nas duas mãos, sem parar na passagem.',
    'Consigo tocar a escala em colcheias a 60 BPM com variação abaixo de 40 ms entre as notas.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Oito notas, cinco dedos',
      body: `Uma escala tem 8 notas e a mão tem 5 dedos. A solução é a **passagem do polegar**: depois de alguns dedos, o polegar passa por baixo da mão e assume a próxima nota, e a mão continua.

Dedilhado de **Dó maior**, uma oitava:

- **Mão direita**, subindo: **1 2 3 · 1 2 3 4 5**. O polegar passa por baixo do dedo 3 para tocar o Fá. Descendo: 5 4 3 2 1 · 3 2 1, o dedo 3 cruza por cima do polegar no Mi.
- **Mão esquerda**, subindo: **5 4 3 2 1 · 3 2 1**. O dedo 3 cruza por cima do polegar no Lá. Descendo: 1 2 3 · 1 2 3 4 5, o polegar passa por baixo no Sol.

Sol maior e Ré maior usam o mesmo dedilhado de Dó nas duas mãos.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 72,
      lit: [60, 62, 64, 65, 67, 69, 71, 72],
      labels: { 60: '1', 62: '2', 64: '3', 65: '1', 67: '2', 69: '3', 71: '4', 72: '5' },
      caption: 'Dó maior, mão direita: 1 2 3, o polegar passa para o Fá, 1 2 3 4 5.',
    },
    {
      kind: 'text',
      title: 'O movimento certo: braço, não polegar',
      body: `O erro clássico é torcer o polegar com força por baixo da mão, deixando o punho torto. O movimento certo é outro:

- O **antebraço se desloca para o lado**, sempre um pouco, acompanhando a direção da escala. A mão "viaja" sobre o teclado.
- Uma leve **rotação do antebraço** leva o polegar à tecla nova. O polegar se prepara cedo, movendo-se por baixo enquanto os outros dedos tocam, e só precisa descer quando chega a vez dele.
- O **punho** fica nivelado e solto, sem subir nem fazer um "arco" na passagem.

Um bom teste: a escala deve soar **igual**, sem um "tropeço" no Fá. Os pianistas que medem isso no laboratório encontram a irregularidade espalhada pela escala, e não só no polegar. Por isso o app mede a escala inteira.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'estudar com e sem passagem',
      body: 'Graham Fitch recomenda separar os dois problemas: primeiro toque os grupos de dedos como **blocos** (Dó–Ré–Mi juntos, depois Fá–Sol–Lá–Si–Dó juntos), para a mão aprender as duas posições; depois ligue as notas com a passagem. É o exercício a seguir.',
    },
    { kind: 'exercise', id: 'l26-blocos', exercise: quickTimed('As duas posições em bloco', 'Mão direita: Dó–Ré–Mi (1 2 3) juntos, depois Fá–Sol–Lá–Si–Dó (1 2 3 4 5) juntos, a 60 BPM. Duas passadas boas.', () => melodyTask(blocksC, { bpm: 60 }), { reps: 2 }) },
    {
      kind: 'example',
      title: 'A escala igual, como gotas',
      steps: [
        { say: 'Dó maior em colcheias a 60 BPM: duas notas por tempo, subindo e descendo.', play: { bpm: 60, steps: [...MAJOR, ...[...MAJOR].reverse().slice(1)].map((x, i, a) => ({ midis: [60 + x], beats: i === a.length - 1 ? 2 : 0.5 })) } },
      ],
    },
    { kind: 'exercise', id: 'l26-md', exercise: quickTimed('Dó maior, mão direita', 'Colcheias, subindo e descendo. A escada começa a 45 BPM e sobe até 60. Meta de uniformidade: até 40 ms.', () => melodyTask(scaleLine(60), { bpm: 45 }), { ladder: { from: 45, to: 60, step: 5 }, evenness: 40 }) },
    { kind: 'exercise', id: 'l26-me', exercise: quickTimed('Dó maior, mão esquerda', 'A mesma escala uma oitava abaixo, dedilhado 5 4 3 2 1 3 2 1. De 45 a 60 BPM.', () => melodyTask(scaleLine(48), { bpm: 45, clef: 'bass' }), { ladder: { from: 45, to: 60, step: 5 }, evenness: 40 }) },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'escala é qualidade, não quantidade',
      body: 'Três passadas limpas valem mais que vinte cansadas. Se o polegar ou o punho começarem a doer, pare, solte o braço e volte no dia seguinte. A escada de andamento não sobe com dor.',
    },
    { kind: 'exercise', id: 'l26-quiz', exercise: quiz('Dedilhado e passagem', 'Quatro perguntas rápidas.', THUMB, 0.75) },
  ],
  review: [choice(THUMB, 'dedilhado'), scalesWhite],
  checkpoint: [
    quickTimed('Dó maior a 60 BPM, mão direita', 'Colcheias, sem dicas. 3 passadas limpas seguidas, variação até 40 ms.', () => melodyTask(scaleLine(60), { bpm: 60 }), { reps: 3, evenness: 40 }),
    quickTimed('Dó maior a 60 BPM, mão esquerda', 'Colcheias, sem dicas, variação até 40 ms.', () => melodyTask(scaleLine(48), { bpm: 60, clef: 'bass' }), { evenness: 40 }),
  ],
  exit: [choice(THUMB, 'dedilhado'), tetra],
};

const l27: Lesson = {
  n: 27,
  id: 'l27',
  title: 'Armadura: Sol e Fá maior',
  minutes: 60,
  objectives: [
    'Consigo dizer a ordem dos sustenidos e dos bemóis.',
    'Consigo ler uma melodia com armadura sem esquecer o Fá♯ ou o Si♭.',
    'Consigo tocar as escalas de Sol e de Fá maior a 60 BPM, mãos separadas.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Armadura: os acidentes escritos uma vez só',
      body: `Numa música em Sol maior, todo Fá é Fá♯. Escrever um ♯ em cada Fá seria cansativo, então os acidentes da tonalidade vão para o começo de cada linha da pauta, logo depois da clave: a **armadura**.

A regra da armadura é diferente da regra do acidente avulso (lição 13):

- O acidente **avulso** vale até a barra de compasso.
- A **armadura** vale para **todas as notas com aquele nome, em todas as oitavas, a música inteira** (até aparecer outra armadura).

Com um ♯ na linha do Fá, o Fá4, o Fá5 e o Fá3 são todos Fá♯. Para tocar um Fá natural numa música em Sol, a partitura precisa de um **bequadro** (♮) avulso.`,
    },
    {
      kind: 'text',
      title: 'A ordem dos sustenidos e dos bemóis',
      body: `Os acidentes da armadura aparecem sempre na mesma ordem:

- **Sustenidos**: **Fá, Dó, Sol, Ré, Lá, Mi, Si**. Sol maior tem 1 (Fá♯); Ré maior, 2 (Fá♯, Dó♯); Lá maior, 3; e assim por diante.
- **Bemóis**: a mesma lista ao contrário, **Si, Mi, Lá, Ré, Sol, Dó, Fá**. Fá maior tem 1 (Si♭); Si♭ maior, 2 (Si♭, Mi♭).

Repare que a ordem dos sustenidos sobe de 5ª em 5ª (Fá → Dó → Sol…). Na lição 32 isso vira o **círculo de quintas**, o mapa das tonalidades.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer a armadura depois da primeira linha',
      body: 'A armadura só aparece no começo de cada linha, e a memória falha no meio dela. Antes de tocar, diga em voz alta: "Sol maior, todo Fá é sustenido". Durante a leitura, marque mentalmente cada Fá antes de chegar nele.',
    },
    { kind: 'exercise', id: 'l27-ler-g', exercise: { kind: 'items', title: 'Notas com 1 sustenido', how: 'A pauta tem a armadura de Sol maior. Todo Fá é Fá♯; o ♮ cancela.', gen: readG, count: 14, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    { kind: 'exercise', id: 'l27-ler-f', exercise: { kind: 'items', title: 'Notas com 1 bemol', how: 'A pauta tem a armadura de Fá maior. Todo Si é Si♭.', gen: readF, count: 14, low: 55, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'Dedilhado de Sol e de Fá',
      body: `- **Sol maior**: igual a Dó nas duas mãos. Direita 1 2 3 · 1 2 3 4 5; esquerda 5 4 3 2 1 · 3 2 1.
- **Fá maior, mão direita**: **1 2 3 4 · 1 2 3 4**. O polegar não pode cair no Si♭ (uma tecla preta), então ele passa depois do Si♭, no Dó. O dedo 4 fica no Si♭.
- **Fá maior, mão esquerda**: 5 4 3 2 1 · 3 2 1, igual a Dó.

Regra geral que você vai usar muito: **o polegar evita as teclas pretas**. O dedilhado de cada escala é desenhado em torno disso.`,
    },
    { kind: 'exercise', id: 'l27-sol', exercise: quickTimed('Sol maior, mão direita', 'Colcheias, de 45 a 60 BPM, variação até 40 ms. A pauta tem a armadura.', () => melodyTask(scaleLine(67), { bpm: 45, fifths: 1 }), { ladder: { from: 45, to: 60, step: 5 }, evenness: 40 }) },
    { kind: 'exercise', id: 'l27-fa', exercise: quickTimed('Fá maior, mão direita', 'Dedilhado 1 2 3 4 · 1 2 3 4, de 45 a 60 BPM.', () => melodyTask(scaleLine(65), { bpm: 45, fifths: -1 }), { ladder: { from: 45, to: 60, step: 5 }, evenness: 40 }) },
    { kind: 'exercise', id: 'l27-me', exercise: quickTimed('Sol ou Fá, mão esquerda', 'Uma das duas, sorteada, uma oitava abaixo, a 55 BPM.', (rng) => (rng() < 0.5 ? melodyTask(scaleLine(55), { bpm: 55, fifths: 1, clef: 'bass' }) : melodyTask(scaleLine(53), { bpm: 55, fifths: -1, clef: 'bass' })), { reps: 2, evenness: 40 }) },
    { kind: 'exercise', id: 'l27-leitura', exercise: quickTimed('Leitura com armadura', 'Melodia de 4 compassos em Sol ou em Fá, sem acidentes avulsos, a 60 BPM. Duas passadas boas.', (rng) => (rng() < 0.5 ? melodyTask(pick(rng, READ_G), { bpm: 60, fifths: 1 }) : melodyTask(pick(rng, READ_F), { bpm: 60, fifths: -1 })), { reps: 2 }) },
    { kind: 'exercise', id: 'l27-quiz', exercise: quiz('Armaduras', 'Cinco perguntas rápidas.', SIGNATURES) },
  ],
  review: [readG, readF, sigs12, choice(SIGNATURES, 'armadura')],
  checkpoint: [
    quickTimed('Escala sorteada a 60 BPM', 'Sol ou Fá maior, mão direita, sem dicas. Variação até 40 ms.', (rng) => (rng() < 0.5 ? melodyTask(scaleLine(67), { bpm: 60, fifths: 1 }) : melodyTask(scaleLine(65), { bpm: 60, fifths: -1 })), { evenness: 40 }),
    quickTimed('Leitura com armadura', 'Melodia nova a 66 BPM. Meta: 85%.', (rng) => (rng() < 0.5 ? melodyTask(pick(rng, READ_G), { bpm: 66, fifths: 1 }) : melodyTask(pick(rng, READ_F), { bpm: 66, fifths: -1 }))),
  ],
  exit: [readG, readF, choice(SIGNATURES, 'armadura')],
};

// ---------- músicas ----------

// Cânone em Ré (Johann Pachelbel, c. 1680): o baixo de 8 notas e três das variações sobre ele, simplificadas.
const CANON_BASS = 'D3:2 A2:2 | B2:2 F#2:2 | G2:2 D2:2 | G2:2 A2:2';
const CANON_FIFTHS = 'D3+A3:2 A2+E3:2 | B2+F#3:2 F#2+C#3:2 | G2+D3:2 D2+A2:2 | G2+D3:2 A2+E3:2';
const CANON_V1 = 'F#5:2 E5:2 | D5:2 C#5:2 | B4:2 A4:2 | B4:2 C#5:2';
const CANON_V2 = 'D5:2 C#5:2 | B4:2 A4:2 | G4:2 F#4:2 | G4:2 E4:2';
const CANON_V3 = 'D5 F#5 A5 G5 | F#5 D5 F#5 E5 | D5 B4 D5 A4 | G4 B4 A4 G4';

const canon: SongSpec = {
  id: 'u04-canone',
  title: 'Cânone em Ré',
  composer: 'Johann Pachelbel',
  arrangement: 'arranjo do Fermata, simplificado: o baixo de 8 notas na mão esquerda (sozinho, depois com a 5ª) e três variações da melodia na direita, em mínimas e semínimas; acorde final de Ré',
  bpm: 60,
  beatsPerBar: 4,
  fifths: 2,
  right: `${CANON_V1} | ${CANON_V2} | ${CANON_V3} | F#4+A4+D5:4`,
  left: `${CANON_BASS} | ${CANON_FIFTHS} | ${CANON_BASS} | D2+D3:4`,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const DEGREE_NAMES: ChoiceQuestion[] = [
  { q: 'O 1º grau da escala se chama…', options: ['Tônica', 'Dominante', 'Mediante'], answer: 0, why: 'A tônica é a casa, o grau que dá nome à tonalidade.' },
  { q: 'O 5º grau se chama…', options: ['Dominante', 'Subdominante', 'Sensível'], answer: 0, why: 'Dominante: o grau mais forte depois da tônica.' },
  { q: 'O 4º grau se chama…', options: ['Subdominante', 'Superdominante', 'Supertônica'], answer: 0, why: 'Sub = abaixo: a dominante de baixo (uma 5ª abaixo da tônica).' },
  { q: 'O 7º grau, meio tom abaixo da tônica, se chama…', options: ['Sensível', 'Mediante', 'Dominante'], answer: 0, why: 'Ele "sente" a tônica logo acima e puxa para ela.' },
  { q: 'O 3º grau se chama…', options: ['Mediante', 'Supertônica', 'Subdominante'], answer: 0, why: 'Mediante: fica no meio do caminho entre a tônica e a dominante.' },
  { q: 'O 2º e o 6º graus se chamam…', options: ['Supertônica e superdominante', 'Mediante e sensível', 'Subdominante e dominante'], answer: 0, why: 'Super = acima: logo acima da tônica e logo acima da dominante.' },
  { q: 'Em Ré maior, a dominante é…', options: ['Lá', 'Sol', 'Fá♯'], answer: 0, why: 'Ré, Mi, Fá♯, Sol, Lá: 5º grau.' },
];

const RHYTHM_DOT: ChoiceQuestion[] = [
  { q: 'Quanto vale a semínima pontuada?', options: ['1 tempo e meio', '2 tempos', '3 tempos'], answer: 0, why: '1 + metade de 1.' },
  { q: 'Depois de uma semínima pontuada, para completar 2 tempos, vem…', options: ['Uma colcheia', 'Uma semínima', 'Uma mínima'], answer: 0, why: '1,5 + 0,5 = 2.' },
  { q: 'Síncope é…', options: ['Uma nota que começa num tempo fraco e se prolonga pelo forte', 'Uma pausa longa', 'Tocar mais rápido'], answer: 0, why: 'O acento sai do lugar esperado: a nota "atravessa" o tempo forte.' },
  { q: 'Contratempo é…', options: ['Nota no "e", com pausa no tempo', 'Nota no tempo forte', 'Duas notas juntas'], answer: 0, why: 'O tempo fica em silêncio e a nota cai na metade.' },
];

const PEDAL_L: ChoiceQuestion[] = [
  { q: 'No pedal legato, o pedal troca…', options: ['Logo depois do ataque do acorde novo', 'Antes do acorde novo', 'Só no fim da música'], answer: 0, why: 'Primeiro os dedos tocam; depois o pé sobe e desce. O som não para.' },
  { q: 'Trocar o pedal antes do acorde novo…', options: ['Deixa um buraco no som', 'Deixa o som mais limpo', 'Não muda nada'], answer: 0, why: 'Entre a subida do pedal e o acorde novo, nada soa: o "soluço".' },
  { q: 'Trocar tarde demais…', options: ['Mistura os dois acordes (lama)', 'Deixa um buraco', 'Abafa tudo'], answer: 0, why: 'O acorde velho continua soando por baixo do novo.' },
  { q: 'Enquanto o pé troca, os dedos…', options: ['Ficam presos nas teclas do acorde novo', 'Soltam as teclas', 'Tocam de novo'], answer: 0, why: 'Os dedos seguram o som enquanto o pedal sobe; quando ele desce de novo, pega o acorde novo.' },
];

const degreeNames = scaleDegreeNote({ keys: ['C', 'G', 'F'], degrees: [1, 2, 3, 4, 5, 6, 7] });
const degreeNamesD = scaleDegreeNote({ keys: ['C', 'G', 'F', 'D', 'Bb'], degrees: [1, 3, 4, 5, 7] });
const chordsRandom = primaryChord({ keys: ['C', 'G', 'F'], degrees: ['I', 'IV', 'V7'], low: 36, high: 72 });
const ear16 = degreeByEar({ tonic: 60, degrees: [1, 2, 3, 4, 5, 6] });

const RHY_DOT = ['x:1.5 x:0.5 x x', 'x:1.5 x:0.5 x:2', 'x x:1.5 x:0.5 x', 'x:1.5 x:0.5 x:1.5 x:0.5', 'x x x:1.5 x:0.5'];
const RHY_SYNC = ['x:0.5 x x:0.5 x:2', 'x x:0.5 x x:0.5 x', 'x:0.5 x x x x:0.5', 'r:0.5 x:0.5 r:0.5 x:0.5 x:2', 'x:0.5 x x:0.5 x x', 'x:2 x:0.5 x x:0.5'];

// Ode à Alegria com o ritmo original de Beethoven nos fins de frase (semínima pontuada e colcheia).
const ODE_DOT_R = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2';
const ODE_DOT_L = 'C3:4 | G3:4 | C3:4 | G3:4 | C3:4 | G3:4 | C3:4 | G3:2 C3:2';
// Melodia original com síncope (curta–longa–curta).
const SYNC_R = 'C4:0.5 E4 G4:0.5 G4:2 | A4:0.5 G4 E4:0.5 G4:2 | F4:0.5 F4 E4:0.5 D4 E4 | D4:0.5 E4 D4:0.5 C4:2 | C4:0.5 E4 G4:0.5 G4:2 | A4:0.5 C5 A4:0.5 G4:2 | F4:0.5 E4 D4:0.5 E4 D4 | C4:4';
const SYNC_L = 'C3:4 | C3:4 | G3:4 | C3:4 | C3:4 | C3:4 | G3:4 | C3:4';

const odeDotted: SongSpec = {
  id: 'u04-ode-pontuada',
  title: 'Ode à Alegria, ritmo original',
  composer: 'Ludwig van Beethoven',
  arrangement: 'arranjo do Fermata: os 8 primeiros compassos com a semínima pontuada dos fins de frase, e bordão de Dó3 e Sol3',
  bpm: 76,
  beatsPerBar: 4,
  fifths: 0,
  right: ODE_DOT_R,
  left: ODE_DOT_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const syncopated: SongSpec = {
  id: 'u04-sincopado',
  title: 'Sincopado',
  composer: 'Fermata (melodia original)',
  arrangement: 'melodia na posição de Dó com síncope curta–longa–curta; bordão na mão esquerda',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: SYNC_R,
  left: SYNC_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const PEDAL_DRILL = 'C4+E4+G4:2 C4+F4+A4:2 | C4+E4+G4:2 B3+D4+F4+G4:2 | C4+E4+G4:4';

const l28: Lesson = {
  n: 28,
  id: 'l28',
  title: 'Graus da escala',
  minutes: 60,
  objectives: [
    'Consigo dar nome aos 7 graus: tônica, supertônica, mediante, subdominante, dominante, superdominante e sensível.',
    'Consigo tocar o I, IV ou V7 de Dó, Sol ou Fá em menos de 2 s.',
    'Consigo reconhecer de ouvido os graus 1 a 6 em Dó maior.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Cada grau tem um nome e um papel',
      body: `Você já chama os acordes pelo número romano (I, IV, V). As **notas** da escala também têm números (graus 1 a 7) e, além disso, **nomes** que descrevem o papel de cada uma:

1. **Tônica**: a casa.
2. **Supertônica**: logo acima da tônica.
3. **Mediante**: no meio do caminho entre a tônica e a dominante.
4. **Subdominante**: a "dominante de baixo", uma 5ª abaixo da tônica.
5. **Dominante**: o grau mais forte depois da tônica, base do acorde de tensão.
6. **Superdominante**: logo acima da dominante.
7. **Sensível**: meio tom abaixo da tônica, puxando para ela.

Os nomes não mudam de tonalidade para tonalidade. Em Dó, a dominante é Sol; em Sol, é Ré; em Fá, é Dó. Pensar em graus é o que permite transpor e tocar de ouvido em qualquer tom.`,
    },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'por que a sensível puxa',
      body: 'A sensível fica a um semitom da tônica, a menor distância possível. O ouvido, acostumado a ouvir essa nota resolver para cima, sente a falta da tônica quando ela fica parada. É por isso que o V7, que contém a sensível, pede tanto o I.',
    },
    { kind: 'exercise', id: 'l28-nomes', exercise: { kind: 'items', title: 'O grau pelo nome', how: 'O app diz o nome do grau e a tonalidade; toque a nota, em qualquer oitava.', gen: degreeNames, count: 14, low: 48, high: 84, labels: 'fade', pass: { accuracy: 0.85 } } },
    {
      kind: 'text',
      title: 'Graus ao vivo',
      body: `Músicos que acompanham cantores ouvem o tempo todo pedidos como "vai pro IV!" ou "segura no V". Para responder rápido, o caminho é **não traduzir**: ver "IV em Fá" e a mão já ir para o Si♭, sem passar por "Fá, Sol, Lá, Si♭… é Si♭".

No exercício abaixo, o app sorteia tom e grau, e mede o tempo. A meta é responder em **menos de 2 s**. Se demorar, não tem problema: a velocidade vem da repetição espaçada, não do esforço de uma tarde.`,
    },
    { kind: 'exercise', id: 'l28-graus', exercise: { kind: 'items', title: 'I, IV ou V7, rápido', how: 'Tom e grau sorteados. Meta: 85% e média abaixo de 2 s.', gen: chordsRandom, count: 18, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85, avgMs: 2000 } } },
    {
      kind: 'text',
      title: 'Ouvir os graus 1 a 6',
      body: `Na lição 5 você reconheceu 1, 3 e 5 de ouvido. Agora entram o **2**, o **4** e o **6**. Cada um tem uma sensação depois da cadência:

- **2**: instável, quer descer para o 1 ou subir para o 3.
- **4**: pesado, quer descer para o 3.
- **6**: doce e um pouco melancólico, quer descer para o 5.

Se ficar em dúvida, cante a nota e deixe ela "cair" para onde quer ir: o lugar onde ela repousa entrega quem ela é.`,
    },
    { kind: 'exercise', id: 'l28-ouvido', exercise: { kind: 'items', title: 'Graus 1 a 6 de ouvido', how: 'Depois da cadência em Dó, toque a nota que você ouviu.', gen: ear16, count: 12, low: 48, high: 84, labels: 'off', pass: { accuracy: 0.8 } } },
    { kind: 'exercise', id: 'l28-quiz', exercise: quiz('Nomes dos graus', 'Sete perguntas rápidas.', DEGREE_NAMES) },
  ],
  review: [degreeNames, chordsRandom, ear16, choice(DEGREE_NAMES, 'nomes-graus')],
  checkpoint: [
    { kind: 'items', title: 'Graus ao vivo', how: 'I, IV ou V7 em Dó, Sol ou Fá, sem dicas. Meta: 85% e média abaixo de 2 s.', gen: chordsRandom, count: 18, low: 36, high: 72, labels: 'off', pass: { accuracy: 0.85, avgMs: 2000 } },
    { kind: 'items', title: 'Nomes e ouvido', how: 'Nomes dos graus e graus 1 a 6 de ouvido, misturados. Meta: 85%.', gen: mix([degreeNames, ear16]), count: 14, low: 48, high: 84, labels: 'off', pass: { accuracy: 0.85 } },
  ],
  exit: [degreeNames, chordsRandom, choice(DEGREE_NAMES, 'nomes-graus')],
};

const l29: Lesson = {
  n: 29,
  id: 'l29',
  title: 'Semínima pontuada e síncope simples',
  minutes: 60,
  objectives: [
    'Consigo tocar a semínima pontuada seguida de colcheia no tempo.',
    'Consigo tocar síncopes e contratempos simples com 85% das notas em ±60 ms.',
    'Consigo tocar uma peça curta com síncope.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A semínima pontuada',
      body: `O ponto soma metade do valor (lição 12). Na semínima: **1 + ½ = 1 tempo e meio**. Ela quase sempre vem seguida de uma **colcheia**, para fechar 2 tempos: "**1** (e) 2 **e**".

Conte as colcheias: "**1** e 2 **e**". A semínima pontuada começa no 1 e segura pelo "e" e pelo 2; a colcheia cai no "e" do 2. O ritmo resultante é longo–curto, como um passo manco.

Você já ouviu esse ritmo: no fim da primeira frase da Ode à Alegria, Beethoven escreveu "Mi (pontuada), Ré (colcheia), Ré (mínima)". A versão de método que você tocou até agora simplificou isso para semínimas.`,
    },
    {
      kind: 'example',
      title: 'Pontuada e colcheia',
      steps: [
        { say: 'Semínima pontuada e colcheia, duas vezes: longo, curto.', play: { bpm: 72, steps: [1.5, 0.5, 1.5, 0.5].map((b) => ({ midis: [60], beats: b })) } },
        { say: 'Na Ode à Alegria, o fim da frase com o ritmo original.', play: { bpm: 80, steps: [[64, 1], [64, 1], [62, 1], [60, 1], [64, 1.5], [62, 0.5], [62, 2]].map(([m, b]) => ({ midis: [m], beats: b })) } },
      ],
    },
    { kind: 'exercise', id: 'l29-pontuada', exercise: quickTimed('Ritmo pontuado', 'Dois compassos sorteados a 66 BPM, em qualquer tecla. Conte as colcheias. Duas passadas boas.', randomRhythm(RHY_DOT, 2, 66), { reps: 2, window: 80 }) },
    {
      kind: 'text',
      title: 'Síncope e contratempo: o acento fora do lugar',
      body: `No 4/4, o ouvido espera os acentos no 1 e no 3. A **síncope** desloca o acento: uma nota começa num ponto fraco (no "e") e **se prolonga por cima** do ponto forte seguinte. O exemplo mais comum é **curta–longa–curta**: colcheia, semínima, colcheia. A semínima do meio começa no "e" do 1 e atravessa o 2.

No **contratempo**, o tempo fica em silêncio e a nota cai no "e": pausa de colcheia, colcheia.

Síncope é o tempero de quase toda música popular brasileira, do choro ao samba. A regra para tocar certo é a mesma de sempre: **o pulso não para**. Conte "1 e 2 e" em voz alta e coloque cada nota no lugar da contagem, sem empurrar o tempo.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'adiantar a nota sincopada',
      body: 'A tendência é antecipar a nota longa da síncope para "chegar logo" no tempo forte, ou atrasar a próxima para compensar. Bata o pé nos tempos enquanto toca: o pé fica no tempo, as mãos ficam no contratempo.',
    },
    {
      kind: 'example',
      title: 'Ouvir a síncope',
      steps: [
        { say: 'Curta–longa–curta, e uma mínima: "1 E 2 e" com o acento no "e".', play: { bpm: 72, steps: [0.5, 1, 0.5, 2].map((b) => ({ midis: [60], beats: b })) } },
        { say: 'Contratempo: pausa no tempo, nota no "e".', play: { bpm: 72, steps: [{ midis: [], beats: 0.5 }, { midis: [60], beats: 0.5 }, { midis: [], beats: 0.5 }, { midis: [60], beats: 0.5 }, { midis: [60], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l29-sincope', exercise: quickTimed('Síncope e contratempo', 'Dois compassos sorteados a 66 BPM. Duas passadas boas.', randomRhythm(RHY_SYNC, 2, 66), { reps: 2, window: 80 }) },
    { kind: 'exercise', id: 'l29-ode', exercise: quickTimed('Ode à Alegria com o ritmo original', '8 compassos, duas mãos, a 66 BPM. Atenção aos compassos 4 e 8.', () => twoHandTask(ODE_DOT_R, ODE_DOT_L, { bpm: 66 }), { reps: 2 }) },
    { kind: 'song', songId: 'u04-sincopado', why: 'Uma peça curta com síncope em todo compasso, para tocar no estúdio com a partitura e o modo Estudar.' },
    { kind: 'song', songId: 'u04-ode-pontuada', why: 'A Ode à Alegria como Beethoven escreveu os fins de frase.' },
    { kind: 'exercise', id: 'l29-quiz', exercise: quiz('Pontuada e síncope', 'Quatro perguntas rápidas.', RHYTHM_DOT, 0.75) },
  ],
  review: [choice(RHYTHM_DOT, 'sincope'), degreeNames],
  checkpoint: [
    quickTimed('Pontuada e síncope', '4 compassos sorteados a 72 BPM, ±60 ms, sem dicas.', randomRhythm([...RHY_DOT, ...RHY_SYNC], 4, 72), { window: 60 }),
    quickTimed('Sincopado', 'A peça com síncope, mão direita, a 66 BPM.', () => melodyTask(SYNC_R, { bpm: 66 }), { window: 80 }),
  ],
  exit: [choice(RHYTHM_DOT, 'sincope'), chordsRandom],
};

const l30: Lesson = {
  n: 30,
  id: 'l30',
  title: 'Pedal legato',
  minutes: 60,
  objectives: [
    'Consigo trocar o pedal logo depois do ataque do acorde novo, sem buraco e sem lama.',
    'Consigo fazer o encadeamento I–IV–I–V7–I com pedal legato em 3 passadas sem troca antecipada.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Ligar acordes com o pé',
      body: `No pedal direto (lição 22), o pé subia **antes** do acorde novo. Isso deixa um respiro entre os acordes, ótimo para música com pausas, mas que quebra uma linha que deveria ser ligada.

O **pedal legato** (ou sincopado) inverte a ordem:

1. Os dedos tocam o **acorde novo**.
2. **Logo depois**, o pé **sobe** (o acorde velho para de soar; o novo continua, porque os dedos estão segurando as teclas).
3. O pé **desce** de novo, pegando o acorde novo.

O resultado é um som contínuo, sem buraco e sem mistura. O pé fica sempre um pouquinho **atrasado** em relação às mãos: por isso "sincopado".`,
    },
    {
      kind: 'text',
      title: 'Os dois erros e a janela certa',
      body: `- **Trocar cedo** (antes do acorde novo): entre a subida do pedal e o ataque, nada soa. É o "soluço" na frase.
- **Trocar tarde** (ou não trocar): o acorde velho continua soando por baixo do novo. É a **lama**.

A janela certa é pequena: o app aceita a subida do pedal até **250 ms** depois do ataque e a descida logo em seguida. Com o tempo, o movimento vira um só gesto do tornozelo, "sobe-desce", logo depois de cada acorde.

O drill clássico usa um encadeamento em que só algumas notas mudam: **I – IV – I – V7 – I**, com o Dó comum segurando a mão no lugar. Em Dó maior: Dó–Mi–Sol, Dó–Fá–Lá, Dó–Mi–Sol, Si–Ré–Fá–Sol, Dó–Mi–Sol.`,
    },
    {
      kind: 'example',
      title: 'O drill, ligado',
      steps: [
        { say: 'I – IV – I – V7 – I, mínimas, ligados pelo pedal: o som nunca para e nunca mistura.', play: { bpm: 60, steps: [[60, 64, 67], [60, 65, 69], [60, 64, 67], [59, 62, 65, 67], [60, 64, 67]].map((m, i) => ({ midis: m, beats: i === 4 ? 4 : 2 })) } },
      ],
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'conte "toca, pé"',
      body: 'Diga em voz alta "toca" no ataque e "pé" logo depois. Comece bem devagar, a 50 BPM. Se o app acusar troca antecipada, você está trocando no "toca": espere o som do acorde novo antes de mexer o pé.',
    },
    { kind: 'exercise', id: 'l30-drill', exercise: quickTimed('Drill do pedal legato', 'I–IV–I–V7–I na mão direita, mínimas a 56 BPM, pedal legato. Três passadas boas seguidas.', () => melodyTask(PEDAL_DRILL, { bpm: 56 }), { reps: 3, pedal: 'legato' }) },
    { kind: 'exercise', id: 'l30-canone', exercise: quickTimed('O baixo do Cânone com pedal', 'Mão esquerda: Ré, Lá, Si, Fá♯, Sol, Ré, Sol, Lá em mínimas, a 60 BPM, trocando o pedal a cada nota. Duas passadas boas.', () => melodyTask(`${CANON_BASS} | D3:4`, { bpm: 60, clef: 'bass', fifths: 2 }), { reps: 2, pedal: 'legato' }) },
    { kind: 'exercise', id: 'l30-quiz', exercise: quiz('Pedal legato', 'Quatro perguntas rápidas.', PEDAL_L, 0.75) },
  ],
  review: [choice(PEDAL_L, 'pedal-legato'), chordsRandom],
  checkpoint: [
    quickTimed('Pedal legato', 'O drill a 60 BPM, sem dicas. Meta: 85% das trocas depois do ataque e nenhuma antecipada.', () => melodyTask(PEDAL_DRILL, { bpm: 60 }), { pedal: 'legato' }),
  ],
  exit: [choice(PEDAL_L, 'pedal-legato'), degreeNamesD],
};

const unit: Unit = {
  n: 4,
  id: 'u04',
  title: 'Escala maior e armaduras',
  goal: 'Construir e tocar escalas maiores com passagem do polegar, ler armaduras, usar o pedal legato e tocar a forma do blues.',
  technique: 'Escalas maiores de Dó, Sol, Ré, Fá e Si♭, uma oitava, mãos separadas e depois juntas em movimento contrário, em colcheias de 45 rumo a 80 BPM, com variação abaixo de 40 ms (referência: RCM Level 1). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l25, l26, l27, l28, l29, l30],
  songs: [canon, odeDotted, syncopated],
  final: {
    songId: 'u04-canone',
    brief: 'O Cânone em Ré de Pachelbel, simplificado: a mão esquerda repete o baixo de 8 notas (Ré, Lá, Si, Fá♯, Sol, Ré, Sol, Lá) e a direita toca três das variações que se empilham sobre ele. Junta a armadura de 2 sustenidos (Fá♯ e Dó♯), o pedal legato (troque a cada mínima, logo depois do baixo) e a leitura em duas claves.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [tetra, scalesWhite, scalesAll, sigs12, readG, readF, degreeNames, degreeNamesD, chordsRandom, ear16];
