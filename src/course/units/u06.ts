// Unidade 6 — Tríades, inversões e condução de vozes (lições 42 a 49). Projeto final: canção em I–V–vi–IV pela cifra (melodia original).
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import { chordQualityByEar, chordSequence, choice, inversionChord, mix, playChord, spellTriadChoice, type ChoiceQuestion } from '../gens';
import { pick } from '../music';
import { melodyTask, twoHandTask } from '../tasks';
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

const unit: Unit = {
  n: 6,
  id: 'u06',
  title: 'Tríades, inversões e condução',
  goal: 'Montar e soletrar os quatro tipos de tríade, usar inversões e cifra com barra, encadear acordes conduzindo as vozes e acompanhar uma canção pela cifra.',
  technique: 'Tríades quebradas pelas inversões em tercinas, mãos separadas, de 40 rumo a 60 BPM; I–V–vi–IV conduzido em Dó, Sol, Fá e Ré (referência: RCM Level 1–2). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l42, l43, l44],
  songs: [popSong],
  final: {
    songId: 'u06-cancao',
    brief: 'Uma canção original em I–V–vi–IV (C – G – Am – F), escrita para o curso: a direita canta a melodia e a esquerda muda de padrão na parte B, do meio-arpejo para a balada 1-5-8-10. Toque também pela cifra, inventando o acompanhamento com os acordes conduzidos.',
  },
};

export default unit;

/** Para os testes conferirem que todo gerador funciona. */
export const _gens: ItemGen[] = [chords12, chordsDimAug, chordsAll, spellAll, earFour, inv1, invNamed, slashChords, lead1, leadAny, leadTwo];
