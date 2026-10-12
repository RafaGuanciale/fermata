// Unidade 12 — Arranjo, forma e repertório (lições 90 a 100). Projeto final: Valsa lenta (original, no estilo de Satie).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { chordSequence, choice, keyName, playChord, type ChoiceQuestion } from '../gens';
import { n, pick, shuffle } from '../music';
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

// ---------- unidade ----------

const unit: Unit = {
  n: 12,
  id: 'u12',
  title: 'Arranjo, forma e repertório',
  goal: 'Reconhecer a forma, arranjar uma melodia para piano solo e apresentar um recital próprio com peças de três mundos.',
  technique: 'Escalas de 2 oitavas mãos juntas em semicolcheias, de 44 rumo a 60 BPM (variação abaixo de 25 ms), e arpejos maiores mãos juntas. Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l90, l91, l92],
  songs: [odeArr, preludio, tema, valsa],
  final: {
    songId: 'u12-valsa-lenta',
    brief: 'Uma valsa lenta original no estilo das Gymnopédies de Satie: na esquerda, o baixo no tempo 1 e o acorde no tempo 2 (G7M e D7M), com pedal a cada compasso; na direita, uma melodia calma com o Dó♯ lídio sobre o Sol. Toque devagar, deixando o som respirar, e depois faça o seu arranjo dela.',
  },
};

export default unit;
export { scale16, arp8 };
