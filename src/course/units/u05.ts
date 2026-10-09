// Unidade 5 — Modo menor e intervalos com qualidade (lições 34 a 41). Projeto final: Für Elise, tema A (Lá menor).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import {
  buildMinorScale, choice, chordQualityByEar, degreeByEar, echo, minorChord, minorSteps, mix, playChord, qualityByEar, qualityInterval, relativeKey, resolveMinor, spellIntervalChoice, type ChoiceQuestion, type MinorForm,
} from '../gens';
import { pick } from '../music';
import { melodyTask, randomRhythm, sci, twoHandTask } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, Rng, SongSpec, Unit } from '../types';

// ---------- escrita ----------

/** Escala menor de uma oitava em colcheias, subindo e descendo, terminando numa semibreve. A melódica desce natural. */
function minorLine(tonic: Midi, form: MinorForm): string {
  const up = (form === 'natural' ? minorSteps('natural') : form === 'harmonica' ? minorSteps('harmonica') : minorSteps('melodica').slice(0, 8)).map((x) => `${sci(tonic + x)}:0.5`).join(' ');
  const downSteps = form === 'harmonica' ? [...minorSteps('harmonica')].reverse() : [...minorSteps('natural')].reverse();
  const down = downSteps.map((x) => `${sci(tonic + x)}:0.5`).join(' ');
  return `${up} | ${down} | ${sci(tonic)}:4`;
}

const quickTimed = (title: string, how: string, gen: (rng: Rng) => ReturnType<typeof melodyTask>, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

const items = (title: string, how: string, gen: ItemGen, count: number, low: Midi, high: Midi, accuracy = 0.85, labels: 'on' | 'fade' | 'off' = 'fade'): Exercise => ({
  kind: 'items', title, how, gen, count, low, high, labels, pass: { accuracy },
});

/** Armadura de cada tonalidade menor usada nas tarefas (relativa da maior). */
const MINOR_FIFTHS: Record<string, number> = { A: 0, E: 1, D: -1 };
const TONIC_MD: Record<string, Midi> = { A: 69, E: 64, D: 62 };
const TONIC_ME: Record<string, Midi> = { A: 45, E: 40, D: 50 };

const scaleTask = (key: 'A' | 'E' | 'D', form: MinorForm, bpm: number, hand: 'direita' | 'esquerda' = 'direita') =>
  melodyTask(minorLine((hand === 'direita' ? TONIC_MD : TONIC_ME)[key], form), { bpm, fifths: MINOR_FIFTHS[key], clef: hand === 'direita' ? 'treble' : 'bass' });

// ---------- perguntas ----------

const RELATIVE: ChoiceQuestion[] = [
  { q: 'A relativa menor de Dó maior é…', options: ['Lá menor', 'Dó menor', 'Mi menor'], answer: 0, why: 'Mesmas notas, mesma armadura; a casa desce uma 3ª menor: Dó → Lá.' },
  { q: 'Tonalidades relativas têm…', options: ['A mesma armadura e tônicas diferentes', 'A mesma tônica e armaduras diferentes', 'Nada em comum'], answer: 0, why: 'Dó maior e Lá menor: nenhum acidente, casas diferentes.' },
  { q: 'A tônica da relativa menor fica…', options: ['Uma 3ª menor (3 semitons) abaixo da tônica maior', 'Uma 5ª acima', 'Um tom abaixo'], answer: 0, why: 'É o 6º grau da escala maior: Sol maior → Mi menor.' },
  { q: 'A fórmula da escala menor natural é…', options: ['T S T T S T T', 'T T S T T T S', 'T S T T T T S'], answer: 0, why: 'Lá, Si, Dó, Ré, Mi, Fá, Sol, Lá.' },
  { q: 'O que mais diferencia o som maior do menor?', options: ['A 3ª: 4 semitons no maior, 3 no menor', 'O andamento', 'A oitava'], answer: 0, why: 'Lá–Dó♯ (3ª maior) contra Lá–Dó (3ª menor).' },
  { q: 'A relativa menor de Fá maior (1 bemol) é…', options: ['Ré menor', 'Lá menor', 'Fá menor'], answer: 0, why: 'Fá → 3ª menor abaixo → Ré. Ré menor também tem 1 bemol.' },
];

const FORMS: ChoiceQuestion[] = [
  { q: 'Na menor harmônica, o que muda em relação à natural?', options: ['O 7º grau sobe meio tom', 'O 3º grau sobe', 'O 6º e o 7º descem'], answer: 0, why: 'Lá menor harmônica: Sol vira Sol♯, a sensível.' },
  { q: 'Para que serve a sensível na menor?', options: ['Faz o V virar maior e puxar para a tônica', 'Deixa a escala mais lenta', 'Muda a armadura'], answer: 0, why: 'Mi–Sol♯–Si (E) resolve em Lá menor com força; Mi–Sol–Si (Em) quase não puxa.' },
  { q: 'A menor melódica clássica…', options: ['Sobe com 6º e 7º elevados e desce como a natural', 'É igual à harmônica', 'Desce com 6º e 7º elevados'], answer: 0, why: 'Lá: sobe Fá♯ e Sol♯, desce Sol e Fá.' },
  { q: 'A menor melódica "bachiana" (ou de jazz)…', options: ['Usa 6º e 7º elevados subindo e descendo', 'Não tem sensível', 'Só existe em Lá'], answer: 0, why: 'Bach e o jazz usam a melódica igual nos dois sentidos.' },
  { q: 'O Sol♯ de Lá menor vai…', options: ['Na nota, como acidente avulso', 'Na armadura', 'Em lugar nenhum: se toca sem escrever'], answer: 0, why: 'A armadura de Lá menor é a de Dó maior; a sensível sempre aparece escrita na nota.' },
  { q: 'Entre o 6º e o 7º grau da harmônica há…', options: ['Um tom e meio (2ª aumentada)', 'Um semitom', 'Um tom'], answer: 0, why: 'Fá → Sol♯: 3 semitons. É o som "oriental" da harmônica.' },
];

const QUALITY: ChoiceQuestion[] = [
  { q: 'Quantos semitons tem uma 3ª maior?', options: ['4', '3', '5'], answer: 0, why: 'Dó–Mi: 4 semitons. A 3ª menor (Dó–Mi♭) tem 3.' },
  { q: 'Quantos semitons tem uma 5ª justa?', options: ['7', '6', '8'], answer: 0, why: 'Dó–Sol: 7 semitons.' },
  { q: 'Quantos semitons tem uma 6ª menor?', options: ['8', '9', '7'], answer: 0, why: 'Dó–Lá♭: 8 semitons. A 6ª maior (Dó–Lá) tem 9.' },
  { q: 'Quais intervalos podem ser justos?', options: ['Uníssono, 4ª, 5ª e 8ª', '2ª, 3ª, 6ª e 7ª', 'Todos'], answer: 0, why: 'Os outros (2ª, 3ª, 6ª, 7ª) são maiores ou menores.' },
  { q: 'Na escala maior a partir da nota de baixo, a 3ª, a 6ª e a 7ª são…', options: ['Maiores', 'Menores', 'Justas'], answer: 0, why: 'E a 4ª, a 5ª e a 8ª são justas. É o método de comparação.' },
  { q: 'Mi–Sol é uma 3ª…', options: ['Menor (3 semitons)', 'Maior (4 semitons)', 'Justa'], answer: 0, why: 'Mi maior teria Sol♯. Sol natural é meio tom abaixo: 3ª menor.' },
  { q: 'Ré–Fá♯ e Ré–Sol♭ soam igual. Qual é a 3ª?', options: ['Ré–Fá♯', 'Ré–Sol♭', 'As duas'], answer: 0, why: 'A 3ª conta 3 letras: Ré, Mi, Fá. Ré–Sol♭ é uma 4ª diminuta.' },
];

// ---------- peças reaproveitadas ----------

const relKeys = relativeKey({ majors: ['C', 'G', 'F', 'D', 'Bb'], ask: ['menor', 'maior'] });
const majMinEar = chordQualityByEar({ qualities: ['', 'm'], roots: [57, 60, 62, 64, 65, 67], answerRoots: [60, 62, 64, 65, 67, 69] });
const minorTriads = playChord({ symbols: ['Am', 'Dm', 'Em', 'A', 'D', 'E', 'Cm', 'Gm'], low: 48, high: 72, requireBass: true });
const naturalScales = buildMinorScale({ keys: ['A', 'E', 'D'], forms: ['natural'] });
const harmonicScales = buildMinorScale({ keys: ['A', 'E', 'D'], forms: ['harmonica'] });
const allForms = buildMinorScale({ keys: ['A', 'E', 'D'], forms: ['natural', 'harmonica', 'melodica'] });
const cadMinor = resolveMinor({ keys: ['A', 'D', 'E'], before: [['V7'], ['V'], ['iv', 'V7'], ['i', 'iv', 'V7']] });
const fiveMinor = minorChord({ keys: ['A', 'D', 'E'], degrees: ['V', 'V7'], low: 48, high: 72 });

const MM_IVS = ['2m', '2M', '3m', '3M', '4J', '5J', '6m', '6M', '7m', '7M', '8J'];
// Partindo de pretas, só os intervalos que não pedem Dó♭, Fá♭ ou Mi♯ (esses ficam para o exercício de grafia).
const ivAbove = mix([
  qualityInterval({ from: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'], intervals: MM_IVS }),
  qualityInterval({ from: ['Bb3', 'F#4', 'Eb4'], intervals: ['3m', '3M', '4J', '5J', '6M', '8J'] }),
]);
const ivSpell = spellIntervalChoice({ from: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B3', 'F#4', 'Bb3', 'Eb4'], intervals: ['2m', '3m', '3M', '6m', '6M', '7m'] });
const earContrast = qualityByEar({ from: ['C4', 'D4', 'F4', 'G4'], intervals: ['3M', '5J', '4J', '8J'] });

// ---------- lições ----------

const l34: Lesson = {
  n: 34,
  id: 'l34',
  title: 'Relativa menor: Lá menor natural',
  minutes: 60,
  objectives: [
    'Consigo achar a relativa menor de uma tonalidade maior, e o caminho de volta, em menos de 3 segundos.',
    'Consigo tocar Lá menor natural com o dedilhado certo, mãos separadas, em colcheias a 60 BPM.',
    'Consigo ouvir se um acorde é maior ou menor e tocar a mesma qualidade sobre outra nota.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'As mesmas notas, outra casa',
      body: `Toque todas as brancas de **Lá3 a Lá4**: Lá, Si, Dó, Ré, Mi, Fá, Sol, Lá. São exatamente as notas de Dó maior, mas o som é outro: mais sombrio, mais sério. Isso é a escala de **Lá menor natural**.

O que mudou não foram as notas, foi a **casa**. Em Dó maior tudo puxa para o Dó; aqui tudo puxa para o Lá. Como as distâncias são contadas a partir de outra nota, a fórmula muda:

**Lá–Si** tom, **Si–Dó** semitom, **Dó–Ré** tom, **Ré–Mi** tom, **Mi–Fá** semitom, **Fá–Sol** tom, **Sol–Lá** tom.

A fórmula da **menor natural** é **T S T T S T T**. Compare com a maior (T T S T T T S): os semitons trocaram de lugar. Na maior eles ficam entre o 3º e o 4º grau e entre o 7º e o 8º; na menor natural, entre o 2º e o 3º e entre o 5º e o 6º.`,
    },
    {
      kind: 'keys',
      low: 57,
      high: 69,
      lit: [57, 59, 60, 62, 64, 65, 67, 69],
      labels: { 57: 'Lá', 59: 'Si', 60: 'Dó', 62: 'Ré', 64: 'Mi', 65: 'Fá', 67: 'Sol', 69: 'Lá' },
      caption: 'Lá menor natural: só brancas, de Lá a Lá. Semitons entre Si–Dó e Mi–Fá.',
    },
    {
      kind: 'text',
      title: 'Tonalidades relativas',
      body: `Duas tonalidades que usam as **mesmas notas** e a **mesma armadura**, mas têm casas diferentes, são **relativas**. Dó maior e Lá menor são relativas: nenhuma tem acidente.

Toda tonalidade maior tem a sua relativa menor, e a regra para achar é uma só: **a tônica menor fica uma 3ª menor (3 semitons) abaixo da tônica maior**. Ela é o 6º grau da escala maior.

- Dó maior → desce 3 semitons → **Lá menor** (nenhum acidente).
- Sol maior (Fá♯) → **Mi menor** (Fá♯).
- Fá maior (Si♭) → **Ré menor** (Si♭).
- Ré maior (Fá♯, Dó♯) → **Si menor**.
- Si♭ maior (Si♭, Mi♭) → **Sol menor**.

O caminho de volta é o mesmo ao contrário: da menor, **suba 3 semitons** e chega na maior relativa. Ré menor → Fá maior.`,
    },
    {
      kind: 'example',
      title: 'Dó maior e Lá menor',
      steps: [
        { say: 'Dó maior, subindo: a casa é o Dó.', play: { bpm: 112, steps: [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => ({ midis: [m], beats: i === 7 ? 2 : 1 })) } },
        { say: 'As mesmas teclas a partir do Lá: Lá menor natural. A casa agora é o Lá.', keys: [57, 69], play: { bpm: 112, steps: [57, 59, 60, 62, 64, 65, 67, 69].map((m, i) => ({ midis: [m], beats: i === 7 ? 2 : 1 })) } },
        { say: 'Os dois acordes de casa: Dó maior (Dó, Mi, Sol) e Lá menor (Lá, Dó, Mi). Eles têm duas notas em comum.', play: { bpm: 72, steps: [{ midis: [48, 60, 64, 67], beats: 2 }, { midis: [45, 57, 60, 64], beats: 3 }] } },
      ],
    },
    { kind: 'exercise', id: 'l34-relativa', exercise: items('Relativas', 'O app diz uma tonalidade; toque a tônica da relativa, em qualquer oitava. Às vezes é da maior para a menor, às vezes o contrário.', relKeys, 10, 48, 72, 0.8, 'off') },
    {
      kind: 'text',
      title: 'Por que o menor soa diferente',
      body: `A diferença de cor entre maior e menor está quase toda numa nota: a **3ª da escala**.

- Em **Lá maior**, do Lá até a 3ª (Dó♯) são **4 semitons**: uma **3ª maior**.
- Em **Lá menor**, do Lá até a 3ª (Dó) são **3 semitons**: uma **3ª menor**.

O mesmo vale para o acorde: **Lá maior** é Lá, Dó♯, Mi; **Lá menor** é Lá, **Dó**, Mi. Só a nota do meio desce meio tom, e o acorde muda de cor. Na cifra, o menor ganha um **m**: A é Lá maior, **Am** é Lá menor.

A menor natural também tem o 6º e o 7º graus mais baixos que a maior (Fá e Sol em vez de Fá♯ e Sol♯). Isso pesa no som, mas cria um problema que você vai resolver na próxima lição: sem o Sol♯, falta à escala uma nota que puxe forte para o Lá.

Por isso se diz que uma tonalidade menor tem **9 notas**: as 7 da natural e mais o 6º e o 7º graus elevados, que entram quando a música pede.`,
    },
    {
      kind: 'example',
      title: 'Maior e menor, lado a lado',
      steps: [
        { say: 'Lá maior: Lá, Dó♯, Mi.', keys: [57, 61, 64], play: { bpm: 72, steps: [{ midis: [57, 61, 64], beats: 2 }] } },
        { say: 'Lá menor: o Dó♯ desce para Dó.', keys: [57, 60, 64], play: { bpm: 72, steps: [{ midis: [57, 60, 64], beats: 2 }] } },
        { say: 'O mesmo em Ré: Ré maior (Ré, Fá♯, Lá) e Ré menor (Ré, Fá, Lá).', keys: [62, 65, 69], play: { bpm: 72, steps: [{ midis: [62, 66, 69], beats: 2 }, { midis: [62, 65, 69], beats: 2 }] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'triste ou alegre não é regra',
      body: 'Menor não quer dizer triste, nem maior quer dizer alegre: muito samba animado é menor, e há canções de ninar maiores e melancólicas. O que o ouvido percebe é a cor da 3ª. Para reconhecer, ouça a nota do meio do acorde, não o "clima".',
    },
    { kind: 'exercise', id: 'l34-ouvido', exercise: items('Maior ou menor, em outra raiz', 'O app toca um acorde. Toque um acorde da mesma qualidade com a fundamental pedida, no estado fundamental (fundamental embaixo).', majMinEar, 12, 48, 84, 0.85, 'off') },
    { kind: 'exercise', id: 'l34-acordes', exercise: items('Acordes maiores e menores', 'Toque o acorde da cifra com a fundamental embaixo. O "m" desce a 3ª meio tom.', minorTriads, 10, 48, 72) },
    {
      kind: 'text',
      title: 'Dedilhado de Lá menor',
      body: `Lá menor, como Dó maior, é só de brancas, e usa **o mesmo dedilhado de Dó**:

- **Mão direita**, subindo: **1 2 3 · 1 2 3 4 5**. O polegar passa no Ré. Descendo: 5 4 3 2 1 · 3 2 1, o 3 cruza no Dó.
- **Mão esquerda**, subindo: **5 4 3 2 1 · 3 2 1**. O 3 cruza no Fá. Descendo: 1 2 3 · 1 2 3 4 5.

Mi menor e Ré menor (natural) também usam esse dedilhado nas duas mãos. Mi menor tem o Fá♯ da armadura de Sol; Ré menor, o Si♭ da armadura de Fá.

Como na escala maior, o que conta é soar **igual**: o polegar se prepara cedo e o antebraço acompanha de lado.`,
    },
    { kind: 'exercise', id: 'l34-construir', exercise: items('Construa a menor natural', 'Lá, Mi ou Ré menor natural, subindo uma oitava. Siga T S T T S T T.', naturalScales, 6, 55, 84) },
    { kind: 'exercise', id: 'l34-md', exercise: quickTimed('Lá menor natural, mão direita', 'Colcheias, subindo e descendo, de 45 a 60 BPM. Variação até 40 ms.', () => scaleTask('A', 'natural', 45), { ladder: { from: 45, to: 60, step: 5 }, evenness: 40 }) },
    { kind: 'exercise', id: 'l34-me', exercise: quickTimed('Lá menor natural, mão esquerda', 'A partir do Lá2, dedilhado 5 4 3 2 1 3 2 1. De 45 a 60 BPM.', () => scaleTask('A', 'natural', 45, 'esquerda'), { ladder: { from: 45, to: 60, step: 5 }, evenness: 40 }) },
    { kind: 'exercise', id: 'l34-quiz', exercise: quiz('Relativa e menor natural', 'Seis perguntas rápidas.', RELATIVE) },
  ],
  review: [relKeys, majMinEar, naturalScales, choice(RELATIVE, 'menor-natural')],
  checkpoint: [
    items('Relativas e qualidade', '12 perguntas: relativas e maior ou menor de ouvido, sem dicas. Meta: 85%.', mix([relKeys, majMinEar]), 12, 48, 84, 0.85, 'off'),
    quickTimed('Lá menor natural a 60 BPM', 'Mão direita, colcheias, sem dicas. Variação até 40 ms.', () => scaleTask('A', 'natural', 60), { evenness: 40 }),
  ],
  exit: [relKeys, choice(RELATIVE, 'menor-natural')],
};

const l35: Lesson = {
  n: 35,
  id: 'l35',
  title: 'Menor harmônica e melódica',
  minutes: 60,
  objectives: [
    'Consigo tocar as três formas da menor (natural, harmônica e melódica) em Lá, Mi e Ré.',
    'Consigo explicar por que a harmônica existe: a sensível faz o V ficar maior.',
    'Consigo resolver V–i e V7–i em Lá, Ré e Mi menor, sempre com o V maior.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que falta na menor natural',
      body: `Na escala maior, o 7º grau fica a **meio tom** da tônica: Si → Dó. Essa nota se chama **sensível** porque é "sensível" à tônica, quase encostada, e puxa para ela. É ela que dá força à cadência V–I: o acorde de Sol (Sol, **Si**, Ré) resolve no Dó porque o Si sobe meio tom.

Na **menor natural**, o 7º grau fica a **um tom** da tônica: Sol → Lá. Essa nota não puxa: é só uma **subtônica**. E o acorde do 5º grau fica menor (Mi, **Sol**, Si = Em), uma dominante sem força. Toque Em e depois Am: soa como um passeio, não como uma chegada.

A solução, usada há mais de 300 anos: **subir o 7º grau meio tom**. Sol vira **Sol♯**, a sensível de Lá. O acorde do 5º grau vira **Mi maior** (Mi, Sol♯, Si = E) e, com a 7ª, **E7** (Mi, Sol♯, Si, Ré). Agora a cadência V–i chega de verdade.`,
    },
    {
      kind: 'example',
      title: 'Três cadências em Lá menor',
      steps: [
        { say: 'Com a natural: Em → Am. O Sol desce ou fica, e a chegada é fraca.', play: { bpm: 72, steps: [{ midis: [40, 55, 59, 64], beats: 2 }, { midis: [45, 57, 60, 64], beats: 3 }] } },
        { say: 'Com a sensível: E → Am. O Sol♯ sobe meio tom para o Lá.', keys: [56, 57], play: { bpm: 72, steps: [{ midis: [40, 56, 59, 64], beats: 2 }, { midis: [45, 57, 60, 64], beats: 3 }] } },
        { say: 'Com o E7: o Ré desce para o Dó e o Sol♯ sobe para o Lá. É o trítono resolvendo, como no G7 → C da Unidade 3.', play: { bpm: 72, steps: [{ midis: [40, 56, 62, 64], beats: 2 }, { midis: [45, 57, 60, 64], beats: 3 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'Menor harmônica',
      body: `A escala que nasce dessa troca é a **menor harmônica** (o nome vem de "harmonia": ela existe para servir aos acordes):

**Lá, Si, Dó, Ré, Mi, Fá, Sol♯, Lá.**

A fórmula vira **T S T T S 1½ S**. Repare no salto entre o 6º e o 7º grau: **Fá → Sol♯** são 3 semitons, um tom e meio. Esse intervalo (uma **2ª aumentada**) dá à harmônica o som "oriental" que você reconhece de trilhas de filme.

Nas outras tonalidades, a regra é a mesma, sempre a partir da natural:

- **Mi menor**: Mi, Fá♯, Sol, Lá, Si, Dó, **Ré♯**, Mi. V = Si maior (B), V7 = B7.
- **Ré menor**: Ré, Mi, Fá, Sol, Lá, Si♭, **Dó♯**, Ré. V = Lá maior (A), V7 = A7.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'a sensível não vai na armadura',
      body: 'A armadura de uma tonalidade menor é a da sua relativa maior: Lá menor não tem acidentes, Ré menor tem só o Si♭. O Sol♯, o Dó♯ e o Ré♯ da harmônica aparecem **escritos na nota**, como acidente avulso, toda vez. Ver um Sol♯ "solto" numa música sem armadura é uma pista forte de Lá menor.',
    },
    { kind: 'exercise', id: 'l35-harmonica', exercise: items('Construa a harmônica', 'Lá, Mi ou Ré menor harmônica, subindo. A partir da natural, suba o 7º grau meio tom.', harmonicScales, 6, 55, 84) },
    {
      kind: 'text',
      title: 'Menor melódica',
      body: `O salto de tom e meio é ótimo para acordes e estranho para cantar. A **menor melódica** suaviza a subida elevando **também o 6º grau**:

- **Subindo**: Lá, Si, Dó, Ré, Mi, **Fá♯**, **Sol♯**, Lá. Fórmula T S T T T T S: igual à maior, só com a 3ª menor.
- **Descendo** (na versão clássica): volta a ser a **natural**, Lá, Sol, Fá, Mi, Ré, Dó, Si, Lá. Descendo não há sensível para resolver, então as notas voltam ao lugar.

Bach usava a melódica igual nos dois sentidos, e o jazz também: é a **melódica "bachiana"** (ou de jazz). No curso, quando o exercício pedir "melódica", é a clássica: sobe alterada, desce natural.

Resumo das três formas de Lá menor:

- **Natural**: Lá Si Dó Ré Mi Fá Sol Lá.
- **Harmônica**: ... Fá **Sol♯** Lá.
- **Melódica**: ... **Fá♯ Sol♯** Lá subindo; natural descendo.`,
    },
    {
      kind: 'example',
      title: 'As três formas de Lá menor',
      steps: [
        { say: 'Natural.', play: { bpm: 120, steps: [69, 71, 72, 74, 76, 77, 79, 81].map((m, i) => ({ midis: [m], beats: i === 7 ? 2 : 1 })) } },
        { say: 'Harmônica: repare no salto Fá → Sol♯.', keys: [77, 80], play: { bpm: 120, steps: [69, 71, 72, 74, 76, 77, 80, 81].map((m, i) => ({ midis: [m], beats: i === 7 ? 2 : 1 })) } },
        { say: 'Melódica: sobe com Fá♯ e Sol♯, desce natural.', keys: [78, 80], play: { bpm: 120, steps: [69, 71, 72, 74, 76, 78, 80, 81, 79, 77, 76, 74, 72, 71, 69].map((m, i) => ({ midis: [m], beats: i === 14 ? 2 : 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l35-tres', exercise: items('As três formas', 'Forma e tonalidade sorteadas. A melódica sobe e desce (15 notas).', allForms, 9, 55, 84, 0.85) },
    { kind: 'exercise', id: 'l35-v', exercise: items('O V em menor', 'Toque o V ou o V7 da tonalidade menor. Lembre: é sempre maior, com a sensível.', fiveMinor, 8, 48, 72, 0.9) },
    { kind: 'exercise', id: 'l35-cadencia', exercise: items('Complete a cadência menor', 'O app toca o começo; você toca o i, o acorde de repouso.', cadMinor, 10, 48, 84, 0.85, 'off') },
    { kind: 'exercise', id: 'l35-escala', exercise: quickTimed('Lá menor harmônica, mão direita', 'Colcheias, subindo e descendo com o Sol♯ nos dois sentidos. De 45 a 60 BPM, variação até 40 ms.', () => scaleTask('A', 'harmonica', 45), { ladder: { from: 45, to: 60, step: 5 }, evenness: 40 }) },
    { kind: 'exercise', id: 'l35-melodica', exercise: quickTimed('Lá menor melódica, mão direita', 'Sobe com Fá♯ e Sol♯, desce natural, a 54 BPM. Duas passadas boas.', () => scaleTask('A', 'melodica', 54), { reps: 2, evenness: 40 }) },
    { kind: 'exercise', id: 'l35-quiz', exercise: quiz('As formas da menor', 'Seis perguntas rápidas.', FORMS) },
  ],
  review: [allForms, fiveMinor, cadMinor, choice(FORMS, 'formas-menor')],
  checkpoint: [
    items('Três formas', '9 escalas sorteadas, sem dicas. Meta: 90% das notas.', allForms, 9, 55, 84, 0.9, 'off'),
    items('V maior em menor', 'Cadências e dominantes: o V sempre maior. Meta: 100%.', mix([fiveMinor, cadMinor]), 8, 48, 84, 1, 'off'),
  ],
  exit: [harmonicScales, choice(FORMS, 'formas-menor')],
};

const l36: Lesson = {
  n: 36,
  id: 'l36',
  title: 'Intervalos com qualidade I: maior, menor e justo',
  minutes: 60,
  objectives: [
    'Consigo dar nome completo a um intervalo (número e qualidade) contando letras e semitons.',
    'Consigo tocar qualquer 2ª, 3ª, 6ª e 7ª maior ou menor, e 4ª, 5ª e 8ª justas, acima de uma nota dada.',
    'Consigo distinguir de ouvido 3ª maior de 5ª justa e 4ª justa de 8ª.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Número e qualidade',
      body: `Na Unidade 2 você mediu intervalos contando **teclas brancas**: de Dó a Mi é uma 3ª, de Dó a Sol uma 5ª. Esse é o **número** do intervalo, e ele conta **letras**, incluindo as duas pontas: Dó (1), Ré (2), Mi (3).

Só o número não basta. Dó–Mi e Dó–Mi♭ são as duas "3ª" (três letras), mas soam diferentes: Dó–Mi tem **4 semitons**, Dó–Mi♭ tem **3**. O nome completo diz as duas coisas: **número e qualidade**.

- Dó–Mi: **3ª maior** (3M).
- Dó–Mi♭: **3ª menor** (3m).

As qualidades possíveis são cinco: **maior**, **menor**, **justa**, **aumentada** e **diminuta**. Nesta lição, as três primeiras; as outras duas vêm na próxima.`,
    },
    {
      kind: 'text',
      title: 'O método da escala maior',
      body: `O jeito mais seguro de descobrir a qualidade é imaginar a **escala maior da nota de baixo**. A partir dela:

- A **2ª, 3ª, 6ª e 7ª** da escala maior são **maiores**.
- A **4ª, 5ª e 8ª** (e o uníssono) são **justas**.
- Um intervalo maior encolhido meio tom (mesmas letras) vira **menor**.

Exemplo: qual é o intervalo **Mi–Sol**? A escala de Mi maior tem Sol♯ (Mi, Fá♯, **Sol♯**). Mi–Sol♯ seria a 3ª maior; Sol natural está meio tom abaixo. Então Mi–Sol é uma **3ª menor**.

Para conferir, conte os semitons. Esta tabela vale a pena decorar:

- 2ª menor **1** · 2ª maior **2**
- 3ª menor **3** · 3ª maior **4**
- 4ª justa **5** · 5ª justa **7**
- 6ª menor **8** · 6ª maior **9**
- 7ª menor **10** · 7ª maior **11**
- 8ª justa **12**`,
    },
    {
      kind: 'example',
      title: 'Construir acima de Ré',
      steps: [
        { say: 'A escala de Ré maior: Ré, Mi, Fá♯, Sol, Lá, Si, Dó♯, Ré.', play: { bpm: 120, steps: [62, 64, 66, 67, 69, 71, 73, 74].map((m, i) => ({ midis: [m], beats: i === 7 ? 2 : 1 })) } },
        { say: '3ª maior acima de Ré: a 3ª nota da escala, **Fá♯** (4 semitons).', keys: [62, 66], play: { bpm: 72, steps: [{ midis: [62], beats: 1 }, { midis: [66], beats: 1 }, { midis: [62, 66], beats: 2 }] } },
        { say: '3ª menor: meio tom abaixo, mesma letra: **Fá** (3 semitons).', keys: [62, 65], play: { bpm: 72, steps: [{ midis: [62], beats: 1 }, { midis: [65], beats: 1 }, { midis: [62, 65], beats: 2 }] } },
        { say: '6ª maior: **Si**. 6ª menor: **Si♭**. 5ª justa: **Lá**.', keys: [62, 71, 70, 69], play: { bpm: 72, steps: [{ midis: [62, 71], beats: 2 }, { midis: [62, 70], beats: 2 }, { midis: [62, 69], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l36-construir', exercise: items('Construa o intervalo', 'Toque a nota dada e depois a nota pedida acima dela. Pense na escala maior da nota de baixo.', ivAbove, 16, 55, 84, 0.85) },
    {
      kind: 'text',
      title: 'Grafia: a letra certa',
      body: `Uma mesma tecla pode ter dois nomes: Fá♯ e Sol♭ são a mesma preta. No intervalo, a **letra** é decidida pelo número, nunca pela tecla.

A **3ª maior acima de Ré** é **Fá♯**, e não Sol♭: uma 3ª tem três letras (Ré, Mi, **Fá**). Ré–Sol♭ seria uma 4ª (quatro letras) com 4 semitons, que tem outro nome (4ª diminuta, na próxima lição).

O mesmo acima de Fá♯: a 6ª menor tem seis letras (Fá, Sol, Lá, Si, Dó, **Ré**) e 8 semitons. Fá♯ + 8 semitons cai no Ré. Resposta: **Ré**.

Essa disciplina parece detalhe, mas é ela que faz a partitura ser legível: um acorde de Ré maior escrito Ré–Sol♭–Lá confunde qualquer pianista.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'contar semitons e esquecer as letras',
      body: 'Contar só semitons dá a tecla certa e o nome errado. Faça sempre nos dois passos: primeiro a letra (o número), depois o acidente que dá os semitons. 6ª menor acima de Mi: letra Dó (Mi, Fá, Sol, Lá, Si, Dó); 8 semitons → Dó natural.',
    },
    { kind: 'exercise', id: 'l36-grafia', exercise: items('Qual é o nome certo?', 'Escolha a grafia correta da nota. Atenção às duas opções que soam igual.', ivSpell, 10, 48, 84, 0.8, 'off') },
    {
      kind: 'text',
      title: 'Ouvir a qualidade',
      body: `De ouvido, comece pelos pares que soam bem diferentes:

- **3ª maior** (Dó–Mi) é doce e cheia, a cor do acorde maior. **5ª justa** (Dó–Sol) é aberta, "oca", estável, sem cor de maior nem de menor.
- **4ª justa** (Dó–Fá) soa como um chamado, suspensa. **8ª** (Dó–Dó) soa como a mesma nota repetida mais aguda.

Uma âncora que ajuda: **Amazing Grace** começa com uma 4ª justa (na versão da Unidade 3, Sol → Dó), e **Brilha, brilha** com uma 5ª justa no salto do 2º para o 3º som (Dó → Sol). Cante o começo da música por dentro e compare.

Neste exercício o app toca a partir de uma nota e você toca as duas notas do intervalo que ouviu.`,
    },
    { kind: 'exercise', id: 'l36-ouvido', exercise: items('3M, 5J, 4J ou 8J de ouvido', 'Ouça e toque as duas notas. Os quatro intervalos são bem diferentes entre si.', earContrast, 12, 55, 84, 0.85, 'off') },
    { kind: 'exercise', id: 'l36-quiz', exercise: quiz('Qualidade dos intervalos', 'Sete perguntas rápidas.', QUALITY) },
  ],
  review: [ivAbove, ivSpell, earContrast, choice(QUALITY, 'qualidade')],
  checkpoint: [
    items('24 intervalos', 'Construção e grafia misturadas, sem dicas. Meta: 85%.', mix([ivAbove, ivAbove, ivSpell]), 24, 55, 84, 0.85, 'off'),
  ],
  exit: [ivAbove, choice(QUALITY, 'qualidade')],
};

const AUG_DIM: ChoiceQuestion[] = [
  { q: 'Uma 4ª aumentada tem quantos semitons?', options: ['6', '5', '7'], answer: 0, why: 'A 4ª justa (5) mais meio tom. Fá–Si.' },
  { q: 'Uma 5ª diminuta tem quantos semitons?', options: ['6', '7', '5'], answer: 0, why: 'A 5ª justa (7) menos meio tom. Si–Fá.' },
  { q: 'O trítono tem…', options: ['3 tons (6 semitons)', '3 semitons', '3 notas'], answer: 0, why: 'Daí o nome: três tons inteiros. É a 4ª aumentada ou a 5ª diminuta.' },
  { q: 'Diminuir uma 3ª menor dá…', options: ['Uma 3ª diminuta (2 semitons)', 'Uma 3ª maior', 'Uma 2ª menor'], answer: 0, why: 'Maior → menor → diminuta, sempre meio tom a menos com as mesmas letras.' },
  { q: 'A inversão de uma 3ª maior é…', options: ['Uma 6ª menor', 'Uma 6ª maior', 'Uma 5ª justa'], answer: 0, why: 'Regra do 9: 3 + 6 = 9. Maior vira menor.' },
  { q: 'A inversão de uma 4ª justa é…', options: ['Uma 5ª justa', 'Uma 5ª diminuta', 'Uma 4ª aumentada'], answer: 0, why: '4 + 5 = 9, e justa continua justa.' },
  { q: 'A inversão de uma 2ª menor é…', options: ['Uma 7ª maior', 'Uma 7ª menor', 'Uma 8ª'], answer: 0, why: '2 + 7 = 9; menor vira maior. Semitons: 1 + 11 = 12.' },
  { q: 'A inversão de uma 4ª aumentada é…', options: ['Uma 5ª diminuta', 'Uma 5ª aumentada', 'Uma 4ª diminuta'], answer: 0, why: 'Aumentada vira diminuta. O trítono invertido continua trítono: 6 + 6 = 12.' },
];

const MINOR_CHORDS: ChoiceQuestion[] = [
  { q: 'A tríade menor é…', options: ['3ª menor embaixo e 3ª maior em cima', '3ª maior embaixo e 3ª menor em cima', 'Duas 3ªs menores'], answer: 0, why: 'Lá–Dó (3 semitons) + Dó–Mi (4 semitons).' },
  { q: 'Em Lá menor, i–iv–V7 é…', options: ['Am – Dm – E7', 'Am – D – E', 'A – Dm – Em'], answer: 0, why: 'Graus em letra minúscula são menores; o V7 é maior, com o Sol♯.' },
  { q: 'Em Ré menor, o iv é…', options: ['Gm', 'G', 'Bb'], answer: 0, why: 'Sol, Si♭, Ré: o Si♭ é da armadura.' },
  { q: 'O E7 em posição próxima depois do Am fica…', options: ['Sol♯–Ré–Mi', 'Mi–Sol♯–Si–Ré', 'Si–Ré–Mi'], answer: 0, why: 'Como o Si–Fá–Sol do G7 em Dó: a mão quase não sai do lugar.' },
  { q: 'O meio-arpejo 1-5-8 em Lá é…', options: ['Lá, Mi, Lá', 'Lá, Dó, Mi', 'Lá, Ré, Lá'], answer: 0, why: 'Fundamental, 5ª e oitava.' },
  { q: 'Am – F – C – G em Dó maior são os graus…', options: ['vi – IV – I – V', 'i – iv – V – I', 'ii – V – I – IV'], answer: 0, why: 'Lá menor é o 6º grau de Dó: a relativa menor dentro do maior.' },
];

const TRIPLETS: ChoiceQuestion[] = [
  { q: 'Uma tercina de colcheias ocupa…', options: ['1 tempo, com 3 notas', '3 tempos', '1 tempo e meio'], answer: 0, why: 'Três colcheias no lugar de duas: cada uma vale um terço do tempo.' },
  { q: 'A 60 BPM, cada nota de uma tercina de colcheias dura…', options: ['Um terço de segundo', 'Meio segundo', 'Um segundo'], answer: 0, why: 'O tempo dura 1 s; a tercina divide em 3.' },
  { q: 'Na partitura, a tercina aparece…', options: ['Com um 3 sobre o grupo', 'Com um ponto', 'Com uma ligadura'], answer: 0, why: 'O número diz quantas notas cabem no lugar de duas.' },
  { q: 'O erro mais comum na tercina é…', options: ['Tocar curta-curta-longa, como galope', 'Tocar alto demais', 'Usar o pedal'], answer: 0, why: 'As três notas têm o mesmo tamanho: fale "ter-ci-na" bem igual.' },
];

const ivAug = mix([
  qualityInterval({ from: ['C4', 'D4', 'E4', 'G4', 'A4'], intervals: ['4A', '5d'] }),
  qualityInterval({ from: ['C4', 'D4', 'F4', 'G4'], intervals: ['5A', '3m', '6M'] }),
]);
const ivBelow = qualityInterval({ from: ['C5', 'D5', 'E5', 'F5', 'G5', 'A4', 'B4'], intervals: ['2m', '2M', '3m', '3M', '4J', '5J', '6m', '6M'], dir: 'abaixo' });
const earThirds = qualityByEar({ from: ['C4', 'D4', 'E4', 'F4', 'G4', 'A3'], intervals: ['3m', '3M'] });
const earThirdsHarm = qualityByEar({ from: ['C4', 'D4', 'F4', 'G4'], intervals: ['3m', '3M'], harmonic: true });
const earFourths = qualityByEar({ from: ['C4', 'D4', 'F4', 'G4', 'A3'], intervals: ['4J', '4A', '5J'] });
const earOther = qualityByEar({ from: ['C4', 'G4'], intervals: ['3m', '3M', '5J'], answerFrom: ['D4', 'E4', 'F4', 'A3'] });

const l37: Lesson = {
  n: 37,
  id: 'l37',
  title: 'Intervalos com qualidade II: aumentado, diminuto e inversão',
  minutes: 60,
  objectives: [
    'Consigo construir intervalos aumentados e diminutos, e reconhecer o trítono como 4ª aumentada ou 5ª diminuta.',
    'Consigo construir intervalos abaixo de uma nota e dizer a inversão de qualquer intervalo pela regra do 9.',
    'Consigo distinguir de ouvido 3ª menor de 3ª maior, e 4ª justa de trítono e de 5ª justa, com pelo menos 80% de acerto.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Aumentado e diminuto',
      body: `Na lição anterior, as qualidades foram três: maior, menor e justa. Faltam as duas que esticam ou encolhem um intervalo **além** dessas:

- **Aumentado**: meio tom **a mais** que o maior ou o justo, com as mesmas letras. Dó–Fá é 4ª justa (5 semitons); **Dó–Fá♯** é **4ª aumentada** (6). Dó–Sol é 5ª justa; **Dó–Sol♯** é **5ª aumentada** (8).
- **Diminuto**: meio tom **a menos** que o menor ou o justo. Dó–Sol é 5ª justa; **Dó–Sol♭** é **5ª diminuta** (6). Dó–Mi♭ é 3ª menor; Dó–Mi♭♭ seria 3ª diminuta (2), raro na prática.

A escada completa, de menor para maior, fica assim:

- Intervalos que podem ser maiores ou menores (2ª, 3ª, 6ª, 7ª): **diminuto ← menor ← maior → aumentado**.
- Intervalos justos (4ª, 5ª, 8ª): **diminuto ← justo → aumentado**.

Repare que um intervalo justo **nunca** é "maior" ou "menor". Dizer "5ª menor" é um erro de nome: o certo é 5ª diminuta.`,
    },
    {
      kind: 'text',
      title: 'O trítono',
      body: `Dó–Fá♯ (4ª aumentada) e Dó–Sol♭ (5ª diminuta) são a **mesma tecla** com nomes diferentes: 6 semitons, exatamente **meia oitava**. Esse intervalo se chama **trítono**, porque tem **três tons** inteiros.

Dentro da escala de Dó maior só existe um trítono: **Fá–Si** (4ª aumentada) ou, invertido, **Si–Fá** (5ª diminuta). Você já conhece esse par: são a 3ª e a 7ª do **G7**. O trítono é instável e quer resolver: o Si sobe para o Dó e o Fá desce para o Mi. É isso que dá ao V7 a força de puxar para o I.

Em Lá menor harmônica há mais trítonos, e o principal é o do E7: **Sol♯–Ré**, que resolve em Lá–Dó.`,
    },
    {
      kind: 'example',
      title: 'Trítono e resolução',
      steps: [
        { say: '5ª justa (Dó–Sol), 5ª diminuta (Dó–Sol♭) e 5ª aumentada (Dó–Sol♯).', keys: [60, 66, 67, 68], play: { bpm: 72, steps: [{ midis: [60, 67], beats: 2 }, { midis: [60, 66], beats: 2 }, { midis: [60, 68], beats: 2 }] } },
        { say: 'O trítono Si–Fá resolve para Dó–Mi: cada nota anda meio tom.', keys: [59, 65, 60, 64], play: { bpm: 60, steps: [{ midis: [59, 65], beats: 2 }, { midis: [60, 64], beats: 3 }] } },
        { say: 'Em Lá menor, Sol♯–Ré resolve para Lá–Dó.', keys: [68, 74, 69, 72], play: { bpm: 60, steps: [{ midis: [68, 74], beats: 2 }, { midis: [69, 72], beats: 3 }] } },
      ],
    },
    { kind: 'exercise', id: 'l37-aumentados', exercise: items('Aumentados, diminutos e trítono', 'Construa acima da nota dada. Primeiro a letra (o número), depois os semitons.', ivAug, 12, 55, 84) },
    {
      kind: 'text',
      title: 'Intervalos abaixo',
      body: `Para construir **abaixo**, o raciocínio é o mesmo, contando para baixo:

1. **Letras**: conte o número de letras descendo, incluindo as duas pontas. 3ª abaixo de Mi: Mi, Ré, **Dó**.
2. **Semitons**: ajuste o acidente. 3ª menor tem 3 semitons: de Mi descendo 3 semitons cai no **Dó♯**. Então a 3ª menor abaixo de Mi é **Dó♯**.

Um atalho útil: a nota de baixo de uma **3ª maior** abaixo de Mi é a nota cuja 3ª maior **acima** é Mi, ou seja, Dó. Construir abaixo é perguntar "de qual nota esta é a 3ª maior?".`,
    },
    { kind: 'exercise', id: 'l37-abaixo', exercise: items('Construa abaixo', 'Toque a nota dada e depois a nota pedida abaixo dela.', ivBelow, 12, 48, 84) },
    {
      kind: 'text',
      title: 'Inversão: a regra do 9',
      body: `**Inverter** um intervalo é passar a nota de baixo para cima (uma oitava acima), ou a de cima para baixo. Dó–Mi (3ª maior) invertido vira **Mi–Dó**: uma **6ª menor**.

Duas regras resolvem qualquer inversão:

- **Números somam 9**: 2ª ↔ 7ª, 3ª ↔ 6ª, 4ª ↔ 5ª, uníssono ↔ 8ª.
- **Qualidades trocam**: maior ↔ menor, aumentada ↔ diminuta, e **justa continua justa**.

Os semitons sempre somam 12: 3ª maior (4) + 6ª menor (8) = 12.

Para que serve? Para atalhos. Uma 6ª menor acima de Mi é difícil de contar; mas ela é a inversão de uma 3ª maior. Ache a 3ª maior **abaixo** de Mi (Dó) e suba para a mesma letra na oitava de cima: **Dó**. Pianistas usam isso o tempo todo, porque 3ªs são fáceis de ver no teclado.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: '"5ª menor"',
      body: 'A 4ª, a 5ª e a 8ª nunca são maiores ou menores, só justas, aumentadas ou diminutas. E na inversão, justa continua justa: a inversão da 4ª justa é a 5ª justa, não a 5ª maior.',
    },
    {
      kind: 'text',
      title: 'Ouvido: os pares confundíveis',
      body: `Agora os pares que mais confundem. Por isso o alvo é um pouco menor (80%).

- **3ª menor × 3ª maior**: a maior soa aberta e luminosa, a menor fechada e escura. Melódica (uma nota depois da outra) é mais difícil que harmônica (as duas juntas), porque juntas a cor do acorde aparece.
- **4ª justa × trítono × 5ª justa**: a 4ª é um chamado, estável. A 5ª é aberta e "oca". O **trítono** fica entre as duas e soa tenso, como uma sirene, querendo ir para algum lugar.

O último exercício é o mais difícil: o app toca um intervalo a partir de uma nota e você toca **o mesmo intervalo a partir de outra**. É assim que se tira música de ouvido em outro tom.`,
    },
    { kind: 'exercise', id: 'l37-tercas-harm', exercise: items('3ª menor ou maior, notas juntas', 'Ouça as duas notas juntas e toque-as (a de baixo primeiro).', earThirdsHarm, 10, 55, 84, 0.8, 'off') },
    { kind: 'exercise', id: 'l37-tercas', exercise: items('3ª menor ou maior, uma depois da outra', 'Ouça e toque as duas notas.', earThirds, 10, 55, 84, 0.8, 'off') },
    { kind: 'exercise', id: 'l37-quartas', exercise: items('4ª justa, trítono ou 5ª justa', 'Ouça e toque as duas notas.', earFourths, 12, 55, 84, 0.8, 'off') },
    { kind: 'exercise', id: 'l37-outra-raiz', exercise: items('Desafio: em outra raiz', 'Ouça o intervalo e toque o mesmo intervalo a partir da nota pedida.', earOther, 8, 55, 84, 0.75, 'off') },
    { kind: 'exercise', id: 'l37-quiz', exercise: quiz('Aumentado, diminuto e inversão', 'Oito perguntas rápidas.', AUG_DIM, 0.75) },
  ],
  review: [ivAug, ivBelow, earThirds, earFourths, choice(AUG_DIM, 'inversao')],
  checkpoint: [
    items('Construção', '16 intervalos acima e abaixo, com aumentados e diminutos, sem dicas. Meta: 85%.', mix([ivAbove, ivAug, ivBelow]), 16, 48, 84, 0.85, 'off'),
    items('Ouvido: confundíveis', '15 pares confundíveis, sem dicas. Meta: 80%.', mix([earThirds, earThirdsHarm, earFourths]), 15, 55, 84, 0.8, 'off'),
  ],
  exit: [ivBelow, choice(AUG_DIM, 'inversao')],
};

// i–iv–i–V7–i em posição próxima, mão direita em mínimas e a fundamental na esquerda.
const MINOR_CLOSE: Record<'A' | 'D' | 'E', { r: string; l: string; fifths: number }> = {
  A: { r: 'A3+C4+E4:2 A3+D4+F4:2 | A3+C4+E4:2 G#3+D4+E4:2 | A3+C4+E4:4', l: 'A2:2 D3:2 | A2:2 E2:2 | A2:4', fifths: 0 },
  D: { r: 'D4+F4+A4:2 D4+G4+Bb4:2 | D4+F4+A4:2 C#4+G4+A4:2 | D4+F4+A4:4', l: 'D3:2 G2:2 | D3:2 A2:2 | D3:4', fifths: -1 },
  E: { r: 'E4+G4+B4:2 E4+A4+C5:2 | E4+G4+B4:2 D#4+A4+B4:2 | E4+G4+B4:4', l: 'E3:2 A2:2 | E3:2 B2:2 | E3:4', fifths: 1 },
};
const minorCadTask = (key: 'A' | 'D' | 'E', bpm: number) =>
  twoHandTask(MINOR_CLOSE[key].r, MINOR_CLOSE[key].l, { bpm, fifths: MINOR_CLOSE[key].fifths, caption: `${key === 'A' ? 'Lá' : key === 'D' ? 'Ré' : 'Mi'} menor: i – iv – i – V7 – i em posição próxima, fundamental na esquerda. A pauta mostra a nota mais grave de cada acorde da direita.` });

// Meio-arpejo na mão esquerda sobre vi–IV–I–V em Dó (Am F C G); acordes em semibreve na direita.
const HALF_ARP_158 = 'A2 E3 A3 E3 | F2 C3 F3 C3 | C2 G2 C3 G2 | G2 D3 G3 D3';
const HALF_ARP_1358 = 'A2 C3 E3 A3 | F2 A2 C3 F3 | C2 E2 G2 C3 | G2 B2 D3 G3';
const HALF_ARP_R = 'C4+E4+A4:4 | C4+F4+A4:4 | C4+E4+G4:4 | B3+D4+G4:4';
const halfArp = (left: string, cycles: number, bpm: number) =>
  twoHandTask(Array(cycles).fill(HALF_ARP_R).join(' | '), Array(cycles).fill(left).join(' | '), { bpm, caption: 'Am – F – C – G (vi – IV – I – V em Dó). A pauta mostra a nota mais grave do acorde da direita; a esquerda faz o meio-arpejo em semínimas.' });

const triadsAll = playChord({ symbols: ['Am', 'Dm', 'Em', 'Bm', 'F#m', 'C#m', 'Cm', 'Fm', 'Gm', 'A', 'E', 'D', 'Bb', 'Eb'], low: 48, high: 72, requireBass: true });
const minorDegrees = minorChord({ keys: ['A', 'D', 'E'], degrees: ['i', 'iv', 'V7'], low: 48, high: 72 });

const l38: Lesson = {
  n: 38,
  id: 'l38',
  title: 'Acordes em menor e meio-arpejo',
  minutes: 60,
  objectives: [
    'Consigo montar qualquer tríade menor pelas 3ªs (3ª menor + 3ª maior).',
    'Consigo tocar i–iv–V7 em Lá, Ré e Mi menor, em posição próxima, no tempo.',
    'Consigo tocar o meio-arpejo na mão esquerda sobre Am–F–C–G, 4 ciclos a 72 BPM sem erro.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Tríades pelas terças',
      body: `Na Unidade 3 você montou o acorde maior pela fórmula **4 + 3**: da fundamental até a 3ª, 4 semitons; da 3ª até a 5ª, mais 3. Com os nomes desta unidade, isso é uma **3ª maior** embaixo e uma **3ª menor** em cima.

O **acorde menor** é o contrário: **3ª menor embaixo, 3ª maior em cima** (3 + 4).

- **Lá menor (Am)**: Lá–**Dó** (3ª menor) + Dó–Mi (3ª maior).
- **Fá♯ menor (F♯m)**: Fá♯–**Lá** (3ª menor) + Lá–Dó♯ (3ª maior).
- **Si♭ maior (B♭)**: Si♭–Ré (3ª maior) + Ré–Fá (3ª menor).

Nos dois casos, da fundamental até a 5ª é uma **5ª justa** (7 semitons). Só a nota do meio muda de lugar. Para conferir uma tríade menor, olhe as pontas (5ª justa) e depois o meio (3 semitons acima da fundamental).`,
    },
    { kind: 'exercise', id: 'l38-triades', exercise: items('Tríades maiores e menores', 'Toque o acorde da cifra com a fundamental embaixo. Inclui tônicas pretas.', triadsAll, 14, 48, 72) },
    {
      kind: 'text',
      title: 'i, iv e V7 em menor',
      body: `Os graus de uma tonalidade menor se escrevem em algarismos romanos como na maior, mas com uma convenção: **letra minúscula = acorde menor**, maiúscula = maior.

Os três acordes principais da menor (com a harmônica) são:

- **i** (tônica, menor): Lá menor → **Am**.
- **iv** (subdominante, menor): **Dm**.
- **V7** (dominante, maior com 7ª, graças à sensível): **E7**.

Em **Ré menor**: Dm, **Gm**, **A7** (com Dó♯). Em **Mi menor**: Em, **Am**, **B7** (com Ré♯).

A **posição próxima** funciona como em Dó maior: a mão quase não sai do lugar. Em Lá menor:

- **Am**: Lá–Dó–Mi.
- **Dm**: Lá–Ré–Fá (o Lá fica, os outros sobem).
- **E7**: Sol♯–Ré–Mi. Vindo do Am, o Lá desce meio tom para Sol♯, o Dó sobe para Ré e o Mi fica; a 5ª do E7 (Si) fica de fora.

Compare com o **Si–Fá–Sol** do G7 em Dó: é o mesmo desenho.`,
    },
    {
      kind: 'example',
      title: 'i – iv – i – V7 – i em Lá menor',
      steps: [
        { say: 'Am: Lá, Dó, Mi.', keys: [57, 60, 64], play: { bpm: 66, steps: [{ midis: [45, 57, 60, 64], beats: 2 }] } },
        { say: 'Dm em posição próxima: Lá, Ré, Fá.', keys: [57, 62, 65], play: { bpm: 66, steps: [{ midis: [50, 57, 62, 65], beats: 2 }] } },
        { say: 'E7 em posição próxima: Sol♯, Ré, Mi. Repare no Sol♯ puxando para o Lá.', keys: [56, 62, 64], play: { bpm: 66, steps: [{ midis: [40, 56, 62, 64], beats: 2 }] } },
        { say: 'A progressão inteira.', play: { bpm: 72, steps: [{ midis: [45, 57, 60, 64], beats: 2 }, { midis: [50, 57, 62, 65], beats: 2 }, { midis: [45, 57, 60, 64], beats: 2 }, { midis: [40, 56, 62, 64], beats: 2 }, { midis: [45, 57, 60, 64], beats: 4 }] } },
      ],
    },
    { kind: 'exercise', id: 'l38-graus', exercise: items('Graus em menor', 'O app pede i, iv ou V7 em Lá, Ré ou Mi menor. Qualquer posição; no V7 a 5ª pode faltar.', minorDegrees, 12, 48, 72) },
    { kind: 'exercise', id: 'l38-cadencia', exercise: quickTimed('i – iv – i – V7 – i no tempo', 'Mão direita em posição próxima, fundamental na esquerda, mínimas a 66 BPM. Tonalidade sorteada entre Lá, Ré e Mi menor. Duas passadas boas.', (rng) => minorCadTask(pick(rng, ['A', 'D', 'E'] as const), 66), { reps: 2 }) },
    {
      kind: 'text',
      title: 'O meio-arpejo',
      body: `Até aqui a mão esquerda tocou acordes em bloco, raiz e oitava, ou raiz e 5ª. O próximo padrão espalha o acorde no tempo: o **meio-arpejo**.

- **1-5-8-5**: fundamental, 5ª, oitava, 5ª, em semínimas. Em Lá: **Lá–Mi–Lá–Mi**.
- **1-3-5-8**: fundamental, 3ª, 5ª, oitava. Em Lá menor: **Lá–Dó–Mi–Lá**. Este mostra a cor do acorde (a 3ª).

O dedilhado do 1-5-8-5 na esquerda é **5–2–1–2**: o mínimo na fundamental, o polegar na oitava. No 1-3-5-8, **5–3–2–1**.

O meio-arpejo é o acompanhamento de Für Elise, o projeto final desta unidade: Lá–Mi–Lá e Mi–Mi–Sol♯ na mão esquerda.

Vamos praticar sobre uma progressão muito comum no pop: **Am – F – C – G**. Em Dó maior esses são os graus **vi – IV – I – V**. O vi (Lá menor) é a relativa menor dentro de Dó maior: por isso a progressão soa melancólica sem sair do tom.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'a mão esquerda primeiro, sozinha',
      body: 'Toque só a esquerda até ela andar sozinha, olhando para a próxima fundamental e não para a tecla atual. A troca de acorde acontece no último tempo do compasso: enquanto o polegar toca a 5ª, o mínimo já viaja para a próxima fundamental.',
    },
    {
      kind: 'example',
      title: 'Os dois meio-arpejos',
      steps: [
        { say: '1-5-8-5 sobre Am – F – C – G.', play: { bpm: 88, steps: [45, 52, 57, 52, 41, 48, 53, 48, 36, 43, 48, 43, 43, 50, 55, 50].map((m) => ({ midis: [m], beats: 1 })) } },
        { say: '1-3-5-8: agora a 3ª aparece, e dá para ouvir menor (Am) e maior (F, C, G).', play: { bpm: 88, steps: [45, 48, 52, 57, 41, 45, 48, 53, 36, 40, 43, 48, 43, 47, 50, 55].map((m) => ({ midis: [m], beats: 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l38-me', exercise: quickTimed('Meio-arpejo 1-5-8-5, só a esquerda', 'Am – F – C – G, duas voltas, de 60 a 72 BPM.', () => melodyTask(`${HALF_ARP_158} | ${HALF_ARP_158}`, { bpm: 60, clef: 'bass' }), { ladder: { from: 60, to: 72, step: 4 } }) },
    { kind: 'exercise', id: 'l38-maos', exercise: quickTimed('Meio-arpejo com acordes', 'Acorde em semibreve na direita, 1-5-8-5 na esquerda. Quatro ciclos a 72 BPM.', () => halfArp(HALF_ARP_158, 4, 72), { pass: { accuracy: 0.9 } }) },
    { kind: 'exercise', id: 'l38-1358', exercise: quickTimed('Desafio: 1-3-5-8', 'O mesmo, com a 3ª no meio-arpejo. Dois ciclos a 66 BPM.', () => halfArp(HALF_ARP_1358, 2, 66), { reps: 2 }) },
    { kind: 'song', songId: 'u05-fur-elise', why: 'O projeto final já pode começar: ouça como o meio-arpejo da esquerda (Lá–Mi–Lá, Mi–Mi–Sol♯) sustenta a melodia. Comece pelo modo Estudar, mãos separadas.' },
    { kind: 'exercise', id: 'l38-quiz', exercise: quiz('Acordes em menor', 'Seis perguntas rápidas.', MINOR_CHORDS) },
  ],
  review: [triadsAll, minorDegrees, choice(MINOR_CHORDS, 'acordes-menor')],
  checkpoint: [
    items('i, iv e V7 em menor', '12 acordes em Lá, Ré e Mi menor, sem dicas. Meta: 85%.', mix([minorDegrees, minorDegrees, triadsAll]), 12, 48, 72, 0.85, 'off'),
    quickTimed('Meio-arpejo a 72 BPM', 'Quatro ciclos de Am – F – C – G, sem erro de acorde.', () => halfArp(HALF_ARP_158, 4, 72), { pass: { accuracy: 0.9 } }),
  ],
  exit: [minorDegrees, choice(MINOR_CHORDS, 'acordes-menor')],
};

const RHY_TRI = [
  'x:1/3 x:1/3 x:1/3 x x x',
  'x x:1/3 x:1/3 x:1/3 x:2',
  'x:1/3 x:1/3 x:1/3 x:1/3 x:1/3 x:1/3 x:2',
  'x:2 x:1/3 x:1/3 x:1/3 x',
  'x x x:1/3 x:1/3 x:1/3 x',
];
const RHY_32 = [
  'x:0.5 x:0.5 x:1/3 x:1/3 x:1/3 x:0.5 x:0.5 x:1/3 x:1/3 x:1/3',
  'x:1/3 x:1/3 x:1/3 x:0.5 x:0.5 x:2',
  'x:0.5 x:0.5 x:0.5 x:0.5 x:1/3 x:1/3 x:1/3 x',
  'x:1/3 x:1/3 x:1/3 x:0.5 x:0.5 x:1/3 x:1/3 x:1/3 x:0.5 x:0.5',
];
const TRI_A = 'A4:1/3 B4:1/3 C5:1/3 E5:2 D5 | C5:1/3 B4:1/3 A4:1/3 B4 C5 A4 | D5:1/3 E5:1/3 F5:1/3 A5:2 F5 | E5:1/3 D5:1/3 C5:1/3 B4 G#4 E4';
const TRI_SCALE = 'A4:1/3 B4:1/3 C5:1/3 D5:1/3 E5:1/3 F5:1/3 G#5:1/3 A5:1/3 G#5:1/3 F5:1/3 E5:1/3 D5:1/3 | C5:1/3 B4:1/3 A4:1/3 B4:1/3 C5:1/3 D5:1/3 C5:1/3 B4:1/3 G#4:1/3 A4 | A4:4';

const l39: Lesson = {
  n: 39,
  id: 'l39',
  title: 'Quiálteras: tercinas',
  minutes: 60,
  objectives: [
    'Consigo ler e tocar tercinas de colcheia com as três notas iguais.',
    'Consigo alternar colcheias e tercinas no mesmo compasso, com 85% das notas em ±50 ms.',
    'Consigo tocar uma melodia com tercinas a 60 BPM.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Três no lugar de dois',
      body: `Até agora, um tempo se dividia sempre em **dois**: duas colcheias por semínima. Mas às vezes a música quer dividir o tempo em **três**. Para isso existe a **tercina**: três colcheias tocadas no tempo de duas, escritas com um **3** sobre o grupo.

Cada nota de uma tercina de colcheias vale **um terço de tempo**. A 60 BPM, o tempo dura 1 segundo e cada nota da tercina, um terço de segundo.

O nome geral para essas divisões "fora da regra" é **quiáltera**. A tercina é a mais comum de longe; existem outras (cinco no lugar de quatro, por exemplo), que aparecem em música mais avançada.

Para contar, use uma palavra de três sílabas iguais por tempo: "**ter**-ci-na, **ter**-ci-na". A sílaba forte cai no tempo; as outras duas dividem o resto em partes iguais.`,
    },
    {
      kind: 'example',
      title: 'Colcheias e tercinas',
      steps: [
        { say: 'Colcheias: duas notas por tempo. "Um-e, dois-e".', play: { bpm: 60, steps: [64, 64, 64, 64, 64, 64, 64, 64].map((m) => ({ midis: [m], beats: 0.5 })) } },
        { say: 'Tercinas: três notas por tempo. "Ter-ci-na, ter-ci-na".', play: { bpm: 60, steps: Array.from({ length: 12 }, () => ({ midis: [64], beats: 1 / 3 })) } },
        { say: 'Alternando: dois tempos de colcheias e dois de tercinas. O tempo não muda; só a divisão.', play: { bpm: 60, steps: [...Array.from({ length: 4 }, () => ({ midis: [64], beats: 0.5 })), ...Array.from({ length: 6 }, () => ({ midis: [67], beats: 1 / 3 }))] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'o galope',
      body: 'O erro mais comum é tocar a tercina como "curta-curta-longa" (ou "longa-curta-curta"), um galope. As três notas têm o mesmo tamanho. Grave-se falando "ter-ci-na" com o metrônomo: se uma sílaba estica, os dedos também vão esticar.',
    },
    { kind: 'exercise', id: 'l39-tercinas', exercise: quickTimed('Tercinas em qualquer tecla', 'Dois compassos sorteados a 60 BPM. Uma tecla por nota, as três da tercina bem iguais. Janela de ±60 ms, duas passadas boas.', randomRhythm(RHY_TRI, 2, 60), { reps: 2, window: 60 }) },
    {
      kind: 'text',
      title: 'Dois e três em sequência',
      body: `A parte difícil não é a tercina sozinha, é a **troca**: colcheias num tempo, tercinas no seguinte. O cérebro tende a "arrastar" uma divisão para a outra, deixando as tercinas meio colcheias ou as colcheias meio tercinas.

O segredo é pensar **no tempo, não na nota**. O pulso fica parado como um relógio; você só escolhe se divide cada batida em 2 ou em 3. Conte em voz alta: "**um**-e, **dois**-e, **ter**-ci-na, **ter**-ci-na".

Esta lição pede a **sequência** (2 num tempo, 3 no outro). Tocar 3 numa mão e 2 na outra **ao mesmo tempo** (a "polirritmia" 3 contra 2) é outro desafio, que fica para mais adiante.`,
    },
    { kind: 'exercise', id: 'l39-alterna', exercise: quickTimed('Colcheias e tercinas alternadas', 'Compassos sorteados, de 54 a 66 BPM. Janela de ±50 ms.', randomRhythm(RHY_32, 2, 54), { window: 50, ladder: { from: 54, to: 66, step: 4 } }) },
    {
      kind: 'text',
      title: 'Tercinas na melodia',
      body: `Na melodia, a tercina costuma aparecer como um **floreio** que leva de uma nota a outra: três notas rápidas subindo ou descendo até a nota longa. É o caso da peça desta lição, **Tercinas em Lá menor**, uma melodia original escrita para o curso.

Ela junta tudo da unidade: Lá menor com o **Sol♯** da harmônica, a mão esquerda nas fundamentais de i, iv e V (Lá, Ré e Mi) e uma tercina abrindo quase todos os compassos.

Toque primeiro só o ritmo na tecla Lá, depois as notas devagar. A tercina tem que chegar **no tempo** da nota longa, sem atrasar a chegada.`,
    },
    { kind: 'exercise', id: 'l39-escala', exercise: quickTimed('Lá menor harmônica em tercinas', 'A escala subindo e descendo em tercinas, a 50 BPM. Dedilhado de sempre; a passagem do polegar cai em lugares novos do tempo. Duas passadas boas.', () => melodyTask(TRI_SCALE, { bpm: 50 }), { reps: 2, window: 60 }) },
    { kind: 'exercise', id: 'l39-melodia', exercise: quickTimed('Tercinas em Lá menor, 4 compassos', 'Mão direita, de 48 a 60 BPM. Janela de ±60 ms.', () => melodyTask(TRI_A, { bpm: 48 }), { window: 60, ladder: { from: 48, to: 60, step: 4 } }) },
    { kind: 'song', songId: 'u05-tercinas', why: 'A peça inteira, com a mão esquerda. Use o modo Estudar nas tercinas e depois o "Tocar junto" a 60 BPM.' },
    { kind: 'exercise', id: 'l39-quiz', exercise: quiz('Tercinas', 'Quatro perguntas rápidas.', TRIPLETS, 0.75) },
  ],
  review: [choice(TRIPLETS, 'tercinas'), minorDegrees],
  checkpoint: [
    quickTimed('Colcheias e tercinas a 66 BPM', 'Quatro compassos sorteados, sem dicas. Meta: 85% em ±50 ms.', randomRhythm([...RHY_TRI, ...RHY_32], 4, 66), { window: 50 }),
    quickTimed('Melodia com tercinas a 60 BPM', 'Os 4 primeiros compassos de Tercinas em Lá menor.', () => melodyTask(TRI_A, { bpm: 60 }), { window: 60 }),
  ],
  exit: [choice(TRIPLETS, 'tercinas'), ivBelow],
};

// ---------- músicas ----------

// Für Elise (Beethoven, 1810), tema A. Arranjo do Fermata: 3/4 com valores dobrados.
const FE_A = 'E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5';
const furElise: SongSpec = {
  id: 'u05-fur-elise',
  title: 'Für Elise, tema A',
  composer: 'Ludwig van Beethoven',
  arrangement: 'arranjo do Fermata: em 3/4 com os valores dobrados (colcheias no lugar das semicolcheias), só o tema A, final em Lá; mão esquerda em meio-arpejo; pedal a critério do aluno',
  bpm: 60,
  beatsPerBar: 3,
  fifths: 0,
  right: `r:2 E5:0.5 D#5:0.5 | ${FE_A} | A4 r:0.5 C4:0.5 E4:0.5 A4:0.5 | B4 r:0.5 E4:0.5 G#4:0.5 B4:0.5 | C5 r:0.5 E4:0.5 E5:0.5 D#5:0.5 | ${FE_A} | A4 r:0.5 C4:0.5 E4:0.5 A4:0.5 | B4 r:0.5 E4:0.5 C5:0.5 B4:0.5 | A4:3`,
  left: 'r:3 | r:3 | A2:0.5 E3:0.5 A3:0.5 r:1.5 | E2:0.5 E3:0.5 G#3:0.5 r:1.5 | A2:0.5 E3:0.5 A3:0.5 r:1.5 | r:3 | A2:0.5 E3:0.5 A3:0.5 r:1.5 | E2:0.5 E3:0.5 G#3:0.5 r:1.5 | A2:0.5 E3:0.5 A3:2',
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Melodia original do Fermata para as tercinas (lição 39).
const triplets: SongSpec = {
  id: 'u05-tercinas',
  title: 'Tercinas em Lá menor',
  composer: 'melodia original do Fermata',
  arrangement: 'mão esquerda em mínimas e semibreves: i, iv e V de Lá menor',
  bpm: 60,
  beatsPerBar: 4,
  fifths: 0,
  right: 'A4:1/3 B4:1/3 C5:1/3 E5:2 D5 | C5:1/3 B4:1/3 A4:1/3 B4 C5 A4 | D5:1/3 E5:1/3 F5:1/3 A5:2 F5 | E5:1/3 D5:1/3 C5:1/3 B4 G#4 E4 | A4:1/3 B4:1/3 C5:1/3 E5:2 D5 | C5:1/3 B4:1/3 A4:1/3 B4 C5 D5 | E5:1/3 D5:1/3 C5:1/3 B4:1/3 C5:1/3 D5:1/3 E5 G#4 | A4:4',
  left: 'A2:4 | A2:2 E3:2 | D3:4 | E2:4 | A2:4 | A2:2 D3:2 | E2:4 | A2:4',
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// Brilha, brilha (melodia folclórica francesa, "Ah! vous dirai-je, maman"): a mesma melodia em Dó maior e em Dó menor (lição 41).
const TW_MAJ = 'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2';
const TW_MIN = 'C4 C4 G4 G4 | Ab4 Ab4 G4:2 | F4 F4 Eb4 Eb4 | D4 D4 C4:2 | G4 G4 F4 F4 | Eb4 Eb4 D4:2 | G4 G4 F4 F4 | Eb4 Eb4 D4:2 | C4 C4 G4 G4 | Ab4 Ab4 G4:2 | F4 F4 Eb4 Eb4 | D4 D4 C4:2';
type Fn = 'T' | 'S' | 'D';
const TW_HARM: [Fn, Fn][] = [['T', 'T'], ['S', 'T'], ['S', 'T'], ['D', 'T'], ['T', 'D'], ['T', 'D'], ['T', 'D'], ['T', 'D'], ['T', 'T'], ['S', 'T'], ['S', 'T'], ['D', 'T']];
const VOICE_MAJ: Record<Fn, string> = { T: 'C3+E3+G3', S: 'C3+F3+A3', D: 'B2+F3+G3' };
const VOICE_MIN: Record<Fn, string> = { T: 'C3+Eb3+G3', S: 'C3+F3+Ab3', D: 'B2+F3+G3' };
const twLeft = (v: Record<Fn, string>) => TW_HARM.map(([a, b]) => `${v[a]}:2 ${v[b]}:2`).join(' | ');

const twMajor: SongSpec = {
  id: 'u05-brilha-maior',
  title: 'Brilha, brilha em Dó maior',
  composer: 'melodia folclórica francesa',
  arrangement: 'arranjo do Fermata: I, IV e V7 em mínimas na mão esquerda, posição próxima',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: TW_MAJ,
  left: twLeft(VOICE_MAJ),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const twMinor: SongSpec = {
  id: 'u05-brilha-menor',
  title: 'Brilha, brilha em Dó menor',
  composer: 'melodia folclórica francesa',
  arrangement: 'arranjo do Fermata: a mesma melodia no homônimo menor (harmônica), com i, iv e V7 em mínimas',
  bpm: 66,
  beatsPerBar: 4,
  fifths: -3,
  right: TW_MIN,
  left: twLeft(VOICE_MIN),
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const EAR_MINOR: ChoiceQuestion[] = [
  { q: 'Em Lá menor, o 3º grau é…', options: ['Dó', 'Dó♯', 'Si'], answer: 0, why: 'A 3ª menor acima de Lá: Dó. É a nota que dá a cor menor.' },
  { q: 'Em menor, qual grau puxa com mais força para a tônica, subindo?', options: ['O 7º elevado (a sensível)', 'O 7º natural', 'O 4º'], answer: 0, why: 'A sensível fica a meio tom da tônica: Sol♯ → Lá.' },
  { q: 'O 6º grau menor (Fá em Lá menor) tende a…', options: ['Descer meio tom para o 5º', 'Subir para a tônica', 'Ficar parado'], answer: 0, why: 'Fá → Mi: meio tom para baixo, um suspiro.' },
  { q: 'Dó maior e Dó menor são tonalidades…', options: ['Homônimas: mesma tônica, armaduras diferentes', 'Relativas: mesma armadura', 'Vizinhas no círculo'], answer: 0, why: 'Dó maior (sem acidentes) e Dó menor (3 bemóis).' },
  { q: 'Para passar uma melodia de Dó maior para Dó menor (harmônica), você abaixa…', options: ['O 3º e o 6º graus (Mi e Lá)', 'Só o 7º', 'Todas as notas'], answer: 0, why: 'Mi → Mi♭, Lá → Lá♭. O Si fica natural: é a sensível.' },
  { q: 'A armadura de Dó menor tem…', options: ['3 bemóis: Si♭, Mi♭, Lá♭', '1 bemol', 'Nenhum acidente'], answer: 0, why: 'É a armadura de Mi♭ maior, a relativa. Na harmônica, o Si♭ vira Si natural escrito na nota.' },
];

const earMajor7 = degreeByEar({ tonic: 60, degrees: [1, 2, 3, 4, 5, 6, 7] });
const earMinor = degreeByEar({ tonic: 57, degrees: [1, 2, 3, 4, 5, 6, 8], mode: 'menor' });
const earMinorAll = degreeByEar({ tonic: 57, degrees: [1, 2, 3, 4, 5, 6, 7, 8], mode: 'menor' });
const MOTIFS_MINOR = [
  [69, 71, 72, 71, 69], [76, 74, 72, 71, 69], [69, 72, 76, 72, 69], [68, 69, 71, 72], [76, 72, 71, 68, 69],
  [72, 71, 69, 68, 69], [64, 69, 72, 71, 69], [69, 76, 74, 72, 71], [77, 76, 74, 72], [71, 68, 69, 64],
];
const MOTIFS_MAJOR = [
  [60, 64, 67, 64, 60], [67, 65, 64, 62, 60], [60, 67, 65, 64, 62], [64, 60, 65, 62, 67], [72, 67, 64, 65, 67],
  [62, 65, 64, 60], [67, 72, 71, 69, 67], [60, 62, 64, 67, 60],
];
const echoMinor = echo({ motifs: MOTIFS_MINOR, bpm: 96, skill: 'ditado-menor' });
const echoMajor = echo({ motifs: MOTIFS_MAJOR, bpm: 96, skill: 'ditado-maior' });

const l40: Lesson = {
  n: 40,
  id: 'l40',
  title: 'Ouvido 3: graus em maior e menor',
  minutes: 60,
  objectives: [
    'Consigo reconhecer os 7 graus de Dó maior depois de uma cadência, com 85% de acerto.',
    'Consigo reconhecer os graus de Lá menor, inclusive a sensível, depois de uma cadência menor.',
    'Consigo repetir de ouvido uma melodia de 4 a 5 notas, com saltos, em maior e em menor.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Cada grau tem um papel',
      body: `Na Unidade 1 você ouviu o 1, o 3 e o 5; na Unidade 4, os graus de 1 a 6. Agora, os **sete graus**, em maior e em menor.

O segredo de ouvir graus não é decorar alturas: é sentir **para onde cada nota quer ir** depois que a cadência mostrou a casa.

- **1**: repouso total.
- **2**: quer descer para o 1.
- **3**: repousa, com cor (maior ou menor).
- **4**: quer descer meio tom para o 3 (em maior).
- **5**: estável, mas aberto, como uma pergunta.
- **6**: em maior, leve, quer descer para o 5.
- **7**: em maior, a **sensível**: tensão máxima, quer subir meio tom para o 1.

Quando ouvir uma nota, cante por dentro o caminho até a casa. Se ela desce um passo e chega, era o 2. Se sobe meio tom e chega, era o 7.`,
    },
    { kind: 'exercise', id: 'l40-maior', exercise: items('Os 7 graus em Dó maior', 'Depois da cadência, toque a nota que ouviu, em qualquer oitava.', earMajor7, 14, 55, 79, 0.85, 'off') },
    {
      kind: 'text',
      title: 'Os graus em menor',
      body: `Em menor, a cadência muda (**i – iv – V – i**: Am, Dm, E, Am) e alguns graus mudam de cor:

- O **3** é menor (Dó em Lá menor): ainda repousa, mas escuro.
- O **6** é menor (Fá): pesado, quer **descer meio tom** para o 5 (Mi), como um suspiro.
- O **7** tem duas versões. O **natural** (Sol) fica a um tom da casa e não puxa; soa "antigo", modal. O **elevado** (Sol♯), a sensível, puxa forte para o Lá, exatamente como o Si em Dó maior.

O app chama o 7 natural de "7 natural" e o elevado de "7 elevado (sensível)". No primeiro exercício só aparece a sensível; o desafio mistura os dois.`,
    },
    {
      kind: 'example',
      title: 'A cadência menor e três graus',
      steps: [
        { say: 'A cadência em Lá menor: Am, Dm, E, Am.', play: { bpm: 96, steps: [{ midis: [45, 57, 60, 64], beats: 1 }, { midis: [50, 57, 62, 65], beats: 1 }, { midis: [52, 56, 59, 64], beats: 1 }, { midis: [45, 57, 60, 64], beats: 2 }] } },
        { say: 'O **3**, Dó: repousa, escuro.', keys: [60], play: { bpm: 80, steps: [{ midis: [60], beats: 2 }] } },
        { say: 'O **6**, Fá: pesa e desce para o Mi.', keys: [65, 64], play: { bpm: 80, steps: [{ midis: [65], beats: 2 }, { midis: [64], beats: 2 }] } },
        { say: 'O **7 elevado**, Sol♯: sobe para o Lá.', keys: [68, 69], play: { bpm: 80, steps: [{ midis: [68], beats: 2 }, { midis: [69], beats: 2 }] } },
      ],
    },
    { kind: 'exercise', id: 'l40-menor', exercise: items('Graus em Lá menor', 'Depois da cadência menor, toque a nota que ouviu. O 7 é sempre a sensível (Sol♯).', earMinor, 14, 55, 79, 0.85, 'off') },
    { kind: 'exercise', id: 'l40-desafio', exercise: items('Desafio: 7 natural ou sensível', 'Agora o 7 pode ser Sol ou Sol♯. Ouça se a nota puxa para a casa ou não.', earMinorAll, 12, 55, 79, 0.8, 'off') },
    {
      kind: 'text',
      title: 'Melodias de um compasso',
      body: `O passo seguinte é ouvir **várias notas seguidas**: uma melodia curta, de 4 ou 5 notas, que cabe num compasso. É um **ditado**: o app toca, você repete.

Não tente lembrar nota por nota. Ouça em camadas:

1. **Contorno**: sobe, desce, faz curva?
2. **Passos e saltos**: onde ela pula?
3. **Graus**: em que grau começa e em que grau termina? A primeira nota é dita no enunciado; a última quase sempre é 1, 3 ou 5.

Cante a melodia uma vez antes de tocar. Se a voz acerta, os dedos acertam.

Nos músicos que tiram música de ouvido, esse é o passo mais importante: transformar som em graus e graus em teclas.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'ouça de novo antes de tocar',
      body: 'O botão de ouvir de novo não é trapaça. Ouça uma vez para o contorno, outra para os graus, e só então toque. O que conta é a primeira tentativa no teclado, não no ouvido.',
    },
    { kind: 'exercise', id: 'l40-ditado-maior', exercise: items('Ditado em Dó maior', 'O app toca 4 ou 5 notas, com saltos. Repita nas mesmas teclas.', echoMajor, 8, 55, 79, 0.8, 'off') },
    { kind: 'exercise', id: 'l40-ditado-menor', exercise: items('Ditado em Lá menor', 'Agora em menor, com o Sol♯ e o Fá. Repita nas mesmas teclas.', echoMinor, 8, 55, 79, 0.8, 'off') },
    { kind: 'exercise', id: 'l40-quiz', exercise: quiz('Graus em menor e homônimos', 'Seis perguntas rápidas.', EAR_MINOR) },
  ],
  review: [earMajor7, earMinor, echoMinor, choice(EAR_MINOR, 'graus-menor')],
  checkpoint: [
    items('Graus em maior e menor', '16 notas depois de cadências em Dó maior e Lá menor, sem dicas. Meta: 85%.', mix([earMajor7, earMinor]), 16, 55, 79, 0.85, 'off'),
    items('Ditado', '8 melodias curtas, em maior e menor. Meta: 80%.', mix([echoMajor, echoMinor]), 8, 55, 79, 0.8, 'off'),
  ],
  exit: [earMinor, choice(EAR_MINOR, 'graus-menor')],
};

/** Escala menor harmônica de 2 oitavas em colcheias (sobe 2 compassos, desce 2), mão direita a partir de Lá3. */
function twoOctaves(tonic: Midi): string {
  const h = [0, 2, 3, 5, 7, 8, 11];
  const up = [...h, ...h.map((x) => x + 12), 24];
  const down = [...up].reverse();
  const line = (xs: number[]) => xs.map((x) => `${sci(tonic + x)}:0.5`);
  const u = line(up);
  const d = line(down);
  return `${u.slice(0, 8).join(' ')} | ${u.slice(8).join(' ')} r:0.5 | ${d.slice(0, 8).join(' ')} | ${d.slice(8).join(' ')} r:0.5 | ${sci(tonic)}:4`;
}

const TW_MAJ_A = 'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2';
const TW_MIN_A = 'C4 C4 G4 G4 | Ab4 Ab4 G4:2 | F4 F4 Eb4 Eb4 | D4 D4 C4:2';
const TW_MIN_LEFT_A = 'C3+Eb3+G3:2 C3+Eb3+G3:2 | C3+F3+Ab3:2 C3+Eb3+G3:2 | C3+F3+Ab3:2 C3+Eb3+G3:2 | B2+F3+G3:2 C3+Eb3+G3:2';

const l41: Lesson = {
  n: 41,
  id: 'l41',
  title: 'Checkpoint da unidade 5 e projeto: mesma melodia, dois modos',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint misto da unidade 5, sem dicas.',
    'Consigo passar uma melodia de maior para o homônimo menor (harmônica) e acompanhá-la com i, iv e V7.',
    'Consigo tocar Lá menor harmônica em 2 oitavas, mãos separadas, a pelo menos 52 BPM em colcheias.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que a unidade juntou',
      body: `Em sete lições você ganhou o outro lado da música tonal: o **modo menor**. Relativas, as três formas da escala, a sensível e o V maior, intervalos com nome completo (maior, menor, justo, aumentado, diminuto), inversão, tríades pelas terças, i–iv–V7, o meio-arpejo, as tercinas e os graus de ouvido nos dois modos.

O checkpoint de hoje mistura tudo isso, sem dicas. Depois vem o projeto, que usa quase tudo de uma vez.`,
    },
    {
      kind: 'text',
      title: 'Homônimo: mesma casa, outro modo',
      body: `**Relativas** (lição 34) têm a mesma armadura e casas diferentes: Dó maior e Lá menor. **Homônimas** têm a **mesma casa** e armaduras diferentes: **Dó maior** e **Dó menor**.

Passar uma melodia de maior para o homônimo menor é trocar a cor sem mudar o desenho. A receita, com a menor harmônica:

- Abaixe o **3º grau**: Mi → **Mi♭**.
- Abaixe o **6º grau**: Lá → **Lá♭**.
- Deixe o **7º grau** como está: **Si natural**, a sensível.
- Nos acordes: I → **i** (Cm), IV → **iv** (Fm), e o V7 continua **G7** (Sol, Si, Ré, Fá).

A armadura de Dó menor tem 3 bemóis (Si♭, Mi♭, Lá♭), a de Mi♭ maior, sua relativa. Como a harmônica usa Si natural, ele aparece escrito com bequadro.

Gustav Mahler fez exatamente isso no 3º movimento da Sinfonia nº 1 (1888): pegou a canção infantil "Frère Jacques" e a transformou numa marcha fúnebre em menor. A melodia é a mesma; o efeito é outro mundo.`,
    },
    {
      kind: 'example',
      title: 'Brilha, brilha nos dois modos',
      steps: [
        { say: 'Em Dó maior, com C e F na esquerda.', play: { bpm: 96, steps: [[60, 48, 52, 55], [60], [67, 48, 52, 55], [67], [69, 53, 57, 60], [69], [67, 48, 52, 55]].map((midis, i) => ({ midis, beats: i === 6 ? 2 : 1 })) } },
        { say: 'Em Dó menor: Lá♭ no lugar de Lá, Cm e Fm no lugar de C e F. O Mi♭ aparece logo depois, no compasso 3.', keys: [63, 68], play: { bpm: 88, steps: [[60, 48, 51, 55], [60], [67, 48, 51, 55], [67], [68, 53, 56, 60], [68], [67, 48, 51, 55]].map((midis, i) => ({ midis, beats: i === 6 ? 2 : 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l41-maior', exercise: quickTimed('A melodia em Dó maior', 'Os 4 primeiros compassos de Brilha, brilha, mão direita, a 72 BPM.', () => melodyTask(TW_MAJ_A, { bpm: 72 }), { reps: 2 }) },
    { kind: 'exercise', id: 'l41-menor', exercise: quickTimed('A mesma melodia em Dó menor', 'Agora com Mi♭ e Lá♭, a 72 BPM. A pauta já tem a armadura de 3 bemóis.', () => melodyTask(TW_MIN_A, { bpm: 72, fifths: -3 }), { reps: 2 }) },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer um grau no caminho',
      body: 'O erro típico é abaixar o 3º grau e esquecer o 6º (tocar Lá em vez de Lá♭ no compasso 2), ou abaixar demais e trocar o Si natural do G7 por Si♭. Antes de tocar, diga em voz alta as três notas que mudam e a que não muda: Mi♭, Lá♭, Si natural.',
    },
    { kind: 'exercise', id: 'l41-acordes', exercise: quickTimed('i, iv e V7 com pedal legato', 'Melodia em Dó menor com os acordes da esquerda em mínimas (Cm, Fm, G7), a 60 BPM. Troque o pedal logo depois de cada acorde.', () => twoHandTask(TW_MIN_A, TW_MIN_LEFT_A, { bpm: 60, fifths: -3, caption: 'Esquerda: Cm Cm | Fm Cm | Fm Cm | G7 Cm, em posição próxima.' }), { reps: 2, pedal: 'legato' }) },
    { kind: 'song', songId: 'u05-brilha-maior', why: 'A versão em Dó maior inteira, para comparar.' },
    { kind: 'song', songId: 'u05-brilha-menor', why: 'A versão em Dó menor inteira: é a peça do projeto.' },
    {
      kind: 'text',
      title: 'A meta técnica: 2 oitavas',
      body: `A unidade fecha com a escala menor harmônica em **duas oitavas**, mãos separadas. A meta de referência é 69 BPM em colcheias; para passar, basta **75% dela, 52 BPM**, com as notas iguais.

O dedilhado de Lá menor em 2 oitavas na mão direita é **1 2 3 · 1 2 3 4 · 1 2 3 · 1 2 3 4 5**: o polegar passa no Ré e no Lá do meio, e depois no Ré de novo. O 4 cai no Sol♯ de cada oitava. Na esquerda: **5 4 3 2 1 · 3 2 1 · 4 3 2 1 · 3 2 1**.

Na passagem do meio (o Lá que liga as duas oitavas), o antebraço continua andando de lado, sem parar.`,
    },
    { kind: 'exercise', id: 'l41-escala', exercise: quickTimed('Lá menor harmônica em 2 oitavas', 'Mão direita, colcheias, de 44 a 52 BPM. Variação até 40 ms.', () => melodyTask(twoOctaves(57), { bpm: 44 }), { ladder: { from: 44, to: 52, step: 4 }, evenness: 40 }) },
    { kind: 'exercise', id: 'l41-escala-me', exercise: quickTimed('Lá menor harmônica em 2 oitavas, esquerda', 'A partir do Lá2, de 44 a 52 BPM.', () => melodyTask(twoOctaves(45), { bpm: 44, clef: 'bass' }), { ladder: { from: 44, to: 52, step: 4 }, evenness: 40 }) },
    { kind: 'song', songId: 'u05-fur-elise', why: 'O projeto final da unidade: Für Elise, tema A. Mão direita sozinha no modo Estudar, depois a esquerda, depois juntas a 50 BPM até chegar em 60.' },
  ],
  review: [relKeys, allForms, ivAbove, ivBelow, earMinor, minorDegrees],
  checkpoint: [
    {
      kind: 'items',
      title: 'Checkpoint da unidade 5',
      how: '24 perguntas misturadas: relativas, escalas menores, intervalos, acordes e cadências em menor, ouvido. Meta: 85%.',
      gen: mix([relKeys, allForms, ivAbove, ivAug, ivBelow, ivSpell, majMinEar, earThirds, minorDegrees, cadMinor, earMinor, choice([...RELATIVE, ...FORMS, ...QUALITY, ...AUG_DIM, ...MINOR_CHORDS, ...TRIPLETS, ...EAR_MINOR])]),
      count: 24,
      low: 48,
      high: 84,
      labels: 'off',
      pass: { accuracy: 0.85 },
    },
    quickTimed('Tercinas e colcheias', '4 compassos sorteados a 66 BPM, ±50 ms.', randomRhythm([...RHY_TRI, ...RHY_32], 4, 66), { window: 50 }),
    quickTimed('Escala em 2 oitavas a 52 BPM', 'Lá menor harmônica, mão direita, sem dicas. Variação até 40 ms.', () => melodyTask(twoOctaves(57), { bpm: 52 }), { evenness: 40 }),
  ],
  project: {
    title: 'Mesma melodia, dois modos',
    brief: `Toque **Brilha, brilha** inteira (12 compassos) em **Dó maior** com I, IV e V7, e depois em **Dó menor** (harmônica) com i, iv e V7, **com pedal legato** a cada acorde. As duas versões seguidas, como uma pequena peça em duas partes.`,
    steps: [
      'Toque a versão maior no "Tocar a música" até passar a 72 BPM.',
      'Escreva (ou diga) as notas que mudam na versão menor: Mi → Mi♭, Lá → Lá♭; o Si do G7 fica natural.',
      'Toque a melodia menor só com a direita, depois os acordes só com a esquerda.',
      'Junte as mãos devagar e acrescente o pedal legato: troque logo depois de cada acorde.',
      'Toque as duas versões em sequência e grave. Ouça: o que muda no clima? Onde a sensível (Si) aparece?',
      'Passe o exercício abaixo: a versão menor inteira com pedal.',
    ],
    rubric: [
      'As duas versões passaram com 85% ou mais das notas.',
      'Na versão menor, nenhum Mi ou Lá natural escapou, e o G7 manteve o Si natural.',
      'O pedal ficou limpo: sem lama nas trocas e sem pedal preso no fim.',
      'Dá para ouvir a diferença de cor entre as versões, não só de notas.',
      'A escala de Lá menor harmônica em 2 oitavas passou a 52 BPM ou mais.',
    ],
    exercise: { kind: 'timed', title: 'Brilha, brilha em Dó menor com pedal', how: 'Os 12 compassos, duas mãos, a 60 BPM, pedal legato.', gen: () => twoHandTask(twMinor.right, twMinor.left!, { bpm: 60, fifths: -3 }), reps: 1, window: 100, pass: { accuracy: 0.85 }, pedal: 'legato' },
  },
  exit: [earMinor, ivBelow, choice([...RELATIVE, ...FORMS, ...AUG_DIM, ...EAR_MINOR])],
};

const unit: Unit = {
  n: 5,
  id: 'u05',
  title: 'Modo menor e intervalos',
  goal: 'Tocar as três formas da escala menor, resolver cadências em menor, dar nome completo aos intervalos e reconhecer maior e menor de ouvido.',
  technique: 'Escalas menores de Lá, Mi e Ré (natural, harmônica e melódica), uma oitava, mãos separadas, em colcheias de 45 rumo a 69 BPM, com variação abaixo de 40 ms (referência: RCM Level 1). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l34, l35, l36, l37, l38, l39, l40, l41],
  songs: [furElise, triplets, twMajor, twMinor],
  final: {
    songId: 'u05-fur-elise',
    brief: 'O tema A de Für Elise, a peça mais famosa em Lá menor: o vaivém Mi–Ré♯ (a sensível de Mi, o V), a mão esquerda em meio-arpejo (Lá–Mi–Lá e Mi–Mi–Sol♯) e o Sol♯ da menor harmônica que puxa de volta para o Lá. Escrito em 3/4 com valores dobrados para a leitura ficar mais fácil; o som é o mesmo.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [relKeys, majMinEar, minorTriads, naturalScales, harmonicScales, allForms, cadMinor, fiveMinor, ivAbove, ivSpell, earContrast, ivAug, ivBelow, earThirds, earThirdsHarm, earFourths, earOther, triadsAll, minorDegrees, earMajor7, earMinor, earMinorAll, echoMinor, echoMajor];
