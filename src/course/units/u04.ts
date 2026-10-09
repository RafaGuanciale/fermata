// Unidade 4 — Escala maior, armaduras e pedal legato (lições 25 a 33). Projeto final: Cânone em Ré (Pachelbel), simplificado.
// A lição 33 é o Marco 1: checkpoint das unidades 1 a 4 e mini-recital.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { buildScale, choice, keyFromSignature, readNote, type ChoiceQuestion } from '../gens';
import { pick } from '../music';
import { melodyTask, sci } from '../tasks';
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

const unit: Unit = {
  n: 4,
  id: 'u04',
  title: 'Escala maior e armaduras',
  goal: 'Construir e tocar escalas maiores com passagem do polegar, ler armaduras, usar o pedal legato e tocar a forma do blues.',
  technique: 'Escalas maiores de Dó, Sol, Ré, Fá e Si♭, uma oitava, mãos separadas e depois juntas em movimento contrário, em colcheias de 45 rumo a 80 BPM, com variação abaixo de 40 ms (referência: RCM Level 1). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l25, l26, l27],
  songs: [canon],
  final: {
    songId: 'u04-canone',
    brief: 'O Cânone em Ré de Pachelbel, simplificado: a mão esquerda repete o baixo de 8 notas (Ré, Lá, Si, Fá♯, Sol, Ré, Sol, Lá) e a direita toca três das variações que se empilham sobre ele. Junta a armadura de 2 sustenidos (Fá♯ e Dó♯), o pedal legato (troque a cada mínima, logo depois do baixo) e a leitura em duas claves.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [tetra, scalesWhite, scalesAll, sigs12, readG, readF];
