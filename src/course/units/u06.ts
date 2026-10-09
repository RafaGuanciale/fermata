// Unidade 6 — Tríades, inversões e condução de vozes (lições 42 a 49). Projeto final: canção em I–V–vi–IV pela cifra (melodia original).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { chordQualityByEar, chordSequence, choice, inversionChord, mix, playChord, spellTriadChoice, type ChoiceQuestion } from '../gens';
import { pick } from '../music';
import { compoundRhythm, compoundTask, melodyTask, twoHandTask } from '../tasks';
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

// ---------- acordes ----------

const MAJ = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MIN = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];
const DIM = ['B°', 'C#°', 'D°', 'E°', 'F#°', 'G#°', 'A°'];
const AUG = ['C+', 'D+', 'Eb+', 'F+', 'G+', 'Ab+', 'Bb+'];

/** I–V–vi–IV em cada tonalidade. */
const POP: Record<string, string[]> = {
  C: ['C', 'G', 'Am', 'F'],
  G: ['G', 'D', 'Em', 'C'],
  F: ['F', 'C', 'Dm', 'Bb'],
  D: ['D', 'A', 'Bm', 'G'],
};
const KEY_PT: Record<string, string> = { C: 'Dó', G: 'Sol', F: 'Fá', D: 'Ré' };

// ---------- perguntas ----------

const TRIADS: ChoiceQuestion[] = [
  { q: 'A tríade diminuta é…', options: ['Duas 3ªs menores', 'Duas 3ªs maiores', '3ª maior + 3ª menor'], answer: 0, why: 'Si–Ré (3m) + Ré–Fá (3m): a 5ª fica diminuta (6 semitons).' },
  { q: 'A tríade aumentada é…', options: ['Duas 3ªs maiores', 'Duas 3ªs menores', '3ª menor + 3ª maior'], answer: 0, why: 'Dó–Mi (3M) + Mi–Sol♯ (3M): a 5ª fica aumentada (8 semitons).' },
  { q: 'Em Dó maior, a tríade diminuta está no…', options: ['7º grau (Si°)', '2º grau', '5º grau'], answer: 0, why: 'Si, Ré, Fá: o trítono Si–Fá do G7 sem o Sol.' },
  { q: 'Qual tríade divide a oitava em três partes iguais?', options: ['A aumentada', 'A diminuta', 'A menor'], answer: 0, why: '4 + 4 + 4 = 12. Por isso C+, E+ e G♯+ têm as mesmas teclas.' },
  { q: 'As notas de F♯ (Fá♯ maior) são…', options: ['Fá♯, Lá♯, Dó♯', 'Fá♯, Si♭, Dó♯', 'Fá♯, Lá, Dó♯'], answer: 0, why: 'Uma letra sim, outra não: Fá, Lá, Dó. Depois os acidentes que dão 3M + 3m.' },
  { q: 'Na cifra, ° e + significam…', options: ['Diminuto e aumentado', 'Com 7ª e sem 3ª', 'Menor e maior'], answer: 0, why: 'B° = Si diminuto; C+ = Dó aumentado (também escritos Bdim e Caug).' },
];

const INVERSIONS: ChoiceQuestion[] = [
  { q: 'Na 1ª inversão, a nota mais grave é…', options: ['A 3ª do acorde', 'A 5ª', 'A fundamental'], answer: 0, why: 'C/E: Mi no baixo.' },
  { q: 'Na 2ª inversão, a nota mais grave é…', options: ['A 5ª do acorde', 'A 3ª', 'A fundamental'], answer: 0, why: 'C/G: Sol no baixo.' },
  { q: 'A cifra C/E pede…', options: ['Acorde de Dó com Mi no baixo', 'Dó e depois Mi', 'Dó menor'], answer: 0, why: 'Depois da barra vem a nota do baixo.' },
  { q: 'Inverter um acorde muda…', options: ['Só a disposição e o baixo, não o nome', 'O nome do acorde', 'A qualidade'], answer: 0, why: 'Dó–Mi–Sol, Mi–Sol–Dó e Sol–Dó–Mi são todos Dó maior.' },
  { q: 'Am/C é…', options: ['Lá menor na 1ª inversão', 'Dó maior', 'Lá menor na 2ª inversão'], answer: 0, why: 'Dó é a 3ª de Lá menor.' },
];

const VOICE: ChoiceQuestion[] = [
  { q: 'A primeira regra da condução de vozes é…', options: ['Notas comuns ficam paradas', 'Todas as vozes pulam juntas', 'Sempre tocar no estado fundamental'], answer: 0, why: 'C → Am: Dó e Mi ficam, só o Sol anda para Lá.' },
  { q: 'As vozes que mudam devem andar…', options: ['Por grau conjunto, o mínimo possível', 'Por saltos de oitava', 'Sempre para cima'], answer: 0, why: 'É o que deixa a troca lisa e a mão parada.' },
  { q: 'I–V–vi–IV em Sol maior é…', options: ['G – D – Em – C', 'G – C – D – Em', 'G – D – E – C'], answer: 0, why: 'I = Sol, V = Ré, vi = Mi menor, IV = Dó.' },
  { q: 'De C (Dó–Mi–Sol) para G, o caminho mais curto é…', options: ['Si–Ré–Sol', 'Sol–Si–Ré', 'Ré–Sol–Si'], answer: 0, why: 'Dó desce para Si, Mi desce para Ré, Sol fica: 3 semitons ao todo.' },
  { q: 'Por que conduzir as vozes?', options: ['A troca soa lisa e a mão quase não se move', 'Para tocar mais forte', 'Para mudar a cifra'], answer: 0, why: 'Pianistas de pop e de igreja tocam assim: a mão fica numa região.' },
];

// ---------- peças reaproveitadas ----------

const chords12 = playChord({ symbols: [...MAJ, ...MIN], low: 48, high: 72, requireBass: true });
const chordsDimAug = playChord({ symbols: [...DIM, ...AUG], low: 48, high: 72, requireBass: true });
const chordsAll = mix([chords12, chords12, chordsDimAug]);
const spellAll = spellTriadChoice({ chords: ['F#', 'Bb', 'Eb', 'Ab', 'E', 'A', 'D', 'F#m', 'C#m', 'Ebm', 'Bbm', 'G#m', 'B°', 'F#°', 'C+', 'Eb+'] });
const earFour = chordQualityByEar({ qualities: ['', 'm', 'dim', 'aug'], roots: [57, 60, 62, 64, 65, 67], answerRoots: [60, 62, 64, 65, 67, 69] });
const inv1 = inversionChord({ chords: ['C', 'F', 'G', 'D', 'Am', 'Dm', 'Em', 'A', 'E', 'Bb'], inversions: [0, 1, 2] });
const invNamed = inversionChord({ chords: ['C', 'F', 'G', 'D', 'Am', 'Dm', 'Em', 'Bb', 'Eb', 'F#m'], inversions: [1, 2], showSlash: false });
const slashChords = playChord({ symbols: ['C/E', 'C/G', 'G/B', 'G/D', 'F/A', 'F/C', 'Am/C', 'Am/E', 'D/F#', 'Dm/F', 'Em/G', 'E/G#'], low: 48, high: 72 });
const popSeq = (keys: string[], cycles: number) => chordSequence({
  sequences: keys.map((k) => ({ name: `Tom de ${KEY_PT[k]} maior.`, symbols: Array.from({ length: cycles }, () => POP[k]).flat() })),
  lead: 2,
});
const lead1 = popSeq(['C'], 1);
const leadAny = popSeq(['C', 'G', 'F', 'D'], 1);
const leadTwo = popSeq(['C', 'G', 'F', 'D'], 2);

// ---------- lições ----------

const l42: Lesson = {
  n: 42,
  id: 'l42',
  title: 'Os quatro tipos de tríade',
  minutes: 60,
  objectives: [
    'Consigo montar tríades maiores, menores, diminutas e aumentadas sobre qualquer nota, empilhando terças.',
    'Consigo soletrar uma tríade com a grafia certa (Fá♯ maior = Fá♯–Lá♯–Dó♯) e tocá-la.',
    'Consigo tocar 24 acordes sorteados com 90% de acerto e menos de 2,5 s por acorde.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Empilhar terças',
      body: `Toda tríade é feita de **duas terças empilhadas**: da fundamental até a 3ª, e da 3ª até a 5ª. Como cada terça pode ser maior (4 semitons) ou menor (3), existem **quatro combinações**, e cada uma é um tipo de tríade:

- **Maior** = 3ª maior + 3ª menor (4 + 3). **C**: Dó–Mi–Sol.
- **Menor** = 3ª menor + 3ª maior (3 + 4). **Cm**: Dó–Mi♭–Sol.
- **Diminuta** = 3ª menor + 3ª menor (3 + 3). **C°**: Dó–Mi♭–Sol♭.
- **Aumentada** = 3ª maior + 3ª maior (4 + 4). **C+**: Dó–Mi–Sol♯.

Repare na 5ª de cada uma: justa (7 semitons) na maior e na menor, **diminuta** (6) na diminuta, **aumentada** (8) na aumentada. O nome do acorde vem daí.

Na cifra: maior não leva nada (C), menor leva **m** (Cm), diminuta leva **°** ou dim (C°, Cdim) e aumentada leva **+** ou aug (C+, Caug).`,
    },
    {
      kind: 'example',
      title: 'Os quatro sobre Dó',
      steps: [
        { say: 'Maior: Dó, Mi, Sol. Estável e luminoso.', keys: [60, 64, 67], play: { bpm: 72, steps: [{ midis: [60, 64, 67], beats: 2 }] } },
        { say: 'Menor: o Mi desce para Mi♭.', keys: [60, 63, 67], play: { bpm: 72, steps: [{ midis: [60, 63, 67], beats: 2 }] } },
        { say: 'Diminuta: o Sol também desce, para Sol♭. Tenso, apertado.', keys: [60, 63, 66], play: { bpm: 72, steps: [{ midis: [60, 63, 66], beats: 2 }] } },
        { say: 'Aumentada: volta o Mi e o Sol sobe para Sol♯. Suspenso, como uma pergunta sem resposta.', keys: [60, 64, 68], play: { bpm: 72, steps: [{ midis: [60, 64, 68], beats: 2 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'Onde moram a diminuta e a aumentada',
      body: `A maior e a menor estão em toda parte. As outras duas são mais raras e têm endereço certo:

- A **diminuta** mora no **7º grau** da escala maior. Em Dó maior: **Si°** (Si–Ré–Fá). É o G7 sem o Sol: tem o mesmo trítono Si–Fá e, por isso, também quer resolver no Dó.
- A **aumentada** aparece no **3º grau da menor harmônica** (em Lá menor: Dó–Mi–Sol♯ = C+) e como acorde de passagem, quando uma voz sobe meio tom: C → C+ → Am.

A aumentada tem uma curiosidade: suas terças são todas iguais (4 + 4 + 4 = 12), então ela divide a oitava em três. **C+, E+ e G♯+** usam as mesmas três teclas; só o nome (e o baixo) muda.`,
    },
    { kind: 'exercise', id: 'l42-ouvido', exercise: items('Qual é a qualidade?', 'O app toca uma tríade. Toque uma tríade da mesma qualidade sobre a nota pedida, fundamental embaixo.', earFour, 12, 48, 84, 0.8, 'off') },
    {
      kind: 'text',
      title: 'Soletrar: uma letra sim, outra não',
      body: `Uma tríade usa **três letras alternadas**: Dó–Mi–Sol, Ré–Fá–Lá, Si–Ré–Fá. Primeiro escolha as letras, depois os acidentes que dão as terças certas.

Exemplo: **F♯** (Fá♯ maior).

1. Letras: **Fá, Lá, Dó**.
2. Fá♯ até a 3ª maior (4 semitons): **Lá♯**. Não Si♭: a letra tem que ser Lá.
3. Lá♯ até a 3ª menor (3 semitons): **Dó♯**.

Resultado: **Fá♯–Lá♯–Dó♯**. No teclado são três pretas; se você escrever Fá♯–Si♭–Dó♯, as teclas são as mesmas, mas o nome está errado e a leitura trava.

Outro: **E♭m** (Mi♭ menor): Mi♭, **Sol♭** (3ª menor), Si♭. Mais um: **G♯°**: Sol♯, Si, Ré.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'pensar só em teclas',
      body: 'Quem monta acorde só contando semitons acerta as teclas e erra os nomes, e depois não consegue ler a cifra com acidente. Treine o caminho completo: letras primeiro, acidentes depois, teclas por último.',
    },
    { kind: 'exercise', id: 'l42-soletrar', exercise: items('Soletre a tríade', 'Escolha a grafia correta. Duas opções soam diferente; uma soa igual, mas tem a letra errada.', spellAll, 10, 48, 84, 0.8, 'off') },
    { kind: 'exercise', id: 'l42-maiores-menores', exercise: items('Maiores e menores nas 12 tônicas', 'Toque o acorde da cifra com a fundamental embaixo. Inclui as tônicas pretas.', chords12, 16, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l42-dim-aum', exercise: items('Diminutas e aumentadas', 'Duas 3ªs menores ou duas 3ªs maiores sobre a fundamental.', chordsDimAug, 10, 48, 72, 0.85) },
    { kind: 'exercise', id: 'l42-quiz', exercise: quiz('Os quatro tipos', 'Seis perguntas rápidas.', TRIADS) },
  ],
  review: [chordsAll, spellAll, earFour, choice(TRIADS, 'triades')],
  checkpoint: [
    items('24 acordes', 'Tríades sorteadas dos quatro tipos, sem dicas. Meta: 90% e menos de 2,5 s por acorde.', chordsAll, 24, 48, 72, 0.9, 'off', 2500),
  ],
  exit: [spellAll, choice(TRIADS, 'triades')],
};

/** Tríade quebrada subindo e descendo pelas inversões, em tercinas (uma tríade por tempo). */
function brokenInversions(root: Midi, third: number): string {
  const t = [0, third, 7];
  const up: Midi[][] = [0, 1, 2, 3].map((k) => [0, 1, 2].map((i) => root + t[(i + k) % 3] + 12 * Math.floor((i + k) / 3)));
  const down = [...up].reverse().map((g) => [...g].reverse());
  const sci = (m: Midi) => `${['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12]}${Math.floor(m / 12) - 1}`;
  const bar = (gs: Midi[][]) => gs.flat().map((m) => `${sci(m)}:1/3`).join(' ');
  return `${bar(up)} | ${bar(down)} | ${sci(root)}:4`;
}

const l43: Lesson = {
  n: 43,
  id: 'l43',
  title: 'Inversões e baixo invertido',
  minutes: 60,
  objectives: [
    'Consigo tocar qualquer tríade na posição fundamental, na 1ª e na 2ª inversão.',
    'Consigo ler cifra com barra (C/E, G/B) e pôr a nota certa no baixo.',
    'Consigo tocar tríades quebradas pelas inversões em tercinas a 50 BPM, sem parar.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'As mesmas notas, outra ordem',
      body: `As três notas de Dó maior podem ser empilhadas de três jeitos, conforme a nota que fica **embaixo**:

- **Posição fundamental**: a fundamental embaixo. **Dó–Mi–Sol**.
- **1ª inversão**: a **3ª** embaixo. **Mi–Sol–Dó**.
- **2ª inversão**: a **5ª** embaixo. **Sol–Dó–Mi**.

Para inverter, pegue a nota de baixo e leve uma oitava acima. Dó–Mi–Sol → Mi–Sol–Dó → Sol–Dó–Mi → e volta a Dó–Mi–Sol, uma oitava acima.

O acorde continua sendo **Dó maior** nos três casos: inversão não muda o nome nem a qualidade, muda a **cor** e, principalmente, o **baixo**. A posição fundamental soa firme; a 1ª inversão, mais leve; a 2ª inversão, instável, como quem está de passagem.`,
    },
    {
      kind: 'keys',
      low: 60,
      high: 79,
      lit: [60, 64, 67],
      labels: { 60: 'Dó', 64: 'Mi', 67: 'Sol', 72: 'Dó', 76: 'Mi', 79: 'Sol' },
      caption: 'Dó maior na posição fundamental. Leve o Dó para cima (1ª inversão: Mi–Sol–Dó), depois o Mi (2ª inversão: Sol–Dó–Mi).',
    },
    {
      kind: 'example',
      title: 'Três posições de Dó maior',
      steps: [
        { say: 'Posição fundamental: Dó–Mi–Sol.', keys: [60, 64, 67], play: { bpm: 72, steps: [{ midis: [60, 64, 67], beats: 2 }] } },
        { say: '1ª inversão: Mi–Sol–Dó. Repare como a mão tem um vão maior em cima (uma 4ª).', keys: [64, 67, 72], play: { bpm: 72, steps: [{ midis: [64, 67, 72], beats: 2 }] } },
        { say: '2ª inversão: Sol–Dó–Mi. O vão maior agora fica embaixo.', keys: [67, 72, 76], play: { bpm: 72, steps: [{ midis: [67, 72, 76], beats: 2 }] } },
      ],
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'achar a fundamental de um acorde invertido',
      body: 'Procure o vão de 4ª. Num acorde invertido em posição fechada, a nota logo acima da 4ª é a fundamental: em Mi–Sol–Dó, a 4ª é Sol–Dó, então Dó é a fundamental. Se não houver 4ª (só terças), o acorde está na posição fundamental.',
    },
    { kind: 'exercise', id: 'l43-inversoes', exercise: items('Inversão pedida', 'Toque o acorde na posição pedida. A nota mais grave é o que conta.', inv1, 14, 48, 84, 0.85) },
    {
      kind: 'text',
      title: 'Cifra com barra',
      body: `Na cifra, a inversão aparece com uma **barra**: depois dela vem a **nota do baixo**.

- **C/E**: Dó maior com Mi no baixo (1ª inversão).
- **C/G**: Dó maior com Sol no baixo (2ª inversão).
- **G/B**: Sol maior com Si no baixo.
- **D/F♯**: Ré maior com Fá♯ no baixo.

No acompanhamento, quem toca o baixo é a mão esquerda. Então C/E pode ser: **Mi** na esquerda e Dó–Mi–Sol (em qualquer posição) na direita. O que importa é que a nota mais grave de todas seja o Mi.

A barra também aparece com notas que não são do acorde (C/D, por exemplo), mas isso fica para unidades adiante.`,
    },
    { kind: 'exercise', id: 'l43-barra', exercise: items('Cifra com barra', 'Toque o acorde com a nota depois da barra no baixo. Pode usar as duas mãos.', slashChords, 12, 36, 72, 0.85) },
    { kind: 'exercise', id: 'l43-nome', exercise: items('Pelo nome, sem cifra', 'Agora só o nome: "Ré menor na 2ª inversão". Pense em qual nota vai no baixo.', invNamed, 10, 48, 84, 0.85, 'off') },
    {
      kind: 'text',
      title: 'Tríades quebradas pelas inversões',
      body: `Um exercício técnico clássico: tocar a tríade **quebrada** (uma nota por vez) subindo pelas inversões e descendo de volta, em **tercinas**, uma tríade por tempo:

Dó–Mi–Sol · Mi–Sol–Dó · Sol–Dó–Mi · Dó–Mi–Sol (oitava acima), e desce pelo mesmo caminho.

O dedilhado da direita é **1-2-3** na posição fundamental e na 1ª inversão (1-2-5 se a mão for grande) e **1-2-4** ou 1-3-5 na 2ª inversão. A mão salta inteira de uma posição para a outra entre os tempos, sem passagem do polegar: o desafio é o salto chegar **no tempo**, sem quebrar a tercina.`,
    },
    { kind: 'exercise', id: 'l43-quebradas', exercise: quickTimed('Tríades quebradas em tercinas', 'Dó, Fá ou Sol maior, ou Lá menor, sorteado. Mão direita, de 40 a 50 BPM. Duas passadas boas.', (rng) => {
      const c = pick(rng, [{ r: 60, t: 4 }, { r: 65, t: 4 }, { r: 55, t: 4 }, { r: 57, t: 3 }]);
      return melodyTask(brokenInversions(c.r, c.t), { bpm: 40 });
    }, { ladder: { from: 40, to: 50, step: 5 }, window: 80 }) },
    { kind: 'exercise', id: 'l43-quiz', exercise: quiz('Inversões', 'Cinco perguntas rápidas.', INVERSIONS) },
  ],
  review: [inv1, slashChords, choice(INVERSIONS, 'inversoes')],
  checkpoint: [
    items('Inversões e barra', '14 acordes com inversão exigida, sem dicas. Meta: 85%.', mix([inv1, slashChords, invNamed]), 14, 36, 84, 0.85, 'off'),
    quickTimed('Tríades quebradas a 50 BPM', 'Dó maior em tercinas, subindo e descendo, sem parar.', () => melodyTask(brokenInversions(60, 4), { bpm: 50 }), { window: 80 }),
  ],
  exit: [invNamed, choice(INVERSIONS, 'inversoes')],
};

/** I–V–vi–IV em posição próxima (mão direita em semibreves) com a fundamental na esquerda. */
const POP_CLOSE: Record<string, { r: string; l: string; fifths: number }> = {
  C: { r: 'C4+E4+G4:4 | B3+D4+G4:4 | C4+E4+A4:4 | C4+F4+A4:4', l: 'C3:4 | G2:4 | A2:4 | F2:4', fifths: 0 },
  G: { r: 'B3+D4+G4:4 | A3+D4+F#4:4 | B3+E4+G4:4 | C4+E4+G4:4', l: 'G2:4 | D3:4 | E3:4 | C3:4', fifths: 1 },
  F: { r: 'C4+F4+A4:4 | C4+E4+G4:4 | D4+F4+A4:4 | D4+F4+Bb4:4', l: 'F2:4 | C3:4 | D3:4 | Bb2:4', fifths: -1 },
  D: { r: 'D4+F#4+A4:4 | C#4+E4+A4:4 | D4+F#4+B4:4 | D4+G4+B4:4', l: 'D3:4 | A2:4 | B2:4 | G2:4', fifths: 2 },
};
const popTimed = (key: string, cycles: number, bpm: number) =>
  twoHandTask(Array(cycles).fill(POP_CLOSE[key].r).join(' | '), Array(cycles).fill(POP_CLOSE[key].l).join(' | '), {
    bpm,
    fifths: POP_CLOSE[key].fifths,
    caption: `${POP[key].join(' – ')} em ${KEY_PT[key]} maior, posição próxima. A pauta mostra a nota mais grave da direita.`,
  });

const l44: Lesson = {
  n: 44,
  id: 'l44',
  title: 'Encadeamento: conduzir as vozes',
  minutes: 60,
  objectives: [
    'Consigo encadear I–V–vi–IV mantendo as notas comuns e andando o mínimo nas outras.',
    'Consigo fazer isso em Dó, Sol, Fá e Ré maior, com no máximo 2 semitons a mais que o caminho mais curto em cada troca.',
    'Consigo trocar os acordes no tempo, com a fundamental na mão esquerda.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'A mão que não pula',
      body: `Toque C, G, Am e F, todos na posição fundamental: a mão pula para cima e para baixo a cada troca, e o som fica "quadrado", com as quatro vozes saltando juntas.

Agora pense em cada nota do acorde como uma **voz**, como num coral de três cantores. Cada cantor quer andar **o mínimo possível**. Duas regras resolvem quase tudo:

1. **Notas comuns ficam paradas.** De C (Dó–Mi–Sol) para Am (Lá–Dó–Mi), Dó e Mi estão nos dois acordes: ficam.
2. **As outras andam por grau conjunto**, para a nota mais perto. O Sol sobe um tom para o Lá. Resultado: **Dó–Mi–Lá**, que é Am na 2ª inversão... e a mão nem se mexeu.

É assim que pianistas de pop, de igreja e de jazz tocam: as inversões existem justamente para a mão ficar numa região só. Quem dá o "chão" do acorde é o baixo, na mão esquerda.`,
    },
    {
      kind: 'example',
      title: 'C – G – Am – F conduzido',
      steps: [
        { say: 'C: Dó–Mi–Sol.', keys: [60, 64, 67], play: { bpm: 72, steps: [{ midis: [48, 60, 64, 67], beats: 2 }] } },
        { say: 'G: o Sol fica; Dó desce para Si, Mi desce para Ré. **Si–Ré–Sol** (3 semitons de movimento).', keys: [59, 62, 67], play: { bpm: 72, steps: [{ midis: [43, 59, 62, 67], beats: 2 }] } },
        { say: 'Am: Si sobe para Dó, Ré sobe para Mi, Sol sobe para Lá. **Dó–Mi–Lá**.', keys: [60, 64, 69], play: { bpm: 72, steps: [{ midis: [45, 60, 64, 69], beats: 2 }] } },
        { say: 'F: Dó e Lá ficam, Mi sobe meio tom para Fá. **Dó–Fá–Lá**. Agora a progressão inteira.', keys: [60, 65, 69], play: { bpm: 80, steps: [{ midis: [48, 60, 64, 67], beats: 2 }, { midis: [43, 59, 62, 67], beats: 2 }, { midis: [45, 60, 64, 69], beats: 2 }, { midis: [41, 60, 65, 69], beats: 2 }, { midis: [48, 60, 64, 67], beats: 4 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'I–V–vi–IV',
      body: `A progressão do exemplo, **I–V–vi–IV**, é provavelmente a mais usada da música pop dos últimos 50 anos: centenas de canções conhecidas cabem nela. Em Dó: **C – G – Am – F**.

Repare nos graus em algarismos romanos: **vi** é minúsculo porque o acorde do 6º grau é menor (Lá menor em Dó maior, a relativa). Pensando em graus, a progressão vai para qualquer tom:

- **Sol maior**: G – D – Em – C.
- **Fá maior**: F – C – Dm – B♭.
- **Ré maior**: D – A – Bm – G.

O app mede a condução: soma quantos semitons suas vozes andaram em cada troca e compara com o caminho mais curto. Você pode passar dele em até **2 semitons**. Toque **três notas por acorde**, uma de cada, sem dobrar (a mão esquerda fica de fora neste exercício).`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'voltar sempre para a posição fundamental',
      body: 'O reflexo de quem aprendeu acordes um por um é montar cada acorde do zero, com a fundamental embaixo. Antes de trocar, olhe as notas que você já está segurando: quais servem no próximo acorde? Essas ficam. Só depois mova as outras.',
    },
    { kind: 'exercise', id: 'l44-do', exercise: items('C – G – Am – F conduzido', 'O primeiro acorde é livre; os outros precisam andar pouco. A dica mostra o caminho mais curto.', lead1, 6, 48, 84, 0.85) },
    { kind: 'exercise', id: 'l44-tons', exercise: items('Em quatro tons', 'I–V–vi–IV em Dó, Sol, Fá ou Ré maior, sorteado. Conduza as vozes.', leadAny, 8, 48, 84, 0.85) },
    {
      kind: 'text',
      title: 'No tempo, com o baixo',
      body: `Agora as duas mãos. A direita segura os acordes conduzidos, um por compasso; a esquerda toca a **fundamental** de cada um, uma ou duas oitavas abaixo. É o formato mais simples de acompanhamento de pop ao piano, e já soa completo.

A troca precisa acontecer **no tempo 1**, com as duas mãos juntas. Para isso, prepare a troca no tempo 4: os dedos que vão andar já sabem para onde, e os que ficam continuam apoiados.`,
    },
    { kind: 'exercise', id: 'l44-tempo', exercise: quickTimed('I–V–vi–IV no tempo', 'Dois ciclos em tom sorteado, a 66 BPM. Trocas em ±80 ms.', (rng) => popTimed(pick(rng, ['C', 'G', 'F', 'D']), 2, 66), { window: 80, reps: 2 }) },
    { kind: 'exercise', id: 'l44-quiz', exercise: quiz('Condução de vozes', 'Cinco perguntas rápidas.', VOICE) },
  ],
  review: [leadAny, inv1, choice(VOICE, 'conducao')],
  checkpoint: [
    items('Dois ciclos conduzidos', 'I–V–vi–IV duas vezes seguidas em tom sorteado, sem dicas. Movimento até o ótimo + 2 em cada troca.', leadTwo, 4, 48, 84, 0.85, 'off'),
    quickTimed('Trocas no tempo', 'Dois ciclos em tom sorteado, a 72 BPM, ±80 ms.', (rng) => popTimed(pick(rng, ['C', 'G', 'F', 'D']), 2, 72), { window: 80 }),
  ],
  exit: [lead1, choice(VOICE, 'conducao')],
};

// ---------- músicas ----------

// Canção original do Fermata em I–V–vi–IV: introdução, parte A (meio-arpejo 1-5-8-5), parte B (balada 1-5-8-10) e final.
const SONG_R = [
  'r:4', 'r:4',
  'E4 G4 C5 B4', 'D5:2 B4:2', 'C5 A4 E4 A4', 'C5:3 r',
  'E4 G4 C5 B4', 'D5 C5 B4 G4', 'A4 C5 B4 A4', 'F4:2 G4:2',
  'E5:2 D5 C5', 'B4:2 D5:2', 'C5 B4 A4 E4', 'F4:2 A4:2',
  'B4:2 D5:2', 'C5:4',
].join(' | ');
const ARP = { C: 'C3 G3 C4 G3', G: 'G2 D3 G3 D3', Am: 'A2 E3 A3 E3', F: 'F2 C3 F3 C3' };
const BAL = { C: 'C2 G2 C3 E3', G: 'G2 D3 G3 B3', Am: 'A2 E3 A3 C4', F: 'F2 C3 F3 A3' };
const SONG_L = [
  ARP.C, ARP.G,
  ARP.C, ARP.G, ARP.Am, ARP.F, ARP.C, ARP.G, ARP.Am, ARP.F,
  BAL.C, BAL.G, BAL.Am, BAL.F,
  BAL.G, 'C2+G2+C3:4',
].join(' | ');

const popSong: SongSpec = {
  id: 'u06-cancao',
  title: 'Canção em quatro acordes',
  composer: 'melodia original do Fermata',
  arrangement: 'C – G – Am – F (I–V–vi–IV): introdução, parte A com meio-arpejo na esquerda, parte B em balada 1-5-8-10 e final em Dó',
  bpm: 72,
  beatsPerBar: 4,
  fifths: 0,
  right: SONG_R,
  left: SONG_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const COLORS: ChoiceQuestion[] = [
  { q: 'No Csus4, a 3ª (Mi) é trocada por…', options: ['Fá, a 4ª', 'Ré, a 2ª', 'Sol♯'], answer: 0, why: 'Dó–Fá–Sol. Sus = suspenso: a 3ª fica "pendurada" na 4ª.' },
  { q: 'O Csus2 tem as notas…', options: ['Dó, Ré, Sol', 'Dó, Mi, Ré', 'Dó, Fá, Sol'], answer: 0, why: 'A 2ª (Ré) no lugar da 3ª.' },
  { q: 'O Cadd9 tem as notas…', options: ['Dó, Mi, Sol e Ré', 'Dó, Ré, Sol', 'Dó, Mi, Sol e Si♭'], answer: 0, why: 'Add9 acrescenta a 9ª (o Ré) e mantém a 3ª.' },
  { q: 'Um acorde sus é maior ou menor?', options: ['Nenhum dos dois: não tem 3ª', 'Maior', 'Menor'], answer: 0, why: 'Sem a 3ª, a qualidade fica em aberto. Por isso ele soa suspenso.' },
  { q: 'O sus4 normalmente resolve…', options: ['A 4ª desce para a 3ª', 'A 4ª sobe para a 5ª', 'Não resolve'], answer: 0, why: 'Gsus4 → G: o Dó desce para o Si.' },
  { q: 'A 9ª é…', options: ['A 2ª uma oitava acima', 'A 7ª abaixada', 'A 5ª aumentada'], answer: 0, why: '2 + 7 = 9: a mesma letra, uma oitava acima.' },
];

const COMPOUND: ChoiceQuestion[] = [
  { q: 'No 6/8, quantos tempos você sente por compasso?', options: ['2', '6', '3'], answer: 0, why: 'Seis colcheias em dois grupos de três: o tempo é a semínima pontuada.' },
  { q: 'No 6/8, o tempo vale…', options: ['Uma semínima pontuada (3 colcheias)', 'Uma semínima', 'Uma colcheia'], answer: 0, why: 'O número de baixo (8) diz colcheia, mas o pulso junta três delas.' },
  { q: 'Os acentos do 6/8 caem…', options: ['Na 1ª e na 4ª colcheia', 'Em todas as colcheias', 'Na 2ª e na 5ª'], answer: 0, why: 'UM-dois-três-QUA-tro-cin... os inícios dos dois grupos.' },
  { q: '9/8 tem…', options: ['3 tempos de semínima pontuada', '9 tempos', '4 tempos e meio'], answer: 0, why: 'Compostos: 6/8 (2), 9/8 (3), 12/8 (4) tempos.' },
  { q: 'Diferença entre 3/4 e 6/8:', options: ['3/4 tem 3 tempos de semínima; 6/8 tem 2 tempos de semínima pontuada', 'São iguais', '6/8 é mais rápido'], answer: 0, why: 'As duas cabem 6 colcheias, mas agrupadas 2+2+2 (3/4) ou 3+3 (6/8).' },
];

const PATTERNS: ChoiceQuestion[] = [
  { q: 'Lead sheet é…', options: ['Melodia escrita + cifra em cima', 'Partitura completa para piano', 'Só a letra da música'], answer: 0, why: 'O acompanhamento é por sua conta: você escolhe o padrão da esquerda.' },
  { q: 'O padrão "alternado" na esquerda é…', options: ['Baixo e acorde se revezando', 'Acordes em bloco', 'Só a fundamental'], answer: 0, why: 'Baixo no 1 e no 3, acorde no 2 e no 4.' },
  { q: 'A "balada" 1-5-8-10 em Dó é…', options: ['Dó, Sol, Dó, Mi', 'Dó, Mi, Sol, Dó', 'Dó, Sol, Si, Mi'], answer: 0, why: 'A 10ª é a 3ª uma oitava acima: dá a cor do acorde lá em cima.' },
  { q: 'Num acompanhamento, quem decide a harmonia que o ouvinte percebe é principalmente…', options: ['O baixo', 'A nota mais aguda', 'O pedal'], answer: 0, why: 'Por isso a mão esquerda começa cada compasso na fundamental (ou no baixo da barra).' },
];

const colorChords = playChord({ symbols: ['Csus4', 'Csus2', 'Cadd9', 'Gsus4', 'Dsus2', 'Dsus4', 'Asus4', 'Asus2', 'Fadd9', 'Gadd9', 'Esus4', 'C/E', 'G/B', 'F/A'], low: 48, high: 84 });
const resolveSus = chordSequence({
  sequences: [['Csus4', 'C'], ['Gsus4', 'G'], ['Dsus4', 'D'], ['Asus4', 'Am'], ['Esus4', 'E'], ['Esus4', 'Em'], ['Csus2', 'C'], ['Dsus2', 'Dm'], ['Fsus2', 'F']].map((s) => ({ symbols: s })),
  lead: 1,
});
const colorsAndTriads = mix([colorChords, colorChords, chords12]);

// 4 compassos com suspensões: Csus4 → C, Fadd9 → F, Gsus4 → G, C.
const SUS_R = 'C4+F4+G4:2 C4+E4+G4:2 | C4+F4+G4+A4:2 C4+F4+A4:2 | C4+D4+G4:2 B3+D4+G4:2 | C4+E4+G4:4';
const SUS_L = 'C3:4 | F2:4 | G2:4 | C3:4';

const l45: Lesson = {
  n: 45,
  id: 'l45',
  title: 'Cores: sus2, sus4 e add9',
  minutes: 60,
  objectives: [
    'Consigo tocar sus2, sus4 e add9 sobre qualquer fundamental branca, lendo a cifra em menos de 2 s.',
    'Consigo resolver uma suspensão: a 4ª desce para a 3ª (ou a 2ª sobe), movendo uma nota só.',
    'Consigo compor 4 compassos em que toda suspensão resolve.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Tirar a 3ª',
      body: `A 3ª é a nota que diz se o acorde é maior ou menor. O que acontece se ela sai do lugar?

- **sus4**: a 3ª sobe para a **4ª**. **Csus4** = Dó–**Fá**–Sol.
- **sus2**: a 3ª desce para a **2ª**. **Csus2** = Dó–**Ré**–Sol.

"Sus" vem de **suspenso**: sem a 3ª, o acorde não é maior nem menor, fica no ar. O ouvido espera a 3ª voltar, e quando ela volta, isso se chama **resolução**: Csus4 → C (o Fá desce meio tom para o Mi).

A suspensão vem da música barroca, em que uma voz "atrasava" a chegada na nota do acorde. No pop, no rock e nas trilhas de cinema e de anime, sus2 e sus4 viraram cor própria, às vezes sem resolver: o som aberto, moderno, de violão e de teclado de trilha.`,
    },
    {
      kind: 'example',
      title: 'Suspender e resolver',
      steps: [
        { say: 'Csus4 → C: o Fá desce para o Mi.', keys: [60, 65, 67], play: { bpm: 66, steps: [{ midis: [48, 60, 65, 67], beats: 2 }, { midis: [48, 60, 64, 67], beats: 3 }] } },
        { say: 'Csus2 → C: o Ré sobe para o Mi.', keys: [60, 62, 67], play: { bpm: 66, steps: [{ midis: [48, 60, 62, 67], beats: 2 }, { midis: [48, 60, 64, 67], beats: 3 }] } },
        { say: 'Gsus4 → G em posição próxima: Dó–Ré–Sol → Si–Ré–Sol. Uma nota só anda.', keys: [60, 62, 67], play: { bpm: 66, steps: [{ midis: [43, 60, 62, 67], beats: 2 }, { midis: [43, 59, 62, 67], beats: 3 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'Acrescentar a 9ª',
      body: `O **add9** é diferente: em vez de trocar a 3ª, ele **acrescenta** uma nota, a **9ª**. A 9ª é a 2ª uma oitava acima: em Dó, o **Ré**.

**Cadd9** = Dó–Mi–Sol–**Ré**. A 3ª continua lá, então o acorde segue maior, só que com um brilho a mais. Em posição fechada, dá para tocar Dó–Ré–Mi–Sol (o Ré colado no Dó), mas soa melhor com o Ré em cima: Dó–Mi–Sol–Ré, ou com a esquerda no Dó e a direita Mi–Sol–Ré.

Com isso, a **cifra completa das tríades** fica assim, sobre Dó:

- **C** maior · **Cm** menor · **C°** diminuta · **C+** aumentada
- **Csus2** · **Csus4** · **Cadd9**
- e qualquer um com **barra** para o baixo: **C/E**, **Csus4/G**...`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'sus com 3ª',
      body: 'Tocar Dó–Mi–Fá–Sol no Csus4 é o erro mais comum: a 3ª e a 4ª juntas viram um choque, não uma suspensão. No sus, a 3ª sai. No add9, ela fica.',
    },
    { kind: 'exercise', id: 'l45-cifras', exercise: items('Leia a cifra', 'Toque o acorde: sus2, sus4, add9 e alguns com barra. Meta: menos de 2 s por acorde.', colorChords, 14, 48, 84, 0.85, 'fade') },
    { kind: 'exercise', id: 'l45-resolver', exercise: items('Suspenda e resolva', 'Toque o sus e depois a resolução, movendo uma nota só (as outras ficam).', resolveSus, 10, 48, 84, 0.85) },
    {
      kind: 'text',
      title: 'Compor com suspensões',
      body: `Agora você compõe. A regra do exercício é simples: **toda suspensão resolve** no mesmo compasso.

Um exemplo de 4 compassos, com a fundamental na esquerda:

- **Csus4 → C** · **Fadd9 → F** · **Gsus4 → G** · **C**

Repare que o Fadd9 não é suspensão (ele tem a 3ª, o Lá), então não precisa resolver; aqui ele "resolve" por gosto, tirando a 9ª. Toque o exemplo no exercício a seguir e depois escreva o seu: escolha 4 acordes de Dó maior (C, Dm, Em, F, G, Am), ponha sus2, sus4 ou add9 em pelo menos dois e resolva cada sus movendo uma nota só.`,
    },
    { kind: 'exercise', id: 'l45-exemplo', exercise: quickTimed('O exemplo, no tempo', 'Mínimas na direita, fundamental em semibreve na esquerda, a 66 BPM. Duas passadas boas.', () => twoHandTask(SUS_R, SUS_L, { bpm: 66, caption: 'Csus4 C | Fadd9 F | Gsus4 G | C. A pauta mostra a nota mais grave da direita.' }), { reps: 2 }) },
    {
      kind: 'exercise',
      id: 'l45-compor',
      exercise: {
        kind: 'checklist',
        title: 'Sua frase de 4 compassos',
        how: 'Escreva a sequência de cifras (no papel ou no celular), toque e confira.',
        items: [
          'Usei só acordes de Dó maior (C, Dm, Em, F, G, Am), com cores.',
          'Pelo menos dois acordes têm sus2, sus4 ou add9.',
          'Todo sus resolve no mesmo compasso, movendo uma nota só.',
          'A frase termina em C.',
          'Toquei a frase inteira no tempo, sem parar, a 66 BPM.',
        ],
      },
    },
    { kind: 'exercise', id: 'l45-quiz', exercise: quiz('Cores', 'Seis perguntas rápidas.', COLORS) },
  ],
  review: [colorChords, resolveSus, choice(COLORS, 'cores')],
  checkpoint: [
    items('Cifras em 2 s', '16 cifras com cores, barras e tríades, sem dicas. Meta: 90% e menos de 2 s.', colorsAndTriads, 16, 48, 84, 0.9, 'off', 2000),
    items('Resoluções', '6 suspensões para resolver, sem dicas.', resolveSus, 6, 48, 84, 0.85, 'off'),
  ],
  exit: [colorChords, choice(COLORS, 'cores')],
};

// Ritmos em 6/8, escritos em semínimas (colcheia = 0.5, compasso = 3).
const R68 = ['x:1.5 x:1.5', 'x:1 x:0.5 x:1 x:0.5', 'x:0.5 x:0.5 x:0.5 x:1.5', 'x:1.5 x:0.5 x:0.5 x:0.5', 'x:0.5 x:0.5 x:0.5 x:0.5 x:0.5 x:0.5', 'x:3', 'x:1 x:0.5 x:1.5', 'x:1.5 x:1 x:0.5'];
const R68_REST = ['x:1 r:0.5 x:1 r:0.5', 'x:1.5 r:1.5', 'r:0.5 x:0.5 x:0.5 x:1.5', 'x:0.5 x:0.5 x:0.5 r:1.5'];
const GREEN_4 = 'C5:1 D5:0.5 E5:0.5 F5:0.5 E5:0.5 | D5:1 B4:0.5 G4:0.5 A4:0.5 B4:0.5 | C5:1 A4:0.5 A4:0.5 G#4:0.5 A4:0.5 | B4:1 G#4:0.5 E4:1.5';
const ROW_68 = ['C4:1 C4:0.5 C4:1 D4:0.5 | E4:1 D4:0.5 E4:1 F4:0.5 | G4:3 | G4:1.5 r:1.5', 'E4:0.5 F4:0.5 G4:0.5 G4:1.5 | A4:1 G4:0.5 F4:1.5 | E4:1 D4:0.5 C4:1.5 | C4:3', 'G4:1.5 E4:1.5 | F4:1 E4:0.5 D4:1.5 | E4:0.5 F4:0.5 G4:0.5 C5:1.5 | C5:3'];

const l46: Lesson = {
  n: 46,
  id: 'l46',
  title: 'Compasso composto: 6/8',
  minutes: 60,
  objectives: [
    'Consigo contar o 6/8 em 2, com o tempo na semínima pontuada.',
    'Consigo tocar ritmos em 6/8 com 85% das notas em ±60 ms.',
    'Consigo tocar uma balada em 6/8 com a 1ª e a 4ª colcheias mais fortes.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Grupos de três',
      body: `Nos compassos que você conhece (2/4, 3/4, 4/4), cada tempo se divide em **dois**: duas colcheias por semínima. Esses são os **compassos simples**.

Nos **compassos compostos**, cada tempo se divide em **três**. O tempo passa a ser a **semínima pontuada** (que vale três colcheias). O mais comum é o **6/8**: seis colcheias por compasso, agrupadas em **dois grupos de três**.

- O número de cima (6) conta as **colcheias**, não os tempos.
- O pulso que você sente (e bate com o pé) são **2 tempos**: UM-dois-três, DOIS-dois-três.

Por isso se diz que **6/8 se conta em 2, não em 6**. Contar seis colcheias deixa a música pesada e lenta; contar dois tempos a faz balançar, como um barco ou uma canção de ninar.

Da mesma família: **9/8** (3 tempos de semínima pontuada) e **12/8** (4 tempos), muito usado em baladas de soul e em blues lento.`,
    },
    {
      kind: 'example',
      title: '6/8 contado em 2',
      steps: [
        { say: 'Seis colcheias, com o acento na 1ª e na 4ª: UM-dois-três, DOIS-dois-três.', play: { bpm: 60, steps: [0.95, 0.45, 0.45, 0.8, 0.45, 0.45, 0.95, 0.45, 0.45, 0.8, 0.45, 0.45].map((v) => ({ midis: [64], beats: 1 / 3, velocity: v })) } },
        { say: 'O padrão mais típico: semínima + colcheia, duas vezes. Soa como um balanço.', play: { bpm: 60, steps: [{ midis: [64], beats: 2 / 3, velocity: 0.9 }, { midis: [64], beats: 1 / 3, velocity: 0.5 }, { midis: [64], beats: 2 / 3, velocity: 0.8 }, { midis: [64], beats: 1 / 3, velocity: 0.5 }, { midis: [64], beats: 2 / 3, velocity: 0.9 }, { midis: [64], beats: 1 / 3, velocity: 0.5 }, { midis: [64], beats: 1, velocity: 0.8 }] } },
        { say: 'Compare com 3/4, as mesmas seis colcheias agrupadas de duas em duas: UM-e, DOIS-e, TRÊS-e.', play: { bpm: 90, steps: [0.95, 0.45, 0.7, 0.45, 0.7, 0.45, 0.95, 0.45, 0.7, 0.45, 0.7, 0.45].map((v) => ({ midis: [64], beats: 0.5, velocity: v })) } },
      ],
    },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'tercina e 6/8',
      body: 'A colcheia do 6/8 soa como a tercina da lição 39: três notas por tempo. A diferença é só de escrita. Quando a música inteira divide o tempo em três, ela é escrita num compasso composto, em vez de encher a partitura de tercinas.',
    },
    { kind: 'exercise', id: 'l46-ritmo', exercise: quickTimed('Ritmo em 6/8', 'Dois compassos sorteados, tempo de semínima pontuada a 50 BPM. Uma tecla qualquer. Janela de ±60 ms, duas passadas boas.', compoundRhythm(R68, 2, 50), { reps: 2, window: 60 }) },
    { kind: 'exercise', id: 'l46-pausas', exercise: quickTimed('6/8 com pausas', 'Quatro compassos com pausas, de 50 a 60 BPM.', compoundRhythm([...R68, ...R68_REST], 4, 50), { window: 60, ladder: { from: 50, to: 60, step: 5 } }) },
    {
      kind: 'text',
      title: 'Acento e balanço',
      body: `O que faz o 6/8 soar como 6/8 é o **acento**: a **1ª colcheia** do compasso é a mais forte e a **4ª** vem logo depois em força. As outras são leves.

Não é tocar "forte e fraco" aos solavancos: é deixar o peso do braço cair no começo de cada grupo e as outras duas notas "rolarem" leves, como as patas de um cavalo a passo.

O app ainda não mede o acento pela força; ouça você mesmo, gravando-se, e confira na lista do exercício abaixo.

A balada desta lição é **Greensleeves**, uma melodia inglesa do século 16, em Lá menor. Ela tem o Sol♯ da harmônica e, no penúltimo compasso, o Fá♯ da **melódica** subindo: tudo da Unidade 5, agora em 6/8.`,
    },
    { kind: 'exercise', id: 'l46-melodias', exercise: quickTimed('Melodias curtas em 6/8', 'Melodia sorteada em Dó, 4 compassos, tempo a 50 BPM. Conte em 2.', (rng) => compoundTask(pick(rng, ROW_68), { bpm: 50 }), { reps: 2, window: 60 }) },
    { kind: 'exercise', id: 'l46-green', exercise: quickTimed('Greensleeves, 4 compassos', 'Mão direita, de 44 a 54 BPM (semínima pontuada).', () => compoundTask(GREEN_4, { bpm: 44 }), { window: 60, ladder: { from: 44, to: 54, step: 5 } }) },
    { kind: 'song', songId: 'u06-greensleeves', why: 'A balada inteira, com raiz e 5ª na esquerda. No "Tocar a música" o metrônomo bate semínimas (3 por compasso); conte em 2 por dentro.' },
    {
      kind: 'exercise',
      id: 'l46-acento',
      exercise: {
        kind: 'checklist',
        title: 'Ouça o seu acento',
        how: 'Grave Greensleeves (ou o exercício de ritmo) com o celular e ouça.',
        items: [
          'A 1ª colcheia de cada compasso soa mais forte.',
          'A 4ª colcheia também tem apoio, um pouco menos que a 1ª.',
          'As outras colcheias são leves e iguais.',
          'Dá para bater o pé em 2 por compasso ouvindo a gravação.',
        ],
      },
    },
    { kind: 'exercise', id: 'l46-quiz', exercise: quiz('Compasso composto', 'Cinco perguntas rápidas.', COMPOUND) },
  ],
  review: [choice(COMPOUND, 'composto'), colorChords],
  checkpoint: [
    quickTimed('Ritmo em 6/8 a 60 BPM', 'Quatro compassos sorteados, sem dicas. Meta: 85% em ±60 ms.', compoundRhythm([...R68, ...R68_REST], 4, 60), { window: 60 }),
    quickTimed('Greensleeves a 54 BPM', 'Os 4 primeiros compassos, mão direita.', () => compoundTask(GREEN_4, { bpm: 54 }), { window: 60 }),
  ],
  exit: [choice(COMPOUND, 'composto')],
};

// Padrões da mão esquerda sobre C – G – Am – F.
const ALT = 'C2 E3+G3 G2 E3+G3 | G2 B2+D3 D2 B2+D3 | A2 C3+E3 E2 C3+E3 | F2 A2+C3 C2 A2+C3';
const CONT = 'C3:0.5 G3:0.5 C4:0.5 G3:0.5 C3:0.5 G3:0.5 C4:0.5 G3:0.5 | G2:0.5 D3:0.5 G3:0.5 D3:0.5 G2:0.5 D3:0.5 G3:0.5 D3:0.5 | A2:0.5 E3:0.5 A3:0.5 E3:0.5 A2:0.5 E3:0.5 A3:0.5 E3:0.5 | F2:0.5 C3:0.5 F3:0.5 C3:0.5 F2:0.5 C3:0.5 F3:0.5 C3:0.5';
const BALLAD = 'C2 G2 C3 E3 | G2 D3 G3 B3 | A2 E3 A3 C4 | F2 C3 F3 A3';
const PAT_R = 'E4+G4+C5:4 | D4+G4+B4:4 | E4+A4+C5:4 | F4+A4+C5:4';
const patternTask = (left: string, cycles: number, bpm: number, caption: string) =>
  twoHandTask(Array(cycles).fill(PAT_R).join(' | '), Array(cycles).fill(left).join(' | '), { bpm, caption });

const l47: Lesson = {
  n: 47,
  id: 'l47',
  title: 'Padrões de mão esquerda e lead sheet',
  minutes: 60,
  objectives: [
    'Consigo tocar quatro padrões de mão esquerda sobre C – G – Am – F: alternado, meio-arpejo, arpejo contínuo e balada.',
    'Consigo ler um lead sheet (melodia + cifra) e escolher o padrão da esquerda.',
    'Consigo tocar 16 compassos de melodia com arpejo na esquerda a 72 BPM, com 90% das notas e as mãos juntas em ±50 ms.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Lead sheet: melodia e cifra',
      body: `Em música popular, quase nunca existe partitura completa de piano. O que circula é o **lead sheet**: a **melodia** escrita na pauta e a **cifra** em cima. O acompanhamento é por sua conta.

Isso parece difícil, mas é libertador: com meia dúzia de **padrões de mão esquerda**, você acompanha qualquer canção. Os quatro desta lição, do mais simples ao mais rico:

- **Alternado**: baixo no tempo 1, acorde no 2, outro baixo (a 5ª) no 3, acorde no 4. Em Dó: Dó, (Mi–Sol), Sol, (Mi–Sol). Bom para canções animadas, marchinha, valsa (em 3/4).
- **Meio-arpejo** 1-5-8-5 (lição 38): Dó, Sol, Dó, Sol em semínimas.
- **Arpejo contínuo**: o meio-arpejo em **colcheias**, sem parar. Dá movimento a uma melodia de notas longas.
- **Balada** 1-5-8-10: Dó, Sol, Dó, **Mi**. A 10ª (a 3ª uma oitava acima) põe a cor do acorde no meio do teclado, o som típico de balada ao piano.`,
    },
    {
      kind: 'example',
      title: 'Os quatro padrões sobre C',
      steps: [
        { say: 'Alternado.', play: { bpm: 88, steps: [{ midis: [36], beats: 1 }, { midis: [52, 55], beats: 1 }, { midis: [43], beats: 1 }, { midis: [52, 55], beats: 1 }] } },
        { say: 'Meio-arpejo 1-5-8-5.', play: { bpm: 88, steps: [48, 55, 60, 55].map((m) => ({ midis: [m], beats: 1 })) } },
        { say: 'Arpejo contínuo em colcheias.', play: { bpm: 88, steps: [48, 55, 60, 55, 48, 55, 60, 55].map((m) => ({ midis: [m], beats: 0.5 })) } },
        { say: 'Balada 1-5-8-10.', play: { bpm: 88, steps: [36, 43, 48, 52].map((m) => ({ midis: [m], beats: 1 })) } },
      ],
    },
    { kind: 'exercise', id: 'l47-alternado', exercise: quickTimed('Alternado', 'Só a esquerda, C – G – Am – F duas vezes, de 66 a 80 BPM.', () => melodyTask(`${ALT} | ${ALT}`, { bpm: 66, clef: 'bass' }), { ladder: { from: 66, to: 80, step: 7 } }) },
    { kind: 'exercise', id: 'l47-continuo', exercise: quickTimed('Arpejo contínuo com acordes', 'Colcheias na esquerda, acordes em semibreve na direita, dois ciclos a 66 BPM.', () => patternTask(CONT, 2, 66, 'C – G – Am – F. Esquerda em colcheias contínuas (1-5-8-5).'), { reps: 2, window: 80 }) },
    { kind: 'exercise', id: 'l47-balada', exercise: quickTimed('Balada 1-5-8-10', 'Semínimas na esquerda, acordes na direita, dois ciclos a 72 BPM.', () => patternTask(BALLAD, 2, 72, 'C – G – Am – F em balada: 1-5-8-10 na esquerda.'), { reps: 2, window: 80 }) },
    {
      kind: 'text',
      title: 'Melodia por cima',
      body: `O passo final é tirar os acordes da direita e pôr a **melodia** no lugar. A direita canta; a esquerda faz o padrão sozinha e, ao mesmo tempo, toca a harmonia inteira.

O que costuma travar é a **independência**: a esquerda quer copiar o ritmo da direita. Três dicas:

1. Toque a esquerda até ela ficar **automática**, sem olhar.
2. Junte as mãos **devagar**, compasso a compasso, prestando atenção nos tempos em que as duas tocam juntas: eles precisam soar **juntos** de verdade (o app pede até 50 ms de diferença).
3. A melodia é a protagonista: toque a direita um pouco **mais forte** que a esquerda.

O exercício a seguir é a canção do projeto desta unidade: 16 compassos com introdução, parte A em meio-arpejo, parte B em balada e final.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'a esquerda mais alta que a melodia',
      body: 'Padrões de esquerda têm muitas notas, e muitas notas somam volume. Se a melodia some, deixe a esquerda leve (quase p) e a direita cantando (mf). O app ainda não mede esse equilíbrio: confira gravando.',
    },
    { kind: 'exercise', id: 'l47-cancao', exercise: quickTimed('A canção, 16 compassos', 'Melodia na direita, padrões na esquerda, de 60 a 72 BPM. Meta: 90% das notas, mãos juntas em ±50 ms.', () => twoHandTask(SONG_R, SONG_L, { bpm: 60, caption: 'Intro C G · A: C G Am F C G Am F (meio-arpejo) · B: C G Am F (balada) · G C.' }), { window: 50, pass: { accuracy: 0.9 }, ladder: { from: 60, to: 72, step: 6 } }) },
    { kind: 'song', songId: 'u06-cancao', why: 'A mesma canção com a partitura completa, a cascata e o modo Estudar.' },
    { kind: 'exercise', id: 'l47-quiz', exercise: quiz('Padrões e lead sheet', 'Quatro perguntas rápidas.', PATTERNS, 0.75) },
  ],
  review: [choice(PATTERNS, 'padroes'), leadAny],
  checkpoint: [
    quickTimed('16 compassos a 72 BPM', 'A canção inteira, duas mãos, sem dicas. Meta: 90% das notas em ±50 ms.', () => twoHandTask(SONG_R, SONG_L, { bpm: 72 }), { window: 50, pass: { accuracy: 0.9 } }),
  ],
  exit: [choice(PATTERNS, 'padroes'), colorChords],
};

const BASS_CHROMA: ChoiceQuestion[] = [
  { q: 'Em C – G/B – Am – Am/G, o baixo faz…', options: ['Dó, Si, Lá, Sol: desce por grau conjunto', 'Dó, Sol, Lá, Lá', 'Sobe de Dó a Sol'], answer: 0, why: 'As inversões põem a nota certa no baixo para ele andar em escada.' },
  { q: 'A escala cromática tem…', options: ['Todas as 12 notas, de semitom em semitom', '7 notas', 'Só as pretas'], answer: 0, why: 'Dó, Dó♯, Ré, Ré♯… cada tecla, branca ou preta.' },
  { q: 'Por convenção, a cromática se escreve…', options: ['Com sustenidos subindo e bemóis descendo', 'Só com bemóis', 'Só com sustenidos'], answer: 0, why: 'O acidente aponta a direção: ♯ puxa para cima, ♭ para baixo.' },
  { q: 'Dedilhado da cromática na direita:', options: ['3 nas pretas, 1 nas brancas, 2 na segunda branca de um par (Mi–Fá, Si–Dó)', '1 2 3 4 5 em sequência', 'Só 2 e 3'], answer: 0, why: 'A mão quase não se move: o 3 fica sobre as pretas e o polegar nas brancas.' },
  { q: 'D/F♯ é…', options: ['Ré maior com Fá♯ no baixo', 'Ré e Fá♯ juntos', 'Fá♯ menor'], answer: 0, why: 'Muito usado entre G e Em: Sol, Fá♯, Mi no baixo.' },
];

const DESC_R = 'C4+E4+G4:2 B3+D4+G4:2 | C4+E4+A4:2 C4+E4+A4:2 | C4+F4+A4:2 C4+E4+G4:2 | D4+F4+A4:2 B3+D4+G4:2 | C4+E4+G4:4';
const DESC_L = 'C3:2 B2:2 | A2:2 G2:2 | F2:2 E2:2 | D2:2 G2:2 | C2:4';
const DESC_G_R = 'B3+D4+G4:2 A3+D4+F#4:2 | B3+E4+G4:2 B3+E4+G4:2 | C4+E4+G4:2 B3+D4+G4:2 | C4+E4+A4:2 A3+D4+F#4:2 | B3+D4+G4:4';
const DESC_G_L = 'G2:2 F#2:2 | E2:2 D2:2 | C2:2 B1:2 | A1:2 D2:2 | G1:4';
const descending = chordSequence({
  sequences: [
    { name: 'Baixo descendo em Dó.', symbols: ['C', 'G/B', 'Am', 'Am/G'] },
    { name: 'Continuação em Dó.', symbols: ['F', 'C/E', 'Dm', 'G'] },
    { name: 'Baixo descendo em Sol.', symbols: ['G', 'D/F#', 'Em', 'Em/D'] },
    { name: 'Continuação em Sol.', symbols: ['C', 'G/B', 'Am', 'D'] },
  ],
});

/** Escala cromática de uma oitava, subindo e descendo em colcheias (3 compassos) e a tônica em semibreve. */
function chromaticLine(from: Midi): string {
  const sciC = (m: Midi) => `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12]}${Math.floor(m / 12) - 1}`;
  const up = Array.from({ length: 13 }, (_, i) => from + i);
  const down = Array.from({ length: 11 }, (_, i) => from + 11 - i);
  const all = [...up, ...down].map((m) => `${sciC(m)}:0.5`);
  return `${all.slice(0, 8).join(' ')} | ${all.slice(8, 16).join(' ')} | ${all.slice(16).join(' ')} | ${sciC(from)}:4`;
}

const l48: Lesson = {
  n: 48,
  id: 'l48',
  title: 'Baixo em movimento e escala cromática',
  minutes: 60,
  objectives: [
    'Consigo tocar progressões com baixo descendente (C – G/B – Am – Am/G – F – C/E – Dm – G), com o baixo certo em cada acorde.',
    'Consigo tocar a escala cromática de uma oitava, mãos separadas, em colcheias a 69 BPM, com variação abaixo de 35 ms.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O baixo que anda',
      body: `Até aqui o baixo tocou quase sempre a **fundamental** de cada acorde, e por isso pulava: Dó, Sol, Lá, Fá. Com as inversões da lição 43, o baixo pode **andar por grau conjunto**, como uma melodia própria, enquanto a direita continua conduzida.

A progressão mais conhecida desse tipo é o **baixo descendente**:

**C – G/B – Am – Am/G – F – C/E – Dm – G**

O baixo desce a escala de Dó: **Dó, Si, Lá, Sol, Fá, Mi, Ré**, e o Sol final prepara a volta. As cifras com barra são só o jeito de escrever isso: G/B é o acorde de Sol com o Si no baixo, Am/G é Lá menor com o Sol no baixo (uma nota que nem é do acorde, mas está de passagem).

Essa linha aparece em muita música, do barroco ao pop. Em Sol maior: **G – D/F♯ – Em – Em/D – C – G/B – Am – D**.`,
    },
    {
      kind: 'example',
      title: 'Baixo descendente em Dó',
      steps: [
        { say: 'O baixo sozinho: uma escala descendo.', play: { bpm: 80, steps: [48, 47, 45, 43, 41, 40, 38, 43].map((m) => ({ midis: [m], beats: 1 })) } },
        { say: 'Com os acordes conduzidos na direita: a mão direita quase não sai do lugar.', play: { bpm: 72, steps: [[48, 60, 64, 67], [47, 59, 62, 67], [45, 60, 64, 69], [43, 60, 64, 69], [41, 60, 65, 69], [40, 60, 64, 67], [38, 62, 65, 69], [43, 59, 62, 67], [36, 60, 64, 67]].map((midis, i) => ({ midis, beats: i === 8 ? 4 : 2 })) } },
      ],
    },
    { kind: 'exercise', id: 'l48-cifras', exercise: items('Cifras com baixo andando', 'Toque cada acorde com a nota da barra no baixo (a esquerda pode tocar o baixo).', descending, 8, 36, 72, 0.85) },
    { kind: 'exercise', id: 'l48-tempo', exercise: quickTimed('Baixo descendente no tempo', 'Mínimas, a direita conduzida e a esquerda descendo, de 60 a 72 BPM. Dó ou Sol maior, sorteado.', (rng) => (rng() < 0.5 ? twoHandTask(DESC_R, DESC_L, { bpm: 60, caption: 'C G/B | Am Am/G | F C/E | Dm G | C' }) : twoHandTask(DESC_G_R, DESC_G_L, { bpm: 60, fifths: 1, caption: 'G D/F♯ | Em Em/D | C G/B | Am D | G' })), { window: 80, ladder: { from: 60, to: 72, step: 6 } }) },
    {
      kind: 'text',
      title: 'A escala cromática',
      body: `A **escala cromática** usa **todas as 12 notas**, de semitom em semitom: Dó, Dó♯, Ré, Ré♯, Mi, Fá, Fá♯... Ela não tem tônica nem modo: é a "régua" de onde saem todas as outras escalas, e aparece em passagens rápidas, floreios e linhas de baixo.

Na escrita, a convenção é **sustenido subindo e bemol descendo**: Dó, Dó♯, Ré, Ré♯... e na volta Si, Si♭, Lá, Lá♭... O acidente aponta para onde a nota vai. (A pauta do exercício do app escreve tudo com sustenido; na partitura impressa você vai ver os bemóis na descida.)

O **dedilhado** é o que torna a cromática fácil:

- **3 em todas as pretas**, **1 em todas as brancas**...
- ...menos onde há **duas brancas vizinhas** (Mi–Fá e Si–Dó): a segunda delas, na direção em que você vai, leva o **2**.

Na direita, subindo de Dó: 1 3 1 3 1 **2** 3 1 3 1 3 1 **2**. Descendo, a mesma regra: Dó 1, **Si 2**, Si♭ 3, Lá 1... A mão desliza quase sem se abrir; o polegar passa a cada duas notas, então o antebraço precisa acompanhar de lado, bem solto. A esquerda usa a mesma regra, espelhada.`,
    },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'polegar solto',
      body: 'Na cromática o polegar trabalha em quase toda nota branca. Se ele começar a apertar ou o punho subir, pare. A meta é igualdade (variação abaixo de 35 ms), não velocidade: suba o andamento só com as notas iguais.',
    },
    { kind: 'exercise', id: 'l48-cromatica-md', exercise: quickTimed('Cromática, mão direita', 'De Dó4 a Dó5 e de volta, em colcheias, de 50 a 69 BPM. Variação até 35 ms.', () => melodyTask(chromaticLine(60), { bpm: 50 }), { ladder: { from: 50, to: 69, step: 5 }, evenness: 35 }) },
    { kind: 'exercise', id: 'l48-cromatica-me', exercise: quickTimed('Cromática, mão esquerda', 'De Dó3 a Dó4 e de volta, de 50 a 69 BPM.', () => melodyTask(chromaticLine(48), { bpm: 50, clef: 'bass' }), { ladder: { from: 50, to: 69, step: 5 }, evenness: 35 }) },
    { kind: 'exercise', id: 'l48-quiz', exercise: quiz('Baixo e cromática', 'Cinco perguntas rápidas.', BASS_CHROMA) },
  ],
  review: [descending, slashChords, choice(BASS_CHROMA, 'cromatica')],
  checkpoint: [
    items('Baixo andando', '6 sequências com barra, sem dicas. Meta: 85%.', descending, 6, 36, 72, 0.85, 'off'),
    quickTimed('Cromática a 69 BPM', 'Mão direita, colcheias, sem dicas. Variação até 35 ms.', () => melodyTask(chromaticLine(60), { bpm: 69 }), { evenness: 35 }),
  ],
  exit: [descending, choice(BASS_CHROMA, 'cromatica')],
};

const l49: Lesson = {
  n: 49,
  id: 'l49',
  title: 'Checkpoint da unidade 6 e projeto: pop pela cifra',
  minutes: 60,
  objectives: [
    'Consigo passar no checkpoint misto da unidade 6, sem dicas.',
    'Consigo tocar uma canção em I–V–vi–IV a partir do lead sheet, com dois padrões de mão esquerda, introdução e final.',
    'Consigo conduzir as vozes da progressão com no máximo 2 semitons a mais que o caminho mais curto.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O que a unidade juntou',
      body: `Nesta unidade os acordes deixaram de ser blocos isolados. Você aprendeu os quatro tipos de tríade e a soletrá-los, as inversões e a cifra com barra, a conduzir as vozes (notas comuns ficam, as outras andam pouco), as cores sus e add9, o compasso composto, quatro padrões de mão esquerda, o baixo que anda e a escala cromática.

Com isso dá para fazer o que todo pianista de pop faz: pegar um **lead sheet** (melodia + cifra) e transformar num arranjo próprio.`,
    },
    {
      kind: 'text',
      title: 'Como montar um arranjo pela cifra',
      body: `O projeto é a **Canção em quatro acordes** (melodia original do curso, C – G – Am – F). O lead sheet tem a melodia e a cifra; o arranjo é seu. Um roteiro que funciona para qualquer canção:

1. **Introdução** (2 a 4 compassos): só a esquerda, ou acordes na direita, com a progressão. Ela apresenta o tom e o andamento.
2. **Parte A**: melodia na direita, um padrão **mais simples** na esquerda (meio-arpejo, por exemplo).
3. **Parte B**: o mesmo, com um padrão **mais rico** (balada 1-5-8-10 ou arpejo contínuo). Mudar o padrão é o jeito mais simples de fazer a música crescer.
4. **Final**: desacelere um pouco e termine no **I**, com um acorde cheio e deixado soar.

Dois toques que fazem diferença: troque o pedal a cada acorde (pedal legato) e deixe a melodia mais forte que a esquerda.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'a condução vale para a direita também',
      body: 'Na introdução e no final, quando a direita toca acordes, use as posições conduzidas da lição 44 (Dó–Mi–Sol, Si–Ré–Sol, Dó–Mi–Lá, Dó–Fá–Lá). O exercício abaixo mede isso.',
    },
    { kind: 'exercise', id: 'l49-conducao', exercise: items('Condução em 4 tons', 'I–V–vi–IV conduzido em tom sorteado. Meta: 7 de 8.', leadAny, 8, 48, 84, 0.875, 'off') },
    { kind: 'song', songId: 'u06-cancao', why: 'O projeto final: a canção com o arranjo escrito. Depois de passar, toque pelo lead sheet com o seu próprio arranjo.' },
  ],
  review: [chordsAll, inv1, leadAny, colorChords, descending],
  checkpoint: [
    {
      kind: 'items',
      title: 'Checkpoint da unidade 6',
      how: '24 perguntas misturadas: tríades, grafia, inversões, barras, cores, ouvido e teoria. Meta: 85%.',
      gen: mix([chordsAll, spellAll, inv1, invNamed, slashChords, colorChords, resolveSus, earFour, descending, choice([...TRIADS, ...INVERSIONS, ...VOICE, ...COLORS, ...COMPOUND, ...PATTERNS, ...BASS_CHROMA])]),
      count: 24,
      low: 36,
      high: 84,
      labels: 'off',
      pass: { accuracy: 0.85 },
    },
    items('Dois ciclos conduzidos', 'I–V–vi–IV duas vezes, tom sorteado, sem dicas.', leadTwo, 3, 48, 84, 0.85, 'off'),
    quickTimed('6/8', 'Quatro compassos sorteados a 60 BPM (semínima pontuada).', compoundRhythm([...R68, ...R68_REST], 4, 60), { window: 60 }),
  ],
  project: {
    title: 'Pop pela cifra',
    brief: `Toque a **Canção em quatro acordes** do começo ao fim a 72 BPM: introdução, parte A com um padrão de mão esquerda, parte B com outro padrão e final em Dó. Primeiro como está escrita (exercício abaixo); depois, pelo lead sheet, com o seu arranjo.`,
    steps: [
      'Passe a canção escrita no "Tocar a música" a 72 BPM.',
      'Escreva o lead sheet num papel: a melodia (ou só o ritmo das frases) e a cifra de cada compasso.',
      'Escolha seus dois padrões de esquerda (um para A, outro para B) e uma introdução de 2 ou 4 compassos.',
      'Toque o seu arranjo inteiro, com pedal legato, e grave.',
      'Ouça e confira a rubrica.',
    ],
    rubric: [
      'A canção escrita passou com 90% das notas a 72 BPM.',
      'No seu arranjo, todos os acordes saíram certos (pelo menos 95%).',
      'A direita conduziu as vozes na introdução e no final (sem pular de posição fundamental em posição fundamental).',
      'Dá para ouvir a parte B crescer em relação à parte A.',
      'A melodia ficou mais forte que a esquerda, e o pedal limpo.',
    ],
    exercise: { kind: 'timed', title: 'A canção, a 72 BPM', how: 'Os 16 compassos com as duas mãos.', gen: () => twoHandTask(SONG_R, SONG_L, { bpm: 72 }), reps: 1, window: 80, pass: { accuracy: 0.9 } },
  },
  exit: [leadAny, spellAll, choice([...TRIADS, ...INVERSIONS, ...VOICE, ...COLORS])],
};

// Greensleeves (melodia inglesa, século 16), simplificada em 6/8: colcheias no lugar das pontuadas.
const greensleeves: SongSpec = {
  id: 'u06-greensleeves',
  title: 'Greensleeves',
  composer: 'melodia tradicional inglesa',
  arrangement: 'arranjo do Fermata: em 6/8, colcheias iguais no lugar das figuras pontuadas, só a primeira frase dupla; raiz e 5ª na esquerda',
  bpm: 81,
  beatsPerBar: 3,
  time: { beats: 6, beatType: 8 },
  fifths: 0,
  right: `r:1.5 r:1 A4:0.5 | ${GREEN_4.replace(/E4:1\.5$/, 'E4:1 A4:0.5')} | C5:1 D5:0.5 E5:0.5 F5:0.5 E5:0.5 | D5:1 B4:0.5 G4:0.5 A4:0.5 B4:0.5 | C5:0.5 B4:0.5 A4:0.5 G#4:0.5 F#4:0.5 G#4:0.5 | A4:3`,
  left: 'r:3 | A2+E3:3 | G2+D3:3 | A2+E3:3 | E2+B2:3 | A2+E3:3 | G2+D3:3 | A2+E3:1.5 E2+B2:1.5 | A2+E3:3',
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const unit: Unit = {
  n: 6,
  id: 'u06',
  title: 'Tríades, inversões e condução',
  goal: 'Montar e soletrar os quatro tipos de tríade, usar inversões e cifra com barra, encadear acordes conduzindo as vozes e acompanhar uma canção pela cifra.',
  technique: 'Tríades quebradas pelas inversões em tercinas (de 40 rumo a 60 BPM) e escala cromática de uma oitava em colcheias (de 50 rumo a 69 BPM, variação abaixo de 35 ms), mãos separadas; I–V–vi–IV conduzido em Dó, Sol, Fá e Ré (referência: RCM Level 1–2). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l42, l43, l44, l45, l46, l47, l48, l49],
  songs: [popSong, greensleeves],
  final: {
    songId: 'u06-cancao',
    brief: 'Uma canção original em I–V–vi–IV (C – G – Am – F), escrita para o curso: a direita canta a melodia e a esquerda muda de padrão na parte B, do meio-arpejo para a balada 1-5-8-10. Toque também pela cifra, inventando o acompanhamento com os acordes conduzidos.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [chords12, chordsDimAug, chordsAll, spellAll, earFour, inv1, invNamed, slashChords, lead1, leadAny, leadTwo, colorChords, resolveSus, colorsAndTriads, descending];
