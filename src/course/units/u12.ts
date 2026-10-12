// Unidade 12 — Arranjo, forma e repertório (lições 90 a 100). Projeto final: Valsa lenta (original, no estilo de Satie).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { chordLabel, chordSequence, chordSpelling, choice, chromaticByEar, diatonicByEar, echo, keyName, mix, parseChord, playChord, type ChoiceQuestion } from '../gens';
import { n, pick, ptName, shuffle } from '../music';
import { melodyTask, sci, transposedTask, twoHandTask } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, Listen, Rng, SongSpec, TimedTask, Unit } from '../types';

// ---------- escrita ----------

const quickTimed = (title: string, how: string, gen: (rng: Rng) => TimedTask, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

const items = (title: string, how: string, gen: ItemGen, count: number, low: Midi, high: Midi, accuracy = 0.85, labels: 'on' | 'fade' | 'off' = 'fade', avgMs?: number): Exercise => ({
  kind: 'items', title, how, gen, count, low, high, labels, pass: avgMs ? { accuracy, avgMs } : { accuracy },
});

// ---------- forma de ouvido ----------

type Section = 'A' | 'B' | 'C';
/** Frases de 8 tempos: A em Dó, B sobre Fá (contraste), C em Lá menor. */
const PHRASE: Record<Section, [Midi, number][]> = {
  A: [[60, 1], [64, 1], [67, 1], [64, 1], [62, 2], [60, 2]],
  B: [[65, 1], [69, 1], [72, 1], [69, 1], [67, 2], [67, 2]],
  C: [[69, 1], [72, 1], [76, 1], [72, 1], [71, 2], [69, 2]],
};
const FORMS: { label: string; plan: Section[] }[] = [
  { label: 'Binária (AABB)', plan: ['A', 'A', 'B', 'B'] },
  { label: 'Ternária (ABA)', plan: ['A', 'B', 'A'] },
  { label: 'Rondó (ABACA)', plan: ['A', 'B', 'A', 'C', 'A'] },
  { label: 'Canção (AABA)', plan: ['A', 'A', 'B', 'A'] },
];

/** O app toca frases curtas numa forma; você diz qual é. */
function formByEar(): ItemGen {
  return (rng) => {
    const which = Math.floor(rng() * FORMS.length);
    const f = FORMS[which];
    const order = shuffle(rng, FORMS.map((_, i) => i));
    const steps: Listen['steps'] = f.plan.flatMap((s) => [...PHRASE[s].map(([m, b]) => ({ midis: [m], beats: b })), { midis: [], beats: 1 }]);
    return {
      prompt: 'Ouça as frases: que forma é esta?',
      detail: `${f.plan.length} frases de 2 compassos. Marque com letras: frase igual, letra igual.`,
      listen: { bpm: 132, steps },
      choices: order.map((i) => FORMS[i].label),
      answer: order.indexOf(which),
      hint: `Foi ${f.plan.join(' ')}: ${f.label}.`,
      steps: [],
      skill: 'forma-ouvido',
    };
  };
}

// ---------- escalas e arpejos mãos juntas ----------

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const SCALE_KEYS: { key: string; rh: Midi; fifths: number }[] = [
  { key: 'C', rh: 60, fifths: 0 }, { key: 'G', rh: 55, fifths: 1 }, { key: 'D', rh: 62, fifths: 2 }, { key: 'F', rh: 53, fifths: -1 },
];

/** Escala maior de 2 oitavas, mãos juntas (esquerda uma oitava abaixo), em semicolcheias: sobe 15 notas e desce até a tônica. */
function scale16(rng: Rng, bpm: number): TimedTask {
  const k = pick(rng, SCALE_KEYS);
  const up = Array.from({ length: 15 }, (_, i) => k.rh + 12 * Math.floor(i / 7) + MAJOR[i % 7]);
  const notes = [...up, ...up.slice(0, -1).reverse()];
  const line = (shift: number) => {
    const ms = notes.map((m) => m + shift);
    const b1 = ms.slice(0, 16).map((m) => `${sci(m)}:0.25`).join(' ');
    const b2 = ms.slice(16, 28).map((m) => `${sci(m)}:0.25`).join(' ');
    return `${b1} | ${b2} ${sci(ms[28])}:1`;
  };
  return twoHandTask(line(0), line(-12), { bpm, fifths: k.fifths, caption: `${keyName(k.key)} maior, 2 oitavas, mãos juntas em semicolcheias. A esquerda toca uma oitava abaixo.` });
}

/** Arpejo maior de 2 oitavas mãos juntas, em colcheias (sobe 7 notas, desce até a tônica). */
function arp8(rng: Rng, bpm: number): TimedTask {
  const k = pick(rng, SCALE_KEYS);
  const up = [0, 4, 7, 12, 16, 19, 24].map((x) => k.rh + x);
  const notes = [...up, ...up.slice(0, -1).reverse()];
  const line = (shift: number) => {
    const ms = notes.map((m) => m + shift);
    return `${ms.slice(0, 8).map((m) => `${sci(m)}:0.5`).join(' ')} | ${ms.slice(8, 12).map((m) => `${sci(m)}:0.5`).join(' ')} ${sci(ms[12])}:2`;
  };
  return twoHandTask(line(0), line(-12), { bpm, fifths: k.fifths, caption: `Arpejo de ${keyName(k.key)} maior, 2 oitavas, mãos juntas em colcheias.` });
}

// ---------- músicas ----------

// Ode à Alegria (Beethoven, 9ª Sinfonia, 1824; domínio público). Arranjo solo do Fermata: melodia no topo da direita,
// uma nota do acorde por baixo nos tempos fortes e décimas na esquerda.
const ODE_R = [
  'C5+E5 E5 F5 G5', 'B4+G5 F5 E5 D5', 'G4+C5 C5 D5 E5', 'B4+E5:1.5 D5:0.5 G4+D5:2',
  'C5+E5 E5 F5 G5', 'B4+G5 F5 E5 D5', 'G4+C5 C5 D5 E5', 'B4+D5:1.5 C5:0.5 E4+C5:2',
  'B4+D5 D5 G4+E5 C5', 'B4+D5 E5:0.5 F5:0.5 G4+E5 C5', 'B4+D5 E5:0.5 F5:0.5 E5 B4+D5', 'E4+C5 D5 D4+G4:2',
  'C5+E5 E5 F5 G5', 'B4+G5 F5 E5 D5', 'G4+C5 C5 D5 E5', 'B4+D5:1.5 C5:0.5 E4+C5:2',
];
const T_C = 'C2+E3';
const T_G = 'G2+B3';
const ODE_L = [
  `${T_C}:4`, `${T_G}:4`, `${T_C}:4`, `${T_G}:4`, `${T_C}:4`, `${T_G}:4`, `${T_C}:4`, `${T_G}:2 ${T_C}:2`,
  `${T_G}:2 ${T_C}:2`, `${T_G}:2 ${T_C}:2`, `${T_G}:4`, `${T_C}:2 ${T_G}:2`, `${T_C}:4`, `${T_G}:4`, `${T_C}:4`, `${T_G}:2 ${T_C}:2`,
];

const odeArr: SongSpec = {
  id: 'u12-ode-solo',
  title: 'Ode à Alegria, arranjo solo',
  composer: 'Ludwig van Beethoven',
  arrangement: 'arranjo do Fermata: melodia uma oitava acima, no topo da direita, com uma nota do acorde por baixo nos tempos fortes; esquerda em décimas (Dó–Mi, Sol–Si)',
  bpm: 84,
  beatsPerBar: 4,
  fifths: 0,
  right: ODE_R.join(' | '),
  left: ODE_L.join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Prelúdio em Mi menor: original do Fermata no estilo romântico. Melodia longa na direita; acordes repetidos em colcheias
// na esquerda, descendo por cromatismo.
const PREL_LH = ['G3+B3+E4', 'F#3+A3+D#4', 'G3+B3+D4', 'G3+B3+C#4', 'G3+B3+C4', 'A3+C4+E4', 'F#3+A3+D#4'];
const PREL_R = ['B4:3 C5', 'B4:4', 'B4:2 A4 G4', 'A4:3 B4', 'C5:2 B4 A4', 'E5:2 C5:2', 'D#5:2 C5 A4', 'G4:4'];
const preludio: SongSpec = {
  id: 'u12-preludio',
  title: 'Prelúdio em Mi menor',
  composer: 'Fermata (original, no estilo romântico)',
  arrangement: 'peça original: melodia cantada na direita sobre acordes repetidos em colcheias na esquerda, que descem por meio tom (Em, B7/D♯, Em7, C♯ø, C7M, Am, B7, Em)',
  bpm: 50,
  beatsPerBar: 4,
  fifths: 1,
  right: PREL_R.join(' | '),
  left: [...PREL_LH.map((c) => Array.from({ length: 8 }, () => `${c}:0.5`).join(' ')), 'G3+B3+E4:4'].join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Tema de jogo: original do Fermata, em Lá menor, com ostinato de colcheias na esquerda (Am – F – C – G).
const OST: Record<string, string> = {
  Am: 'A2 E3 A3 E3 A2 E3 A3 E3', F: 'F2 C3 F3 C3 F2 C3 F3 C3', C: 'C3 G3 C4 G3 C3 G3 C4 G3', G: 'G2 D3 G3 D3 G2 D3 G3 D3',
};
const ost = (c: string) => OST[c].split(' ').map((x) => `${x}:0.5`).join(' ');
const GAME_CHORDS = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G'];
const GAME_R = ['E5:2 C5 B4', 'A4:2 C5:2', 'G5:2 E5 D5', 'D5:4', 'E5 F5 G5:2', 'A5:2 F5:2', 'E5 D5 C5 B4', 'A4:4'];
const tema: SongSpec = {
  id: 'u12-tema-jogo',
  title: 'Tema de jogo',
  composer: 'Fermata (original)',
  arrangement: 'tema original em Lá menor: melodia na direita sobre um ostinato de colcheias na esquerda (fundamental, 5ª, oitava, 5ª), como nas trilhas de jogos e anime',
  bpm: 84,
  beatsPerBar: 4,
  fifths: 0,
  right: GAME_R.join(' | '),
  left: [...GAME_CHORDS.map(ost), 'A2+E3+A3:4'].join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Valsa lenta: original do Fermata no estilo de Erik Satie (as Gymnopédies, 1888). 3/4, esquerda com o baixo no 1 e o
// acorde no 2, alternando G7M e D7M; melodia lenta por cima, com o Dó♯ lídio sobre o Sol.
const VALSA_R = [
  'r:3', 'r:3', 'r:3', 'r:3',
  'r A5 F#5', 'E5 D5 A4', 'B4 D5 E5', 'F#5:3',
  'r A5 F#5', 'E5 D5 B4', 'C#5 B4 A4', 'A4:3',
  'r B4 C#5', 'D5:2 E5', 'F#5 E5 C#5', 'D5:3',
];
const VALSA_L = VALSA_R.map((_, i) => (i % 2 === 0 ? 'G2 B3+D4+F#4:2' : 'D2 A3+C#4+F#4:2'));
const valsa: SongSpec = {
  id: 'u12-valsa-lenta',
  title: 'Valsa lenta',
  composer: 'Fermata (original, no estilo de Erik Satie)',
  arrangement: 'peça original em 3/4: baixo no tempo 1 e acorde no tempo 2 na esquerda (G7M e D7M, como nas Gymnopédies), melodia lenta na direita; pedal a cada compasso',
  bpm: 66,
  beatsPerBar: 3,
  fifths: 2,
  right: VALSA_R.join(' | '),
  left: VALSA_L.join(' | '),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// ---------- geradores reaproveitados ----------

const formEar = formByEar();
const SECTIONS = [
  { name: 'Verso: vi–IV–I–V em Dó.', symbols: ['Am', 'F', 'C', 'G'] },
  { name: 'Pré-refrão: ii–IV–V em Dó.', symbols: ['Dm', 'F', 'G'] },
  { name: 'Refrão: I–V–vi–IV em Dó.', symbols: ['C', 'G', 'Am', 'F'] },
  { name: 'Ponte: IV–V–iii–vi em Dó.', symbols: ['F', 'G', 'Em', 'Am'] },
  { name: 'Verso: vi–IV–I–V em Sol.', symbols: ['Em', 'C', 'G', 'D'] },
  { name: 'Refrão: I–V–vi–IV em Sol.', symbols: ['G', 'D', 'Em', 'C'] },
  { name: 'Ponte: IV–V–iii–vi em Sol.', symbols: ['C', 'D', 'Bm', 'Em'] },
];
const sections = chordSequence({ sequences: SECTIONS });
const turnaround = chordSequence({
  sequences: [
    { name: 'Turnaround I–vi–ii–V em Dó.', symbols: ['C7M', 'Am7', 'Dm7', 'G7'] },
    { name: 'Turnaround I–vi–ii–V em Fá.', symbols: ['F7M', 'Dm7', 'Gm7', 'C7'] },
    { name: 'Turnaround I–vi–ii–V em Sol.', symbols: ['G7M', 'Em7', 'Am7', 'D7'] },
    { name: 'Turnaround I–vi–ii–V em Si♭.', symbols: ['Bb7M', 'Gm7', 'Cm7', 'F7'] },
    { name: 'Turnaround com secundária, I–VI7–ii–V em Dó.', symbols: ['C7M', 'A7', 'Dm7', 'G7'] },
    { name: 'Turnaround com secundária, I–VI7–ii–V em Fá.', symbols: ['F7M', 'D7', 'Gm7', 'C7'] },
  ],
  lead: 2,
});
const modulation = chordSequence({
  sequences: [
    { name: 'Último refrão um tom acima: de Dó para Ré, pelo A7 (V7 de Ré).', symbols: ['C', 'G7', 'A7', 'D'] },
    { name: 'De Fá para Sol, pelo D7 (V7 de Sol).', symbols: ['F', 'C7', 'D7', 'G'] },
    { name: 'De Sol para Lá, pelo E7 (V7 de Lá).', symbols: ['G', 'D7', 'E7', 'A'] },
    { name: 'Meio tom acima: de Dó para Ré♭, pelo A♭7 (V7 de Ré♭).', symbols: ['C', 'G7', 'Ab7', 'Db'] },
  ],
});
const endings = playChord({ symbols: ['C6(9)', 'F6(9)', 'G6(9)', 'C7M(9)', 'F7M(9)', 'Bb6(9)'], low: 48, high: 84, omitFifth: true, skill: 'final' });

// ---------- perguntas ----------

const FORM_Q: ChoiceQuestion[] = [
  { q: 'Na canção pop, a parte que repete com a mesma letra é…', options: ['O refrão', 'O verso', 'A ponte'], answer: 0, why: 'O verso muda de letra a cada vez; o refrão repete letra e melodia.' },
  { q: 'O pré-refrão…', options: ['Prepara o refrão, quase sempre terminando no V', 'É a introdução', 'É o solo'], answer: 0, why: 'Ele cria tensão (muitas vezes parando no V) para o refrão chegar como resolução.' },
  { q: 'Forma binária é…', options: ['A e B, em geral cada parte repetida (AABB)', 'A, B e A de novo', 'A, B, A, C, A'], answer: 0, why: 'O Minueto em Sol da unidade 9 é binário: duas partes, cada uma com ritornelo.' },
  { q: 'Forma ternária é…', options: ['A, B e a volta do A', 'Três partes diferentes', 'Uma parte repetida três vezes'], answer: 0, why: 'ABA: o contraste no meio faz a volta do A soar como chegada.' },
  { q: 'O rondó alterna…', options: ['Um refrão (A) com episódios diferentes: ABACA', 'Duas partes iguais', 'Só variações do A'], answer: 0, why: 'O A volta sempre igual (ou quase); B e C são os episódios.' },
  { q: 'A ponte de uma canção…', options: ['Traz contraste antes da última volta do refrão ou do A', 'É sempre igual ao verso', 'Fica no fim da música'], answer: 0, why: 'Na AABA, a ponte é o B; na canção pop, aparece uma vez, perto do fim.' },
];

const ARR_Q: ChoiceQuestion[] = [
  { q: 'Num arranjo solo, a melodia fica…', options: ['Na nota mais aguda da direita', 'Na esquerda', 'No meio do acorde'], answer: 0, why: 'O ouvido segue a voz mais aguda. As notas do acorde ficam por baixo dela.' },
  { q: 'A décima na esquerda (Dó–Mi) é…', options: ['A 3ª uma oitava acima: fundamental e 3ª bem abertas', 'Duas oitavas', 'Uma 5ª'], answer: 0, why: '10ª = 3ª + 8ª: 16 semitons na 10ª maior. Soa cheia e não embola com a direita.' },
  { q: 'Se a mão não alcança a décima…', options: ['Toque 1 e 5 ou arpeje rápido de baixo para cima', 'Pule a esquerda', 'Toque só a 3ª'], answer: 0, why: 'Fundamental e 5ª, ou o arpejo, mantêm o grave. A fundamental é a nota que não pode faltar.' },
  { q: 'O turnaround I–vi–ii–V serve para…', options: ['Voltar ao começo ou ir para o final, mantendo o movimento', 'Mudar de tom', 'Terminar a música'], answer: 0, why: 'São quatro acordes que andam em quintas até o V, que pede o I de novo.' },
  { q: 'Para subir o último refrão um tom (de Dó para Ré), o acorde que prepara é…', options: ['A7, o V7 de Ré', 'G7', 'D7'], answer: 0, why: 'O V7 do tom novo avisa o ouvido. Depois, tudo um tom acima.' },
  { q: 'Um final "tag" é…', options: ['Repetir o último ii–V (ou a última frase) duas ou três vezes antes de resolver', 'Parar no V', 'Tocar a introdução de novo'], answer: 0, why: 'A repetição avisa que a música está acabando; a resolução final chega com mais peso.' },
];

// ---------- lições ----------

const l90: Lesson = {
  n: 90,
  id: 'l90',
  title: 'Forma',
  minutes: 60,
  objectives: [
    'Consigo nomear as partes de uma canção (intro, verso, pré-refrão, refrão, ponte) e as formas AABA, binária, ternária e rondó.',
    'Consigo reconhecer de ouvido a forma de uma sequência de frases.',
    'Consigo tocar a progressão típica de cada seção em Dó e em Sol.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'As partes de uma canção',
      body: `Uma canção popular é feita de **seções** que se repetem. Saber o nome delas ajuda a ler, a decorar e a arranjar:

- **Intro**: o começo instrumental, quase sempre com a harmonia do verso ou do refrão.
- **Verso**: a história. A melodia repete, a letra muda a cada vez.
- **Pré-refrão**: a rampa. Cria tensão e costuma parar no **V**.
- **Refrão**: o "gancho". Melodia e letra repetem; é a parte que todo mundo canta.
- **Ponte**: o contraste, uma vez só, perto do fim, antes do último refrão.
- **Final** (*outro*): a saída, muitas vezes o refrão repetido ou a intro de volta.

Na canção de 32 compassos da lição 87, a ponte é o **B** da forma **AABA**.`,
    },
    {
      kind: 'text',
      title: 'As formas da música clássica',
      body: `Na música clássica a mesma ideia ganha nomes de letras:

- **Binária (AB)**: duas partes, cada uma repetida (AABB). A primeira costuma ir para o V (ou para a relativa maior) e a segunda volta para o I. O Minueto em Sol da unidade 9 é binário.
- **Ternária (ABA)**: uma parte, um contraste e a volta da primeira. Muitas peças românticas curtas são assim.
- **Rondó (ABACA)**: um refrão (A) que volta sempre, entre episódios diferentes (B, C).

Para reconhecer de ouvido, **marque com letras**: frase igual, letra igual; frase nova, letra nova. Depois procure o desenho: o A volta? quantas vezes? há uma segunda ideia nova?`,
    },
    {
      kind: 'example',
      title: 'Três frases para guardar',
      steps: [
        { say: 'Frase **A**, em Dó: sobe pelo acorde e volta ao Dó.', play: { bpm: 132, steps: PHRASE.A.map(([m, b]) => ({ midis: [m], beats: b })) } },
        { say: 'Frase **B**: o mesmo desenho começando no Fá. É o contraste.', play: { bpm: 132, steps: PHRASE.B.map(([m, b]) => ({ midis: [m], beats: b })) } },
        { say: 'Uma forma **ABA**: A, contraste, A de novo.', play: { bpm: 132, steps: (['A', 'B', 'A'] as Section[]).flatMap((s) => [...PHRASE[s].map(([m, b]) => ({ midis: [m], beats: b })), { midis: [], beats: 1 }]) } },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'confundir verso e refrão',
      body: 'O que define o refrão não é ser a parte mais animada: é **repetir a letra**. Se a melodia volta com outra letra, é verso. Na dúvida, escute a segunda vez que a seção aparece.',
    },
    { kind: 'exercise', id: 'l90-ouvido', exercise: items('Que forma é esta?', 'O app toca frases de 2 compassos. Marque com letras e escolha a forma.', formEar, 8, 48, 84, 0.75, 'off') },
    {
      kind: 'text',
      title: 'Cada seção tem a sua progressão',
      body: `As seções também se distinguem pela harmonia. Um padrão muito comum no pop:

- **Verso**: começa fora da tônica, no **vi** (vi–IV–I–V), para guardar a chegada no I para o refrão.
- **Pré-refrão**: **ii–IV–V**, parando no V.
- **Refrão**: começa no **I** (I–V–vi–IV), a sensação de chegar em casa.
- **Ponte**: **IV–V–iii–vi**, que evita o I e prepara o último refrão.

Tocar a progressão de cada seção, em dois tons, treina o ouvido a "ver" a forma.`,
    },
    { kind: 'exercise', id: 'l90-secoes', exercise: items('Progressões das seções', 'O app pede a progressão de uma seção, em Dó ou em Sol. Toque os acordes em ordem, em qualquer posição.', sections, 8, 48, 84, 0.85, 'fade') },
    { kind: 'exercise', id: 'l90-quiz', exercise: quiz('Forma', 'Responda sem tocar.', FORM_Q) },
  ],
  review: [formEar, sections, choice(FORM_Q, 'forma')],
  checkpoint: [
    items('Forma de ouvido', '8 sequências, sem dica. Meta: 7 de 8.', formEar, 8, 48, 84, 0.85, 'off'),
    items('Progressões das seções', '6 progressões, sem dica. Meta: 5 de 6.', sections, 6, 48, 84, 0.8, 'off'),
  ],
  exit: [formEar, choice(FORM_Q, 'forma')],
};

const l91: Lesson = {
  n: 91,
  id: 'l91',
  title: 'Arranjo solo I: a melodia no topo',
  minutes: 60,
  objectives: [
    'Consigo tocar a melodia na voz de cima da direita, com uma nota do acorde por baixo nos tempos fortes.',
    'Consigo tocar décimas (fundamental e 3ª uma oitava acima) na esquerda.',
    'Consigo tocar a Ode à Alegria em arranjo solo com 90% das notas e a direita acima da esquerda.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Melodia no topo',
      body: `Até aqui a direita fazia uma coisa só: ou a melodia, ou os acordes. No **arranjo solo**, ela faz as duas: a **melodia fica na nota mais aguda** e, por baixo dela, entram notas do acorde. O ouvido segue a voz de cima, então a melodia continua clara mesmo com o acorde embaixo.

A regra prática para começar:

- nos **tempos fortes** (1 e 3), ponha **uma nota do acorde por baixo** da melodia, uma 3ª ou uma 6ª abaixo;
- nos tempos fracos e nas notas de passagem, deixe a melodia sozinha;
- o polegar e o indicador fazem as notas de baixo; os dedos 4 e 5 ficam com a melodia.

Na Ode à Alegria, o primeiro Mi ganha um Dó embaixo (uma 3ª abaixo); o primeiro Sol do compasso 2 ganha um Si (uma 6ª abaixo).`,
    },
    {
      kind: 'text',
      title: 'Décimas na esquerda',
      body: `Com a direita ocupada, a esquerda precisa de um acompanhamento que soe cheio sem embolar. A **décima** resolve: é a **3ª uma oitava acima** (10ª = 3ª + 8ª). Fundamental embaixo, 3ª lá em cima: Dó2–Mi3 para o C, Sol2–Si3 para o G.

A décima é aberta, então não briga com as notas da direita, e tem as duas notas que dizem o acorde (a fundamental e a 3ª).

Se a sua mão não alcança (16 semitons), há duas saídas: **arpejar** rápido de baixo para cima, ou tocar **fundamental e 5ª** (Dó–Sol). O app mede o ataque no tempo; o arpejo muito lento conta como atrasado.`,
    },
    {
      kind: 'example',
      title: 'Os dois primeiros compassos',
      steps: [
        { say: 'Esquerda: **décima** de Dó (Dó2–Mi3).', play: { bpm: 80, steps: [{ midis: [n('C2'), n('E3')], beats: 2 }] }, keys: [n('C2'), n('E3')] },
        { say: 'Direita: Dó5 + **Mi5** no tempo 1 (a melodia em cima), depois Mi, Fá, Sol sozinhos.', play: { bpm: 80, steps: [{ midis: [n('C2'), n('E3'), n('C5'), n('E5')], beats: 1 }, { midis: [n('E5')], beats: 1 }, { midis: [n('F5')], beats: 1 }, { midis: [n('G5')], beats: 1 }] } },
        { say: 'Compasso 2: décima de Sol (Sol2–Si3) e Si4 + **Sol5** no tempo 1.', play: { bpm: 80, steps: [{ midis: [n('G2'), n('B3'), n('B4'), n('G5')], beats: 1 }, { midis: [n('F5')], beats: 1 }, { midis: [n('E5')], beats: 1 }, { midis: [n('D5')], beats: 1 }] } },
      ],
    },
    {
      kind: 'exercise',
      id: 'l91-decimas',
      exercise: quickTimed('Décimas', 'Só a esquerda: C | G | C | G e C, a 72 BPM. Ataque as duas notas juntas.', () => melodyTask(`${T_C}:4 | ${T_G}:4 | ${T_C}:4 | ${T_G}:2 ${T_C}:2`, { bpm: 72, clef: 'bass', caption: 'Décimas: Dó2–Mi3 e Sol2–Si3.' }), { reps: 2 }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'a nota de baixo mais forte que a melodia',
      body: 'O polegar é o dedo mais pesado, e a nota de baixo da direita tende a sair mais alta que a melodia. Pense em "pesar" o lado do 5º dedo: a melodia canta, a nota de baixo só acompanha. O app ainda não mede a diferença dentro da mesma mão; grave e escute.',
    },
    {
      kind: 'exercise',
      id: 'l91-frase',
      exercise: quickTimed('Primeira frase, mãos juntas', 'Compassos 1 a 4, a 72 BPM. A direita (melodia e nota de baixo) pelo menos um pouco acima da esquerda.', () => twoHandTask(ODE_R.slice(0, 4).join(' | '), ODE_L.slice(0, 4).join(' | '), { bpm: 72, caption: 'Esquerda em décimas: C | G | C | G.' }), { reps: 2, balance: 6 }),
    },
    {
      kind: 'text',
      title: 'Equilíbrio: a melodia por cima',
      body: `A tabela pede o **voicing**: o topo mais forte que o resto. O app mede uma parte disso: compara a força da **direita** com a da **esquerda**, compasso a compasso. Meta: a direita acima da esquerda em **80% dos compassos**.

Para chegar lá, toque a esquerda **piano** e com o peso do braço solto, e a direita **mezzo forte**. A décima grave soa muito: ela não precisa de força.`,
    },
    { kind: 'song', songId: 'u12-ode-solo', why: 'A música da lição: a Ode à Alegria com a melodia no topo e décimas na esquerda.' },
    { kind: 'exercise', id: 'l91-quiz', exercise: quiz('Arranjo solo', 'Responda sem tocar.', ARR_Q.slice(0, 3)) },
  ],
  review: [choice(ARR_Q.slice(0, 3), 'arranjo'), sections],
  checkpoint: [
    quickTimed('Ode à Alegria, arranjo solo', 'Os 16 compassos a 80 BPM, sem dicas. Meta: 90% das notas e a direita acima da esquerda em 80% dos compassos.', () => twoHandTask(ODE_R.join(' | '), ODE_L.join(' | '), { bpm: 80 }), { pass: { accuracy: 0.9 }, balance: 6 }),
  ],
  exit: [choice(ARR_Q.slice(0, 3), 'arranjo')],
};

const l92: Lesson = {
  n: 92,
  id: 'l92',
  title: 'Arranjo solo II: intro, turnaround e final',
  minutes: 60,
  objectives: [
    'Consigo tocar o turnaround I–vi–ii–V (e I–VI7–ii–V) conduzido em quatro tons.',
    'Consigo modular o último refrão um tom acima pelo V7 do tom novo.',
    'Consigo tocar uma melodia um tom acima lendo a original.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Intro e turnaround',
      body: `Um arranjo precisa de começo e de costuras. As duas ferramentas mais usadas:

- **Intro**: o jeito mais simples é tocar os **últimos 4 compassos** da música (o ouvinte ouve o fim e "quer" o começo), ou um **turnaround** repetido.
- **Turnaround**: **I–vi–ii–V** (em Dó: C7M – Am7 – Dm7 – G7). As fundamentais andam em quintas a partir do vi, e o V pede o I de novo: é o motor que "devolve" a música ao começo.

Uma variação com a unidade 10: trocar o vi pelo **VI7** (A7, o V7/ii). O Dó♯ dele puxa para o Dm7 e o turnaround fica mais forte.

Toque as tétrades conduzidas: notas comuns ficam, as outras andam o mínimo. O app aceita até 2 semitons a mais que o caminho mais curto.`,
    },
    { kind: 'exercise', id: 'l92-turnaround', exercise: items('Turnarounds em quatro tons', 'Quatro tétrades conduzidas, uma de cada nota; notas comuns ficam.', turnaround, 8, 48, 84, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'O último refrão um tom acima',
      body: `Um truque clássico de arranjo é **subir o último refrão** meio tom ou um tom. A música ganha energia sem mudar nada além da altura.

O jeito limpo é **preparar** com o **V7 do tom novo**: de Dó para Ré, o último acorde antes do refrão novo é **A7** (o V7 de Ré). O ouvido escuta o A7, espera o Ré, e o refrão chega um tom acima como resolução. Sem a preparação, a mudança soa como um tropeço (às vezes é o efeito desejado, como na modulação direta da lição 80).

Depois da preparação, **tudo** sobe junto: melodia, acordes, baixo. O exercício seguinte treina isso: você lê a melodia em Dó e toca em Ré.`,
    },
    { kind: 'exercise', id: 'l92-modula', exercise: items('Preparar o tom novo', 'Quatro acordes: o tom velho, o V7 dele, o V7 do tom novo e o tom novo. Qualquer posição.', modulation, 6, 48, 84, 0.85, 'fade') },
    {
      kind: 'exercise',
      id: 'l92-transpor',
      exercise: quickTimed('A frase um tom acima', 'A pauta mostra a Ode em Dó; toque em Ré maior (com Fá♯ e Dó♯), a 72 BPM.', () => transposedTask('E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2', 2, { bpm: 72, caption: 'Leia em Dó, toque um tom acima: Mi vira Fá♯, Fá vira Sol, Dó vira Ré.' }), { reps: 2 }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer a armadura nova',
      body: 'Subindo de Dó para Ré, o Fá e o Dó viram **Fá♯ e Dó♯** em toda a música, não só no primeiro acorde. Antes de tocar o refrão novo, diga em voz alta os acidentes do tom: Ré maior tem dois sustenidos.',
    },
    {
      kind: 'text',
      title: 'Finais',
      body: `Três finais que funcionam em quase toda canção:

1. **Tônica com tensão**: em vez de C, segure um **C6(9)** ou **C7M(9)**. Soa como final sem soar como hino.
2. **Tag**: repita o último ii–V (ou a última frase) **duas ou três vezes** antes de resolver. A repetição avisa que está acabando.
3. **Plagal com empréstimo**: **IV – iv – I** (F – Fm – C), o "amém" com o iv menor da unidade 10.

Desacelerar no fim (*ritardando*) vale para os três. O app não mede o ritardando; ele fica para a gravação.`,
    },
    { kind: 'exercise', id: 'l92-finais', exercise: items('Acordes de final', 'Toque o acorde da cifra. A 5ª pode ficar de fora.', endings, 8, 48, 84, 0.85, 'fade') },
    {
      kind: 'exercise',
      id: 'l92-compor',
      exercise: {
        kind: 'checklist',
        title: 'Intro, turnaround e final da Ode',
        how: 'Escreva e toque, para a Ode à Alegria em arranjo solo: uma intro, um turnaround que volte ao começo e um final. Grave.',
        items: ['A intro tem 4 compassos (os últimos 4 da música ou o turnaround duas vezes).', 'O turnaround (I–vi–ii–V ou I–VI7–ii–V) entra no compasso 16 e devolve a música ao começo.', 'A segunda vez sobe um tom, preparada pelo A7.', 'O final usa tônica com tensão, tag ou IV–iv–I.', 'A forma inteira tem começo, meio e fim claros na gravação.'],
      },
    },
    { kind: 'exercise', id: 'l92-quiz', exercise: quiz('Turnaround, modulação e finais', 'Responda sem tocar.', ARR_Q.slice(3)) },
  ],
  review: [turnaround, modulation, endings],
  checkpoint: [
    items('Turnarounds', '6 turnarounds conduzidos, sem dica. Meta: 5 de 6.', turnaround, 6, 48, 84, 0.8, 'off'),
    items('Modulação preparada', '6 sequências, sem dica. Meta: 5 de 6.', modulation, 6, 48, 84, 0.8, 'off'),
  ],
  exit: [turnaround, choice(ARR_Q.slice(3), 'arranjo')],
};

const TECH_Q: ChoiceQuestion[] = [
  { q: 'Quantas semicolcheias cabem num tempo de semínima?', options: ['4', '2', '3'], answer: 0, why: 'Semicolcheia = 1/4 de tempo. Conte "1 e a e".' },
  { q: 'O dedilhado de Dó maior em 2 oitavas na direita é…', options: ['1-2-3-1-2-3-4-1-2-3-1-2-3-4-5', '1-2-3-4-1-2-3-1-2-3-4-1-2-3-4', '1-2-3-1-2-3-1-2-3-1-2-3-1-2-3'], answer: 0, why: 'Duas vezes 1-2-3 + 1-2-3-4, e o 5 só na última nota.' },
  { q: 'Em Fá maior, na direita, o 4º dedo cai…', options: ['No Si♭', 'No Fá', 'No Dó'], answer: 0, why: 'Fá maior: 1-2-3-4 (Fá, Sol, Lá, Si♭), depois o polegar no Dó.' },
  { q: 'A meta de uniformidade da lição (IOI-SD) é…', options: ['Abaixo de 25 ms', 'Abaixo de 100 ms', 'Exatamente 0 ms'], answer: 0, why: 'É o nível intermediário do PLANO: perto do limite em que o ouvido percebe a nota fora do lugar.' },
  { q: 'No platô (o andamento não sobe), o que ajuda?', options: ['Variantes rítmicas: pontuado longo-curto e curto-longo, rajadas de 4 notas', 'Tocar mais forte', 'Estudar só no andamento máximo'], answer: 0, why: 'Mudar o ritmo obriga a mão a organizar os movimentos; depois, o reto sai mais igual.' },
];

const PEDAL_Q: ChoiceQuestion[] = [
  { q: 'O meio pedal é…', options: ['Abaixar o pedal só em parte, para segurar menos ressonância', 'Usar o pedal da esquerda', 'Trocar o pedal duas vezes'], answer: 0, why: 'Os abafadores encostam de leve nas cordas. Só funciona se o piano mandar o pedal em valores contínuos.' },
  { q: 'O "flutter" (pedal tremido) serve para…', options: ['Limpar um pouco o som sem cortar tudo', 'Tocar mais alto', 'Afinar o piano'], answer: 0, why: 'Trocas rápidas e curtas tiram parte da lama e deixam o baixo soando.' },
  { q: 'Una corda é…', options: ['O pedal da esquerda: som mais suave e velado', 'O pedal do meio', 'Tocar uma nota só'], answer: 0, why: 'No piano acústico, os martelos se deslocam e batem em menos cordas.' },
  { q: 'No pedal legato, o pedal sobe…', options: ['Logo depois do ataque do acorde novo, e desce em seguida', 'Antes do acorde novo', 'Só no fim da música'], answer: 0, why: 'Subir antes deixa um buraco; subir muito depois mistura as harmonias.' },
  { q: 'Num arpejo com o baixo na esquerda, o pedal troca…', options: ['Quando muda a harmonia (no baixo novo)', 'A cada nota do arpejo', 'Nunca'], answer: 0, why: 'O pedal segura o acorde inteiro; ele troca com a harmonia, não com cada nota.' },
];

const ROMANTIC_Q: ChoiceQuestion[] = [
  { q: 'Rubato é…', options: ['Esticar e devolver o tempo, com a pulsação de fundo preservada', 'Tocar sempre mais devagar', 'Tocar sem metrônomo e sem pulso'], answer: 0, why: '"Tempo roubado": o que se atrasa num lugar se recupera em outro. A esquerda fica mais estável que a direita.' },
  { q: 'Voicing de melodia interna é…', options: ['Fazer soar mais a nota do meio do acorde, quando ela é a melodia', 'Tocar só a nota de cima', 'Tocar o acorde arpejado'], answer: 0, why: 'O peso vai para o dedo que tem a melodia; os outros tocam mais leves.' },
  { q: 'A escala de tons inteiros tem…', options: ['6 notas, todas a um tom de distância', '7 notas com um semitom', '5 notas'], answer: 0, why: 'Dó, Ré, Mi, Fá♯, Sol♯, Lá♯ (Si♭). Sem semitons, ela não tem centro forte: soa como sonho.' },
  { q: 'Acordes paralelos, no impressionismo, são…', options: ['O mesmo tipo de acorde deslizando junto, sem condução', 'Acordes com 5ªs proibidas no coral', 'Acordes de uma nota só'], answer: 0, why: 'Debussy usava a "regra proibida" de propósito, como cor.' },
  { q: 'O Prelúdio Op. 28 nº 4 de Chopin e a Gnossienne nº 1 de Satie…', options: ['São de domínio público e ficam como próximos passos com partitura', 'São protegidos', 'Não existem para piano'], answer: 0, why: 'Chopin morreu em 1849 e Satie em 1925. O app usa um prelúdio original no lugar até entrar a partitura.' },
];

/** Escala de tons inteiros a partir de uma tônica: 6 notas e a oitava. */
function wholeTone(opts: { tonics: Midi[] }): ItemGen {
  return (rng) => {
    const t = pick(rng, opts.tonics);
    const ms = [0, 2, 4, 6, 8, 10, 12].map((x) => t + x);
    return {
      prompt: `Toque a escala de tons inteiros a partir de ${PT[t % 12]}, subindo`,
      detail: 'Seis notas, todas a um tom de distância, e a oitava.',
      hintKeys: ms,
      hint: ms.map((m) => PT[m % 12]).join(', '),
      steps: ms.map((m) => ({ kind: 'exact', midis: [m] }) as const),
      skill: 'tons-inteiros',
    };
  };
}
const PT = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
const wholeToneGen = wholeTone({ tonics: [60, 62, 61, 65] });
const parallel = chordSequence({
  sequences: [
    { name: 'Tríades maiores paralelas, subindo um tom.', symbols: ['C', 'D', 'E', 'D', 'C'] },
    { name: 'Tétrades 7M paralelas, descendo.', symbols: ['E7M', 'D7M', 'C7M'] },
    { name: 'Tríades paralelas em tons inteiros.', symbols: ['F', 'G', 'A', 'B'] },
  ],
});
const sevenths = playChord({ symbols: ['C7M', 'Dm7', 'G7', 'Am7', 'F7M', 'Bm7(b5)', 'Eb7M', 'Ab7', 'F#m7', 'B7', 'Bbm7', 'Db7M', 'E7', 'Gm7'], low: 48, high: 84, skill: 'tetrade-rapida' });

/** Arpejo na direita sobre o baixo na esquerda (um por compasso), para o pedal legato. */
function pedalArp(bpm: number): () => TimedTask {
  const bars: [string, string][] = [
    ['C4 E4 G4 C5 G4 E4 C4 E4', 'C2:4'], ['A3 C4 E4 A4 E4 C4 A3 C4', 'A2:4'], ['A3 C4 F4 A4 F4 C4 A3 C4', 'F2:4'], ['B3 D4 F4 G4 F4 D4 B3 D4', 'G2:4'],
    ['C4 E4 G4 C5 G4 E4 C4 E4', 'C2:4'], ['C4 F4 A4 C5 A4 F4 C4 F4', 'F2:4'], ['B3 D4 G4 B4 G4 D4 B3 D4', 'G2:4'], ['C4 E4 G4 C5 r:2', 'C2:4'],
  ];
  const r = bars.map(([x]) => x.split(' ').map((t) => (t.includes(':') ? t : `${t}:0.5`)).join(' ')).join(' | ');
  return () => twoHandTask(r, bars.map(([, l]) => l).join(' | '), { bpm, caption: 'C | Am | F | G7 | C | F | G | C. Arpejo em colcheias na direita; troque o pedal a cada baixo novo.' });
}

const l93: Lesson = {
  n: 93,
  id: 'l93',
  title: 'Técnica intermediária',
  minutes: 60,
  objectives: [
    'Consigo tocar escalas maiores de 2 oitavas mãos juntas em semicolcheias a 50 BPM, com variação abaixo de 25 ms.',
    'Consigo tocar arpejos maiores de 2 oitavas mãos juntas em colcheias.',
    'Consigo montar tétrades em qualquer tom em menos de 3 s.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Semicolcheias',
      body: `A **semicolcheia** vale um quarto de tempo: quatro cabem numa semínima. Na pauta ela tem **duas bandeirolas** (ou duas barras ligando o grupo). Conte "**1** e a e **2** e a e".

A 50 BPM em semicolcheias você toca 200 notas por minuto, mais de 3 por segundo. Parece pouco, mas com as duas mãos, 2 oitavas e passagens de polegar em lugares diferentes em cada mão, é o primeiro andamento "de verdade" das escalas.

A meta do PLANO para o nível intermediário é a **uniformidade**: a variação entre as notas (IOI-SD) abaixo de **25 ms**, perto do limite em que o ouvido percebe uma nota fora do lugar.`,
    },
    {
      kind: 'text',
      title: 'Dedilhados de 2 oitavas',
      body: `Dó, Sol e Ré maior usam o mesmo dedilhado:

- **direita**: 1-2-3-1-2-3-4-1-2-3-1-2-3-4-**5** (o 5 só na nota mais aguda);
- **esquerda**: **5**-4-3-2-1-3-2-1-4-3-2-1-3-2-1 (o 5 só na nota mais grave).

Fá maior muda a direita, porque o polegar não pode cair no Si♭: **1-2-3-4**-1-2-3-**1-2-3-4**-1-2-3-4. A esquerda de Fá é a de Dó.

Mãos juntas, os polegares **não passam juntos**: em Dó, subindo, a direita passa no Fá e a esquerda no Sol. Treine devagar o ponto em que uma mão passa e a outra não. É ali que a escala desencontra.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'acentuar a passagem do polegar',
      body: 'O polegar é pesado e cai com força, e a nota depois dele sai atrasada. O resultado é um "galope" a cada passagem. Prepare o polegar antes (ele já viaja por baixo da mão durante as notas anteriores) e deixe ele cair leve, sem bater.',
    },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'velocidade sem tensão',
      body: 'Escalas rápidas cansam o antebraço. Faça séries de 3 a 5 minutos e alterne com outra coisa. Se o punho ou o antebraço doer, pare e baixe o andamento no dia seguinte: a escada sobe sozinha quando a mão está solta.',
    },
    { kind: 'exercise', id: 'l93-escalas', exercise: quickTimed('Escalas de 2 oitavas em semicolcheias', 'Mãos juntas, tom sorteado (Dó, Sol, Ré ou Fá). De 44 até 60 BPM; variação abaixo de 25 ms.', (rng) => scale16(rng, 44), { ladder: { from: 44, to: 60, step: 4 }, evenness: 25 }) },
    {
      kind: 'text',
      title: 'Platô: ritmos para destravar',
      body: `Quando o andamento para de subir, não insista no mesmo tempo. Fitch e outros professores sugerem **variantes rítmicas**:

- **pontuado** longo-curto, depois curto-longo;
- **rajadas**: quatro notas rápidas e uma parada, mudando o lugar da parada.

Cada variante obriga a mão a organizar um trecho diferente. Depois de duas ou três variantes, o ritmo reto sai mais igual. O metrônomo continua no mesmo andamento.`,
    },
    {
      kind: 'text',
      title: 'Arpejos mãos juntas',
      body: `O arpejo maior de 2 oitavas usa os dedos 1-2-3 da direita (1-2-3-1-2-3-**5** subindo, em Dó) e 5-4-2-1 da esquerda (**5**-4-2-1-4-2-1). O polegar passa por baixo do 3º dedo (direita) ou o 3º/4º dedo cruza por cima do polegar (esquerda), num salto maior que na escala.

Mantenha o **punho na altura** e deixe o braço levar a mão para o lado. Em colcheias, comece a 56 BPM.`,
    },
    { kind: 'exercise', id: 'l93-arpejos', exercise: quickTimed('Arpejos de 2 oitavas', 'Mãos juntas, colcheias, tom sorteado. De 56 até 72 BPM.', (rng) => arp8(rng, 56), { ladder: { from: 56, to: 72, step: 4 }, evenness: 30 }) },
    { kind: 'exercise', id: 'l93-tetrades', exercise: items('Acordes de 4 notas, rápido', '14 tétrades em tons variados. Média abaixo de 3 s.', sevenths, 14, 48, 84, 0.85, 'off', 3000) },
    { kind: 'exercise', id: 'l93-quiz', exercise: quiz('Técnica', 'Responda sem tocar.', TECH_Q) },
  ],
  review: [sevenths, choice(TECH_Q, 'tecnica')],
  checkpoint: [
    quickTimed('Escala a 50 BPM', 'Uma escala sorteada, mãos juntas, semicolcheias a 50 BPM. Meta: 85% das notas e variação abaixo de 25 ms.', (rng) => scale16(rng, 50), { evenness: 25 }),
    quickTimed('Arpejo a 60 BPM', 'Um arpejo sorteado, mãos juntas, colcheias a 60 BPM.', (rng) => arp8(rng, 60), { evenness: 30 }),
  ],
  exit: [sevenths, choice(TECH_Q, 'tecnica')],
};

const l94: Lesson = {
  n: 94,
  id: 'l94',
  title: 'Pedal avançado',
  minutes: 60,
  objectives: [
    'Consigo trocar o pedal legato em arpejos, a cada baixo novo, com 85% das trocas no alvo.',
    'Consigo explicar meio pedal, flutter e una corda e testar se o meu piano envia cada um.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Pedal em arpejos',
      body: `Na unidade 4 você aprendeu o **pedal legato**: o pedal sobe logo depois do acorde novo e desce de novo, sem buraco e sem misturar harmonias. Em acordes cheios, o ouvido aceita uma troca um pouco atrasada. Em **arpejos**, não: cada nota do arpejo é uma camada a mais de som, e um atraso de meio tempo mistura duas harmonias inteiras.

A regra: **o pedal troca com o baixo**, não com cada nota. Num arpejo sobre C | Am | F | G7, são quatro trocas, uma em cada baixo novo, no tempo 1. As notas do arpejo dentro do compasso ficam todas no mesmo pedal.

Ouça o fim de cada compasso: se o acorde novo chega "sujo", a troca atrasou; se há um instante seco, ela adiantou.`,
    },
    {
      kind: 'example',
      title: 'Arpejo com o baixo',
      steps: [
        { say: 'C: baixo Dó2 e o arpejo Dó–Mi–Sol–Dó na direita. O pedal segura tudo.', play: { bpm: 66, steps: [{ midis: [n('C2'), n('C4')], beats: 0.5 }, ...[n('E4'), n('G4'), n('C5'), n('G4'), n('E4'), n('C4'), n('E4')].map((m) => ({ midis: [m], beats: 0.5 }))] } },
        { say: 'Am: baixo novo, pedal troca **logo depois** do Lá2.', play: { bpm: 66, steps: [{ midis: [n('A2'), n('A3')], beats: 0.5 }, ...[n('C4'), n('E4'), n('A4'), n('E4'), n('C4'), n('A3'), n('C4')].map((m) => ({ midis: [m], beats: 0.5 }))] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'trocar o pedal junto com o baixo',
      body: 'Subir e descer o pedal **no mesmo instante** do baixo novo apaga o baixo: ele soa sem o pedal e morre. O pé sobe **depois** que o baixo soou (um piscar de olhos) e desce em seguida. Pé atrasado em relação à mão: é esse o movimento.',
    },
    { kind: 'exercise', id: 'l94-arpejo', exercise: quickTimed('Pedal legato no arpejo', 'Arpejo na direita, baixo na esquerda, a 60 BPM. Troque o pedal a cada baixo novo.', pedalArp(60), { pedal: 'legato', reps: 2 }) },
    {
      kind: 'text',
      title: 'Meio pedal, flutter e una corda',
      body: `Três recursos do repertório romântico e impressionista:

- **Meio pedal**: abaixar o pedal só em parte. Os abafadores encostam de leve nas cordas: os agudos se limpam e o baixo continua soando.
- **Flutter** (pedal tremido): trocas rápidas e curtas, que tiram parte da lama sem cortar o som. Útil em passagens cromáticas com pedal.
- **Una corda**: o pedal da **esquerda**. No piano acústico, os martelos batem em menos cordas, e o som fica mais suave e velado. É uma cor, não um "volume baixo".

No piano digital, cada um depende do que o instrumento envia: o pedal de sustentação em **valores contínuos** (de 0 a 127) permite meio pedal; o una corda chega como outro controle (CC67). O app ainda mede só o pedal de sustentação ligado ou desligado, então o meio pedal e o una corda ficam na escuta e na gravação.`,
    },
    {
      kind: 'exercise',
      id: 'l94-teste',
      exercise: {
        kind: 'checklist',
        title: 'O que o seu piano faz',
        how: 'Teste no seu piano, com o som dele (não o do app), e marque o que funciona.',
        items: ['Meio pedal: abaixando o pedal até a metade, o som fica mais curto que com o pedal inteiro.', 'Flutter: com trocas rápidas, o baixo continua soando e os agudos se limpam.', 'Una corda: o pedal da esquerda deixa o som mais suave (se o piano tiver o pedal).', 'Sei qual dos três vou usar no Prelúdio da próxima lição.'],
      },
    },
    { kind: 'exercise', id: 'l94-quiz', exercise: quiz('Pedal', 'Responda sem tocar.', PEDAL_Q) },
  ],
  review: [choice(PEDAL_Q, 'pedal')],
  checkpoint: [
    quickTimed('Pedal no arpejo', 'Os 8 compassos a 66 BPM, sem dicas. Meta: 85% das notas e das trocas de pedal no alvo.', pedalArp(66), { pedal: 'legato' }),
  ],
  exit: [choice(PEDAL_Q, 'pedal')],
};

const l95: Lesson = {
  n: 95,
  id: 'l95',
  title: 'Romântico e impressionista',
  minutes: 60,
  objectives: [
    'Consigo tocar o Prelúdio em Mi menor com a melodia acima dos acordes da esquerda e 95% das notas.',
    'Consigo explicar rubato, voicing de melodia interna e pedal como cor.',
    'Consigo tocar a escala de tons inteiros e acordes paralelos.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O piano romântico: cantar',
      body: `No século XIX o piano virou o instrumento que **canta**. Chopin pedia aos alunos que ouvissem cantores de ópera. Três ideias resumem o estilo:

- **Melodia acima de tudo**: a direita canta e a esquerda acompanha mais leve, mesmo quando toca acordes cheios.
- **Rubato**: o "tempo roubado". A melodia estica uma nota e recupera depois, enquanto a pulsação de fundo continua. A descrição clássica, atribuída a Chopin: a esquerda é o maestro, que segura o tempo; a direita é o cantor, que respira.
- **Pedal**: segura as harmonias e liga o que a mão não alcança.

O Prelúdio Op. 28 nº 4 de Chopin, em Mi menor, é o exemplo perfeito: uma melodia quase parada sobre acordes repetidos que descem por meio tom. Ele é de domínio público e fica como próximo passo com a partitura; aqui você toca um **prelúdio original** com a mesma textura.`,
    },
    {
      kind: 'text',
      title: 'O Prelúdio em Mi menor',
      body: `A esquerda toca **acordes de 3 notas em colcheias**, oito por compasso. A cada compasso uma nota desce meio tom: Em (Sol–Si–Mi), B7/Ré♯ (Fá♯–Lá–Ré♯), Em7 (Sol–Si–Ré), C♯ø (Sol–Si–Dó♯), C7M (Sol–Si–Dó)… É **condução de vozes** em câmera lenta, a da unidade 6.

A direita canta notas longas: Si, Dó, Si… A melodia quase não se move; quem dá o movimento é a harmonia por baixo.

Toque a esquerda **pianíssimo** e igual, como uma respiração. A direita fica por cima, sem força. O app mede o equilíbrio: a direita acima da esquerda em 80% dos compassos.`,
    },
    {
      kind: 'exercise',
      id: 'l95-esquerda',
      exercise: quickTimed('Os acordes da esquerda', 'Só a esquerda, compassos 1 a 4, a 50 BPM. Acordes iguais e leves.', () => melodyTask(PREL_LH.slice(0, 4).map((c) => Array.from({ length: 8 }, () => `${c}:0.5`).join(' ')).join(' | '), { bpm: 50, fifths: 1, caption: 'Em | B7/D♯ | Em7 | C♯ø: uma nota desce meio tom a cada compasso.' }), { reps: 2 }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'rubato sem pulso',
      body: 'Rubato não é tocar "do jeito que der". Se a esquerda também estica, a música perde o chão. Primeiro toque o Prelúdio **no metrônomo**, igual; só depois deixe a direita respirar, com a esquerda firme.',
    },
    {
      kind: 'exercise',
      id: 'l95-maos',
      exercise: quickTimed('Prelúdio, compassos 1 a 4', 'Mãos juntas, a 46 BPM. A melodia acima dos acordes.', () => twoHandTask(PREL_R.slice(0, 4).join(' | '), PREL_LH.slice(0, 4).map((c) => Array.from({ length: 8 }, () => `${c}:0.5`).join(' ')).join(' | '), { bpm: 46, fifths: 1, caption: 'Esquerda: acordes em colcheias, Em | B7/D♯ | Em7 | C♯ø.' }), { reps: 2, balance: 8 }),
    },
    { kind: 'song', songId: 'u12-preludio', why: 'A música da lição: melodia longa sobre acordes repetidos que descem por meio tom.' },
    {
      kind: 'text',
      title: 'Melodia interna',
      body: `Às vezes a melodia não está em cima: está **no meio** do acorde. Para ela aparecer, o dedo que a toca desce com mais velocidade, e os outros dedos da mesma mão tocam mais leves. É o **voicing**: escolher o peso de cada nota de um acorde.

Treine assim: toque o acorde Sol–Si–Mi na direita, fazendo o Si soar mais que os outros dois. Depois o Mi, depois o Sol. Grave e escute: a nota escolhida tem de sobressair. O app ainda não mede o peso dentro da mesma mão; a gravação é o juiz.`,
    },
    {
      kind: 'text',
      title: 'Impressionismo: o pedal como cor',
      body: `No fim do século XIX, Debussy e Ravel usaram o piano como pintura: em vez de linhas que conduzem, **manchas de cor**. Três recursos:

- **Escala de tons inteiros**: seis notas, todas a um tom (Dó, Ré, Mi, Fá♯, Sol♯, Lá♯). Sem semitons, sem sensível: nenhuma nota puxa para casa, e o som flutua.
- **Acordes paralelos**: o mesmo acorde deslizando junto (C, D, E), sem condução, de propósito. As 5ªs paralelas que o coral evita viram cor.
- **Pedal longo**: segurar o pedal sobre várias harmonias para misturá-las, como aquarela.

Satie (Gymnopédies, Gnossiennes) fica no meio do caminho: harmonias paradas, sem pressa de resolver. É o estilo do projeto final.`,
    },
    { kind: 'exercise', id: 'l95-tons', exercise: items('Escala de tons inteiros', 'Toque a escala de tons inteiros a partir da nota pedida, subindo.', wholeToneGen, 6, 48, 84, 0.85, 'fade') },
    { kind: 'exercise', id: 'l95-paralelos', exercise: items('Acordes paralelos', 'Toque os acordes em ordem, deslizando a mão inteira.', parallel, 4, 48, 84, 0.75, 'fade') },
    { kind: 'exercise', id: 'l95-quiz', exercise: quiz('Romântico e impressionista', 'Responda sem tocar.', ROMANTIC_Q) },
  ],
  review: [wholeToneGen, choice(ROMANTIC_Q, 'romantico')],
  checkpoint: [
    quickTimed('Prelúdio em Mi menor inteiro', 'Os 8 compassos, mãos juntas, a 50 BPM, sem dicas. Meta: 95% das notas e a melodia acima da esquerda.', () => twoHandTask(PREL_R.join(' | '), [...PREL_LH.map((c) => Array.from({ length: 8 }, () => `${c}:0.5`).join(' ')), 'G3+B3+E4:4'].join(' | '), { bpm: 50, fifths: 1 }), { pass: { accuracy: 0.95 }, balance: 8 }),
  ],
  exit: [wholeToneGen, choice(ROMANTIC_Q, 'romantico')],
};

// ---------- sonata, trilhas e improviso avançado ----------

const THEME1 = 'C5 E5 G5 E5 | F5 D5 B4 G4 | C5 E5 G5 C6 | B5:2 G5:2';
const THEME2_G = 'D5 B4 C5 A4 | B4 G4 A4 F#4 | G4 B4 D5 B4 | G4:4';
const CADENCE_C: Listen['steps'] = [
  { midis: [n('C3'), n('E4'), n('G4'), n('C5')], beats: 1 }, { midis: [n('F3'), n('F4'), n('A4'), n('C5')], beats: 1 },
  { midis: [n('G2'), n('F4'), n('G4'), n('B4')], beats: 1 }, { midis: [n('C3'), n('E4'), n('G4'), n('C5')], beats: 2 }, { midis: [], beats: 1 },
];

/** O app toca a cadência de Dó e o tema 2: em Sol (exposição) ou em Dó (recapitulação). */
function themeKeyByEar(): ItemGen {
  return (rng) => {
    const inC = rng() < 0.5;
    const notes = melodyTask(THEME2_G, { bpm: 100 }).events.map((e) => ({ midis: [(e.midi ?? 60) - (inC ? 7 : 0)], beats: e.beats }));
    const opts = ['No V, Sol maior (exposição)', 'No I, Dó maior (recapitulação)'];
    const order = shuffle(rng, [0, 1]);
    const which = inC ? 1 : 0;
    return {
      prompt: 'Depois da cadência em Dó, o tema 2 veio em que tom?',
      detail: 'Cante o Dó da cadência por dentro e veja se o tema termina nele.',
      listen: { bpm: 100, steps: [...CADENCE_C, ...notes] },
      choices: order.map((i) => opts[i]),
      answer: order.indexOf(which),
      hint: inC ? 'Terminou no Dó: o tema voltou no I, como na recapitulação.' : 'Terminou no Sol, com Fá♯: o tema estava no V, como na exposição.',
      steps: [],
      skill: 'sonata-ouvido',
    };
  };
}
const themeEar = themeKeyByEar();

const SONATA_Q: ChoiceQuestion[] = [
  { q: 'Na exposição de uma sonata em Dó maior, o tema 2 aparece em…', options: ['Sol maior (o V)', 'Dó maior', 'Lá menor'], answer: 0, why: 'A exposição cria um conflito de tons: tema 1 no I, tema 2 no V.' },
  { q: 'Na recapitulação, o tema 2 aparece em…', options: ['Dó maior (o I)', 'Sol maior', 'Fá maior'], answer: 0, why: 'A recapitulação resolve o conflito: tudo no I.' },
  { q: 'O desenvolvimento…', options: ['Fragmenta os temas, passa por vários tons e termina parado no V', 'Repete a exposição igual', 'Apresenta um tema novo no I'], answer: 0, why: 'É a parte instável; a nota longa no V prepara a volta do tema 1.' },
  { q: 'A transição (ponte) da exposição serve para…', options: ['Modular do I para o V', 'Terminar a peça', 'Repetir o tema 1'], answer: 0, why: 'Muitas vezes ela chega no V do novo tom (em Dó → Sol, o D7).' },
  { q: 'Numa sonata em menor (Lá menor), o tema 2 da exposição costuma vir em…', options: ['Dó maior, a relativa', 'Mi menor', 'Lá maior'], answer: 0, why: 'Em menor, o segundo tom é a relativa maior.' },
  { q: 'Sonatina é…', options: ['Uma sonata pequena, com desenvolvimento curto', 'Uma peça sem forma', 'Uma sonata para dois pianos'], answer: 0, why: 'As de Clementi (Op. 36) e Kuhlau são o primeiro contato com a forma.' },
];

const ROYAL = [
  { name: 'Royal Road em Dó: IV7M–V7–iii7–vi7.', symbols: ['F7M', 'G7', 'Em7', 'Am7'] },
  { name: 'Royal Road em Sol.', symbols: ['C7M', 'D7', 'Bm7', 'Em7'] },
  { name: 'Royal Road em Fá.', symbols: ['Bb7M', 'C7', 'Am7', 'Dm7'] },
  { name: 'Royal Road em Ré.', symbols: ['G7M', 'A7', 'F#m7', 'Bm7'] },
];
const royal = chordSequence({ sequences: ROYAL, lead: 2 });
const royalEar = diatonicByEar({ keys: ['C', 'G', 'F'], progressions: [['IV7M', 'V7', 'iii7', 'vi7'], ['IV7M', 'V7', 'I7M', 'vi7'], ['vi7', 'IV7M', 'V7', 'I7M']], answer: 'bass' });
const epicEar = chromaticByEar({ keys: ['C', 'D', 'F'], progressions: [['bVI', 'bVII', 'I'], ['I', 'bVII', 'IV', 'I'], ['vi', 'IV', 'bVI', 'bVII']], answer: 'bass' });
const lydianChords = chordSequence({
  sequences: [
    { name: 'O "voo" lídio em Dó: I – II/I (Ré maior sobre Dó).', symbols: ['C', 'D/C', 'C'] },
    { name: 'Em Fá: I – II/I (Sol maior sobre Fá).', symbols: ['F', 'G/F', 'F'] },
    { name: 'Em Sol: I – II/I (Lá maior sobre Sol).', symbols: ['G', 'A/G', 'G'] },
  ],
});
const GAME_MOTIFS = [
  [n('E5'), n('C5'), n('B4'), n('A4'), n('C5')], [n('G5'), n('E5'), n('D5'), n('D5')], [n('E5'), n('F5'), n('G5'), n('A5'), n('F5')],
  [n('A4'), n('C5'), n('E5'), n('D5'), n('C5'), n('B4')], [n('C5'), n('D5'), n('E5'), n('G5'), n('E5'), n('A4')], [n('E5'), n('D5'), n('C5'), n('B4'), n('A4')],
];
const melodyEar = echo({ motifs: GAME_MOTIFS, bpm: 96, skill: 'transcrever' });

const FILM_Q: ChoiceQuestion[] = [
  { q: 'A Royal Road (王道進行, muito usada em J-pop e anime) é…', options: ['IV7M – V7 – iii7 – vi7', 'I – V – vi – IV', 'ii – V – I'], answer: 0, why: 'Começa fora da tônica e termina no vi: sensação de saudade, sem resolver no I.' },
  { q: 'O ♭VI – ♭VII – I soa…', options: ['Épico, de vitória', 'Triste e parado', 'Como blues'], answer: 0, why: 'Dois acordes emprestados do menor sobem por tom até o I maior. Trilhas de aventura usam muito.' },
  { q: 'O "voo" lídio (I – II maior sobre o mesmo baixo) vem…', options: ['Da 4ª aumentada do lídio, a 3ª do acorde de II', 'Do V7', 'Da escala de blues'], answer: 0, why: 'Em Dó, o Ré maior traz o Fá♯: o som de fantasia das trilhas.' },
  { q: 'Um ostinato de esquerda é…', options: ['Um desenho curto repetido sob a melodia', 'Uma nota longa', 'Um acorde por música'], answer: 0, why: 'Estilo "Comptine" de Tiersen ou o arpejo do "Prelude" de Final Fantasy: a esquerda gira e a melodia flutua.' },
  { q: 'Para transcrever de ouvido, a primeira coisa a achar é…', options: ['A tônica', 'O andamento exato', 'O instrumento'], answer: 0, why: 'Os quatro passos da unidade 8: tônica, qualidade (maior/menor), campo harmônico e baixo.' },
];

/** Pilha de três 4ªs justas a partir de uma nota (o voicing quartal). */
function quartal(opts: { from: Midi[] }): ItemGen {
  return (rng) => {
    const b = pick(rng, opts.from);
    const ms = [b, b + 5, b + 10, b + 15];
    return {
      prompt: `Empilhe três 4ªs justas a partir de ${PT[b % 12]}`,
      detail: 'Quatro notas, cada uma uma 4ª justa (5 semitons) acima da anterior. A de baixo é a que o app pediu.',
      hintKeys: ms,
      hint: ms.map((m) => PT[m % 12]).join(', '),
      steps: [{ kind: 'chord', pcs: ms.map((m) => m % 12), bass: b % 12 }],
      skill: 'quartal',
    };
  };
}
const quartalGen = quartal({ from: [n('E3'), n('A3'), n('D3'), n('G3'), n('B3')] });

/** Upper structure: shell do dominante na esquerda (1-3-7) e uma tríade maior na direita (no II ou no ♭VI). */
function upperStructure(): ItemGen {
  // Fundamental, tríade no II e tríade no ♭VI, com a grafia certa.
  const SETS: [string, string, string][] = [['C', 'D', 'Ab'], ['F', 'G', 'Db'], ['G', 'A', 'Eb'], ['Bb', 'C', 'Gb'], ['D', 'E', 'Bb']];
  const pt = (x: string) => ptName(`${x}4`);
  return (rng) => {
    const [root, ii, bvi] = pick(rng, SETS);
    const kind = pick(rng, ['II', 'bVI'] as const);
    const top = kind === 'II' ? ii : bvi;
    const shell = chordSpelling(`${root}7`).filter((_, i) => i !== 2);
    const triad = chordSpelling(top);
    const pcs = [...new Set([...parseChord(`${root}7`).pcs.filter((_, i) => i !== 2), ...parseChord(top).pcs])];
    return {
      prompt: `Toque ${chordLabel(top)}/${chordLabel(root)}7`,
      detail: `Esquerda: o shell de ${chordLabel(root)}7 (fundamental, 3ª e 7ª). Direita: a tríade de ${pt(top)} maior. ${kind === 'II' ? 'Dá as tensões 9, ♯11 e 13.' : 'Dá as tensões ♭13 e ♯9.'}`,
      hint: `Esquerda: ${shell.map(pt).join(', ')}. Direita: ${triad.map(pt).join(', ')}.`,
      steps: [{ kind: 'chord', pcs, bass: parseChord(root).root }],
      skill: 'upper-structure',
    };
  };
}
const upperGen = upperStructure();

const C_IIVI: Midi[][] = [
  [n('D3'), n('F3'), n('A3'), n('C4')], [n('G2'), n('F3'), n('B3'), n('D4')], [n('C3'), n('E3'), n('G3'), n('B3')], [n('C3'), n('E3'), n('G3'), n('B3')],
];
const targetImprov: Exercise = {
  kind: 'improv',
  title: 'Notas-alvo no ii–V–I',
  how: 'O app toca Dm7 – G7 – C7M – C7M em loop. Improvise em Dó maior e, em cada troca de acorde, chegue numa nota do acorde novo (de preferência a 3ª ou a 7ª). Termine no Dó, Mi, Sol ou Si.',
  pcs: [0, 2, 4, 5, 7, 9, 11],
  bars: 8,
  bpm: 92,
  beatsPerBar: 4,
  backing: [...C_IIVI, ...C_IIVI],
  low: 60,
  high: 84,
  pass: { inSet: 0.9, restsPer4: 1, endOn: [0, 4, 7, 11], targets: 0.6 },
};

const IMPROV_Q: ChoiceQuestion[] = [
  { q: 'O voicing de "So What" (Bill Evans, 1959) sobre Dm é…', options: ['Três 4ªs justas e uma 3ª maior: Mi, Lá, Ré, Sol, Si', 'Ré, Fá, Lá, Dó', 'Uma tríade de Ré maior'], answer: 0, why: 'A pilha de 4ªs com a 3ª maior em cima: aberto, sem cara de tríade.' },
  { q: 'Por que o acorde quartal soa "moderno"?', options: ['Não tem terças empilhadas: a qualidade (maior, menor) fica ambígua', 'Porque é dissonante', 'Porque tem 7 notas'], answer: 0, why: 'Sem 3ª clara, o mesmo acorde serve em vários lugares. McCoy Tyner fez disso uma marca.' },
  { q: 'D/C7 (tríade de Ré sobre C7) dá ao C7 as tensões…', options: ['9 (Ré), ♯11 (Fá♯) e 13 (Lá)', '♭9 e ♯9', 'Só a 5ª'], answer: 0, why: 'A tríade fica um tom acima da fundamental: o som do dominante lídio.' },
  { q: 'Ab/C7 dá ao C7…', options: ['♭13 (Lá♭) e ♯9 (Mi♭), com o Dó dobrado', '9 e 13', '♯11'], answer: 0, why: 'Tríade no ♭VI: o som alterado, que pede resolução.' },
  { q: '"Nota-alvo" no improviso é…', options: ['Chegar numa nota do acorde novo, de preferência a 3ª ou a 7ª, na troca', 'Tocar só a fundamental', 'Tocar a nota mais aguda'], answer: 0, why: 'O resto da frase pode passear; a chegada é o que faz o improviso "desenhar" a harmonia.' },
];

const l96: Lesson = {
  n: 96,
  id: 'l96',
  title: 'Forma sonata (panorama)',
  minutes: 60,
  objectives: [
    'Consigo explicar exposição, desenvolvimento e recapitulação e o tom de cada tema.',
    'Consigo tocar o tema 2 no V (exposição) e no I (recapitulação).',
    'Consigo dizer de ouvido se um tema voltou no I ou no V.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Uma história em três partes',
      body: `A **forma sonata** é a forma do primeiro movimento de quase toda sonata, sinfonia e quarteto do período clássico (Haydn, Mozart, Beethoven). Ela conta uma história de **conflito e resolução entre dois tons**:

1. **Exposição**: o **tema 1** no **I**; uma **transição** que modula; o **tema 2** no **V** (ou na relativa maior, se a peça é menor); uma pequena **codeta**. Em geral a exposição inteira se repete.
2. **Desenvolvimento**: os temas são **fragmentados**, passam por vários tons e a tensão cresce até uma parada longa no **V**.
3. **Recapitulação**: o tema 1 volta no **I** e o **tema 2 também volta no I**. O conflito acabou.

A **sonatina** (Clementi, Kuhlau) é a mesma forma em tamanho pequeno, com um desenvolvimento curto. É o que você leu na unidade 9.`,
    },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'por que o tema 2 muda de tom',
      body: 'Na exposição, o tema 2 no V cria uma pergunta: a música saiu de casa. Na recapitulação, o mesmo tema no I é a resposta. Se o tema 2 voltasse no V, a peça terminaria fora de casa. Ouvir isso é entender a forma.',
    },
    {
      kind: 'text',
      title: 'Os dois temas',
      body: `Os temas de uma sonata costumam contrastar: o **tema 1** é mais afirmativo (arpejos, ritmo marcado) e o **tema 2** mais cantado.

Para treinar, o app usa dois temas originais. O **tema 1**, em Dó: Dó, Mi, Sol, Mi | Fá, Ré, Si, Sol | Dó, Mi, Sol, Dó | Si, Sol. O **tema 2**, na exposição, em **Sol maior** (com Fá♯): Ré, Si, Dó, Lá | Si, Sol, Lá, Fá♯ | Sol, Si, Ré, Si | Sol.

Na recapitulação o tema 2 vem **uma 5ª abaixo**, em Dó: o Fá♯ vira Si, e a frase termina no Dó.`,
    },
    { kind: 'exercise', id: 'l96-tema1', exercise: quickTimed('Tema 1 no I', 'Só a direita, a 84 BPM. Duas passadas boas.', () => melodyTask(THEME1, { bpm: 84 }), { reps: 2 }) },
    { kind: 'exercise', id: 'l96-tema2', exercise: quickTimed('Tema 2 no V (exposição)', 'Em Sol maior, com Fá♯, a 84 BPM.', () => melodyTask(THEME2_G, { bpm: 84, fifths: 1 }), { reps: 2 }) },
    {
      kind: 'exercise',
      id: 'l96-recap',
      exercise: quickTimed('Tema 2 no I (recapitulação)', 'A pauta mostra o tema em Sol; toque-o uma 5ª abaixo, em Dó maior, a 80 BPM.', () => transposedTask(THEME2_G, -7, { bpm: 80, fifths: 1, caption: 'Leia em Sol, toque em Dó: cada nota uma 5ª justa abaixo. O Fá♯ vira Si.' }), { reps: 2 }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'transpor nota por nota',
      body: 'Contar 7 semitons para cada nota é lento e erra. Pense em **graus**: o tema 2 começa no 5º grau (Ré em Sol; Sol em Dó) e anda pelos mesmos graus no tom novo. A mão faz o mesmo desenho, só em outra casa.',
    },
    { kind: 'exercise', id: 'l96-ouvido', exercise: items('I ou V?', 'O app toca a cadência de Dó e depois o tema 2. Ele estava no I ou no V?', themeEar, 8, 48, 84, 0.75, 'off') },
    { kind: 'exercise', id: 'l96-quiz', exercise: quiz('Análise da forma', 'Responda sem tocar.', SONATA_Q, 0.85) },
  ],
  review: [themeEar, choice(SONATA_Q, 'sonata')],
  checkpoint: [
    items('I ou V, de ouvido', '8 temas, sem dica. Meta: 7 de 8.', themeEar, 8, 48, 84, 0.85, 'off'),
    quickTimed('Recapitulação', 'O tema 2 em Dó, lendo em Sol, a 84 BPM, sem dicas.', () => transposedTask(THEME2_G, -7, { bpm: 84, fifths: 1 })),
  ],
  exit: [themeEar, choice(SONATA_Q, 'sonata')],
};

const l97: Lesson = {
  n: 97,
  id: 'l97',
  title: 'Trilhas de cinema, anime e games',
  minutes: 60,
  objectives: [
    'Consigo tocar a Royal Road conduzida em quatro tons e reconhecê-la pelo baixo.',
    'Consigo tocar e reconhecer o ♭VI–♭VII–I e o "voo" lídio.',
    'Consigo tocar um ostinato de esquerda com a melodia por cima e transcrever frases curtas de ouvido.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A harmonia das trilhas',
      body: `As trilhas de cinema, anime e games usam a harmonia que você já conhece, com alguns favoritos:

- **Royal Road** (王道進行, "progressão do caminho real"): **IV7M – V7 – iii7 – vi7**. Em Dó: F7M – G7 – Em7 – Am7. Onipresente em J-pop e aberturas de anime. Começa longe da tônica e termina no vi: um sentimento de saudade, sem fechar.
- **Épico**: **♭VI – ♭VII – I** (em Dó: A♭ – B♭ – C). O empréstimo da unidade 10 subindo por tom até o I maior. É o som da vitória e da aventura.
- **Lídio**: **I – II/I** (em Dó: C – D/C). O acorde de Ré maior sobre o baixo Dó traz o Fá♯, a 4ª aumentada: o som de voo e fantasia.`,
    },
    { kind: 'exercise', id: 'l97-royal', exercise: items('Royal Road conduzida', 'Quatro tétrades em ordem, uma nota de cada, andando o mínimo. Quatro tons.', royal, 8, 48, 84, 0.85, 'fade') },
    {
      kind: 'example',
      title: 'Três cores em Dó',
      steps: [
        { say: '**Royal Road**: F7M – G7 – Em7 – Am7.', play: { bpm: 72, steps: [{ midis: [n('F2'), n('E4'), n('A4'), n('C5')], beats: 2 }, { midis: [n('G2'), n('D4'), n('F4'), n('B4')], beats: 2 }, { midis: [n('E2'), n('D4'), n('G4'), n('B4')], beats: 2 }, { midis: [n('A2'), n('C4'), n('E4'), n('G4')], beats: 3 }] } },
        { say: '**Épico**: A♭ – B♭ – C.', play: { bpm: 72, steps: [{ midis: [n('Ab2'), n('Eb4'), n('Ab4'), n('C5')], beats: 2 }, { midis: [n('Bb2'), n('D4'), n('F4'), n('Bb4')], beats: 2 }, { midis: [n('C3'), n('E4'), n('G4'), n('C5')], beats: 4 }] } },
        { say: '**Lídio**: C e D/C, sobre o mesmo baixo.', play: { bpm: 72, steps: [{ midis: [n('C3'), n('E4'), n('G4'), n('C5')], beats: 2 }, { midis: [n('C3'), n('D4'), n('F#4'), n('A4')], beats: 2 }, { midis: [n('C3'), n('E4'), n('G4'), n('C5')], beats: 4 }] } },
      ],
    },
    { kind: 'exercise', id: 'l97-cores', exercise: items('O voo lídio', 'Toque os acordes em ordem; no II/I, o baixo continua na tônica.', lydianChords, 6, 36, 84, 0.85, 'fade') },
    { kind: 'exercise', id: 'l97-ouvido', exercise: items('Ditado de baixo: trilhas', 'O app toca uma progressão; toque o baixo de cada acorde. Mistura Royal Road e épico.', mix([royalEar, epicEar]), 8, 36, 72, 0.75, 'off') },
    {
      kind: 'text',
      title: 'Ostinato na esquerda',
      body: `Muitas trilhas de piano se apoiam num **ostinato**: a esquerda repete um desenho curto, em colcheias, e a melodia flutua por cima. Pense na "Comptine d'un autre été" de Tiersen ou no arpejo do "Prelude" de Final Fantasy (as duas protegidas; aqui, só como referência).

O **Tema de jogo** do app (original) usa o desenho mais simples: **fundamental, 5ª, oitava, 5ª**, duas vezes por compasso, sobre Am – F – C – G.

Como no baião, o ostinato precisa ficar **automático** antes de a melodia entrar. Toque a esquerda sozinha até poder conversar enquanto toca.`,
    },
    {
      kind: 'exercise',
      id: 'l97-ostinato',
      exercise: quickTimed('Ostinato sozinho', 'Só a esquerda: Am | F | C | G em colcheias, de 72 até 84 BPM.', () => melodyTask(['Am', 'F', 'C', 'G'].map(ost).join(' | '), { bpm: 72, clef: 'bass', caption: 'Fundamental, 5ª, oitava, 5ª: Lá–Mi–Lá–Mi, Fá–Dó–Fá–Dó, Dó–Sol–Dó–Sol, Sol–Ré–Sol–Ré.' }), { ladder: { from: 72, to: 84, step: 4 } }),
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'o ostinato engolir a melodia',
      body: 'Oito colcheias por compasso fazem muito mais "barulho" que duas mínimas na direita. Toque o ostinato **piano** e igual, e a melodia **mezzo forte**. Se não der para ouvir a melodia na gravação, a esquerda está forte demais.',
    },
    { kind: 'song', songId: 'u12-tema-jogo', why: 'A música da lição: melodia original em Lá menor sobre o ostinato.' },
    {
      kind: 'text',
      title: 'Transcrever de ouvido',
      body: `A tabela pede **transcrever 8 compassos de uma trilha** e arranjar. O método é o da unidade 8, em quatro passos: **tônica**, **qualidade** (maior ou menor), **campo harmônico** e **baixo**. Para a melodia, cante frases curtas (3 a 6 notas), ache a primeira nota no teclado e siga por intervalos.

O exercício abaixo treina o passo da melodia com frases do Tema de jogo. A transcrição de uma trilha de verdade (a sua escolha) é o projeto da lição 100.`,
    },
    { kind: 'exercise', id: 'l97-transcrever', exercise: items('Frases de ouvido', 'O app toca uma frase de 4 a 6 notas; repita. Ele diz a primeira nota.', melodyEar, 8, 60, 84, 0.75, 'off') },
    { kind: 'exercise', id: 'l97-quiz', exercise: quiz('Trilhas', 'Responda sem tocar.', FILM_Q) },
  ],
  review: [royal, royalEar, choice(FILM_Q, 'trilhas')],
  checkpoint: [
    items('Ditado de trilhas', '8 progressões, sem dica. Meta: 7 de 8.', mix([royalEar, epicEar]), 8, 36, 72, 0.85, 'off'),
    items('Frases de ouvido', '6 frases, sem dica. Meta: 5 de 6.', melodyEar, 6, 60, 84, 0.8, 'off'),
    quickTimed('Tema de jogo', 'Compassos 1 a 4, mãos juntas, a 80 BPM.', () => twoHandTask(GAME_R.slice(0, 4).join(' | '), GAME_CHORDS.slice(0, 4).map(ost).join(' | '), { bpm: 80 })),
  ],
  exit: [royal, choice(FILM_Q, 'trilhas')],
};

const l98: Lesson = {
  n: 98,
  id: 'l98',
  title: 'Improvisação e rearmonização avançadas',
  minutes: 60,
  objectives: [
    'Consigo montar voicings quartais e upper structures (tríade sobre o dominante).',
    'Consigo improvisar sobre o ii–V–I com 60% das chegadas em nota do acorde e 90% das notas no tom.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Acordes em quartas',
      body: `Até aqui todo acorde foi uma pilha de **terças**. Nos anos 1950 e 60, pianistas como Bill Evans e McCoy Tyner começaram a empilhar **quartas**: Mi, Lá, Ré, Sol. Sem terças, o acorde não diz se é maior ou menor; ele soa aberto, moderno, "suspenso".

O exemplo famoso é o voicing de "So What" (Miles Davis, 1959, com Bill Evans ao piano): sobre Ré menor, **três 4ªs justas e uma 3ª maior** em cima: Mi, Lá, Ré, Sol, Si.

A mesma pilha serve a vários acordes. Mi–Lá–Ré–Sol cabe em Dm7 (9, 5, 1, 11), em C (3, 6, 9, 5) e em G7sus. Por isso os quartais são ótimos para **vamps modais**: a mão sobe e desce a pilha pelas notas do modo.`,
    },
    { kind: 'exercise', id: 'l98-quartal', exercise: items('Pilhas de quartas', 'Três 4ªs justas a partir da nota pedida. Quatro notas.', quartalGen, 8, 48, 84, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'Upper structures: tríade em cima do dominante',
      body: `Um atalho para tensões no V7: a esquerda toca o **shell** (fundamental, 3ª e 7ª) e a direita toca uma **tríade maior** por cima. A tríade escolhida decide as tensões:

- tríade **um tom acima** da fundamental (o **II**): **D/C7** = C7 com 9 (Ré), ♯11 (Fá♯) e 13 (Lá). Som claro, lídio.
- tríade no **♭VI**: **A♭/C7** = C7 com ♭13 (Lá♭) e ♯9 (Mi♭), mais o Dó. Som alterado, tenso.

A cifra "D/C7" se lê "Ré sobre Dó sete". É um panorama: há outras tríades possíveis, mas essas duas cobrem os dois sabores do dominante, o natural e o alterado.`,
    },
    {
      kind: 'example',
      title: 'D/C7 e A♭/C7 resolvendo',
      steps: [
        { say: '**D/C7** → F: Dó–Mi–Si♭ na esquerda, Ré–Fá♯–Lá na direita.', play: { bpm: 66, steps: [{ midis: [n('C3'), n('E3'), n('Bb3'), n('D4'), n('F#4'), n('A4')], beats: 2 }, { midis: [n('F2'), n('A3'), n('E3'), n('C4'), n('F4'), n('A4')], beats: 3 }] } },
        { say: '**A♭/C7** → F: o Lá♭ desce para o Sol, o Mi♭ para o Ré.', play: { bpm: 66, steps: [{ midis: [n('C3'), n('E3'), n('Bb3'), n('Eb4'), n('Ab4'), n('C5')], beats: 2 }, { midis: [n('F2'), n('A3'), n('E3'), n('D4'), n('G4'), n('C5')], beats: 3 }] } },
      ],
    },
    { kind: 'exercise', id: 'l98-upper', exercise: items('Upper structures', 'Shell do dominante na esquerda e a tríade na direita, juntos.', upperGen, 8, 36, 84, 0.85, 'fade') },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'tríade de cima na mesma região do shell',
      body: 'Se a tríade da direita desce para perto do shell, as notas se embolam e a tríade some. Deixe um espaço: o shell na região de Dó3, a tríade a partir do Dó4 ou acima.',
    },
    {
      kind: 'text',
      title: 'Notas-alvo no ii–V–I',
      body: `No blues da unidade 8 você mirou notas do acorde nas trocas. Agora o alvo é o **ii–V–I**, onde as trocas são rápidas. A técnica:

- saiba as **notas-guia** de cada acorde (3ª e 7ª): Dm7 = Fá e Dó; G7 = Si e Fá; C7M = Mi e Si;
- no fim de cada frase, **chegue** numa delas no tempo 1 do acorde novo, de preferência pelo meio tom de cima ou de baixo (a **aproximação cromática**: Si♭ → Si no G7, Ré♯ → Mi no C7M);
- entre as chegadas, passeie livre pela escala.

Meta da tabela: **60% das chegadas** em nota do acorde e **90% das notas** no tom (as aproximações cromáticas contam fora, então use poucas).`,
    },
    { kind: 'exercise', id: 'l98-alvos', exercise: targetImprov },
    { kind: 'exercise', id: 'l98-quiz', exercise: quiz('Improviso avançado', 'Responda sem tocar.', IMPROV_Q) },
  ],
  review: [quartalGen, upperGen, choice(IMPROV_Q, 'improviso')],
  checkpoint: [
    targetImprov,
    items('Quartais e upper structures', '8 acordes, sem dica. Meta: 7 de 8.', mix([quartalGen, upperGen]), 8, 36, 84, 0.85, 'off'),
  ],
  exit: [upperGen, choice(IMPROV_Q, 'improviso')],
};

// ---------- unidade ----------

const unit: Unit = {
  n: 12,
  id: 'u12',
  title: 'Arranjo, forma e repertório',
  goal: 'Reconhecer a forma, arranjar uma melodia para piano solo e apresentar um recital próprio com peças de três mundos.',
  technique: 'Escalas de 2 oitavas mãos juntas em semicolcheias, de 44 rumo a 60 BPM (variação abaixo de 25 ms), e arpejos maiores mãos juntas. Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l90, l91, l92, l93, l94, l95, l96, l97, l98],
  songs: [odeArr, preludio, tema, valsa],
  final: {
    songId: 'u12-valsa-lenta',
    brief: 'Uma valsa lenta original no estilo das Gymnopédies de Satie: na esquerda, o baixo no tempo 1 e o acorde no tempo 2 (G7M e D7M), com pedal a cada compasso; na direita, uma melodia calma com o Dó♯ lídio sobre o Sol. Toque devagar, deixando o som respirar, e depois faça o seu arranjo dela.',
  },
};

export default unit;
